/**
 * src/utils/format.ts
 * Ham tien ich nho dung o nhieu noi.
 */

/** 285000 -> "285.000đ" */
export const formatVnd = (value: number): string => `${value.toLocaleString('vi-VN')}đ`;

/** ISO string -> "08/10/2026" */
export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/** Cho ms mili-giay (gia lap do tre mang) */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Tao id don gian, du dung cho mock (backend that se tu tao id) */
export const createId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Lay 1 gia tri string tu URL params (co the la string | string[]) */
export const firstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;
