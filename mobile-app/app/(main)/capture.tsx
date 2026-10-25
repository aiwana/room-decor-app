import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "@/store/auth-store";
import { roomImageApi } from "@/services/room-image-api";
import { aiApi } from "@/services/ai-api";
import { useDesignStore } from "@/store/design-store";

export default function CaptureScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const setFloorPlan = useDesignStore((s) => s.setFloorPlan);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await processImage(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await processImage(result.assets[0].uri);
  };

  const processImage = async (uri: string) => {
    try {
      // Step 1: Upload image
      setUploading(true);
      setStatus("Đang tải ảnh lên...");
      const roomImage = await roomImageApi.upload(uri);
      setUploading(false);

      // Step 2: AI scan
      setScanning(true);
      setStatus("AI đang quét phòng, tạo mô hình 2D...");
      const scanResult = await aiApi.scanRoom(roomImage.id);
      setScanning(false);

      // Step 3: Navigate to 2D editor
      setFloorPlan(scanResult.floorPlan);
      router.push({
        pathname: "/(main)/editor/[id]",
        params: { id: roomImage.id, fpId: scanResult.floorPlan.id },
      });
    } catch (e: any) {
      setScanning(false);
      setUploading(false);
      Alert.alert("Lỗi", e?.response?.data?.message ?? String(e));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chụp ảnh phòng</Text>
      <Text style={styles.subtitle}>
        Chụp ảnh phòng của bạn, AI sẽ quét và tạo mô hình 2D
      </Text>

      {(uploading || scanning) && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.loadingText}>{status}</Text>
        </View>
      )}

      {!uploading && !scanning && (
        <>
          <TouchableOpacity style={styles.btnPrimary} onPress={pickImage}>
            <Text style={styles.btnText}>📷 Chụp ảnh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={pickFromLibrary}>
            <Text style={styles.btnTextSecondary}>🖼 Chọn từ thư viện</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 32, textAlign: "center" },
  loadingBox: { alignItems: "center", gap: 16 },
  loadingText: { fontSize: 14, color: "#666" },
  btnPrimary: {
    backgroundColor: "#4A90D9",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 16,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: "#4A90D9",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  btnTextSecondary: { color: "#4A90D9", fontSize: 16, fontWeight: "600" },
});
