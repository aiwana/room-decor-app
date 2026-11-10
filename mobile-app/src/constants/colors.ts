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
  /** Nen nut nguy hiem (chu trang tren nen nay). KHONG dung lam mau chu tren nen toi: chi 3.96:1 tren surface */
  danger: '#E74C3C',
  /** Chu / icon mau do tren nen toi: 5.42:1 tren surface #262626, 6.2:1 tren background (UI UX Pro Max: >= 4.5:1) */
  dangerText: '#FF6B5E',
  dangerSoft: 'rgba(231,76,60,0.12)',
  success: '#2ECC71',
  /** Chu / icon canh bao (vang) tren nen toi: ~8:1 tren surface #262626 */
  warningText: '#F5B041',
  warningSoft: 'rgba(245,176,65,0.12)',
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
 * Font chu: Be Vietnam Pro (thiet ke cho tieng Viet, dau ro va can doi hon font he thong).
 * Font tu nap KHONG doi net theo fontWeight tren Android -> moi do dam la 1 ten font rieng.
 * Quy uoc: dung fontFamily: FONT.xxx, KHONG dung fontWeight.
 * Nap font o app/_layout.tsx (useFonts); chua nap xong thi he thong tu dung font mac dinh.
 */
export const FONT = {
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semibold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
} as const;

/**
 * Thang co chu (UI UX Pro Max: it co chu, ro vai tro). Ca app chi dung 6 co nay:
 *   12 caption · 13 label · 15 body · 18 headline · 22 titleSm · 26 title
 * (Truoc day app dung 14 co chu le te tu 10 den 30.)
 */
export const FONT_SIZE = {
  caption: 12,
  label: 13,
  body: 15,
  headline: 18,
  titleSm: 22,
  title: 26,
} as const;

export const TYPE = {
  /** Tieu de man hinh */
  title: { fontSize: FONT_SIZE.title, fontFamily: FONT.bold, lineHeight: 34 },
  /** Tieu de khoi / section */
  headline: { fontSize: FONT_SIZE.headline, fontFamily: FONT.bold, lineHeight: 24 },
  /** Chu chinh */
  body: { fontSize: FONT_SIZE.body, fontFamily: FONT.regular, lineHeight: 22 },
  /** Nhan nut, ten the */
  label: { fontSize: FONT_SIZE.label, fontFamily: FONT.semibold, lineHeight: 18 },
  /** Chu thich nho nhat duoc phep */
  caption: { fontSize: FONT_SIZE.caption, fontFamily: FONT.regular, lineHeight: 16 },
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
