import { StyleSheet } from 'react-native';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING.xl },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, paddingHorizontal: SPACING.md, marginTop: 4 },
  step: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: 12,
  },
  optional: { fontSize: 13, fontWeight: '400', color: COLORS.textSecondary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md },
  listContent: { paddingHorizontal: SPACING.md },
  styleHint: { fontSize: 12, color: COLORS.textSecondary, paddingHorizontal: SPACING.md, marginTop: SPACING.sm },
  input: {
    marginHorizontal: SPACING.md,
    minHeight: 70,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(231,76,60,0.12)',
  },
  errorText: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  footerHint: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.sm },
});

export default styles;
