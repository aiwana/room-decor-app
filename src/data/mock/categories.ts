/**
 * src/data/mock/categories.ts
 * Danh muc vat lieu (module phu Catalog).
 */
import type { Category } from '@/types';

export const CATEGORIES: Category[] = [
  { id: 'tile', label: 'Gạch', iconName: 'grid-outline' },
  { id: 'paint', label: 'Sơn', iconName: 'color-palette-outline' },
  { id: 'flooring', label: 'Sàn', iconName: 'layers-outline' },
  { id: 'furniture', label: 'Nội thất', iconName: 'bed-outline' },
  { id: 'lighting', label: 'Đèn', iconName: 'bulb-outline' },
  { id: 'cement', label: 'Xi măng', iconName: 'cube-outline' },
  { id: 'adhesive', label: 'Keo', iconName: 'flask-outline' },
];
