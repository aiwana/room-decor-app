/**
 * src/components/design/ScanGuideSheet.tsx
 * Bang "Cach chup cho chinh xac": huong dan nguoi dung chup anh phong de AI quet ra mat bang dung nhat,
 * ho chi phai sua lai it.
 *   - So do nhin tu tren xuong: 5 vi tri dung chup (1..5), hinh quat = huong may nhin.
 *     Vi tri chup tinh theo GOC PHONG, khong theo cua ra vao (cua moi nha mot cho khac nhau).
 *   - Vi du anh dung (chup ngang, thay ca duong chan tuong lan tran) / anh sai (chup doc, bi do che)
 *   - 5 meo ngan + nhac do bang thuoc (o "Do them cho chinh xac hon" khong bat buoc)
 * Thu tu 1..5 trung voi goi y o CornerPhotosPicker (anh chinh = vi tri 1, goc 1..4 = vi tri 2..5).
 */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import Button from '@/components/common/Button';
import { COLORS, FONT, RADIUS, SPACING } from '@/constants/colors';
import type { IoniconName } from '@/types';

/* ---------------------------- So do mat bang ---------------------------- */
/** Phong chu L nhin tu tren: phan chinh + 1 hoc ben phai, cua o tuong duoi */
const ROOM = '30,20 230,20 230,120 280,120 280,190 30,190';
const DOOR = { x1: 60, x2: 100, y: 190 };

/** Vi tri dung chup + diem may huong toi (toa do cua so do) */
const SPOTS: { n: number; x: number; y: number; tx: number; ty: number }[] = [
  { n: 1, x: 48, y: 172, tx: 225, ty: 25 }, // 1 goc bat ky -> cheo sang goc doi dien
  { n: 2, x: 212, y: 38, tx: 35, ty: 185 }, // goc doi dien -> cheo nguoc lai
  { n: 3, x: 48, y: 38, tx: 225, ty: 185 }, // goc trai tren -> cheo sang phai duoi
  { n: 4, x: 212, y: 172, tx: 35, ty: 25 }, // goc phai duoi -> cheo sang trai tren
  { n: 5, x: 262, y: 175, tx: 235, ty: 122 }, // trong hoc / phan gap khuc
];

const FOV_DEG = 28; // nua goc nhin cua hinh quat
const FOV_LEN = 46;

/** Hinh quat goc nhin tu (x,y) huong ve (tx,ty) */
const fov = (x: number, y: number, tx: number, ty: number): string => {
  const a = Math.atan2(ty - y, tx - x);
  const d = (FOV_DEG * Math.PI) / 180;
  const p = (ang: number): string => `${(x + FOV_LEN * Math.cos(ang)).toFixed(1)},${(y + FOV_LEN * Math.sin(ang)).toFixed(1)}`;
  return `${x},${y} ${p(a - d)} ${p(a)} ${p(a + d)}`;
};

const RoomDiagram: React.FC = () => (
  <Svg width="100%" height={210} viewBox="0 0 310 215" accessibilityLabel="Sơ đồ 5 vị trí đứng chụp trong phòng">
    <Polygon points={ROOM} fill={COLORS.surfaceAlt} stroke={COLORS.textSecondary} strokeWidth={4} strokeLinejoin="round" />
    {/* cua ra vao: xoa 1 doan tuong + canh cua mo */}
    <Line x1={DOOR.x1} y1={DOOR.y} x2={DOOR.x2} y2={DOOR.y} stroke={COLORS.surfaceAlt} strokeWidth={6} />
    <Line x1={DOOR.x1} y1={DOOR.y} x2={DOOR.x1 + 12} y2={DOOR.y - 36} stroke={COLORS.inactive} strokeWidth={2} />
    <SvgText x={(DOOR.x1 + DOOR.x2) / 2} y={208} fill={COLORS.textSecondary} fontSize={11} textAnchor="middle">
      Cửa ra vào
    </SvgText>
    {SPOTS.map((s) => (
      <Polygon key={`f${s.n}`} points={fov(s.x, s.y, s.tx, s.ty)} fill={COLORS.accentSoft} stroke={COLORS.accent} strokeWidth={1} />
    ))}
    {SPOTS.map((s) => (
      <G key={`s${s.n}`}>
        <Circle cx={s.x} cy={s.y} r={10} fill={COLORS.accent} />
        <SvgText x={s.x} y={s.y + 4} fill={COLORS.onAccent} fontSize={12} fontWeight="bold" textAnchor="middle">
          {s.n}
        </SvgText>
      </G>
    ))}
  </Svg>
);

