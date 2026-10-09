/**
 * src/services/apiClient.ts
 * Client HTTP DUY NHAT cua app (axios). Moi service goi backend qua day.
 *
 * - baseURL lay tu config.ts (khong hardcode trong man hinh)
 * - Tu gan token dang nhap (neu co) vao header
 * - Moi loi deu doi thanh ApiError (xem apiError.ts)
 * - Ham request() kiem tra du lieu tra ve truoc khi dua cho man hinh
 *
 * KHONG console.log request/response o day: co the lo token, mat khau.
 */
import { create, type AxiosRequestConfig } from 'axios';

import { ApiError, toApiError } from './apiError';
import { API_TIMEOUT_MS, API_URL } from './config';

export const apiClient = create({
  baseURL: API_URL,
  timeout: API_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

/* ------------------------- Token dang nhap ------------------------- */
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** AuthContext goi ham nay sau khi dang nhap / dang xuat / khoi phuc phien */
export const setAuthToken = (token: string | null): void => {
  authToken = token;
};

/** AuthContext dang ky: khi may chu tra 401 (token het han) -> dang xuat */
export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  onUnauthorized = handler;
};

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    // DE XUAT: "Authorization: Bearer <token>" - can xac nhan voi backend
    config.headers.set('Authorization', `Bearer ${authToken}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error);
    if (apiError.status === 401 && authToken && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(apiError);
  },
);

/* ---------------------- Goi API + kiem tra du lieu ---------------------- */
/** Ham kiem tra: true neu du lieu dung dinh dang mong doi */
export type Guard<T> = (value: unknown) => value is T;

/**
 * Goi API va kiem tra response. Response sai dinh dang -> ApiError('invalid_response')
 * thay vi de man hinh crash khi doc truong khong ton tai.
 *
 *   const products = await request({ method: 'GET', url: ENDPOINTS.PRODUCTS }, isProductList);
 */
export const request = async <T>(config: AxiosRequestConfig, guard: Guard<T>): Promise<T> => {
  const res = await apiClient.request<unknown>(config);
  if (!guard(res.data)) {
    throw new ApiError('invalid_response', 'Dữ liệu máy chủ trả về không đúng định dạng.');
  }
  return res.data;
};

/** Goi API khong can doc du lieu tra ve (xoa, danh dau...) */
export const send = async (config: AxiosRequestConfig): Promise<void> => {
  await apiClient.request(config);
};
