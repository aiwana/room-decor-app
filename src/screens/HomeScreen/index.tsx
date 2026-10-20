/**
 * src/screens/HomeScreen/index.tsx
 * Man hinh HOME - tap trung vao AI Decor (chuc nang chinh).
 *   Header | Search | 2 nut lon (Chup phong / Chon anh) | Quick Actions
 *   | Phong cach pho bien | Thiet ke gan day | Inspiration
 *   | Vat lieu noi bat (module phu, dat cuoi trang)
 * Giu layout cu (dark theme, 2 o gradient, FlatList ngang), doi noi dung.
 */
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import SectionHeader from '@/components/common/SectionHeader';
import ProductCard from '@/components/catalog/ProductCard';
import DesignCard from '@/components/design/DesignCard';
import InspirationCard from '@/components/home/InspirationCard';
import QuickActionItem from '@/components/home/QuickActionItem';
import StyleCard from '@/components/home/StyleCard';
import { COLORS } from '@/constants/colors';
import { DESIGN_STYLES, getRoomTypeLabel, getStyleLabel } from '@/constants/decorOptions';
import { INSPIRATIONS } from '@/constants/inspirations';
import { useDesigns } from '@/context/DesignContext';
import { useAsync } from '@/hooks/useAsync';
import { useRoomImagePicker } from '@/hooks/useRoomImagePicker';
import { productService } from '@/services/productService';
import type { Design, DesignStyleOption, Inspiration, Product, QuickAction } from '@/types';

import styles from './styles';

const GRADIENT_GREEN = [COLORS.greenFrom, COLORS.greenTo] as const;
const GRADIENT_SLATE = [COLORS.slateFrom, COLORS.slateTo] as const;

/** Quick Actions moi: huong ve AI Decor, Catalog chi la 1 muc */
const QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-1', label: 'AI Decor', iconName: 'sparkles', href: '/ai-decor' },
  { id: 'qa-2', label: 'Lịch sử', iconName: 'time', href: '/history' },
  { id: 'qa-3', label: 'Yêu thích', iconName: 'heart', href: { pathname: '/history', params: { filter: 'favorite' } } },
  { id: 'qa-4', label: 'Vật liệu', iconName: 'grid', href: '/catalog' },
];

