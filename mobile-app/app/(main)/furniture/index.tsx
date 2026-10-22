/**
 * app/(main)/furniture/index.tsx
 * DANH MUC NOI THAT (thay Catalog cu): loc theo danh muc, tim theo ten.
 *   GET /api/furniture?category=  |  GET /api/furniture/search?q=
 * Bang furniture tren may chu dang trong -> hien noi that mau va ghi chu ro.
 */
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Chip from '@/components/common/Chip';
import { MockModeNotice, Notice } from '@/components/common/Notice';
import { EmptyView, ErrorView, LoadingView } from '@/components/common/StateViews';
import FurnitureCard from '@/components/furniture/FurnitureCard';
import { USE_MOCK } from '@/constants';
import { COLORS, SPACING } from '@/constants/colors';
import { FURNITURE_CATEGORIES } from '@/constants/furniture';
import { useFurniture } from '@/hooks/useFurniture';
import { getErrorMessage } from '@/services/api-error';
import type { Furniture } from '@/types';
import { firstParam } from '@/utils';

export default function FurnitureListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();

  const [category, setCategory] = useState<string | undefined>(firstParam(params.category));
  const [input, setInput] = useState(firstParam(params.q) ?? '');
  // Chi tim khi bam "Tim" tren ban phim (tranh goi API moi lan go 1 chu)
  const [query, setQuery] = useState(firstParam(params.q) ?? '');

  const { items, isSample, loading, error, refresh } = useFurniture(category, query);

  const openDetail = (item: Furniture): void => {
    router.push({ pathname: '/furniture/[id]', params: { id: item.id } });
  };

  const renderBody = (): React.ReactNode => {
    if (loading) return <LoadingView />;
    if (error) return <ErrorView message={getErrorMessage(error)} onRetry={refresh} />;
    if (items.length === 0) {
      return <EmptyView iconName="search-outline" title="Không tìm thấy nội thất" message="Thử từ khoá hoặc danh mục khác." />;
    }
    return (
      <FlatList
        data={items}
        keyExtractor={(item): string => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <FurnitureCard furniture={item} onPress={openDetail} />
          </View>
        )}
      />
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={COLORS.inactive} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên nội thất..."
          placeholderTextColor={COLORS.inactive}
          value={input}
          onChangeText={setInput}
          returnKeyType="search"
          onSubmitEditing={(): void => setQuery(input.trim())}
        />
        {input.length > 0 ? (
          <Pressable
            onPress={(): void => {
              setInput('');
              setQuery('');
            }}
            hitSlop={8}
            accessibilityLabel="Xoá từ khoá"
          >
            <Ionicons name="close-circle" size={18} color={COLORS.inactive} />
          </Pressable>
        ) : null}
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

      <MockModeNotice />
      {isSample && !USE_MOCK ? (
        <Notice message="Máy chủ chưa có nội thất nào, đang hiển thị nội thất mẫu." />
      ) : null}

      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: 12,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: COLORS.textPrimary },
  chips: { paddingHorizontal: SPACING.md, paddingVertical: 12 },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
  column: { gap: 12 },
  cell: { flex: 1, marginBottom: 12, maxWidth: '50%' },
});
