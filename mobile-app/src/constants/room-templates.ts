/**
 * src/constants/room-templates.ts
 * PHONG TRONG va PHONG MAU: tao mat bang khong can chup anh (POST /api/floor-plans/blank).
 * Toa do tinh bang MET, nhin tu tren xuong: x = chieu dai (trai -> phai), y = chieu rong (tren -> duoi).
 * Tuong di theo chieu kim dong ho tu goc tren ben trai, giong mat bang AI quet ra.
 */
import type { IoniconName, Opening, Wall } from '@/types';


/** Hinh dang phong gui len backend */
export interface RoomShape {
  roomWidth: number;
  roomDepth: number;
  ceilingHeight: number;
  walls: Wall[];
  openings: Opening[];
}

export interface RoomTemplate {
  id: string;
  name: string;
  icon: IoniconName;
  /** 1 dong mo ta ngan tren the */
  summary: string;
  shape: RoomShape;
}

export const DEFAULT_CEILING = 2.7;
/** Cua ra vao mac dinh rong 0.9 m, cach goc 0.4 m */
export const DOOR_WIDTH = 0.9;
const DOOR_OFFSET = 0.4;

/** Phong nho nhat / lon nhat (khop CreateBlankRoomRequest o backend) */
export const ROOM_SIDE_MIN = 1.5;
export const ROOM_SIDE_MAX = 30;
export const CEILING_MIN = 1.8;
export const CEILING_MAX = 6;

const r2 = (v: number): number => Math.round(v * 100) / 100;

const polygonWalls = (pts: [number, number][]): Wall[] =>
  pts.map(([x1, y1], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length];
    return { x1: r2(x1), y1: r2(y1), x2: r2(x2), y2: r2(y2) };
  });

/** Cua ra vao tren tuong duoi cung (y = depth), tinh tu ben trai */
const doorBottom = (depth: number): Opening => ({
  type: 'door',
  x1: DOOR_OFFSET,
  y1: r2(depth),
  x2: r2(DOOR_OFFSET + DOOR_WIDTH),
  y2: r2(depth),
});

/** Cua so tren tuong tren cung (y = 0), tu x1 den x2 */
const windowTop = (x1: number, x2: number): Opening => ({ type: 'window', x1: r2(x1), y1: 0, x2: r2(x2), y2: 0 });

/** Phong chu nhat dai x rong, 1 cua ra vao o tuong duoi */
export const rectangleRoom = (width: number, depth: number, ceilingHeight = DEFAULT_CEILING, windows: Opening[] = []): RoomShape => ({
  roomWidth: r2(width),
  roomDepth: r2(depth),
  ceilingHeight: r2(ceilingHeight),
  walls: polygonWalls([
    [0, 0],
    [width, 0],
    [width, depth],
    [0, depth],
  ]),
  openings: [doorBottom(depth), ...windows],
});

/* ------------------------ Hinh dang phong trong ------------------------ */
/**
 * Hinh dang phong trong: da giac theo ti le 0..1 (nhan voi chieu dai x rong nguoi dung chon).
 * Thu tu dinh theo chieu kim dong ho tu goc tren ben trai. Cua ra vao tu dat o tuong duoi cung dai nhat.
 */
export interface RoomShapeDef {
  id: string;
  name: string;
  points: [number, number][];
  defaultWidth: number;
  defaultDepth: number;
}

export const ROOM_SHAPES: RoomShapeDef[] = [
  { id: 'rect', name: 'Chữ nhật', points: [[0, 0], [1, 0], [1, 1], [0, 1]], defaultWidth: 4, defaultDepth: 3.5 },
  { id: 'square', name: 'Vuông', points: [[0, 0], [1, 0], [1, 1], [0, 1]], defaultWidth: 4, defaultDepth: 4 },
  { id: 'narrow', name: 'Hẹp dài', points: [[0, 0], [1, 0], [1, 1], [0, 1]], defaultWidth: 6, defaultDepth: 2.4 },
  {
    id: 'l-right',
    name: 'Chữ L',
    points: [[0, 0], [0.65, 0], [0.65, 0.35], [1, 0.35], [1, 1], [0, 1]],
    defaultWidth: 5,
    defaultDepth: 4,
  },
  {
    id: 'l-left',
    name: 'Chữ L ngược',
    points: [[0.35, 0], [1, 0], [1, 1], [0, 1], [0, 0.35], [0.35, 0.35]],
    defaultWidth: 5,
    defaultDepth: 4,
  },
  {
    id: 'u',
    name: 'Chữ U',
    points: [[0, 0], [0.3, 0], [0.3, 0.4], [0.7, 0.4], [0.7, 0], [1, 0], [1, 1], [0, 1]],
    defaultWidth: 5,
    defaultDepth: 4,
  },
  {
    id: 't',
    name: 'Chữ T',
    points: [[0, 0], [1, 0], [1, 0.45], [0.7, 0.45], [0.7, 1], [0.3, 1], [0.3, 0.45], [0, 0.45]],
    defaultWidth: 6,
    defaultDepth: 5,
  },
  {
    id: 'chamfer',
    name: 'Vát góc',
    points: [[0, 0], [0.7, 0], [1, 0.3], [1, 1], [0, 1]],
    defaultWidth: 4.5,
    defaultDepth: 4,
  },
  {
    id: 'alcove',
    name: 'Có hốc tường',
    points: [[0, 0], [0.8, 0], [0.8, 0.3], [1, 0.3], [1, 0.7], [0.8, 0.7], [0.8, 1], [0, 1]],
    defaultWidth: 5,
    defaultDepth: 4,
  },
];

