/**
 * src/screens/ResultScreen/index.tsx
 * Ket qua AI: anh Truoc/Sau, thong tin, Luu / Thiet ke lai / Chia se,
 * va "Vat lieu duoc su dung" -> noi sang module Catalog.
 * URL: /result/[id]
 */
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Button from '@/components/common/Button';
import Chip from '@/components/common/Chip';
import MockModeNotice from '@/components/common/MockModeNotice';
import SectionHeader from '@/components/common/SectionHeader';
import { EmptyView, ErrorView, LoadingView } from '@/components/common/StateViews';
import BeforeAfterView from '@/components/decor/BeforeAfterView';
import MaterialItem from '@/components/design/MaterialItem';
import { COLORS } from '@/constants/colors';
import { getColorTheme, getRoomTypeLabel, getStyleLabel } from '@/constants/decorOptions';
import { useDesigns } from '@/context/DesignContext';
import { useAsync } from '@/hooks/useAsync';
import { productService } from '@/services/productService';
import type { Design } from '@/types';
import { showError } from '@/utils/alert';
import { firstParam, formatDate } from '@/utils/format';

import styles from './styles';

const ResultScreen: React.FC = () => {
  const router = useRouter();
  const id = firstParam(useLocalSearchParams<{ id: string }>().id) ?? '';
  const { getDesign, isSaved, saveDesign, toggleFavorite, refreshDesign, loading } = useDesigns();
  const design: Design | undefined = getDesign(id);
  const saved = isSaved(id);

  const [saving, setSaving] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  /* --------- Tai thong tin vat lieu (module Catalog) --------- */
  const productIds = design?.products.map((p) => p.productId).join(',') ?? '';
  const {
    data: products = [],
    loading: productsLoading,
    error: productsError,
    reload: reloadProducts,
  } = useAsync(
    () => (productIds ? productService.getProductsByIds(productIds.split(',')) : Promise.resolve([])),
    [productIds],
  );

  /* ---------------- Trang thai dac biet ---------------- */
  if (!design) {
    return loading ? (
      <LoadingView />
    ) : (
      <EmptyView
        iconName="search-outline"
        title="Không tìm thấy thiết kế"
        message="Thiết kế này có thể đã bị xoá."
        actionLabel="Tạo thiết kế mới"
        onAction={(): void => router.navigate('/ai-decor')}
      />
    );
  }

  const handleRedesign = (): void => {
    router.navigate({
      pathname: '/ai-decor',
      params: {
        imageUri: design.originalImageUri,
        roomType: design.roomType,
        style: design.style,
        colorTheme: design.colorTheme ?? '',
      },
    });
  };

  if (design.status === 'failed') {
    return (
      <ErrorView
        message={design.errorMessage ?? 'AI chưa thiết kế được ảnh này.'}
        onRetry={handleRedesign}
      />
    );
  }

  /* ---------------- Handlers ---------------- */
  const handleSave = async (): Promise<void> => {
    if (saving) return;
    setSaving(true);
    try {
      await saveDesign(design.id);
    } catch (e) {
      showError('Không lưu được thiết kế', e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFavorite = async (): Promise<void> => {
    try {
      await toggleFavorite(design.id);
    } catch (e) {
      showError('Không cập nhật được yêu thích', e);
    }
  };

  /** AI con 'processing' -> hoi lai may chu (mock luon 'done' nen khong gap) */
  const handleRefresh = async (): Promise<void> => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshDesign(design.id);
    } catch (e) {
      showError('Không kiểm tra được trạng thái', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleShare = (): void => {
    void Share.share({
      message: `Thiết kế ${getStyleLabel(design.style)} cho ${getRoomTypeLabel(design.roomType)} bằng Room Decor AI: ${design.resultImageUrl}`,
    });
  };

  const color = design.colorTheme ? getColorTheme(design.colorTheme) : undefined;

  /* ---------------- Render ---------------- */
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {design.status === 'processing' ? (
        <View style={styles.processing}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.processingText}>AI đang xử lý thiết kế...</Text>
          <Button
            title="Kiểm tra lại"
            iconName="refresh"
            variant="ghost"
            onPress={(): void => void handleRefresh()}
            loading={refreshing}
          />
        </View>
      ) : (
        <BeforeAfterView beforeUri={design.originalImageUri} afterUri={design.resultImageUrl} />
      )}

      {/* ===== Thong tin ===== */}
      <View style={styles.infoRow}>
        <View style={styles.infoText}>
          <Text style={styles.title}>
            {getStyleLabel(design.style)} · {getRoomTypeLabel(design.roomType)}
          </Text>
          <Text style={styles.date}>Tạo ngày {formatDate(design.createdAt)}</Text>
        </View>
        <Pressable
          style={styles.heart}
          onPress={(): void => void handleToggleFavorite()}
          accessibilityRole="button"
          accessibilityLabel={design.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
        >
          <Ionicons
            name={design.isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            color={design.isFavorite ? COLORS.danger : COLORS.textPrimary}
          />
        </Pressable>
      </View>
      <View style={styles.chips}>
        <Chip label={getRoomTypeLabel(design.roomType)} iconName="home-outline" />
        <Chip label={getStyleLabel(design.style)} iconName="color-wand-outline" />
        {color ? <Chip label={color.label} swatchColor={color.hex} /> : null}
      </View>
      {design.prompt ? <Text style={styles.prompt}>“{design.prompt}”</Text> : null}

      {/* ===== Hanh dong ===== */}
      <View style={styles.actions}>
        <Button
          title={saved ? 'Đã lưu' : 'Lưu thiết kế'}
          iconName={saved ? 'checkmark-circle' : 'bookmark-outline'}
          onPress={(): void => void handleSave()}
          disabled={saved}
          loading={saving}
          style={styles.actionFlex}
        />
        <Button title="Thiết kế lại" iconName="refresh" variant="secondary" onPress={handleRedesign} style={styles.actionFlex} />
        <Button
          title=""
          accessibilityLabel="Chia sẻ thiết kế"
          iconName="share-social-outline"
          variant="secondary"
          onPress={handleShare}
          style={styles.shareBtn}
        />
      </View>
      {saved ? <MockModeNotice style={styles.notice} message="Chế độ minh họa: thiết kế được lưu trên máy này." /> : null}

      {/* ===== Vat lieu duoc su dung (noi sang Catalog) ===== */}
      <SectionHeader
        title="Vật liệu / sản phẩm được sử dụng"
        actionLabel="Xem thêm"
        onAction={(): void => router.push('/catalog')}
      />
      {productsLoading ? (
        <ActivityIndicator color={COLORS.accent} style={styles.materialsLoading} />
      ) : productsError ? (
        <Pressable onPress={reloadProducts}>
          <Text style={styles.materialsError}>Không tải được vật liệu. Bấm để thử lại.</Text>
        </Pressable>
      ) : (
        design.products.map((dp) => {
          const product = products.find((p) => p.id === dp.productId);
          return product ? (
            <MaterialItem
              key={`${dp.productId}-${dp.usage}`}
              product={product}
              usage={dp.usage}
              onPress={(p): void => router.push({ pathname: '/catalog/[productId]', params: { productId: p.id } })}
            />
          ) : null;
        })
      )}
    </ScrollView>
  );
};

export default ResultScreen;
