/**
 * src/services/room-image-api.ts
 * Upload anh phong: POST /api/room-images/upload (multipart, truong "file").
 * Backend doc kich thuoc anh va tra ve { id, url, width, height, capturedAt }.
 */
import { MOCK_DELAY, UPLOAD_TIMEOUT, USE_MOCK } from '@/constants';
import type { RoomImage } from '@/types';
import { createId, delay } from '@/utils';

import apiClient from './api-client';

const guessMimeType = (uri: string): string => {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
};

export const roomImageApi = {
  async upload(uri: string, size?: { width: number; height: number }): Promise<RoomImage> {
    if (USE_MOCK) {
      await delay(MOCK_DELAY);
      return {
        id: createId('room'),
        url: uri,
        width: size?.width ?? 0,
        height: size?.height ?? 0,
        capturedAt: new Date().toISOString(),
      };
    }

    const type = guessMimeType(uri);
    const form = new FormData();
    // React Native: FormData nhan object { uri, name, type } cho file
    form.append('file', { uri, name: `room.${type.split('/')[1]}`, type } as unknown as Blob);

    const res = await apiClient.post<RoomImage>('/room-images/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    });
    // Chi lay cac truong can dung (tranh giu du lieu thua may chu tra ve)
    const { id, url, width, height, capturedAt } = res.data;
    return { id, url, width, height, capturedAt };
  },
};
