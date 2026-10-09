/**
 * src/screens/LoginScreen/styles.ts
 * Dung chung cho LoginScreen va RegisterScreen.
 */
import { StyleSheet } from 'react-native';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: SPACING.sm },
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

export default styles;
