/**
 * src/services/token-storage.ts
 * Luu token dang nhap de mo lai app van con dang nhap.
 * Dung expo-secure-store (ma hoa bang Keystore / Keychain), KHONG dung AsyncStorage.
 * Chi luu TOKEN. Khong bao gio luu mat khau.
 */
import * as SecureStore from 'expo-secure-store';

import { STORAGE_KEYS } from '@/constants';

export const tokenStorage = {
  get: (): Promise<string | null> => SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN),
  set: (token: string): Promise<void> => SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token),
  clear: (): Promise<void> => SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN),
};
