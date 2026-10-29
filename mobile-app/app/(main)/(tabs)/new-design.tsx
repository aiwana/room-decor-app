/**
 * app/(main)/(tabs)/new-design.tsx
 * THIET KE MOI (thay man AI Decor cu): chon anh phong -> (chup them goc phong, nhap chieu dai
 * 1 buc tuong neu muon) -> dat ten -> tao thiet ke -> mo trinh chinh sua de dat noi that.
 *
 * Luong goi API:
 *   1. POST /api/room-images/upload (anh chinh + tung anh goc) -> roomImageId, extraImageIds
 *   2. POST /api/designs { name, roomImageId }                  -> designId
 *   3. POST /api/ai/scan-room { roomImageId, extraImageIds, referenceLengthMeters }
 *                                                               -> mat bang 2D (loi thi bao, quet lai trong editor)
 *   4. Chuyen sang /editor/[designId]
 *
 * Nhan san anh tu Home qua params: imageUri, width, height.
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';

import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import { MockModeNotice } from '@/components/common/Notice';
import CornerPhotosPicker from '@/components/design/CornerPhotosPicker';
import ImagePickerBox from '@/components/design/ImagePickerBox';
import { MAX_EXTRA_ROOM_IMAGES, MAX_SCAN_IMAGES_BYTES, USE_MOCK } from '@/constants';
import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import { CORNER_PHOTO_QUALITY, type PickedImage, useRoomImagePicker } from '@/hooks/useRoomImagePicker';
import { getErrorMessage } from '@/services/api-error';
import { designApi } from '@/services/design-api';
import { floorPlanApi } from '@/services/floor-plan-api';
import { roomImageApi } from '@/services/room-image-api';
import { firstParam } from '@/utils';

const NAME_MAX = 200; // khop cot designs.name VARCHAR(200)

const defaultName = (): string => `Phòng của tôi ${new Date().toLocaleDateString('vi-VN')}`;

// Khop @DecimalMin("0.5") @DecimalMax("30.0") cua ScanRoomRequest.referenceLengthMeters
const REF_MIN = 0.5;
const REF_MAX = 30;

/** "3,5" hoac "3.5" -> 3.5; o trong -> undefined; sai -> NaN */
const parseMeters = (text: string): number | undefined => {
  const t = text.trim().replace(',', '.');
  if (!t) return undefined;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN;
};

/** Tong dung luong cac file anh tren may (byte); khong doc duoc thi tinh 0 */
const totalFileSize = async (uris: string[]): Promise<number> => {
  const sizes = await Promise.all(
    uris.map(async (uri) => {
      try {
        const info = await FileSystem.getInfoAsync(uri);
        return info.exists ? info.size : 0;
      } catch {
        return 0;
      }
    }),
  );
  return sizes.reduce((a, b) => a + b, 0);
};

type Step = 'idle' | 'uploading' | 'creating' | 'scanning';

const STEPS = [
  { icon: 'image-outline', text: 'Chọn hoặc chụp ảnh căn phòng' },
  { icon: 'create-outline', text: 'Đặt tên cho thiết kế' },
  { icon: 'camera-reverse-outline', text: 'Chụp thêm các góc phòng nếu muốn AI quét chính xác hơn' },
  { icon: 'scan-outline', text: 'AI quét ảnh, dựng mặt bằng 2D của phòng' },
  { icon: 'cube-outline', text: 'Kéo, xoay nội thất, xem trước bằng 3D' },
] as const;

