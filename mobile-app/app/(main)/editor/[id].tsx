import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { GestureHandlerRootView, Gesture } from "react-native-gesture-handler";
import { FloorPlanCanvas } from "@/components/design/FloorPlanCanvas";
import { FurnitureCatalog } from "@/components/design/FurnitureCatalog";
import { View3D } from "@/components/design/View3D";
import { useDesignStore } from "@/store/design-store";
import { useFurniture } from "@/hooks/useFurniture";
import { floorPlanApi } from "@/services/floor-plan-api";
import { designApi } from "@/services/design-api";
import type { FurniturePlacement, Furniture } from "@/types";

export default function EditorScreen() {
  const { id, fpId } = useLocalSearchParams<{ id: string; fpId: string }>();
  const router = useRouter();

  const { floorPlan, placements, selectedFurniture, selectedPlacementId,
    setFloorPlan, addPlacement, updatePlacement, removePlacement,
    setSelectedFurniture, setSelectedPlacementId, viewMode, setViewMode } =
    useDesignStore();

  const { items: furnitureItems, loading: furnitureLoading } = useFurniture();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load floor plan
  useEffect(() => {
    if (!fpId) return;
    setLoading(true);
    floorPlanApi.getById(fpId)
      .then((fp) => setFloorPlan(fp))
      .catch((e) => Alert.alert("Lỗi", "Không tải được floor plan"))
      .finally(() => setLoading(false));
  }, [fpId]);

  const furnitureMap = useMemo(() => {
    const m = new Map<string, Furniture>();
    furnitureItems.forEach((f) => m.set(f.id, f));
    return m;
  }, [furnitureItems]);

  // Tap on canvas to place selected furniture
  const handleCanvasTap = useCallback((xMeters: number, yMeters: number) => {
    if (!selectedFurniture) return;
    const newPlacement: FurniturePlacement = {
      id: crypto.randomUUID(),
      furnitureId: selectedFurniture.id,
      x: xMeters,
      y: yMeters,
      rotation: 0,
      scale: 1,
    };
    addPlacement(newPlacement);
    setSelectedFurniture(null);
  }, [selectedFurniture, addPlacement, setSelectedFurniture]);

  // Save design
  const handleSave = async () => {
    if (!floorPlan) return;
    setSaving(true);
    try {
      // Create the design, then save placements to it
      const design = await designApi.create({
        name: `Design ${new Date().toLocaleDateString()}`,
        roomImageId: floorPlan.roomImageId,
      });

      if (placements.length > 0) {
        await designApi.update(design.id, {
          name: design.name,
          placements: placements.map((p) => ({
            id: p.id,
            furnitureId: p.furnitureId,
            x: p.x,
            y: p.y,
            rotation: p.rotation,
            scale: p.scale,
          })),
        });
      }

      Alert.alert("Thành công", "Đã lưu thiết kế", [
        { text: "OK", onPress: () => router.push("/(main)/designs") },
      ]);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message ?? "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.loadingText}>Đang tải floor plan...</Text>
      </View>
    );
  }

  if (!floorPlan) {
    return (
      <View style={styles.center}>
        <Text>Không tìm thấy floor plan</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* View toggle */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === "2d" && styles.toggleActive]}
          onPress={() => setViewMode("2d")}
        >
          <Text style={[styles.toggleText, viewMode === "2d" && styles.toggleTextActive]}>2D</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === "3d" && styles.toggleActive]}
          onPress={() => setViewMode("3d")}
        >
          <Text style={[styles.toggleText, viewMode === "3d" && styles.toggleTextActive]}>3D</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? "Đang lưu..." : "💾 Lưu"}</Text>
        </TouchableOpacity>
      </View>

      {viewMode === "2d" ? (
        <>
          <View style={styles.canvasContainer}>
            <FloorPlanCanvas
              floorPlan={floorPlan}
              placements={placements}
              furnitureMap={furnitureMap}
              selectedPlacementId={selectedPlacementId}
              onSelectPlacement={setSelectedPlacementId}
              onMovePlacement={(pid, x, y) => updatePlacement(pid, { x, y })}
            />
          </View>

          {/* Selected placement controls */}
          {selectedPlacementId && (
            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={() => {
                  const p = placements.find((x) => x.id === selectedPlacementId);
                  if (p) updatePlacement(p.id, { rotation: (p.rotation + 90) % 360 });
                }}
              >
                <Text style={styles.controlBtnText}>↻ Xoay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: "#E74C3C" }]}
                onPress={() => removePlacement(selectedPlacementId)}
              >
                <Text style={styles.controlBtnText}>🗑 Xoá</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedFurniture && (
            <View style={styles.hintBar}>
              <Text style={styles.hintText}>
                👆 Chọn vị trí trên sơ đồ để đặt "{selectedFurniture.name}"
              </Text>
              <TouchableOpacity onPress={() => setSelectedFurniture(null)}>
                <Text style={styles.cancelText}>Huỷ</Text>
              </TouchableOpacity>
            </View>
          )}

          {!furnitureLoading && (
            <FurnitureCatalog
              items={furnitureItems}
              selectedFurniture={selectedFurniture}
              onSelect={setSelectedFurniture}
            />
          )}
        </>
      ) : (
        <View3D
          floorPlan={floorPlan}
          placements={placements}
          furnitureMap={furnitureMap}
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#666" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
  },
  toggleActive: { backgroundColor: "#4A90D9" },
  toggleText: { fontSize: 14, fontWeight: "600", color: "#666" },
  toggleTextActive: { color: "#fff" },
  saveBtn: {
    marginLeft: "auto",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#27AE60",
    borderRadius: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "600" },
  canvasContainer: { flex: 1, padding: 16 },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 8,
  },
  controlBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: "#4A90D9",
    borderRadius: 8,
  },
  controlBtnText: { color: "#fff", fontWeight: "600" },
  hintBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EBF2FB",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  hintText: { fontSize: 13, color: "#1A5FB4" },
  cancelText: { fontSize: 13, color: "#E74C3C", fontWeight: "600" },
});
