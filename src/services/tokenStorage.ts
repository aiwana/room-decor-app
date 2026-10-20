/**
 * src/services/tokenStorage.ts
 * Luu token dang nhap de mo lai app van con dang nhap.
 *
 * - Android / iOS: expo-secure-store (ma hoa bang Keystore / Keychain).
 *   KHONG dung AsyncStorage cho token vi AsyncStorage la file thuong, khong ma hoa.
 * - Web: expo-secure-store khong ho tro -> chi giu trong bo nho,
 *   tai lai trang la phai dang nhap lai (chap nhan duoc, app nham toi Android).
 *
 * Chi luu TOKEN. Khong bao gio luu mat khau.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'roomdecor.authToken';
const isWeb = Platform.OS === 'web';
let memoryToken: string | null = null;

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (isWeb) return memoryToken;
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async set(token: string): Promise<void> {
    if (isWeb) {
      memoryToken = token;
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async clear(): Promise<void> {
    if (isWeb) {
      memoryToken = null;
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
