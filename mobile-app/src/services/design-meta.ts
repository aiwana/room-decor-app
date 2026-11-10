/**
 * src/services/design-meta.ts
 * Du lieu PHU cua thiet ke luu tren may, chi de hien the o man "Của tôi" (khong gui len may chu):
 *   - thumbnailUri: anh chup khung 3D (file trong documentDirectory/thumbs/), co sau khi mo tab 3D
 *   - summary: hinh phong + vi tri noi that + dien tich + tong bao gia (ve mat bang thu nho)
 * Tach rieng khoi local-store.ts de ghi anh / tom tat KHONG lam doi thoi gian sua hay vi tri do.
 * Du lieu: { [designId]: DesignMeta }
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

import { STORAGE_KEYS } from '@/constants';
import type { DesignSummary } from '@/types';

export interface DesignMeta {
  thumbnailUri?: string | null;
  summary?: DesignSummary | null;
}

type MetaMap = Record<string, DesignMeta>;

const THUMB_DIR = `${FileSystem.documentDirectory ?? ''}thumbs/`;

const readAll = async (): Promise<MetaMap> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.DESIGN_META);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as MetaMap) : {};
  } catch {
    return {};
  }
};

const writeAll = (map: MetaMap): Promise<void> => AsyncStorage.setItem(STORAGE_KEYS.DESIGN_META, JSON.stringify(map));

/** Xoa file anh cu (bo qua loi: file da mat cung khong sao) */
const deleteFile = async (uri?: string | null): Promise<void> => {
  if (!uri || !uri.startsWith(THUMB_DIR)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
};

// Ghi noi tiep nhau de 2 lan ghi gan nhau (anh 3D + tom tat) khong de mat du lieu cua nhau
let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(task: () => Promise<T>): Promise<T> => {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
};

export const designMeta = {
  getAll: readAll,

  update: (designId: string, patch: DesignMeta): Promise<void> =>
    serial(async () => {
      const map = await readAll();
      map[designId] = { ...map[designId], ...patch };
      await writeAll(map);
    }),

  /** Luu anh 3D (data:image/jpeg;base64,...) thanh file, thay anh cu */
  saveThumbnail: (designId: string, dataUrl: string): Promise<void> =>
    serial(async () => {
      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      if (!base64 || !FileSystem.documentDirectory) return;
      await FileSystem.makeDirectoryAsync(THUMB_DIR, { intermediates: true }).catch(() => undefined);
      // Ten file moi moi lan de expo-image khong dung anh cu trong cache
      const uri = `${THUMB_DIR}${designId}-${Date.now().toString(36)}.jpg`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      const map = await readAll();
      const old = map[designId]?.thumbnailUri;
      map[designId] = { ...map[designId], thumbnailUri: uri };
      await writeAll(map);
      await deleteFile(old);
    }),

  /** Nhan ban: chep ca anh 3D sang thiet ke moi */
  copy: (fromId: string, toId: string): Promise<void> =>
    serial(async () => {
      const map = await readAll();
      const src = map[fromId];
      if (!src) return;
      let thumbnailUri: string | null = null;
      if (src.thumbnailUri) {
        thumbnailUri = `${THUMB_DIR}${toId}-${Date.now().toString(36)}.jpg`;
        await FileSystem.copyAsync({ from: src.thumbnailUri, to: thumbnailUri }).catch(() => {
          thumbnailUri = null;
        });
      }
      map[toId] = { summary: src.summary ?? null, thumbnailUri };
      await writeAll(map);
    }),

  remove: (designId: string): Promise<void> =>
    serial(async () => {
      const map = await readAll();
      const old = map[designId]?.thumbnailUri;
      delete map[designId];
      await writeAll(map);
      await deleteFile(old);
    }),
};
