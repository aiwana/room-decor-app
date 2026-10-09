/**
 * src/services/productService.ts
 * Du lieu module Catalog (module phu).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CATEGORIES } from '@/data/mock/categories';
import { FEATURED_PRODUCT_IDS, PRODUCTS } from '@/data/mock/products';
import type { Category, CategoryId, Product } from '@/types';
import { delay } from '@/utils/format';

import { apiClient } from './apiClient';
import { MOCK_API_DELAY_MS, USE_MOCK } from './config';

const FAVORITE_KEY = 'roomdecor:favorite-products';

export const productService = {
  async getCategories(): Promise<Category[]> {
    if (!USE_MOCK) {
      return (await apiClient.get<Category[]>('/api/categories')).data;
    }
    await delay(MOCK_API_DELAY_MS);
    return CATEGORIES;
  },

  /** categoryId = undefined -> tat ca san pham */
  async getProducts(categoryId?: CategoryId): Promise<Product[]> {
    if (!USE_MOCK) {
      return (await apiClient.get<Product[]>('/api/products', { params: { category: categoryId } })).data;
    }
    await delay(MOCK_API_DELAY_MS);
    return categoryId ? PRODUCTS.filter((p) => p.categoryId === categoryId) : PRODUCTS;
  },

  async getProductById(id: string): Promise<Product | undefined> {
    if (!USE_MOCK) {
      return (await apiClient.get<Product>(`/api/products/${id}`)).data;
    }
    await delay(MOCK_API_DELAY_MS);
    return PRODUCTS.find((p) => p.id === id);
  },

  /** Lay nhieu san pham theo danh sach id (dung o Result) */
  async getProductsByIds(ids: string[]): Promise<Product[]> {
    if (!USE_MOCK) {
      return (await apiClient.get<Product[]>('/api/products', { params: { ids: ids.join(',') } })).data;
    }
    await delay(MOCK_API_DELAY_MS);
    return ids
      .map((id) => PRODUCTS.find((p) => p.id === id))
      .filter((p): p is Product => p !== undefined);
  },

  async getFeatured(): Promise<Product[]> {
    return productService.getProductsByIds(FEATURED_PRODUCT_IDS);
  },

  /* ---------- Yeu thich san pham (luu tren may) ---------- */
  async getFavoriteIds(): Promise<string[]> {
    const raw = await AsyncStorage.getItem(FAVORITE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  },

  async setFavorite(id: string, isFavorite: boolean): Promise<void> {
    const ids = await productService.getFavoriteIds();
    const next = isFavorite ? [...new Set([...ids, id])] : ids.filter((x) => x !== id);
    await AsyncStorage.setItem(FAVORITE_KEY, JSON.stringify(next));
  },
};
