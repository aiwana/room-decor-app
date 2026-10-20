/**
 * src/types/product.ts
 * Type cho MODULE PHU: Catalog vat lieu / san pham.
 */
/**
 * Don vi tinh, vd 'm2', 'viên', 'bao', 'thùng', 'lít', 'cái', 'bộ'.
 * De `string` (khong phai union co dinh) vi danh sach se do database quan ly.
 */
export type UnitOfMeasure = string;

/**
 * Ma danh muc, vd 'tile', 'paint'. De `string` vi danh muc lay tu backend.
 * Icon cua danh muc do frontend tu chon (constants/categoryIcons.ts),
 * backend khong can biet ten icon.
 */
export type CategoryId = string;

export interface Category {
  id: CategoryId;
  label: string;
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
  /** Ten danh muc de hien thi (DE XUAT: backend tra kem, tranh phai tai danh muc rieng) */
  categoryName?: string;
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
