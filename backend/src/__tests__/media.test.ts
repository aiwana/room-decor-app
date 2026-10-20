/**
 * GET /api/media/:filename: ảnh gốc chỉ xem được qua link có chữ ký HMAC còn hạn.
 */
import { createHmac } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import request from "supertest";

jest.mock("../db", () => require("./helpers/db").dbModuleMock());

import { pool } from "../db";
import { app } from "../routes";
import { asMockPool, result } from "./helpers/db";

const db = asMockPool(pool);
const uploadDir = process.env["UPLOAD_DIR"] ?? "";
const filename = "77777777-7777-4777-8777-777777777777.png";

const sign = (name: string, expires: number): string =>
  createHmac("sha256", process.env["JWT_SECRET"] ?? "").update(`${name}:${expires}`).digest("hex");
const future = (): number => Math.floor(Date.now() / 1000) + 3600;
const mediaUrl = (name: string, expires: number, signature: string): string =>
  `/api/media/${name}?expires=${expires}&signature=${signature}`;

beforeEach(() => {
  jest.resetAllMocks();
});

describe("GET /api/media/:filename", () => {
  it("trả ảnh với đúng Content-Type khi chữ ký hợp lệ", async () => {
    writeFileSync(path.join(uploadDir, filename), "noi-dung-anh");
    db.query.mockResolvedValueOnce(result([{ original_image_type: "image/png" }]));
    const expires = future();

    const res = await request(app).get(mediaUrl(filename, expires, sign(filename, expires)));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.body.toString()).toBe("noi-dung-anh");
  });

  it("trả 403 khi link đã hết hạn", async () => {
    const expires = Math.floor(Date.now() / 1000) - 1;

    const res = await request(app).get(mediaUrl(filename, expires, sign(filename, expires)));

    expect(res.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("trả 403 khi chữ ký bị sửa", async () => {
    const expires = future();
    const bad = sign(filename, expires).replace(/^./, (c) => (c === "a" ? "b" : "a"));

    const res = await request(app).get(mediaUrl(filename, expires, bad));

    expect(res.status).toBe(403);
  });

  it("trả 403 khi chữ ký sai độ dài", async () => {
    const res = await request(app).get(mediaUrl(filename, future(), "abcd"));

    expect(res.status).toBe(403);
  });

  it("trả 403 khi thiếu signature", async () => {
    const res = await request(app).get(`/api/media/${filename}?expires=${future()}`);

    expect(res.status).toBe(403);
  });

  it("trả 403 khi tên file không đúng mẫu (chặn ../)", async () => {
    const name = "..%2F.env";
    const expires = future();

    const res = await request(app).get(mediaUrl(name, expires, sign("../.env", expires)));

    expect(res.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("trả 404 khi ảnh không có trong database", async () => {
    db.query.mockResolvedValueOnce(result([]));
    const expires = future();

    const res = await request(app).get(mediaUrl(filename, expires, sign(filename, expires)));

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Không tìm thấy ảnh.");
  });

  it("trả 404 khi database có nhưng file trên đĩa đã mất", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const missing = "88888888-8888-4888-8888-888888888888.jpg";
    db.query.mockResolvedValueOnce(result([{ original_image_type: "image/jpeg" }]));
    const expires = future();

    const res = await request(app).get(mediaUrl(missing, expires, sign(missing, expires)));

    expect(res.status).toBe(404);
    spy.mockRestore();
  });
});
