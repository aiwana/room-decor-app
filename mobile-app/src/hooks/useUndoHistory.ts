/**
 * src/hooks/useUndoHistory.ts
 * Lich su Hoan tac / Lam lai cho trinh chinh sua.
 *
 * Cach dung: TRUOC moi thao tac, goi record(trangThaiHienTai). Hoan tac lay lai trang thai truoc do,
 * trang thai luc bam Hoan tac duoc cat vao danh sach "Lam lai".
 * Thao tac lap lai lien tuc (bam mui ten nhieu lan, bam To/Nho...) truyen cung 1 coalesceKey
 * -> chi tinh la 1 buoc neu cac lan cach nhau chua toi windowMs.
 */
import { useCallback, useRef, useState } from 'react';

const DEFAULT_LIMIT = 50;
const DEFAULT_WINDOW_MS = 1500;

export interface UndoHistory<T> {
  /** Ghi lai trang thai TRUOC khi thay doi */
  record: (snapshot: T, coalesceKey?: string, windowMs?: number) => void;
  /** Trang thai se quay ve neu bam Hoan tac / Lam lai (chua lay ra) */
  peekUndo: () => T | undefined;
  peekRedo: () => T | undefined;
  /** Lay ra 1 buoc; current = trang thai dang hien thi (de Lam lai / Hoan tac nguoc lai) */
  undo: (current: T) => T | undefined;
  redo: (current: T) => T | undefined;
  canUndo: boolean;
  canRedo: boolean;
  /** So buoc dang co the Hoan tac */
  size: number;
  /** Tang 1 sau moi lan record / undo / redo (de biet "tu luc do da co thao tac nao khac chua") */
  version: number;
}

export function useUndoHistory<T>(limit = DEFAULT_LIMIT): UndoHistory<T> {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const last = useRef<{ key: string; at: number } | null>(null);
  // Doi so buoc -> ve lai nut Hoan tac / Lam lai
  const [counts, setCounts] = useState({ past: 0, future: 0, version: 0 });
  const sync = useCallback((): void => {
    setCounts((c) => ({ past: past.current.length, future: future.current.length, version: c.version + 1 }));
  }, []);

  const record = useCallback(
    (snapshot: T, coalesceKey?: string, windowMs = DEFAULT_WINDOW_MS): void => {
      const now = Date.now();
      const prev = last.current;
      future.current = [];
      if (coalesceKey && prev && prev.key === coalesceKey && now - prev.at < windowMs && past.current.length > 0) {
        // Cung 1 chuoi thao tac: giu buoc cu (trang thai truoc lan bam dau tien)
        last.current = { key: coalesceKey, at: now };
        sync();
        return;
      }
      past.current.push(snapshot);
      if (past.current.length > limit) past.current.shift();
      last.current = coalesceKey ? { key: coalesceKey, at: now } : null;
      sync();
    },
    [limit, sync],
  );

  const peekUndo = useCallback((): T | undefined => past.current[past.current.length - 1], []);
  const peekRedo = useCallback((): T | undefined => future.current[future.current.length - 1], []);

  const undo = useCallback(
    (current: T): T | undefined => {
      const prev = past.current.pop();
      if (prev === undefined) return undefined;
      future.current.push(current);
      last.current = null;
      sync();
      return prev;
    },
    [sync],
  );

  const redo = useCallback(
    (current: T): T | undefined => {
      const next = future.current.pop();
      if (next === undefined) return undefined;
      past.current.push(current);
      last.current = null;
      sync();
      return next;
    },
    [sync],
  );

  return {
    record,
    peekUndo,
    peekRedo,
    undo,
    redo,
    canUndo: counts.past > 0,
    canRedo: counts.future > 0,
    size: counts.past,
    version: counts.version,
  };
}
