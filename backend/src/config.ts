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
