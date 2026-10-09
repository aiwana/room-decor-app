/**
 * src/components/decor/BeforeAfterView.tsx
 * Xem anh Truoc / Sau bang 2 nut chuyen (ban don gian, de hieu).
 * Nang cao sau nay: thanh keo tren anh.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';

interface BeforeAfterViewProps {
  beforeUri: string;
  afterUri: string;
}

type Mode = 'before' | 'after';

const BeforeAfterView: React.FC<BeforeAfterViewProps> = ({ beforeUri, afterUri }) => {
  const [mode, setMode] = useState<Mode>('after');

  return (
    <View style={styles.wrap}>
      <Image
        source={{ uri: mode === 'after' ? afterUri : beforeUri }}
        style={styles.image}
        contentFit="cover"
        transition={250}
      />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{mode === 'after' ? 'SAU' : 'TRƯỚC'}</Text>
      </View>
      <View style={styles.segment}>
        {(['before', 'after'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={(): void => setMode(m)}
            style={[styles.segmentBtn, mode === m && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === m }}
          >
            <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
              {m === 'before' ? 'Trước' : 'Sau'}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginHorizontal: SPACING.md, borderRadius: RADIUS.lg, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 4 / 3, backgroundColor: COLORS.surfaceAlt },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.overlay,
  },
  badgeText: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  segment: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: COLORS.overlay,
    borderRadius: RADIUS.pill,
    padding: 4,
  },
  segmentBtn: { paddingHorizontal: 18, height: 30, borderRadius: RADIUS.pill, justifyContent: 'center' },
  segmentActive: { backgroundColor: COLORS.accent },
  segmentText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: COLORS.textPrimary },
});

export default BeforeAfterView;
