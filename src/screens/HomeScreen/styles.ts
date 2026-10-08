/**
 * src/screens/HomeScreen/styles.ts
 * Toan bo style cua HomeScreen khai bao bang StyleSheet.create
 * (chuan PROG3002 - khong inline style tinh, chi inline gia tri dong).
 * Theme: Dark #1A1A1A giong Hypic, accent cam dat #E67E22.
 */
import { StyleSheet } from 'react-native';

export const COLORS = {
  background: '#1A1A1A',
  surface: '#262626',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  accent: '#E67E22',
  inactive: '#808080',
  greenFrom: '#27AE60',
  greenTo: '#2ECC71',
  slateFrom: '#34495E',
  slateTo: '#2C3E50',
} as const;

const styles = StyleSheet.create({
  /* ---------- Screen & Header ---------- */
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  bellButton: {
    padding: 4,
  },
  /* ---------- Search bar ---------- */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  /* ---------- Quick Actions ---------- */
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 16,
    rowGap: 16,
  },
  /* ---------- Main Action Area (2 o vuong lon) ---------- */
  mainActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingHorizontal: 16,
  },
  actionBox: {
    flex: 1,
    height: 140,
    borderRadius: 16,
    padding: 16,
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
  /* ---------- Sections (Trending / Projects) ---------- */
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
    paddingHorizontal: 16,
    marginTop: 28,
  },
  listContent: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  debugText: {
    position: 'absolute',
    opacity: 0,
    fontSize: 1,
  },
  /* ---------- Loading ---------- */
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});

export default styles;
