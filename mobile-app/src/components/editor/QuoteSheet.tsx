import React, { useEffect } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Button from '@/components/common/Button';
import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import type { QuoteLine, QuoteSummary } from '@/utils/quote';
import { formatPrice } from '@/utils';

interface QuoteSheetProps {
  visible: boolean;
  quote: QuoteSummary;
  onClose: () => void;
}

const LineRow: React.FC<{ line: QuoteLine }> = ({ line }) => (
  <View style={styles.line}>
    <View style={styles.lineText}>
      <Text style={styles.lineLabel} numberOfLines={2}>
        {line.label}
      </Text>
      <Text style={styles.lineDetail} numberOfLines={1}>
        {line.detail}
      </Text>
    </View>
    <Text style={styles.lineAmount}>{formatPrice(line.amount)}</Text>
  </View>
);

const QuoteSheet: React.FC<QuoteSheetProps> = ({ visible, quote, onClose }) => {
  const hasLines = quote.furnitureLines.length > 0 || quote.materialLines.length > 0;

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Báo giá dự kiến</Text>
              <Text style={styles.subtitle}>Giá tham khảo, chưa gồm thi công.</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Đóng">
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {quote.furnitureLines.length > 0 ? (
              <>
                <Text style={styles.section}>Nội thất</Text>
                {quote.furnitureLines.map((line) => (
                  <LineRow key={line.key} line={line} />
                ))}
              </>
            ) : null}

            {quote.materialLines.length > 0 ? (
              <>
                <Text style={styles.section}>Vật liệu</Text>
                {quote.materialLines.map((line) => (
                  <LineRow key={line.key} line={line} />
                ))}
              </>
            ) : null}

            {!hasLines ? (
              <Text style={styles.empty}>
                Chưa có nội thất hoặc mặt bằng để báo giá. Thêm đồ hoặc quét phòng trước.
              </Text>
            ) : null}

            {quote.unpricedFurniture > 0 ? (
              <Text style={styles.note}>
                {quote.unpricedFurniture} món chưa có giá, shop sẽ báo sau.
              </Text>
            ) : null}

            {quote.vendors.length > 0 ? (
              <Text style={styles.note}>Shop: {quote.vendors.join(', ')}</Text>
            ) : null}
          </ScrollView>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng dự kiến</Text>
            <Text style={styles.totalValue}>{formatPrice(quote.total)}</Text>
          </View>

          <Button title="Đóng" variant="secondary" onPress={onClose} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.overlay,
    zIndex: 40,
    elevation: 40,
  },
  card: {
    maxHeight: '82%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.md },
  title: { fontSize: 19, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: 4, paddingBottom: 4 },
  section: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginTop: SPACING.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 5 },
  lineText: { flex: 1, gap: 1 },
  lineLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  lineDetail: { fontSize: 11, color: COLORS.textSecondary },
  lineAmount: { fontSize: 13, fontWeight: '700', color: COLORS.accent },
  empty: { fontSize: 13, lineHeight: 19, color: COLORS.textSecondary, marginTop: SPACING.sm },
  note: { fontSize: 11, lineHeight: 16, color: COLORS.inactive, marginTop: 4 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '700', color: COLORS.accent },
});

export default QuoteSheet;
