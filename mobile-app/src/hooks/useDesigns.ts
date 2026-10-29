/**
 * src/hooks/useDesigns.ts
 * Danh sach thiet ke cua nguoi dung. Tu tai lai moi khi man hinh duoc mo lai
 * (vd quay ve tu trinh chinh sua) de thay thay doi moi nhat.
 */
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import { designApi } from '@/services/design-api';
import type { DesignDetail } from '@/types';

import { useAsync } from './useAsync';

export function useDesigns(): {
  designs: DesignDetail[];
  loading: boolean;
  /** Dang tai lai trong khi da co du lieu cu (dung cho keo-de-lam-moi) */
  refreshing: boolean;
  error: unknown;
  refresh: () => void;
} {
  const { data, loading, error, reload } = useAsync(() => designApi.getAll(), []);

  // Lan dau mo man hinh useAsync da tai; cac lan focus sau thi tai lai
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { designs: data ?? [], loading: loading && !data, refreshing: loading && Boolean(data), error, refresh: reload };
}
