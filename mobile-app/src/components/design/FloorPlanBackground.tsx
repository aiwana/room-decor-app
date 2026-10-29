/**
 * src/components/design/FloorPlanBackground.tsx
 * Nen MAT BANG 2D (nhin tu tren xuong): san theo hinh dang phong, luoi 1m, tuong + chieu dai,
 * cua ra vao (cam) / cua so (xanh).
 * Ve bang react-native-svg, phu kin khung cha. Noi that van la PlacedItem dat len tren
 * (cung cu chi keo / xoay / phong to nhu khi dat tren anh phong).
 *
 * Dua tren FloorPlanCanvas cua nhanh test-tinh-nang.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { ClipPath, Defs, G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { COLORS } from '@/constants/colors';
import type { FloorPlan } from '@/types';
import { floorPlanPolygon, pointInPolygon, wallAt } from '@/utils/room-geometry';

interface FloorPlanBackgroundProps {
  floorPlan: FloorPlan;
  /** Kich thuoc khung (px); ti le phai bang roomWidth / roomDepth */
  width: number;
  height: number;
  floorColor?: string;
  wallColor?: string;
  /** Le (px) quanh phong de ghi so do o phia ngoai tuong; Svg to hon khung phong 2 * padding */
  padding?: number;
}

const LABEL_OFFSET = 12; // so do cach tuong (px), ve phia ngoai phong
const LABEL_FONT = 10;

export const DOOR_COLOR = COLORS.accent;
export const WINDOW_COLOR = '#7EC8E3';

const FloorPlanBackground: React.FC<FloorPlanBackgroundProps> = ({
  floorPlan,
  width,
  height,
  floorColor,
  wallColor,
  padding = 0,
}) => {
  const sx = width / floorPlan.roomWidth; // px moi met theo chieu ngang
  const sy = height / floorPlan.roomDepth;
  const cols = Math.floor(floorPlan.roomWidth);
  const rows = Math.floor(floorPlan.roomDepth);
  // San chi to ben trong tuong (phong chu L, phong meo...), khong to ca hinh chu nhat bao ngoai
  const polygon = floorPlanPolygon(floorPlan);
  const polygonPx = polygon.map((p) => `${p.x * sx},${p.y * sy}`).join(' ');

  return (
    <Svg width={width + 2 * padding} height={height + 2 * padding} style={StyleSheet.absoluteFill} pointerEvents="none">
      <G x={padding} y={padding}>
      <Defs>
        <ClipPath id="floor">
          <Polygon points={polygonPx} />
        </ClipPath>
      </Defs>
      <Polygon points={polygonPx} fill={floorColor ?? '#2B2A28'} />

      {/* Luoi 1 met (chi trong phong) */}
      <G clipPath="url(#floor)">
        {Array.from({ length: cols + 1 }, (_, i) => (
          <Line key={`v${i}`} x1={i * sx} y1={0} x2={i * sx} y2={height} stroke="rgba(128,128,128,0.35)" strokeWidth={1} />
        ))}
        {Array.from({ length: rows + 1 }, (_, i) => (
          <Line key={`h${i}`} x1={0} y1={i * sy} x2={width} y2={i * sy} stroke="rgba(128,128,128,0.35)" strokeWidth={1} />
        ))}
      </G>

      {/* Tuong */}
      {polygon.map((_, i) => {
        const [a, b] = wallAt(polygon, i);
        return (
          <Line
            key={`w${i}`}
            x1={a.x * sx}
            y1={a.y * sy}
            x2={b.x * sx}
            y2={b.y * sy}
            stroke={wallColor ?? COLORS.textSecondary}
            strokeWidth={5}
            strokeLinecap="round"
          />
        );
      })}

      {/* Cua ra vao (cam) / cua so (xanh) ve de len tuong */}
      {(floorPlan.openings ?? []).map((o, i) => (
        <Line
          key={`o${i}`}
          x1={o.x1 * sx}
          y1={o.y1 * sy}
          x2={o.x2 * sx}
          y2={o.y2 * sy}
          stroke={o.type === 'door' ? DOOR_COLOR : WINDOW_COLOR}
          strokeWidth={7}
        />
      ))}

      {/* Chieu dai tung buc tuong: ghi phia NGOAI tuong, co nen toi -> khong de len noi that */}
      {polygon.map((_, i) => {
        const [a, b] = wallAt(polygon, i);
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const dx = (b.x - a.x) * sx;
        const dy = (b.y - a.y) * sy;
        const px = Math.hypot(dx, dy);
        if (px < 36) return null; // tuong qua ngan: bo qua de chu khong chong nhau
        const mx = ((a.x + b.x) / 2) * sx;
        const my = ((a.y + b.y) / 2) * sy;
        // Phap tuyen cua tuong; quay ra ngoai neu diem thu dang nam trong phong
        let nx = dy / px;
        let ny = -dx / px;
        const probe = { x: (mx + nx * 3) / sx, y: (my + ny * 3) / sy };
        if (pointInPolygon(probe, polygon)) {
          nx = -nx;
          ny = -ny;
        }
        const label = `${len.toFixed(2)} m`;
        const w = label.length * LABEL_FONT * 0.6 + 8;
        const cx = mx + nx * LABEL_OFFSET;
        const cy = my + ny * LABEL_OFFSET;
        return (
          <G key={`l${i}`}>
            <Rect x={cx - w / 2} y={cy - 8} width={w} height={16} rx={8} fill="rgba(0,0,0,0.65)" />
            <SvgText x={cx} y={cy + 3.5} fontSize={LABEL_FONT} fontWeight="600" fill={COLORS.textPrimary} textAnchor="middle">
              {label}
            </SvgText>
          </G>
        );
      })}
      </G>
    </Svg>
  );
};

export default FloorPlanBackground;
