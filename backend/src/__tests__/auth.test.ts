/**
 * __tests__/auth.test.ts
 * Unit test cho POST /api/auth/register và POST /api/auth/login
 */
import request from "supertest";
import { app, userStore } from "../app";

// Reset store trước mỗi test để tránh ô nhiễm dữ liệu
beforeEach(() => {
  userStore.clear();
});

/* ══════════════════════════ REGISTER ══════════════════════════ */
describe("POST /api/auth/register", () => {
  const validPayload = {
    name: "Nguyễn Văn A",
    email: "user@example.com",
    password: "123456",
  };

  it("đăng ký thành công — trả về 201 với token và user", async () => {
    const res = await request(app).post("/api/auth/register").send(validPayload);

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);
    expect(res.body.user).toMatchObject({
      name: validPayload.name,
      email: validPayload.email,
    });
    // id phải tồn tại
    expect(typeof res.body.user.id).toBe("string");
    // Không trả về mật khẩu
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("trả về 409 khi email đã tồn tại", async () => {
    await request(app).post("/api/auth/register").send(validPayload);
    const res = await request(app).post("/api/auth/register").send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/email/i);
  });

  it("trả về 422 khi thiếu name", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@b.com", password: "123456" });

    expect(res.status).toBe(422);
  });

  it("trả về 422 khi email sai định dạng", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "A", email: "not-an-email", password: "123456" });

    expect(res.status).toBe(422);
  });

  it("trả về 422 khi mật khẩu quá ngắn (< 6 ký tự)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "A B", email: "a@b.com", password: "12" });

    expect(res.status).toBe(422);
  });

  it("trả về 422 khi name quá ngắn (< 2 ký tự)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "A", email: "a@b.com", password: "123456" });

    expect(res.status).toBe(422);
  });

  it("trả về 422 khi body rỗng", async () => {
    const res = await request(app).post("/api/auth/register").send({});
    expect(res.status).toBe(422);
  });
});

/* ══════════════════════════ LOGIN ══════════════════════════════ */
describe("POST /api/auth/login", () => {
  const creds = { email: "login@test.com", password: "secret123" };

  // Tạo user trước mỗi test trong nhóm này
  beforeEach(async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ name: "Tester", ...creds });
  });

  it("đăng nhập thành công — trả về 200 với token và user", async () => {
    const res = await request(app).post("/api/auth/login").send(creds);

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.email).toBe(creds.email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("trả về 401 khi mật khẩu sai", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: creds.email, password: "wrongpass" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBeTruthy();
  });

  it("trả về 401 khi email không tồn tại", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@nowhere.com", password: "any" });

    expect(res.status).toBe(401);
  });

  it("trả về 422 khi thiếu email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "123456" });

    expect(res.status).toBe(422);
  });

  it("trả về 422 khi thiếu password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com" });

    expect(res.status).toBe(422);
  });

  it("trả về 422 khi email sai định dạng", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "bad-email", password: "123456" });

    expect(res.status).toBe(422);
  });
});
