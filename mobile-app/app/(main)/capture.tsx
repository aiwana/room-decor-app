import { View, Text, StyleSheet } from "react-native";

export default function CaptureScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capture Room</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
});
