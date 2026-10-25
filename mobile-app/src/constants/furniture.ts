/**
 * src/constants/furniture.ts
 * Danh muc noi that: ma (backend luu trong cot furniture.category) -> ten tieng Viet + icon.
 * Frontend tu quyet dinh icon, backend chi tra ma. Ma moi chua co o day -> icon mac dinh.
 */
import type { FurnitureCategory, IoniconName } from '@/types';

export const FURNITURE_CATEGORIES: FurnitureCategory[] = [
  { id: 'sofa', label: 'Sofa', iconName: 'bed-outline' },
  { id: 'chair', label: 'Ghế', iconName: 'cafe-outline' },
  { id: 'table', label: 'Bàn', iconName: 'grid-outline' },
  { id: 'bed', label: 'Giường', iconName: 'moon-outline' },
  { id: 'storage', label: 'Tủ, kệ', iconName: 'file-tray-stacked-outline' },
  { id: 'lighting', label: 'Đèn', iconName: 'bulb-outline' },
  { id: 'decor', label: 'Trang trí', iconName: 'flower-outline' },
];

const DEFAULT_ICON: IoniconName = 'cube-outline';

export const getCategoryLabel = (id: string): string =>
  FURNITURE_CATEGORIES.find((c) => c.id === id)?.label ?? id;

export const getCategoryIcon = (id: string): IoniconName =>
  FURNITURE_CATEGORIES.find((c) => c.id === id)?.iconName ?? DEFAULT_ICON;

/** 200 x 90 x 85 cm */
export const formatDimensions = (f: { width: number; depth: number; height: number }): string =>
  `${f.width} × ${f.depth} × ${f.height} cm`;
