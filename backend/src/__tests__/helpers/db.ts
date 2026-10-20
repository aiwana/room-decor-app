/**
 * Mock cho src/db.ts: thay pool PostgreSQL bằng các hàm jest.fn().
 * Mỗi test tự quy định câu trả lời của query bằng mockResolvedValueOnce.
 *
 * Cách dùng trong file test (jest.mock phải nằm ở đầu file):
 *   jest.mock("../db", () => require("./helpers/db").dbModuleMock());
 *   import { pool } from "../db";
 *   const db = asMockPool(pool);
 */
import jwt from "jsonwebtoken";

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

export const result = (rows: Record<string, unknown>[] = [], rowCount = rows.length): QueryResult => ({
  rows,
  rowCount,
});

export const dbModuleMock = () => {
  const client = { query: jest.fn(), release: jest.fn() };
  return {
    pool: { query: jest.fn(), connect: jest.fn(async () => client), end: jest.fn(), client },
    initializeDatabase: jest.fn(),
  };
};

export interface MockPool {
  query: jest.Mock;
  connect: jest.Mock;
  client: { query: jest.Mock; release: jest.Mock };
}

export const asMockPool = (pool: unknown): MockPool => pool as MockPool;

export const USER_ID = "11111111-1111-4111-8111-111111111111";
export const DESIGN_ID = "22222222-2222-4222-8222-222222222222";

/** Token giống token thật do auth.ts tạo (cùng JWT_SECRET trong helpers/env.ts). */
export const bearer = (userId = USER_ID): string =>
  `Bearer ${jwt.sign({}, process.env["JWT_SECRET"] ?? "", { subject: userId, expiresIn: "1h" })}`;
