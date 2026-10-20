/**
 * Danh mục và sản phẩm: GET /api/categories, GET /api/products, GET /api/products/:id
 */
import request from "supertest";

jest.mock("../db", () => require("./helpers/db").dbModuleMock());

import { pool } from "../db";
import { app } from "../routes";
import { asMockPool, result } from "./helpers/db";

const db = asMockPool(pool);

const productDbRow = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: `Sản phẩm ${id}`,
  brand: "Hoà Phát",
  price: "1250000", // pg trả BIGINT dưới dạng chuỗi
  unit: "m2",
  category_id: "tile",
  category_name: "Gạch ốp lát",
  image_url: `https://img.test/${id}.jpg`,
  rating: "4.5", // NUMERIC cũng là chuỗi
  review_count: 12,
  description: "Mô tả",
  specs: [{ label: "Kích thước", value: "60x60" }],
  colors: ["white"],
  sizes: ["60x60"],
  featured: false,
  ...extra,
});

beforeEach(() => {
  jest.resetAllMocks();
});

describe("GET /api/categories", () => {
  it("trả danh sách danh mục", async () => {
    db.query.mockResolvedValueOnce(result([{ id: "paint", label: "Sơn" }, { id: "tile", label: "Gạch" }]));

    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "paint", label: "Sơn" }, { id: "tile", label: "Gạch" }]);
  });
});

describe("GET /api/products", () => {
  it("trả toàn bộ sản phẩm, đổi tên cột snake_case sang camelCase và số", async () => {
    db.query.mockResolvedValueOnce(result([productDbRow("p1")]));

    const res = await request(app).get("/api/products");

    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      id: "p1",
      price: 1250000,
      rating: 4.5,
      categoryId: "tile",
      categoryName: "Gạch ốp lát",
      imageUrl: "https://img.test/p1.jpg",
      reviewCount: 12,
    });
    expect(res.body[0].category_id).toBeUndefined();
    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toContain("WHERE");
    expect(params).toEqual([]);
  });

  it("lọc theo category khi danh mục tồn tại", async () => {
    db.query
      .mockResolvedValueOnce(result([{ "?column?": 1 }]))
      .mockResolvedValueOnce(result([productDbRow("p1")]));

    const res = await request(app).get("/api/products?category=tile");

    expect(res.status).toBe(200);
    const [sql, params] = db.query.mock.calls[1] as [string, unknown[]];
    expect(sql).toContain("p.category_id = $1");
    expect(params).toEqual(["tile"]);
  });

  it("trả 404 khi category không tồn tại", async () => {
    db.query.mockResolvedValueOnce(result([], 0));

    const res = await request(app).get("/api/products?category=khong-co");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Không tìm thấy danh mục.");
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it("lọc featured=true", async () => {
    db.query.mockResolvedValueOnce(result([productDbRow("p1", { featured: true })]));

    const res = await request(app).get("/api/products?featured=true");

    expect(res.status).toBe(200);
    expect(db.query.mock.calls[0]?.[0]).toContain("p.featured = TRUE");
  });

  it("featured=false không thêm điều kiện lọc", async () => {
    db.query.mockResolvedValueOnce(result([]));

    await request(app).get("/api/products?featured=false");

    expect(db.query.mock.calls[0]?.[0]).not.toContain("WHERE");
  });

  it("trả 400 khi featured không phải true/false", async () => {
    const res = await request(app).get("/api/products?featured=maybe");

    expect(res.status).toBe(400);
    expect(res.body.errors.featured).toBeDefined();
    expect(db.query).not.toHaveBeenCalled();
  });

  it("lọc theo ids: bỏ trùng, giữ đúng thứ tự client gửi, bỏ id không có", async () => {
    db.query.mockResolvedValueOnce(result([productDbRow("p1"), productDbRow("p3")]));

    const res = await request(app).get("/api/products?ids=p3,p1,p3,p9");

    expect(res.status).toBe(200);
    expect(res.body.map((p: { id: string }) => p.id)).toEqual(["p3", "p1"]);
    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("p.id = ANY($1::text[])");
    expect(params).toEqual([["p3", "p1", "p9"]]);
  });

  it("kết hợp category và ids thì đánh số tham số $1, $2 đúng", async () => {
    db.query
      .mockResolvedValueOnce(result([{ "?column?": 1 }]))
      .mockResolvedValueOnce(result([]));

    await request(app).get("/api/products?category=tile&ids=p1");

    const [sql, params] = db.query.mock.calls[1] as [string, unknown[]];
    expect(sql).toContain("p.category_id = $1 AND p.id = ANY($2::text[])");
    expect(params).toEqual(["tile", ["p1"]]);
  });

  it("trả 400 khi xin quá 100 sản phẩm một lần", async () => {
    const ids = Array.from({ length: 101 }, (_v, i) => `p${i}`).join(",");

    const res = await request(app).get(`/api/products?ids=${ids}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Tối đa 100 sản phẩm mỗi yêu cầu.");
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe("GET /api/products/:id", () => {
  it("trả chi tiết sản phẩm", async () => {
    db.query.mockResolvedValueOnce(result([productDbRow("p1")]));

    const res = await request(app).get("/api/products/p1");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("p1");
    expect(db.query.mock.calls[0]?.[1]).toEqual(["p1"]);
  });

  it("trả 404 khi không có sản phẩm", async () => {
    db.query.mockResolvedValueOnce(result([]));

    const res = await request(app).get("/api/products/khong-co");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Không tìm thấy sản phẩm.");
  });
});
