import { StyleSheet } from 'react-native';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.sm },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.surfaceAlt },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  guestActions: { flexDirection: 'row', gap: 12, marginTop: SPACING.md },
  guestButton: { flex: 1 },
  errorLogout: { margin: SPACING.md },
  notice: { marginHorizontal: 0, marginTop: SPACING.md, marginBottom: 0 },
  userInfo: { flex: 1 },
  name: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  email: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 12, marginTop: SPACING.lg },
  statBox: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: COLORS.accent },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  menu: { marginTop: SPACING.lg, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.md,
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuPressed: { backgroundColor: COLORS.surfaceAlt },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  menuDanger: { color: COLORS.danger },
});

export default styles;
