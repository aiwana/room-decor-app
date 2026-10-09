/**
 * src/components/common/Button.tsx
 * Nut bam dung chung: primary (cam), secondary (xam), ghost (vien).
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import type { IoniconName } from '@/types';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  iconName?: IoniconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Bat buoc khi nut chi co icon (title rong) de trinh doc man hinh doc duoc */
  accessibilityLabel?: string;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  iconName,
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}) => {
  const isDisabled = disabled || loading;
  const textColor = variant === 'ghost' ? COLORS.accent : COLORS.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {iconName ? <Ionicons name={iconName} size={18} color={textColor} /> : null}
          {title ? (
            <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  primary: { backgroundColor: COLORS.accent },
  secondary: { backgroundColor: COLORS.surfaceAlt },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.accent },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  text: { fontSize: 15, fontWeight: '700' },
});

export default Button;
