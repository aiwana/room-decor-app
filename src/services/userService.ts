/**
 * src/services/userService.ts
 * Thong tin nguoi dung. Mock cho toi khi co dang nhap that.
 */
import { MOCK_USER } from '@/data/mock/user';
import type { User } from '@/types';
import { delay } from '@/utils/format';

import { apiClient } from './apiClient';
import { MOCK_API_DELAY_MS, USE_MOCK } from './config';

export const userService = {
  async getCurrentUser(): Promise<User> {
    if (!USE_MOCK) {
      return (await apiClient.get<User>('/api/me')).data;
    }
    await delay(MOCK_API_DELAY_MS);
    return MOCK_USER;
  },
};
