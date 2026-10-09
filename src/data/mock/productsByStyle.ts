/**
 * src/data/mock/productsByStyle.ts
 * Mock: moi phong cach goi y vai vat lieu/san pham.
 * Day la "cau noi" giua AI Decor (chuc nang chinh) va Catalog (module phu).
 * Khi co AI that, backend se tra ve danh sach nay cung voi anh ket qua.
 */
import type { DesignProduct, DesignStyleId } from '@/types';

export const PRODUCTS_BY_STYLE: Record<DesignStyleId, DesignProduct[]> = {
  modern: [
    { productId: 'prd-02', usage: 'Sàn' },
    { productId: 'prd-17', usage: 'Tường' },
    { productId: 'prd-11', usage: 'Sofa' },
    { productId: 'prd-15', usage: 'Đèn' },
  ],
  minimalist: [
    { productId: 'prd-01', usage: 'Sàn' },
    { productId: 'prd-03', usage: 'Tường' },
    { productId: 'prd-12', usage: 'Bàn trà' },
    { productId: 'prd-15', usage: 'Đèn' },
  ],
  japandi: [
    { productId: 'prd-09', usage: 'Sàn' },
    { productId: 'prd-17', usage: 'Tường' },
    { productId: 'prd-12', usage: 'Bàn trà' },
    { productId: 'prd-14', usage: 'Đèn' },
  ],
  scandinavian: [
    { productId: 'prd-05', usage: 'Sàn' },
    { productId: 'prd-03', usage: 'Tường' },
    { productId: 'prd-11', usage: 'Sofa' },
    { productId: 'prd-18', usage: 'Thảm' },
  ],
  luxury: [
    { productId: 'prd-01', usage: 'Sàn' },
    { productId: 'prd-08', usage: 'Ốp điểm nhấn' },
    { productId: 'prd-13', usage: 'Kệ TV' },
    { productId: 'prd-15', usage: 'Đèn' },
  ],
  industrial: [
    { productId: 'prd-10', usage: 'Sàn' },
    { productId: 'prd-06', usage: 'Tường' },
    { productId: 'prd-13', usage: 'Kệ TV' },
    { productId: 'prd-16', usage: 'Đèn' },
  ],
};
