/**
 * Cấu hình Jest cho backend.
 * - ts-jest dịch file .ts khi chạy test, dùng tsconfig.test.json (có kiểu của jest).
 * - helpers/env.ts chạy trước mỗi file test để gán biến môi trường giả cho config.ts.
 * - Coverage dưới ngưỡng thì "npm run test:coverage" / "test:ci" báo lỗi.
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFiles: ["<rootDir>/src/__tests__/helpers/env.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  // Đo coverage trên code thật, bỏ file test và server.ts (chỉ gọi listen)
  collectCoverageFrom: ["src/**/*.ts", "!src/**/__tests__/**", "!src/server.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "clover", "json-summary"],
  coverageThreshold: {
    global: { branches: 70, functions: 80, lines: 80, statements: 80 },
  },
  // jest-junit ghi coverage/junit.xml cho tab Test Result của Jenkins
  reporters: [
    "default",
    ["jest-junit", { outputDirectory: "coverage", outputName: "junit.xml", ancestorSeparator: " › " }],
  ],
};
