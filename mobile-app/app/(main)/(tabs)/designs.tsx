/**
 * app/(main)/(tabs)/designs.tsx
 * THIET KE CUA TOI
 *  - Tim theo ten, sap xep (moi sua / moi tao / ten A-Z / dien tich), loc theo loai phong va nguon (tu anh / phong trong)
 *  - Nhom theo ngay (Hom nay / Tuan nay / Truoc do) khi sap theo thoi gian
 *  - Doi kieu xem luoi 2 cot <-> danh sach (nho lua chon tren may)
 *  - Nhan giu the hoac bam "..." -> bang thao tac: doi ten, doi loai phong, nhan ban, xoa
 * API: GET /api/designs, PUT /api/designs/{id}, POST /api/designs (nhan ban), DELETE /api/designs/{id}
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MockModeNotice } from '@/components/common/Notice';
import { DesignListSkeleton } from '@/components/common/Skeleton';
import { EmptyView, ErrorView } from '@/components/common/StateViews';
import DesignActionsSheet from '@/components/design/DesignActionsSheet';
import DesignCard from '@/components/design/DesignCard';
import { STORAGE_KEYS } from '@/constants';
import { COLORS, FONT, RADIUS, SPACING, TOUCH_MIN, TYPE } from '@/constants/colors';
import { ROOM_TYPES, roomTypeInfo, type RoomType } from '@/constants/room-types';
import { useDesigns } from '@/hooks/useDesigns';
import { getErrorMessage } from '@/services/api-error';
import { designApi } from '@/services/design-api';
import type { DesignDetail, IoniconName } from '@/types';
import { haptic } from '@/utils/haptics';

type SortKey = 'updated' | 'created' | 'name' | 'area';
type SourceFilter = 'all' | 'photo' | 'blank';
type ViewKind = 'grid' | 'list';

const SORTS: { id: SortKey; label: string; icon: IoniconName }[] = [
  { id: 'updated', label: 'Mới sửa gần đây', icon: 'time-outline' },
  { id: 'created', label: 'Mới tạo gần đây', icon: 'add-circle-outline' },
  { id: 'name', label: 'Tên A → Z', icon: 'text-outline' },
  { id: 'area', label: 'Diện tích lớn → nhỏ', icon: 'resize-outline' },
];

const SOURCES: { id: SourceFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'photo', label: 'Từ ảnh chụp' },
  { id: 'blank', label: 'Phòng trống / mẫu' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Thiet ke tao tu anh hay tu phong trong / phong mau (null = chua biet, vd chua mo lan nao tren may nay) */
const sourceOf = (d: DesignDetail): 'photo' | 'blank' | null => {
  if (d.summary?.source) return d.summary.source;
  if (d.roomImageUri === '') return 'blank';
  return d.roomImageUri ? 'photo' : null;
};

/** Nhan nhom theo ngay: Hom nay / Tuan nay (7 ngay) / Truoc do */
const dayGroup = (iso: string, now: number): string => {
  const t = new Date(iso).getTime();
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  if (t >= startOfToday) return 'Hôm nay';
  if (t >= startOfToday - 6 * DAY_MS) return 'Tuần này';
  return 'Trước đó';
};

const compareBy = (sort: SortKey) => (a: DesignDetail, b: DesignDetail): number => {
  switch (sort) {
    case 'created':
      return b.createdAt.localeCompare(a.createdAt);
    case 'name':
      return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' });
    case 'area':
      return (b.summary?.floorArea ?? 0) - (a.summary?.floorArea ?? 0);
    default:
      return b.updatedAt.localeCompare(a.updatedAt);
  }
};

/** Bo dau tieng Viet de tim "phong khach" van ra "Phòng khách" */
const normalize = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

const chunk = <T,>(list: T[], size: number): T[][] => {
  const rows: T[][] = [];
  for (let i = 0; i < list.length; i += size) rows.push(list.slice(i, i + size));
  return rows;
};

interface Section {
  title: string;
  data: DesignDetail[][];
}

