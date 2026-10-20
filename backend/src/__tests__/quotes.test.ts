/**
 * __tests__/quotes.test.ts
 * Unit test cho POST /api/quote-requests
 */
import request from "supertest";
import { app, quoteStore } from "../app";

beforeEach(() => {
  quoteStore.clear();
});

const validQuote = {
  name: "Nguyễn Thị B",
  phone: "0901234567",
  email: "b@example.com",
  designId: "dsg-001",
  note: "Tôi muốn tư vấn thêm về nội thất phòng khách",
};

/* ══════════════════════════ POST /api/quote-requests ═══════════ */
describe("POST /api/quote-requests", () => {
  it("gửi báo giá thành công — trả về 201 với id", async () => {
    const res = await request(app).post("/api/quote-requests").send(validQuote);

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.id).toBe("string");
  });

  it("chấp nhận yêu cầu không có email và designId (tuỳ chọn)", async () => {
    const res = await request(app)
      .post("/api/quote-requests")
      .send({ name: "Khách Hàng C", phone: "0909999888" });

    expect(res.status).toBe(201);
  });

  it("trả về 422 khi thiếu name", async () => {
    const { name: _n, ...noName } = validQuote;
    const res = await request(app).post("/api/quote-requests").send(noName);
    expect(res.status).toBe(422);
  });

  it("trả về 422 khi thiếu phone", async () => {
    const { phone: _p, ...noPhone } = validQuote;
    const res = await request(app).post("/api/quote-requests").send(noPhone);
    expect(res.status).toBe(422);
  });

  it("trả về 422 khi name quá ngắn (< 2 ký tự)", async () => {
    const res = await request(app)
      .post("/api/quote-requests")
      .send({ ...validQuote, name: "A" });
    expect(res.status).toBe(422);
  });

  it("trả về 422 khi phone quá ngắn (< 9 ký tự)", async () => {
    const res = await request(app)
      .post("/api/quote-requests")
      .send({ ...validQuote, phone: "012" });
    expect(res.status).toBe(422);
  });

  it("trả về 422 khi email không đúng định dạng", async () => {
    const res = await request(app)
      .post("/api/quote-requests")
      .send({ ...validQuote, email: "bad-email" });
    expect(res.status).toBe(422);
  });

  it("trả về 422 khi body rỗng", async () => {
    const res = await request(app).post("/api/quote-requests").send({});
    expect(res.status).toBe(422);
  });

  it("lưu dữ liệu vào store sau khi tạo thành công", async () => {
    expect(quoteStore.size).toBe(0);
    await request(app).post("/api/quote-requests").send(validQuote);
    expect(quoteStore.size).toBe(1);
    const stored = [...quoteStore.values()][0]!;
    expect(stored.name).toBe(validQuote.name);
    expect(stored.phone).toBe(validQuote.phone);
    expect(typeof stored.createdAt).toBe("string");
  });

  it("nhiều yêu cầu có id khác nhau", async () => {
    const res1 = await request(app).post("/api/quote-requests").send(validQuote);
    const res2 = await request(app)
      .post("/api/quote-requests")
      .send({ ...validQuote, name: "Khách Hàng D" });

    expect(res1.body.id).not.toBe(res2.body.id);
  });
});
