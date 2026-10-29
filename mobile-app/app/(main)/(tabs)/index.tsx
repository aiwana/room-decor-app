/**
 * app/(main)/(tabs)/index.tsx
 * HOME. Bo cuc:
 *   Header | Tim noi that + Danh muc | 2 o lon (Chup phong / Chon anh, giu nhu ban cu)
 *   | Tiep tuc thiet ke gan nhat | Thiet ke gan day | Noi that noi bat | Cam hung
 * Da bo hang 4 icon tron va nut goc phai: "Thiet ke moi", "Cua toi" da co o thanh tab,
 * "Cai dat" nam trong Ho so (truoc day 3 loi vao cung 1 cho lam man hinh roi).
 */
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import SectionHeader from '@/components/common/SectionHeader';
import DesignCard from '@/components/design/DesignCard';
import FurnitureCard from '@/components/furniture/FurnitureCard';
import InspirationCard from '@/components/home/InspirationCard';
import { COLORS, RADIUS, SPACING, TOUCH_MIN, TYPE } from '@/constants/colors';
import { INSPIRATIONS } from '@/constants/inspirations';
import { useDesigns } from '@/hooks/useDesigns';
import { useFurniture } from '@/hooks/useFurniture';
import { type PickedImage, useRoomImagePicker } from '@/hooks/useRoomImagePicker';
import { useAuthStore } from '@/store/auth-store';
import type { DesignDetail, Furniture } from '@/types';
import { formatDate } from '@/utils';

const GRADIENT_GREEN = [COLORS.greenFrom, COLORS.greenTo] as const;
const GRADIENT_SLATE = [COLORS.slateFrom, COLORS.slateTo] as const;

