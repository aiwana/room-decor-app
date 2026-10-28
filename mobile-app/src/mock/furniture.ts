/**
 * src/mock/furniture.ts
 * Noi that MAU. Dung khi:
 *  - USE_MOCK = true, hoac
 *  - backend tra ve danh sach rong (bang furniture chua co du lieu).
 * Id bat dau bang "sample-" de phan biet voi UUID that cua backend.
 * Kich thuoc tinh bang cm. Chua co anh/model 3D -> app hien icon theo danh muc.
 */
import type { Furniture } from '@/types';

export const SAMPLE_PREFIX = 'sample-';

const item = (
  slug: string,
  name: string,
  category: string,
  width: number,
  depth: number,
  height: number,
  price: number,
): Furniture => ({
  id: `${SAMPLE_PREFIX}${slug}`,
  name,
  category,
  width,
  depth,
  height,
  modelUrl: null,
  thumbnailUrl: null,
  vendorName: 'Nội thất mẫu',
  price,
  currency: 'VND',
});

export const SAMPLE_FURNITURE: Furniture[] = [
  item('sofa-3', 'Sofa văng 3 chỗ', 'sofa', 210, 90, 85, 12900000),
  item('sofa-l', 'Sofa góc chữ L', 'sofa', 260, 160, 85, 18500000),
  item('armchair', 'Ghế bành đọc sách', 'chair', 80, 85, 95, 4200000),
  item('dining-chair', 'Ghế ăn gỗ sồi', 'chair', 45, 50, 82, 1250000),
  item('coffee-table', 'Bàn trà mặt kính', 'table', 110, 60, 45, 3800000),
  item('dining-table', 'Bàn ăn 6 người', 'table', 180, 90, 75, 8900000),
  item('desk', 'Bàn làm việc', 'table', 120, 60, 75, 4500000),
  item('bed-queen', 'Giường đôi 1m6', 'bed', 160, 200, 100, 11900000),
  item('wardrobe', 'Tủ quần áo 3 cánh', 'storage', 150, 60, 210, 9800000),
  item('tv-shelf', 'Kệ tivi thấp', 'storage', 180, 40, 50, 5200000),
  item('floor-lamp', 'Đèn cây đứng', 'lighting', 40, 40, 160, 1450000),
  item('plant', 'Chậu cây bàng Singapore', 'decor', 45, 45, 150, 890000),
  item('rug', 'Thảm trải sàn', 'decor', 200, 140, 1, 2300000),
];

export const isSampleFurnitureId = (id: string): boolean => id.startsWith(SAMPLE_PREFIX);
