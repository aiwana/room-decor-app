/**
 * src/screens/CatalogScreen/index.tsx
 * MODULE PHU: danh muc + luoi san pham. Khong nam trong bottom tab,
 * mo tu Home ("Vat lieu noi bat") hoac Result ("Xem them").
 * Nhan param ?category=tile de mo san 1 danh muc.
 */
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ProductCard from '@/components/catalog/ProductCard';
import Chip from '@/components/common/Chip';
import { EmptyView, ErrorView, LoadingView } from '@/components/common/StateViews';
import { getCategoryIcon } from '@/constants/categoryIcons';
import { COLORS } from '@/constants/colors';
import { useAsync } from '@/hooks/useAsync';
import { getErrorMessage } from '@/services/apiError';
import { productService } from '@/services/productService';
import type { CategoryId } from '@/types';
import { firstParam } from '@/utils/format';

import styles from './styles';

const CatalogScreen: React.FC = () => {
  const router = useRouter();
  const categoryParam = firstParam(useLocalSearchParams<{ category?: string }>().category);

  // Ma danh muc tu URL (vd ?category=tile). Danh muc khong ton tai -> danh sach rong + thong bao.
  const [category, setCategory] = useState<CategoryId | undefined>(categoryParam || undefined);

  /* Danh muc lay qua service (mock hoac API), khong doc thang data/mock */
  const {
    data: categories = [],
    loading: categoriesLoading,
    error: categoriesError,
    reload: reloadCategories,
  } = useAsync(() => productService.getCategories(), []);

  const {
    data: products = [],
    loading,
    error,
    reload,
  } = useAsync(() => productService.getProducts(category), [category]);

  const renderBody = (): React.JSX.Element => {
    if (loading) return <LoadingView />;
    if (error) return <ErrorView message={`Không tải được sản phẩm. ${getErrorMessage(error)}`} onRetry={reload} />;
    if (products.length === 0) {
      return <EmptyView iconName="cube-outline" title="Chưa có sản phẩm trong danh mục này" />;
    }
    return (
      <FlatList
        data={products}
        keyExtractor={(item): string => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }): React.JSX.Element => (
          <View style={styles.cell}>
            <ProductCard
              product={item}
              onPress={(p): void => router.push({ pathname: '/catalog/[productId]', params: { productId: p.id } })}
            />
          </View>
        )}
      />
    );
  };

  return (
    <View style={styles.screen}>
      {/* ===== Danh muc ===== */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          <Chip label="Tất cả" selected={category === undefined} onPress={(): void => setCategory(undefined)} />
          {categoriesLoading ? <ActivityIndicator color={COLORS.accent} style={styles.categoriesLoading} /> : null}
          {categoriesError ? (
            <Chip label="Lỗi tải danh mục, bấm để thử lại" iconName="refresh" onPress={reloadCategories} />
          ) : null}
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              iconName={getCategoryIcon(c.id)}
              selected={category === c.id}
              onPress={(): void => setCategory(c.id)}
            />
          ))}
        </ScrollView>
      </View>
      <View style={styles.body}>{renderBody()}</View>
    </View>
  );
};

export default CatalogScreen;
