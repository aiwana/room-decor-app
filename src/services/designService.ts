/**
 * src/services/designService.ts
 * Luu / doc / xoa thiet ke.
 * Mock: luu tren may bang AsyncStorage (con du lieu sau khi tat app).
 * Backend: goi /api/designs.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SAMPLE_DESIGNS } from '@/data/mock/designs';
import type { Design } from '@/types';

import { apiClient } from './apiClient';
import { USE_MOCK } from './config';

const STORAGE_KEY = 'roomdecor:designs';

/* ------------------------------ MOCK ------------------------------ */
const readLocal = async (): Promise<Design[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    // Lan dau mo app: nap vai thiet ke mau cho History khong trong
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_DESIGNS));
    return SAMPLE_DESIGNS;
  }
  return JSON.parse(raw) as Design[];
};

const writeLocal = (designs: Design[]): Promise<void> =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(designs));

/* ----------------------------- PUBLIC ----------------------------- */
export const designService = {
  /** Danh sach thiet ke da luu, moi nhat truoc */
  async list(): Promise<Design[]> {
    if (!USE_MOCK) {
      const res = await apiClient.get<Design[]>('/api/designs');
      return res.data;
    }
    const designs = await readLocal();
    return [...designs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** Luu (hoac cap nhat neu da ton tai) */
  async save(design: Design): Promise<void> {
    if (!USE_MOCK) {
      // Backend da tao design khi generate -> chi can danh dau "da luu"
      await apiClient.post(`/api/designs/${design.id}/save`);
      return;
    }
    const designs = await readLocal();
    const others = designs.filter((d) => d.id !== design.id);
    await writeLocal([design, ...others]);
  },

  async remove(id: string): Promise<void> {
    if (!USE_MOCK) {
      await apiClient.delete(`/api/designs/${id}`);
      return;
    }
    const designs = await readLocal();
    await writeLocal(designs.filter((d) => d.id !== id));
  },

  async setFavorite(id: string, isFavorite: boolean): Promise<void> {
    if (!USE_MOCK) {
      if (isFavorite) {
        await apiClient.post(`/api/designs/${id}/favorite`);
      } else {
        await apiClient.delete(`/api/designs/${id}/favorite`);
      }
      return;
    }
    const designs = await readLocal();
    await writeLocal(designs.map((d) => (d.id === id ? { ...d, isFavorite } : d)));
  },
};
