import { StyleSheet } from 'react-native';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING.xl },
  image: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.surfaceAlt },
  body: { padding: SPACING.md },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleText: { flex: 1 },
  category: { fontSize: 12, color: COLORS.textSecondary, textTransform: 'uppercase', fontWeight: '600' },
  name: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 4 },
  heart: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  rating: { fontSize: 13, color: COLORS.textSecondary },
  price: { fontSize: 22, fontWeight: 'bold', color: COLORS.accent, marginTop: SPACING.sm },
  unit: { fontSize: 14, fontWeight: '400', color: COLORS.textSecondary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.lg, marginBottom: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  specTable: { borderRadius: RADIUS.md, backgroundColor: COLORS.surface, overflow: 'hidden' },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  specLabel: { fontSize: 13, color: COLORS.textSecondary },
  specValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
});

export default styles;
