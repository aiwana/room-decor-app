/**
 * src/services/quoteService.ts
 * Gui yeu cau bao gia / lien he (module phu).
 *   - Mock: KHONG gui di dau ca, chi gia lap thoi gian cho (man hinh se noi ro).
 *   - API : POST /api/quote-requests (endpoint DE XUAT).
 */
import type { QuoteRequest } from '@/types';
import { delay } from '@/utils/format';

import { send } from './apiClient';
import { MOCK_API_DELAY_MS, USE_MOCK } from './config';
import { ENDPOINTS } from './endpoints';

export interface QuoteService {
  send(request: QuoteRequest): Promise<void>;
}

const mockQuoteService: QuoteService = {
  async send() {
    await delay(MOCK_API_DELAY_MS * 2);
  },
};

const apiQuoteService: QuoteService = {
  send: (req) => send({ method: 'POST', url: ENDPOINTS.QUOTE_REQUESTS, data: req }),
};

export const quoteService: QuoteService = USE_MOCK ? mockQuoteService : apiQuoteService;
