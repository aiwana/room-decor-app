/**
 * src/constants/colors.ts
 * Bang mau dung chung cho TOAN app (Dark theme, accent cam dat) - giu y nhu ban cu.
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
  /** Chu/icon dat TREN nen cam: chu trang tren cam chi ~3:1 (kho doc), chu toi ~5.8:1 */
  onAccent: '#1A1A1A',
  /** Chu phu / placeholder / icon tat. #808080 cu chi ~4.4:1 tren nen (duoi muc 4.5:1) */
  inactive: '#8C8C8C',
  danger: '#E74C3C',
  dangerSoft: 'rgba(231,76,60,0.12)',
  success: '#2ECC71',
  overlay: 'rgba(0,0,0,0.75)',
  /** 2 o lon tren Trang chu (giu nhu ban cu) */
  greenFrom: '#27AE60',
  greenTo: '#2ECC71',
  slateFrom: '#34495E',
  slateTo: '#2C3E50',
  /** Nen o nhap (tim kiem...) va nut tron tren nen toi */
  fill: 'rgba(255,255,255,0.08)',
  /** Vien net dut cua khung chon anh */
  borderStrong: 'rgba(255,255,255,0.2)',
} as const;

/** Khoang cach chuan (dung thay cho so "ma thuat" 8, 16, 24...) */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/**
 * Thang co chu: moi chu trong app chon 1 vai tro o day thay vi tu dat fontSize.
 * (Truoc day app dung 16 co chu khac nhau tu 9 den 30 nen cac man trong "lech" nhau.)
 */
export const TYPE = {
  /** Tieu de man hinh */
  title: { fontSize: 26, fontWeight: '700' },
  /** Tieu de khoi / section */
  headline: { fontSize: 18, fontWeight: '700' },
  /** Chu chinh */
  body: { fontSize: 15, fontWeight: '400' },
  /** Nhan nut, ten the */
  label: { fontSize: 13, fontWeight: '600' },
  /** Chu thich nho nhat duoc phep */
  caption: { fontSize: 12, fontWeight: '400' },
} as const;

/** Vung bam toi thieu (iOS 44pt, Android 48dp) */
export const TOUCH_MIN = 44;

/** Bo goc chuan */
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
