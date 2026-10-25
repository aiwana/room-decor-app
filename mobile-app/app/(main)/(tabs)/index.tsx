/**
 * app/(main)/(tabs)/index.tsx
 * HOME - giu bo cuc ban cu (dark theme, 2 o gradient, danh sach ngang), doi noi dung:
 *   Header | Tim noi that | 2 nut lon (Chup phong / Chon anh) | Quick Actions
 *   | Thiet ke gan day | Noi that noi bat | Cam hung
 */
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import SectionHeader from '@/components/common/SectionHeader';
import DesignCard from '@/components/design/DesignCard';
import FurnitureCard from '@/components/furniture/FurnitureCard';
import InspirationCard from '@/components/home/InspirationCard';
import QuickActionItem from '@/components/home/QuickActionItem';
import { COLORS, SPACING } from '@/constants/colors';
import { INSPIRATIONS } from '@/constants/inspirations';
import { useDesigns } from '@/hooks/useDesigns';
import { useFurniture } from '@/hooks/useFurniture';
import { type PickedImage, useRoomImagePicker } from '@/hooks/useRoomImagePicker';
import { useAuthStore } from '@/store/auth-store';
import type { DesignDetail, Furniture, QuickAction } from '@/types';

const GRADIENT_GREEN = [COLORS.greenFrom, COLORS.greenTo] as const;
const GRADIENT_SLATE = [COLORS.slateFrom, COLORS.slateTo] as const;

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-1', label: 'Thiết kế mới', iconName: 'add-circle', href: '/new-design' },
  { id: 'qa-2', label: 'Của tôi', iconName: 'albums', href: '/designs' },
  { id: 'qa-3', label: 'Nội thất', iconName: 'grid', href: '/furniture' },
  { id: 'qa-4', label: 'Cài đặt', iconName: 'settings', href: '/settings' },
];

const RECENT_LIMIT = 6;
const FEATURED_LIMIT = 8;

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { designs } = useDesigns();
  const { items: furniture, loading: furnitureLoading } = useFurniture();
  const { pickFromCamera, pickFromGallery } = useRoomImagePicker();
  const [searchQuery, setSearchQuery] = useState('');

  const recentDesigns = designs.slice(0, RECENT_LIMIT);
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
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>RoomDecor</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Xin chào {user?.name ?? ''}, sắp xếp lại căn phòng nào ✨
            </Text>
          </View>
          <Pressable
            style={styles.headerButton}
            onPress={(): void => router.navigate('/designs')}
            accessibilityLabel="Thiết kế của tôi"
            accessibilityRole="button"
          >
            <Ionicons name="albums-outline" size={24} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        {/* ===== Tim noi that ===== */}
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
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={(): void => setSearchQuery('')} hitSlop={8} accessibilityLabel="Xoá từ khoá">
              <Ionicons name="close-circle" size={18} color={COLORS.inactive} />
            </Pressable>
          ) : null}
        </View>

        {/* ===== 2. MAIN ACTIONS (2 o gradient) ===== */}
        <View style={styles.mainActions}>
          <Pressable style={styles.actionFlex} onPress={(): void => void pickFromCamera().then(openNewDesign)} accessibilityRole="button">
            <LinearGradient colors={GRADIENT_GREEN} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBox}>
              <Ionicons name="camera" size={36} color={COLORS.textPrimary} />
              <Text style={styles.actionBoxText}>Chụp phòng mới</Text>
            </LinearGradient>
          </Pressable>
          <Pressable style={styles.actionFlex} onPress={(): void => void pickFromGallery().then(openNewDesign)} accessibilityRole="button">
            <LinearGradient colors={GRADIENT_SLATE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBox}>
              <Ionicons name="images" size={36} color={COLORS.textPrimary} />
              <Text style={styles.actionBoxText}>Chọn ảnh phòng</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ===== 3. QUICK ACTIONS ===== */}
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <QuickActionItem key={action.id} action={action} onPress={(a): void => router.navigate(a.href)} />
          ))}
        </View>

        {/* ===== 4. THIET KE GAN DAY (an neu chua co) ===== */}
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

        {/* ===== 5. NOI THAT NOI BAT ===== */}
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

        {/* ===== 6. CAM HUNG ===== */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 4,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  headerButton: { padding: 4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: 12,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: COLORS.textPrimary },
  mainActions: { flexDirection: 'row', gap: 12, marginTop: SPACING.lg, paddingHorizontal: SPACING.md },
  actionFlex: { flex: 1 },
  actionBox: { height: 140, borderRadius: 16, padding: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  actionBoxText: { marginTop: 10, fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.lg, paddingHorizontal: SPACING.md },
  listContent: { paddingHorizontal: SPACING.md },
  sectionMessage: { paddingHorizontal: SPACING.md, fontSize: 13, color: COLORS.textSecondary },
});