const RECENT_LIMIT = 6;
const FEATURED_LIMIT = 8;

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { designs } = useDesigns();
  const { items: furniture, loading: furnitureLoading } = useFurniture();
  const { pickFromCamera, pickFromGallery } = useRoomImagePicker();
  const [searchQuery, setSearchQuery] = useState('');

  const lastDesign = designs[0];
  const recentDesigns = designs.slice(1, RECENT_LIMIT + 1);
  const featured = furniture.slice(0, FEATURED_LIMIT);

  /* ---------------- Handlers ---------------- */
  const openNewDesign = (image: PickedImage | null): void => {
    if (!image) return;
    router.navigate({
      pathname: '/new-design',
      params: { imageUri: image.uri, width: String(image.width), height: String(image.height) },
    });
  };

  const handleSearch = (): void => {
    const q = searchQuery.trim();
    router.push({ pathname: '/furniture', params: q ? { q } : {} });
  };

  const handleDesignPress = (design: DesignDetail): void => {
    router.push({ pathname: '/editor/[id]', params: { id: design.id } });
  };

  const handleFurniturePress = (item: Furniture): void => {
    router.push({ pathname: '/furniture/[id]', params: { id: item.id } });
  };

  /* ---------------- Render ---------------- */
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ===== 1. HEADER ===== */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>RoomDecor</Text>
          {user?.name ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Xin chào {user.name}
            </Text>
          ) : null}
        </View>

        {/* ===== TIM NOI THAT + DANH MUC (vi tri cu: ngay duoi header) ===== */}
        <View style={styles.searchBar}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={COLORS.inactive} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm nội thất: sofa, bàn trà, đèn..."
              placeholderTextColor={COLORS.inactive}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              accessibilityLabel="Tìm nội thất"
            />
            {searchQuery.length > 0 ? (
              <Pressable
                onPress={(): void => setSearchQuery('')}
                hitSlop={13}
                accessibilityRole="button"
                accessibilityLabel="Xoá từ khoá"
              >
                <Ionicons name="close-circle" size={18} color={COLORS.inactive} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            style={({ pressed }) => [styles.catalogButton, pressed && styles.pressed]}
            onPress={(): void => router.push('/furniture')}
            accessibilityRole="button"
            accessibilityLabel="Danh mục nội thất"
          >
            <Ionicons name="grid-outline" size={20} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        {/* ===== 2. VIEC CHINH: 2 O LON (giu mau + vi tri ban cu) ===== */}
        <View style={styles.mainActions}>
          <Pressable
            style={({ pressed }) => [styles.actionFlex, pressed && styles.pressed]}
            onPress={(): void => void pickFromCamera().then(openNewDesign)}
            accessibilityRole="button"
            accessibilityLabel="Chụp phòng mới"
          >
            <LinearGradient colors={GRADIENT_GREEN} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBox}>
              {/* Chu toi tren nen xanh la: chu trang chi ~2:1, chu toi ~8:1 */}
              <Ionicons name="camera" size={36} color={COLORS.onAccent} />
              <Text style={[styles.actionBoxText, styles.actionBoxTextDark]}>Chụp phòng mới</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionFlex, pressed && styles.pressed]}
            onPress={(): void => void pickFromGallery().then(openNewDesign)}
            accessibilityRole="button"
            accessibilityLabel="Chọn ảnh phòng"
          >
            <LinearGradient colors={GRADIENT_SLATE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBox}>
              <Ionicons name="images" size={36} color={COLORS.textPrimary} />
              <Text style={styles.actionBoxText}>Chọn ảnh phòng</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ===== 3. TIEP TUC THIET KE GAN NHAT ===== */}
        {lastDesign ? (
          <Pressable
            style={({ pressed }) => [styles.continueRow, pressed && styles.pressed]}
            onPress={(): void => handleDesignPress(lastDesign)}
            accessibilityRole="button"
            accessibilityLabel={`Tiếp tục thiết kế ${lastDesign.name}`}
          >
            {lastDesign.roomImageUri ? (
              <Image source={{ uri: lastDesign.roomImageUri }} style={styles.continueThumb} contentFit="cover" />
            ) : (
              <View style={[styles.continueThumb, styles.continueThumbEmpty]}>
                <Ionicons name="image-outline" size={22} color={COLORS.inactive} />
              </View>
            )}
            <View style={styles.continueText}>
              <Text style={styles.continueLabel}>Tiếp tục thiết kế</Text>
              <Text style={styles.continueName} numberOfLines={1}>
                {lastDesign.name}
              </Text>
              <Text style={styles.continueMeta} numberOfLines={1}>
                {lastDesign.placements.length} món nội thất · {formatDate(lastDesign.updatedAt)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.inactive} />
          </Pressable>
        ) : null}

        {/* ===== 5. THIET KE GAN DAY (tru thiet ke dang o "Tiep tuc") ===== */}
        {recentDesigns.length > 0 ? (
          <>
            <SectionHeader title="Thiết kế gần đây" actionLabel="Xem tất cả" onAction={(): void => router.navigate('/designs')} />
            <FlatList
              horizontal
              data={recentDesigns}
              keyExtractor={(item): string => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => <DesignCard design={item} variant="compact" onPress={handleDesignPress} />}
            />
          </>
        ) : null}

        {/* ===== 6. NOI THAT NOI BAT ===== */}
        <SectionHeader title="Nội thất nổi bật" actionLabel="Xem tất cả" onAction={(): void => router.push('/furniture')} />
        {furnitureLoading && featured.length === 0 ? (
          <ActivityIndicator color={COLORS.accent} />
        ) : featured.length === 0 ? (
          <Text style={styles.sectionMessage}>Chưa có nội thất nào.</Text>
        ) : (
          <FlatList
            horizontal
            data={featured}
            keyExtractor={(item): string => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => <FurnitureCard furniture={item} variant="horizontal" onPress={handleFurniturePress} />}
          />
        )}

        {/* ===== 7. CAM HUNG ===== */}
        <SectionHeader title="Cảm hứng thiết kế" />
        <FlatList
          horizontal
          data={INSPIRATIONS}
          keyExtractor={(item): string => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <InspirationCard item={item} onPress={(): void => router.navigate('/new-design')} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING.xl },
  pressed: { opacity: 0.85 },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  headerTitle: { ...TYPE.title, color: COLORS.textPrimary },
  headerSubtitle: { ...TYPE.label, fontWeight: '400', color: COLORS.textSecondary, marginTop: 2 },

  mainActions: { flexDirection: 'row', gap: 12, marginTop: SPACING.lg, paddingHorizontal: SPACING.md },
  actionFlex: { flex: 1 },
  actionBox: { height: 140, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  actionBoxText: { ...TYPE.body, fontWeight: '700', marginTop: 10, color: COLORS.textPrimary, textAlign: 'center' },
  actionBoxTextDark: { color: COLORS.onAccent },

  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  continueThumb: { width: 56, height: 56, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt },
  continueThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  continueText: { flex: 1 },
  continueLabel: { ...TYPE.caption, color: COLORS.accent, fontWeight: '600' },
  continueName: { ...TYPE.body, fontWeight: '600', color: COLORS.textPrimary, marginTop: 2 },
  continueMeta: { ...TYPE.caption, color: COLORS.textSecondary, marginTop: 2 },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginHorizontal: SPACING.md, marginTop: 12 },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: TOUCH_MIN,
    borderRadius: TOUCH_MIN / 2,
    backgroundColor: COLORS.fill,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, marginLeft: SPACING.sm, ...TYPE.body, color: COLORS.textPrimary },
  catalogButton: {
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    borderRadius: TOUCH_MIN / 2,
    backgroundColor: COLORS.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingHorizontal: SPACING.md },
  sectionMessage: { paddingHorizontal: SPACING.md, ...TYPE.label, fontWeight: '400', color: COLORS.textSecondary },
});
