/**
 * app/(main)/(tabs)/designs.tsx
 * THIET KE CUA TOI (thay man History cu): luoi 2 cot, mo lai de sua, xoa.
 *   GET /api/designs, DELETE /api/designs/{id}
 */
import { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MockModeNotice } from '@/components/common/Notice';
import { EmptyView, ErrorView, LoadingView } from '@/components/common/StateViews';
import DesignCard from '@/components/design/DesignCard';
import { COLORS, SPACING } from '@/constants/colors';
import { useDesigns } from '@/hooks/useDesigns';
import { getErrorMessage } from '@/services/api-error';
import { designApi } from '@/services/design-api';
import type { DesignDetail } from '@/types';

export default function DesignsScreen() {
  const router = useRouter();
  const { designs, loading, error, refresh } = useDesigns();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openDesign = (design: DesignDetail): void => {
    router.push({ pathname: '/editor/[id]', params: { id: design.id } });
  };

  const confirmDelete = (design: DesignDetail): void => {
    Alert.alert('Xoá thiết kế?', `"${design.name}" sẽ bị xoá vĩnh viễn.`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: (): void => {
          setDeletingId(design.id);
          designApi
            .remove(design.id)
            .then(refresh)
            .catch((e: unknown) => Alert.alert('Không xoá được thiết kế', getErrorMessage(e)))
            .finally(() => setDeletingId(null));
        },
      },
    ]);
  };

  const renderBody = (): React.ReactNode => {
    if (loading) return <LoadingView message="Đang tải thiết kế..." />;
    if (error && designs.length === 0) return <ErrorView message={getErrorMessage(error)} onRetry={refresh} />;
    if (designs.length === 0) {
      return (
        <EmptyView
          iconName="albums-outline"
          title="Chưa có thiết kế nào"
          message="Chụp ảnh căn phòng và đặt thử nội thất để tạo thiết kế đầu tiên."
          actionLabel="Tạo thiết kế mới"
          onAction={(): void => router.navigate('/new-design')}
        />
      );
    }
    return (
      <FlatList
        data={designs.filter((d) => d.id !== deletingId)}
        keyExtractor={(item): string => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={COLORS.accent} />}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <DesignCard design={item} onPress={openDesign} onDelete={confirmDelete} />
          </View>
        )}
      />
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Thiết kế của tôi</Text>
        <Text style={styles.subtitle}>{designs.length} thiết kế</Text>
      </View>
      <MockModeNotice />
      {renderBody()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, marginBottom: SPACING.md },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
  column: { gap: 12 },
  cell: { flex: 1, marginBottom: 12, maxWidth: '50%' },
});
