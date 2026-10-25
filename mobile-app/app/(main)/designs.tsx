import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { useDesigns } from "@/hooks/useDesigns";
import { useDesignStore } from "@/store/design-store";
import { formatDate } from "@/utils";
import { floorPlanApi } from "@/services/floor-plan-api";
import type { Design } from "@/types";

export default function DesignsScreen() {
  const router = useRouter();
  const { designs, loading, refresh } = useDesigns();
  const setFloorPlan = useDesignStore((s) => s.setFloorPlan);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const openDesign = async (design: Design) => {
    if (!design.roomImageId) return;
    try {
      const fp = await floorPlanApi.getByRoomImage(design.roomImageId);
      setFloorPlan(fp);
      router.push({
        pathname: "/(main)/editor/[id]",
        params: { id: design.id, fpId: fp.id },
      });
    } catch {
      // Floor plan may not exist yet for older designs
    }
  };

  const renderItem = ({ item }: { item: Design }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDesign(item)}>
      <View style={styles.cardIcon}>
        <Text style={styles.iconText}>🏠</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.placements}>
          {item.placements?.length ?? 0} món nội thất
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={designs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Chưa có thiết kế nào</Text>
            <Text style={styles.emptyHint}>Chụp ảnh phòng để bắt đầu</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(main)/capture")}
            >
              <Text style={styles.emptyBtnText}>📷 Chụp ảnh phòng</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  list: { padding: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EBF2FB",
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: { fontSize: 24 },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  date: { fontSize: 12, color: "#888", marginBottom: 2 },
  placements: { fontSize: 12, color: "#4A90D9" },
  arrow: { fontSize: 24, color: "#CCC" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#666" },
  emptyHint: { fontSize: 13, color: "#999" },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: "#4A90D9",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  emptyBtnText: { color: "#fff", fontWeight: "600" },
});
