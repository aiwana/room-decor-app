/**
 * src/utils/index.ts
 * Ham tien ich nho dung o nhieu noi.
 */

/** ISO string -> "08/10/2026" */
export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/** Cho ms mili-giay (gia lap do tre mang o che do mock) */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Tao id tam (mock, placement moi). Backend se tu tao UUID that. */
export const createId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Lay 1 gia tri string tu URL params (co the la string | string[]) */
export const firstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/** Gioi han gia tri trong [min, max] */
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
