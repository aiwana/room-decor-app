/**
 * src/utils/index.ts
 * Ham tien ich nho dung o nhieu noi.
 */
import { API_BASE_URL } from '@/constants';

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

const groupThousands = (value: number): string =>
  String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** 12900000 -> "12.900.000 ₫"; null -> "Liên hệ" */
export const formatPrice = (value?: number | null, currency = 'VND'): string => {
  if (value == null || !Number.isFinite(value)) return 'Liên hệ';
  return currency === 'VND' ? `${groupThousands(value)} ₫` : `${groupThousands(value)} ${currency}`;
};

/** Gia gon cho card vat lieu: 230000/m2 -> "230k/m²", 12900000 -> "12,9tr" */
export const formatShortPrice = (value?: number | null, unit?: string | null): string => {
  if (value == null || !Number.isFinite(value)) return 'Liên hệ';
  let text: string;
  if (value >= 1000000) {
    text = `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1).replace('.', ',')}tr`;
  } else if (value >= 1000) {
    text = `${Math.round(value / 1000)}k`;
  } else {
    text = groupThousands(value);
  }
  if (unit === 'm2') return `${text}/m²`;
  if (unit === 'md') return `${text}/m`;
  if (unit === 'piece') return `${text}/cái`;
  return text;
};

export const formatArea = (value: number): string => `${value.toFixed(1)} m²`;

/** ISO -> "vừa xong", "5 phút trước", "3 giờ trước", "hôm qua", "4 ngày trước", qua 1 tuan thi ra ngay */
export const formatRelative = (iso: string, now = Date.now()): string => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const min = Math.floor((now - t) / 60000);
  if (min < 1) return 'vừa xong';
  if (min < 60) return `${min} phút trước`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return formatDate(iso);
};

/** Duong dan tuong doi tu backend (/furniture/..., /materials/...) -> URL day du */
export const toAssetUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
};
