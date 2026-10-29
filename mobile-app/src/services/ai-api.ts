/**
 * src/services/ai-api.ts
 * AI goi y bo tri: POST /api/ai/suggest-layout { roomImageId, mode, style, note, items }
 *   - mode "rearrange": AI sap xep lai cac mon dang co
 *   - mode "add"      : giu nguyen do dang co, AI chon them vai mon tu danh muc
 * Backend chi gui mat bang + danh sach do cho AI (khong gui anh), roi kiem tra lai ket qua
 * (trong tuong, khong chan cua). Chua co khoa AI thi backend tu xep theo luat (source = "rules").
 *
 * Che do mock: app tu tao goi y MAU (source = "sample").
 */
import { MOCK_DELAY, USE_MOCK } from '@/constants';
import type { AiSuggestion, AiSuggestMode, Furniture, FurniturePlacement } from '@/types';
import { createId, delay } from '@/utils';

import apiClient from './api-client';

/** Goi y co the mat vai giay (AI) */
const SUGGEST_TIMEOUT = 90000;

export interface SuggestOptions {
  mode: AiSuggestMode;
  style?: string;
  note?: string;
  placements: FurniturePlacement[];
  furnitureById: Map<string, Furniture>;
  /** Danh sach noi that hien co, chi dung de tao goi y mau o che do mock */
  catalog: Furniture[];
}

/** Vi tri goi y mau (ti le 0..1): giua phong, 2 ben, goc */
const SAMPLE_SPOTS: Pick<FurniturePlacement, 'x' | 'y' | 'rotation' | 'scale'>[] = [
  { x: 0.5, y: 0.72, rotation: 0, scale: 1 },
  { x: 0.22, y: 0.62, rotation: -8, scale: 0.85 },
  { x: 0.78, y: 0.62, rotation: 8, scale: 0.85 },
  { x: 0.5, y: 0.5, rotation: 0, scale: 0.7 },
];

const sampleSuggestion = ({ mode, placements, catalog }: SuggestOptions): AiSuggestion => {
  if (mode === 'rearrange') {
    return {
      placements: placements.map((p, i) => ({ ...p, ...(SAMPLE_SPOTS[i % SAMPLE_SPOTS.length] ?? {}) })),
      newFurniture: [],
      description: 'Gợi ý mẫu: đặt món lớn ở giữa, đồ phụ hai bên để cân đối căn phòng.',
      source: 'sample',
    };
  }
  // Moi danh muc lay 1 mon
  const picked: Furniture[] = [];
  for (const f of catalog) {
    if (picked.length >= 3) break;
    if (!picked.some((p) => p.category === f.category)) picked.push(f);
  }
  return {
    placements: [
      ...placements,
      ...picked.map((f, i) => ({ id: createId('pl'), furnitureId: f.id, ...SAMPLE_SPOTS[(i + 1) % SAMPLE_SPOTS.length] })),
    ],
    newFurniture: picked,
    description: 'Gợi ý mẫu: thêm vài món cho căn phòng đầy đủ hơn.',
    source: 'sample',
  };
};

export const aiApi = {
  async suggestLayout(roomImageId: string, options: SuggestOptions): Promise<AiSuggestion> {
    if (USE_MOCK) {
      await delay(MOCK_DELAY * 3);
      return sampleSuggestion(options);
    }
    const items = options.placements.flatMap((p) => {
      const f = options.furnitureById.get(p.furnitureId);
      if (!f) return [];
      return [
        {
          placementId: p.id,
          furnitureId: p.furnitureId,
          name: f.name,
          category: f.category,
          width: f.width,
          depth: f.depth,
          height: f.height,
          x: p.x,
          y: p.y,
          rotation: p.rotation,
          scale: p.scale,
        },
      ];
    });
    const res = await apiClient
      .post<AiSuggestion>(
        '/ai/suggest-layout',
        {
          roomImageId,
          mode: options.mode,
          style: options.style || undefined,
          note: options.note?.trim() || undefined,
          items,
        },
        { timeout: SUGGEST_TIMEOUT },
      )
      .then((r) => r.data);
    return {
      placements: res.placements.map((p) => ({ ...p, id: p.id || createId('pl') })),
      newFurniture: res.newFurniture ?? [],
      description: res.description,
      source: res.source,
    };
  },
};
