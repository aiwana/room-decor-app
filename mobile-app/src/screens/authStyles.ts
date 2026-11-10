/**
 * src/screens/authStyles.ts
 * Style dung chung cho man Dang nhap va Dang ky (giu giao dien ban cu).
 */
import { StyleSheet } from 'react-native';

import { COLORS, FONT, RADIUS, SPACING } from '@/constants/colors';

const authStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SPACING.md, paddingBottom: SPACING.xl },
  title: { fontSize: 22, fontFamily: FONT.bold, color: COLORS.textPrimary },
  subtitle: { fontSize: 15, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.lg },
  notice: { marginHorizontal: 0, marginBottom: SPACING.md },
  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.dangerSoft,
    marginBottom: SPACING.md,
  },
  formErrorText: { flex: 1, color: COLORS.dangerText, fontSize: 13, fontFamily: FONT.regular },
  submit: { marginTop: SPACING.sm },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg, gap: 4 },
  switchText: { color: COLORS.textSecondary, fontSize: 15, fontFamily: FONT.regular },
  switchLink: { color: COLORS.accent, fontSize: 15, fontFamily: FONT.bold },
});

export default authStyles;
