/**
 * src/screens/ProductDetailScreen/index.tsx
 * MODULE PHU: chi tiet san pham + Yeu thich + Yeu cau bao gia / lien he.
 * URL: /catalog/[productId]
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Button from '@/components/common/Button';
import Chip from '@/components/common/Chip';
import { EmptyView, ErrorView, LoadingView } from '@/components/common/StateViews';
import { COLORS } from '@/constants/colors';
import { CATEGORIES } from '@/data/mock/categories';
import { useAsync } from '@/hooks/useAsync';
import { productService } from '@/services/productService';
import { firstParam, formatVnd } from '@/utils/format';

import styles from './styles';

const ProductDetailScreen: React.FC = () => {
  const router = useRouter();
  const productId = firstParam(useLocalSearchParams<{ productId: string }>().productId) ?? '';

  const { data, loading, error, reload } = useAsync(async () => {
    const [product, favIds] = await Promise.all([
      productService.getProductById(productId),
      productService.getFavoriteIds(),
    ]);
    return { product, isFavorite: favIds.includes(productId) };
  }, [productId]);

  // null = nguoi dung chua bam -> dung gia tri mac dinh tu du lieu
  const [favoriteOverride, setFavoriteOverride] = useState<boolean | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message="Không tải được sản phẩm." onRetry={reload} />;
  const product = data?.product;
  if (!product) return <EmptyView iconName="cube-outline" title="Không tìm thấy sản phẩm" />;

  const isFavorite = favoriteOverride ?? data?.isFavorite ?? false;
  const color = selectedColor ?? product.colors[0] ?? null;
  const size = selectedSize ?? product.sizes[0] ?? null;

  const handleToggleFavorite = async (): Promise<void> => {
    const next = !isFavorite;
    setFavoriteOverride(next); // cap nhat UI truoc cho muot
    await productService.setFavorite(productId, next);
  };

  const categoryLabel = CATEGORIES.find((c) => c.id === product.categoryId)?.label ?? '';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Image source={{ uri: product.imageUrl }} style={styles.image} contentFit="cover" transition={200} />

        <View style={styles.body}>
          {/* ===== Ten, gia, yeu thich ===== */}
          <View style={styles.titleRow}>
            <View style={styles.titleText}>
              <Text style={styles.category}>
                {categoryLabel} · {product.brand}
              </Text>
              <Text style={styles.name}>{product.name}</Text>
            </View>
            <Pressable
              style={styles.heart}
              onPress={(): void => void handleToggleFavorite()}
              accessibilityLabel={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? COLORS.danger : COLORS.textPrimary}
              />
            </Pressable>
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#F1C40F" />
            <Text style={styles.rating}>
              {product.rating.toFixed(1)} · {product.reviewCount} đánh giá
            </Text>
          </View>
          <Text style={styles.price}>
            {formatVnd(product.price)} <Text style={styles.unit}>/ {product.unit}</Text>
          </Text>

          {/* ===== Mau ===== */}
          {product.colors.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Màu sắc</Text>
              <View style={styles.chipWrap}>
                {product.colors.map((c) => (
                  <Chip key={c} label={c} selected={color === c} onPress={(): void => setSelectedColor(c)} />
                ))}
              </View>
            </>
          ) : null}

          {/* ===== Kich thuoc ===== */}
          {product.sizes.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Kích thước / quy cách</Text>
              <View style={styles.chipWrap}>
                {product.sizes.map((s) => (
                  <Chip key={s} label={s} selected={size === s} onPress={(): void => setSelectedSize(s)} />
                ))}
              </View>
            </>
          ) : null}

          {/* ===== Mo ta ===== */}
          <Text style={styles.sectionTitle}>Mô tả</Text>
          <Text style={styles.description}>{product.description}</Text>

          {/* ===== Thong so ky thuat ===== */}
          <Text style={styles.sectionTitle}>Thông số kỹ thuật</Text>
          <View style={styles.specTable}>
            {[{ label: 'Thương hiệu', value: product.brand }, ...product.specs].map((spec) => (
              <View key={spec.label} style={styles.specRow}>
                <Text style={styles.specLabel}>{spec.label}</Text>
                <Text style={styles.specValue}>{spec.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ===== Bao gia / lien he ===== */}
      <View style={styles.footer}>
        <Button
          title="Yêu cầu báo giá / liên hệ"
          iconName="document-text-outline"
          onPress={(): void =>
            router.push({
              pathname: '/quote-request',
              params: {
                productId: product.id,
                variant: [color, size].filter(Boolean).join(' · '),
              },
            })
          }
        />
      </View>
    </View>
  );
};

export default ProductDetailScreen;
