/**
 * src/types/product.ts
 * Type cho MODULE PHU: Catalog vat lieu / san pham.
 */
import type { IoniconName } from './common';

/** Don vi tinh */
export type UnitOfMeasure = 'm2' | 'viên' | 'bao' | 'thùng' | 'lít' | 'tấn' | 'cái' | 'bộ';

export type CategoryId =
  | 'tile'
  | 'paint'
  | 'cement'
  | 'adhesive'
  | 'flooring'
  | 'furniture'
  | 'lighting';

export interface Category {
  id: CategoryId;
  label: string;
  iconName: IoniconName;
}

/** 1 dong thong so ky thuat, vd { label: 'Kích thước', value: '60x60 cm' } */
export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number; // VND
  unit: UnitOfMeasure;
  categoryId: CategoryId;
  imageUrl: string;
  rating: number; // 0..5
  reviewCount: number;
  description: string;
  specs: ProductSpec[];
  colors: string[];
  sizes: string[];
}

/** Form yeu cau bao gia / lien he */
export interface QuoteRequest {
  productId: string;
  customerName: string;
  phone: string;
  quantity: number;
  note?: string;
}
