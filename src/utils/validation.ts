/**
 * src/utils/validation.ts
 * Kiem tra du lieu form o frontend (backend VAN PHAI kiem tra lai).
 * Quy tac mat khau la DE XUAT, can thong nhat voi backend.
 */
import type { LoginInput, RegisterInput } from '@/types';

export const PASSWORD_MIN_LENGTH = 6;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string): boolean => EMAIL_REGEX.test(email.trim());

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export const validateLogin = (input: LoginInput): FieldErrors<keyof LoginInput> => {
  const errors: FieldErrors<keyof LoginInput> = {};
  if (!input.email.trim()) errors.email = 'Vui lòng nhập email';
  else if (!isValidEmail(input.email)) errors.email = 'Email không đúng định dạng';
  if (!input.password) errors.password = 'Vui lòng nhập mật khẩu';
  return errors;
};

export type RegisterForm = RegisterInput & { confirmPassword: string };

export const validateRegister = (input: RegisterForm): FieldErrors<keyof RegisterForm> => {
  const errors: FieldErrors<keyof RegisterForm> = {};
  if (input.name.trim().length < 2) errors.name = 'Vui lòng nhập họ tên (ít nhất 2 ký tự)';
  if (!input.email.trim()) errors.email = 'Vui lòng nhập email';
  else if (!isValidEmail(input.email)) errors.email = 'Email không đúng định dạng';
  if (input.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự`;
  }
  if (input.confirmPassword !== input.password) errors.confirmPassword = 'Mật khẩu nhập lại không khớp';
  return errors;
};
