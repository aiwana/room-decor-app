/**
 * backend/src/usageLog.ts
 * Bang ai_usage_log: ghi moi lan goi AI (user, latency, ket qua, loai loi)
 * — phan "moi so co nguon" cua bao cao do an + lam du lieu thong ke dashboard.
 */
import type { Pool } from "pg";

export interface UsageEntry {
  userId: string;
  designId: string;
  provider: string;
  attempt: number;
  latencyMs: number;
  outcome: "success" | "rate-limited" | "error";
  detail?: string;
}

export const usageLogSchema = `
  CREATE TABLE IF NOT EXISTS ai_usage_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    design_id UUID,
    provider TEXT NOT NULL,
    attempt INTEGER NOT NULL,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    outcome TEXT NOT NULL CHECK (outcome IN ('success', 'rate-limited', 'error')),
    detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS ai_usage_log_created_idx ON ai_usage_log(created_at DESC);
`;

export const makeUsageLogger = (pool: Pool) => {
  return (entry: UsageEntry): void => {
    // Promise.resolve(): log lỗi không bao giờ được làm rơi job (kể cả khi query mock trả undefined trong unit test)
    void Promise.resolve(
      pool.query(
        `INSERT INTO ai_usage_log (user_id, design_id, provider, attempt, latency_ms, outcome, detail)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [entry.userId, entry.designId, entry.provider, entry.attempt, entry.latencyMs, entry.outcome, entry.detail ?? null],
      ),
    ).catch((error: unknown) => console.error("usage log failed", error));
  };
};
