/**
 * src/hooks/useFurniture.ts
 * Danh sach noi that (loc theo danh muc + tu khoa). isSample = dang dung noi that mau.
 */
import { furnitureApi } from '@/services/furniture-api';
import type { Furniture } from '@/types';

import { useAsync } from './useAsync';

export function useFurniture(
  category?: string,
  query?: string,
): {
  items: Furniture[];
  isSample: boolean;
  loading: boolean;
  error: unknown;
  refresh: () => void;
} {
  const { data, loading, error, reload } = useAsync(() => furnitureApi.list(category, query), [category, query]);
  return { items: data?.items ?? [], isSample: data?.isSample ?? false, loading, error, refresh: reload };
}
