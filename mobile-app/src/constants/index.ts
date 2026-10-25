export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080/api";

export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  USER_DATA: "user_data",
} as const;

export const API_TIMEOUT = 15000;
