/**
 * src/services/config.ts
 * Cau hinh chung cho tang service.
 *
 * USE_MOCK = true  -> dung du lieu gia (giai doan frontend)
 * USE_MOCK = false -> goi backend that qua REST API
 *
 * Doi bang file .env o goc project (Expo tu doc bien EXPO_PUBLIC_*):
 *   EXPO_PUBLIC_USE_MOCK=false
 *   EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
 * (10.0.2.2 = "localhost cua may tinh" khi chay tren Android Emulator)
 */
export const USE_MOCK: boolean = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080';

/** Thoi gian gia lap AI xu ly (ms) */
export const MOCK_AI_DELAY_MS = 2500;

/** Thoi gian gia lap goi API thuong (ms) */
export const MOCK_API_DELAY_MS = 400;

/**
 * Ti le mock AI bi loi (0 -> 1). Dat 0.3 de thu man hinh loi, nho tra ve 0.
 */
export const MOCK_AI_FAIL_RATE = 0;
