import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from "react-native";
import type { Furniture } from "@/types";

interface Props {
  items: Furniture[];
  selectedFurniture: Furniture | null;
  onSelect: (f: Furniture) => void;
}

export function FurnitureCatalog({ items, selectedFurniture, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Danh sách nội thất</Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedFurniture?.id === item.id;
          return (
            <TouchableOpacity
              style={[styles.item, isSelected && styles.itemSelected]}
              onPress={() => onSelect(item)}
            >
              {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.placeholder]}>
                  <Text style={styles.placeholderText}>{item.name[0]}</Text>
                </View>
              )}
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.dim}>{item.width}×{item.depth}m</Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8, backgroundColor: "#fff", borderTopWidth: 1, borderColor: "#eee" },
  header: { fontSize: 13, fontWeight: "600", color: "#666", paddingHorizontal: 16, marginBottom: 8 },
  list: { paddingHorizontal: 12, gap: 8 },
  item: {
    width: 90,
    padding: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
  },
  itemSelected: { borderColor: "#4A90D9", backgroundColor: "#EBF2FB" },
  thumb: { width: 60, height: 60, borderRadius: 8, marginBottom: 4 },
  placeholder: { backgroundColor: "#E0E0E0", justifyContent: "center", alignItems: "center" },
  placeholderText: { fontSize: 24, fontWeight: "bold", color: "#999" },
  name: { fontSize: 11, fontWeight: "600" },
  dim: { fontSize: 9, color: "#888" },
});
