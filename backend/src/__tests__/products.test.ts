/**
 * __tests__/products.test.ts
 * Unit test cho GET/POST /api/products và GET /api/products/:id
 */
import request from "supertest";
import { app, productStore } from "../app";

beforeEach(() => {
  productStore.clear();
});

const validProduct = {
  name: "Sofa góc chữ L",
  price: 12500000,
  unit: "bộ",
  categoryId: "cat-sofa",
  imageUrl: "https://example.com/sofa.jpg",
  specs: ["Vải cao cấp", "Khung gỗ sồi"],
  colors: ["Xám", "Be"],
  sizes: ["2m4", "3m"],
};

/* ══════════════════════════ GET /api/products ══════════════════ */
describe("GET /api/products", () => {
  it("trả về mảng rỗng khi chưa có sản phẩm", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("trả về danh sách sau khi tạo sản phẩm", async () => {
    await request(app).post("/api/products").send(validProduct);
    await request(app).post("/api/products").send({ ...validProduct, name: "Bàn cafe" });

    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

/* ══════════════════════════ POST /api/products ═════════════════ */
describe("POST /api/products", () => {
  it("tạo sản phẩm thành công — trả về 201 với id", async () => {
    const res = await request(app).post("/api/products").send(validProduct);

    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe("string");
    expect(res.body.name).toBe(validProduct.name);
    expect(res.body.price).toBe(validProduct.price);
  });

  it("trả về 422 khi thiếu name", async () => {
    const { name: _n, ...noName } = validProduct;
    const res = await request(app).post("/api/products").send(noName);
    expect(res.status).toBe(422);
  });

  it("trả về 422 khi price âm", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ ...validProduct, price: -1 });
    expect(res.status).toBe(422);
  });

  it("trả về 422 khi imageUrl không phải URL", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ ...validProduct, imageUrl: "not-a-url" });
    expect(res.status).toBe(422);
  });

  it("trả về 422 khi body rỗng", async () => {
    const res = await request(app).post("/api/products").send({});
    expect(res.status).toBe(422);
  });

  it("specs/colors/sizes mặc định là mảng rỗng nếu không gửi", async () => {
    const minimal = {
      name: "Bàn gỗ",
      price: 1000000,
      unit: "chiếc",
      categoryId: "cat-table",
      imageUrl: "https://example.com/ban.jpg",
    };
    const res = await request(app).post("/api/products").send(minimal);
    expect(res.status).toBe(201);
    expect(res.body.specs).toEqual([]);
    expect(res.body.colors).toEqual([]);
    expect(res.body.sizes).toEqual([]);
  });
});

/* ══════════════════════════ GET /api/products/:id ═════════════ */
describe("GET /api/products/:id", () => {
  it("trả về sản phẩm khi id tồn tại", async () => {
    const created = await request(app).post("/api/products").send(validProduct);
    const id: string = created.body.id as string;

    const res = await request(app).get(`/api/products/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.name).toBe(validProduct.name);
  });

  it("trả về 404 khi id không tồn tại", async () => {
    const res = await request(app).get("/api/products/ghost-id");
    expect(res.status).toBe(404);
  });
});
