/**
 * app/(main)/furniture/[id].tsx
 * CHI TIET NOI THAT (thay Chi tiet san pham cu): anh/icon, danh muc, kich thuoc.
 *   GET /api/furniture/{id}
 * Nut "Dat vao thiet ke" (thanh duoi co dinh) -> bang chon thiet ke -> mo trinh chinh sua
 * voi mon do da dat san giua phong (param add=<furnitureId>), nguoi dung keo cho roi bam Luu.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import Button from '@/components/common/Button';
import { ErrorView, LoadingView } from '@/components/common/StateViews';
import DesignPickerSheet from '@/components/design/DesignPickerSheet';
import FurnitureThumb from '@/components/furniture/FurnitureThumb';
import { COLORS, FONT, RADIUS, SPACING } from '@/constants/colors';
import { getCategoryIcon, getCategoryLabel } from '@/constants/furniture';
import { useAsync } from '@/hooks/useAsync';
import { useDesigns } from '@/hooks/useDesigns';
import { isSampleFurnitureId } from '@/mock/furniture';
import { getErrorMessage } from '@/services/api-error';
import { furnitureApi } from '@/services/furniture-api';
import type { DesignDetail } from '@/types';
import { firstParam, formatPrice } from '@/utils';

const DimensionBox: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <View style={styles.dimBox}>
    <Text style={styles.dimValue}>{value}</Text>
    <Text style={styles.dimLabel}>{label} (cm)</Text>
  </View>
);

export default function FurnitureDetailScreen() {
  const router = useRouter();
  const id = firstParam(useLocalSearchParams<{ id: string }>().id) ?? '';
  const { data: item, loading, error, reload } = useAsync(() => furnitureApi.getById(id), [id]);
  const { designs, loading: designsLoading } = useDesigns();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (loading) return <LoadingView />;
  if (error || !item) return <ErrorView message={getErrorMessage(error)} onRetry={reload} />;

  const placeInto = (design: DesignDetail): void => {
    setPickerOpen(false);
    router.push({
      pathname: '/editor/[id]',
      params: { id: design.id, add: item.id },
    });
  };

  const inStock = item.stockStatus === 'in_stock';

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: item.name }} />
        <FurnitureThumb furniture={item} iconSize={96} style={styles.hero} />

        <View style={styles.body}>
          <View style={styles.categoryRow}>
            <Ionicons name={getCategoryIcon(item.category)} size={14} color={COLORS.accent} />
            <Text style={styles.category}>{getCategoryLabel(item.category)}</Text>
            {isSampleFurnitureId(item.id) ? <Text style={styles.sample}>Mẫu</Text> : null}
          </View>
          <Text style={styles.name}>{item.name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(item.price, item.currency ?? 'VND')}</Text>
            {item.vendorName ? <Text style={styles.vendor}>{item.vendorName}</Text> : null}
          </View>
          {item.style || item.material ? (
            <Text style={styles.meta}>{[item.style, item.material].filter(Boolean).join(' · ')}</Text>
          ) : null}
          <View style={[styles.stockPill, !inStock && styles.stockPillWarn]}>
            <Ionicons
              name={inStock ? 'checkmark-circle' : 'time-outline'}
              size={14}
              color={inStock ? COLORS.success : COLORS.warningText}
            />
            <Text style={[styles.stock, !inStock && styles.stockWarn]}>{inStock ? 'Còn hàng' : 'Liên hệ tồn kho'}</Text>
          </View>

          <Text style={styles.section}>Kích thước</Text>
          <View style={styles.dims}>
            <DimensionBox label="Rộng" value={item.width} />
            <DimensionBox label="Sâu" value={item.depth} />
            <DimensionBox label="Cao" value={item.height} />
          </View>

          <Text style={styles.section}>Khi xem 3D</Text>
          <View style={styles.infoRow}>
            <Ionicons name="cube-outline" size={18} color={COLORS.accent} />
            <Text style={styles.text}>
              {item.modelUrl
                ? 'Có mô hình 3D thật: hiện đúng hình dáng món đồ.'
                : 'Hiện bằng khối dựng sẵn theo loại đồ, đúng kích thước thật.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Thanh hanh dong co dinh duoi man hinh (de bam bang ngon cai) */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomLabel}>Giá tham khảo</Text>
          <Text style={styles.bottomValue} numberOfLines={1}>
            {formatPrice(item.price, item.currency ?? 'VND')}
          </Text>
        </View>
        <Button
          title="Đặt vào thiết kế"
          iconName="add-circle-outline"
          onPress={(): void => setPickerOpen(true)}
          style={styles.bottomButton}
        />
      </SafeAreaView>

      <DesignPickerSheet
        visible={pickerOpen}
        title={`Đặt "${item.name}" vào`}
        subtitle="Chọn thiết kế, món đồ sẽ nằm giữa phòng để bạn kéo vào chỗ."
        designs={designs}
        loading={designsLoading}
        onPick={placeInto}
        onCreateNew={(): void => {
          setPickerOpen(false);
          router.navigate('/new-design');
        }}
        onClose={(): void => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING.xl },
  hero: { width: '100%', aspectRatio: 4 / 3 },
  body: { padding: SPACING.md },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  category: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  sample: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  name: {
    fontSize: 22,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginTop: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  price: { fontSize: 22, fontFamily: FONT.bold, color: COLORS.accent },
  vendor: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  meta: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: SPACING.sm,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(46,204,113,0.12)',
  },
  stockPillWarn: { backgroundColor: COLORS.warningSoft },
  stock: { fontSize: 12, fontFamily: FONT.semibold, color: COLORS.success },
  stockWarn: { color: COLORS.warningText },
  infoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  section: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  dims: { flexDirection: 'row', gap: 12 },
  dimBox: {
    flex: 1,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  dimValue: { fontSize: 18, fontFamily: FONT.bold, color: COLORS.accent },
  dimLabel: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  bottomPrice: { flex: 1, minWidth: 0 },
  bottomLabel: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  bottomValue: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
  },
  bottomButton: { flexShrink: 0, paddingHorizontal: 20 },
});
