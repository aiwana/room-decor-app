/**
 * src/screens/HomeScreen/styles.ts
 * Style rieng cua HomeScreen. Mau sac nay da chuyen sang @/constants/colors.
 */
import { StyleSheet } from 'react-native';

import { COLORS, SPACING } from '@/constants/colors';

const styles = StyleSheet.create({
  /* ---------- Screen & Header ---------- */
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  bellButton: { padding: 4 },
  /* ---------- Search bar ---------- */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: 12,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: COLORS.textPrimary },
  /* ---------- Main Action Area (2 o vuong lon) ---------- */
  mainActions: { flexDirection: 'row', gap: 12, marginTop: SPACING.lg, paddingHorizontal: SPACING.md },
  actionFlex: { flex: 1 },
  actionBox: {
    height: 140,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBoxText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  /* ---------- Quick Actions ---------- */
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  /* ---------- Danh sach ngang ---------- */
  listContent: { paddingHorizontal: SPACING.md },
});

export default styles;
