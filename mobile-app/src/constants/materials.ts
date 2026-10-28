/**
 * src/constants/materials.ts
 * Mau du phong cho vat lieu khi chua tai duoc API va mau sac cho 2D/3D.
 * Danh sach that (ten, gia, texture) lay tu GET /api/materials.
 */
import type { Material, MaterialKind } from '@/types';

export interface RoomMaterial {
  id: string;
  label: string;
  color: string;
}

export const FLOOR_MATERIALS: RoomMaterial[] = [
  { id: 'wood', label: 'Gỗ', color: '#8B5A2B' },
  { id: 'tile-white', label: 'Gạch trắng', color: '#E8E6E1' },
  { id: 'tile-gray', label: 'Gạch xám', color: '#9AA0A6' },
  { id: 'terrazzo', label: 'Terrazzo', color: '#D9D2C5' },
  { id: 'tile-wood', label: 'Gạch giả gỗ', color: '#9B6A3A' },
  { id: 'tile-80', label: 'Gạch 80', color: '#E6DCC8' },
  { id: 'tile-marble', label: 'Marble', color: '#E9E7E2' },
  { id: 'tile-terracotta', label: 'Terracotta', color: '#B66A4A' },
];

export const WALL_MATERIALS: RoomMaterial[] = [
  { id: 'white', label: 'Trắng', color: '#ECE9E3' },
  { id: 'cream', label: 'Kem', color: '#E7D8B8' },
  { id: 'sage', label: 'Xanh sage', color: '#A8B5A2' },
  { id: 'blue', label: 'Xanh nhạt', color: '#AFC4D6' },
  { id: 'tile-wall', label: 'Gạch ốp', color: '#EDEDED' },
  { id: 'tile-wall-gray', label: 'Gạch xám', color: '#B7B9B8' },
  { id: 'wall-decor', label: 'Plaster', color: '#D7CFC3' },
];

export const SKIRTING_MATERIALS: RoomMaterial[] = [
  { id: 'skirting-10x60', label: 'Viền 10×60', color: '#D8D4CB' },
  { id: 'skirting-12x60', label: 'Viền 12×60', color: '#D8D4CB' },
  { id: 'skirting-12x40', label: 'Viền 12×40', color: '#D8D4CB' },
];

export const DEFAULT_FLOOR_MATERIAL = 'wood';
export const DEFAULT_WALL_MATERIAL = 'white';
export const DEFAULT_SKIRTING_MATERIAL = 'skirting-10x60';

export const getFloorColor = (id: string | null | undefined): string =>
  FLOOR_MATERIALS.find((m) => m.id === id)?.color ?? FLOOR_MATERIALS[0].color;

export const getWallColor = (id: string | null | undefined): string =>
  WALL_MATERIALS.find((m) => m.id === id)?.color ?? WALL_MATERIALS[0].color;

export const getMaterialColor = (
  code: string | null | undefined,
  kind: MaterialKind,
  materials?: Material[],
): string => {
  const fromApi = materials?.find((m) => m.code === code)?.colorHex;
  if (fromApi) return fromApi;
  if (kind === 'wall') return getWallColor(code);
  if (kind === 'skirting') {
    return SKIRTING_MATERIALS.find((m) => m.id === code)?.color ?? SKIRTING_MATERIALS[0].color;
  }
  return getFloorColor(code);
};

const fallback = (
  code: string,
  name: string,
  kind: MaterialKind,
  colorHex: string,
  price: number,
  priceUnit: 'm2' | 'md',
  tileWidthCm?: number,
  tileHeightCm?: number,
): Material => ({
  id: code,
  code,
  name,
  kind,
  colorHex,
  price,
  priceUnit,
  tileWidthCm,
  tileHeightCm,
  isSample: true,
});

/** Du lieu du phong khi backend chua san sang (hoac USE_MOCK=true). */
export const FALLBACK_MATERIALS: Material[] = [
  fallback('wood', 'Sàn gỗ công nghiệp 12mm', 'floor', '#8B5A2B', 350000, 'm2', 19, 120),
  fallback('tile-white', 'Gạch bóng 60×60 sáng', 'floor', '#E8E6E1', 230000, 'm2', 60, 60),
  fallback('tile-gray', 'Gạch mờ 60×60 xám', 'floor', '#9AA0A6', 250000, 'm2', 60, 60),
  fallback('terrazzo', 'Gạch terrazzo 40×40', 'floor', '#D9D2C5', 270000, 'm2', 40, 40),
  fallback('tile-wood', 'Gạch giả gỗ 15×90', 'floor', '#9B6A3A', 280000, 'm2', 15, 90),
  fallback('tile-80', 'Gạch 80×80 kem', 'floor', '#E6DCC8', 390000, 'm2', 80, 80),
  fallback('tile-marble', 'Gạch marble 60×60', 'floor', '#E9E7E2', 320000, 'm2', 60, 60),
  fallback('tile-terracotta', 'Gạch terracotta 30×30', 'floor', '#B66A4A', 210000, 'm2', 30, 30),
  fallback('white', 'Sơn nội thất trắng', 'wall', '#ECE9E3', 45000, 'm2'),
  fallback('cream', 'Sơn nội thất kem', 'wall', '#E7D8B8', 45000, 'm2'),
  fallback('sage', 'Sơn nội thất xanh sage', 'wall', '#A8B5A2', 45000, 'm2'),
  fallback('blue', 'Sơn nội thất xanh nhạt', 'wall', '#AFC4D6', 45000, 'm2'),
  fallback('tile-wall', 'Gạch ốp tường 30×60 sáng', 'wall', '#EDEDED', 220000, 'm2', 30, 60),
  fallback('tile-wall-gray', 'Gạch ốp tường 30×60 xám', 'wall', '#B7B9B8', 220000, 'm2', 30, 60),
  fallback('wall-decor', 'Tường hiệu ứng plaster', 'wall', '#D7CFC3', 180000, 'm2'),
  fallback('skirting-10x60', 'Gạch viền chân tường 10×60', 'skirting', '#D8D4CB', 70000, 'md', 10, 60),
  fallback('skirting-12x60', 'Gạch viền chân tường 12×60', 'skirting', '#D8D4CB', 75000, 'md', 12, 60),
  fallback('skirting-12x40', 'Gạch viền chân tường 12×40', 'skirting', '#D8D4CB', 100000, 'md', 12, 40),
];
