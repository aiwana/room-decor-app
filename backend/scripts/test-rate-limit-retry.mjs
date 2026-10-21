/**
 * backend/scripts/test-rate-limit-retry.mjs
 * Kich ban that khi demo: nguoi dung bam tao anh 2 lan LIEN TIEP.
 * Pollinations free = 1 anh / 45s / IP -> lan 2 se bi 402 (rate-limited).
 * Muc tieu: worker PHAI retry va cuoi cung van ra anh (khong bao 'failed').
 */
const BASE = process.env.API_BASE ?? "http://192.168.41.101:3000";
const EMAIL = `ratelimit${Date.now()}@roomdecor.dev`;
const PASSWORD = "Test123456";
import { readFileSync } from "node:fs";

const reg = await fetch(`${BASE}/api/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Rate Test", email: EMAIL, password: PASSWORD }),
});
const { token } = await reg.json();
const auth = { Authorization: `Bearer ${token}` };
const image = readFileSync("backend/scripts/test-room.jpg");

const create = async (style, colorTheme) => {
  const form = new FormData();
  form.append("image", new Blob([image], { type: "image/jpeg" }), "room.jpg");
  form.append("roomType", "bedroom");
  form.append("style", style);
  form.append("colorTheme", colorTheme);
  const res = await fetch(`${BASE}/api/designs`, { method: "POST", headers: auth, body: form });
  return res.json();
};

const poll = async (id, label, t0) => {
  let last = null;
  while (Date.now() - t0 < 7 * 60_000) {
    await new Promise((r) => setTimeout(r, 4000));
    const res = await fetch(`${BASE}/api/designs/${id}`, { headers: auth });
    last = await res.json();
    const s = ((Date.now() - t0) / 1000).toFixed(0);
    if (last.status !== "processing") {
      console.log(
        `${last.status === "done" ? "✅" : "❌"} ${label}: ${last.status} sau ${s}s` +
          (last.status === "failed" ? ` — ${last.errorMessage}` : ""),
      );
      return last;
    }
    console.log(`   ${label} polling: ${last.status} (${s}s)`);
  }
  console.log(`❌ ${label}: TIMEOUT sau 7 phut`);
  return last;
};

console.log("=== Lan 1: gui yeu cau tao anh ===");
const t0 = Date.now();
const d1 = await create("minimalist", "white");

console.log("=== Lan 2: gui NGAY LAP TUC (se bi 402 rate-limit) ===");
const d2 = await create("scandinavian", "gray");

const [r1, r2] = await Promise.all([poll(d1.id, "Lan 1", t0), poll(d2.id, "Lan 2", t0)]);

console.log("\n=== KET LUAN ===");
const ok = r1?.status === "done" && r2?.status === "done";
console.log(ok ? "✅ CA 2 LAN DEU RA ANH — retry rate-limit hoat dong tot!" : "⚠️ Co lan that bai — xem chi tiet ben tren");
