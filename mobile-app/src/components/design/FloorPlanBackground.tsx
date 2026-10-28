/**
 * src/components/design/FloorPlanBackground.tsx
 * Nen MAT BANG 2D (nhin tu tren xuong): luoi 1m + tuong do AI quet ra.
 * Ve bang react-native-svg, phu kin khung cha. Noi that van la PlacedItem dat len tren
 * (cung cu chi keo / xoay / phong to nhu khi dat tren anh phong).
 *
 * Dua tren FloorPlanCanvas cua nhanh test-tinh-nang.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { COLORS } from '@/constants/colors';
import type { FloorPlan } from '@/types';

interface FloorPlanBackgroundProps {
  floorPlan: FloorPlan;
  /** Kich thuoc khung (px); ti le phai bang roomWidth / roomDepth */
  width: number;
  height: number;
  floorColor?: string;
  wallColor?: string;
}

const FloorPlanBackground: React.FC<FloorPlanBackgroundProps> = ({
  floorPlan,
  width,
  height,
  floorColor,
  wallColor,
}) => {
  const sx = width / floorPlan.roomWidth; // px moi met theo chieu ngang
  const sy = height / floorPlan.roomDepth;
  const cols = Math.floor(floorPlan.roomWidth);
  const rows = Math.floor(floorPlan.roomDepth);

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height} fill={floorColor ?? '#2B2A28'} />

      {/* Luoi 1 met */}
      {Array.from({ length: cols + 1 }, (_, i) => (
        <Line key={`v${i}`} x1={i * sx} y1={0} x2={i * sx} y2={height} stroke="rgba(128,128,128,0.35)" strokeWidth={1} />
      ))}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <Line key={`h${i}`} x1={0} y1={i * sy} x2={width} y2={i * sy} stroke="rgba(128,128,128,0.35)" strokeWidth={1} />
      ))}

      {/* Tuong */}
      {floorPlan.walls.map((w, i) => (
        <Line
          key={`w${i}`}
          x1={w.x1 * sx}
          y1={w.y1 * sy}
          x2={w.x2 * sx}
          y2={w.y2 * sy}
          stroke={wallColor ?? COLORS.textSecondary}
          strokeWidth={5}
          strokeLinecap="round"
        />
      ))}

      {/* Kich thuoc phong */}
      <SvgText x={width / 2} y={16} fontSize={11} fill={COLORS.textSecondary} textAnchor="middle">
        {`${floorPlan.roomWidth.toFixed(1)} m`}
      </SvgText>
      <SvgText x={10} y={height / 2} fontSize={11} fill={COLORS.textSecondary} textAnchor="start">
        {`${floorPlan.roomDepth.toFixed(1)} m`}
      </SvgText>
    </Svg>
  );
};

export default FloorPlanBackground;
