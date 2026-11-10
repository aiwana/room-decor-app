/**
 * app/(main)/(tabs)/profile.tsx
 * Ho so: the tai khoan, 3 o thong ke, menu chia nhom, nut dang xuat tach rieng (tranh bam nham).
 * App bat buoc dang nhap nen o day luon co user.
 */
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MockModeNotice } from '@/components/common/Notice';
import ScanGuideSheet from '@/components/design/ScanGuideSheet';
import { COLORS, FONT, RADIUS, SPACING, TOUCH_MIN } from '@/constants/colors';
import { useDesigns } from '@/hooks/useDesigns';
import { useAuthStore } from '@/store/auth-store';
import type { IoniconName } from '@/types';

interface MenuItem {
  id: string;
  label: string;
  hint?: string;
  iconName: IoniconName;
  /** Co href -> chuyen man; khong co -> goi onPress */
  href?: Href;
  onPress?: () => void;
}

const Stat: React.FC<{ icon: IoniconName; value: string; label: string }> = ({ icon, value, label }) => (
  <View style={styles.statBox} accessible accessibilityLabel={`${value} ${label}`}>
    <Ionicons name={icon} size={18} color={COLORS.accent} />
    <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { designs } = useDesigns();
  const [guideOpen, setGuideOpen] = useState(false);

  const placedCount = designs.reduce((sum, d) => sum + d.placements.length, 0);
  // Tong dien tich da thiet ke (chi tinh thiet ke da mo tren may nay, co tom tat)
  const totalArea = designs.reduce((sum, d) => sum + (d.summary?.floorArea ?? 0), 0);
  const initials = (user?.name ?? '?')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  const handleLogout = (): void => {
    Alert.alert('Đăng xuất?', 'Bạn sẽ cần đăng nhập lại để dùng ứng dụng.', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: (): void => void logout() },
    ]);
  };

  const GROUPS: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Thiết kế',
      items: [
        { id: 'my-designs', label: 'Thiết kế của tôi', iconName: 'albums-outline', href: '/designs' },
        { id: 'furniture', label: 'Danh mục nội thất', iconName: 'grid-outline', href: '/furniture' },
        {
          id: 'guide',
          label: 'Cách chụp phòng cho chính xác',
          iconName: 'camera-outline',
          onPress: (): void => setGuideOpen(true),
        },
      ],
    },
    {
      title: 'Ứng dụng',
      items: [{ id: 'settings', label: 'Cài đặt', hint: 'Phiên bản, dữ liệu, kiểm tra kết nối', iconName: 'settings-outline', href: '/settings' }],
    },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle} accessibilityRole="header">
          Hồ sơ
        </Text>

        {/* ===== The tai khoan ===== */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name ?? ''}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user?.email ?? ''}
            </Text>
          </View>
          {user?.role ? (
            <View style={[styles.roleBadge, user.role === 'ADMIN' && styles.roleAdmin]}>
              <Text style={[styles.roleText, user.role === 'ADMIN' && styles.roleTextAdmin]}>
                {user.role === 'ADMIN' ? 'Quản trị' : 'Thành viên'}
              </Text>
            </View>
          ) : null}
        </View>

        <MockModeNotice style={styles.notice} />

        {/* ===== Thong ke ===== */}
        <View style={styles.stats}>
          <Stat icon="albums-outline" value={String(designs.length)} label="Thiết kế" />
          <Stat icon="cube-outline" value={String(placedCount)} label="Món đã đặt" />
          <Stat icon="resize-outline" value={totalArea > 0 ? `${Math.round(totalArea)} m²` : '–'} label="Đã thiết kế" />
        </View>

        {/* ===== Menu chia nhom ===== */}
        {GROUPS.map((group) => (
          <View key={group.title}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.menu}>
              {group.items.map((item, i) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.menuItem,
                    i === group.items.length - 1 && styles.menuItemLast,
                    pressed && styles.menuPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityHint={item.hint}
                  onPress={(): void => {
                    if (item.href) router.push(item.href);
                    else item.onPress?.();
                  }}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name={item.iconName} size={18} color={COLORS.textPrimary} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    {item.hint ? <Text style={styles.menuHint}>{item.hint}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.inactive} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.logout, pressed && styles.menuPressed]}
          onPress={handleLogout}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.dangerText} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>
      </ScrollView>
      <ScanGuideSheet visible={guideOpen} onClose={(): void => setGuideOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  screenTitle: { fontSize: 26, fontFamily: FONT.bold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontFamily: FONT.bold, color: COLORS.onAccent },
  userInfo: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, fontFamily: FONT.bold, color: COLORS.textPrimary },
  email: { fontSize: 13, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 10,
    height: 26,
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceAlt,
  },
  roleAdmin: { backgroundColor: COLORS.accentSoft },
  roleText: { fontSize: 12, fontFamily: FONT.semibold, color: COLORS.textSecondary },
  roleTextAdmin: { color: COLORS.accent },
  notice: { marginHorizontal: 0, marginTop: SPACING.md, marginBottom: 0 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statBox: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: { fontSize: 22, fontFamily: FONT.bold, color: COLORS.textPrimary },
  statLabel: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary },
  groupTitle: { fontSize: 13, fontFamily: FONT.semibold, color: COLORS.textSecondary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  menu: { borderRadius: RADIUS.md, backgroundColor: COLORS.surface, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.md,
    minHeight: 56,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.fill },
  menuPressed: { backgroundColor: COLORS.surfaceAlt },
  menuLabel: { fontSize: 15, fontFamily: FONT.regular, color: COLORS.textPrimary },
  menuHint: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: 2 },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: TOUCH_MIN + 4,
    marginTop: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutText: { fontSize: 15, fontFamily: FONT.semibold, color: COLORS.dangerText },
});
