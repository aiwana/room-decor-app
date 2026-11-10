/**
 * src/components/common/FormField.tsx
 * 1 o nhap lieu co nhan + dong bao loi ben duoi. Dung cho Dang nhap / Dang ky / dat ten thiet ke.
 *  - Vien cam khi dang nhap (biet o nao dang duoc go)
 *  - O mat khau (secureTextEntry) co nut con mat de hien / an mat khau
 *  - hint: dong goi y nho duoi o (an khi dang co loi)
 */
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONT, RADIUS, SPACING } from '@/constants/colors';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  /** Goi y nho duoi o nhap */
  hint?: string;
  /** Style cho khung ngoai (vd flex: 1 khi dat 2 o canh nhau) */
  containerStyle?: StyleProp<ViewStyle>;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  hint,
  style,
  containerStyle,
  secureTextEntry,
  onFocus,
  onBlur,
  ...inputProps
}) => {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isSecret = Boolean(secureTextEntry);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          {...inputProps}
          secureTextEntry={isSecret && !revealed}
          onFocus={(e): void => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e): void => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label || inputProps.placeholder}
          placeholderTextColor={COLORS.inactive}
          style={[
            styles.input,
            isSecret && styles.inputWithIcon,
            focused && styles.inputFocused,
            error ? styles.inputError : null,
            style,
          ]}
        />
        {isSecret ? (
          <Pressable
            style={styles.eye}
            onPress={(): void => setRevealed((v) => !v)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.msgRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={14} color={COLORS.dangerText} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.md },
  label: { fontSize: 13, color: COLORS.textSecondary, fontFamily: FONT.semibold, marginBottom: 6 },
  inputRow: { justifyContent: 'center' },
  input: {
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONT.regular,
  },
  inputWithIcon: { paddingRight: 48 },
  inputFocused: { borderColor: COLORS.accent },
  inputError: { borderColor: COLORS.dangerText },
  eye: {
    position: 'absolute',
    right: 2,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  error: { flex: 1, fontSize: 12, fontFamily: FONT.regular, color: COLORS.dangerText },
  hint: { marginTop: 6, fontSize: 12, fontFamily: FONT.regular, color: COLORS.inactive },
});

export default FormField;
