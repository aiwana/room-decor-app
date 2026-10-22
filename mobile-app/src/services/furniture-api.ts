/**
 * src/services/furniture-api.ts
 * Danh muc noi that: GET /api/furniture?category=, /api/furniture/search?q=, /api/furniture/{id}
 *
 * Bang furniture tren backend dang TRONG -> khi may chu tra ve danh sach rong,
 * app dung noi that MAU (src/mock/furniture.ts) va bao cho man hinh biet (isSample).
 */
import { MOCK_DELAY, USE_MOCK } from '@/constants';
import { SAMPLE_FURNITURE, isSampleFurnitureId } from '@/mock/furniture';
import type { Furniture } from '@/types';
import { delay } from '@/utils';

import apiClient from './api-client';
import { ApiError } from './api-error';

export interface FurnitureList {
  items: Furniture[];
  /** true = dang hien noi that mau, khong phai du lieu that tu may chu */
  isSample: boolean;
}

const filterSample = (category?: string, query?: string): Furniture[] => {
  const q = query?.trim().toLowerCase() ?? '';
  return SAMPLE_FURNITURE.filter(
    (f) => (!category || f.category === category) && (!q || f.name.toLowerCase().includes(q)),
  );
};

const sample = async (category?: string, query?: string): Promise<FurnitureList> => {
  await delay(MOCK_DELAY);
  return { items: filterSample(category, query), isSample: true };
};

export const furnitureApi = {
  /** Danh sach (loc theo danh muc, tim theo ten). */
  async list(category?: string, query?: string): Promise<FurnitureList> {
    if (USE_MOCK) return sample(category, query);

    const q = query?.trim();
    const items = q
      ? await apiClient.get<Furniture[]>('/furniture/search', { params: { q } }).then((r) => r.data)
      : await apiClient.get<Furniture[]>('/furniture', { params: { category } }).then((r) => r.data);

    if (items.length > 0) {
      // /search khong loc danh muc -> loc them o day
      return { items: q && category ? items.filter((f) => f.category === category) : items, isSample: false };
    }
    // May chu chua co noi that nao -> dung mau (chi khi bang that su trong, khong phai do bo loc)
    const all = await apiClient.get<Furniture[]>('/furniture').then((r) => r.data);
    return all.length === 0 ? sample(category, query) : { items: [], isSample: false };
  },

  async getById(id: string): Promise<Furniture> {
    if (USE_MOCK || isSampleFurnitureId(id)) {
      await delay(MOCK_DELAY);
      const found = SAMPLE_FURNITURE.find((f) => f.id === id);
      if (!found) throw new ApiError('http', 'Không tìm thấy món đồ này.', { status: 404 });
      return found;
    }
    return apiClient.get<Furniture>(`/furniture/${id}`).then((r) => r.data);
  },
};
