/**
 * app/(main)/(tabs)/profile.tsx
 * Ho so: thong tin tai khoan (GET /api/users/me), thong ke, menu, dang xuat.
 * App bat buoc dang nhap nen o day luon co user.
 */
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MockModeNotice } from '@/components/common/Notice';
import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import { useDesigns } from '@/hooks/useDesigns';
import { useAuthStore } from '@/store/auth-store';
import type { IoniconName } from '@/types';

interface MenuItem {
  id: string;
  label: string;
  iconName: IoniconName;
  /** Co href -> chuyen man; khong co -> goi onPress */
  href?: Href;
  onPress?: () => void;
  danger?: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { designs } = useDesigns();

  const placedCount = designs.reduce((sum, d) => sum + d.placements.length, 0);

  const handleLogout = (): void => {
    Alert.alert('Đăng xuất?', 'Bạn sẽ cần đăng nhập lại để dùng ứng dụng.', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: (): void => void logout() },
    ]);
  };

  const MENU: MenuItem[] = [
    { id: 'my-designs', label: 'Thiết kế của tôi', iconName: 'albums-outline', href: '/designs' },
    { id: 'furniture', label: 'Danh mục nội thất', iconName: 'grid-outline', href: '/furniture' },
    { id: 'settings', label: 'Cài đặt & kết nối máy chủ', iconName: 'settings-outline', href: '/settings' },
    {
      id: 'help',
      label: 'Trợ giúp',
      iconName: 'help-circle-outline',
      onPress: (): void => Alert.alert('Trợ giúp', 'Chức năng này sẽ có ở phiên bản sau.'),
    },
    { id: 'logout', label: 'Đăng xuất', iconName: 'log-out-outline', danger: true, onPress: handleLogout },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ===== Thong tin tai khoan ===== */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name ?? '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.name}>{user?.name ?? ''}</Text>
            <Text style={styles.email}>{user?.email ?? ''}</Text>
            {user?.role ? (
              <View style={[styles.roleBadge, user.role === 'ADMIN' && styles.roleAdmin]}>
                <Text style={styles.roleText}>{user.role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <MockModeNotice style={styles.notice} />

        {/* ===== Thong ke ===== */}
        <View style={styles.stats}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{designs.length}</Text>
            <Text style={styles.statLabel}>Thiết kế</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{placedCount}</Text>
            <Text style={styles.statLabel}>Món đồ đã đặt</Text>
          </View>
        </View>

        {/* ===== Menu ===== */}
        <View style={styles.menu}>
          {MENU.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuPressed]}
              accessibilityRole="button"
              onPress={(): void => {
                if (item.href) router.push(item.href);
                else item.onPress?.();
              }}
            >
              <Ionicons name={item.iconName} size={20} color={item.danger ? COLORS.danger : COLORS.textPrimary} />
              <Text style={[styles.menuLabel, item.danger && styles.menuDanger]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.inactive} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.sm },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: 'bold', color: COLORS.accent },
  userInfo: { flex: 1 },
  name: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  email: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceAlt,
  },
  roleAdmin: { backgroundColor: COLORS.accent },
  roleText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
  notice: { marginHorizontal: 0, marginTop: SPACING.md, marginBottom: 0 },
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
