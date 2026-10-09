/**
 * src/services/quoteService.ts
 * Gui yeu cau bao gia / lien he (module phu).
 */
import type { QuoteRequest } from '@/types';
import { delay } from '@/utils/format';

import { apiClient } from './apiClient';
import { MOCK_API_DELAY_MS, USE_MOCK } from './config';

export const quoteService = {
  async send(request: QuoteRequest): Promise<void> {
    if (!USE_MOCK) {
      await apiClient.post('/api/quote-requests', request);
      return;
    }
    await delay(MOCK_API_DELAY_MS * 2);
  },
};
