/**
 * src/services/aiService.ts
 * "Cong" duy nhat de tao thiet ke bang AI. Man hinh CHI goi generateDesign(),
 * khong can biet ben trong la mock hay backend.
 *
 * API bat dong bo: POST /api/designs tra 202 {status:'processing'} →
 * polling GET /api/designs/:id den khi done/failed. Man hinh khong doi
 * toc do AI ben trong service — GeneratingOverlay van hien tuong tu mock.
 */
import { PRODUCTS_BY_STYLE } from '@/data/mock/productsByStyle';
import { createId, delay } from '@/utils/format';

import { request } from './apiClient';
import { AI_TIMEOUT_MS, API_TIMEOUT_MS, MOCK_AI_DELAY_MS, MOCK_AI_FAIL_RATE, USE_MOCK } from './config';
import { ENDPOINTS } from './endpoints';
import type { Design, GenerateDesignInput } from '@/types';
import { isDesign } from './validators';

export interface AiService {
  generateDesign(input: GenerateDesignInput): Promise<Design>;
}

/* ------------------------------ MOCK ------------------------------ */
const mockAiService: AiService = {
  async generateDesign(input) {
    await delay(MOCK_AI_DELAY_MS);
    if (Math.random() < MOCK_AI_FAIL_RATE) {
      throw new Error('AI đang quá tải, vui lòng thử lại.');
    }
    const id = createId('dsg');
    return {
      id,
      createdAt: new Date().toISOString(),
      originalImageUri: input.imageUri,
      // Anh minh hoa: moi lan tao ra 1 anh khac nhau
      resultImageUrl: `https://picsum.photos/seed/${input.style}-${input.roomType}-${id}/800/600`,
      roomType: input.roomType,
      style: input.style,
      colorTheme: input.colorTheme,
      prompt: input.prompt,
      status: 'done',
      products: PRODUCTS_BY_STYLE[input.style],
      isFavorite: false,
    };
  },
};

/* ---------------------- API (endpoint DE XUAT) ---------------------- */
/** Doan loai file tu duoi file (anh tu thu vien co the la png/heic, khong chi jpg) */
const guessImageFile = (uri: string): { name: string; type: string } => {
  const ext = uri.split('?')[0]?.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'png') return { name: 'room.png', type: 'image/png' };
  if (ext === 'heic' || ext === 'heif') return { name: 'room.heic', type: 'image/heic' };
  if (ext === 'webp') return { name: 'room.webp', type: 'image/webp' };
  return { name: 'room.jpg', type: 'image/jpeg' };
};

/**
 * DE XUAT: POST /api/designs (multipart/form-data)
 *   image (file), roomType, style, colorTheme?, prompt?
 * Tra ve 1 Design (status co the la 'processing' neu backend xu ly lau).
 */
const apiAiService: AiService = {
  async generateDesign(input) {
    const form = new FormData();
    // React Native cho phep append file bang { uri, name, type }
    form.append('image', { uri: input.imageUri, ...guessImageFile(input.imageUri) } as unknown as Blob);
    form.append('roomType', input.roomType);
    form.append('style', input.style);
    if (input.colorTheme) form.append('colorTheme', input.colorTheme);
    if (input.prompt) form.append('prompt', input.prompt);

    // Khong tu dat header Content-Type: de thu vien tu them "boundary" cho multipart
    const submitted = await request(
      { method: 'POST', url: ENDPOINTS.DESIGNS, data: form, timeout: AI_TIMEOUT_MS },
      isDesign,
    );

    // Backend xu ly BAT DONG BO: status='processing' → polling GET /api/designs/:id
    if (submitted.status !== 'processing') return submitted;
    return pollUntilFinished(submitted.id);
  },
};

/** Poll dinh ky den khi design chuyen sang done/failed, hoac het thoi gian cho */
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_TOTAL_MS = AI_TIMEOUT_MS + 4 * 60_000; // cho phep AI cham hon request upload

const pollUntilFinished = async (designId: string): Promise<Design> => {
  const deadline = Date.now() + POLL_MAX_TOTAL_MS;
  for (;;) {
    await delay(POLL_INTERVAL_MS);
    if (Date.now() > deadline) {
      throw new Error('Thời gian tạo quá lâu, vui lòng xem lại trong Lịch sử hoặc thử lại.');
    }
    // request() ném ApiError khi 401/404/500... — màn hình sẽ hiện lỗi tiếng Việt
    const design = await request(
      { method: 'GET', url: ENDPOINTS.design(designId), timeout: API_TIMEOUT_MS },
      isDesign,
    );
    if (design.status === 'processing') continue;
    if (design.status === 'failed') {
      throw new Error(design.errorMessage ?? 'Không tạo được ảnh thiết kế, vui lòng thử lại.');
    }
    return design;
  }
};

export const aiService: AiService = USE_MOCK ? mockAiService : apiAiService;
