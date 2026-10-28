/**
 * src/constants/materials.ts
 * Vat lieu san/tuong cho phong. Chi luu ma (id) trong DB, app tu map sang mau.
 */
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
];

export const WALL_MATERIALS: RoomMaterial[] = [
  { id: 'white', label: 'Trắng', color: '#ECE9E3' },
  { id: 'cream', label: 'Kem', color: '#E7D8B8' },
  { id: 'sage', label: 'Xanh sage', color: '#A8B5A2' },
  { id: 'blue', label: 'Xanh nhạt', color: '#AFC4D6' },
];

export const DEFAULT_FLOOR_MATERIAL = 'wood';
export const DEFAULT_WALL_MATERIAL = 'white';

export const getFloorColor = (id: string | null | undefined): string =>
  FLOOR_MATERIALS.find((m) => m.id === id)?.color ?? FLOOR_MATERIALS[0].color;

export const getWallColor = (id: string | null | undefined): string =>
  WALL_MATERIALS.find((m) => m.id === id)?.color ?? WALL_MATERIALS[0].color;
