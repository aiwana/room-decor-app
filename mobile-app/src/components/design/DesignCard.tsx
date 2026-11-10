/**
 * src/components/design/DesignCard.tsx
 * The 1 thiet ke: anh dai dien (anh 3D / mat bang thu nho / anh chup), ten, loai phong,
 * dien tich, so mon, tong bao gia uoc tinh, "sửa 2 giờ trước".
 * variant 'grid'    -> man "Của tôi", 2 cot
 * variant 'list'    -> man "Của tôi", dang danh sach
 * variant 'compact' -> Home "Thiet ke gan day" (cuon ngang)
 * Nhan giu (hoac nut ...) -> onMore: mo bang thao tac (doi ten, nhan ban, xoa...).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import DesignThumb from '@/components/design/DesignThumb';
import { COLORS, FONT, RADIUS, TYPE } from '@/constants/colors';
import { roomTypeInfo } from '@/constants/room-types';
import type { DesignDetail } from '@/types';
import { formatRelative, formatShortPrice } from '@/utils';
import { haptic } from '@/utils/haptics';

interface DesignCardProps {
  design: DesignDetail;
  variant?: 'grid' | 'list' | 'compact';
  onPress: (design: DesignDetail) => void;
  /** Mo bang thao tac (nhan giu the hoac bam nut ...) */
  onMore?: (design: DesignDetail) => void;
}

const metaOf = (design: DesignDetail): string[] => {
  const s = design.summary;
  const parts: string[] = [];
  if (s && s.floorArea > 0) parts.push(`${s.floorArea.toFixed(1).replace('.', ',')} m²`);
  parts.push(`${design.placements.length} món`);
  if (s && s.quoteTotal > 0) parts.push(`≈ ${formatShortPrice(s.quoteTotal)}`);
  return parts;
};

const MoreButton: React.FC<{ design: DesignDetail; onMore: (d: DesignDetail) => void }> = ({ design, onMore }) => (
  <Pressable
    style={({ pressed }) => [styles.moreBtn, pressed && styles.pressed]}
    hitSlop={6}
    onPress={(): void => onMore(design)}
    accessibilityRole="button"
    accessibilityLabel={`Thao tác với thiết kế ${design.name}`}
  >
    <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.textSecondary} />
  </Pressable>
);

const DesignCard: React.FC<DesignCardProps> = ({ design, variant = 'grid', onPress, onMore }) => {
  const type = roomTypeInfo(design.roomType);
  const meta = metaOf(design);
  const a11y = `${design.name}, ${type.label}, ${meta.join(', ')}, sửa ${formatRelative(design.updatedAt)}`;
  const common = {
    onPress: (): void => onPress(design),
    onLongPress: onMore
      ? (): void => {
          haptic.press();
          onMore(design);
        }
      : undefined,
    delayLongPress: 350,
    accessibilityRole: 'button' as const,
    accessibilityLabel: a11y,
    accessibilityHint: onMore ? 'Nhấn giữ để đổi tên, nhân bản hoặc xoá' : undefined,
  };

  if (variant === 'list') {
    return (
      <Pressable {...common} style={({ pressed }) => [styles.card, styles.listCard, pressed && styles.pressed]}>
        <DesignThumb design={design} style={styles.listThumb} />
        <View style={styles.listBody}>
          <Text style={styles.title} numberOfLines={1}>
            {design.name}
          </Text>
          <View style={styles.typeRow}>
            <Ionicons name={type.icon} size={13} color={COLORS.accent} />
            <Text style={styles.typeText} numberOfLines={1}>
              {type.label}
            </Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {meta.join(' · ')}
          </Text>
        </View>
        <View style={styles.listRight}>
          {onMore ? <MoreButton design={design} onMore={onMore} /> : null}
          <Text style={styles.time}>{formatRelative(design.updatedAt)}</Text>
        </View>
      </Pressable>
    );
  }

  const compact = variant === 'compact';
  return (
    <Pressable {...common} style={({ pressed }) => [styles.card, compact ? styles.compact : styles.grid, pressed && styles.pressed]}>
      <DesignThumb design={design} style={compact ? styles.imageCompact : styles.imageGrid} />
      <View style={[styles.tag, styles.tagLeft]} pointerEvents="none">
        <Ionicons name={type.icon} size={12} color={COLORS.textPrimary} />
        {compact ? null : (
          <Text style={styles.tagText} numberOfLines={1}>
            {type.label}
          </Text>
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, styles.flex]} numberOfLines={1}>
            {design.name}
          </Text>
          {onMore ? <MoreButton design={design} onMore={onMore} /> : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {meta.join(' · ')}
        </Text>
        <Text style={styles.time}>{`Sửa ${formatRelative(design.updatedAt)}`}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: RADIUS.md, backgroundColor: COLORS.surface, overflow: 'hidden' },
  grid: { flex: 1 },
  compact: { width: 160, marginRight: 12 },
  pressed: { opacity: 0.8 },
  imageGrid: { width: '100%', aspectRatio: 1.15 },
  imageCompact: { width: '100%', height: 110 },
  tag: {
    position: 'absolute',
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '85%',
    paddingHorizontal: 8,
    height: 24,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.overlay,
  },
  tagLeft: { left: 8 },
  tagText: { fontSize: 12, fontFamily: FONT.semibold, color: COLORS.textPrimary },
  info: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { ...TYPE.label, fontSize: 15, color: COLORS.textPrimary },
  meta: { ...TYPE.caption, color: COLORS.textSecondary, marginTop: 4 },
  time: { ...TYPE.caption, color: COLORS.inactive, marginTop: 2 },
  // Vung bam 32 + hitSlop 6 moi phia = 44
  moreBtn: { width: 32, height: 32, marginRight: -6, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  /* Dang danh sach */
  listCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  listThumb: { width: 72, height: 72, borderRadius: RADIUS.sm },
  listBody: { flex: 1, minWidth: 0 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  typeText: { ...TYPE.caption, color: COLORS.accent, fontFamily: FONT.semibold },
  listRight: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch' },
});

export default DesignCard;
