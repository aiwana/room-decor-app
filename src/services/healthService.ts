/**
 * src/services/healthService.ts
 * Kiem tra ket noi toi backend bang GET /health (endpoint DA CO tren backend).
 * Dung o man Cai dat de biet dia chi API dang dung co dung khong.
 * Luon goi backend that, ke ca khi USE_MOCK = true.
 */
import { request } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { isHealth } from './validators';

export const healthService = {
  check: (): Promise<{ status: string; message?: string }> =>
    request({ method: 'GET', url: ENDPOINTS.HEALTH, timeout: 5000 }, isHealth),
};