/* --------------------------- Anh dung / anh sai --------------------------- */
/** Anh dung: chup ngang, thay goc tuong, duong chan tuong (san) va duong tran */
const GoodShot: React.FC = () => (
  <Svg width={128} height={80} viewBox="0 0 128 80">
    <Rect x={1} y={1} width={126} height={78} rx={6} fill={COLORS.surfaceAlt} stroke={COLORS.success} strokeWidth={2} />
    {/* tran */}
    <Polyline points="4,8 64,20 124,8" fill="none" stroke={COLORS.textSecondary} strokeWidth={1.5} />
    {/* goc tuong */}
    <Line x1={64} y1={20} x2={64} y2={58} stroke={COLORS.textSecondary} strokeWidth={1.5} />
    {/* chan tuong / san */}
    <Polyline points="4,74 64,58 124,74" fill="none" stroke={COLORS.success} strokeWidth={2.5} />
    {/* cua ra vao */}
    <Rect x={84} y={30} width={16} height={34} fill="none" stroke={COLORS.textSecondary} strokeWidth={1.2} />
    {/* ghe nho, khong che goc */}
    <Rect x={16} y={56} width={22} height={10} rx={2} fill={COLORS.inactive} />
  </Svg>
);

/** Anh sai: chup doc, chi thay 1 manh tuong, sofa che mat chan tuong */
const BadShot: React.FC = () => (
  <Svg width={60} height={80} viewBox="0 0 60 80">
    <Rect x={1} y={1} width={58} height={78} rx={6} fill={COLORS.surfaceAlt} stroke={COLORS.dangerText} strokeWidth={2} />
    <Line x1={8} y1={14} x2={52} y2={14} stroke={COLORS.textSecondary} strokeWidth={1.2} />
    {/* sofa che kin chan tuong */}
    <Rect x={4} y={44} width={52} height={30} rx={4} fill={COLORS.inactive} />
    <Rect x={4} y={38} width={52} height={10} rx={3} fill={COLORS.textSecondary} />
  </Svg>
);

/* --------------------------------- Meo --------------------------------- */
const TIPS: { icon: IoniconName; title: string; text: string }[] = [
  {
    icon: 'phone-landscape-outline',
    title: 'Cầm ngang, ngang ngực, giữ thẳng',
    text: 'Không chúc xuống hay ngửa lên. Ảnh phải thấy cả đường chân tường lẫn đường trần.',
  },
  {
    icon: 'scan-outline',
    title: 'Chụp từ góc, nhìn chéo phòng',
    text: 'Đứng sát một góc phòng, lùi hết cỡ. Thấy được 2 bức tường trong 1 ảnh là tốt nhất.',
  },
  {
    icon: 'contract-outline',
    title: 'Phòng nhỏ, hẹp (bếp, phòng ngủ nhỏ)',
    text: 'Đứng ở mép phòng hoặc ngay ngưỡng cửa, bật chế độ góc rộng (0.5x) nếu máy có, rồi chụp thêm các góc.',
  },
  {
    icon: 'cube-outline',
    title: 'Phòng nhiều đồ',
    text: 'Không cần dọn hết, chỉ cần thấy được chân tường ở mỗi góc. Chỗ nào bị che thì chụp thêm 1 ảnh từ góc khác.',
  },
  {
    icon: 'sunny-outline',
    title: 'Bật hết đèn, kéo rèm',
    text: 'Phòng tối hoặc ngược sáng làm AI không thấy rõ góc tường.',
  },
  {
    icon: 'copy-outline',
    title: 'Các ảnh nên trùng nhau một phần',
    text: 'Ảnh sau nên thấy lại 1 món của ảnh trước (cửa, tủ, cửa sổ) để AI ghép đúng.',
  },
  {
    icon: 'resize-outline',
    title: 'Có thước dây thì đo thêm',
    text: 'Nhập chiều dài, chiều rộng phòng ở mục "Đo thêm cho chính xác hơn". Không đo cũng được.',
  },
];

