import { StyleSheet } from 'react-native';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  notice: { marginHorizontal: 0 },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.sm,
  },
  productImage: { width: 64, height: 64, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt },
  productInfo: { flex: 1, justifyContent: 'center' },
  productName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  productPrice: { fontSize: 13, color: COLORS.accent, marginTop: 4, fontWeight: '700' },
  label: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600', marginTop: SPACING.md, marginBottom: 6 },
  input: {
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  inputMultiline: { height: 90, paddingTop: 12, textAlignVertical: 'top' },
  error: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
  submit: { marginTop: SPACING.lg },
});

export default styles;
