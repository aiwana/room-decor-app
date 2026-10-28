/**
 * src/services/local-store.ts
 * Du lieu thiet ke LUU TREN MAY (AsyncStorage), dung o ca 2 che do mock va API.
 *
 * Vi sao can?
 *  - Backend CHUA co API luu vi tri do (khong co PUT /api/designs/{id}),
 *    nen placements tam luu tren may. Khi backend co API, chi can sua design-api.ts.
 *  - Backend tra url anh phong nhung chua phuc vu file (/files/**), nen giu
 *    duong dan anh tren may (roomImageUri) de hien thi.
 *
 * Du lieu: { [designId]: LocalDesignData }
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants';
import type { FurniturePlacement } from '@/types';

export interface LocalDesignData {
  roomImageUri: string | null;
  placements: FurniturePlacement[];
  floorMaterial?: string;
  wallMaterial?: string;
  skirtingMaterial?: string;
  updatedAt: string;
}

type LocalDesignMap = Record<string, LocalDesignData>;

const readAll = async (): Promise<LocalDesignMap> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_DESIGNS);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as LocalDesignMap) : {};
  } catch {
    // Du lieu hong -> bo qua, khong lam app crash
    return {};
  }
};

const writeAll = (map: LocalDesignMap): Promise<void> =>
  AsyncStorage.setItem(STORAGE_KEYS.LOCAL_DESIGNS, JSON.stringify(map));

export const localStore = {
  getAll: readAll,

  async get(designId: string): Promise<LocalDesignData | undefined> {
    const map = await readAll();
    return map[designId];
  },

  /** Gop (merge) du lieu moi vao du lieu cu cua 1 thiet ke */
  async update(designId: string, patch: Partial<Omit<LocalDesignData, 'updatedAt'>>): Promise<LocalDesignData> {
    const map = await readAll();
    const prev = map[designId];
    const next: LocalDesignData = {
      roomImageUri: patch.roomImageUri !== undefined ? patch.roomImageUri : (prev?.roomImageUri ?? null),
      placements: patch.placements ?? prev?.placements ?? [],
      floorMaterial: patch.floorMaterial !== undefined ? patch.floorMaterial : prev?.floorMaterial,
      wallMaterial: patch.wallMaterial !== undefined ? patch.wallMaterial : prev?.wallMaterial,
      skirtingMaterial: patch.skirtingMaterial !== undefined ? patch.skirtingMaterial : prev?.skirtingMaterial,
      updatedAt: new Date().toISOString(),
    };
    map[designId] = next;
    await writeAll(map);
    return next;
  },

  async remove(designId: string): Promise<void> {
    const map = await readAll();
    delete map[designId];
    await writeAll(map);
  },
};
