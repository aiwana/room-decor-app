/**
 * src/services/floor-plan-api.ts
 * Mat bang 2D cua anh phong:
 *   POST /api/ai/scan-room { roomImageId, extraImageIds?, referenceLengthMeters?,
 *                            roomLengthMeters?, roomWidthMeters?, ceilingHeightMeters? }
 *                                                      -> AI quet anh (co the kem anh goc phong), tao (hoac tao lai) mat bang
 *   GET  /api/floor-plans/by-room-image/{roomImageId} -> mat bang cua 1 anh (404 neu chua quet)
 *   PUT  /api/floor-plans/{id}                         -> sua kich thuoc / tuong / cua
 *   POST /api/floor-plans/blank                        -> phong trong / phong mau, khong can anh
 *                                                         (backend tao 1 "anh" loai blank de giu roomImageId)
 *
 * Backend chua co GEMINI_API_KEY / OPENAI_API_KEY thi tra ve phong mau 4m x 4m.
 * Che do mock: tao phong mau ngay tren may (STORAGE_KEYS.MOCK_FLOOR_PLANS).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MOCK_DELAY, SCAN_TIMEOUT, STORAGE_KEYS, USE_MOCK } from '@/constants';
import type { RoomShape } from '@/constants/room-templates';
import type { FloorPlan, ScanResult, Wall } from '@/types';
import { createId, delay } from '@/utils';

import apiClient from './api-client';
import { ApiError } from './api-error';

/**
 * Tuy chon khi quet: anh goc phong chup them + so do that (met, deu khong bat buoc).
 * roomLengthMeters = canh DAI cua phong, roomWidthMeters = canh NGAN; backend tu khop voi huong phong
 * va keo gian mat bang AI cho dung so do (chi nhap 1 so thi phong duoc phong to/thu nho deu).
 */
export interface ScanOptions {
  extraImageIds?: string[];
  referenceLengthMeters?: number;
  roomLengthMeters?: number;
  roomWidthMeters?: number;
  ceilingHeightMeters?: number;
}

/** Kich thuoc phong mau trong che do mock, theo so do nguoi dung nhap (giong ScanCorrection o backend) */
const mockSize = (o: ScanOptions): { width: number; depth: number } => {
  const base = 4;
  const long = o.roomLengthMeters;
  const short = o.roomWidthMeters;
  if (long && short) return { width: Math.max(long, short), depth: Math.min(long, short) };
  const one = long ?? short ?? o.referenceLengthMeters;
  return one ? { width: one, depth: one } : { width: base, depth: base };
};

export type FloorPlanPatch = Partial<Pick<FloorPlan, 'roomWidth' | 'roomDepth' | 'ceilingHeight' | 'walls' | 'openings'>>;

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

const MOCK_DESCRIPTION = 'Phòng mẫu hình chữ nhật (chế độ minh họa, chưa gọi AI thật).';

const BLANK_DESCRIPTION = 'Phòng do bạn tự tạo (không quét từ ảnh). Bấm "Sửa phòng" để chỉnh tường, cửa đi và cửa sổ.';

/* ----------------------------- API ----------------------------- */
export const floorPlanApi = {
  /** Phong trong / phong mau: tao mat bang khong can anh. Tra ve mat bang (co roomImageId de tao thiet ke). */
  async createBlank(shape: RoomShape): Promise<FloorPlan> {
    if (USE_MOCK) {
      await delay(MOCK_DELAY);
      const now = new Date().toISOString();
      const floorPlan: FloorPlan = {
        id: createId('fp'),
        roomImageId: createId('blank'),
        ...shape,
        extraImageIds: [],
        pixelsPerMeter: 100,
        description: BLANK_DESCRIPTION,
        createdAt: now,
        updatedAt: now,
        source: 'blank',
      };
      await writeMock({ ...(await readMock()), [floorPlan.roomImageId]: floorPlan });
      return floorPlan;
    }
    return apiClient.post<FloorPlan>('/floor-plans/blank', shape).then((r) => r.data);
  },

  /** AI quet anh phong -> mat bang moi (quet lai se thay mat bang cu) */
  async scan(roomImageId: string, options: ScanOptions = {}): Promise<ScanResult> {
    const extraImageIds = options.extraImageIds?.filter((id) => id !== roomImageId) ?? [];
    if (USE_MOCK) {
      await delay(MOCK_DELAY * 3);
      const now = new Date().toISOString();
      // Giong MockVisionClient + ScanCorrection o backend: phong 4m x 4m keo theo so do, 1 cua ra vao
      const { width, depth } = mockSize(options);
      const floorPlan: FloorPlan = {
        id: createId('fp'),
        roomImageId,
        roomWidth: width,
        roomDepth: depth,
        ceilingHeight: options.ceilingHeightMeters ?? 2.7,
        walls: rectangleWalls(width, depth),
        openings: [{ type: 'door', x1: 0.5, y1: depth, x2: 1.35, y2: depth }],
        extraImageIds,
        pixelsPerMeter: 100,
        description: MOCK_DESCRIPTION,
        createdAt: now,
        updatedAt: now,
      };
      await writeMock({ ...(await readMock()), [roomImageId]: floorPlan });
      return { floorPlan, description: MOCK_DESCRIPTION };
    }
    const body = {
      roomImageId,
      ...(extraImageIds.length > 0 ? { extraImageIds } : {}),
      ...(options.referenceLengthMeters ? { referenceLengthMeters: options.referenceLengthMeters } : {}),
      ...(options.roomLengthMeters ? { roomLengthMeters: options.roomLengthMeters } : {}),
      ...(options.roomWidthMeters ? { roomWidthMeters: options.roomWidthMeters } : {}),
      ...(options.ceilingHeightMeters ? { ceilingHeightMeters: options.ceilingHeightMeters } : {}),
    };
    return apiClient.post<ScanResult>('/ai/scan-room', body, { timeout: SCAN_TIMEOUT }).then((r) => r.data);
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
