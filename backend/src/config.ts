import "dotenv/config";
import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
  CORS_ORIGINS: z.string().default("http://localhost:8081,http://localhost:19006"),
  PUBLIC_BASE_URL: z.string().url().optional(),
  UPLOAD_DIR: z.string().default(path.resolve(process.cwd(), "storage", "uploads")),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  PGSSL: z.enum(["true", "false"]).default("false"),
  // --- AI ---
  AI_PROVIDER: z.enum(["pollinations"]).default("pollinations"),
  AI_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  /** Thoi gian toi da 1 job AI duoc phep retry trong nen (bao gom cho slot 45s/ip) */
  MAX_AI_JOB_WAIT_MS: z.coerce.number().int().positive().default(5 * 60_000),
  /** So lan toi da 1 job duoc thu lai khi provider bi rate-limit */
  AI_MAX_RETRIES: z.coerce.number().int().positive().default(4),
}).superRefine((value, ctx) => {
  // Provider can key (gemini...) thi bat buoc co AI_API_KEY — Pollinations thi khong can.
  if (value.AI_PROVIDER !== "pollinations" && !process.env.AI_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["AI_API_KEY"], message: "AI_API_KEY is required for the selected AI_PROVIDER" });
  }
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map(({ path: field, message }) => `${field.join(".")}: ${message}`);
  throw new Error(`Invalid backend environment:\n${details.join("\n")}`);
}

export const config = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
  UPLOAD_DIR: path.resolve(parsed.data.UPLOAD_DIR),
};
