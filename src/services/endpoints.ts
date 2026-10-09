/**
 * src/services/endpoints.ts
 * TAT CA duong dan API cua frontend nam o day (khong viet duong dan trong man hinh).
 *
 * TRANG THAI (09/10/2026):
 *   - HEALTH: DA CO tren backend (backend/src/server.ts).
 *   - Con lai: CHI LA DE XUAT, backend CHUA trien khai. Phai thong nhat
 *     voi nguoi lam backend (xem docs/api-contract-de-xuat.md) roi sua o day.
 *   Khi USE_MOCK = true (mac dinh), app KHONG goi cac duong dan de xuat.
 */
export const ENDPOINTS = {
  /** DA CO */
  HEALTH: '/health',

  /* ----------------------- DE XUAT (chua co) ----------------------- */
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  ME: '/api/me',

  CATEGORIES: '/api/categories',
  PRODUCTS: '/api/products',
  product: (id: string): string => `/api/products/${encodeURIComponent(id)}`,

  DESIGNS: '/api/designs',
  design: (id: string): string => `/api/designs/${encodeURIComponent(id)}`,
  designSave: (id: string): string => `/api/designs/${encodeURIComponent(id)}/save`,
  designFavorite: (id: string): string => `/api/designs/${encodeURIComponent(id)}/favorite`,

  QUOTE_REQUESTS: '/api/quote-requests',
} as const;
