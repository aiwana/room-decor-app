import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Line, Rect, G, Text as SvgText, Circle } from "react-native-svg";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import type { FloorPlan, FurniturePlacement, Furniture } from "@/types";

interface Props {
  floorPlan: FloorPlan;
  placements: FurniturePlacement[];
  furnitureMap: Map<string, Furniture>;
  selectedPlacementId: string | null;
  onSelectPlacement: (id: string | null) => void;
  onMovePlacement: (id: string, x: number, y: number) => void;
}

/**
 * Renders the 2D top-down floor plan.
 * Coordinates: meters (x = width, y = depth). Origin = top-left.
 */
export function FloorPlanCanvas({
  floorPlan,
  placements,
  furnitureMap,
  selectedPlacementId,
  onSelectPlacement,
  onMovePlacement,
}: Props) {
  const ppm = floorPlan.pixelsPerMeter;
  const canvasW = floorPlan.roomWidth * ppm;
  const canvasH = floorPlan.roomDepth * ppm;

  // Fit canvas to screen
  const screenWidth = Dimensions.get("window").width - 48;
  const scale = Math.min(screenWidth / canvasW, screenWidth / canvasH, 1);
  const dispW = canvasW * scale;
  const dispH = canvasH * scale;

  const toScreen = (meters: number) => meters * ppm * scale;

  return (
    <View style={styles.container}>
      <Svg width={dispW} height={dispH} style={styles.svg}>
        {/* Background */}
        <Rect x={0} y={0} width={dispW} height={dispH} fill="#F5F5F0" />

        {/* Grid lines (1m spacing) */}
        {Array.from({ length: Math.floor(floorPlan.roomWidth) + 1 }).map((_, i) => (
          <Line
            key={`v${i}`}
            x1={toScreen(i)} y1={0}
            x2={toScreen(i)} y2={dispH}
            stroke="#E0E0E0" strokeWidth={1}
          />
        ))}
        {Array.from({ length: Math.floor(floorPlan.roomDepth) + 1 }).map((_, i) => (
          <Line
            key={`h${i}`}
            x1={0} y1={toScreen(i)}
            x2={dispW} y2={toScreen(i)}
            stroke="#E0E0E0" strokeWidth={1}
          />
        ))}

        {/* Walls */}
        {floorPlan.walls.map((w, i) => (
          <Line
            key={`wall${i}`}
            x1={toScreen(w.x1)} y1={toScreen(w.y1)}
            x2={toScreen(w.x2)} y2={toScreen(w.y2)}
            stroke="#333" strokeWidth={4}
          />
        ))}

        {/* Furniture placements (top-view rectangles) */}
        {placements.map((p) => {
          const f = furnitureMap.get(p.furnitureId);
          if (!f) return null;
          const fw = f.width * ppm * scale * p.scale;
          const fh = f.depth * ppm * scale * p.scale;
          const cx = toScreen(p.x);
          const cy = toScreen(p.y);
          const selected = p.id === selectedPlacementId;

          return (
            <G
              key={p.id}
              transform={`translate(${cx}, ${cy}) rotate(${p.rotation}) translate(${-fw / 2}, ${-fh / 2})`}
            >
              <Rect
                width={fw} height={fh}
                fill={selected ? "#4A90D9" : "#A8C8E8"}
                stroke={selected ? "#1A5FB4" : "#6B9BD1"}
                strokeWidth={selected ? 3 : 1.5}
                rx={4}
                onPress={() => onSelectPlacement(selected ? null : p.id)}
              />
              <SvgText
                x={fw / 2} y={fh / 2}
                fontSize={10}
                fill="#fff"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {f.name.slice(0, 8)}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", flex: 1 },
  svg: { backgroundColor: "#F5F5F0", borderRadius: 8 },
});
