/**
 * src/screens/HistoryScreen/index.tsx
 * Lich su thiet ke da luu: mo lai, xoa, yeu thich, loc "Yeu thich".
 * Nhan param ?filter=favorite (tu Profile -> Yeu thich).
 */
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Chip from '@/components/common/Chip';
import MockModeNotice from '@/components/common/MockModeNotice';
import { EmptyView, ErrorView, LoadingView } from '@/components/common/StateViews';
import DesignCard from '@/components/design/DesignCard';
import { COLORS } from '@/constants/colors';
import { useDesigns } from '@/context/DesignContext';
import type { Design } from '@/types';
import { showError } from '@/utils/alert';
import { firstParam } from '@/utils/format';

import styles from './styles';

type Filter = 'all' | 'favorite';

const HistoryScreen: React.FC = () => {
  const router = useRouter();
  const filterParam = firstParam(useLocalSearchParams<{ filter?: string }>().filter);
  const { savedDesigns, loading, error, needsLogin, reload, removeDesign, toggleFavorite } = useDesigns();
  const [filter, setFilter] = useState<Filter>('all');

  // Mo tu Profile -> "Yeu thich": ap dung filter tu URL (cap nhat trong luc render).
  // URL doi sang khong co filter (vd bam "Lich su") -> quay ve "Tat ca".
  const [appliedParam, setAppliedParam] = useState<string | undefined>(undefined);
  if (filterParam !== appliedParam) {
    setAppliedParam(filterParam);
    setFilter(filterParam === 'favorite' ? 'favorite' : 'all');
  }

  const data = useMemo<Design[]>(
    () => (filter === 'favorite' ? savedDesigns.filter((d) => d.isFavorite) : savedDesigns),
    [filter, savedDesigns],
  );

  const handleOpen = (design: Design): void => {
    router.push({ pathname: '/result/[id]', params: { id: design.id } });
  };

  const handleDelete = (design: Design): void => {
    Alert.alert('Xoá thiết kế?', 'Thiết kế này sẽ bị xoá khỏi lịch sử.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: (): void => {
          removeDesign(design.id).catch((e: unknown) => showError('Không xoá được thiết kế', e));
        },
      },
    ]);
  };

  const handleToggleFavorite = (design: Design): void => {
    toggleFavorite(design.id).catch((e: unknown) => showError('Không cập nhật được yêu thích', e));
  };

  /* ---------------- Render ---------------- */
  const renderBody = (): React.JSX.Element => {
    if (needsLogin) {
      return (
        <EmptyView
          iconName="lock-closed-outline"
          title="Đăng nhập để xem lịch sử"
          message="Lịch sử thiết kế được lưu theo tài khoản trên máy chủ."
          actionLabel="Đăng nhập"
          onAction={(): void => router.push('/login')}
        />
      );
    }
    if (loading && savedDesigns.length === 0) {
      return <LoadingView message="Đang tải lịch sử..." />;
    }
    if (error) {
      return <ErrorView message={error} onRetry={reload} />;
    }
    if (data.length === 0) {
      return filter === 'favorite' ? (
        <EmptyView
          iconName="heart-outline"
          title="Chưa có thiết kế yêu thích"
          message="Bấm ♥ trên một thiết kế để lưu vào đây."
        />
      ) : (
        <EmptyView
          iconName="sparkles-outline"
          title="Chưa có thiết kế nào"
          message="Hãy chụp ảnh căn phòng và để AI thiết kế giúp bạn."
          actionLabel="Thiết kế ngay"
          onAction={(): void => router.navigate('/ai-decor')}
        />
      );
    }
    return (
      <FlatList
        data={data}
        keyExtractor={(item): string => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor={COLORS.accent} />
        }
        renderItem={({ item }): React.JSX.Element => (
          // Boc trong 1 o rong 48% de hang le (1 item) khong bi gian full man hinh
          <View style={styles.cell}>
            <DesignCard
              design={item}
              onPress={handleOpen}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
            />
          </View>
        )}
      />
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.title}>Lịch sử thiết kế</Text>
      <MockModeNotice />
      <View style={styles.filters}>
        <Chip label={`Tất cả (${savedDesigns.length})`} selected={filter === 'all'} onPress={(): void => setFilter('all')} />
        <Chip
          label="Yêu thích"
          iconName="heart"
          selected={filter === 'favorite'}
          onPress={(): void => setFilter('favorite')}
        />
      </View>
      <View style={styles.body}>{renderBody()}</View>
    </SafeAreaView>
  );
};

export default HistoryScreen;
