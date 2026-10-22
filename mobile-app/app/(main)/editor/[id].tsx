import { View, Text, StyleSheet } from "expo-router";
import { useLocalSearchParams } from "expo-router";

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Design Editor</Text>
      <Text>Editing design: {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
});
