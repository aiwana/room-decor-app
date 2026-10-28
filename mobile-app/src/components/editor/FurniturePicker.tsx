/**
 * src/components/editor/FurniturePicker.tsx
 * Bang chon noi that truot tu duoi len (trong trinh chinh sua): loc theo danh muc,
 * cham 1 mon de dat vao giua anh phong.
 */
import React, { useEffect, useState } from 'react';
import { BackHandler, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import Chip from '@/components/common/Chip';
import { Notice } from '@/components/common/Notice';
import { EmptyView, ErrorView, LoadingView } from '@/components/common/StateViews';
import FurnitureCard from '@/components/furniture/FurnitureCard';
import { USE_MOCK } from '@/constants';
import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import { FURNITURE_CATEGORIES } from '@/constants/furniture';
import { useFurniture } from '@/hooks/useFurniture';
import { getErrorMessage } from '@/services/api-error';
import type { Furniture } from '@/types';

interface FurniturePickerProps {
  visible: boolean;
  onClose: () => void;
  onPick: (furniture: Furniture) => void;
}

const FurniturePicker: React.FC<FurniturePickerProps> = ({ visible, onClose, onPick }) => {
  const [category, setCategory] = useState<string | undefined>();
  const { items, isSample, loading, error, refresh } = useFurniture(category);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  const renderBody = (): React.ReactNode => {
    if (loading) return <LoadingView />;
    if (error) return <ErrorView message={getErrorMessage(error)} onRetry={refresh} />;
    if (items.length === 0) return <EmptyView iconName="cube-outline" title="Danh mục này chưa có nội thất" />;
    return (
      <FlatList
        data={items}
        keyExtractor={(item): string => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <FurnitureCard furniture={item} onPress={onPick} />
          </View>
        )}
      />
    );
  };

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Chọn nội thất</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Đóng">
            <Ionicons name="close" size={26} color={COLORS.textPrimary} />
          </Pressable>
        </View>
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="Tất cả" selected={!category} onPress={(): void => setCategory(undefined)} />
            {FURNITURE_CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                iconName={c.iconName}
                selected={category === c.id}
                onPress={(): void => setCategory(c.id)}
              />
            ))}
          </ScrollView>
        </View>
        {isSample && !USE_MOCK ? <Notice message="Máy chủ chưa có nội thất, đang dùng nội thất mẫu." /> : null}
        {renderBody()}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    zIndex: 25,
    elevation: 25,
  },
  sheet: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  chips: { paddingHorizontal: SPACING.md, paddingVertical: 12 },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
  column: { gap: 12 },
  cell: { flex: 1, marginBottom: 12, maxWidth: '50%', borderRadius: RADIUS.md },
});

export default FurniturePicker;
