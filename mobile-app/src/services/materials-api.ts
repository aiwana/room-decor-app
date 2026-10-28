/**
 * src/services/materials-api.ts
 * Vat lieu san/tuong/len chan tuong: GET /api/materials?kind=floor|wall|skirting
 */
import { MOCK_DELAY, USE_MOCK } from '@/constants';
import { FALLBACK_MATERIALS } from '@/constants/materials';
import type { Material, MaterialKind } from '@/types';
import { delay } from '@/utils';

import apiClient from './api-client';

const fallback = (kind?: MaterialKind): Material[] =>
  kind ? FALLBACK_MATERIALS.filter((m) => m.kind === kind) : FALLBACK_MATERIALS;

export const materialsApi = {
  async list(kind?: MaterialKind): Promise<Material[]> {
    if (USE_MOCK) {
      await delay(MOCK_DELAY);
      return fallback(kind);
    }
    const items = await apiClient.get<Material[]>('/materials', { params: { kind } }).then((r) => r.data);
    return items.length > 0 ? items : fallback(kind);
  },
};
