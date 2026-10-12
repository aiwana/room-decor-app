import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { z } from "zod";

import { config } from "./config";
import { pool } from "./db";

export interface AuthenticatedRequest extends Request {
  auth?: { userId: string };
}

const credentials = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(6).max(128),
});
const registration = credentials.extend({
  name: z.string().trim().min(2).max(100),
});

const sessionToken = (userId: string): string =>
  jwt.sign({}, config.JWT_SECRET, { subject: userId, expiresIn: "7d" });

const toUser = (row: { id: string; name: string; email: string; avatar_url: string | null }) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  ...(row.avatar_url ? { avatarUrl: row.avatar_url } : {}),
});

const invalidInput = (res: Response, error: z.ZodError): void => {
  const errors = Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
  res.status(400).json({ message: "Dữ liệu gửi lên chưa hợp lệ.", errors });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const parsed = registration.safeParse(req.body);
  if (!parsed.success) return invalidInput(res, parsed.error);

  const { name, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (id, name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, name, email, avatar_url`,
    [randomUUID(), name, email, passwordHash],
  );
  const user = result.rows[0];
  if (!user) {
    res.status(409).json({ message: "Email này đã được đăng ký.", errors: { email: "Email này đã được đăng ký." } });
    return;
  }
  res.status(201).json({ token: sessionToken(user.id), user: toUser(user) });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return invalidInput(res, parsed.error);

  const { email, password } = parsed.data;
  const result = await pool.query(
    "SELECT id, name, email, password_hash, avatar_url FROM users WHERE email = $1",
    [email],
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
    return;
  }
  res.status(200).json({ token: sessionToken(user.id), user: toUser(user) });
};

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const header = req.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];
  if (!token) {
    res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục." });
    return;
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    if (typeof payload.sub !== "string") throw new Error("Token subject is missing");
    req.auth = { userId: payload.sub };
    next();
  } catch {
    res.status(401).json({ message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ." });
  }
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await pool.query(
    "SELECT id, name, email, avatar_url FROM users WHERE id = $1",
    [req.auth?.userId],
  );
  if (!result.rows[0]) {
    res.status(401).json({ message: "Phiên đăng nhập không còn hợp lệ." });
    return;
  }
  res.status(200).json(toUser(result.rows[0]));
};
