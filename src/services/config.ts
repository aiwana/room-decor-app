/**
 * src/services/config.ts
 * Cau hinh chung cho tang service. MOI dia chi backend chi duoc doc tu day.
 *
 * Doi bang file .env o goc project (Expo tu doc bien EXPO_PUBLIC_*,
 * nho chay lai `npx expo start -c` sau khi sua .env):
 *
 *   EXPO_PUBLIC_USE_MOCK=false
 *   EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
 *
 * Dia chi backend theo noi chay app (backend mac dinh cong 3000):
 *   - Web (trinh duyet tren may tinh) : http://localhost:3000
 *   - Android Emulator                : http://10.0.2.2:3000  (10.0.2.2 = may tinh, nhin tu emulator)
 *   - Dien thoai that (Expo Go)       : http://<IP LAN cua may tinh>:3000
 *       -> Windows: chay `ipconfig`, lay "IPv4 Address" cua Wi-Fi, vd 192.168.1.10.
 *       -> Dien thoai va may tinh phai cung mang Wi-Fi.
 *     Tren dien thoai that KHONG co gia tri mac dinh dung -> bat buoc dat EXPO_PUBLIC_API_URL.
 *
 * Luu y bao mat: moi bien EXPO_PUBLIC_* deu bi dong goi vao app,
 * KHONG BAO GIO dat mat khau / API key bi mat vao day.
 */
import { Platform } from 'react-native';

/** true = dung du lieu gia (mac dinh), false = goi backend that */
export const USE_MOCK: boolean = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

/** Cong backend dang dung trong backend/src/server.ts */
const DEFAULT_BACKEND_PORT = 3000;

const defaultApiUrl = (): string =>
  Platform.OS === 'android'
    ? `http://10.0.2.2:${DEFAULT_BACKEND_PORT}` // dung cho Android Emulator
    : `http://localhost:${DEFAULT_BACKEND_PORT}`; // web / iOS Simulator tren cung may

const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

/** true neu dia chi lay tu .env, false neu dang dung gia tri mac dinh */
export const API_URL_FROM_ENV: boolean = Boolean(envApiUrl);

/** Bo dau "/" cuoi de ghep duong dan khong bi "//" */
export const API_URL: string = (envApiUrl || defaultApiUrl()).replace(/\/+$/, '');

/** Thoi gian cho toi da 1 request thuong (ms) */
export const API_TIMEOUT_MS = 15000;

/** Thoi gian cho request tao thiet ke (upload anh + AI), lau hon request thuong */
export const AI_TIMEOUT_MS = 120000;

/** Thoi gian gia lap AI xu ly (ms) */
export const MOCK_AI_DELAY_MS = 2500;

/** Thoi gian gia lap goi API thuong (ms) */
export const MOCK_API_DELAY_MS = 400;

/**
 * Ti le mock AI bi loi (0 -> 1). Dat 0.3 de thu man hinh loi, nho tra ve 0.
 */
export const MOCK_AI_FAIL_RATE = 0;
