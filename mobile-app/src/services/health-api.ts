/**
 * src/services/health-api.ts
 * Kiem tra ket noi may chu (man Cai dat). Backend Spring Boot chua co /health,
 * nen goi GET /api/users/me: may chu tra ve BAT KY ma HTTP nao (ke ca 401)
 * nghia la dia chi dung va backend dang chay.
 */
import { API_BASE_URL } from '@/constants';

import apiClient from './api-client';
import { toApiError } from './api-error';

export interface HealthResult {
  ok: boolean;
  message: string;
}

export const healthApi = {
  async check(): Promise<HealthResult> {
    try {
      await apiClient.get('/users/me');
      return { ok: true, message: `Kết nối được ${API_BASE_URL}, token hợp lệ.` };
    } catch (e) {
      const err = toApiError(e);
      if (err.kind === 'http' && err.status !== undefined && err.status < 500) {
        return { ok: true, message: `Kết nối được máy chủ (trả mã ${err.status}).` };
      }
      return { ok: false, message: err.message };
    }
  },
};
