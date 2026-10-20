/**
 * src/context/AuthContext.tsx
 * Trang thai dang nhap dung chung cho toan app.
 *
 *   status:
 *     'restoring' : dang mo app, dang doc token da luu
 *     'signedOut' : chua dang nhap
 *     'signedIn'  : da dang nhap, co `user`
 *     'error'     : co token nhung khong lay lai duoc user (vd mat mang) -> cho thu lai
 *
 * Token luu bang tokenStorage (SecureStore), KHONG luu mat khau.
 * Giai doan hien tai dang nhap la TUY CHON: app van dung duoc khi chua dang nhap.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { setAuthToken, setUnauthorizedHandler } from '@/services/apiClient';
import { toApiError } from '@/services/apiError';
import { authService } from '@/services/authService';
import { tokenStorage } from '@/services/tokenStorage';
import type { AuthSession, LoginInput, RegisterInput, User } from '@/types';

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Loi khi khoi phuc phien (status = 'error') */
  restoreError: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  /** Thu khoi phuc phien lai (khi status = 'error') */
  retryRestore: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface RestoreResult {
  status: AuthStatus;
  user: User | null;
  error: string | null;
}

/** Doc token da luu -> hoi lai may chu user la ai */
const restoreSession = async (): Promise<RestoreResult> => {
  const token = await tokenStorage.get();
  if (!token) return { status: 'signedOut', user: null, error: null };
  setAuthToken(token);
  try {
    const user = await authService.getCurrentUser();
    return { status: 'signedIn', user, error: null };
  } catch (e) {
    const err = toApiError(e);
    if (err.status === 401) {
      // Token het han / khong hop le -> xoa, coi nhu chua dang nhap
      setAuthToken(null);
      await tokenStorage.clear();
      return { status: 'signedOut', user: null, error: null };
    }
    // Loi mang... -> giu token, cho nguoi dung thu lai
    return { status: 'error', user: null, error: err.message };
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<RestoreResult>({ status: 'restoring', user: null, error: null });
  const [restoreCount, setRestoreCount] = useState<number>(0);

  // Mo app (hoac bam "Thu lai"): khoi phuc phien. Chi setState khi Promise xong.
  useEffect(() => {
    let active = true;
    void restoreSession().then((result): void => {
      if (active) setState(result);
    });
    return (): void => {
      active = false;
    };
  }, [restoreCount]);

  const applySession = useCallback(async (session: AuthSession): Promise<void> => {
    await tokenStorage.set(session.token);
    setAuthToken(session.token);
    setState({ status: 'signedIn', user: session.user, error: null });
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setAuthToken(null);
    setState({ status: 'signedOut', user: null, error: null });
    await tokenStorage.clear();
  }, []);

  // May chu tra 401 o bat ky request nao -> dang xuat tren may
  useEffect(() => {
    setUnauthorizedHandler((): void => {
      void logout();
    });
    return (): void => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(
    async (input: LoginInput): Promise<void> => applySession(await authService.login(input)),
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<void> => applySession(await authService.register(input)),
    [applySession],
  );

  const retryRestore = useCallback((): void => {
    setState({ status: 'restoring', user: null, error: null });
    setRestoreCount((c) => c + 1);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      user: state.user,
      restoreError: state.error,
      login,
      register,
      logout,
      retryRestore,
    }),
    [state, login, register, logout, retryRestore],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** const { status, user, login, logout } = useAuth(); */
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth phải được dùng bên trong <AuthProvider>');
  }
  return ctx;
};
