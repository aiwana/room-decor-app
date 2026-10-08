/**
 * src/types/index.ts
 * Tap hop TypeScript interface dung chung cho toan ung dung.
 * Nghiem cam su dung 'any' (TypeScript strict mode - PROG3002).
 */
import type { Ionicons } from '@expo/vector-icons';

/** Don vi tinh cua vat lieu xay dung */
export type UnitOfMeasure = 'm2' | 'viên' | 'bao' | 'thùng' | 'lít' | 'tấn';

/** Ten glyph hop le cua bo icon Ionicons */
export type IoniconName = keyof typeof Ionicons.glyphMap;

/** San pham vat lieu xay dung (Catalog / Trending) */
export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number; // don vi: VND
  unit: UnitOfMeasure;
  imageUrl: string; // URL anh san pham
  category: string; // VD: 'Gach op lat', 'Son nuoc'
}

/** Item Quick Actions (4 icon tron tren man Home) */
export interface QuickAction {
  id: string;
  label: string;
  iconName: IoniconName;
  routeName: string; // screen dich trong Navigator
}

/** Du an / cong trinh tieu bieu (Reference Projects) */
export interface Project {
  id: string;
  name: string; // Ten cong trinh
  location: string; // Dia diem
  imageUrl: string;
  area: string; // Dien tich thi cong, VD: '120 m2'
}
