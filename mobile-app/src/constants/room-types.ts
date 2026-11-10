/**
 * src/constants/room-types.ts
 * Loai phong cua 1 thiet ke (khop CHECK chk_designs_room_type o backend, V10).
 * Dung de chon khi tao thiet ke va de loc / gan nhan o man "Của tôi".
 */
import type { IoniconName } from '@/types';

export type RoomType = 'living' | 'bedroom' | 'kitchen' | 'dining' | 'office' | 'kids' | 'bathroom' | 'other';

export interface RoomTypeInfo {
  id: RoomType;
  label: string;
  icon: IoniconName;
}

export const ROOM_TYPES: RoomTypeInfo[] = [
  { id: 'living', label: 'Phòng khách', icon: 'tv-outline' },
  { id: 'bedroom', label: 'Phòng ngủ', icon: 'bed-outline' },
  { id: 'kitchen', label: 'Bếp', icon: 'restaurant-outline' },
  { id: 'dining', label: 'Phòng ăn', icon: 'cafe-outline' },
  { id: 'office', label: 'Phòng làm việc', icon: 'laptop-outline' },
  { id: 'kids', label: 'Phòng trẻ em', icon: 'happy-outline' },
  { id: 'bathroom', label: 'Phòng tắm', icon: 'water-outline' },
  { id: 'other', label: 'Khác', icon: 'cube-outline' },
];

export const DEFAULT_ROOM_TYPE: RoomType = 'other';

const BY_ID = new Map(ROOM_TYPES.map((t) => [t.id, t]));

export const isRoomType = (v: unknown): v is RoomType => typeof v === 'string' && BY_ID.has(v as RoomType);

export const roomTypeInfo = (id?: string | null): RoomTypeInfo =>
  BY_ID.get(isRoomType(id) ? id : DEFAULT_ROOM_TYPE) ?? ROOM_TYPES[ROOM_TYPES.length - 1];
