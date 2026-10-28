import type { FloorPlan, Furniture, FurniturePlacement, Material } from '@/types';

import { formatArea, formatPrice } from './index';

export interface QuoteLine {
  key: string;
  label: string;
  detail: string;
  amount: number;
}

export interface QuoteSummary {
  furnitureLines: QuoteLine[];
  materialLines: QuoteLine[];
  total: number;
  unpricedFurniture: number;
  vendors: string[];
  floorArea: number | null;
  wallArea: number | null;
  skirtingLength: number | null;
}

interface QuoteInput {
  floorPlan: FloorPlan | null;
  placements: FurniturePlacement[];
  furnitureById: Map<string, Furniture>;
  materials: Material[];
  floorMaterial: string;
  wallMaterial: string;
  skirtingMaterial: string;
}

export const buildQuote = ({
  floorPlan,
  placements,
  furnitureById,
  materials,
  floorMaterial,
  wallMaterial,
  skirtingMaterial,
}: QuoteInput): QuoteSummary => {
  const counts = new Map<string, number>();
  placements.forEach((p) => counts.set(p.furnitureId, (counts.get(p.furnitureId) ?? 0) + 1));

  const furnitureLines: QuoteLine[] = [];
  const vendors = new Set<string>();
  let unpricedFurniture = 0;

  counts.forEach((qty, furnitureId) => {
    const item = furnitureById.get(furnitureId);
    if (!item) return;
    if (item.vendorName) vendors.add(item.vendorName);
    if (item.price == null) {
      unpricedFurniture += qty;
      return;
    }
    furnitureLines.push({
      key: `furniture-${furnitureId}`,
      label: item.name,
      detail: `${qty} × ${formatPrice(item.price, item.currency ?? 'VND')}`,
      amount: item.price * qty,
    });
  });

  const materialLines: QuoteLine[] = [];
  let floorArea: number | null = null;
  let wallArea: number | null = null;
  let skirtingLength: number | null = null;

  if (floorPlan) {
    const { roomWidth, roomDepth, ceilingHeight } = floorPlan;
    floorArea = roomWidth * roomDepth;
    wallArea = 2 * (roomWidth + roomDepth) * ceilingHeight;
    skirtingLength = 2 * (roomWidth + roomDepth);

    const floor = materials.find((m) => m.code === floorMaterial);
    const wall = materials.find((m) => m.code === wallMaterial);
    const skirting = materials.find((m) => m.code === skirtingMaterial);

    if (floor?.price != null) {
      if (floor.vendorName) vendors.add(floor.vendorName);
      materialLines.push({
        key: 'material-floor',
        label: `Sàn · ${floor.name}`,
        detail: `${formatArea(floorArea)} × ${formatPrice(floor.price)}/m²`,
        amount: floorArea * floor.price,
      });
    }
    if (wall?.price != null) {
      if (wall.vendorName) vendors.add(wall.vendorName);
      materialLines.push({
        key: 'material-wall',
        label: `Tường · ${wall.name}`,
        detail: `${formatArea(wallArea)} × ${formatPrice(wall.price)}/m²`,
        amount: wallArea * wall.price,
      });
    }
    if (skirting?.price != null) {
      if (skirting.vendorName) vendors.add(skirting.vendorName);
      materialLines.push({
        key: 'material-skirting',
        label: `Len chân tường · ${skirting.name}`,
        detail: `${skirtingLength.toFixed(1)} m × ${formatPrice(skirting.price)}/m`,
        amount: skirtingLength * skirting.price,
      });
    }
  }

  const total = [...furnitureLines, ...materialLines].reduce((sum, line) => sum + line.amount, 0);

  return {
    furnitureLines,
    materialLines,
    total,
    unpricedFurniture,
    vendors: [...vendors],
    floorArea,
    wallArea,
    skirtingLength,
  };
};
