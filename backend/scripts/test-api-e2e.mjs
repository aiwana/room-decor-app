/**
 * backend/scripts/test-api-e2e.mjs
 * Kiem chung TOAN BO luong API voi backend + PostgreSQL that:
 *   1. Dang ky user test
 *   2. Dang nhap -> token
 *   3. Upload anh phong + tao thiet ke (POST /api/designs) -> 202 processing
 *   4. Polling GET /api/designs/:id den khi done/failed
 *   5. Luu thiet ke + danh dau yeu thich
 *   6. Lay danh sach lich su
 * Chay: node backend/scripts/test-api-e2e.mjs
 */
import { readFileSync } from "node:fs";

const BASE = process.env.API_BASE ?? "http://localhost:3000";
const EMAIL = `test${Date.now()}@roomdecor.dev`;
const PASSWORD = "Test123456";

const json = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const log = (label, ok, detail) => {
  console.log(`${ok ? "✅" : "❌"} ${label}${detail ? " — " + detail : ""}`);
};

/* 1. Dang ky */
const reg = await fetch(`${BASE}/api/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Test User", email: EMAIL, password: PASSWORD }),
});
const regBody = await json(reg);
log("Dang ky", reg.status === 201, `HTTP ${reg.status}`);
if (reg.status !== 201) {
  console.error(regBody);
  process.exit(1);
}
let token = regBody.token;

/* 2. Dang nhap lai (kiem chung bcrypt + JWT) */
const login = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const loginBody = await json(login);
log("Dang nhap", login.status === 200 && Boolean(loginBody.token), `HTTP ${login.status}`);
token = loginBody.token;

const auth = { Authorization: `Bearer ${token}` };

/* 2b. GET /api/me */
const me = await fetch(`${BASE}/api/me`, { headers: auth });
const meBody = await json(me);
log("GET /api/me", me.status === 200 && meBody.email === EMAIL, `HTTP ${me.status}`);

/* 3. San pham & danh muc (public) */
const cats = await fetch(`${BASE}/api/categories`);
const catsBody = await json(cats);
log("GET /api/categories", cats.status === 200 && Array.isArray(catsBody), `${catsBody?.length ?? 0} danh muc`);

const prods = await fetch(`${BASE}/api/products?featured=true`);
const prodsBody = await json(prods);
log("GET /api/products?featured=true", prods.status === 200 && Array.isArray(prodsBody), `${prodsBody?.length ?? 0} san pham`);

/* 4. Tao thiet ke (multipart) */
const image = readFileSync("backend/scripts/test-room.jpg");
const form = new FormData();
form.append("image", new Blob([image], { type: "image/jpeg" }), "room.jpg");
form.append("roomType", "living");
form.append("style", "japandi");
form.append("colorTheme", "beige");
form.append("prompt", "them ban lam viec nho canh cua so");

const t0 = Date.now();
const created = await fetch(`${BASE}/api/designs`, { method: "POST", headers: auth, body: form });
const createdBody = await json(created);
log(
  "POST /api/designs",
  created.status === 202,
  `HTTP ${created.status}, status=${createdBody?.status}, id=${createdBody?.id}`,
);
if (created.status !== 202) {
  console.error(createdBody);
  process.exit(1);
}
const designId = createdBody.id;

/* 5. Polling den khi done/failed */
let final = createdBody;
let polls = 0;
const deadline = Date.now() + 6 * 60_000;
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 3000));
  polls += 1;
  const res = await fetch(`${BASE}/api/designs/${designId}`, { headers: auth });
  final = await json(res);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`   polling #${polls} — status=${final.status} (${elapsed}s)`);
  if (final.status !== "processing") break;
}

const totalTime = ((Date.now() - t0) / 1000).toFixed(1);
log(
  "AI tao anh",
  final.status === "done" && Boolean(final.resultImageUrl),
  `status=${final.status}, ${totalTime}s, url=${String(final.resultImageUrl).slice(0, 60)}…`,
);
if (final.status === "failed") console.error("errorMessage:", final.errorMessage);

/* 6. Luu + yeu thich */
const save = await fetch(`${BASE}/api/designs/${designId}/save`, { method: "POST", headers: auth });
log("POST /:id/save", save.status === 204, `HTTP ${save.status}`);

const fav = await fetch(`${BASE}/api/designs/${designId}/favorite`, { method: "POST", headers: auth });
log("POST /:id/favorite", fav.status === 204, `HTTP ${fav.status}`);

/* 7. Danh sach lich su */
const list = await fetch(`${BASE}/api/designs`, { headers: auth });
const listBody = await json(list);
log("GET /api/designs", list.status === 200 && Array.isArray(listBody), `${listBody?.length ?? 0} thiet ke da luu`);

/* 8. Bao gia (public) */
if (Array.isArray(prodsBody) && prodsBody[0]) {
  const quote = await fetch(`${BASE}/api/quote-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: prodsBody[0].id,
      customerName: "Khach Test",
      phone: "0912345678",
      quantity: 2,
      note: "Test tu script E2E",
    }),
  });
  log("POST /api/quote-requests", quote.status === 201, `HTTP ${quote.status}`);
}

/* 9. Tai anh ket qua (signed URL) neu la URL cua backend nay */
if (final.status === "done") {
  const url = String(final.resultImageUrl);
  const imgRes = await fetch(url);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  log("Tai anh AI qua signed URL", imgRes.ok && buf.length > 5000, `HTTP ${imgRes.status}, ${buf.length} bytes`);
}

console.log("\n=== TOM TAT ===");
console.log(`Thoi gian AI: ${totalTime}s | So lan polling: ${polls}`);
console.log(`User test: ${EMAIL}`);
