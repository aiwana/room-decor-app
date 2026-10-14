import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import cors from "cors";
import express, { type ErrorRequestHandler, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";

import { authenticate, getCurrentUser, login, register, type AuthenticatedRequest } from "./auth";
import { config } from "./config";
import { pool } from "./db";
import { productsByStyle } from "./seed";

export const app = express();
// Không tiết lộ "X-Powered-By: Express" cho client (SonarQube: Security).
app.disable("x-powered-by");
const uploads = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      void mkdir(config.UPLOAD_DIR, { recursive: true }).then(
        () => callback(null, config.UPLOAD_DIR),
        (error: unknown) => callback(error instanceof Error ? error : new Error(String(error)), config.UPLOAD_DIR),
      );
    },
    filename: (_req, file, callback) => {
      const ext = file.mimetype === "image/png" ? ".png"
        : file.mimetype === "image/webp" ? ".webp"
          : file.mimetype === "image/heic" ? ".heic"
            : file.mimetype === "image/heif" ? ".heif" : ".jpg";
      callback(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: config.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    const supported = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
    if (!supported.has(file.mimetype)) {
      callback(new UploadTypeError("Chỉ nhận ảnh JPEG, PNG, WebP hoặc HEIC."));
      return;
    }
    callback(null, true);
  },
});

class UploadTypeError extends Error {}

const errorResponse = (res: Response, status: number, message: string, errors?: Record<string, string>): void => {
  res.status(status).json({ message, ...(errors ? { errors } : {}) });
};

const parse = <T>(schema: z.ZodType<T>, input: unknown, res: Response): T | undefined => {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const errors = Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
  errorResponse(res, 400, "Dữ liệu gửi lên chưa hợp lệ.", errors);
  return undefined;
};

const productRow = (row: Record<string, unknown>) => ({
  id: row.id,
  name: row.name,
  brand: row.brand,
  price: Number(row.price),
  unit: row.unit,
  categoryId: row.category_id,
  categoryName: row.category_name,
  imageUrl: row.image_url,
  rating: Number(row.rating),
  reviewCount: row.review_count,
  description: row.description,
  specs: row.specs,
  colors: row.colors,
  sizes: row.sizes,
});

const productSelect = `
  SELECT p.*, c.label AS category_name
  FROM products p
  JOIN categories c ON c.id = p.category_id
`;

const designShape = z.object({
  id: z.string(),
  created_at: z.date(),
  original_image_path: z.string(),
  original_image_type: z.string(),
  result_image_url: z.string(),
  room_type: z.string(),
  style: z.string(),
  color_theme: z.string().nullable(),
  prompt: z.string().nullable(),
  status: z.enum(["processing", "done", "failed"]),
  error_message: z.string().nullable(),
  is_favorite: z.boolean(),
  products: z.array(z.object({ productId: z.string(), usage: z.string() })),
});

const signedImageUrl = (req: Request, filename: string): string => {
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const signature = createHmac("sha256", config.JWT_SECRET).update(`${filename}:${expires}`).digest("hex");
  const baseUrl = config.PUBLIC_BASE_URL ?? `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/api/media/${encodeURIComponent(filename)}?expires=${expires}&signature=${signature}`;
};

const toDesign = (req: Request, value: unknown) => {
  const row = designShape.parse(value);
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    originalImageUri: signedImageUrl(req, row.original_image_path),
    resultImageUrl: row.result_image_url,
    roomType: row.room_type,
    style: row.style,
    ...(row.color_theme ? { colorTheme: row.color_theme } : {}),
    ...(row.prompt ? { prompt: row.prompt } : {}),
    status: row.status,
    ...(row.error_message ? { errorMessage: row.error_message } : {}),
    products: row.products,
    isFavorite: row.is_favorite,
  };
};

const selectDesigns = `
  SELECT d.*,
    COALESCE(
      json_agg(json_build_object('productId', dp.product_id, 'usage', dp.usage))
        FILTER (WHERE dp.product_id IS NOT NULL),
      '[]'::json
    ) AS products
  FROM designs d
  LEFT JOIN design_products dp ON dp.design_id = d.id
`;

const requireUser = (req: Request): string => {
  const userId = (req as AuthenticatedRequest).auth?.userId;
  if (!userId) throw new Error("Authenticated route is missing its user context.");
  return userId;
};
const requireDesignId = (req: Request, res: Response, next: express.NextFunction): void => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    errorResponse(res, 404, "Không tìm thấy thiết kế.");
    return;
  }
  next();
};
const roomTypes = ["living", "bedroom", "kitchen", "office", "bathroom"] as const;
const styles = ["modern", "minimalist", "japandi", "scandinavian", "luxury", "industrial"] as const;
const colorThemes = ["white", "beige", "gray", "brown", "green", "black"] as const;

app.use(cors({
  origin: (origin, callback) => callback(null, !origin || config.CORS_ORIGINS.includes(origin)),
}));
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.status(200).json({ status: "ok", message: "Room Decor AI backend is running" });
});

