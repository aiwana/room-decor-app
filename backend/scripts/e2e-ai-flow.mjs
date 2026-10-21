/**
 * backend/scripts/e2e-ai-flow.mjs
 * Kiem chung luong AI end-to-end NGUYEN LY (khong can PostgreSQL):
 *   buildInteriorPrompt (gom logic trong promptBuilder.ts) →
 *   Pollinations Classic API → luu anh ket qua → bao cao thoi gian.
 *
 * Cấu tạo đỏn đã đo được trong test-pollinations.mjs; ở đây nấc cánh
 * byte byte promptChuanHoa sẽ gửi — như worker gọi provider.
 */
import { writeFileSync } from "node:fs";

/* ------------------- Sao che logic promptBuilder (khong import TS) ------------------- */
const ROOM_TYPES = { living: "living room", bedroom: "bedroom", kitchen: "kitchen", office: "home office workspace", bathroom: "bathroom" };
const STYLES = { modern: "modern contemporary", minimalist: "minimalist", japandi: "japandi (japanese-scandinavian fusion)", scandinavian: "scandinavian", luxury: "luxury elegant", industrial: "industrial" };
const COLOR_THEMES = { white: "white and light neutral", beige: "warm beige", gray: "cool gray", brown: "earthy brown and wood tones", green: "sage green accents", black: "black accent" };
const STYLE_DETAILS = {
  modern: "clean lines, high-quality contemporary furniture, subtle decor",
  minimalist: "few well-chosen furniture pieces, uncluttered surfaces, lots of empty space",
  japandi: "light oak wood, low-profile furniture, natural linen textures, wabi-sabi simplicity",
  scandinavian: "light woods, cozy textiles, functional furniture, bright airy feeling",
  luxury: "marble surfaces, brass details, plush velvet furniture, refined lighting",
  industrial: "exposed brick, black metal frames, raw concrete, vintage leather",
};

const buildInteriorPrompt = ({ roomType, style, colorTheme, prompt }) => {
  const room = ROOM_TYPES[roomType] ?? "room";
  const st = STYLES[style] ?? "modern";
  const detail = STYLE_DETAILS[style] ?? "harmonious furniture arrangement";
  const color = colorTheme ? (COLOR_THEMES[colorTheme] ?? "neutral") : "harmonious neutral";
  const parts = [
    `Photorealistic interior photography of a ${room} designed in ${st} style.`,
    `${detail.charAt(0).toUpperCase() + detail.slice(1)}.`,
    `${color.charAt(0).toUpperCase() + color.slice(1)} color palette.`,
    prompt?.trim() ? `Additional requirements from the user: ${prompt.trim()}.` : "",
    "Eye-level camera angle, natural and warm ambient lighting, cohesive furniture arrangement,",
    "high resolution, magazine quality, no people, no text, no watermark.",
  ];
  return parts.filter(Boolean).join(" ");
};

/* ------------------- Goi provider giong pollinationsProvider ------------------- */
const run = async () => {
  const cases = [
    { roomType: "bedroom", style: "japandi", colorTheme: "beige", prompt: null },
    { roomType: "living", style: "industrial", colorTheme: "gray", prompt: null },
  ];

  for (const [i, input] of cases.entries()) {
    const promptText = buildInteriorPrompt(input);
    console.log(`\n=== CASE ${i + 1}: ${input.roomType}/${input.style}/${input.colorTheme ?? "-"} ===`);
    console.log("Prompt:", promptText.slice(0, 120) + "…");

    const seed = Math.floor(Math.random() * 1_000_000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=768&height=576&nologo=true&seed=${seed}`;
    const t0 = Date.now();
    const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
    const elapsed = (Date.now() - t0) / 1000;
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`HTTP ${res.status} · ${elapsed.toFixed(1)}s · ${buf.length} bytes`);

    if (!res.ok || buf.length < 1024) {
      console.error("FAIL:", buf.toString("utf8").slice(0, 200));
      process.exitCode = 1;
      continue;
    }
    const out = `backend/scripts/e2e-result-${i + 1}.jpg`;
    writeFileSync(out, buf);
    console.log("OK →", out);
    // Giữa 2 request cần ≥45s theo limit anonymous
    if (i < cases.length - 1) {
      console.log("Cho 46s de vuot gioi han anonymous Pollinations…");
      await new Promise((r) => setTimeout(r, 46_000));
    }
  }
};

await run();
