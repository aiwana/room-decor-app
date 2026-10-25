/**
 * app/(auth)/register.tsx
 * Dang ky: POST /api/auth/register (tai khoan moi luon co role USER).
 * Thanh cong -> backend tra token luon, vao thang app.
 */
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import { MockModeNotice } from '@/components/common/Notice';
import { COLORS } from '@/constants/colors';
import styles from '@/screens/authStyles';
import { toApiError } from '@/services/api-error';
import { useAuthStore } from '@/store/auth-store';
import { type FieldErrors, PASSWORD_MIN_LENGTH, type RegisterForm, validateRegister } from '@/utils/validation';

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);

  const [form, setForm] = useState<RegisterForm>({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FieldErrors<keyof RegisterForm>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const setField =
    (key: keyof RegisterForm) =>
    (value: string): void =>
      setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (submittingRef.current) return;
    const nextErrors = validateRegister(form);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      // Chi gui name/email/password, khong gui confirmPassword
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
    } catch (e) {
      const err = toApiError(e);
      const duplicated = err.status === 409 || /already/i.test(err.message);
      setFormError(duplicated ? 'Email này đã được đăng ký.' : err.message);
      if (err.fieldErrors) setErrors(err.fieldErrors);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Tạo tài khoản</Text>
        <Text style={styles.subtitle}>Lưu thiết kế căn phòng và xem lại bất cứ lúc nào.</Text>

        <MockModeNotice
          style={styles.notice}
          message="Chế độ minh họa: tài khoản KHÔNG được tạo trên máy chủ, chỉ dùng để thử giao diện."
        />

        {formError ? (
          <View style={styles.formError}>
            <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        ) : null}

        <FormField
          label="Họ và tên"
          value={form.name}
          onChangeText={setField('name')}
          error={errors.name}
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          editable={!submitting}
        />
        <FormField
          label="Email"
          value={form.email}
          onChangeText={setField('email')}
          error={errors.email}
          placeholder="ban@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!submitting}
        />
        <FormField
          label={`Mật khẩu (ít nhất ${PASSWORD_MIN_LENGTH} ký tự)`}
          value={form.password}
          onChangeText={setField('password')}
          error={errors.password}
          placeholder="Mật khẩu"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          editable={!submitting}
        />
        <FormField
          label="Nhập lại mật khẩu"
          value={form.confirmPassword}
          onChangeText={setField('confirmPassword')}
          error={errors.confirmPassword}
          placeholder="Nhập lại mật khẩu"
          secureTextEntry
          autoCapitalize="none"
          editable={!submitting}
          onSubmitEditing={(): void => void handleSubmit()}
        />

        <Button
          title="Đăng ký"
          iconName="person-add-outline"
          onPress={(): void => void handleSubmit()}
          loading={submitting}
          style={styles.submit}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Đã có tài khoản?</Text>
          <Pressable onPress={(): void => router.replace('/login')} hitSlop={8} accessibilityRole="link">
            <Text style={styles.switchLink}>Đăng nhập</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