const RECENT_LIMIT = 6;

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const { savedDesigns } = useDesigns();
  const { pickFromCamera, pickFromGallery } = useRoomImagePicker();

  /* ---------------- State ---------------- */
  const [searchQuery, setSearchQuery] = useState<string>('');

  /* --- Vat lieu noi bat: tai rieng, KHONG chan phan AI phia tren --- */
  const {
    data: featured = [],
    loading: featuredLoading,
    error: featuredError,
    reload: reloadFeatured,
  } = useAsync(() => productService.getFeatured(), []);

  /* ---------------- Search: loc phong cach / thiet ke / cam hung ---------------- */
  const q = searchQuery.trim().toLowerCase();

  const filteredStyles = useMemo<DesignStyleOption[]>(
    () =>
      q.length === 0
        ? DESIGN_STYLES
        : DESIGN_STYLES.filter((s) => s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)),
    [q],
  );

  const recentDesigns = useMemo<Design[]>(() => {
    const list =
      q.length === 0
        ? savedDesigns
        : savedDesigns.filter(
            (d) =>
              getStyleLabel(d.style).toLowerCase().includes(q) ||
              getRoomTypeLabel(d.roomType).toLowerCase().includes(q),
          );
    return list.slice(0, RECENT_LIMIT);
  }, [q, savedDesigns]);

  const filteredInspirations = useMemo<Inspiration[]>(
    () => (q.length === 0 ? INSPIRATIONS : INSPIRATIONS.filter((i) => i.title.toLowerCase().includes(q))),
    [q],
  );

  /* ---------------- Handlers ---------------- */
  const handleCameraPress = async (): Promise<void> => {
    const uri = await pickFromCamera();
    if (uri) router.navigate({ pathname: '/ai-decor', params: { imageUri: uri } });
  };

  const handleGalleryPress = async (): Promise<void> => {
    const uri = await pickFromGallery();
    if (uri) router.navigate({ pathname: '/ai-decor', params: { imageUri: uri } });
  };

  const handleQuickAction = (action: QuickAction): void => {
    router.navigate(action.href);
  };

  const handleStylePress = (item: DesignStyleOption): void => {
    router.navigate({ pathname: '/ai-decor', params: { style: item.id } });
  };

  const handleInspirationPress = (item: Inspiration): void => {
    router.navigate({ pathname: '/ai-decor', params: { style: item.styleId, roomType: item.roomTypeId } });
  };

  const handleDesignPress = (design: Design): void => {
    router.push({ pathname: '/result/[id]', params: { id: design.id } });
  };

  const handleProductPress = (product: Product): void => {
    router.push({ pathname: '/catalog/[productId]', params: { productId: product.id } });
  };

  /* ---------------- Render ---------------- */
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ===== 1. HEADER ===== */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Room Decor AI</Text>
            <Text style={styles.headerSubtitle}>Chụp phòng, AI trang trí giúp bạn ✨</Text>
          </View>
          <Pressable
            style={styles.bellButton}
            onPress={(): void => router.navigate('/history')}
            accessibilityLabel="Lịch sử thiết kế"
            accessibilityRole="button"
          >
            {/* Truoc la icon chuong (thong bao) nhung lai mo Lich su -> doi icon cho dung chuc nang */}
            <Ionicons name="time-outline" size={24} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        {/* ===== Search ===== */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={COLORS.inactive} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm phong cách, thiết kế: Japandi, phòng ngủ..."
            placeholderTextColor={COLORS.inactive}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={(): void => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={COLORS.inactive} />
            </Pressable>
          ) : null}
        </View>

        {/* ===== 2. MAIN ACTIONS (2 o gradient) ===== */}
        <View style={styles.mainActions}>
          <Pressable style={styles.actionFlex} onPress={(): void => void handleCameraPress()}>
            <LinearGradient colors={[...GRADIENT_GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBox}>
              <Ionicons name="camera" size={36} color={COLORS.textPrimary} />
              <Text style={styles.actionBoxText}>Chụp phòng mới</Text>
            </LinearGradient>
          </Pressable>
          <Pressable style={styles.actionFlex} onPress={(): void => void handleGalleryPress()}>
            <LinearGradient colors={[...GRADIENT_SLATE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBox}>
              <Ionicons name="images" size={36} color={COLORS.textPrimary} />
              <Text style={styles.actionBoxText}>Chọn ảnh</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ===== 3. QUICK ACTIONS ===== */}
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <QuickActionItem key={action.id} action={action} onPress={handleQuickAction} />
          ))}
        </View>

        {/* ===== 4. PHONG CACH PHO BIEN ===== */}
        {filteredStyles.length > 0 ? (
          <>
            <SectionHeader title="Phong cách phổ biến" />
            <FlatList
              horizontal
              data={filteredStyles}
              keyExtractor={(item): string => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }): React.JSX.Element => <StyleCard item={item} onPress={handleStylePress} />}
            />
          </>
        ) : null}

        {/* ===== 5. THIET KE GAN DAY (an neu chua co) ===== */}
        {recentDesigns.length > 0 ? (
          <>
            <SectionHeader
              title="Thiết kế gần đây"
              actionLabel="Xem tất cả"
              onAction={(): void => router.navigate('/history')}
            />
            <FlatList
              horizontal
              data={recentDesigns}
              keyExtractor={(item): string => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }): React.JSX.Element => (
                <DesignCard design={item} variant="compact" onPress={handleDesignPress} />
              )}
            />
          </>
        ) : null}

        {/* ===== 6. INSPIRATION ===== */}
        {filteredInspirations.length > 0 ? (
          <>
            <SectionHeader title="Cảm hứng thiết kế" />
            <FlatList
              horizontal
              data={filteredInspirations}
              keyExtractor={(item): string => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }): React.JSX.Element => (
                <InspirationCard item={item} onPress={handleInspirationPress} />
              )}
            />
          </>
        ) : null}

        {/* ===== 7. VAT LIEU NOI BAT (module phu) ===== */}
        <SectionHeader title="Vật liệu nổi bật" actionLabel="Xem tất cả" onAction={(): void => router.push('/catalog')} />
        {featuredLoading ? (
          <ActivityIndicator color={COLORS.accent} />
        ) : featuredError ? (
          <Pressable onPress={reloadFeatured} accessibilityRole="button" style={styles.sectionMessage}>
            <Text style={styles.sectionMessageText}>Không tải được vật liệu. Bấm để thử lại.</Text>
          </Pressable>
        ) : featured.length === 0 ? (
          <View style={styles.sectionMessage}>
            <Text style={styles.sectionMessageText}>Chưa có vật liệu nổi bật.</Text>
          </View>
        ) : (
          <FlatList
            horizontal
            data={featured}
            keyExtractor={(item): string => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }): React.JSX.Element => (
              <ProductCard product={item} variant="horizontal" onPress={handleProductPress} />
            )}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