export default function DesignsScreen() {
  const router = useRouter();
  const { designs, loading, refreshing, error, refresh } = useDesigns();
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');
  const [source, setSource] = useState<SourceFilter>('all');
  const [roomType, setRoomType] = useState<RoomType | 'all'>('all');
  const [view, setView] = useState<ViewKind>('grid');
  const [sortOpen, setSortOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState<DesignDetail | null>(null);

  // Chi hien vong xoay khi nguoi dung tu keo xuong (khong hien moi lan quay lai tab)
  const [pulling, setPulling] = useState(false);
  const pullRefresh = (): void => {
    setPulling(true);
    refresh();
  };
  useEffect(() => {
    if (!refreshing) setPulling(false);
  }, [refreshing]);

  // Nho kieu xem + cach sap xep lan truoc
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.DESIGNS_VIEW)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as { view?: ViewKind; sort?: SortKey };
        if (saved.view === 'grid' || saved.view === 'list') setView(saved.view);
        if (saved.sort && SORTS.some((s) => s.id === saved.sort)) setSort(saved.sort);
      })
      .catch(() => undefined);
  }, []);
  const savePrefs = (next: { view: ViewKind; sort: SortKey }): void => {
    AsyncStorage.setItem(STORAGE_KEYS.DESIGNS_VIEW, JSON.stringify(next)).catch(() => undefined);
  };
  const toggleView = (): void => {
    haptic.select();
    const next = view === 'grid' ? 'list' : 'grid';
    setView(next);
    savePrefs({ view: next, sort });
  };
  const chooseSort = (next: SortKey): void => {
    setSort(next);
    savePrefs({ view, sort: next });
  };

  const visible = useMemo(() => designs.filter((d) => d.id !== hiddenId), [designs, hiddenId]);

  // Chip loai phong: chi hien loai dang co, kem so luong
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    visible.forEach((d) => counts.set(roomTypeInfo(d.roomType).id, (counts.get(roomTypeInfo(d.roomType).id) ?? 0) + 1));
    return ROOM_TYPES.filter((t) => counts.has(t.id)).map((t) => ({ ...t, count: counts.get(t.id) ?? 0 }));
  }, [visible]);

  // Loai phong dang loc khong con thiet ke nao (vd vua xoa) -> ve "Tat ca"
  useEffect(() => {
    if (roomType !== 'all' && !typeCounts.some((t) => t.id === roomType)) setRoomType('all');
  }, [roomType, typeCounts]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return visible
      .filter((d) => (q ? normalize(d.name).includes(q) || normalize(roomTypeInfo(d.roomType).label).includes(q) : true))
      .filter((d) => roomType === 'all' || roomTypeInfo(d.roomType).id === roomType)
      .filter((d) => source === 'all' || sourceOf(d) === source)
      .sort(compareBy(sort));
  }, [visible, query, roomType, source, sort]);

  const sections = useMemo((): Section[] => {
    const perRow = view === 'grid' ? 2 : 1;
    if (sort !== 'updated' && sort !== 'created') return [{ title: '', data: chunk(filtered, perRow) }];
    const now = Date.now();
    const groups = new Map<string, DesignDetail[]>();
    filtered.forEach((d) => {
      const key = dayGroup(sort === 'created' ? d.createdAt : d.updatedAt, now);
      groups.set(key, [...(groups.get(key) ?? []), d]);
    });
    return [...groups.entries()].map(([title, list]) => ({ title, data: chunk(list, perRow) }));
  }, [filtered, sort, view]);

  const activeFilters = (source !== 'all' ? 1 : 0) + (sort !== 'updated' ? 1 : 0);
  const hasFilter = query.trim() !== '' || roomType !== 'all' || source !== 'all';
  const clearFilters = (): void => {
    setQuery('');
    setRoomType('all');
    setSource('all');
  };

  /* ---------------- Thao tac ---------------- */
  const openDesign = (design: DesignDetail): void => {
    setActionsFor(null);
    router.push({ pathname: '/editor/[id]', params: { id: design.id } });
  };

  const rename = async (design: DesignDetail, name: string): Promise<void> => {
    await designApi.update(design.id, { name }).catch((e: unknown) => {
      throw new Error(getErrorMessage(e));
    });
    refresh();
  };

  const changeType = async (design: DesignDetail, type: RoomType): Promise<void> => {
    await designApi.update(design.id, { roomType: type }).catch((e: unknown) => {
      throw new Error(getErrorMessage(e));
    });
    refresh();
  };

  const duplicate = async (design: DesignDetail): Promise<void> => {
    const copy = await designApi.duplicate(design, `${design.name} (phương án B)`).catch((e: unknown) => {
      throw new Error(getErrorMessage(e));
    });
    refresh();
    Alert.alert(
      'Đã tạo phương án mới',
      `"${copy.name}" dùng chung hình dạng phòng với bản gốc. Bạn có thể bày nội thất, đổi vật liệu riêng để so sánh. Nếu sửa hình phòng, cả hai bản đều đổi theo.`,
      [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Mở ngay', onPress: (): void => openDesign(copy) },
      ],
    );
  };

  const confirmDelete = (design: DesignDetail): void => {
    setActionsFor(null);
    Alert.alert('Xoá thiết kế?', `"${design.name}" sẽ bị xoá vĩnh viễn.`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: (): void => {
          setHiddenId(design.id);
          designApi
            .remove(design.id)
            .then(refresh)
            .catch((e: unknown) => Alert.alert('Không xoá được thiết kế', getErrorMessage(e)))
            .finally(() => setHiddenId(null));
        },
      },
    ]);
  };

  /* ---------------- Giao dien ---------------- */
  const renderToolbar = (): React.ReactElement => (
    <View style={styles.toolbar}>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={18} color={COLORS.inactive} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm theo tên hoặc loại phòng"
            placeholderTextColor={COLORS.inactive}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Tìm thiết kế"
          />
          {query ? (
            <Pressable onPress={(): void => setQuery('')} hitSlop={10} accessibilityLabel="Xoá ô tìm kiếm">
              <Ionicons name="close-circle" size={18} color={COLORS.inactive} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={(): void => setSortOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Sắp xếp và lọc"
        >
          <Ionicons name="options-outline" size={20} color={COLORS.textPrimary} />
          {activeFilters > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilters}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {typeCounts.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {[{ id: 'all' as const, label: 'Tất cả', icon: 'apps-outline' as IoniconName, count: visible.length }, ...typeCounts].map(
            (t) => {
              const on = roomType === t.id;
              return (
                <Pressable
                  key={t.id}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={(): void => {
                    haptic.select();
                    setRoomType(t.id);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Ionicons name={t.icon} size={14} color={on ? COLORS.onAccent : COLORS.textSecondary} />
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.label}</Text>
                  <Text style={[styles.chipCount, on && styles.chipTextOn]}>{t.count}</Text>
                </Pressable>
              );
            },
          )}
        </ScrollView>
      ) : null}
    </View>
  );

  const renderRow = ({ item }: { item: DesignDetail[] }): React.ReactElement => {
    if (view === 'list') {
      return (
        <View style={styles.listItem}>
          <DesignCard design={item[0]} variant="list" onPress={openDesign} onMore={setActionsFor} />
        </View>
      );
    }
    return (
      <View style={styles.gridRow}>
        {item.map((d) => (
          <View key={d.id} style={styles.cell}>
            <DesignCard design={d} variant="grid" onPress={openDesign} onMore={setActionsFor} />
          </View>
        ))}
        {item.length === 1 ? <View style={styles.cell} /> : null}
      </View>
    );
  };

  const renderBody = (): React.ReactNode => {
    if (loading) return <DesignListSkeleton variant={view} />;
    if (error && designs.length === 0) return <ErrorView message={getErrorMessage(error)} onRetry={refresh} />;
    if (visible.length === 0) {
      return (
        <EmptyView
          iconName="albums-outline"
          title="Chưa có thiết kế nào"
          message="Chụp ảnh căn phòng, hoặc chọn phòng trống / phòng mẫu để tạo thiết kế đầu tiên."
          actionLabel="Tạo thiết kế mới"
          onAction={(): void => router.navigate('/new-design')}
        />
      );
    }
    return (
      <SectionList
        sections={sections}
        keyExtractor={(row): string => row.map((d) => d.id).join('|')}
        renderItem={renderRow}
        renderSectionHeader={({ section }) =>
          section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null
        }
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={renderToolbar()}
        ListEmptyComponent={
          <View style={styles.noResult}>
            <Ionicons name="search-outline" size={32} color={COLORS.inactive} />
            <Text style={styles.noResultText}>Không có thiết kế nào khớp.</Text>
            {hasFilter ? (
              <Pressable onPress={clearFilters} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>Bỏ lọc</Text>
              </Pressable>
            ) : null}
          </View>
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={pullRefresh} tintColor={COLORS.accent} />}
      />
    );
  };

  const countText =
    filtered.length === visible.length ? `${visible.length} thiết kế` : `${filtered.length} / ${visible.length} thiết kế`;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Thiết kế của tôi</Text>
          <Text style={styles.subtitle}>{countText}</Text>
        </View>
        {visible.length > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            onPress={toggleView}
            accessibilityRole="button"
            accessibilityLabel={view === 'grid' ? 'Xem dạng danh sách' : 'Xem dạng lưới'}
          >
            <Ionicons name={view === 'grid' ? 'list-outline' : 'grid-outline'} size={20} color={COLORS.textPrimary} />
          </Pressable>
        ) : null}
      </View>
      <MockModeNotice />
      {renderBody()}

      {/* Sap xep & loc */}
      <Modal visible={sortOpen} transparent animationType="slide" onRequestClose={(): void => setSortOpen(false)} statusBarTranslucent>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={(): void => setSortOpen(false)} accessibilityLabel="Đóng" />
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Sắp xếp & lọc</Text>
              <Pressable onPress={(): void => setSortOpen(false)} hitSlop={10} accessibilityLabel="Đóng">
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.sheetLabel}>Sắp xếp</Text>
            {SORTS.map((s) => {
              const on = sort === s.id;
              return (
                <Pressable
                  key={s.id}
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  onPress={(): void => chooseSort(s.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                >
                  <Ionicons name={s.icon} size={20} color={on ? COLORS.accent : COLORS.textSecondary} />
                  <Text style={[styles.optionText, on && styles.optionTextOn]}>{s.label}</Text>
                  {on ? <Ionicons name="checkmark" size={20} color={COLORS.accent} /> : null}
                </Pressable>
              );
            })}
            <Text style={styles.sheetLabel}>Nguồn phòng</Text>
            <View style={styles.segment}>
              {SOURCES.map((s) => {
                const on = source === s.id;
                return (
                  <Pressable
                    key={s.id}
                    style={[styles.segmentItem, on && styles.segmentItemOn]}
                    onPress={(): void => setSource(s.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                  >
                    <Text style={[styles.segmentText, on && styles.segmentTextOn]} numberOfLines={1}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={styles.doneBtn} onPress={(): void => setSortOpen(false)} accessibilityRole="button">
              <Text style={styles.doneText}>Xong</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>

      <DesignActionsSheet
        design={actionsFor}
        onClose={(): void => setActionsFor(null)}
        onOpen={openDesign}
        onRename={rename}
        onChangeType={changeType}
        onDuplicate={duplicate}
        onDelete={confirmDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  title: { ...TYPE.title, color: COLORS.textPrimary },
  subtitle: { ...TYPE.label, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: 2 },
  pressed: { opacity: 0.7 },
  iconBtn: {
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  badgeText: { fontSize: 12, fontFamily: FONT.bold, color: COLORS.onAccent },
  toolbar: { marginBottom: SPACING.sm },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    height: TOUCH_MIN,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 15, fontFamily: FONT.regular, paddingVertical: 0 },
  chips: { gap: SPACING.sm, paddingTop: 12, paddingBottom: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { fontSize: 13, fontFamily: FONT.semibold, color: COLORS.textSecondary },
  chipCount: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.inactive },
  chipTextOn: { color: COLORS.onAccent },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
  sectionTitle: { ...TYPE.label, color: COLORS.textSecondary, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  cell: { flex: 1 },
  listItem: { marginBottom: 10 },
  noResult: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xl },
  noResultText: { ...TYPE.body, color: COLORS.textSecondary },
  link: { ...TYPE.label, color: COLORS.accent },
  /* Bang sap xep */
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.borderStrong, marginTop: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  sheetTitle: { fontSize: 18, fontFamily: FONT.bold, color: COLORS.textPrimary },
  sheetLabel: { ...TYPE.label, color: COLORS.textSecondary, marginTop: SPACING.sm, marginBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, borderRadius: RADIUS.sm, paddingHorizontal: 4 },
  optionPressed: { backgroundColor: COLORS.fill },
  optionText: { flex: 1, fontSize: 15, fontFamily: FONT.regular, color: COLORS.textPrimary },
  optionTextOn: { color: COLORS.accent, fontFamily: FONT.semibold },
  segment: { flexDirection: 'row', backgroundColor: COLORS.fill, borderRadius: RADIUS.md, padding: 3, marginTop: 4 },
  segmentItem: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.sm, paddingHorizontal: 4 },
  segmentItemOn: { backgroundColor: COLORS.surfaceAlt },
  segmentText: { fontSize: 13, fontFamily: FONT.semibold, color: COLORS.textSecondary },
  segmentTextOn: { color: COLORS.textPrimary },
  doneBtn: {
    marginTop: SPACING.md,
    height: TOUCH_MIN,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  doneText: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.onAccent },
});
