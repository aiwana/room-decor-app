/**
 * src/store/room-shape-session.ts
 * Mo man "Sửa phòng" (app/(main)/room-shape.tsx) va nhan ket qua.
 *
 * Ham onSave va du lieu phong khong dua qua tham so URL duoc, nen giu tam o day:
 *   openRoomShapeEditor(router, { floorPlan, onSave }) -> man Sua phong doc lai bang getRoomShapeSession().
 * Chi co 1 man Sua phong mo cung luc, nen 1 bien la du.
 */
import type { FloorPlan } from '@/types';
import type { RoomShapeResult } from '@/components/editor/RoomShapeEditor';

export interface RoomShapeSession {
  floorPlan: FloorPlan;
  onSave: (result: RoomShapeResult) => Promise<void>;
}

let current: RoomShapeSession | null = null;

export const getRoomShapeSession = (): RoomShapeSession | null => current;

/** Chi xoa neu van la phien cu (tranh xoa nham phien moi vua mo) */
export const clearRoomShapeSession = (session: RoomShapeSession | null): void => {
  if (current === session) current = null;
};

export const openRoomShapeEditor = (
  router: { push: (href: '/room-shape') => void },
  session: RoomShapeSession,
): void => {
  current = session;
  router.push('/room-shape');
};
