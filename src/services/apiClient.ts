/**
 * src/services/apiClient.ts
 * Axios instance dung chung khi goi backend that (USE_MOCK = false).
 * Sau nay them token dang nhap o interceptor ben duoi.
 */
import { create } from 'axios';

import { API_URL } from './config';

export const apiClient = create({
  baseURL: API_URL,
  timeout: 30000,
});

// TODO (backend): gan token dang nhap vao moi request
// apiClient.interceptors.request.use((config) => {
//   config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });
