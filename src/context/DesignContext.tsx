/**
 * src/context/DesignContext.tsx
 * Kho du lieu thiet ke dung chung cho moi man hinh.
 *
 * - savedDesigns: thiet ke da LUU (hien o History, Home "gan day")
 * - drafts: thiet ke vua tao nhung CHUA luu (chi song trong bo nho)
 *
 * Result nhan id qua URL (/result/abc) roi goi getDesign(id) de lay du lieu.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { aiService } from '@/services/aiService';
import { designService } from '@/services/designService';
import type { Design, GenerateDesignInput } from '@/types';

interface DesignContextValue {
  savedDesigns: Design[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Goi AI (mock/that), them ket qua vao drafts, tra ve Design */
  generate: (input: GenerateDesignInput) => Promise<Design>;
  getDesign: (id: string) => Design | undefined;
  isSaved: (id: string) => boolean;
  saveDesign: (id: string) => Promise<void>;
  removeDesign: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
}

const DesignContext = createContext<DesignContextValue | null>(null);

export const DesignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedDesigns, setSavedDesigns] = useState<Design[]>([]);
  const [drafts, setDrafts] = useState<Design[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setSavedDesigns(await designService.list());
    } catch {
      setError('Không tải được lịch sử thiết kế.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Tai lan dau khi mo app (chi setState khi Promise tra ve)
  useEffect(() => {
    let active = true;
    designService
      .list()
      .then((list): void => {
        if (active) setSavedDesigns(list);
      })
      .catch((): void => {
        if (active) setError('Không tải được lịch sử thiết kế.');
      })
      .finally((): void => {
        if (active) setLoading(false);
      });
    return (): void => {
      active = false;
    };
  }, []);

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

  const isSaved = useCallback(
    (id: string): boolean => savedDesigns.some((d) => d.id === id),
    [savedDesigns],
  );

  const saveDesign = useCallback(
    async (id: string): Promise<void> => {
      const design = drafts.find((d) => d.id === id);
      if (!design || savedDesigns.some((d) => d.id === id)) {
        return;
      }
      await designService.save(design);
      setSavedDesigns((prev) => [design, ...prev]);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    },
    [drafts, savedDesigns],
  );

  const removeDesign = useCallback(async (id: string): Promise<void> => {
    await designService.remove(id);
    setSavedDesigns((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const toggleFavorite = useCallback(
    async (id: string): Promise<void> => {
      const design = getDesign(id);
      if (!design) {
        return;
      }
      const next = !design.isFavorite;
      if (!savedDesigns.some((d) => d.id === id)) {
        // Thiet ke chua luu: bam "yeu thich" = luu luon
        const updated: Design = { ...design, isFavorite: next };
        await designService.save(updated);
        setSavedDesigns((prev) => [updated, ...prev]);
        setDrafts((prev) => prev.filter((d) => d.id !== id));
        return;
      }
      await designService.setFavorite(id, next);
      setSavedDesigns((prev) => prev.map((d) => (d.id === id ? { ...d, isFavorite: next } : d)));
    },
    [getDesign, savedDesigns],
  );

  const value = useMemo<DesignContextValue>(
    () => ({
      savedDesigns,
      loading,
      error,
      reload,
      generate,
      getDesign,
      isSaved,
      saveDesign,
      removeDesign,
      toggleFavorite,
    }),
    [savedDesigns, loading, error, reload, generate, getDesign, isSaved, saveDesign, removeDesign, toggleFavorite],
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
