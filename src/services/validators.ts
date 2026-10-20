/**
 * src/services/validators.ts
 * Kiem tra nhanh du lieu backend tra ve co dung contract frontend khong.
 * Chi kiem cac truong man hinh BAT BUOC phai co (de khong crash),
 * khong kiem tung chi tiet. Neu sau nay nhom dung zod chung voi backend
 * thi thay cac ham nay.
 */
import type { AuthSession, Category, Design, Product, User } from '@/types';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const listOf =
  <T>(guard: (v: unknown) => v is T) =>
  (v: unknown): v is T[] =>
    Array.isArray(v) && v.every(guard);

export const isUser = (v: unknown): v is User =>
  isRecord(v) && isString(v.id) && isString(v.name) && isString(v.email);

export const isAuthSession = (v: unknown): v is AuthSession =>
  isRecord(v) && isString(v.token) && v.token.length > 0 && isUser(v.user);

export const isCategory = (v: unknown): v is Category => isRecord(v) && isString(v.id) && isString(v.label);
export const isCategoryList = listOf(isCategory);

export const isProduct = (v: unknown): v is Product =>
  isRecord(v) &&
  isString(v.id) &&
  isString(v.name) &&
  isNumber(v.price) &&
  isString(v.unit) &&
  isString(v.categoryId) &&
  isString(v.imageUrl) &&
  Array.isArray(v.specs) &&
  Array.isArray(v.colors) &&
  Array.isArray(v.sizes);
export const isProductList = listOf(isProduct);

export const isDesign = (v: unknown): v is Design =>
  isRecord(v) &&
  isString(v.id) &&
  isString(v.createdAt) &&
  isString(v.originalImageUri) &&
  isString(v.resultImageUrl) &&
  isString(v.roomType) &&
  isString(v.style) &&
  (v.status === 'processing' || v.status === 'done' || v.status === 'failed') &&
  Array.isArray(v.products) &&
  typeof v.isFavorite === 'boolean';
export const isDesignList = listOf(isDesign);

/** Response cua GET /health (DA CO tren backend) */
export const isHealth = (v: unknown): v is { status: string; message?: string } =>
  isRecord(v) && isString(v.status);
