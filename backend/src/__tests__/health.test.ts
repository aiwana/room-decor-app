/**
 * __tests__/health.test.ts
 * Unit test cho endpoint GET /health
 */
import request from "supertest";
import { app } from "../app";

describe("GET /health", () => {
  it("trả về 200 với status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok" });
    expect(typeof res.body.message).toBe("string");
  });
});
