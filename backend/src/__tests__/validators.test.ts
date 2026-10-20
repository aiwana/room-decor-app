/**
 * __tests__/validators.test.ts
 * Unit test cho logic validator và error mapper của backend (app.ts)
 * — không phụ thuộc HTTP, kiểm tra thuần TypeScript.
 */

/* ─── isValidEmail (tự implement lại vì không muốn import frontend code) ─── */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (email: string): boolean => EMAIL_REGEX.test(email.trim());

describe("isValidEmail", () => {
  const validEmails = [
    "user@example.com",
    "name.surname@domain.org",
    "user+tag@sub.domain.vn",
    "123@numbers.io",
  ];

  const invalidEmails = [
    "",
    "plainaddress",
    "@no-local.com",
    "no-at-sign",
    "two@@at.com",
    "space @domain.com",
    "domain.com",
  ];

  it.each(validEmails)("chấp nhận email hợp lệ: %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(invalidEmails)("từ chối email không hợp lệ: %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

/* ─── Response data shape validators (isUser, isDesign, isProduct, ...) ─── */
// Sao chép logic từ src/services/validators.ts để test độc lập
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;
const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isUser = (v: unknown): boolean =>
  isRecord(v) && isString(v['id']) && isString(v['name']) && isString(v['email']);

const isAuthSession = (v: unknown): boolean =>
  isRecord(v) && isString(v['token']) && (v['token'] as string).length > 0 && isUser(v['user']);

const isProduct = (v: unknown): boolean =>
  isRecord(v) &&
  isString(v['id']) &&
  isString(v['name']) &&
  isNumber(v['price']) &&
  isString(v['unit']) &&
  isString(v['categoryId']) &&
  isString(v['imageUrl']) &&
  Array.isArray(v['specs']) &&
  Array.isArray(v['colors']) &&
  Array.isArray(v['sizes']);

const isDesign = (v: unknown): boolean =>
  isRecord(v) &&
  isString(v['id']) &&
  isString(v['createdAt']) &&
  isString(v['originalImageUri']) &&
  isString(v['resultImageUrl']) &&
  isString(v['roomType']) &&
  isString(v['style']) &&
  (v['status'] === 'processing' || v['status'] === 'done' || v['status'] === 'failed') &&
  Array.isArray(v['products']) &&
  typeof v['isFavorite'] === 'boolean';

describe("isUser", () => {
  it("true cho object đúng cấu trúc", () => {
    expect(isUser({ id: "u1", name: "An", email: "a@b.com" })).toBe(true);
  });

  it("false khi thiếu id", () => {
    expect(isUser({ name: "An", email: "a@b.com" })).toBe(false);
  });

  it("false khi thiếu name", () => {
    expect(isUser({ id: "u1", email: "a@b.com" })).toBe(false);
  });

  it("false khi thiếu email", () => {
    expect(isUser({ id: "u1", name: "An" })).toBe(false);
  });

  it("false cho null", () => {
    expect(isUser(null)).toBe(false);
  });

  it("false cho string", () => {
    expect(isUser("not-an-object")).toBe(false);
  });
});

describe("isAuthSession", () => {
  const validUser = { id: "u1", name: "An", email: "a@b.com" };

  it("true cho session hợp lệ", () => {
    expect(isAuthSession({ token: "abc123", user: validUser })).toBe(true);
  });

  it("false khi token rỗng", () => {
    expect(isAuthSession({ token: "", user: validUser })).toBe(false);
  });

  it("false khi user sai cấu trúc", () => {
    expect(isAuthSession({ token: "abc", user: { id: "u1" } })).toBe(false);
  });

  it("false khi thiếu user", () => {
    expect(isAuthSession({ token: "abc" })).toBe(false);
  });
});

describe("isProduct", () => {
  const validProd = {
    id: "p1",
    name: "Sofa",
    price: 1500000,
    unit: "bộ",
    categoryId: "cat-1",
    imageUrl: "https://example.com/img.jpg",
    specs: [],
    colors: [],
    sizes: [],
  };

  it("true cho product hợp lệ", () => {
    expect(isProduct(validProd)).toBe(true);
  });

  it("false khi price là string", () => {
    expect(isProduct({ ...validProd, price: "1500000" })).toBe(false);
  });

  it("false khi price là Infinity", () => {
    expect(isProduct({ ...validProd, price: Infinity })).toBe(false);
  });

  it("false khi specs không phải mảng", () => {
    expect(isProduct({ ...validProd, specs: "vải" })).toBe(false);
  });

  it("false khi thiếu imageUrl", () => {
    const { imageUrl: _i, ...noProd } = validProd;
    expect(isProduct(noProd)).toBe(false);
  });
});

describe("isDesign", () => {
  const validDesign = {
    id: "d1",
    createdAt: "2026-01-01T00:00:00.000Z",
    originalImageUri: "file:///photo.jpg",
    resultImageUrl: "https://example.com/result.jpg",
    roomType: "living-room",
    style: "modern",
    status: "done",
    products: [],
    isFavorite: false,
  };

  it("true cho design hợp lệ (done)", () => {
    expect(isDesign(validDesign)).toBe(true);
  });

  it("true cho design với status processing", () => {
    expect(isDesign({ ...validDesign, status: "processing" })).toBe(true);
  });

  it("true cho design với status failed", () => {
    expect(isDesign({ ...validDesign, status: "failed" })).toBe(true);
  });

  it("false khi status không hợp lệ", () => {
    expect(isDesign({ ...validDesign, status: "unknown" })).toBe(false);
  });

  it("false khi isFavorite không phải boolean", () => {
    expect(isDesign({ ...validDesign, isFavorite: 1 })).toBe(false);
  });

  it("false khi products không phải mảng", () => {
    expect(isDesign({ ...validDesign, products: null })).toBe(false);
  });

  it("false khi thiếu id", () => {
    const { id: _i, ...noId } = validDesign;
    expect(isDesign(noId)).toBe(false);
  });
});
