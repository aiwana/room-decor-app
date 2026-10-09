/**
 * src/screens/ProfileScreen/index.tsx
 * Profile voi mock user. Dang nhap / dang xuat that lam khi co backend.
 */
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorView, LoadingView } from '@/components/common/StateViews';
import { COLORS } from '@/constants/colors';
import { useDesigns } from '@/context/DesignContext';
import { useAsync } from '@/hooks/useAsync';
import { userService } from '@/services/userService';
import type { IoniconName } from '@/types';

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

const comingSoon = (feature: string): void => {
  Alert.alert(feature, 'Chức năng này sẽ có ở phiên bản sau.');
};

const ProfileScreen: React.FC = () => {
  const router = useRouter();
  const { savedDesigns } = useDesigns();
  const { data: user, loading, error, reload } = useAsync(() => userService.getCurrentUser(), []);

  const favoriteCount = savedDesigns.filter((d) => d.isFavorite).length;

  const MENU: MenuItem[] = [
    { id: 'my-designs', label: 'Thiết kế của tôi', iconName: 'images-outline', href: '/history' },
    {
      id: 'favorites',
      label: 'Yêu thích',
      iconName: 'heart-outline',
      href: { pathname: '/history', params: { filter: 'favorite' } },
    },
    { id: 'history', label: 'Lịch sử', iconName: 'time-outline', href: '/history' },
    { id: 'catalog', label: 'Vật liệu & sản phẩm', iconName: 'grid-outline', href: '/catalog' },
    { id: 'settings', label: 'Cài đặt', iconName: 'settings-outline', onPress: (): void => comingSoon('Cài đặt') },
    { id: 'help', label: 'Trợ giúp', iconName: 'help-circle-outline', onPress: (): void => comingSoon('Trợ giúp') },
    {
      id: 'logout',
      label: 'Đăng xuất',
      iconName: 'log-out-outline',
      danger: true,
      onPress: (): void => comingSoon('Đăng xuất (cần backend)'),
    },
  ];

  if (loading) {
    return <LoadingView />;
  }
  if (error || !user) {
    return <ErrorView message="Không tải được thông tin tài khoản." onRetry={reload} />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ===== Thong tin user ===== */}
        <View style={styles.userCard}>
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} contentFit="cover" />
          <View style={styles.userInfo}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>

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
