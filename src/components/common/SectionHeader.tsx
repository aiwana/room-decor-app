/**
 * src/components/common/SectionHeader.tsx
 * Tieu de 1 section + nut "Xem tat ca" (tuy chon).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, SPACING } from '@/constants/colors';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, actionLabel, onAction }) => (
  <View style={styles.row}>
    <Text style={styles.title}>{title}</Text>
    {actionLabel && onAction ? (
      <Pressable onPress={onAction} hitSlop={8}>
        <Text style={styles.action}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginTop: 28,
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  action: { fontSize: 13, color: COLORS.accent, fontWeight: '600' },
});

export default SectionHeader;
