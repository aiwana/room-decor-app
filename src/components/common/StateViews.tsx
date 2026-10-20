/**
 * src/components/common/StateViews.tsx
 * 3 trang thai chuan cho moi man hinh: Loading / Error / Empty.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING } from '@/constants/colors';
import type { IoniconName } from '@/types';

import Button from './Button';

export const LoadingView: React.FC<{ message?: string }> = ({ message }) => (
  <View style={styles.center}>
    <ActivityIndicator size="large" color={COLORS.accent} />
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>
);

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  message = 'Đã có lỗi xảy ra. Vui lòng thử lại.',
  onRetry,
}) => (
  <View style={styles.center}>
    <Ionicons name="alert-circle-outline" size={56} color={COLORS.danger} />
    <Text style={styles.title}>Ôi, có lỗi rồi</Text>
    <Text style={styles.message}>{message}</Text>
    {onRetry ? <Button title="Thử lại" iconName="refresh" onPress={onRetry} style={styles.button} /> : null}
  </View>
);

interface EmptyViewProps {
  iconName?: IoniconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyView: React.FC<EmptyViewProps> = ({
  iconName = 'images-outline',
  title,
  message,
  actionLabel,
  onAction,
}) => (
  <View style={styles.center}>
    <Ionicons name={iconName} size={56} color={COLORS.inactive} />
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    {actionLabel && onAction ? (
      <Button title={actionLabel} onPress={onAction} style={styles.button} />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  title: {
    marginTop: SPACING.md,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  message: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: { marginTop: SPACING.lg, minWidth: 180 },
});
