/**
 * backend/src/ai/aiProvider.ts
 * Hop dong (interface) chung cho moi nha cung cap AI tao anh.
 * Backend chi noi chuyen voi interface nay — doi provider chi them file moi
 * va chon trong config (AI_PROVIDER), khong sua phan con lai.
 */

export interface GenerateRoomImageInput {
  /** Prompt da chuan hoa tu buildInteriorPrompt() */
  prompt: string;
}

export interface GeneratedImage {
  /** Du lieu anh ket qua */
  data: Buffer;
  /** image/jpeg | image/png ... */
  mimeType: string;
  /** Provider nao da tao (de ghi usage log) */
  provider: string;
  /** Thoi gian tao (ms) — de ghi usage log */
  latencyMs: number;
}

export interface ImageProvider {
  readonly name: string;
  generateRoomImage(input: GenerateRoomImageInput): Promise<GeneratedImage>;
}

/** Loi tu provider — mang thong tin de quyet dinh retry hay that bai cuoi cung */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: "rate-limited" | "unavailable" | "invalid" | "unknown",
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
