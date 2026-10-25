/**
 * src/services/api-client.ts
 * Client HTTP DUY NHAT cua app (axios). Moi service goi backend qua day.
 *
 * - baseURL lay tu constants (khong hardcode trong man hinh)
 * - Tu gan "Authorization: Bearer <token>" khi da dang nhap
 * - Moi loi deu doi thanh ApiError (xem api-error.ts)
 * - May chu tra 401 khi dang co token -> bao cho auth-store dang xuat
 *
 * KHONG console.log request/response o day: co the lo token, mat khau.
 */
import axios, { type AxiosInstance } from 'axios';

import { API_BASE_URL, API_TIMEOUT } from '@/constants';

import { toApiError } from './api-error';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: { Accept: 'application/json' },
});

/* ------------------------- Token dang nhap ------------------------- */
// Giu token trong bo nho de interceptor khong phai doc SecureStore moi request
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** auth-store goi ham nay sau khi dang nhap / dang xuat / khoi phuc phien */
export const setAuthToken = (token: string | null): void => {
  authToken = token;
};

/** auth-store dang ky: khi may chu tra 401 (token het han) -> dang xuat */
export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  onUnauthorized = handler;
};

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.set('Authorization', `Bearer ${authToken}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    const apiError = toApiError(error);
    if (apiError.status === 401 && authToken && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(apiError);
  },
);

export default apiClient;
