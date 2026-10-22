/**
 * src/utils/validation.ts
 * Kiem tra form o frontend. Quy tac khop voi backend
 * (LoginRequest / RegisterRequest: email hop le, mat khau 6-100 ky tu, ten toi da 100).
 * Backend VAN kiem tra lai, loi tu backend hien theo tung o (errors map).
 */
import type { LoginInput, RegisterInput } from '@/types';

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 100;
export const NAME_MAX_LENGTH = 100;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string): boolean => EMAIL_REGEX.test(email.trim());

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export const validateLogin = (input: LoginInput): FieldErrors<keyof LoginInput> => {
  const errors: FieldErrors<keyof LoginInput> = {};
  if (!input.email.trim()) errors.email = 'Vui lòng nhập email';
  else if (!isValidEmail(input.email)) errors.email = 'Email không đúng định dạng';
  if (!input.password) errors.password = 'Vui lòng nhập mật khẩu';
  else if (input.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Mật khẩu có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`;
  }
  return errors;
};

export type RegisterForm = RegisterInput & { confirmPassword: string };

export const validateRegister = (input: RegisterForm): FieldErrors<keyof RegisterForm> => {
  const errors: FieldErrors<keyof RegisterForm> = {};
  const name = input.name.trim();
  if (name.length < 2) errors.name = 'Vui lòng nhập họ tên (ít nhất 2 ký tự)';
  else if (name.length > NAME_MAX_LENGTH) errors.name = `Họ tên tối đa ${NAME_MAX_LENGTH} ký tự`;
  if (!input.email.trim()) errors.email = 'Vui lòng nhập email';
  else if (!isValidEmail(input.email)) errors.email = 'Email không đúng định dạng';
  if (input.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự`;
  } else if (input.password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự`;
  }
  if (input.confirmPassword !== input.password) errors.confirmPassword = 'Mật khẩu nhập lại không khớp';
  return errors;
};
