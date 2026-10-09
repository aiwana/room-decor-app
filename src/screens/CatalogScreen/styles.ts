import { StyleSheet } from 'react-native';

import { COLORS, SPACING } from '@/constants/colors';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  categories: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  categoriesLoading: { height: 38, marginRight: SPACING.sm },
  body: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl, gap: 12 },
  column: { justifyContent: 'space-between' },
  cell: { width: '48%' },
});

export default styles;
