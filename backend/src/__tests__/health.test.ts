/**
 * GET /health và các xử lý chung của app (404, JSON hỏng, lỗi 500, CORS).
 */
import request from "supertest";

jest.mock("../db", () => require("./helpers/db").dbModuleMock());

import { pool } from "../db";
import { app } from "../routes";
import { asMockPool, result } from "./helpers/db";

const db = asMockPool(pool);

beforeEach(() => {
  jest.resetAllMocks();
});

describe("GET /health", () => {
  it("trả 200 khi PostgreSQL trả lời SELECT 1", async () => {
    db.query.mockResolvedValueOnce(result([{ "?column?": 1 }]));

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", message: "Room Decor AI backend is running" });
    expect(db.query).toHaveBeenCalledWith("SELECT 1");
  });

  it("trả 500 với thông báo chung khi không kết nối được database", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    db.query.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const res = await request(app).get("/health");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Máy chủ đang gặp lỗi, vui lòng thử lại sau.");
    // Không lộ chi tiết lỗi nội bộ ra client
    expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
    spy.mockRestore();
  });
});

describe("Xử lý chung", () => {
  it("trả 404 cho API không tồn tại", async () => {
    const res = await request(app).get("/api/khong-co");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Không tìm thấy API.");
  });

  it("trả 400 khi body không phải JSON hợp lệ", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{email:");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("JSON gửi lên không hợp lệ.");
  });

  it("không gửi header X-Powered-By", async () => {
    const res = await request(app).get("/api/khong-co");

    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("chỉ cho phép origin nằm trong CORS_ORIGINS", async () => {
    const allowed = await request(app).get("/api/khong-co").set("Origin", "http://localhost:8081");
    const blocked = await request(app).get("/api/khong-co").set("Origin", "http://evil.example");

    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:8081");
    expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
