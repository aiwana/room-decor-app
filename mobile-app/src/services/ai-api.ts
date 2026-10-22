/**
 * src/services/ai-api.ts
 * AI goi y bo tri: POST /api/ai/suggest-layout { roomImageId, style }
 *
 * Backend hien tra ve danh sach RONG (AiService chua noi voi dich vu AI).
 * Khi rong (hoac USE_MOCK), app tu tao goi y MAU tu cac mon do dang co,
 * va bao cho man hinh biet (isSample) de khong nham la ket qua AI that.
 */
import { MOCK_DELAY, USE_MOCK } from '@/constants';
import type { AiSuggestion, Furniture, FurniturePlacement } from '@/types';
import { createId, delay } from '@/utils';

import apiClient from './api-client';

export interface AiSuggestionResult extends AiSuggestion {
  isSample: boolean;
}

/** Vi tri goi y mau (ti le 0..1 tren anh): giua phong, 2 ben, goc */
const SAMPLE_SPOTS: Pick<FurniturePlacement, 'x' | 'y' | 'rotation' | 'scale'>[] = [
  { x: 0.5, y: 0.72, rotation: 0, scale: 1 },
  { x: 0.22, y: 0.62, rotation: -8, scale: 0.85 },
  { x: 0.78, y: 0.62, rotation: 8, scale: 0.85 },
  { x: 0.5, y: 0.5, rotation: 0, scale: 0.7 },
];

const sampleSuggestion = (furniture: Furniture[]): AiSuggestionResult => {
  // Moi danh muc lay 1 mon, toi da so vi tri goi y
  const picked: Furniture[] = [];
  for (const f of furniture) {
    if (picked.length >= SAMPLE_SPOTS.length) break;
    if (!picked.some((p) => p.category === f.category)) picked.push(f);
  }
  return {
    placements: picked.map((f, i) => ({ id: createId('pl'), furnitureId: f.id, ...SAMPLE_SPOTS[i] })),
    description: 'Gợi ý mẫu: đặt món lớn ở giữa, đồ phụ hai bên để cân đối căn phòng.',
    isSample: true,
  };
};

export const aiApi = {
  /**
   * @param furniture danh sach noi that hien co, dung de tao goi y mau khi AI chua san sang
   */
  async suggestLayout(roomImageId: string, furniture: Furniture[], style?: string): Promise<AiSuggestionResult> {
    if (USE_MOCK) {
      await delay(MOCK_DELAY * 3);
      return sampleSuggestion(furniture);
    }
    const res = await apiClient
      .post<AiSuggestion>('/ai/suggest-layout', { roomImageId, style })
      .then((r) => r.data);
    if (res.placements.length === 0) {
      return sampleSuggestion(furniture);
    }
    return {
      placements: res.placements.map((p) => ({ ...p, id: p.id ?? createId('pl') })),
      description: res.description,
      isSample: false,
    };
  },
};
