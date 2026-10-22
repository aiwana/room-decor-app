/**
 * src/screens/authStyles.ts
 * Style dung chung cho man Dang nhap va Dang ky (giu giao dien ban cu).
 */
import { StyleSheet } from 'react-native';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';

const authStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SPACING.md, paddingBottom: SPACING.xl },
  brand: { alignItems: 'center', marginBottom: SPACING.lg },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 26, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: SPACING.sm },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.lg },
  notice: { marginHorizontal: 0, marginBottom: SPACING.md },
  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(231,76,60,0.12)',
    marginBottom: SPACING.md,
  },
  formErrorText: { flex: 1, color: COLORS.danger, fontSize: 13 },
  submit: { marginTop: SPACING.sm },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg, gap: 4 },
  switchText: { color: COLORS.textSecondary, fontSize: 14 },
  switchLink: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
});

export default authStyles;
