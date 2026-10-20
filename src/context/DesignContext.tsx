/**
 * src/context/DesignContext.tsx
 * Kho du lieu thiet ke dung chung cho moi man hinh.
 *
 * - savedDesigns: thiet ke da LUU (hien o History, Home "gan day")
 * - drafts: thiet ke vua tao nhung CHUA luu (chi song trong bo nho)
 * - Mock: du lieu luu tren may nay. API: du lieu cua tai khoan tren may chu,
 *   nen o che do API phai dang nhap moi tai duoc (needsLogin = true).
 *
 * Cac ham thao tac (save/remove/toggleFavorite) NEM LOI neu that bai,
 * man hinh tu bat loi va hien thong bao (xem utils/alert.ts).
 * Moi thiet ke chi xu ly 1 thao tac 1 luc (bam lien tuc se bi bo qua).
 *
 * Result nhan id qua URL (/result/abc) roi goi getDesign(id) de lay du lieu.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { aiService } from '@/services/aiService';
import { getErrorMessage } from '@/services/apiError';
import { USE_MOCK } from '@/services/config';
import { designService } from '@/services/designService';
import type { Design, GenerateDesignInput } from '@/types';

import { useAuth } from './AuthContext';

interface DesignContextValue {
  savedDesigns: Design[];
  loading: boolean;
  error: string | null;
  /** Che do API ma chua dang nhap -> khong tai duoc lich su */
  needsLogin: boolean;
  reload: () => void;
  /** Goi AI (mock/that), them ket qua vao drafts, tra ve Design */
  generate: (input: GenerateDesignInput) => Promise<Design>;
  getDesign: (id: string) => Design | undefined;
  isSaved: (id: string) => boolean;
  saveDesign: (id: string) => Promise<void>;
  removeDesign: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  /** Hoi lai may chu trang thai 1 thiet ke (dung khi AI con 'processing') */
  refreshDesign: (id: string) => Promise<void>;
}

const DesignContext = createContext<DesignContextValue | null>(null);

interface ListState {
  key: string;
  designs: Design[];
  error: string | null;
}

export const DesignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, user } = useAuth();
  const canSync = USE_MOCK || status === 'signedIn';

  const [reloadCount, setReloadCount] = useState<number>(0);
  const [list, setList] = useState<ListState>({ key: '', designs: [], error: null });
  const [drafts, setDrafts] = useState<Design[]>([]);
  /** id cac thiet ke dang co thao tac chay (chong bam lap) */
  const busyIds = useRef<Set<string>>(new Set());

  // Doi tai khoan / dang nhap / bam tai lai -> key moi -> tai lai danh sach
  const loadKey = `${canSync ? 'on' : 'off'}|${user?.id ?? '-'}|${reloadCount}`;

  useEffect(() => {
    if (!canSync) return undefined;
    let active = true;
    designService.list().then(
      (designs): void => {
        if (active) setList({ key: loadKey, designs, error: null });
      },
      (e: unknown): void => {
        if (active) setList((prev) => ({ key: loadKey, designs: prev.designs, error: getErrorMessage(e) }));
      },
    );
    return (): void => {
      active = false;
    };
  }, [canSync, loadKey]);

  const savedDesigns = useMemo<Design[]>(() => (canSync ? list.designs : []), [canSync, list.designs]);
  // Che do API dang khoi phuc phien dang nhap -> cung coi la dang tai
  const loading = canSync ? list.key !== loadKey : status === 'restoring';
  const error = canSync && !loading ? list.error : null;

  const updateSaved = useCallback((fn: (prev: Design[]) => Design[]): void => {
    setList((prev) => ({ ...prev, designs: fn(prev.designs) }));
  }, []);

  /** Chay fn cho 1 thiet ke, bo qua neu thiet ke do dang co thao tac khac */
  const runExclusive = useCallback(async (id: string, fn: () => Promise<void>): Promise<void> => {
    if (busyIds.current.has(id)) return;
    busyIds.current.add(id);
    try {
      await fn();
    } finally {
      busyIds.current.delete(id);
    }
  }, []);

  const reload = useCallback((): void => setReloadCount((c) => c + 1), []);

  const generate = useCallback(async (input: GenerateDesignInput): Promise<Design> => {
    const design = await aiService.generateDesign(input);
    setDrafts((prev) => [design, ...prev]);
    return design;
  }, []);

  const getDesign = useCallback(
    (id: string): Design | undefined =>
      savedDesigns.find((d) => d.id === id) ?? drafts.find((d) => d.id === id),
    [savedDesigns, drafts],
  );

  const isSaved = useCallback((id: string): boolean => savedDesigns.some((d) => d.id === id), [savedDesigns]);

  /** Luu 1 ban nhap (kem trang thai yeu thich moi neu co) */
  const persistDraft = useCallback(
    async (design: Design): Promise<void> => {
      await designService.save(design);
      updateSaved((prev) => [design, ...prev.filter((d) => d.id !== design.id)]);
      setDrafts((prev) => prev.filter((d) => d.id !== design.id));
    },
    [updateSaved],
  );

  const saveDesign = useCallback(
    (id: string): Promise<void> =>
      runExclusive(id, async () => {
        const design = drafts.find((d) => d.id === id);
        if (!design || savedDesigns.some((d) => d.id === id)) return;
        await persistDraft(design);
      }),
    [drafts, savedDesigns, persistDraft, runExclusive],
  );

  const removeDesign = useCallback(
    (id: string): Promise<void> =>
      runExclusive(id, async () => {
        await designService.remove(id);
        updateSaved((prev) => prev.filter((d) => d.id !== id));
      }),
    [runExclusive, updateSaved],
  );

  const toggleFavorite = useCallback(
    (id: string): Promise<void> =>
      runExclusive(id, async () => {
        const design = getDesign(id);
        if (!design) return;
        const next = !design.isFavorite;
        if (!savedDesigns.some((d) => d.id === id)) {
          // Thiet ke chua luu: bam "yeu thich" = luu luon (kem isFavorite)
          await persistDraft({ ...design, isFavorite: next });
          return;
        }
        await designService.setFavorite(id, next);
        updateSaved((prev) => prev.map((d) => (d.id === id ? { ...d, isFavorite: next } : d)));
      }),
    [getDesign, savedDesigns, persistDraft, runExclusive, updateSaved],
  );

  const refreshDesign = useCallback(
    (id: string): Promise<void> =>
      runExclusive(id, async () => {
        const fresh = await designService.getById(id);
        if (!fresh) return;
        setDrafts((prev) => prev.map((d) => (d.id === id ? fresh : d)));
        updateSaved((prev) => prev.map((d) => (d.id === id ? fresh : d)));
      }),
    [runExclusive, updateSaved],
  );

  const value = useMemo<DesignContextValue>(
    () => ({
      savedDesigns,
      loading,
      error,
      needsLogin: !canSync && status !== 'restoring',
      reload,
      generate,
      getDesign,
      isSaved,
      saveDesign,
      removeDesign,
      toggleFavorite,
      refreshDesign,
    }),
    [
      savedDesigns,
      loading,
      error,
      canSync,
      status,
      reload,
      generate,
      getDesign,
      isSaved,
      saveDesign,
      removeDesign,
      toggleFavorite,
      refreshDesign,
    ],
  );

  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
};

/** Hook dung trong man hinh: const { savedDesigns } = useDesigns(); */
export const useDesigns = (): DesignContextValue => {
  const ctx = useContext(DesignContext);
  if (!ctx) {
    throw new Error('useDesigns phải được dùng bên trong <DesignProvider>');
  }
  return ctx;
};
