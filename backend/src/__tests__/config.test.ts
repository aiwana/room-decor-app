/**
 * config.ts: backend phải dừng ngay khi thiếu hoặc sai biến môi trường quan trọng.
 */
const loadConfig = () => {
  let loaded: typeof import("../config") | undefined;
  jest.isolateModules(() => {
    loaded = require("../config");
  });
  return loaded?.config;
};

describe("config", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("tách CORS_ORIGINS thành mảng và bỏ khoảng trắng", () => {
    process.env["CORS_ORIGINS"] = " http://a.test , ,http://b.test";

    expect(loadConfig()?.CORS_ORIGINS).toEqual(["http://a.test", "http://b.test"]);
  });

  it("dùng giá trị mặc định cho PORT", () => {
    delete process.env["PORT"];

    expect(loadConfig()?.PORT).toBe(3000);
  });

  it("báo lỗi khi JWT_SECRET ngắn hơn 32 ký tự", () => {
    process.env["JWT_SECRET"] = "ngan";

    expect(loadConfig).toThrow(/JWT_SECRET must contain at least 32 characters/);
  });

  it("báo lỗi khi thiếu DATABASE_URL", () => {
    process.env["DATABASE_URL"] = "";

    expect(loadConfig).toThrow(/DATABASE_URL is required/);
  });
});
