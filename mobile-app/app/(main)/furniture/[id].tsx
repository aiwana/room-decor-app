/**
 * app/(main)/furniture/[id].tsx
 * CHI TIET NOI THAT (thay Chi tiet san pham cu): anh/icon, danh muc, kich thuoc.
 *   GET /api/furniture/{id}
 * Nut "Dat vao thiet ke" -> chon thiet ke o tab "Cua toi" (trinh chinh sua co bang chon do).
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import Button from '@/components/common/Button';
import { ErrorView, LoadingView } from '@/components/common/StateViews';
import FurnitureThumb from '@/components/furniture/FurnitureThumb';
import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import { getCategoryIcon, getCategoryLabel } from '@/constants/furniture';
import { useAsync } from '@/hooks/useAsync';
import { isSampleFurnitureId } from '@/mock/furniture';
import { getErrorMessage } from '@/services/api-error';
import { furnitureApi } from '@/services/furniture-api';
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

  if (loading) return <LoadingView />;
  if (error || !item) return <ErrorView message={getErrorMessage(error)} onRetry={reload} />;

  return (
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
        <Text style={styles.stock}>{item.stockStatus === 'in_stock' ? 'Còn hàng' : 'Liên hệ tồn kho'}</Text>

        <Text style={styles.section}>Kích thước</Text>
        <View style={styles.dims}>
          <DimensionBox label="Rộng" value={item.width} />
          <DimensionBox label="Sâu" value={item.depth} />
          <DimensionBox label="Cao" value={item.height} />
        </View>

        <Text style={styles.section}>Mô hình 3D</Text>
        <Text style={styles.text}>
          {item.modelUrl ? 'Đã có mô hình 3D (GLB), sẽ hiển thị ở phiên bản 3D.' : 'Chưa có mô hình 3D cho món đồ này.'}
        </Text>

        <Button
          title="Đặt vào một thiết kế"
          iconName="cube-outline"
          onPress={(): void => router.navigate('/designs')}
          style={styles.button}
        />
        <Text style={styles.hint}>Mở một thiết kế, bấm "Thêm đồ" và chọn món này.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING.xl },
  hero: { width: '100%', aspectRatio: 4 / 3 },
  body: { padding: SPACING.md },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  category: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  sample: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  name: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  price: { fontSize: 22, fontWeight: '700', color: COLORS.accent },
  vendor: { flex: 1, textAlign: 'right', fontSize: 13, color: COLORS.textSecondary },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  stock: { fontSize: 12, fontWeight: '600', color: COLORS.success, marginTop: 4 },
  section: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  dims: { flexDirection: 'row', gap: 12 },
  dimBox: { flex: 1, padding: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, alignItems: 'center' },
  dimValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.accent },
  dimLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  text: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  button: { marginTop: SPACING.lg },
  hint: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },
});
