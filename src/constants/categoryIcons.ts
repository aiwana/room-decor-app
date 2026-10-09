/**
 * src/constants/categoryIcons.ts
 * Icon cho tung danh muc. Frontend tu quyet dinh icon, backend chi tra ma danh muc.
 * Danh muc moi chua co trong bang -> dung icon mac dinh.
 */
import type { CategoryId, IoniconName } from '@/types';

const CATEGORY_ICONS: Record<string, IoniconName> = {
  tile: 'grid-outline',
  paint: 'color-palette-outline',
  flooring: 'layers-outline',
  furniture: 'bed-outline',
  lighting: 'bulb-outline',
  cement: 'cube-outline',
  adhesive: 'flask-outline',
};

export const getCategoryIcon = (id: CategoryId): IoniconName => CATEGORY_ICONS[id] ?? 'pricetag-outline';
