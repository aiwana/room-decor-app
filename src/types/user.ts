/**
 * src/types/user.ts
 * Nguoi dung + dang nhap.
 * DE XUAT contract frontend (chua thong nhat voi backend, xem docs/api-contract-de-xuat.md).
 */
export interface User {
  id: string;
  name: string;
  email: string;
  /** Co the khong co -> Profile hien icon mac dinh */
  avatarUrl?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Ket qua dang nhap/dang ky ma frontend dung ben trong app.
 * Backend tra ve ten truong khac (vd accessToken) -> chi sua ham doc
 * response trong authService.ts, KHONG sua man hinh.
 */
export interface AuthSession {
  token: string;
  user: User;
}
