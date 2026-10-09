/**
 * src/services/productService.ts
 * Du lieu module Catalog (module phu).
 *
 * Cau truc giong moi service khac:
 *   - interface ProductService : "hop dong" ma man hinh su dung
 *   - mockProductService       : du lieu gia (data/mock)
 *   - apiProductService        : goi backend (endpoint DE XUAT, chua co)
 *   - productService           : chon 1 trong 2 theo USE_MOCK
 * Man hinh chi import `productService`, khong biet ben trong la mock hay API.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CATEGORIES } from '@/data/mock/categories';
import { FEATURED_PRODUCT_IDS, PRODUCTS } from '@/data/mock/products';
import type { Category, CategoryId, Product } from '@/types';
import { delay } from '@/utils/format';

import { request } from './apiClient';
import { MOCK_API_DELAY_MS, USE_MOCK } from './config';
import { ENDPOINTS } from './endpoints';
import { isCategoryList, isProduct, isProductList } from './validators';

export interface ProductService {
  getCategories(): Promise<Category[]>;
  /** categoryId = undefined -> tat ca san pham */
  getProducts(categoryId?: CategoryId): Promise<Product[]>;
  /** undefined = khong co san pham nay */
  getProductById(id: string): Promise<Product | undefined>;
  /** Lay nhieu san pham theo danh sach id (dung o Result) */
  getProductsByIds(ids: string[]): Promise<Product[]>;
  getFeatured(): Promise<Product[]>;
}

/* ------------------------------ MOCK ------------------------------ */
/** Mock gia lap backend: tra kem ten danh muc (categoryName) giong contract de xuat */
const withCategoryName = (p: Product): Product => ({
  ...p,
  categoryName: CATEGORIES.find((c) => c.id === p.categoryId)?.label,
});

const mockProductService: ProductService = {
  async getCategories() {
    await delay(MOCK_API_DELAY_MS);
    return CATEGORIES;
  },
  async getProducts(categoryId) {
    await delay(MOCK_API_DELAY_MS);
    const list = categoryId ? PRODUCTS.filter((p) => p.categoryId === categoryId) : PRODUCTS;
    return list.map(withCategoryName);
  },
  async getProductById(id) {
    await delay(MOCK_API_DELAY_MS);
    const p = PRODUCTS.find((x) => x.id === id);
    return p ? withCategoryName(p) : undefined;
  },
  async getProductsByIds(ids) {
    await delay(MOCK_API_DELAY_MS);
    return ids
      .map((id) => PRODUCTS.find((p) => p.id === id))
      .filter((p): p is Product => p !== undefined)
      .map(withCategoryName);
  },
  async getFeatured() {
    return mockProductService.getProductsByIds(FEATURED_PRODUCT_IDS);
  },
};

/* ---------------------- API (endpoint DE XUAT) ---------------------- */
const apiProductService: ProductService = {
  getCategories: () => request({ method: 'GET', url: ENDPOINTS.CATEGORIES }, isCategoryList),
  getProducts: (categoryId) =>
    request({ method: 'GET', url: ENDPOINTS.PRODUCTS, params: { category: categoryId } }, isProductList),
  getProductById: (id) => request({ method: 'GET', url: ENDPOINTS.product(id) }, isProduct),
  getProductsByIds: (ids) =>
    ids.length === 0
      ? Promise.resolve([])
      : request({ method: 'GET', url: ENDPOINTS.PRODUCTS, params: { ids: ids.join(',') } }, isProductList),
  getFeatured: () =>
    request({ method: 'GET', url: ENDPOINTS.PRODUCTS, params: { featured: true } }, isProductList),
};

export const productService: ProductService = USE_MOCK ? mockProductService : apiProductService;

/* ------------------------------------------------------------------ */
/**
 * San pham yeu thich: HIEN CHI LUU TREN MAY (ca o che do API), vi chua
 * thong nhat backend co luu hay khong. Xem docs/api-contract-de-xuat.md.
 */
const FAVORITE_KEY = 'roomdecor:favorite-products';

const parseIds = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return []; // du lieu hong -> coi nhu chua co yeu thich, khong lam crash app
  }
};

export const favoriteProductStore = {
  async getIds(): Promise<string[]> {
    return parseIds(await AsyncStorage.getItem(FAVORITE_KEY));
  },
  async set(id: string, isFavorite: boolean): Promise<void> {
    const ids = await favoriteProductStore.getIds();
    const next = isFavorite ? [...new Set([...ids, id])] : ids.filter((x) => x !== id);
    await AsyncStorage.setItem(FAVORITE_KEY, JSON.stringify(next));
  },
};
