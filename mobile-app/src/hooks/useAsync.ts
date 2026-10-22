/**
 * src/hooks/useAsync.ts
 * Hook tai du lieu bat dong bo, tra ve { data, loading, error, reload }.
 *
 * Cach dung:
 *   const { data, loading, error, reload } = useAsync(
 *     () => furnitureApi.list(category),
 *     [category],          // khi gia tri nay doi -> tai lai
 *   );
 *
 * Chi setState khi Promise tra ve; `loading` duoc tinh ra tu "key" cua lan tai,
 * nen khong bi hien du lieu cu cua bo loc truoc.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

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

export const useAsync = <T>(
  fn: () => Promise<T>,
  deps: readonly (string | number | boolean | undefined)[],
): AsyncState<T> => {
  const [reloadCount, setReloadCount] = useState<number>(0);
  const [result, setResult] = useState<Result<T> | null>(null);

  // Luon goi ban moi nhat cua fn ma khong can dua fn vao deps
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const requestKey = `${JSON.stringify(deps)}#${reloadCount}`;

  useEffect(() => {
    let active = true;
    fnRef.current().then(
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
    // Giu du lieu cu trong luc tai lai (tranh nhap nhay man hinh)
    data: result?.data,
    loading: !isCurrent,
    error: isCurrent ? result?.error : undefined,
    reload,
  };
};