/* -------------------------------- Bang -------------------------------- */
interface ScanGuideSheetProps {
  visible: boolean;
  onClose: () => void;
}

const ScanGuideSheet: React.FC<ScanGuideSheetProps> = ({ visible, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Đóng" />
      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Cách chụp cho chính xác</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Đóng">
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.lead}>
            Chụp đúng cách thì AI dựng mặt bằng gần đúng ngay, bạn chỉ cần chỉnh lại một chút.
          </Text>

          <Text style={styles.section}>Đứng ở đâu để chụp</Text>
          <View style={styles.card}>
            <RoomDiagram />
            <Text style={styles.spot}>
              <Text style={styles.spotN}>1 </Text>Ảnh chính: đứng sát một góc phòng (góc nào thấy được nhiều tường
              nhất), chụp chéo về góc đối diện.
            </Text>
            <Text style={styles.spot}>
              <Text style={styles.spotN}>2 </Text>Sang góc đối diện đó, chụp chéo ngược lại.
            </Text>
            <Text style={styles.spot}>
              <Text style={styles.spotN}>3 4 </Text>Hai góc còn lại, mỗi góc chụp chéo sang góc đối diện.
            </Text>
            <Text style={styles.spot}>
              <Text style={styles.spotN}>5 </Text>Chỗ tường gấp khúc, hốc tường (nếu phòng không vuông).
            </Text>
            <Text style={styles.note}>
              Cửa phòng nằm ở đâu cũng được, cứ đứng theo các góc phòng. Góc nào bị tủ, giường chắn thì đứng lùi ra
              cạnh đó. Chỉ ảnh 1 là bắt buộc, thêm ảnh 2 đến 5 thì AI đoán hình dạng phòng đúng hơn.
            </Text>
          </View>

          <Text style={styles.section}>Ảnh tốt và ảnh chưa tốt</Text>
          <View style={styles.examples}>
            <View style={styles.example}>
              <GoodShot />
              <View style={styles.exampleLabel}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.exampleText}>Chụp ngang, thấy góc tường, sàn và trần</Text>
              </View>
            </View>
            <View style={styles.example}>
              <BadShot />
              <View style={styles.exampleLabel}>
                <Ionicons name="close-circle" size={16} color={COLORS.dangerText} />
                <Text style={styles.exampleText}>Chụp dọc, đồ đạc che chân tường</Text>
              </View>
            </View>
          </View>

          <Text style={styles.section}>Mẹo nhỏ</Text>
          {TIPS.map((t) => (
            <View key={t.title} style={styles.tip}>
              <Ionicons name={t.icon} size={22} color={COLORS.accent} />
              <View style={styles.tipBody}>
                <Text style={styles.tipTitle}>{t.title}</Text>
                <Text style={styles.tipText}>{t.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Đã hiểu" iconName="checkmark-outline" onPress={onClose} />
        </View>
      </SafeAreaView>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay },
  sheet: {
    maxHeight: '92%',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 18, fontFamily: FONT.bold, color: COLORS.textPrimary },
  body: { padding: SPACING.md, paddingBottom: SPACING.lg },
  lead: { fontSize: 15, fontFamily: FONT.regular, color: COLORS.textSecondary },
  section: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  card: { padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  spot: { fontSize: 15, fontFamily: FONT.regular, color: COLORS.textPrimary, marginTop: 6 },
  spotN: { fontFamily: FONT.bold, color: COLORS.accent },
  note: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: SPACING.sm },
  examples: { flexDirection: 'row', gap: SPACING.sm },
  example: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  exampleLabel: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: SPACING.sm },
  exampleText: { flex: 1, fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary },
  tip: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  tipBody: { flex: 1 },
  tipTitle: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.textPrimary },
  tipText: { fontSize: 13, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: 2 },
  footer: { paddingHorizontal: SPACING.md, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
});

export default ScanGuideSheet;
