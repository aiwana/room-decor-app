/**
 * src/services/auth-api.ts
 * Tai khoan: POST /api/auth/login, POST /api/auth/register, GET /api/users/me
 * (tai lieu: backend/docs/api-auth.md).
 *
 * Che do mock: khong goi may chu. Email hop le nao cung dang nhap duoc,
 * mat khau KHONG duoc kiem tra (man hinh co ghi ro).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MOCK_DELAY, STORAGE_KEYS, USE_MOCK } from '@/constants';
import type { AuthResponse, LoginInput, RegisterInput, User } from '@/types';
import { delay } from '@/utils';

import apiClient from './api-client';

const MOCK_TOKEN = 'mock-token';

const mockSignIn = async (user: User): Promise<AuthResponse> => {
  await delay(MOCK_DELAY);
  await AsyncStorage.setItem(STORAGE_KEYS.MOCK_USER, JSON.stringify(user));
  return { token: MOCK_TOKEN, user };
};

const nameFromEmail = (email: string): string => email.split('@')[0] || 'Người dùng';

export const authApi = {
  login: (input: LoginInput): Promise<AuthResponse> => {
    if (USE_MOCK) {
      return mockSignIn({ id: 'mock-user', name: nameFromEmail(input.email), email: input.email, role: 'USER' });
    }
    return apiClient.post<AuthResponse>('/auth/login', input).then((r) => r.data);
  },

  register: (input: RegisterInput): Promise<AuthResponse> => {
    if (USE_MOCK) {
      return mockSignIn({ id: 'mock-user', name: input.name, email: input.email, role: 'USER' });
    }
    return apiClient.post<AuthResponse>('/auth/register', input).then((r) => r.data);
  },

  getProfile: async (): Promise<User> => {
    if (USE_MOCK) {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.MOCK_USER);
      if (!raw) throw new Error('Chưa đăng nhập');
      return JSON.parse(raw) as User;
    }
    return apiClient.get<User>('/users/me').then((r) => r.data);
  },
};
