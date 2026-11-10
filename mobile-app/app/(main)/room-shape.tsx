/**
 * app/(main)/room-shape.tsx
 * Man hinh "Sửa phòng" (sua goc, tuong, cua, tran). Mo bang openRoomShapeEditor().
 *
 * Truoc day man nay la <Modal> nam trong trinh sua. Tren Android, Modal la cua so rieng va doi khi
 * noi dung co kich thuoc 0x0 -> chi thay lop toi + khung bi lech. Man hinh trong Stack thi khong bi.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import RoomShapeEditor from '@/components/editor/RoomShapeEditor';
import { clearRoomShapeSession, getRoomShapeSession } from '@/store/room-shape-session';

export default function RoomShapeScreen() {
  const router = useRouter();
  // Doc 1 lan luc mo; giu nguyen suot vong doi man hinh
  const [session] = useState(getRoomShapeSession);

  const close = useCallback((): void => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  // Mo lai man nay ma khong co du lieu (vd. tai lai app khi dang o day) -> quay ve
  useEffect(() => {
    if (!session) close();
    return () => clearRoomShapeSession(session);
  }, [session, close]);

  if (!session) return null;
  return <RoomShapeEditor floorPlan={session.floorPlan} onClose={close} onSave={session.onSave} />;
}
