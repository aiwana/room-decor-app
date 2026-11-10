/**
 * src/services/design-api.ts
 * Thiet ke: GET/POST /api/designs, GET/PUT/DELETE /api/designs/{id}
 *   PUT { name?, roomType? }  -> doi ten / doi loai phong (giu nguyen noi that)
 *   duplicate()               -> tao thiet ke moi cung anh phong (cung mat bang), chep noi that + vat lieu
 *
 * Luu ca tren may (local-store.ts) va tren may chu:
 *  - vi tri do (placements): luu tren may + PUT /api/designs/{id}
 *    (bo qua noi that MAU "sample-..." vi may chu khong co cac mon nay)
 *  - anh phong (roomImageUri): giu duong dan anh tren may de hien nhanh
 *
 * Che do mock: danh sach thiet ke cung luu tren may (STORAGE_KEYS.MOCK_DESIGNS).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MOCK_DELAY, STORAGE_KEYS, USE_MOCK } from '@/constants';
import { DEFAULT_SKIRTING_MATERIAL } from '@/constants/materials';
import { isSampleFurnitureId } from '@/mock/furniture';
import { DEFAULT_ROOM_TYPE, isRoomType, type RoomType } from '@/constants/room-types';
import type { Design, DesignDetail, FurniturePlacement } from '@/types';
import { createId, delay } from '@/utils';

import apiClient from './api-client';
import { ApiError } from './api-error';
import { designMeta, type DesignMeta } from './design-meta';
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
const merge = (design: Design, local: LocalDesignData | undefined, meta?: DesignMeta): DesignDetail => {
  // POST /api/designs hien tra createdAt/updatedAt = null -> lay gia tri thay the
  const serverTime = design.updatedAt ?? design.createdAt ?? '';
  const updatedAt =
    local && local.updatedAt > serverTime ? local.updatedAt : serverTime || new Date().toISOString();
  return {
    ...design,
    createdAt: design.createdAt ?? updatedAt,
    updatedAt,
    // Ban tren may giu ca noi that mau (may chu khong luu) -> uu tien ban tren may
    placements: local ? local.placements : (design.placements ?? []),
    roomImageUri: local?.roomImageUri ?? null,
    floorMaterial: local?.floorMaterial ?? design.floorMaterial ?? 'wood',
    wallMaterial: local?.wallMaterial ?? design.wallMaterial ?? 'white',
    skirtingMaterial:
      local?.skirtingMaterial ?? design.skirtingMaterial ?? DEFAULT_SKIRTING_MATERIAL,
    roomType: isRoomType(design.roomType) ? design.roomType : DEFAULT_ROOM_TYPE,
    thumbnailUri: meta?.thumbnailUri ?? null,
    summary: meta?.summary ?? null,
  };
};

const newestFirst = (a: DesignDetail, b: DesignDetail): number => b.updatedAt.localeCompare(a.updatedAt);

export interface CreateDesignInput {
  name: string;
  roomImageId: string;
  /** Duong dan anh tren may, de hien thi trong trinh chinh sua ('' = phong trong, khong co anh) */
  roomImageUri: string;
  roomType?: RoomType;
}

export interface DesignPatch {
  name?: string;
  roomType?: RoomType;
}

export const designApi = {
  async getAll(): Promise<DesignDetail[]> {
    const list = USE_MOCK
      ? await delay(MOCK_DELAY).then(readMock)
      : await apiClient.get<Design[]>('/designs').then((r) => r.data);
    const [local, meta] = await Promise.all([localStore.getAll(), designMeta.getAll()]);
    return list.map((d) => merge(d, local[d.id], meta[d.id])).sort(newestFirst);
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
    const [local, meta] = await Promise.all([localStore.get(id), designMeta.getAll()]);
    return merge(design, local, meta[id]);
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
        roomType: input.roomType ?? DEFAULT_ROOM_TYPE,
        floorMaterial: 'wood',
        wallMaterial: 'white',
        skirtingMaterial: DEFAULT_SKIRTING_MATERIAL,
        placements: [],
        createdAt: now,
        updatedAt: now,
      };
      await writeMock([design, ...(await readMock())]);
    } else {
      design = await apiClient
        .post<Design>('/designs', {
          name: input.name,
          roomImageId: input.roomImageId,
          roomType: input.roomType ?? DEFAULT_ROOM_TYPE,
        })
        .then((r) => r.data);
    }
    const local = await localStore.update(design.id, { roomImageUri: input.roomImageUri, placements: [] });
    return merge(design, local);
  },

  /** Luu vi tri do + vat lieu: tren may, roi gui len may chu (PUT /api/designs/{id}). */
  async savePlacements(
    id: string,
    placements: FurniturePlacement[],
    materials?: { floorMaterial: string; wallMaterial: string; skirtingMaterial: string },
  ): Promise<void> {
    await localStore.update(id, { placements, ...materials });
    if (USE_MOCK) return;
    // id tam tren app (vd "pl-...") khong phai UUID -> khong gui, may chu tu tao id moi
    const body = placements
      .filter((p) => !isSampleFurnitureId(p.furnitureId))
      .map(({ furnitureId, x, y, rotation, scale }) => ({ furnitureId, x, y, rotation, scale }));
    const payload: Record<string, unknown> = { placements: body };
    if (materials) {
      payload.floorMaterial = materials.floorMaterial;
      payload.wallMaterial = materials.wallMaterial;
      payload.skirtingMaterial = materials.skirtingMaterial;
    }
    await apiClient.put<Design>(`/designs/${id}`, payload);
  },

  /** Doi ten / loai phong (khong dung toi noi that) */
  async update(id: string, patch: DesignPatch): Promise<void> {
    if (USE_MOCK) {
      await delay(MOCK_DELAY);
      const now = new Date().toISOString();
      await writeMock((await readMock()).map((d) => (d.id === id ? { ...d, ...patch, updatedAt: now } : d)));
      return;
    }
    await apiClient.put<Design>(`/designs/${id}`, patch);
  },

  /**
   * Nhan ban thanh phuong an moi: cung anh phong nen dung chung mat bang (sua hinh phong o ban nao
   * cung doi o ban kia), con noi that + vat lieu thi tach rieng.
   */
  async duplicate(source: DesignDetail, name: string): Promise<DesignDetail> {
    if (!source.roomImageId) throw new ApiError('http', 'Thiết kế này không còn phòng trên máy chủ.', { status: 400 });
    const copy = await this.create({
      name,
      roomImageId: source.roomImageId,
      roomImageUri: source.roomImageUri ?? '',
      roomType: isRoomType(source.roomType) ? source.roomType : DEFAULT_ROOM_TYPE,
    });
    await this.savePlacements(
      copy.id,
      source.placements.map((p) => ({ ...p, id: createId('pl') })),
      {
        floorMaterial: source.floorMaterial ?? 'wood',
        wallMaterial: source.wallMaterial ?? 'white',
        skirtingMaterial: source.skirtingMaterial ?? DEFAULT_SKIRTING_MATERIAL,
      },
    );
    await designMeta.copy(source.id, copy.id);
    return this.getById(copy.id);
  },

  async remove(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay(MOCK_DELAY);
      await writeMock((await readMock()).filter((d) => d.id !== id));
    } else {
      await apiClient.delete(`/designs/${id}`);
    }
    await localStore.remove(id);
    await designMeta.remove(id);
  },
};
