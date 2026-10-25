import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useFurniture } from "@/hooks/useFurniture";
import type { Furniture } from "@/types";

export default function FurnitureScreen() {
  const router = useRouter();
  const { items, loading, error } = useFurniture();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#E74C3C" }}>Lỗi: {error}</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Furniture }) => (
    <TouchableOpacity style={styles.card}>
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.placeholder]}>
          <Text style={styles.placeholderText}>{item.name[0]}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.dim}>Kích thước: {item.width}×{item.depth}×{item.height}m</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    gap: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  placeholder: {
    backgroundColor: "#E8E8E8",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { fontSize: 32, fontWeight: "bold", color: "#AAA" },
  info: { flex: 1, justifyContent: "center" },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  category: { fontSize: 12, color: "#4A90D9", marginBottom: 4 },
  dim: { fontSize: 11, color: "#888" },
});
