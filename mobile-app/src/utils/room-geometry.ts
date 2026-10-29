/**
 * src/utils/room-geometry.ts
 * Hinh hoc mat bang (don vi met, goc tren trai = 0,0; x sang phai, y xuong duoi):
 *   - doi danh sach tuong <-> da giac cac goc phong
 *   - dien tich, chu vi, kiem tra 1 diem co nam trong phong
 *   - day 1 diem (noi that) vao trong phong
 *   - chuan hoa sau khi sua: dua goc tren trai ve 0,0 (giong FloorPlanGeometry o backend)
 */
import type { Opening, Wall } from '@/types';

export interface Point {
  x: number;
  y: number;
}

/** Cua tren 1 tuong cua da giac: tuong thu `wall` (tu goc wall -> wall+1), tam o vi tri t (0..1) */
export interface WallOpening {
  type: Opening['type'];
  wall: number;
  t: number;
  /** Be rong cua (met) */
  width: number;
}

const EPS = 0.05; // 5cm: 2 dau tuong cach nhau it hon thi coi la 1 goc

export const round2 = (v: number): number => Math.round(v * 100) / 100;

const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const same = (a: Point, b: Point): boolean => dist(a, b) < EPS;

/** Tuong thu i cua da giac: tu points[i] den points[i+1] (vong lai goc dau) */
export const wallAt = (points: Point[], i: number): [Point, Point] => [points[i], points[(i + 1) % points.length]];

export const wallLength = (points: Point[], i: number): number => {
  const [a, b] = wallAt(points, i);
  return dist(a, b);
};

/**
 * Noi cac tuong thanh 1 vong kin -> danh sach goc theo thu tu.
 * AI tra ve tuong da noi san (goc cuoi tuong nay = goc dau tuong sau); neu khong noi duoc thi tra null.
 */
export const wallsToPolygon = (walls: Wall[]): Point[] | null => {
  if (walls.length < 3) return null;
  const left = walls.map((w) => ({ a: { x: w.x1, y: w.y1 }, b: { x: w.x2, y: w.y2 } }));
  const first = left.shift();
  if (!first) return null;
  const points: Point[] = [first.a];
  let cur = first.b;
  while (left.length > 0) {
    const idx = left.findIndex((s) => same(s.a, cur) || same(s.b, cur));
    if (idx < 0) return null;
    const [seg] = left.splice(idx, 1);
    points.push(cur);
    cur = same(seg.a, cur) ? seg.b : seg.a;
  }
  if (!same(cur, points[0])) return null;
  return points.length >= 3 ? points : null;
};

export const rectanglePolygon = (width: number, depth: number): Point[] => [
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: width, y: depth },
  { x: 0, y: depth },
];

/** Da giac cua mat bang; tuong khong noi thanh vong thi dung hinh chu nhat rong x sau */
export const floorPlanPolygon = (plan: { walls: Wall[]; roomWidth: number; roomDepth: number }): Point[] =>
  wallsToPolygon(plan.walls) ?? rectanglePolygon(plan.roomWidth, plan.roomDepth);

export const polygonToWalls = (points: Point[]): Wall[] =>
  points.map((_, i) => {
    const [a, b] = wallAt(points, i);
    return { x1: round2(a.x), y1: round2(a.y), x2: round2(b.x), y2: round2(b.y) };
  });

/** Dien tich (m2), cong thuc shoelace */
export const polygonArea = (points: Point[]): number => {
  let sum = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    sum += p.x * q.y - q.x * p.y;
  });
  return Math.abs(sum) / 2;
};

export const polygonPerimeter = (points: Point[]): number =>
  points.reduce((s, _, i) => s + wallLength(points, i), 0);

export const pointInPolygon = (p: Point, points: Point[]): boolean => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};

/** Diem gan p nhat tren doan ab, kem vi tri t (0..1) */
export const projectOnSegment = (p: Point, a: Point, b: Point): { point: Point; t: number } => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return { point: { x: a.x + t * dx, y: a.y + t * dy }, t };
};

/** Tuong gan diem p nhat */
export const nearestWall = (p: Point, points: Point[]): { wall: number; t: number; distance: number } => {
  let best = { wall: 0, t: 0, distance: Number.POSITIVE_INFINITY };
  points.forEach((_, i) => {
    const [a, b] = wallAt(points, i);
    const { point, t } = projectOnSegment(p, a, b);
    const d = dist(p, point);
    if (d < best.distance) best = { wall: i, t, distance: d };
  });
  return best;
};

const centroid = (points: Point[]): Point => ({
  x: points.reduce((s, p) => s + p.x, 0) / points.length,
  y: points.reduce((s, p) => s + p.y, 0) / points.length,
});

/**
 * Dua diem p vao trong phong (cach tuong `margin` met) neu dang nam ngoai.
 * Dung cho noi that sau khi nguoi dung sua lai hinh dang phong.
 */
export const pushInside = (p: Point, points: Point[], margin = 0.2): Point => {
  if (pointInPolygon(p, points)) return p;
  const { wall, t } = nearestWall(p, points);
  const [a, b] = wallAt(points, wall);
  const onWall = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  const c = centroid(points);
  // Lui dan tu tuong vao trong cho toi khi nam trong phong
  for (const step of [margin, margin * 2, margin * 4]) {
    const len = dist(onWall, c) || 1;
    const q = { x: onWall.x + ((c.x - onWall.x) / len) * step, y: onWall.y + ((c.y - onWall.y) / len) * step };
    if (pointInPolygon(q, points)) return q;
  }
  return c;
};

