/**
 * src/constants/decorOptions.ts
 * Cac lua chon cua man AI Decor: loai phong, phong cach, mau/chu de.
 * Muon them 1 phong cach moi -> chi can them 1 dong o day.
 */
import type {
  ColorThemeId,
  ColorThemeOption,
  DesignStyleId,
  DesignStyleOption,
  RoomTypeId,
  RoomTypeOption,
} from '@/types';

const ph = (seed: string, w: number, h: number): string =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const ROOM_TYPES: RoomTypeOption[] = [
  { id: 'living', label: 'Phòng khách', iconName: 'tv-outline' },
  { id: 'bedroom', label: 'Phòng ngủ', iconName: 'bed-outline' },
  { id: 'kitchen', label: 'Phòng bếp', iconName: 'restaurant-outline' },
  { id: 'office', label: 'Phòng làm việc', iconName: 'desktop-outline' },
  { id: 'bathroom', label: 'Phòng tắm', iconName: 'water-outline' },
];

export const DESIGN_STYLES: DesignStyleOption[] = [
  {
    id: 'modern',
    label: 'Modern',
    description: 'Đường nét gọn, tông trung tính, điểm nhấn kim loại',
    imageUrl: ph('style-modern', 300, 300),
  },
  {
    id: 'minimalist',
    label: 'Minimalist',
    description: 'Tối giản, ít đồ, nhiều khoảng trống',
    imageUrl: ph('style-minimalist', 300, 300),
  },
  {
    id: 'japandi',
    label: 'Japandi',
    description: 'Gỗ sáng, mây tre, ấm áp kiểu Nhật - Bắc Âu',
    imageUrl: ph('style-japandi', 300, 300),
  },
  {
    id: 'scandinavian',
    label: 'Scandinavian',
    description: 'Trắng sáng, gỗ tự nhiên, vải dệt mềm',
    imageUrl: ph('style-scandinavian', 300, 300),
  },
  {
    id: 'luxury',
    label: 'Luxury',
    description: 'Đá marble, đồng thau, nhung sang trọng',
    imageUrl: ph('style-luxury', 300, 300),
  },
  {
    id: 'industrial',
    label: 'Industrial',
    description: 'Bê tông, gạch thô, kim loại đen',
    imageUrl: ph('style-industrial', 300, 300),
  },
];

export const COLOR_THEMES: ColorThemeOption[] = [
  { id: 'white', label: 'Trắng', hex: '#F5F5F5' },
  { id: 'beige', label: 'Be', hex: '#D9C4A3' },
  { id: 'gray', label: 'Xám', hex: '#8E8E93' },
  { id: 'brown', label: 'Nâu', hex: '#8B5E3C' },
  { id: 'green', label: 'Xanh', hex: '#4F7F5F' },
  { id: 'black', label: 'Đen', hex: '#2B2B2B' },
];

/* ---------- Helper: id -> label (dung o Result, History, ...) ---------- */
export const getRoomTypeLabel = (id: RoomTypeId): string =>
  ROOM_TYPES.find((r) => r.id === id)?.label ?? id;

export const getStyleLabel = (id: DesignStyleId): string =>
  DESIGN_STYLES.find((s) => s.id === id)?.label ?? id;

export const getColorTheme = (id: ColorThemeId): ColorThemeOption | undefined =>
  COLOR_THEMES.find((c) => c.id === id);

/* ---------- Kiem tra 1 chuoi (vd tu URL params) co phai id hop le ---------- */
export const isRoomTypeId = (v: unknown): v is RoomTypeId =>
  typeof v === 'string' && ROOM_TYPES.some((r) => r.id === v);

export const isStyleId = (v: unknown): v is DesignStyleId =>
  typeof v === 'string' && DESIGN_STYLES.some((s) => s.id === v);

export const isColorThemeId = (v: unknown): v is ColorThemeId =>
  typeof v === 'string' && COLOR_THEMES.some((c) => c.id === v);
