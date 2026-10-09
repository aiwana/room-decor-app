import { StyleSheet } from 'react-native';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingTop: SPACING.sm, paddingBottom: SPACING.xl },
  processing: {
    marginHorizontal: SPACING.md,
    aspectRatio: 4 / 3,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  processingText: { color: COLORS.textSecondary },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  infoText: { flex: 1 },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  date: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  heart: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md, marginTop: 12 },
  prompt: { color: COLORS.textSecondary, fontStyle: 'italic', paddingHorizontal: SPACING.md, marginTop: 4 },
  actions: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, marginTop: SPACING.md },
  actionFlex: { flex: 1, paddingHorizontal: 8 },
  shareBtn: { width: 50, paddingHorizontal: 0 },
  materialsLoading: { marginTop: SPACING.md },
  materialsError: { color: COLORS.danger, textAlign: 'center', marginTop: SPACING.sm },
});

export default styles;
