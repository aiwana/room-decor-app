/**
 * Thiết kế của user: tạo (upload ảnh), xem, lưu, yêu thích, xoá.
 * Ảnh upload được ghi vào thư mục tạm (UPLOAD_DIR trong helpers/env.ts).
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import request from "supertest";

jest.mock("../db", () => require("./helpers/db").dbModuleMock());

import { pool } from "../db";
import { app } from "../routes";
import { asMockPool, bearer, DESIGN_ID, result } from "./helpers/db";

const db = asMockPool(pool);
const uploadDir = process.env["UPLOAD_DIR"] ?? "";
const png = Buffer.from("89504e470d0a1a0a", "hex"); // chỉ cần phần đầu file, multer không đọc nội dung

const designDbRow = (extra: Record<string, unknown> = {}) => ({
  id: DESIGN_ID,
  created_at: new Date("2026-10-20T03:00:00.000Z"),
  original_image_path: "33333333-3333-4333-8333-333333333333.png",
  original_image_type: "image/png",
  result_image_url: "https://picsum.photos/seed/x/800/600",
  room_type: "living",
  style: "modern",
  color_theme: null,
  prompt: null,
  status: "done",
  error_message: null,
  is_favorite: false,
  products: [{ productId: "prd-02", usage: "Sàn" }],
  ...extra,
});

const uploadedFiles = (): string[] => readdirSync(uploadDir);

/** routes.ts trả 400 trước rồi mới xoá file, nên đợi tối đa 1 giây cho thư mục về đúng số file. */
const waitForFileCount = async (count: number): Promise<number> => {
  for (let i = 0; i < 50 && uploadedFiles().length !== count; i++) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return uploadedFiles().length;
};

beforeEach(() => {
  jest.resetAllMocks();
  db.connect.mockResolvedValue(db.client);
});

