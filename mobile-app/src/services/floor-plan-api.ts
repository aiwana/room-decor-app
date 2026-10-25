/**
 * src/services/floor-plan-api.ts
 * Mat bang 2D cua anh phong:
 *   POST /api/ai/scan-room { roomImageId }            -> AI quet anh, tao (hoac tao lai) mat bang
 *   GET  /api/floor-plans/by-room-image/{roomImageId} -> mat bang cua 1 anh (404 neu chua quet)
 *   PUT  /api/floor-plans/{id}                         -> sua kich thuoc / tuong
 *
 * Backend chua co OPENAI_API_KEY thi tra ve phong mau 4m x 4m.
 * Che do mock: tao phong mau ngay tren may (STORAGE_KEYS.MOCK_FLOOR_PLANS).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MOCK_DELAY, STORAGE_KEYS, USE_MOCK } from '@/constants';
import type { FloorPlan, ScanResult, Wall } from '@/types';
import { createId, delay } from '@/utils';

import apiClient from './api-client';
import { ApiError } from './api-error';

export type FloorPlanPatch = Partial<Pick<FloorPlan, 'roomWidth' | 'roomDepth' | 'ceilingHeight' | 'walls'>>;

/** Tuong hinh chu nhat theo kich thuoc phong */
export const rectangleWalls = (width: number, depth: number): Wall[] => [
  { x1: 0, y1: 0, x2: width, y2: 0 },
  { x1: width, y1: 0, x2: width, y2: depth },
  { x1: width, y1: depth, x2: 0, y2: depth },
  { x1: 0, y1: depth, x2: 0, y2: 0 },
];

/* ----------------------------- Mock ----------------------------- */
type MockMap = Record<string, FloorPlan>;

const readMock = async (): Promise<MockMap> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.MOCK_FLOOR_PLANS);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as MockMap) : {};
  } catch {
    return {};
  }
};

const writeMock = (map: MockMap): Promise<void> =>
  AsyncStorage.setItem(STORAGE_KEYS.MOCK_FLOOR_PLANS, JSON.stringify(map));

const MOCK_DESCRIPTION = 'Phòng mẫu 4m x 4m (chế độ minh họa, chưa gọi AI thật).';

/* ----------------------------- API ----------------------------- */
export const floorPlanApi = {
  /** AI quet anh phong -> mat bang moi (quet lai se thay mat bang cu) */
  async scan(roomImageId: string): Promise<ScanResult> {
    if (USE_MOCK) {
      await delay(MOCK_DELAY * 3);
      const now = new Date().toISOString();
      const floorPlan: FloorPlan = {
        id: createId('fp'),
        roomImageId,
        roomWidth: 4,
        roomDepth: 4,
        ceilingHeight: 2.7,
        walls: rectangleWalls(4, 4),
        pixelsPerMeter: 100,
        description: MOCK_DESCRIPTION,
        createdAt: now,
        updatedAt: now,
      };
      await writeMock({ ...(await readMock()), [roomImageId]: floorPlan });
      return { floorPlan, description: MOCK_DESCRIPTION };
    }
    return apiClient.post<ScanResult>('/ai/scan-room', { roomImageId }).then((r) => r.data);
  },

  /** Mat bang cua anh phong, null neu anh chua duoc quet */
  async getByRoomImage(roomImageId: string): Promise<FloorPlan | null> {
    if (USE_MOCK) {
      await delay(MOCK_DELAY);
      return (await readMock())[roomImageId] ?? null;
    }
    try {
      return await apiClient.get<FloorPlan>(`/floor-plans/by-room-image/${roomImageId}`).then((r) => r.data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },

  async update(floorPlan: FloorPlan, patch: FloorPlanPatch): Promise<FloorPlan> {
    if (USE_MOCK) {
      await delay(MOCK_DELAY);
      const next: FloorPlan = { ...floorPlan, ...patch, updatedAt: new Date().toISOString() };
      await writeMock({ ...(await readMock()), [floorPlan.roomImageId]: next });
      return next;
    }
    return apiClient.put<FloorPlan>(`/floor-plans/${floorPlan.id}`, patch).then((r) => r.data);
  },
};
