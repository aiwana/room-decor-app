/**
 * src/data/mock/designs.ts
 * Vai thiet ke mau de History khong trong o lan mo app dau tien.
 * Chi duoc nap 1 lan (xem designService.ts).
 */
import type { Design } from '@/types';
import { PRODUCTS_BY_STYLE } from './productsByStyle';

const ph = (seed: string): string => `https://picsum.photos/seed/${seed}/800/600`;

export const SAMPLE_DESIGNS: Design[] = [
  {
    id: 'dsg-sample-1',
    createdAt: '2026-10-05T09:30:00.000Z',
    originalImageUri: ph('before-sample-1'),
    resultImageUrl: ph('after-sample-1'),
    roomType: 'living',
    style: 'japandi',
    colorTheme: 'beige',
    status: 'done',
    products: PRODUCTS_BY_STYLE.japandi,
    isFavorite: true,
  },
  {
    id: 'dsg-sample-2',
    createdAt: '2026-10-03T14:10:00.000Z',
    originalImageUri: ph('before-sample-2'),
    resultImageUrl: ph('after-sample-2'),
    roomType: 'bedroom',
    style: 'minimalist',
    colorTheme: 'white',
    status: 'done',
    products: PRODUCTS_BY_STYLE.minimalist,
    isFavorite: false,
  },
];
