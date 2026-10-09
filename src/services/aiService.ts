/**
 * src/services/aiService.ts
 * "Cong" duy nhat de goi AI. Man hinh CHI goi generateDesign(),
 * khong can biet ben trong la mock hay AI that.
 *
 * Khi co backend: dat USE_MOCK = false, chi sua generateWithApi() ben duoi.
 * UI (AIDecorScreen, ResultScreen) khong phai sua.
 */
import { PRODUCTS_BY_STYLE } from '@/data/mock/productsByStyle';
import type { Design, GenerateDesignInput } from '@/types';
import { createId, delay } from '@/utils/format';

import { apiClient } from './apiClient';
import { MOCK_AI_DELAY_MS, MOCK_AI_FAIL_RATE, USE_MOCK } from './config';

/* ------------------------------ MOCK ------------------------------ */
const generateWithMock = async (input: GenerateDesignInput): Promise<Design> => {
  await delay(MOCK_AI_DELAY_MS);

  if (Math.random() < MOCK_AI_FAIL_RATE) {
    throw new Error('AI đang quá tải, vui lòng thử lại.');
  }

  const id = createId('dsg');
  return {
    id,
    createdAt: new Date().toISOString(),
    originalImageUri: input.imageUri,
    // Anh mock: moi lan tao ra 1 anh khac nhau theo phong cach
    resultImageUrl: `https://picsum.photos/seed/${input.style}-${input.roomType}-${id}/800/600`,
    roomType: input.roomType,
    style: input.style,
    colorTheme: input.colorTheme,
    prompt: input.prompt,
    status: 'done',
    products: PRODUCTS_BY_STYLE[input.style],
    isFavorite: false,
  };
};

/* ---------------------------- API THAT ---------------------------- */
/**
 * Du kien backend: POST /api/designs (multipart/form-data)
 *   - image: file anh phong
 *   - roomType, style, colorTheme, prompt
 * Tra ve 1 Design (status co the la 'processing' neu AI xu ly lau).
 */
const generateWithApi = async (input: GenerateDesignInput): Promise<Design> => {
  const form = new FormData();
  // React Native cho phep append file bang { uri, name, type }
  form.append('image', {
    uri: input.imageUri,
    name: 'room.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  form.append('roomType', input.roomType);
  form.append('style', input.style);
  if (input.colorTheme) {
    form.append('colorTheme', input.colorTheme);
  }
  if (input.prompt) {
    form.append('prompt', input.prompt);
  }

  const res = await apiClient.post<Design>('/api/designs', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

/* ----------------------------- PUBLIC ----------------------------- */
export const aiService = {
  generateDesign: (input: GenerateDesignInput): Promise<Design> =>
    USE_MOCK ? generateWithMock(input) : generateWithApi(input),
};
