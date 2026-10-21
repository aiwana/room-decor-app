/**
 * Đăng ký, đăng nhập, GET /api/me (auth.ts) với pool PostgreSQL được mock.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";

jest.mock("../db", () => require("./helpers/db").dbModuleMock());

import { pool } from "../db";
import { app } from "../routes";
import { asMockPool, bearer, result, USER_ID } from "./helpers/db";

const db = asMockPool(pool);
const userRow = { id: USER_ID, name: "Nguyễn Văn A", email: "user@example.com", avatar_url: null };

beforeEach(() => {
  jest.resetAllMocks();
});

describe("POST /api/auth/register", () => {
  const payload = { name: "Nguyễn Văn A", email: "  User@Example.com ", password: "123456" };

  it("tạo tài khoản: trả 201, JWT hợp lệ, không trả mật khẩu", async () => {
    db.query.mockResolvedValueOnce(result([userRow]));

    const res = await request(app).post("/api/auth/register").send(payload);

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: USER_ID, name: "Nguyễn Văn A", email: "user@example.com" });
    const decoded = jwt.verify(res.body.token, process.env["JWT_SECRET"] ?? "") as jwt.JwtPayload;
    expect(decoded.sub).toBe(USER_ID);

    // Email được chuẩn hoá (trim + chữ thường), mật khẩu lưu dạng bcrypt hash
    const [, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(params[2]).toBe("user@example.com");
    expect(params[3]).not.toBe("123456");
    expect(await bcrypt.compare("123456", String(params[3]))).toBe(true);
  });

  it("trả avatarUrl khi user có ảnh đại diện", async () => {
    db.query.mockResolvedValueOnce(result([{ ...userRow, avatar_url: "https://img.test/a.png" }]));

    const res = await request(app).post("/api/auth/register").send(payload);

    expect(res.body.user.avatarUrl).toBe("https://img.test/a.png");
  });

  it("trả 409 khi email đã được đăng ký (ON CONFLICT không trả dòng nào)", async () => {
    db.query.mockResolvedValueOnce(result([]));

    const res = await request(app).post("/api/auth/register").send(payload);

    expect(res.status).toBe(409);
    expect(res.body.errors.email).toBe("Email này đã được đăng ký.");
  });

  it.each([
    ["thiếu tên", { email: "a@b.com", password: "123456" }, "name"],
    ["tên quá ngắn", { name: "A", email: "a@b.com", password: "123456" }, "name"],
    ["email sai định dạng", { name: "Nam", email: "abc", password: "123456" }, "email"],
    ["mật khẩu dưới 6 ký tự", { name: "Nam", email: "a@b.com", password: "123" }, "password"],
  ])("trả 400 khi %s", async (_case, body, field) => {
    const res = await request(app).post("/api/auth/register").send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Dữ liệu gửi lên chưa hợp lệ.");
    expect(res.body.errors[field]).toBeDefined();
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/login", () => {
  const passwordHash = bcrypt.hashSync("123456", 4);

  it("đăng nhập đúng: trả 200 và token", async () => {
    db.query.mockResolvedValueOnce(result([{ ...userRow, password_hash: passwordHash }]));

    const res = await request(app).post("/api/auth/login").send({ email: "USER@example.com", password: "123456" });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toEqual({ id: USER_ID, name: "Nguyễn Văn A", email: "user@example.com" });
    expect(db.query.mock.calls[0]?.[1]).toEqual(["user@example.com"]);
  });

  it("trả 401 khi sai mật khẩu", async () => {
    db.query.mockResolvedValueOnce(result([{ ...userRow, password_hash: passwordHash }]));

    const res = await request(app).post("/api/auth/login").send({ email: "user@example.com", password: "sai-mat-khau" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Email hoặc mật khẩu không đúng.");
  });

  it("trả 401 khi email không tồn tại (cùng thông báo, không lộ email nào có thật)", async () => {
    db.query.mockResolvedValueOnce(result([]));

    const res = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "123456" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Email hoặc mật khẩu không đúng.");
  });

  it("trả 400 khi thiếu mật khẩu", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "user@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.errors.password).toBeDefined();
  });
});

describe("GET /api/me", () => {
  it("trả thông tin user khi token hợp lệ", async () => {
    db.query.mockResolvedValueOnce(result([userRow]));

    const res = await request(app).get("/api/me").set("Authorization", bearer());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: USER_ID, name: "Nguyễn Văn A", email: "user@example.com" });
  });

  it("trả 401 khi không gửi token", async () => {
    const res = await request(app).get("/api/me");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Vui lòng đăng nhập để tiếp tục.");
  });

  it("trả 401 khi token sai chữ ký", async () => {
    const forged = jwt.sign({}, "mot-secret-khac-hoan-toan-0123456789abcdef", { subject: USER_ID });

    const res = await request(app).get("/api/me").set("Authorization", `Bearer ${forged}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Phiên đăng nhập đã hết hạn hoặc không hợp lệ.");
  });

  it("trả 401 khi token không có subject (id user)", async () => {
    const noSubject = jwt.sign({}, process.env["JWT_SECRET"] ?? "");

    const res = await request(app).get("/api/me").set("Authorization", `Bearer ${noSubject}`);

    expect(res.status).toBe(401);
  });

  it("trả 401 khi user trong token đã bị xoá", async () => {
    db.query.mockResolvedValueOnce(result([]));

    const res = await request(app).get("/api/me").set("Authorization", bearer());

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Phiên đăng nhập không còn hợp lệ.");
  });
});
