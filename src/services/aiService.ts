/**
 * src/services/aiService.ts
 * "Cong" duy nhat de tao thiet ke bang AI. Man hinh CHI goi generateDesign(),
 * khong can biet ben trong la mock hay backend.
 *
 * Giai doan nay KHONG tich hop AI tao anh that:
 *   - Mock: tra anh minh hoa ngau nhien (picsum) sau 2,5 giay.
 *   - API : gui anh len backend (endpoint DE XUAT). Backend tu quyet dinh
 *           dung AI that hay anh minh hoa.
 */
import { PRODUCTS_BY_STYLE } from '@/data/mock/productsByStyle';
import type { Design, GenerateDesignInput } from '@/types';
import { createId, delay } from '@/utils/format';

import { request } from './apiClient';
import { AI_TIMEOUT_MS, MOCK_AI_DELAY_MS, MOCK_AI_FAIL_RATE, USE_MOCK } from './config';
import { ENDPOINTS } from './endpoints';
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
  generateDesign(input) {
    const form = new FormData();
    // React Native cho phep append file bang { uri, name, type }
    form.append('image', { uri: input.imageUri, ...guessImageFile(input.imageUri) } as unknown as Blob);
    form.append('roomType', input.roomType);
    form.append('style', input.style);
    if (input.colorTheme) form.append('colorTheme', input.colorTheme);
    if (input.prompt) form.append('prompt', input.prompt);

    // Khong tu dat header Content-Type: de thu vien tu them "boundary" cho multipart
    return request({ method: 'POST', url: ENDPOINTS.DESIGNS, data: form, timeout: AI_TIMEOUT_MS }, isDesign);
  },
};

export const aiService: AiService = USE_MOCK ? mockAiService : apiAiService;
