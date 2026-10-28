/**
 * app/(main)/(tabs)/new-design.tsx
 * THIET KE MOI (thay man AI Decor cu): chon anh phong -> dat ten -> tao thiet ke
 * -> mo trinh chinh sua de dat noi that.
 *
 * Luong goi API:
 *   1. POST /api/room-images/upload (anh phong)  -> roomImageId
 *   2. POST /api/designs { name, roomImageId }     -> designId
 *   3. POST /api/ai/scan-room { roomImageId }       -> mat bang 2D (loi thi bo qua, quet lai trong editor)
 *   4. Chuyen sang /editor/[designId]
 *
 * Nhan san anh tu Home qua params: imageUri, width, height.
 */
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import { MockModeNotice } from '@/components/common/Notice';
import ImagePickerBox from '@/components/design/ImagePickerBox';
import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import { type PickedImage, useRoomImagePicker } from '@/hooks/useRoomImagePicker';
import { getErrorMessage } from '@/services/api-error';
import { designApi } from '@/services/design-api';
import { floorPlanApi } from '@/services/floor-plan-api';
import { roomImageApi } from '@/services/room-image-api';
import { firstParam } from '@/utils';

const NAME_MAX = 200; // khop cot designs.name VARCHAR(200)

const defaultName = (): string => `Phòng của tôi ${new Date().toLocaleDateString('vi-VN')}`;

type Step = 'idle' | 'uploading' | 'creating' | 'scanning';

const STEPS = [
  { icon: 'image-outline', text: 'Chọn hoặc chụp ảnh căn phòng' },
  { icon: 'create-outline', text: 'Đặt tên cho thiết kế' },
  { icon: 'scan-outline', text: 'AI quét ảnh, dựng mặt bằng 2D của phòng' },
  { icon: 'cube-outline', text: 'Kéo, xoay nội thất, xem trước bằng 3D' },
] as const;

export default function NewDesignScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ imageUri?: string; width?: string; height?: string }>();
  const { pickFromCamera, pickFromGallery } = useRoomImagePicker();

  const [image, setImage] = useState<PickedImage | null>(null);
  const [name, setName] = useState(defaultName);
  const [nameError, setNameError] = useState<string | undefined>();
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  // Anh gui tu Home (nut "Chup phong moi" / "Chon anh phong")
  const paramUri = firstParam(params.imageUri);
  useEffect(() => {
    if (!paramUri) return;
    setImage({
      uri: paramUri,
      width: Number(firstParam(params.width)) || 0,
      height: Number(firstParam(params.height)) || 0,
    });
    setError(null);
    // params cua tab duoc giu lai -> chi dung theo uri
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramUri]);

  const pick = async (from: 'camera' | 'gallery'): Promise<void> => {
    const picked = from === 'camera' ? await pickFromCamera() : await pickFromGallery();
    if (picked) {
      setImage(picked);
      setError(null);
    }
  };

  const clearImage = (): void => {
    setImage(null);
    setError(null);
    router.setParams({ imageUri: '', width: '', height: '' });
  };

  const reset = (): void => {
    clearImage();
    setName(defaultName());
    setStep('idle');
  };

  const handleCreate = async (): Promise<void> => {
    if (busyRef.current || !image) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Vui lòng đặt tên cho thiết kế');
      return;
    }
    if (trimmed.length > NAME_MAX) {
      setNameError(`Tên tối đa ${NAME_MAX} ký tự`);
      return;
    }
    setNameError(undefined);
    setError(null);
    busyRef.current = true;
    try {
      setStep('uploading');
      const roomImage = await roomImageApi.upload(image.uri, image);
      setStep('creating');
      const design = await designApi.create({ name: trimmed, roomImageId: roomImage.id, roomImageUri: image.uri });
      setStep('scanning');
      // Quet loi khong chan nguoi dung: van mo trinh chinh sua, bam "Quét phòng bằng AI" de thu lai
      await floorPlanApi.scan(roomImage.id).catch(() => undefined);
      reset();
      router.push({ pathname: '/editor/[id]', params: { id: design.id } });
    } catch (e) {
      setError(getErrorMessage(e));
      setStep('idle');
    } finally {
      busyRef.current = false;
    }
  };

  const busy = step !== 'idle';
  const buttonTitle =
    step === 'uploading'
      ? 'Đang tải ảnh lên...'
      : step === 'creating'
        ? 'Đang tạo thiết kế...'
        : step === 'scanning'
          ? 'AI đang quét phòng...'
          : 'Tạo thiết kế';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Thiết kế mới</Text>
            <Text style={styles.subtitle}>Chụp căn phòng, AI dựng mặt bằng, rồi đặt nội thất và xem trước 3D.</Text>
          </View>

          <MockModeNotice />

          <ImagePickerBox
            imageUri={image?.uri ?? null}
            onPickCamera={(): void => void pick('camera')}
            onPickGallery={(): void => void pick('gallery')}
            onClear={reset}
            onImageError={clearImage}
          />

          {image ? (
            <View style={styles.form}>
              <FormField
                label="Tên thiết kế"
                value={name}
                onChangeText={setName}
                error={nameError}
                placeholder="Ví dụ: Phòng khách nhà mình"
                maxLength={NAME_MAX}
                editable={!busy}
              />
              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
              <Button
                title={buttonTitle}
                iconName="arrow-forward-circle-outline"
                onPress={(): void => void handleCreate()}
                loading={busy}
              />
            </View>
          ) : (
            <View style={styles.steps}>
              <Text style={styles.stepsTitle}>Cách làm</Text>
              {STEPS.map((s, i) => (
                <View key={s.text} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Ionicons name={s.icon} size={18} color={COLORS.accent} />
                  <Text style={styles.stepText}>{s.text}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xl },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, marginBottom: SPACING.md },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  form: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(231,76,60,0.12)',
    marginBottom: SPACING.md,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 13 },
  steps: { marginHorizontal: SPACING.md, marginTop: SPACING.lg, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  stepsTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: 12, fontWeight: '700', color: COLORS.accent },
  stepText: { flex: 1, fontSize: 14, color: COLORS.textSecondary },
});
