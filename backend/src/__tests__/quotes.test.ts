/**
 * POST /api/quote-requests: khách gửi yêu cầu báo giá cho một sản phẩm.
 */
import request from "supertest";

jest.mock("../db", () => require("./helpers/db").dbModuleMock());

import { pool } from "../db";
import { app } from "../routes";
import { asMockPool, result } from "./helpers/db";

const db = asMockPool(pool);
const valid = { productId: "p1", customerName: "Trần Thị B", phone: "0912345678", quantity: 3 };

beforeEach(() => {
  jest.resetAllMocks();
});

describe("POST /api/quote-requests", () => {
  it("tạo yêu cầu báo giá: trả 201 với id và createdAt", async () => {
    const createdAt = new Date("2026-10-20T01:02:03.000Z");
    db.query
      .mockResolvedValueOnce(result([{ "?column?": 1 }]))
      .mockResolvedValueOnce(result([{ id: "q-1", created_at: createdAt }]));

    const res = await request(app).post("/api/quote-requests").send({ ...valid, note: "  giao buổi sáng  " });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "q-1", createdAt: "2026-10-20T01:02:03.000Z" });
    const [, params] = db.query.mock.calls[1] as [string, unknown[]];
    expect(params.slice(1)).toEqual(["p1", "Trần Thị B", "0912345678", 3, "giao buổi sáng"]);
  });

  it("lưu note = null khi không gửi ghi chú", async () => {
    db.query
      .mockResolvedValueOnce(result([{ "?column?": 1 }]))
      .mockResolvedValueOnce(result([{ id: "q-2", created_at: new Date() }]));

    await request(app).post("/api/quote-requests").send(valid);

    const [, params] = db.query.mock.calls[1] as [string, unknown[]];
    expect(params[5]).toBeNull();
  });

  it("trả 404 khi sản phẩm không tồn tại", async () => {
    db.query.mockResolvedValueOnce(result([], 0));

    const res = await request(app).post("/api/quote-requests").send(valid);

    expect(res.status).toBe(404);
    expect(res.body.errors.productId).toBe("Không tìm thấy sản phẩm.");
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["số điện thoại không bắt đầu bằng 0", { phone: "1912345678" }, "phone"],
    ["số điện thoại thiếu số", { phone: "091234" }, "phone"],
    ["số lượng bằng 0", { quantity: 0 }, "quantity"],
    ["số lượng là số thập phân", { quantity: 1.5 }, "quantity"],
    ["tên khách quá ngắn", { customerName: "B" }, "customerName"],
    ["thiếu productId", { productId: "" }, "productId"],
  ])("trả 400 khi %s", async (_case, override, field) => {
    const res = await request(app).post("/api/quote-requests").send({ ...valid, ...override });

    expect(res.status).toBe(400);
    expect(res.body.errors[field]).toBeDefined();
    expect(db.query).not.toHaveBeenCalled();
  });
});
