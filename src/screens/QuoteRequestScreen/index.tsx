/**
 * src/screens/QuoteRequestScreen/index.tsx
 * MODULE PHU: form yeu cau bao gia / lien he (mo dang modal).
 * Thay cho tab "Quote" cu trong bottom bar.
 */
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Button from '@/components/common/Button';
import MockModeNotice from '@/components/common/MockModeNotice';
import { EmptyView, ErrorView, LoadingView } from '@/components/common/StateViews';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { getErrorMessage } from '@/services/apiError';
import { USE_MOCK } from '@/services/config';
import { productService } from '@/services/productService';
import { quoteService } from '@/services/quoteService';
import { showError } from '@/utils/alert';
import { firstParam, formatVnd } from '@/utils/format';

import styles from './styles';

const PHONE_REGEX = /^0\d{9}$/;

const QuoteRequestScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId: string; variant?: string }>();
  const productId = firstParam(params.productId) ?? '';
  const variant = firstParam(params.variant);
  const { user } = useAuth();

  // Tai thong tin san pham (co loading / loi / khong tim thay)
  const { data: product, loading, error, reload } = useAsync(
    () => productService.getProductById(productId),
    [productId],
  );

  // Da dang nhap -> dien san ho ten
  const [name, setName] = useState<string>(user?.name ?? '');
  const [phone, setPhone] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [note, setNote] = useState<string>(variant ? `Lựa chọn: ${variant}` : '');
  const [sending, setSending] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Chong bam "Gui" nhieu lan
  const sendingRef = useRef<boolean>(false);

  /** Kiem tra form, tra ve true neu hop le */
  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Vui lòng nhập họ tên';
    if (!PHONE_REGEX.test(phone.trim())) next.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0';
    const qty = Number(quantity);
    // Chi nhan so nguyen duong (don vi nhu vien, bao, thung khong co so le)
    if (!/^\d+$/.test(quantity.trim()) || qty <= 0) next.quantity = 'Số lượng là số nguyên lớn hơn 0';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSend = async (): Promise<void> => {
    if (sendingRef.current || !validate()) return;
    sendingRef.current = true;
    setSending(true);
    try {
      await quoteService.send({
        productId,
        customerName: name.trim(),
        phone: phone.trim(),
        quantity: Number(quantity),
        note: note.trim() || undefined,
      });
      // Che do minh hoa: noi ro la CHUA gui toi cua hang that
      const [title, message] = USE_MOCK
        ? ['Đã ghi nhận (chế độ minh họa)', 'Yêu cầu chưa được gửi tới cửa hàng vì app đang dùng dữ liệu giả.']
        : ['Đã gửi yêu cầu', 'Cửa hàng sẽ liên hệ báo giá cho bạn sớm.'];
      Alert.alert(title, message, [{ text: 'OK', onPress: (): void => router.back() }]);
    } catch (e) {
      showError('Gửi thất bại', e);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  if (loading) return <LoadingView />;
  if (error) {
    return <ErrorView message={`Không tải được sản phẩm. ${getErrorMessage(error)}`} onRetry={reload} />;
  }
  if (!product) return <EmptyView iconName="cube-outline" title="Không tìm thấy sản phẩm" />;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <MockModeNotice style={styles.notice} message="Chế độ minh họa: yêu cầu sẽ KHÔNG được gửi tới cửa hàng." />
        {product ? (
          <View style={styles.productRow}>
            <Image source={{ uri: product.imageUrl }} style={styles.productImage} contentFit="cover" />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.productPrice}>
                {formatVnd(product.price)} / {product.unit}
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.label}>Họ và tên *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          accessibilityLabel="Họ và tên"
          editable={!sending}
          placeholder="Nguyễn Văn A"
          placeholderTextColor={COLORS.inactive}
        />
        {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}

        <Text style={styles.label}>Số điện thoại *</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          accessibilityLabel="Số điện thoại"
          editable={!sending}
          placeholder="0901234567"
          placeholderTextColor={COLORS.inactive}
          keyboardType="phone-pad"
          maxLength={10}
        />
        {errors.phone ? <Text style={styles.error}>{errors.phone}</Text> : null}

        <Text style={styles.label}>Số lượng {product ? `(${product.unit})` : ''} *</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          accessibilityLabel="Số lượng"
          editable={!sending}
          keyboardType="numeric"
          placeholderTextColor={COLORS.inactive}
        />
        {errors.quantity ? <Text style={styles.error}>{errors.quantity}</Text> : null}

        <Text style={styles.label}>Ghi chú</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={note}
          onChangeText={setNote}
          accessibilityLabel="Ghi chú"
          editable={!sending}
          placeholder="Địa chỉ giao hàng, thời gian liên hệ..."
          placeholderTextColor={COLORS.inactive}
          multiline
        />

        <Button title="Gửi yêu cầu" iconName="send" onPress={(): void => void handleSend()} loading={sending} style={styles.submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default QuoteRequestScreen;
