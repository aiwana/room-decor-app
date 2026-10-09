/**
 * src/data/mock/inspirations.ts
 * Anh cam hung tren Home (thay cho "Du an tieu bieu" cua app vat lieu cu).
 */
import type { Inspiration } from '@/types';

const ph = (seed: string): string => `https://picsum.photos/seed/${seed}/600/400`;

export const INSPIRATIONS: Inspiration[] = [
  { id: 'ins-01', title: 'Phòng khách Japandi ấm áp', styleId: 'japandi', roomTypeId: 'living', imageUrl: ph('insp-japandi-living') },
  { id: 'ins-02', title: 'Phòng ngủ tối giản', styleId: 'minimalist', roomTypeId: 'bedroom', imageUrl: ph('insp-minimal-bedroom') },
  { id: 'ins-03', title: 'Bếp Industrial cá tính', styleId: 'industrial', roomTypeId: 'kitchen', imageUrl: ph('insp-industrial-kitchen') },
  { id: 'ins-04', title: 'Góc làm việc Scandinavian', styleId: 'scandinavian', roomTypeId: 'office', imageUrl: ph('insp-scandi-office') },
  { id: 'ins-05', title: 'Phòng tắm Luxury', styleId: 'luxury', roomTypeId: 'bathroom', imageUrl: ph('insp-luxury-bath') },
];