/** Cua ra vao tren tuong nam ngang thap nhat (y lon nhat) va dai nhat, cach dau tuong 0.4 m */
const autoDoor = (pts: [number, number][]): Opening | null => {
  let best: { x1: number; x2: number; y: number } | null = null;
  pts.forEach(([x1, y1], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length];
    if (Math.abs(y1 - y2) > 1e-6) return;
    const seg = { x1: Math.min(x1, x2), x2: Math.max(x1, x2), y: y1 };
    if (!best || seg.y > best.y + 1e-6 || (Math.abs(seg.y - best.y) < 1e-6 && seg.x2 - seg.x1 > best.x2 - best.x1)) {
      best = seg;
    }
  });
  const b = best as { x1: number; x2: number; y: number } | null;
  if (!b || b.x2 - b.x1 < DOOR_WIDTH + 0.2) return null;
  const start = b.x2 - b.x1 >= DOOR_WIDTH + 2 * DOOR_OFFSET ? b.x1 + DOOR_OFFSET : (b.x1 + b.x2 - DOOR_WIDTH) / 2;
  return { type: 'door', x1: r2(start), y1: r2(b.y), x2: r2(start + DOOR_WIDTH), y2: r2(b.y) };
};

/** Phong trong theo hinh dang + kich thuoc (met), tu co 1 cua ra vao */
export const shapeRoom = (def: RoomShapeDef, width: number, depth: number, ceilingHeight = DEFAULT_CEILING): RoomShape => {
  const pts = def.points.map(([x, y]) => [r2(x * width), r2(y * depth)] as [number, number]);
  const door = autoDoor(pts);
  return {
    roomWidth: r2(width),
    roomDepth: r2(depth),
    ceilingHeight: r2(ceilingHeight),
    walls: polygonWalls(pts),
    openings: door ? [door] : [],
  };
};

/* ------------------------------ Phong mau ------------------------------ */
/** Phong mau pho bien (deu hinh chu nhat): nguoi dung chon roi sua tiep bang "Sửa phòng" */
export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: 'bedroom',
    name: 'Phòng ngủ',
    icon: 'bed-outline',
    summary: '3 × 4 m · 1 cửa đi, 1 cửa sổ',
    shape: rectangleRoom(3, 4, 2.7, [windowTop(0.9, 2.1)]),
  },
  {
    id: 'living',
    name: 'Phòng khách',
    icon: 'tv-outline',
    summary: '5 × 4 m · 1 cửa đi, 1 cửa sổ lớn',
    shape: rectangleRoom(5, 4, 2.8, [windowTop(1.5, 3.5)]),
  },
  {
    id: 'kitchen',
    name: 'Bếp',
    icon: 'restaurant-outline',
    summary: '2,5 × 3,5 m · 1 cửa đi, 1 cửa sổ',
    shape: rectangleRoom(2.5, 3.5, 2.7, [windowTop(0.7, 1.8)]),
  },
  {
    id: 'office',
    name: 'Phòng làm việc',
    icon: 'laptop-outline',
    summary: '3 × 3 m · 1 cửa đi, 1 cửa sổ',
    shape: rectangleRoom(3, 3, 2.7, [windowTop(0.8, 2.2)]),
  },
  {
    id: 'studio',
    name: 'Căn studio',
    icon: 'home-outline',
    summary: '6 × 4 m · 1 cửa đi, 2 cửa sổ',
    shape: rectangleRoom(6, 4, 2.8, [windowTop(0.8, 2.2), windowTop(3.6, 5.2)]),
  },
];
