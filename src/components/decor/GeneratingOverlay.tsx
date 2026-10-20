/**
 * src/components/decor/GeneratingOverlay.tsx
 * Man che toan man hinh khi AI dang xu ly. Doi cau chu moi 1 giay
 * de nguoi dung thay app van dang "lam viec".
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import { COLORS, SPACING } from '@/constants/colors';

const MESSAGES = [
  'AI đang phân tích căn phòng...',
  'Đang chọn vật liệu phù hợp...',
  'Đang phối màu theo phong cách...',
  'Sắp xong rồi...',
];

const GeneratingOverlay: React.FC<{ visible: boolean }> = ({ visible }) => {
  const [index, setIndex] = useState<number>(0);
  const [prevVisible, setPrevVisible] = useState<boolean>(visible);

  // Moi lan overlay mo lai -> quay ve cau dau tien
  // (cap nhat state ngay khi render, cach React khuyen dung thay cho useEffect)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    setIndex(0);
  }

  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    const timer = setInterval(() => {
      setIndex((i) => Math.min(i + 1, MESSAGES.length - 1));
    }, 1000);
    return (): void => clearInterval(timer);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.sparkle}>✨</Text>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.text}>{MESSAGES[index]}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: COLORS.overlay, alignItems: 'center', justifyContent: 'center' },
  box: {
    width: 260,
    padding: SPACING.lg,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    gap: SPACING.md,
  },
  sparkle: { fontSize: 36 },
  text: { color: COLORS.textPrimary, fontSize: 14, textAlign: 'center' },
});

export default GeneratingOverlay;
