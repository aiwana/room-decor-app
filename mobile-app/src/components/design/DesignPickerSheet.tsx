/**
 * src/components/design/DesignPickerSheet.tsx
 * Bang chon 1 thiet ke (dung o "Chi tiet noi that" -> "Dat vao thiet ke").
 * Danh sach thiet ke dang danh sach (anh nho 3D / mat bang), moi nhat tren cung,
 * cuoi bang co nut tao thiet ke moi khi chua co hoac muon phong khac.
 */
import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DesignCardSkeleton } from '@/components/common/Skeleton';
import DesignCard from '@/components/design/DesignCard';
import { COLORS, FONT, RADIUS, SPACING, TOUCH_MIN } from '@/constants/colors';
import type { DesignDetail } from '@/types';

interface DesignPickerSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  designs: DesignDetail[];
  loading: boolean;
  onPick: (design: DesignDetail) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

const DesignPickerSheet: React.FC<DesignPickerSheetProps> = ({
  visible,
  title,
  subtitle,
  designs,
  loading,
  onPick,
  onCreateNew,
  onClose,
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Đóng" />
      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Đóng">
            <Ionicons name="close" size={22} color={COLORS.textSecondary} />
          </Pressable>
        </View>
        {loading && designs.length === 0 ? (
          <View style={styles.list}>
            <DesignCardSkeleton variant="list" />
          </View>
        ) : (
          <FlatList
            data={designs}
            keyExtractor={(d): string => d.id}
            style={styles.listBox}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={(): React.ReactElement => <View style={styles.sep} />}
            renderItem={({ item }) => <DesignCard design={item} variant="list" onPress={onPick} />}
            ListEmptyComponent={<Text style={styles.empty}>Bạn chưa có thiết kế nào.</Text>}
          />
        )}
        <Pressable
          style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}
          onPress={onCreateNew}
          accessibilityRole="button"
        >
          <Ionicons name="add-circle-outline" size={20} color={COLORS.accent} />
          <Text style={styles.newText}>Tạo thiết kế mới</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay },
  sheet: {
    maxHeight: '80%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingBottom: SPACING.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.borderStrong, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 12 },
  title: { fontSize: 18, fontFamily: FONT.bold, color: COLORS.textPrimary },
  subtitle: { fontSize: 13, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: 2 },
  listBox: { flexGrow: 0 },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  sep: { height: 8 },
  empty: { fontSize: 15, fontFamily: FONT.regular, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: SPACING.lg },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: TOUCH_MIN + 4,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  pressed: { opacity: 0.7 },
  newText: { fontSize: 15, fontFamily: FONT.semibold, color: COLORS.accent },
});

export default DesignPickerSheet;
