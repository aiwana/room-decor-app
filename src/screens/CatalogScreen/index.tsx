/**
 * src/screens/CatalogScreen/index.tsx
 * MODULE PHU: danh muc + luoi san pham. Khong nam trong bottom tab,
 * mo tu Home ("Vat lieu noi bat") hoac Result ("Xem them").
 * Nhan param ?category=tile de mo san 1 danh muc.
 */
import React, { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ProductCard from '@/components/catalog/ProductCard';
import Chip from '@/components/common/Chip';
import { EmptyView, ErrorView, LoadingView } from '@/components/common/StateViews';
import { CATEGORIES } from '@/data/mock/categories';
import { useAsync } from '@/hooks/useAsync';
import { productService } from '@/services/productService';
import type { CategoryId } from '@/types';
import { firstParam } from '@/utils/format';

import styles from './styles';

const isCategoryId = (v: unknown): v is CategoryId =>
  typeof v === 'string' && CATEGORIES.some((c) => c.id === v);

const CatalogScreen: React.FC = () => {
  const router = useRouter();
  const categoryParam = firstParam(useLocalSearchParams<{ category?: string }>().category);

  const [category, setCategory] = useState<CategoryId | undefined>(
    isCategoryId(categoryParam) ? categoryParam : undefined,
  );
  const {
    data: products = [],
    loading,
    error,
    reload,
  } = useAsync(() => productService.getProducts(category), [category]);

  const renderBody = (): React.JSX.Element => {
    if (loading) return <LoadingView />;
    if (error) return <ErrorView message="Không tải được sản phẩm." onRetry={reload} />;
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
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              iconName={c.iconName}
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