app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.get("/api/me", authenticate, getCurrentUser);

app.get("/api/categories", async (_req, res) => {
  const result = await pool.query("SELECT id, label FROM categories ORDER BY id");
  res.json(result.rows);
});

app.get("/api/products", async (req, res) => {
  const querySchema = z.object({
    category: z.string().trim().min(1).optional(),
    ids: z.string().trim().min(1).optional(),
    featured: z.enum(["true", "false"]).optional(),
  });
  const query = parse(querySchema, req.query, res);
  if (!query) return;
  if (query.ids && query.ids.split(",").length > 100) {
    errorResponse(res, 400, "Tối đa 100 sản phẩm mỗi yêu cầu.", { ids: "Tối đa 100 sản phẩm mỗi yêu cầu." });
    return;
  }
  if (query.category) {
    const exists = await pool.query("SELECT 1 FROM categories WHERE id = $1", [query.category]);
    if (exists.rowCount === 0) {
      errorResponse(res, 404, "Không tìm thấy danh mục.");
      return;
    }
  }
  const filters: string[] = [];
  const params: unknown[] = [];
  if (query.category) {
    params.push(query.category);
    filters.push(`p.category_id = $${params.length}`);
  }
  if (query.ids) {
    params.push([...new Set(query.ids.split(",").map((id) => id.trim()).filter(Boolean))]);
    filters.push(`p.id = ANY($${params.length}::text[])`);
  }
  if (query.featured === "true") filters.push("p.featured = TRUE");
  const result = await pool.query(
    `${productSelect} ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
     ORDER BY p.featured DESC, p.id`,
    params,
  );
  const rows = result.rows.map((row) => productRow(row));
  if (query.ids) {
    const ordered = new Map(rows.map((row) => [String(row.id), row]));
    res.json([...new Set(query.ids.split(",").map((id) => id.trim()))]
      .flatMap((id) => ordered.has(id) ? [ordered.get(id)] : []));
    return;
  }
  res.json(rows);
});

app.get("/api/products/:id", async (req, res) => {
  const result = await pool.query(`${productSelect} WHERE p.id = $1`, [req.params.id]);
  if (!result.rows[0]) {
    errorResponse(res, 404, "Không tìm thấy sản phẩm.");
    return;
  }
  res.json(productRow(result.rows[0]));
});

app.post("/api/designs", authenticate, uploads.single("image"), async (req, res) => {
  const inputSchema = z.object({
    roomType: z.enum(roomTypes),
    style: z.enum(styles),
    colorTheme: z.enum(colorThemes).optional(),
    prompt: z.string().trim().max(200).optional(),
  });
  const input = parse(inputSchema, req.body, res);
  if (!input) {
    if (req.file) await rm(req.file.path, { force: true });
    return;
  }
  if (!req.file) {
    errorResponse(res, 400, "Vui lòng chọn ảnh căn phòng.", { image: "Vui lòng chọn ảnh căn phòng." });
    return;
  }

  const id = randomUUID();
  const suggestedProducts = productsByStyle[input.style];
  if (!suggestedProducts) throw new Error(`No product suggestions configured for style: ${input.style}`);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO designs
        (id, user_id, original_image_path, original_image_type, result_image_url, room_type, style,
         color_theme, prompt, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'done')`,
      [
        id,
        requireUser(req),
        req.file.filename,
        req.file.mimetype,
        `https://picsum.photos/seed/${id}/800/600`,
        input.roomType,
        input.style,
        input.colorTheme ?? null,
        input.prompt || null,
      ],
    );
    for (const product of suggestedProducts) {
      await client.query(
        "INSERT INTO design_products (design_id, product_id, usage) VALUES ($1, $2, $3)",
        [id, product.productId, product.usage],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    await rm(req.file.path, { force: true });
    throw error;
  } finally {
    client.release();
  }
  const result = await pool.query(`${selectDesigns} WHERE d.id = $1 GROUP BY d.id`, [id]);
  res.status(201).json(toDesign(req, result.rows[0]));
});

app.get("/api/designs", authenticate, async (req, res) => {
  const result = await pool.query(
    `${selectDesigns}
     WHERE d.user_id = $1 AND d.is_saved = TRUE
     GROUP BY d.id
     ORDER BY d.created_at DESC`,
    [requireUser(req)],
  );
  res.json(result.rows.map((row) => toDesign(req, row)));
});

app.get("/api/designs/:id", authenticate, requireDesignId, async (req, res) => {
  const result = await pool.query(
    `${selectDesigns}
     WHERE d.user_id = $1 AND d.id = $2
     GROUP BY d.id`,
    [requireUser(req), req.params.id],
  );
  if (!result.rows[0]) {
    errorResponse(res, 404, "Không tìm thấy thiết kế.");
    return;
  }
  res.json(toDesign(req, result.rows[0]));
});

app.post("/api/designs/:id/save", authenticate, requireDesignId, async (req, res) => {
  const result = await pool.query(
    "UPDATE designs SET is_saved = TRUE WHERE id = $1 AND user_id = $2 RETURNING id",
    [req.params.id, requireUser(req)],
  );
  if (result.rowCount === 0) {
    errorResponse(res, 404, "Không tìm thấy thiết kế.");
    return;
  }
  res.status(204).end();
});