/** Hop bao (bounding box) */
export const polygonBounds = (points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } => ({
  minX: Math.min(...points.map((p) => p.x)),
  minY: Math.min(...points.map((p) => p.y)),
  maxX: Math.max(...points.map((p) => p.x)),
  maxY: Math.max(...points.map((p) => p.y)),
});

/* ---------------------------- Cua ra vao / cua so ---------------------------- */

/** Cua (toa do 2 dau) -> vi tri tren tuong gan nhat cua da giac */
export const openingsToWallOpenings = (openings: Opening[], points: Point[]): WallOpening[] =>
  openings.map((o) => {
    const center = { x: (o.x1 + o.x2) / 2, y: (o.y1 + o.y2) / 2 };
    const { wall, t } = nearestWall(center, points);
    return { type: o.type, wall, t, width: Math.max(0.2, Math.hypot(o.x2 - o.x1, o.y2 - o.y1)) };
  });

/** Tam cua (toa do met) */
export const wallOpeningCenter = (o: WallOpening, points: Point[]): Point => {
  const [a, b] = wallAt(points, o.wall);
  return { x: a.x + o.t * (b.x - a.x), y: a.y + o.t * (b.y - a.y) };
};

/** Vi tri tren tuong -> toa do 2 dau cua; cua dai hon tuong thi bi cat cho vua */
export const wallOpeningToOpening = (o: WallOpening, points: Point[]): Opening => {
  const [a, b] = wallAt(points, o.wall);
  const len = dist(a, b) || 1;
  const half = Math.min(o.width, len) / 2 / len; // nua be rong, tinh theo ti le tuong
  const t = Math.min(1 - half, Math.max(half, o.t));
  const at = (k: number): Point => ({ x: a.x + k * (b.x - a.x), y: a.y + k * (b.y - a.y) });
  const p1 = at(t - half);
  const p2 = at(t + half);
  return { type: o.type, x1: round2(p1.x), y1: round2(p1.y), x2: round2(p2.x), y2: round2(p2.y) };
};

/** Sau khi them / xoa goc: gan lai tung cua vao tuong gan nhat cua da giac moi */
export const reattachOpenings = (openings: WallOpening[], before: Point[], after: Point[]): WallOpening[] =>
  openings.map((o) => {
    const { wall, t } = nearestWall(wallOpeningCenter(o, before), after);
    return { ...o, wall, t };
  });

/* ---------------------------- Sua da giac ---------------------------- */

/**
 * Dat chieu dai tuong i = length: doi goc cuoi cua tuong theo huong tuong.
 * Neu tuong ke tiep vuong goc thi doi ca goc sau do, de cac goc vuong van vuong
 * (giong nhu day ca buc tuong ke tiep ra / vao).
 */
export const setWallLength = (points: Point[], i: number, length: number): Point[] => {
  const n = points.length;
  const [a, b] = wallAt(points, i);
  const cur = dist(a, b);
  if (cur < 1e-6) return points;
  const ux = (b.x - a.x) / cur;
  const uy = (b.y - a.y) / cur;
  const dx = ux * (length - cur);
  const dy = uy * (length - cur);
  const next = points.map((p) => ({ ...p }));
  const j = (i + 1) % n;
  next[j] = { x: next[j].x + dx, y: next[j].y + dy };

  const k = (i + 2) % n;
  if (n > 3 && k !== i) {
    const [c, d] = wallAt(points, j);
    const lenNext = dist(c, d);
    const perpendicular = lenNext > 1e-6 && Math.abs((ux * (d.x - c.x) + uy * (d.y - c.y)) / lenNext) < 0.05;
    if (perpendicular) next[k] = { x: next[k].x + dx, y: next[k].y + dy };
  }
  return next;
};

/** Them 1 goc o giua tuong i */
export const splitWall = (points: Point[], i: number): Point[] => {
  const [a, b] = wallAt(points, i);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return [...points.slice(0, i + 1), mid, ...points.slice(i + 1)];
};

/** Xoa goc i (phong phai con it nhat 3 goc) */
export const removeCorner = (points: Point[], i: number): Point[] =>
  points.length > 3 ? points.filter((_, k) => k !== i) : points;

/**
 * Chuan hoa truoc khi luu: dich cho goc tren trai ve 0,0, lam tron cm.
 * Tra ve ca do dich (shift) de dich noi that theo.
 */
export const normalizePolygon = (
  points: Point[],
): { points: Point[]; shift: Point; width: number; depth: number } => {
  const { minX, minY, maxX, maxY } = polygonBounds(points);
  return {
    points: points.map((p) => ({ x: round2(p.x - minX), y: round2(p.y - minY) })),
    shift: { x: minX, y: minY },
    width: round2(maxX - minX),
    depth: round2(maxY - minY),
  };
};

/** Cac tuong co cat nhau (khong ke 2 tuong ke nhau) -> hinh dang khong hop le */
export const isSelfIntersecting = (points: Point[]): boolean => {
  const n = points.length;
  const cross = (o: Point, a: Point, b: Point): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const intersects = (p1: Point, p2: Point, p3: Point, p4: Point): boolean => {
    const d1 = cross(p3, p4, p1);
    const d2 = cross(p3, p4, p2);
    const d3 = cross(p1, p2, p3);
    const d4 = cross(p1, p2, p4);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      const [a, b] = wallAt(points, i);
      const [c, d] = wallAt(points, j);
      if (intersects(a, b, c, d)) return true;
    }
  }
  return false;
};
