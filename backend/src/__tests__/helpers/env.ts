/**
 * Chạy trước mỗi file test (jest "setupFiles").
 * config.ts đọc biến môi trường ngay lúc import và báo lỗi nếu thiếu,
 * nên phải gán giá trị giả ở đây trước khi test import routes.ts.
 * Không có PostgreSQL thật: pool trong db.ts được mock ở từng file test.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env["DATABASE_URL"] = "postgres://test:test@127.0.0.1:5432/room_decor_test";
process.env["JWT_SECRET"] = "test-secret-chi-dung-cho-unit-test-0123456789";
process.env["PUBLIC_BASE_URL"] = "http://api.test";
process.env["CORS_ORIGINS"] = "http://localhost:8081";
process.env["UPLOAD_DIR"] = mkdtempSync(path.join(tmpdir(), "room-decor-test-"));
