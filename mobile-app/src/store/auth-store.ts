/**
 * src/store/auth-store.ts
 * Trang thai dang nhap dung chung cho toan app (Zustand).
 *
 *   status:
 *     'restoring' : dang mo app, dang doc token da luu
 *     'signedOut' : chua dang nhap -> app chi cho vao man Dang nhap / Dang ky
 *     'signedIn'  : da dang nhap, co `user`
 *     'error'     : co token nhung khong lay lai duoc user (vd mat mang) -> cho thu lai
 *
 * App BAT BUOC dang nhap: (main)/_layout.tsx chuyen ve /login khi chua dang nhap.
 */
import { create } from 'zustand';

import { authApi } from '@/services/auth-api';
import { setAuthToken, setUnauthorizedHandler } from '@/services/api-client';
import { toApiError } from '@/services/api-error';
import { tokenStorage } from '@/services/token-storage';
import type { AuthResponse, LoginInput, RegisterInput, User } from '@/types';

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn' | 'error';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  /** Loi khi khoi phuc phien (status = 'error') */
  restoreError: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  /** Goi 1 lan khi mo app (va khi bam "Thu lai") */
  restore: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  const applySession = async ({ token, user }: AuthResponse): Promise<void> => {
    await tokenStorage.set(token);
    setAuthToken(token);
    set({ status: 'signedIn', user, restoreError: null });
  };

  return {
    status: 'restoring',
    user: null,
    restoreError: null,

    login: async (input) => applySession(await authApi.login(input)),

    register: async (input) => applySession(await authApi.register(input)),

    logout: async () => {
      setAuthToken(null);
      set({ status: 'signedOut', user: null, restoreError: null });
      await tokenStorage.clear();
    },

    restore: async () => {
      set({ status: 'restoring', restoreError: null });
      const token = await tokenStorage.get();
      if (!token) {
        set({ status: 'signedOut', user: null });
        return;
      }
      setAuthToken(token);
      try {
        const user = await authApi.getProfile();
        set({ status: 'signedIn', user });
      } catch (e) {
        const err = toApiError(e);
        // 401 (hoac 403 o ban backend cu) / khong doc duoc user mock -> token khong con dung
        if (err.status === 401 || err.status === 403 || err.kind === 'unknown') {
          // Token het han / khong hop le -> xoa, coi nhu chua dang nhap
          await get().logout();
          return;
        }
        // Loi mang... -> giu token, cho nguoi dung thu lai
        set({ status: 'error', user: null, restoreError: err.message });
      }
    },
  };
});

// May chu tra 401 o bat ky request nao (token het han) -> dang xuat tren may
setUnauthorizedHandler(() => {
  void useAuthStore.getState().logout();
});
