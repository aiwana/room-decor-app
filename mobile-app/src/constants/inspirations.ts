/**
 * src/constants/inspirations.ts
 * Anh cam hung tren Home. Day la NOI DUNG CO DINH cua app, khong phai du lieu backend.
 */
import type { Inspiration } from '@/types';

const ph = (seed: string): string => `https://picsum.photos/seed/${seed}/600/400`;

export const INSPIRATIONS: Inspiration[] = [
  { id: 'ins-01', title: 'Phòng khách Japandi ấm áp', subtitle: 'Japandi · Phòng khách', imageUrl: ph('insp-japandi-living') },
  { id: 'ins-02', title: 'Phòng ngủ tối giản', subtitle: 'Minimalist · Phòng ngủ', imageUrl: ph('insp-minimal-bedroom') },
  { id: 'ins-03', title: 'Bếp Industrial cá tính', subtitle: 'Industrial · Phòng bếp', imageUrl: ph('insp-industrial-kitchen') },
  { id: 'ins-04', title: 'Góc làm việc Scandinavian', subtitle: 'Scandinavian · Làm việc', imageUrl: ph('insp-scandi-office') },
];
