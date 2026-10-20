/**
 * src/app.ts
 * Express app được tách ra khỏi server.ts để có thể import trong test
 * mà không bị bind port (supertest tự quản lý port).
 */
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

export const app = express();

app.use(express.json());

/* ─────────────────────────── Health ─────────────────────────── */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Room Decor AI backend is running" });
});

/* ─────────────────────────── Auth ───────────────────────────── */
// In-memory store (mock) — thay bằng DB thật khi tích hợp
interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // bản demo: lưu plain (thay bcrypt khi production)
}
export const userStore: Map<string, StoredUser> = new Map();
let userSeq = 1;

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const makeToken = (userId: string): string =>
  Buffer.from(`${userId}:${Date.now()}`).toString("base64");

app.post("/api/auth/register", (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const { name, email, password } = parsed.data;
  // Kiểm tra email trùng
  const existing = [...userStore.values()].find((u) => u.email === email);
  if (existing) {
    res.status(409).json({ message: "Email đã tồn tại" });
    return;
  }
  const id = `usr-${userSeq++}`;
  const user: StoredUser = { id, name, email, passwordHash: password };
  userStore.set(id, user);
  res.status(201).json({ token: makeToken(id), user: { id, name, email } });
});

app.post("/api/auth/login", (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const { email, password } = parsed.data;
  const user = [...userStore.values()].find((u) => u.email === email);
  if (!user || user.passwordHash !== password) {
    res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    return;
  }
  res.status(200).json({ token: makeToken(user.id), user: { id: user.id, name: user.name, email: user.email } });
});

/* ─────────────────────────── Products ───────────────────────── */
export interface ProductRecord {
  id: string;
  name: string;
  price: number;
  unit: string;
  categoryId: string;
  imageUrl: string;
  specs: string[];
  colors: string[];
  sizes: string[];
  categoryName?: string;
}
export const productStore: Map<string, ProductRecord> = new Map();

const ProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  unit: z.string().min(1),
  categoryId: z.string().min(1),
  imageUrl: z.string().url(),
  specs: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
});

let productSeq = 1;

app.get("/api/products", (_req: Request, res: Response) => {
  res.status(200).json([...productStore.values()]);
});

app.get("/api/products/:id", (req: Request, res: Response) => {
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const product = productStore.get(id ?? "");
  if (!product) {
    res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    return;
  }
  res.status(200).json(product);
});

app.post("/api/products", (req: Request, res: Response) => {
  const parsed = ProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const id = `prd-${productSeq++}`;
  const product: ProductRecord = { id, ...parsed.data };
  productStore.set(id, product);
  res.status(201).json(product);
});

/* ─────────────────────────── Designs ────────────────────────── */
export interface DesignRecord {
  id: string;
  createdAt: string;
  originalImageUri: string;
  resultImageUrl: string;
  roomType: string;
  style: string;
  colorTheme?: string;
  prompt?: string;
  status: "processing" | "done" | "failed";
  products: Array<{ productId: string; usage: string }>;
  isFavorite: boolean;
  isSaved: boolean;
}
export const designStore: Map<string, DesignRecord> = new Map();
let designSeq = 1;

const DesignCreateSchema = z.object({
  originalImageUri: z.string().min(1),
  resultImageUrl: z.string().min(1),
  roomType: z.string().min(1),
  style: z.string().min(1),
  colorTheme: z.string().optional(),
  prompt: z.string().optional(),
  status: z.enum(["processing", "done", "failed"]).default("done"),
  products: z
    .array(z.object({ productId: z.string(), usage: z.string() }))
    .default([]),
});

app.get("/api/designs", (_req: Request, res: Response) => {
  const list = [...designStore.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  res.status(200).json(list);
});

const getParam = (p: string | string[] | undefined): string =>
  Array.isArray(p) ? (p[0] ?? "") : (p ?? "");

app.get("/api/designs/:id", (req: Request, res: Response) => {
  const design = designStore.get(getParam(req.params["id"]));
  if (!design) {
    res.status(404).json({ message: "Không tìm thấy thiết kế" });
    return;
  }
  res.status(200).json(design);
});

app.post("/api/designs", (req: Request, res: Response) => {
  const parsed = DesignCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const id = `dsg-${designSeq++}`;
  const { colorTheme, prompt, ...rest } = parsed.data;
  const design: DesignRecord = {
    id,
    createdAt: new Date().toISOString(),
    isFavorite: false,
    isSaved: false,
    ...rest,
    ...(colorTheme !== undefined ? { colorTheme } : {}),
    ...(prompt !== undefined ? { prompt } : {}),
  };
  designStore.set(id, design);
  res.status(201).json(design);
});

app.post("/api/designs/:id/save", (req: Request, res: Response) => {
  const design = designStore.get(getParam(req.params["id"]));
  if (!design) {
    res.status(404).json({ message: "Không tìm thấy thiết kế" });
    return;
  }
  design.isSaved = true;
  res.status(200).json({ ok: true });
});

app.post("/api/designs/:id/favorite", (req: Request, res: Response) => {
  const design = designStore.get(getParam(req.params["id"]));
  if (!design) {
    res.status(404).json({ message: "Không tìm thấy thiết kế" });
    return;
  }
  design.isFavorite = true;
  res.status(200).json({ ok: true });
});

app.delete("/api/designs/:id/favorite", (req: Request, res: Response) => {
  const design = designStore.get(getParam(req.params["id"]));
  if (!design) {
    res.status(404).json({ message: "Không tìm thấy thiết kế" });
    return;
  }
  design.isFavorite = false;
  res.status(200).json({ ok: true });
});

app.delete("/api/designs/:id", (req: Request, res: Response) => {
  const existed = designStore.delete(getParam(req.params["id"]));
  if (!existed) {
    res.status(404).json({ message: "Không tìm thấy thiết kế" });
    return;
  }
  res.status(204).send();
});

/* ─────────────────────────── Quotes ─────────────────────────── */
export interface QuoteRecord {
  id: string;
  createdAt: string;
  designId?: string;
  name: string;
  phone: string;
  email?: string;
  note?: string;
}
export const quoteStore: Map<string, QuoteRecord> = new Map();
let quoteSeq = 1;

const QuoteSchema = z.object({
  designId: z.string().optional(),
  name: z.string().min(2),
  phone: z.string().min(9),
  email: z.string().email().optional(),
  note: z.string().optional(),
});

app.post("/api/quote-requests", (req: Request, res: Response) => {
  const parsed = QuoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const id = `qr-${quoteSeq++}`;
  const { designId, email, note, ...required } = parsed.data;
  const quote: QuoteRecord = {
    id,
    createdAt: new Date().toISOString(),
    ...required,
    ...(designId !== undefined ? { designId } : {}),
    ...(email !== undefined ? { email } : {}),
    ...(note !== undefined ? { note } : {}),
  };
  quoteStore.set(id, quote);
  res.status(201).json({ ok: true, id });
});

/* ─────────────────────── Error handler ──────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
});
