import { StyleSheet } from 'react-native';

import { COLORS, SPACING } from '@/constants/colors';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  filters: { flexDirection: 'row', paddingHorizontal: SPACING.md, marginTop: SPACING.md },
  body: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl, gap: 12 },
  column: { justifyContent: 'space-between' },
  cell: { width: '48%' },
});

export default styles;
