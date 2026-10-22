/**
 * src/constants/index.ts
 * Cau hinh chung. MOI dia chi backend chi duoc doc tu day.
 *
 * Doi bang file .env trong thu muc mobile-app (xem .env.example),
 * nho chay lai `npx expo start -c` sau khi sua .env:
 *
 *   EXPO_PUBLIC_USE_MOCK=false
 *   EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api
 *
 * Dia chi backend Spring Boot (cong 8080) theo noi chay app:
 *   - Android Emulator : http://10.0.2.2:8080/api (10.0.2.2 = may tinh, nhin tu emulator)
 *   - iOS Simulator    : http://localhost:8080/api
 *   - Dien thoai that  : http://<IP LAN cua may tinh>:8080/api (cung mang Wi-Fi)
 *
 * Luu y bao mat: moi bien EXPO_PUBLIC_* deu bi dong goi vao app,
 * KHONG BAO GIO dat mat khau / API key bi mat vao day.
 */
import { Platform } from 'react-native';

/** true = dung du lieu gia trong app (mac dinh), false = goi backend that */
export const USE_MOCK: boolean = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

const DEFAULT_BACKEND_PORT = 8080;

const defaultApiUrl = (): string =>
  Platform.OS === 'android'
    ? `http://10.0.2.2:${DEFAULT_BACKEND_PORT}/api`
    : `http://localhost:${DEFAULT_BACKEND_PORT}/api`;

const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

/** true neu dia chi lay tu .env, false neu dang dung gia tri mac dinh */
export const API_URL_FROM_ENV: boolean = Boolean(envApiUrl);

/** Dia chi API (co "/api" o cuoi), bo dau "/" thua */
export const API_BASE_URL: string = (envApiUrl || defaultApiUrl()).replace(/\/+$/, '');

/** Thoi gian cho toi da 1 request thuong (ms) */
export const API_TIMEOUT = 15000;

/** Upload anh phong lau hon request thuong */
export const UPLOAD_TIMEOUT = 60000;

/** Gia lap do tre mang o che do mock (ms) */
export const MOCK_DELAY = 400;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  /** Du lieu thiet ke luu tren may (vi tri do, anh phong) - xem services/local-store.ts */
  LOCAL_DESIGNS: 'roomdecor.localDesigns',
  /** Danh sach thiet ke gia (chi dung khi USE_MOCK) */
  MOCK_DESIGNS: 'roomdecor.mockDesigns',
  MOCK_USER: 'roomdecor.mockUser',
} as const;
