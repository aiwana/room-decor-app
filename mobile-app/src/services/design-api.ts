/**
 * src/services/design-api.ts
 * Thiet ke: GET/POST /api/designs, GET/DELETE /api/designs/{id}
 *
 * Phan backend CHUA co -> luu tren may (local-store.ts):
 *  - vi tri do (placements): chua co PUT /api/designs/{id}
 *  - anh phong (roomImageUri): may chu chua phuc vu file anh
 * Khi backend bo sung API luu, chi can sua ham savePlacements() o day.
 *
 * Che do mock: danh sach thiet ke cung luu tren may (STORAGE_KEYS.MOCK_DESIGNS).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MOCK_DELAY, STORAGE_KEYS, USE_MOCK } from '@/constants';
import type { Design, DesignDetail, FurniturePlacement } from '@/types';
import { createId, delay } from '@/utils';

import apiClient from './api-client';
import { ApiError } from './api-error';
import { localStore, type LocalDesignData } from './local-store';

/* ----------------------------- Mock ----------------------------- */
const readMock = async (): Promise<Design[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.MOCK_DESIGNS);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Design[]) : [];
  } catch {
    return [];
  }
};

const writeMock = (list: Design[]): Promise<void> =>
  AsyncStorage.setItem(STORAGE_KEYS.MOCK_DESIGNS, JSON.stringify(list));

/* --------------------- Gop du lieu may chu + may --------------------- */
const merge = (design: Design, local: LocalDesignData | undefined): DesignDetail => {
  // POST /api/designs hien tra createdAt/updatedAt = null -> lay gia tri thay the
  const serverTime = design.updatedAt ?? design.createdAt ?? '';
  const updatedAt =
    local && local.updatedAt > serverTime ? local.updatedAt : serverTime || new Date().toISOString();
  return {
    ...design,
    createdAt: design.createdAt ?? updatedAt,
    updatedAt,
    // May chu chua luu duoc placements -> uu tien ban tren may
    placements: local ? local.placements : (design.placements ?? []),
    roomImageUri: local?.roomImageUri ?? null,
  };
};

const newestFirst = (a: DesignDetail, b: DesignDetail): number => b.updatedAt.localeCompare(a.updatedAt);

export interface CreateDesignInput {
  name: string;
  roomImageId: string;
  /** Duong dan anh tren may, de hien thi trong trinh chinh sua */
  roomImageUri: string;
}

export const designApi = {
  async getAll(): Promise<DesignDetail[]> {
    const list = USE_MOCK
      ? await delay(MOCK_DELAY).then(readMock)
      : await apiClient.get<Design[]>('/designs').then((r) => r.data);
    const local = await localStore.getAll();
    return list.map((d) => merge(d, local[d.id])).sort(newestFirst);
  },

  async getById(id: string): Promise<DesignDetail> {
    let design: Design;
    if (USE_MOCK) {
      await delay(MOCK_DELAY);
      const found = (await readMock()).find((d) => d.id === id);
      if (!found) throw new ApiError('http', 'Không tìm thấy thiết kế.', { status: 404 });
      design = found;
    } else {
      design = await apiClient.get<Design>(`/designs/${id}`).then((r) => r.data);
    }
    return merge(design, await localStore.get(id));
  },

  async create(input: CreateDesignInput): Promise<DesignDetail> {
    let design: Design;
    if (USE_MOCK) {
      await delay(MOCK_DELAY);
      const now = new Date().toISOString();
      design = {
        id: createId('design'),
        name: input.name,
        roomImageId: input.roomImageId,
        placements: [],
        createdAt: now,
        updatedAt: now,
      };
      await writeMock([design, ...(await readMock())]);
    } else {
      design = await apiClient
        .post<Design>('/designs', { name: input.name, roomImageId: input.roomImageId })
        .then((r) => r.data);
    }
    const local = await localStore.update(design.id, { roomImageUri: input.roomImageUri, placements: [] });
    return merge(design, local);
  },

  /** Luu vi tri do. HIEN TAI: chi luu tren may (backend chua co API). */
  async savePlacements(id: string, placements: FurniturePlacement[]): Promise<void> {
    await localStore.update(id, { placements });
  },

  async remove(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay(MOCK_DELAY);
      await writeMock((await readMock()).filter((d) => d.id !== id));
    } else {
      await apiClient.delete(`/designs/${id}`);
    }
    await localStore.remove(id);
  },
};
