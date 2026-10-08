/**
 * src/screens/HomeScreen/index.tsx
 * Man hinh HOME - sau dang nhap, nam trong Bottom Tab Navigator.
 * Layout tham khao app Hypic (Dark theme) nhung noi dung nghiep vu VLXD:
 *   Header | Search | Quick Actions (4 icon tron) | Main Actions (2 o gradient)
 *   | Vat lieu xu huong (FlatList doc) | Du an tieu bieu (FlatList ngang)
 * Chuan PROG3002: Functional Component + Hooks, StyleSheet.create, no 'any'.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import QuickActionItem from '../../components/QuickActionItem';
import ProductCard from '../../components/ProductCard';
import { QUICK_ACTIONS, fetchHomeData } from '../../data/mockData';
import type { Product, Project } from '../../types';
import styles, { COLORS } from './styles';

const GRADIENT_GREEN = [COLORS.greenFrom, COLORS.greenTo] as const;
const GRADIENT_SLATE = [COLORS.slateFrom, COLORS.slateTo] as const;

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const { greeting } = useLocalSearchParams<{ greeting?: string }>();

  /* ---------------- State ---------------- */
  const [activeTab] = useState<string>('Home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  /* ------------ Gia lap load data (setTimeout 300ms) ------------- */
  useEffect(() => {
    let mounted = true;
    fetchHomeData().then((data): void => {
      if (!mounted) {
        return;
      }
      setProducts(data.products);
      setProjects(data.projects);
      setLoading(false);
    });
    return (): void => {
      mounted = false;
    };
  }, []);

  /* ---------------- Derived state: filter theo search ------------ */
  const filteredProducts = useMemo<Product[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length === 0) {
      return products;
    }
    return products.filter(
      (p: Product): boolean =>
        p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q),
    );
  }, [products, searchQuery]);

  /* ---------------- Handlers ---------------- */
  const handleQuickAction = useCallback(
    (routeName: string): void => {
      // Cac tab co san thi chuyen tab, con lai navigate toi stack screen (mock).
      switch (routeName) {
        case 'Quote':
          router.navigate('/quote');
          break;
        case 'Simulate':
        default:
          // Catalog / Stock chua co screen -> tam navigate toi Simulate khi demo.
          router.navigate('/simulate');
          break;
      }
    },
    [router],
  );

  const handleCameraPress = useCallback((): void => {
    router.navigate('/simulate');
  }, [router]);

  const handleGalleryPress = useCallback((): void => {
    router.navigate('/simulate');
  }, [router]);

  const handleProductPress = useCallback((id: string): void => {
    // TODO: navigate toi QuoteDetail khi Spring Boot API hoat dong.
    console.log('Open product detail:', id);
  }, []);

  const handleProjectPress = useCallback((id: string): void => {
    console.log('Open project detail:', id);
  }, []);

  const keyExtractorProduct = useCallback(
    (item: Product): string => item.id,
    [],
  );
  const keyExtractorProject = useCallback(
    (item: Project): string => item.id,
    [],
  );

  /* ---------------- Loading state ---------------- */
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  /* ---------------- Render ---------------- */
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ===== 1. HEADER ===== */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {/* Title dong: lay tu query param ?greeting=... neu co */}
            {greeting ?? 'Room Decor'}
          </Text>
          <Pressable
            style={styles.bellButton}
            onPress={(): void => router.navigate('/quote')}
            accessibilityLabel="Thông báo báo giá"
          >
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* ===== Search bar (state searchQuery) ===== */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={COLORS.inactive} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm gạch, sơn, xi măng..."
            placeholderTextColor={COLORS.inactive}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* ===== 2. QUICK ACTIONS (4 icon tron kieu Hypic) ===== */}
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <QuickActionItem
              key={action.id}
              action={action}
              onPress={handleQuickAction}
            />
          ))}
        </View>

        {/* ===== 3. MAIN ACTION AREA (2 o vuong gradient) ===== */}
        <View style={styles.mainActions}>
          <Pressable onPress={handleCameraPress}>
            <LinearGradient
              colors={[...GRADIENT_GREEN]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionBox}
            >
              <Ionicons name="camera" size={36} color="#FFFFFF" />
              <Text style={styles.actionBoxText}>Chụp phòng mới</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={handleGalleryPress}>
            <LinearGradient
              colors={[...GRADIENT_SLATE]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionBox}
            >
              <Ionicons name="images" size={36} color="#FFFFFF" />
              <Text style={styles.actionBoxText}>Chọn ảnh có sẵn</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ===== 4. TRENDING: VAT LIEU XU HUONG ===== */}
        <Text style={styles.sectionTitle}>Vật liệu xu hướng</Text>
        <FlatList
          horizontal
          data={filteredProducts}
          keyExtractor={keyExtractorProduct}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: Product }): React.JSX.Element => (
            <ProductCard data={item} variant="trending" onPress={handleProductPress} />
          )}
        />

        {/* ===== 5. REFERENCE PROJECTS: DU AN TIEU BIEU ===== */}
        <Text style={styles.sectionTitle}>Dự án tiêu biểu</Text>
        <FlatList
          horizontal
          data={projects}
          keyExtractor={keyExtractorProject}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: Project }): React.JSX.Element => (
            <ProductCard data={item} variant="project" onPress={handleProjectPress} />
          )}
        />
      </ScrollView>

      {/* activeTab: giu lai de logging nghiep vu / A-B testing ve sau.
          Bottom Tab tu quan ly highlight tren tab bar (xem src/app/(tabs)/_layout.tsx). */}
      {process.env.NODE_ENV !== 'production' ? (
        <Text nativeID="debug-active-tab" style={styles.debugText}>
          {`tab: ${activeTab}`}
        </Text>
      ) : null}
    </SafeAreaView>
  );
};

export default HomeScreen;