app.delete("/api/designs/:id", authenticate, requireDesignId, async (req, res) => {
  const result = await pool.query(
    "DELETE FROM designs WHERE id = $1 AND user_id = $2 RETURNING original_image_path",
    [req.params.id, requireUser(req)],
  );
  if (!result.rows[0]) {
    errorResponse(res, 404, "Không tìm thấy thiết kế.");
    return;
  }
  try {
    await rm(path.join(config.UPLOAD_DIR, result.rows[0].original_image_path));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to remove uploaded design image", error);
    }
  }
  res.status(204).end();
});

app.post("/api/designs/:id/favorite", authenticate, requireDesignId, async (req, res) => {
  const result = await pool.query(
    "UPDATE designs SET is_favorite = TRUE WHERE id = $1 AND user_id = $2 RETURNING id",
    [req.params.id, requireUser(req)],
  );
  if (result.rowCount === 0) {
    errorResponse(res, 404, "Không tìm thấy thiết kế.");
    return;
  }
  res.status(204).end();
});

app.delete("/api/designs/:id/favorite", authenticate, requireDesignId, async (req, res) => {
  const result = await pool.query(
    "UPDATE designs SET is_favorite = FALSE WHERE id = $1 AND user_id = $2 RETURNING id",
    [req.params.id, requireUser(req)],
  );
  if (result.rowCount === 0) {
    errorResponse(res, 404, "Không tìm thấy thiết kế.");
    return;
  }
  res.status(204).end();
});

app.post("/api/quote-requests", async (req, res) => {
  const quoteSchema = z.object({
    productId: z.string().trim().min(1),
    customerName: z.string().trim().min(2).max(100),
    phone: z.string().trim().regex(/^0\d{9}$/, "Số điện thoại gồm 10 số, bắt đầu bằng 0."),
    quantity: z.number().int().positive(),
    note: z.string().trim().max(1000).optional(),
  });
  const input = parse(quoteSchema, req.body, res);
  if (!input) return;
  const product = await pool.query("SELECT 1 FROM products WHERE id = $1", [input.productId]);
  if (product.rowCount === 0) {
    errorResponse(res, 404, "Không tìm thấy sản phẩm.", { productId: "Không tìm thấy sản phẩm." });
    return;
  }
  const result = await pool.query(
    `INSERT INTO quote_requests (id, product_id, customer_name, phone, quantity, note)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at`,
    [randomUUID(), input.productId, input.customerName, input.phone, input.quantity, input.note ?? null],
  );
  res.status(201).json({ id: result.rows[0].id, createdAt: result.rows[0].created_at.toISOString() });
});

app.get("/api/media/:filename", async (req, res) => {
  const { filename } = req.params;
  const expires = Number(req.query.expires);
  const signature = req.query.signature;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|heic|heif)$/.test(filename) ||
      !Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000) ||
      typeof signature !== "string") {
    errorResponse(res, 403, "Liên kết ảnh không hợp lệ hoặc đã hết hạn.");
    return;
  }
  const expected = createHmac("sha256", config.JWT_SECRET).update(`${filename}:${expires}`).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, "hex");
  } catch {
    errorResponse(res, 403, "Liên kết ảnh không hợp lệ hoặc đã hết hạn.");
    return;
  }
  if (provided.length !== expected.length || !timingSafeEqual(expected, provided)) {
    errorResponse(res, 403, "Liên kết ảnh không hợp lệ hoặc đã hết hạn.");
    return;
  }
  const result = await pool.query(
    "SELECT original_image_type FROM designs WHERE original_image_path = $1",
    [filename],
  );
  if (!result.rows[0]) {
    errorResponse(res, 404, "Không tìm thấy ảnh.");
    return;
  }
  res.type(result.rows[0].original_image_type);
  const stream = createReadStream(path.join(config.UPLOAD_DIR, filename));
  stream.on("error", (error) => {
    console.error("Failed to read uploaded design image", error);
    if (!res.headersSent) errorResponse(res, 404, "Không tìm thấy ảnh.");
    else res.destroy(error);
  });
  stream.pipe(res);
});

app.use((_req, res) => errorResponse(res, 404, "Không tìm thấy API."));

const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof UploadTypeError) {
    errorResponse(res, 415, error.message, { image: error.message });
    return;
  }
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    errorResponse(res, tooLarge ? 413 : 400, tooLarge ? "Ảnh quá lớn, máy chủ không nhận." : "Tệp tải lên không hợp lệ.");
    return;
  }
  if (error instanceof SyntaxError && "body" in error) {
    errorResponse(res, 400, "JSON gửi lên không hợp lệ.");
    return;
  }
  console.error("Unhandled API error", error);
  errorResponse(res, 500, "Máy chủ đang gặp lỗi, vui lòng thử lại sau.");
};

app.use(errorHandler);
