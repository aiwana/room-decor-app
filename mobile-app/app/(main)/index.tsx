import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Xin chào! 👋</Text>
      <Text style={styles.subtitle}>Thiết kế phòng của bạn với AI</Text>

      {/* Main CTA: Capture */}
      <TouchableOpacity
        style={styles.captureCard}
        onPress={() => router.push("/(main)/capture")}
      >
        <Text style={styles.captureIcon}>📷</Text>
        <Text style={styles.captureTitle}>Chụp ảnh phòng</Text>
        <Text style={styles.captureDesc}>
          Chụp ảnh, AI quét và tạo mô hình 2D tự động
        </Text>
      </TouchableOpacity>

      {/* Quick actions */}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: "#EBF2FB" }]}
          onPress={() => router.push("/(main)/designs")}
        >
          <Text style={styles.quickIcon}>🎨</Text>
          <Text style={styles.quickTitle}>Thiết kế</Text>
          <Text style={styles.quickDesc}>Xem & chỉnh sửa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: "#FFF3E0" }]}
          onPress={() => router.push("/(main)/furniture")}
        >
          <Text style={styles.quickIcon}>🛋</Text>
          <Text style={styles.quickTitle}>Nội thất</Text>
          <Text style={styles.quickDesc}>Duyệt catalog</Text>
        </TouchableOpacity>
      </View>

      {/* How it works */}
      <View style={styles.howItWorks}>
        <Text style={styles.sectionTitle}>Cách hoạt động</Text>
        <View style={styles.step}>
          <Text style={styles.stepNum}>1</Text>
          <Text style={styles.stepText}>Chụp ảnh phòng của bạn</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNum}>2</Text>
          <Text style={styles.stepText}>AI quét và tạo mô hình 2D (sơ đồ phòng)</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNum}>3</Text>
          <Text style={styles.stepText}>Kéo thả nội thất vào sơ đồ 2D</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNum}>4</Text>
          <Text style={styles.stepText}>Xem kết quả ở dạng 3D</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { padding: 24, gap: 16 },
  greeting: { fontSize: 26, fontWeight: "bold", marginTop: 8 },
  subtitle: { fontSize: 15, color: "#888" },
  captureCard: {
    backgroundColor: "#4A90D9",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  captureIcon: { fontSize: 40 },
  captureTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  captureDesc: { fontSize: 13, color: "#D6E4F5", textAlign: "center" },
  row: { flexDirection: "row", gap: 12 },
  quickCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 4,
  },
  quickIcon: { fontSize: 28 },
  quickTitle: { fontSize: 15, fontWeight: "600" },
  quickDesc: { fontSize: 11, color: "#888" },
  howItWorks: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#4A90D9",
    color: "#fff",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 14,
    fontWeight: "bold",
  },
  stepText: { fontSize: 14, color: "#555", flex: 1 },
});
