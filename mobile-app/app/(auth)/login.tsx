/**
 * app/(auth)/login.tsx
 * Dang nhap: POST /api/auth/login. Thanh cong -> (auth)/_layout tu chuyen vao Home.
 * Che do mock: khong kiem tra mat khau, man hinh ghi ro dieu nay.
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
import { type FieldErrors, validateLogin } from '@/utils/validation';

type Field = 'email' | 'password';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Chong bam "Dang nhap" nhieu lan truoc khi state kip cap nhat
  const submittingRef = useRef(false);

  const handleSubmit = async (): Promise<void> => {
    if (submittingRef.current) return;
    const input = { email: email.trim(), password };
    const nextErrors = validateLogin(input);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await login(input);
      // Khong can dieu huong: (auth)/_layout thay status = signedIn se chuyen vao app
    } catch (e) {
      const err = toApiError(e);
      // Backend tra 401 (hoac 400 "Invalid email or password") khi sai thong tin dang nhap
      if (err.status === 401 || (err.status === 400 && !err.fieldErrors)) {
        setFormError('Email hoặc mật khẩu không đúng.');
      } else {
        setFormError(err.message);
        if (err.fieldErrors) setErrors(err.fieldErrors);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="home" size={34} color={COLORS.accent} />
          </View>
          <Text style={styles.brandName}>RoomDecor</Text>
        </View>

        <Text style={styles.title}>Chào mừng trở lại</Text>
        <Text style={styles.subtitle}>Đăng nhập để sắp xếp nội thất cho căn phòng của bạn.</Text>

        <MockModeNotice
          style={styles.notice}
          message="Chế độ minh họa: chưa kết nối máy chủ. Mọi email hợp lệ đều đăng nhập được, mật khẩu không được kiểm tra."
        />

        {formError ? (
          <View style={styles.formError}>
            <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        ) : null}

        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          placeholder="ban@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!submitting}
        />
        <FormField
          label="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          placeholder="Mật khẩu"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          editable={!submitting}
          onSubmitEditing={(): void => void handleSubmit()}
        />

        <Button
          title="Đăng nhập"
          iconName="log-in-outline"
          onPress={(): void => void handleSubmit()}
          loading={submitting}
          style={styles.submit}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Chưa có tài khoản?</Text>
          <Pressable onPress={(): void => router.replace('/register')} hitSlop={8} accessibilityRole="link">
            <Text style={styles.switchLink}>Đăng ký</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
