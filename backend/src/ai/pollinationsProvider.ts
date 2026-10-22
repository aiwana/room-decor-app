/**
 * backend/src/ai/pollinationsProvider.ts
 * Provider mien phi: Pollinations Classic API (khong can key, khong can signup).
 *   GET https://image.pollinations.ai/prompt/{prompt}?width=&height=&nologo=true&seed=
 *
 * Gioi han anonymous: 1 anh MUT LUC, cach nhau >= 45 giay moi IP.
 * Khi bi throttle (402/429) provider nem ProviderError "rate-limited"
 * de worker retry sau khoang nghi ton tai trong MAX_AI_JOB_WAIT_MS.
 */
import { config } from "../config";
import {
  type ImageProvider,
  ProviderError,
} from "./aiProvider";

const IMAGE_URL = "https://image.pollinations.ai/prompt";

/** Kich thuoc anh gui cho Pollinations (diện tích tối đa 768×768, giữ tỷ lệ 4:3) */
const WIDTH = 768;
const HEIGHT = 576;

const RETRYABLE_STATUS = new Set([402, 429, 500, 502, 503, 504]);

/** Detect the actual file format; an HTML error page must never become a design. */
function imageMimeType(data: Buffer): string | undefined {
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return undefined;
}

/**
 * Tu-phep lap lich: Pollinations de gioi han THEO KHOANG CACH GIUA CAC LAN GOI
 * (>= 45 giay / IP), khong phai theo tong so anh trong gio. Neu retry lap tuc
 * sau khi timeout/loi thi lan goi moi lai ghi nhan la "vuot gioi han" va keo dai
 * thoi gian bi chan. Giao dien nay dai bao lan goi gan nhat (du thanh cong hay
 * that bai) qua diem kiem tra: trang thai 402 khong ton tai trong puncture.
 */
let lastCallStartedAt = 0;
const MIN_GAP_MS = 46_000;

/** Doc bien trong tests; null de tu bo qua */
export function getMinGapMs(): number {
  return MIN_GAP_MS;
}

async function waitForSlot(): Promise<void> {
  const elapsed = Date.now() - lastCallStartedAt;
  const remaining = MIN_GAP_MS - elapsed;
  if (remaining > 0) {
    console.log(`[pollinations] doi ${Math.ceil(remaining / 1000)}s de nho gioi han 45s/IP`);
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
  lastCallStartedAt = Date.now();
}

export const pollinationsProvider: ImageProvider = {
  name: "pollinations",

  async generateRoomImage({ prompt }) {
    // Xu hang + danh dau thoi diem bat dau ngay ca khi request that bai,
    // de lan retry ke tiep tu dong cach nhau >= 46s (cach duy nhat Pollinations
    // gai gioi han 402).
    let res: Response;
    {
      await waitForSlot();
      // Seed ngau nhien de moi lan tao ra anh khac nhau cung prompt
      const seed = Math.floor(Math.random() * 1_000_000);
      const url =
        `${IMAGE_URL}/${encodeURIComponent(prompt)}` +
        `?width=${WIDTH}&height=${HEIGHT}&nologo=true&seed=${seed}`;

      const t0 = Date.now();
      let buffer: Buffer;
      try {
        res = await fetch(url, { signal: AbortSignal.timeout(config.AI_HTTP_TIMEOUT_MS) });
        // The body can time out after fetch has already received the headers.
        buffer = Buffer.from(await res.arrayBuffer());
      } catch (error) {
        throw new ProviderError("Khong ket noi duoc dich vu AI.", "unavailable", error);
      }

      const latencyMs = Date.now() - t0;

      if (!res.ok) {
        if (RETRYABLE_STATUS.has(res.status)) {
          throw new ProviderError(
            `Dich vu AI qua tai (HTTP ${res.status}).`,
            "rate-limited",
            buffer.toString("utf8").slice(0, 200),
          );
        }
        throw new ProviderError(
          `Dich vu AI tu choi yeu cau (HTTP ${res.status}).`,
          "invalid",
          buffer.toString("utf8").slice(0, 200),
        );
      }

      const mimeType = imageMimeType(buffer);
      const declaredType = res.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
      if (!mimeType || buffer.length < 1024 || (declaredType && declaredType !== mimeType && declaredType !== "application/octet-stream")) {
        throw new ProviderError("Dich vu AI tra ket qua khong phai anh hop le.", "invalid");
      }

      return { data: buffer, mimeType, latencyMs, provider: this.name };
    }
  },
};
