/**
 * src/hooks/useAsync.ts
 * Hook tai du lieu bat dong bo, tra ve { data, loading, error, reload }.
 * Dung chung cho moi man hinh can goi service (Catalog, Product Detail, ...).
 *
 * Cach dung:
 *   const { data, loading, error, reload } = useAsync(
 *     () => productService.getProducts(category),
 *     [category],          // khi gia tri nay doi -> tai lai
 *   );
 *
 * Vi sao khong viet useEffect + setLoading(true) truc tiep?
 * React 19 khuyen KHONG goi setState dong bo trong useEffect (gay render thua).
 * Hook nay chi setState khi Promise tra ve, con `loading` duoc tinh ra.
 */
import { useCallback, useEffect, useEffectEvent, useState } from 'react';

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: unknown;
  reload: () => void;
}

interface Result<T> {
  key: string;
  data?: T;
  error?: unknown;
}

export const useAsync = <T>(fn: () => Promise<T>, deps: readonly (string | number | undefined)[]): AsyncState<T> => {
  const [reloadCount, setReloadCount] = useState<number>(0);
  const [result, setResult] = useState<Result<T> | null>(null);

  // Moi lan deps doi hoac bam "Thu lai" -> 1 key moi -> tai lai
  const requestKey = `${JSON.stringify(deps)}#${reloadCount}`;

  // useEffectEvent: luon goi ban moi nhat cua fn ma khong can dua fn vao deps
  const run = useEffectEvent(fn);

  useEffect(() => {
    let active = true;
    run().then(
      (data): void => {
        if (active) setResult({ key: requestKey, data });
      },
      (error: unknown): void => {
        if (active) setResult({ key: requestKey, error });
      },
    );
    return (): void => {
      active = false;
    };
  }, [requestKey]);

  const reload = useCallback((): void => setReloadCount((c) => c + 1), []);

  const isCurrent = result?.key === requestKey;
  return {
    data: result?.data,
    loading: !isCurrent,
    error: isCurrent ? result?.error : undefined,
    reload,
  };
};
