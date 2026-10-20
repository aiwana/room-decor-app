/**
 * __tests__/designs.test.ts
 * Unit test cho toàn bộ CRUD + save/favorite của /api/designs
 */
import request from "supertest";
import { app, designStore } from "../app";

beforeEach(() => {
  designStore.clear();
});

const validDesign = {
  originalImageUri: "file:///phone/photo.jpg",
  resultImageUrl: "https://example.com/result.jpg",
  roomType: "living-room",
  style: "modern",
  status: "done",
  products: [{ productId: "prd-1", usage: "sofa chính" }],
};

/* Helper: tạo design và trả về body */
const createDesign = async (data = validDesign) => {
  const res = await request(app).post("/api/designs").send(data);
  return res.body as { id: string; [key: string]: unknown };
};

/* ══════════════════════════ GET /api/designs ═══════════════════ */
describe("GET /api/designs", () => {
  it("trả về mảng rỗng khi chưa có thiết kế", async () => {
    const res = await request(app).get("/api/designs");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("trả về danh sách sắp xếp mới nhất trước", async () => {
    await createDesign();
    await createDesign({ ...validDesign, roomType: "bedroom" });

    const res = await request(app).get("/api/designs");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    // Mới nhất trước (createdAt giảm dần)
    const dates = (res.body as Array<{ createdAt: string }>).map((d) => d.createdAt);
    expect(dates[0]! >= dates[1]!).toBe(true);
  });
});

/* ══════════════════════════ POST /api/designs ══════════════════ */
describe("POST /api/designs", () => {
  it("tạo thiết kế thành công — trả về 201 với id và isFavorite=false", async () => {
    const res = await request(app).post("/api/designs").send(validDesign);

    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe("string");
    expect(res.body.isFavorite).toBe(false);
    expect(res.body.isSaved).toBe(false);
    expect(typeof res.body.createdAt).toBe("string");
  });

  it("trả về 422 khi thiếu roomType", async () => {
    const { roomType: _r, ...noRoom } = validDesign;
    const res = await request(app).post("/api/designs").send(noRoom);
    expect(res.status).toBe(422);
  });

  it("trả về 422 khi thiếu style", async () => {
    const { style: _s, ...noStyle } = validDesign;
    const res = await request(app).post("/api/designs").send(noStyle);
    expect(res.status).toBe(422);
  });

  it("status mặc định là 'done' nếu không gửi", async () => {
    const { status: _st, ...noStatus } = validDesign;
    const res = await request(app).post("/api/designs").send(noStatus);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("done");
  });

  it("products mặc định là mảng rỗng nếu không gửi", async () => {
    const { products: _p, ...noProducts } = validDesign;
    const res = await request(app).post("/api/designs").send(noProducts);
    expect(res.status).toBe(201);
    expect(res.body.products).toEqual([]);
  });

  it("chấp nhận status = 'processing'", async () => {
    const res = await request(app)
      .post("/api/designs")
      .send({ ...validDesign, status: "processing" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("processing");
  });

  it("trả về 422 khi status không hợp lệ", async () => {
    const res = await request(app)
      .post("/api/designs")
      .send({ ...validDesign, status: "unknown-status" });
    expect(res.status).toBe(422);
  });
});

/* ══════════════════════════ GET /api/designs/:id ═══════════════ */
describe("GET /api/designs/:id", () => {
  it("trả về thiết kế khi id tồn tại", async () => {
    const { id } = await createDesign();
    const res = await request(app).get(`/api/designs/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it("trả về 404 khi id không tồn tại", async () => {
    const res = await request(app).get("/api/designs/ghost-id");
    expect(res.status).toBe(404);
  });
});

/* ══════════════════════════ POST /api/designs/:id/save ═════════ */
describe("POST /api/designs/:id/save", () => {
  it("đánh dấu isSaved = true", async () => {
    const { id } = await createDesign();
    const saveRes = await request(app).post(`/api/designs/${id}/save`);
    expect(saveRes.status).toBe(200);

    const getRes = await request(app).get(`/api/designs/${id}`);
    expect(getRes.body.isSaved).toBe(true);
  });

  it("trả về 404 khi id không tồn tại", async () => {
    const res = await request(app).post("/api/designs/ghost/save");
    expect(res.status).toBe(404);
  });
});

/* ══════════════════════════ POST/DELETE /api/designs/:id/favorite */
describe("favorite toggle", () => {
  it("POST /favorite → isFavorite = true", async () => {
    const { id } = await createDesign();
    const res = await request(app).post(`/api/designs/${id}/favorite`);
    expect(res.status).toBe(200);

    const getRes = await request(app).get(`/api/designs/${id}`);
    expect(getRes.body.isFavorite).toBe(true);
  });

  it("DELETE /favorite → isFavorite = false", async () => {
    const { id } = await createDesign();
    await request(app).post(`/api/designs/${id}/favorite`);
    const res = await request(app).delete(`/api/designs/${id}/favorite`);
    expect(res.status).toBe(200);

    const getRes = await request(app).get(`/api/designs/${id}`);
    expect(getRes.body.isFavorite).toBe(false);
  });

  it("POST /favorite trả về 404 khi id không tồn tại", async () => {
    const res = await request(app).post("/api/designs/ghost/favorite");
    expect(res.status).toBe(404);
  });

  it("DELETE /favorite trả về 404 khi id không tồn tại", async () => {
    const res = await request(app).delete("/api/designs/ghost/favorite");
    expect(res.status).toBe(404);
  });
});

/* ══════════════════════════ DELETE /api/designs/:id ═══════════ */
describe("DELETE /api/designs/:id", () => {
  it("xóa thiết kế thành công — trả về 204", async () => {
    const { id } = await createDesign();
    const res = await request(app).delete(`/api/designs/${id}`);
    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/designs/${id}`);
    expect(getRes.status).toBe(404);
  });

  it("trả về 404 khi id không tồn tại", async () => {
    const res = await request(app).delete("/api/designs/ghost-id");
    expect(res.status).toBe(404);
  });
});