describe("Các route thiết kế yêu cầu đăng nhập", () => {
  it.each([
    ["get", "/api/designs"],
    ["post", "/api/designs"],
    ["get", `/api/designs/${DESIGN_ID}`],
    ["post", `/api/designs/${DESIGN_ID}/save`],
    ["post", `/api/designs/${DESIGN_ID}/favorite`],
    ["delete", `/api/designs/${DESIGN_ID}/favorite`],
    ["delete", `/api/designs/${DESIGN_ID}`],
  ] as const)("%s %s trả 401 khi không có token", async (method, url) => {
    const res = await request(app)[method](url);

    expect(res.status).toBe(401);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe("POST /api/designs", () => {
  it("tạo thiết kế trong một transaction và trả 201", async () => {
    db.client.query.mockResolvedValue(result([]));
    db.query.mockResolvedValueOnce(result([designDbRow({ color_theme: "beige", prompt: "ấm áp" })]));

    const res = await request(app)
      .post("/api/designs")
      .set("Authorization", bearer())
      .field("roomType", "living")
      .field("style", "modern")
      .field("colorTheme", "beige")
      .field("prompt", "ấm áp")
      .attach("image", png, { filename: "phong.png", contentType: "image/png" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: DESIGN_ID,
      createdAt: "2026-10-20T03:00:00.000Z",
      roomType: "living",
      style: "modern",
      colorTheme: "beige",
      prompt: "ấm áp",
      status: "done",
      isFavorite: false,
    });
    // Ảnh gốc trả về qua link có chữ ký, không lộ đường dẫn file
    expect(res.body.originalImageUri).toMatch(
      /^http:\/\/api\.test\/api\/media\/33333333-3333-4333-8333-333333333333\.png\?expires=\d+&signature=[0-9a-f]{64}$/,
    );

    const sqls = db.client.query.mock.calls.map((call) => String(call[0]));
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.filter((sql) => sql.includes("INSERT INTO design_products"))).toHaveLength(4);
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(db.client.release).toHaveBeenCalledTimes(1);
  });

  it("bỏ trống colorTheme/prompt thì lưu null", async () => {
    db.client.query.mockResolvedValue(result([]));
    db.query.mockResolvedValueOnce(result([designDbRow()]));

    const res = await request(app)
      .post("/api/designs")
      .set("Authorization", bearer())
      .field("roomType", "bedroom")
      .field("style", "japandi")
      .attach("image", png, { filename: "a.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(201);
    expect(res.body.colorTheme).toBeUndefined();
    const insert = db.client.query.mock.calls[1] as [string, unknown[]];
    expect(insert[1].slice(7)).toEqual([null, null]);
  });

  it("trả 400 và xoá ảnh đã upload khi style không hợp lệ", async () => {
    const before = uploadedFiles().length;

    const res = await request(app)
      .post("/api/designs")
      .set("Authorization", bearer())
      .field("roomType", "living")
      .field("style", "baroque")
      .attach("image", png, { filename: "a.png", contentType: "image/png" });

    expect(res.status).toBe(400);
    expect(res.body.errors.style).toBeDefined();
    expect(await waitForFileCount(before)).toBe(before);
    expect(db.connect).not.toHaveBeenCalled();
  });

  it("trả 400 khi không gửi ảnh", async () => {
    const res = await request(app)
      .post("/api/designs")
      .set("Authorization", bearer())
      .field("roomType", "living")
      .field("style", "modern");

    expect(res.status).toBe(400);
    expect(res.body.errors.image).toBe("Vui lòng chọn ảnh căn phòng.");
  });

  it("trả 415 khi file không phải ảnh hỗ trợ", async () => {
    const res = await request(app)
      .post("/api/designs")
      .set("Authorization", bearer())
      .field("roomType", "living")
      .field("style", "modern")
      .attach("image", Buffer.from("%PDF"), { filename: "a.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(415);
    expect(res.body.errors.image).toBe("Chỉ nhận ảnh JPEG, PNG, WebP hoặc HEIC.");
  });

  it("trả 400 khi gửi nhiều hơn một file", async () => {
    const res = await request(app)
      .post("/api/designs")
      .set("Authorization", bearer())
      .field("roomType", "living")
      .field("style", "modern")
      .attach("image", png, { filename: "a.png", contentType: "image/png" })
      .attach("image", png, { filename: "b.png", contentType: "image/png" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Tệp tải lên không hợp lệ.");
  });

  it("ROLLBACK, xoá ảnh và trả 500 khi ghi database lỗi", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const before = uploadedFiles().length;
    db.client.query
      .mockResolvedValueOnce(result([])) // BEGIN
      .mockRejectedValueOnce(new Error("insert failed"))
      .mockResolvedValue(result([])); // ROLLBACK

    const res = await request(app)
      .post("/api/designs")
      .set("Authorization", bearer())
      .field("roomType", "living")
      .field("style", "modern")
      .attach("image", png, { filename: "a.webp", contentType: "image/webp" });

    expect(res.status).toBe(500);
    expect(db.client.query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(db.client.release).toHaveBeenCalledTimes(1);
    expect(uploadedFiles()).toHaveLength(before);
    spy.mockRestore();
  });
});

describe("GET /api/designs", () => {
  it("chỉ trả các thiết kế đã lưu của user đang đăng nhập", async () => {
    db.query.mockResolvedValueOnce(result([designDbRow({ is_favorite: true, error_message: "x" })]));

    const res = await request(app).get("/api/designs").set("Authorization", bearer("44444444-4444-4444-8444-444444444444"));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ isFavorite: true, errorMessage: "x" });
    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("d.is_saved = TRUE");
    expect(params).toEqual(["44444444-4444-4444-8444-444444444444"]);
  });
});

describe("GET /api/designs/:id", () => {
  it("trả thiết kế khi tìm thấy", async () => {
    db.query.mockResolvedValueOnce(result([designDbRow()]));

    const res = await request(app).get(`/api/designs/${DESIGN_ID}`).set("Authorization", bearer());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(DESIGN_ID);
  });

  it("trả 404 khi thiết kế không thuộc user hoặc không tồn tại", async () => {
    db.query.mockResolvedValueOnce(result([]));

    const res = await request(app).get(`/api/designs/${DESIGN_ID}`).set("Authorization", bearer());

    expect(res.status).toBe(404);
  });

  it("trả 404 ngay khi id không phải UUID, không gọi database", async () => {
    const res = await request(app).get("/api/designs/khong-phai-uuid").set("Authorization", bearer());

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Không tìm thấy thiết kế.");
    expect(db.query).not.toHaveBeenCalled();
  });

  it("trả 500 khi dữ liệu trong database sai dạng", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    db.query.mockResolvedValueOnce(result([designDbRow({ status: "unknown" })]));

    const res = await request(app).get(`/api/designs/${DESIGN_ID}`).set("Authorization", bearer());

    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});

describe.each([
  ["post", "save", "is_saved = TRUE"],
  ["post", "favorite", "is_favorite = TRUE"],
  ["delete", "favorite", "is_favorite = FALSE"],
] as const)("%s /api/designs/:id/%s", (method, action, sqlPart) => {
  it("trả 204 khi cập nhật được", async () => {
    db.query.mockResolvedValueOnce(result([{ id: DESIGN_ID }]));

    const res = await request(app)[method](`/api/designs/${DESIGN_ID}/${action}`).set("Authorization", bearer());

    expect(res.status).toBe(204);
    expect(db.query.mock.calls[0]?.[0]).toContain(sqlPart);
  });

  it("trả 404 khi không có thiết kế", async () => {
    db.query.mockResolvedValueOnce(result([], 0));

    const res = await request(app)[method](`/api/designs/${DESIGN_ID}/${action}`).set("Authorization", bearer());

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/designs/:id", () => {
  it("xoá bản ghi và file ảnh, trả 204", async () => {
    const filename = "55555555-5555-4555-8555-555555555555.jpg";
    writeFileSync(path.join(uploadDir, filename), "x");
    db.query.mockResolvedValueOnce(result([{ original_image_path: filename }]));

    const res = await request(app).delete(`/api/designs/${DESIGN_ID}`).set("Authorization", bearer());

    expect(res.status).toBe(204);
    expect(existsSync(path.join(uploadDir, filename))).toBe(false);
  });

  it("vẫn trả 204 khi file ảnh đã mất từ trước", async () => {
    db.query.mockResolvedValueOnce(result([{ original_image_path: "66666666-6666-4666-8666-666666666666.jpg" }]));

    const res = await request(app).delete(`/api/designs/${DESIGN_ID}`).set("Authorization", bearer());

    expect(res.status).toBe(204);
  });

  it("ghi log nhưng vẫn trả 204 khi không xoá được file vì lỗi khác", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    // Đường dẫn là một thư mục không rỗng: rm() không có recursive sẽ báo lỗi khác ENOENT
    db.query.mockResolvedValueOnce(result([{ original_image_path: "." }]));

    const res = await request(app).delete(`/api/designs/${DESIGN_ID}`).set("Authorization", bearer());

    expect(res.status).toBe(204);
    expect(spy).toHaveBeenCalledWith("Failed to remove uploaded design image", expect.anything());
    spy.mockRestore();
  });

  it("trả 404 khi không có thiết kế", async () => {
    db.query.mockResolvedValueOnce(result([]));

    const res = await request(app).delete(`/api/designs/${DESIGN_ID}`).set("Authorization", bearer());

    expect(res.status).toBe(404);
  });
});
