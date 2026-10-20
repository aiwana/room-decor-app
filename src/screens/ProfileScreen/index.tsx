/**
 * src/screens/ProfileScreen/index.tsx
 * Profile theo trang thai dang nhap (AuthContext):
 *   - dang khoi phuc phien -> Loading
 *   - chua dang nhap       -> the "Khach" + nut Dang nhap / Dang ky
 *   - da dang nhap         -> thong tin user + nut Dang xuat
 *   - loi khoi phuc phien  -> thong bao + Thu lai / Dang xuat
 * Thong ke + menu luon hien (app van dung duoc khi chua dang nhap).
 */
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/common/Button';
import MockModeNotice from '@/components/common/MockModeNotice';
import { ErrorView, LoadingView } from '@/components/common/StateViews';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useDesigns } from '@/context/DesignContext';
import type { IoniconName, User } from '@/types';

import styles from './styles';

interface MenuItem {
  id: string;
  label: string;
  iconName: IoniconName;
  /** Co href -> chuyen man; khong co -> goi onPress */
  href?: Href;
  onPress?: () => void;
  danger?: boolean;
}

const UserCard: React.FC<{ user: User }> = ({ user }) => (
  <View style={styles.userCard}>
    {user.avatarUrl ? (
      <Image source={{ uri: user.avatarUrl }} style={styles.avatar} contentFit="cover" />
    ) : (
      <View style={[styles.avatar, styles.avatarPlaceholder]}>
        <Ionicons name="person" size={32} color={COLORS.textSecondary} />
      </View>
    )}
    <View style={styles.userInfo}>
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.email}>{user.email}</Text>
    </View>
  </View>
);

const ProfileScreen: React.FC = () => {
  const router = useRouter();
  const { status, user, restoreError, logout, retryRestore } = useAuth();
  const { savedDesigns } = useDesigns();

  const favoriteCount = savedDesigns.filter((d) => d.isFavorite).length;
  const signedIn = status === 'signedIn' && user !== null;

  const handleLogout = (): void => {
    Alert.alert('Đăng xuất?', 'Bạn sẽ cần đăng nhập lại để đồng bộ thiết kế.', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: (): void => void logout() },
    ]);
  };

  const MENU: MenuItem[] = [
    { id: 'my-designs', label: 'Thiết kế của tôi', iconName: 'images-outline', href: '/history' },
    {
      id: 'favorites',
      label: 'Thiết kế yêu thích',
      iconName: 'heart-outline',
      href: { pathname: '/history', params: { filter: 'favorite' } },
    },
    { id: 'catalog', label: 'Vật liệu & sản phẩm', iconName: 'grid-outline', href: '/catalog' },
    { id: 'settings', label: 'Cài đặt & kết nối máy chủ', iconName: 'settings-outline', href: '/settings' },
    {
      id: 'help',
      label: 'Trợ giúp',
      iconName: 'help-circle-outline',
      onPress: (): void => Alert.alert('Trợ giúp', 'Chức năng này sẽ có ở phiên bản sau.'),
    },
    ...(signedIn
      ? [{ id: 'logout', label: 'Đăng xuất', iconName: 'log-out-outline' as const, danger: true, onPress: handleLogout }]
      : []),
  ];

  if (status === 'restoring') {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <LoadingView message="Đang kiểm tra đăng nhập..." />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ErrorView message={restoreError ?? 'Không khôi phục được phiên đăng nhập.'} onRetry={retryRestore} />
        <Button title="Đăng xuất" variant="ghost" onPress={(): void => void logout()} style={styles.errorLogout} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ===== Thong tin user / khach ===== */}
        {signedIn ? (
          <UserCard user={user} />
        ) : (
          <>
            <View style={styles.userCard}>
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person-outline" size={32} color={COLORS.textSecondary} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.name}>Khách</Text>
                <Text style={styles.email}>Đăng nhập để lưu thiết kế vào tài khoản.</Text>
              </View>
            </View>
            <View style={styles.guestActions}>
              <Button title="Đăng nhập" onPress={(): void => router.push('/login')} style={styles.guestButton} />
              <Button
                title="Đăng ký"
                variant="secondary"
                onPress={(): void => router.push('/register')}
                style={styles.guestButton}
              />
            </View>
          </>
        )}

        <MockModeNotice style={styles.notice} />

        {/* ===== Thong ke ===== */}
        <View style={styles.stats}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{savedDesigns.length}</Text>
            <Text style={styles.statLabel}>Thiết kế</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{favoriteCount}</Text>
            <Text style={styles.statLabel}>Yêu thích</Text>
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
                if (item.href) {
                  router.navigate(item.href);
                } else {
                  item.onPress?.();
                }
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
};

export default ProfileScreen;
