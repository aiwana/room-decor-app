/**
 * db.ts: tạo bảng, nạp dữ liệu mẫu và giữ server sống khi PostgreSQL ngắt kết nối.
 * Mock thư viện "pg" nên không cần database thật.
 */
const mockQuery = jest.fn();
const mockOn = jest.fn();
const mockPoolConstructor = jest.fn();

jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation((options: unknown) => {
    mockPoolConstructor(options);
    return { query: mockQuery, on: mockOn };
  }),
}));

import { categories, products } from "../seed";

const loadDb = (): typeof import("../db") => {
  let loaded: typeof import("../db") | undefined;
  jest.isolateModules(() => {
    loaded = require("../db");
  });
  if (!loaded) throw new Error("db.ts was not loaded");
  return loaded;
};

describe("db", () => {
  const original = { ...process.env };

  beforeEach(() => {
    mockQuery.mockReset().mockResolvedValue({ rows: [], rowCount: 0 });
    mockOn.mockReset();
    mockPoolConstructor.mockReset();
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("tạo pool từ DATABASE_URL, không bật SSL mặc định", () => {
    loadDb();

    expect(mockPoolConstructor).toHaveBeenCalledWith({ connectionString: process.env["DATABASE_URL"] });
  });

  it("bật SSL khi PGSSL=true", () => {
    process.env["PGSSL"] = "true";

    loadDb();

    expect(mockPoolConstructor).toHaveBeenCalledWith(expect.objectContaining({ ssl: true }));
  });

  it("ghi log thay vì làm sập server khi pool báo lỗi", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    loadDb();
    const handler = mockOn.mock.calls.find(([event]) => event === "error")?.[1] as (e: Error) => void;

    handler(new Error("terminating connection"));

    expect(spy).toHaveBeenCalledWith("PostgreSQL pool error (idle client):", "terminating connection");
    spy.mockRestore();
  });

  it("initializeDatabase tạo bảng rồi nạp đủ danh mục và sản phẩm mẫu", async () => {
    const { initializeDatabase } = loadDb();

    await initializeDatabase();

    const sqls = mockQuery.mock.calls.map(([sql]) => String(sql));
    expect(sqls[0]).toContain("CREATE TABLE IF NOT EXISTS users");
    expect(sqls.filter((sql) => sql.includes("INSERT INTO categories"))).toHaveLength(categories.length);
    expect(sqls.filter((sql) => sql.includes("INSERT INTO products"))).toHaveLength(products.length);
    // Chạy lại nhiều lần không bị lỗi trùng khoá
    expect(sqls.slice(1).every((sql) => sql.includes("ON CONFLICT (id) DO NOTHING"))).toBe(true);
  });
});
