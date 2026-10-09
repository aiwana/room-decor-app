/**
 * src/constants/colors.ts
 * Bang mau dung chung cho TOAN app (Dark theme, accent cam dat).
 * Truoc day nam trong screens/HomeScreen/styles.ts -> chuyen ra day
 * de moi man hinh deu import tu 1 cho.
 */
export const COLORS = {
  background: '#1A1A1A',
  surface: '#262626',
  surfaceAlt: '#333333',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  accent: '#E67E22',
  accentSoft: 'rgba(230,126,34,0.15)',
  inactive: '#808080',
  danger: '#E74C3C',
  success: '#2ECC71',
  overlay: 'rgba(0,0,0,0.75)',
  greenFrom: '#27AE60',
  greenTo: '#2ECC71',
  slateFrom: '#34495E',
  slateTo: '#2C3E50',
} as const;

/** Khoang cach chuan (dung thay cho so "ma thuat" 8, 16, 24...) */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Bo goc chuan */
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
