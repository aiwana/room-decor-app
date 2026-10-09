/**
 * src/services/authService.ts
 * Dang ky / dang nhap / lay thong tin nguoi dung hien tai.
 *
 *   - Mock (USE_MOCK = true): CHE DO MINH HOA. Khong kiem tra mat khau,
 *     moi email hop le deu dang nhap duoc. Man hinh dang nhap ghi ro dieu nay.
 *     Khong luu mat khau o bat ky dau.
 *   - API: goi endpoint DE XUAT (backend chua co). Khi backend chua co,
 *     dang nhap se bao loi "Máy chủ chưa có chức năng... (404)", KHONG gia vo thanh cong.
 *
 * Contract DE XUAT (chua thong nhat):
 *   POST /api/auth/login    { email, password }        -> { token, user }
 *   POST /api/auth/register { name, email, password }  -> { token, user }
 *   GET  /api/me            (Authorization: Bearer)    -> user
 * Neu backend tra ten truong khac (vd accessToken), chi sua isAuthSession/ham duoi day.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MOCK_USER } from '@/data/mock/user';
import type { AuthSession, LoginInput, RegisterInput, User } from '@/types';
import { delay } from '@/utils/format';

import { request } from './apiClient';
import { MOCK_API_DELAY_MS, USE_MOCK } from './config';
import { ENDPOINTS } from './endpoints';
import { isAuthSession, isUser } from './validators';

export interface AuthService {
  login(input: LoginInput): Promise<AuthSession>;
  register(input: RegisterInput): Promise<AuthSession>;
  /** Dung token da luu de lay lai user khi mo app */
  getCurrentUser(): Promise<User>;
}

/* ------------------------------ MOCK ------------------------------ */
const MOCK_TOKEN_PREFIX = 'mock-token';
/** Mock "may chu" nho user vua dang nhap (chi ten + email, KHONG co mat khau) */
const MOCK_USER_KEY = 'roomdecor:mock-user';

const mockSession = async (user: User): Promise<AuthSession> => {
  await delay(MOCK_API_DELAY_MS);
  await AsyncStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
  return { token: `${MOCK_TOKEN_PREFIX}-${Date.now()}`, user };
};

const mockAuthService: AuthService = {
  login: ({ email }) => mockSession({ ...MOCK_USER, email }),
  register: ({ name, email }) => mockSession({ ...MOCK_USER, name, email }),
  async getCurrentUser() {
    await delay(MOCK_API_DELAY_MS);
    const raw = await AsyncStorage.getItem(MOCK_USER_KEY);
    try {
      const value: unknown = raw ? JSON.parse(raw) : null;
      return isUser(value) ? value : MOCK_USER;
    } catch {
      return MOCK_USER;
    }
  },
};

/* ---------------------- API (endpoint DE XUAT) ---------------------- */
const apiAuthService: AuthService = {
  login: (input) => request({ method: 'POST', url: ENDPOINTS.AUTH_LOGIN, data: input }, isAuthSession),
  register: (input) => request({ method: 'POST', url: ENDPOINTS.AUTH_REGISTER, data: input }, isAuthSession),
  getCurrentUser: () => request({ method: 'GET', url: ENDPOINTS.ME }, isUser),
};

export const authService: AuthService = USE_MOCK ? mockAuthService : apiAuthService;
