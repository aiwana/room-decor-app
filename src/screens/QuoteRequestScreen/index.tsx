/**
 * src/screens/QuoteRequestScreen/index.tsx
 * MODULE PHU: form yeu cau bao gia / lien he (mo dang modal).
 * Thay cho tab "Quote" cu trong bottom bar.
 */
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Button from '@/components/common/Button';
import { COLORS } from '@/constants/colors';
import { productService } from '@/services/productService';
import { quoteService } from '@/services/quoteService';
import type { Product } from '@/types';
import { firstParam, formatVnd } from '@/utils/format';

import styles from './styles';

const PHONE_REGEX = /^0\d{9}$/;

const QuoteRequestScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId: string; variant?: string }>();
  const productId = firstParam(params.productId) ?? '';
  const variant = firstParam(params.variant);

  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [note, setNote] = useState<string>(variant ? `Lựa chọn: ${variant}` : '');
  const [sending, setSending] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void productService.getProductById(productId).then((p): void => setProduct(p ?? null));
  }, [productId]);

  /** Kiem tra form, tra ve true neu hop le */
  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Vui lòng nhập họ tên';
    if (!PHONE_REGEX.test(phone.trim())) next.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0';
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) next.quantity = 'Số lượng phải lớn hơn 0';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSend = async (): Promise<void> => {
    if (!validate()) return;
    setSending(true);
    try {
      await quoteService.send({
        productId,
        customerName: name.trim(),
        phone: phone.trim(),
        quantity: Number(quantity),
        note: note.trim() || undefined,
      });
      Alert.alert('Đã gửi yêu cầu', 'Cửa hàng sẽ liên hệ báo giá cho bạn sớm.', [
        { text: 'OK', onPress: (): void => router.back() },
      ]);
    } catch {
      Alert.alert('Gửi thất bại', 'Vui lòng kiểm tra mạng và thử lại.');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
          placeholder="Nguyễn Văn A"
          placeholderTextColor={COLORS.inactive}
        />
        {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}

        <Text style={styles.label}>Số điện thoại *</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
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
          keyboardType="numeric"
          placeholderTextColor={COLORS.inactive}
        />
        {errors.quantity ? <Text style={styles.error}>{errors.quantity}</Text> : null}

        <Text style={styles.label}>Ghi chú</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={note}
          onChangeText={setNote}
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
