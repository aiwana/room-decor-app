/**
 * src/screens/LoginScreen/index.tsx
 * Dang nhap. Mo dang modal tu Profile / History.
 * Che do minh hoa (USE_MOCK): khong kiem tra mat khau, man hinh ghi ro dieu nay.
 * Che do API: goi endpoint DE XUAT, backend chua co thi hien loi that (khong gia thanh cong).
 */
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import MockModeNotice from '@/components/common/MockModeNotice';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { toApiError } from '@/services/apiError';
import { type FieldErrors, validateLogin } from '@/utils/validation';

import styles from './styles';

type Field = 'email' | 'password';

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  // Chong bam "Dang nhap" nhieu lan truoc khi state kip cap nhat
  const submittingRef = useRef<boolean>(false);

  const close = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

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
      close();
    } catch (e) {
      const err = toApiError(e);
      if (err.status === 401) {
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
        <Text style={styles.title}>Chào mừng trở lại</Text>
        <Text style={styles.subtitle}>Đăng nhập để lưu và đồng bộ thiết kế của bạn.</Text>

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
};

export default LoginScreen;
