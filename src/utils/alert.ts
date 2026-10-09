/**
 * src/utils/alert.ts
 * Hien thong bao loi thong nhat cho moi thao tac (luu, xoa, yeu thich, gui form...).
 */
import { Alert } from 'react-native';

import { getErrorMessage } from '@/services/apiError';

/** showError('Không lưu được thiết kế', error) */
export const showError = (title: string, error: unknown): void => {
  Alert.alert(title, getErrorMessage(error));
};
