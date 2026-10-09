/**
 * src/components/common/FormField.tsx
 * 1 o nhap lieu co nhan + dong bao loi ben duoi. Dung cho Dang nhap / Dang ky.
 */
import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, error, style, ...inputProps }) => (
  <View style={styles.wrap}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      {...inputProps}
      accessibilityLabel={label}
      placeholderTextColor={COLORS.inactive}
      style={[styles.input, error ? styles.inputError : null, style]}
    />
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.md },
  label: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  inputError: { borderColor: COLORS.danger },
  error: { marginTop: 4, fontSize: 12, color: COLORS.danger },
});

export default FormField;
