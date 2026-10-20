/**
 * src/services/designService.ts
 * Luu / doc / xoa thiet ke.
 *   - Mock: luu tren may bang AsyncStorage (con du lieu sau khi tat app,
 *     nhung CHI tren may nay, khong dong bo len may chu).
 *   - API : goi /api/designs (endpoint DE XUAT, backend chua co).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SAMPLE_DESIGNS } from '@/data/mock/designs';
import type { Design } from '@/types';

import { request, send } from './apiClient';
import { USE_MOCK } from './config';
import { ENDPOINTS } from './endpoints';
import { isDesign, isDesignList } from './validators';

export interface DesignService {
  /** Danh sach thiet ke da luu, moi nhat truoc */
  list(): Promise<Design[]>;
  /** Lay lai 1 thiet ke (dung khi AI con 'processing') */
  getById(id: string): Promise<Design | undefined>;
  /** Luu thiet ke (giu ca trang thai isFavorite cua tham so) */
  save(design: Design): Promise<void>;
  remove(id: string): Promise<void>;
  setFavorite(id: string, isFavorite: boolean): Promise<void>;
}

/* ------------------------------ MOCK ------------------------------ */
const STORAGE_KEY = 'roomdecor:designs';

const readLocal = async (): Promise<Design[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    // Lan dau mo app: nap vai thiet ke mau cho History khong trong
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_DESIGNS));
    return SAMPLE_DESIGNS;
  }
  try {
    const value: unknown = JSON.parse(raw);
    return isDesignList(value) ? value : [];
  } catch {
    return []; // du lieu hong -> khong crash, coi nhu trong
  }
};

const writeLocal = (designs: Design[]): Promise<void> =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(designs));

const mockDesignService: DesignService = {
  async list() {
    const designs = await readLocal();
    return [...designs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getById(id) {
    return (await readLocal()).find((d) => d.id === id);
  },
  async save(design) {
    const others = (await readLocal()).filter((d) => d.id !== design.id);
    await writeLocal([design, ...others]);
  },
  async remove(id) {
    await writeLocal((await readLocal()).filter((d) => d.id !== id));
  },
  async setFavorite(id, isFavorite) {
    await writeLocal((await readLocal()).map((d) => (d.id === id ? { ...d, isFavorite } : d)));
  },
};

/* ---------------------- API (endpoint DE XUAT) ---------------------- */
const apiDesignService: DesignService = {
  list: () => request({ method: 'GET', url: ENDPOINTS.DESIGNS }, isDesignList),
  getById: (id) => request({ method: 'GET', url: ENDPOINTS.design(id) }, isDesign),
  async save(design) {
    // Backend tao design ngay khi generate -> o day chi danh dau "da luu"
    await send({ method: 'POST', url: ENDPOINTS.designSave(design.id) });
    // Bam "yeu thich" tren thiet ke chua luu: luu xong phai gui them yeu thich,
    // neu khong trang thai nay se bi mat (loi audit da ghi nhan)
    if (design.isFavorite) {
      await send({ method: 'POST', url: ENDPOINTS.designFavorite(design.id) });
    }
  },
  remove: (id) => send({ method: 'DELETE', url: ENDPOINTS.design(id) }),
  setFavorite: (id, isFavorite) =>
    send({ method: isFavorite ? 'POST' : 'DELETE', url: ENDPOINTS.designFavorite(id) }),
};

export const designService: DesignService = USE_MOCK ? mockDesignService : apiDesignService;
