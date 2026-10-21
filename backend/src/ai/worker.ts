/**
 * backend/src/ai/worker.ts
 * Xu ly tac vu AI BAT DONG BO:
 *   POST /api/designs ghi designs (status='processing') → nem job vao hang doi
 *   → worker nen goi provider → luu anh ket qua vao UPLOAD_DIR →
 *   → UPDATE designs SET result_image_url, status='done' hoac 'failed' + error_message.
 *
 * Co che chi tra (rate limit ~1 anh/45s moi IP): neu provider bao "rate-limited",
 * job duoc thiet lap lai sau AI_RETRY_DELAY_MS. Neu qua thoi han
 * MAX_AI_JOB_WAIT_MS hoac qua AI_MAX_RETRIES lan → danh dau failed.
 */
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { config } from "../config";
import { type ImageProvider, ProviderError } from "./aiProvider";

/** Dai khai 40 giay — vuot gioi han anonymous ~45s/anh cua Pollinations */
const AI_RETRY_DELAY_MS = 40_000;
/** Loi mang/timeout: thu lai nhanh hon (khong can cho 45s) */
const AI_RETRY_FAST_MS = 8_000;

export interface DesignJob {
  designId: string;
  /** Đường dẫn file anh gốc đã được multer ghi — chỉ dùng cho log */
  originalPath: string;
  prompt: string;
  userId: string;
  /** Ham cap nhat trang thai trong DB (tiem cua routes.ts de tránh dépendance trục) */
  update: (patch: JobPatch) => Promise<void>;
  /** Callback ghi usage log (không chặn job nếu log lỗi) */
  logUsage: (entry: JobUsage) => void;
}

export interface JobPatch {
  status?: "done" | "failed";
  errorMessage?: string | null;
  /** Tên file kết quả (đã lưu trong UPLOAD_DIR) */
  resultImagePath?: string;
}

export interface JobUsage {
  userId: string;
  designId: string;
  provider: string;
  attempt: number;
  latencyMs: number;
  outcome: "success" | "rate-limited" | "error";
  detail?: string;
}

const extForMime = (mimeType: string): string =>
  mimeType.includes("png") ? ".png" : mimeType.includes("webp") ? ".webp" : ".jpg";

export class DesignWorker {
  private readonly queue: DesignJob[] = [];
  private running = false;

  constructor(private readonly provider: ImageProvider) {}

  enqueue(job: DesignJob): void {
    this.queue.push(job);
    console.log(`[ai-worker] queued design ${job.designId} (đang giữ ${this.queue.length} job)`);
    if (!this.running) {
      this.running = true;
      // Chạy nền, không chặn response 202
      void this.drain();
    }
  }

  private async drain(): Promise<void> {
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;
      try {
        await this.process(job);
      } catch (error) {
        // process() đã tự xử lý thất bại; đây chỉ là lưới an toàn
        console.error("[ai-worker] unexpected failure", error);
        await Promise.resolve(
          job.update({
            status: "failed",
            errorMessage: "Máy chủ AI gặp lỗi không xác định, vui lòng thử lại.",
          }),
        ).catch(() => undefined);
      }
    }
    this.running = false;
  }

  private async process(job: DesignJob): Promise<void> {
    const deadline = Date.now() + config.MAX_AI_JOB_WAIT_MS;
    for (let attempt = 1; attempt <= config.AI_MAX_RETRIES; attempt++) {
      try {
        const image = await this.provider.generateRoomImage({ prompt: job.prompt });

        const filename = `${randomUUID()}${extForMime(image.mimeType)}`;
        await mkdir(config.UPLOAD_DIR, { recursive: true });
        await writeFile(path.join(config.UPLOAD_DIR, filename), image.data);

        await job.update({ status: "done", resultImagePath: filename });
        job.logUsage({
          userId: job.userId, designId: job.designId, provider: image.provider,
          attempt, latencyMs: image.latencyMs, outcome: "success",
        });
        console.log(`[ai-worker] design ${job.designId} DONE in ${image.latencyMs}ms (attempt ${attempt})`);
        return;
      } catch (error) {
        const isProvider = error instanceof ProviderError;
        // "unavailable" (timeout / loi mang) cung phai RETRY: dich vu AI cham
        // hoac mang chap chon khong co nghia la hong han.
        const retryableStatus = isProvider && (error.status === "rate-limited" || error.status === "unavailable");
        const outcome: JobUsage["outcome"] = retryableStatus ? "rate-limited" : "error";
        job.logUsage({
          userId: job.userId, designId: job.designId, provider: this.provider.name,
          attempt, latencyMs: 0, outcome, detail: isProvider ? error.message : String(error),
        });

        // Cho 40s khi bi gioi han slot; chi 8s khi loi mang/timeout
        const waitMs = isProvider && error.status === "rate-limited" ? AI_RETRY_DELAY_MS : AI_RETRY_FAST_MS;
        const retryable = retryableStatus && Date.now() + waitMs < deadline && attempt < config.AI_MAX_RETRIES;
        if (retryable) {
          console.warn(
            `[ai-worker] design ${job.designId} ${error.status} (${error.message}), retry sau ${waitMs}ms (attempt ${attempt}/${config.AI_MAX_RETRIES})`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        const message = isProvider
          ? (error.status === "rate-limited" || error.status === "unavailable"
            ? "Dịch vụ AI đang quá tải, vui lòng thử lại sau ít phút."
            : "Không tạo được ảnh thiết kế, vui lòng thử lại.")
          : "Máy chủ AI gặp lỗi không xác định, vui lòng thử lại.";
        await job.update({ status: "failed", errorMessage: message }).catch(() => undefined);
        console.error(`[ai-worker] design ${job.designId} FAILED (attempt ${attempt}):`, message);
        return;
      }
    }
  }
}