export default function NewDesignScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ imageUri?: string; width?: string; height?: string }>();
  const { pickFromCamera, pickFromGallery } = useRoomImagePicker();
  const corner = useRoomImagePicker(CORNER_PHOTO_QUALITY);

  const [image, setImage] = useState<PickedImage | null>(null);
  const [extraImages, setExtraImages] = useState<PickedImage[]>([]);
  const [refLength, setRefLength] = useState('');
  const [refError, setRefError] = useState<string | undefined>();
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });
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

  const pickCorner = async (from: 'camera' | 'gallery'): Promise<void> => {
    const picked = from === 'camera' ? await corner.pickFromCamera() : await corner.pickFromGallery();
    if (picked) {
      setExtraImages((prev) => (prev.length < MAX_EXTRA_ROOM_IMAGES ? [...prev, picked] : prev));
      setError(null);
    }
  };

  const removeCorner = (index: number): void => {
    setExtraImages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearImage = (): void => {
    setImage(null);
    setError(null);
    router.setParams({ imageUri: '', width: '', height: '' });
  };

  const reset = (): void => {
    clearImage();
    setExtraImages([]);
    setRefLength('');
    setRefError(undefined);
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
    const referenceLengthMeters = parseMeters(refLength);
    if (referenceLengthMeters !== undefined && !(referenceLengthMeters >= REF_MIN && referenceLengthMeters <= REF_MAX)) {
      setRefError(`Nhập số mét từ ${REF_MIN} đến ${REF_MAX}, ví dụ 3.5`);
      return;
    }
    setRefError(undefined);
    setError(null);
    busyRef.current = true;
    try {
      // Backend chi gui toi da 14 MB anh cho AI -> bao som thay vi de quet loi
      if (!USE_MOCK && extraImages.length > 0) {
        const bytes = await totalFileSize([image.uri, ...extraImages.map((img) => img.uri)]);
        if (bytes > MAX_SCAN_IMAGES_BYTES) {
          setError(
            `Ảnh quá nặng (${(bytes / 1024 / 1024).toFixed(1)} MB, tối đa 13 MB). Hãy bớt vài ảnh góc phòng rồi thử lại.`,
          );
          return;
        }
      }

      setStep('uploading');
      const all = [image, ...extraImages];
      setUploadCount({ done: 0, total: all.length });
      const roomImage = await roomImageApi.upload(image.uri, image);
      setUploadCount({ done: 1, total: all.length });
      const extraImageIds: string[] = [];
      for (const extra of extraImages) {
        // Tai lan luot (khong song song) de mang yeu khong bi qua tai
        const uploaded = await roomImageApi.upload(extra.uri, extra);
        extraImageIds.push(uploaded.id);
        setUploadCount({ done: extraImageIds.length + 1, total: all.length });
      }

      setStep('creating');
      const design = await designApi.create({ name: trimmed, roomImageId: roomImage.id, roomImageUri: image.uri });

      setStep('scanning');
      // Quet loi khong chan nguoi dung: van mo trinh chinh sua, bam "Quét lại" de thu lai
      let scanError: string | null = null;
      try {
        await floorPlanApi.scan(roomImage.id, { extraImageIds, referenceLengthMeters });
      } catch (e) {
        scanError = getErrorMessage(e);
      }
      reset();
      router.push({ pathname: '/editor/[id]', params: { id: design.id } });
      if (scanError) {
        Alert.alert('AI chưa quét được phòng', `${scanError}\n\nBạn có thể bấm "Quét lại" trong trình chỉnh sửa.`);
      }
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
      ? uploadCount.total > 1
        ? `Đang tải ảnh ${Math.min(uploadCount.done + 1, uploadCount.total)}/${uploadCount.total}...`
        : 'Đang tải ảnh lên...'
      : step === 'creating'
        ? 'Đang tạo thiết kế...'
        : step === 'scanning'
          ? extraImages.length > 0
            ? `AI đang quét ${extraImages.length + 1} ảnh (có thể mất 1-2 phút)...`
            : 'AI đang quét phòng...'
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
              <CornerPhotosPicker
                images={extraImages}
                max={MAX_EXTRA_ROOM_IMAGES}
                disabled={busy}
                onPickCamera={(): void => void pickCorner('camera')}
                onPickGallery={(): void => void pickCorner('gallery')}
                onRemove={removeCorner}
              />
              <FormField
                label="Chiều dài 1 bức tường (m) · không bắt buộc"
                value={refLength}
                onChangeText={setRefLength}
                error={refError}
                placeholder="Đo bức tường ở ảnh chính, ví dụ 3.5"
                keyboardType="decimal-pad"
                maxLength={5}
                editable={!busy}
              />
              <Text style={styles.refHint}>
                Có số đo thật, AI tính kích thước các bức tường còn lại chính xác hơn.
              </Text>
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
  refHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: -SPACING.sm, marginBottom: SPACING.md },
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
