/**
 * app/(main)/(tabs)/new-design.tsx
 * THIET KE MOI (thay man AI Decor cu): chon anh phong -> (chup them goc phong, do kich thuoc phong
 * neu muon) -> dat ten (buoc cuoi) -> tao thiet ke -> mo trinh chinh sua de dat noi that.
 *
 * Giup AI quet dung hon, nguoi dung sua it hon:
 *   - Bang "Cách chụp cho chính xác" (ScanGuideSheet): tu mo 1 lan dau tien, sau do bam link de xem lai
 *   - Canh bao khi anh chup doc (AI thay it tuong hon anh ngang)
 *   - Muc "Đo thêm cho chính xác hơn" (dong san, khong bat buoc): chieu dai / rong phong, chieu cao tran.
 *     Backend (ScanCorrection) keo gian mat bang AI cho dung so do; chi nhap 1 so thi phong phong to deu.
 *
 * Luong goi API:
 *   1. POST /api/room-images/upload (anh chinh + tung anh goc) -> roomImageId, extraImageIds
 *   2. POST /api/designs { name, roomImageId }                  -> designId
 *   3. POST /api/ai/scan-room { roomImageId, extraImageIds, roomLengthMeters, roomWidthMeters, ceilingHeightMeters }
 *                                                               -> mat bang 2D (loi thi bao, quet lai trong editor)
 *   4. Chuyen sang /editor/[designId]
 *
 * Nhan san anh tu Home qua params: imageUri, width, height.
 *
 * Nguoi CHUA CO PHONG de chup: chon "Phòng trống" (chu nhat / chu L, nhap kich thuoc) hoac
 * "Phòng mẫu" (phong ngu, phong khach, bep...) -> BlankRoomForm (POST /api/floor-plans/blank).
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';

import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import RoomTypePicker from '@/components/design/RoomTypePicker';
import { DEFAULT_ROOM_TYPE, type RoomType } from '@/constants/room-types';
import { MockModeNotice } from '@/components/common/Notice';
import BlankRoomForm from '@/components/design/BlankRoomForm';
import CornerPhotosPicker, { isPortrait } from '@/components/design/CornerPhotosPicker';
import ImagePickerBox from '@/components/design/ImagePickerBox';
import ScanGuideSheet from '@/components/design/ScanGuideSheet';
import { MAX_EXTRA_ROOM_IMAGES, MAX_SCAN_IMAGES_BYTES, USE_MOCK } from '@/constants';
import { COLORS, FONT, RADIUS, SPACING } from '@/constants/colors';
import { CORNER_PHOTO_QUALITY, type PickedImage, useRoomImagePicker } from '@/hooks/useRoomImagePicker';
import { getErrorMessage } from '@/services/api-error';
import { designApi } from '@/services/design-api';
import { floorPlanApi } from '@/services/floor-plan-api';
import { roomImageApi } from '@/services/room-image-api';
import type { IoniconName } from '@/types';
import { firstParam } from '@/utils';
import { haptic } from '@/utils/haptics';

const NAME_MAX = 200; // khop cot designs.name VARCHAR(200)

const defaultName = (): string => `Phòng của tôi ${new Date().toLocaleDateString('vi-VN')}`;

// Khop @DecimalMin/@DecimalMax cua ScanRoomRequest (roomLengthMeters / roomWidthMeters / ceilingHeightMeters)
const SIDE_MIN = 0.5;
const SIDE_MAX = 30;
const CEILING_MIN = 1.8;
const CEILING_MAX = 6;

/** Da tu mo bang "Cách chụp cho chính xác" 1 lan chua */
const SCAN_GUIDE_SEEN_KEY = 'roomdecor.scanGuideSeen';

type MeasureKey = 'length' | 'width' | 'ceiling';
const EMPTY_MEASURES: Record<MeasureKey, string> = { length: '', width: '', ceiling: '' };

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

/** Cach bat dau: tu anh chup, tu phong trong, hoac tu phong mau */
type CreateMode = 'photo' | 'blank' | 'template';
const CREATE_MODES: { id: CreateMode; label: string; icon: IoniconName }[] = [
  { id: 'photo', label: 'Ảnh phòng', icon: 'camera-outline' },
  { id: 'blank', label: 'Phòng trống', icon: 'square-outline' },
  { id: 'template', label: 'Phòng mẫu', icon: 'albums-outline' },
];
const SUBTITLES: Record<CreateMode, string> = {
  photo: 'Chụp căn phòng, AI dựng mặt bằng, rồi đặt nội thất và xem trước 3D.',
  blank: 'Chưa có phòng để chụp? Nhập kích thước, app dựng mặt bằng để bạn bày nội thất.',
  template: 'Bắt đầu từ một phòng mẫu phổ biến rồi sửa lại cho giống phòng của bạn.',
};

/** Thu tu + ten ngan cua tung buoc khi dang tao thiet ke (hien "Bước x/3") */
const PROGRESS: Record<Exclude<Step, 'idle'>, { index: number; label: string }> = {
  uploading: { index: 1, label: 'Tải ảnh lên' },
  creating: { index: 2, label: 'Tạo thiết kế' },
  scanning: { index: 3, label: 'AI quét phòng' },
};

const STEPS = [
  { icon: 'image-outline', text: 'Chụp ảnh căn phòng: cầm ngang, đứng ở một góc, chụp chéo về góc đối diện' },
  { icon: 'camera-reverse-outline', text: 'Chụp thêm các góc phòng nếu muốn AI quét chính xác hơn' },
  { icon: 'create-outline', text: 'Đặt tên cho thiết kế rồi bấm Tạo' },
  { icon: 'scan-outline', text: 'AI quét ảnh, dựng mặt bằng 2D của phòng' },
  { icon: 'cube-outline', text: 'Kéo, xoay nội thất, xem trước bằng 3D' },
] as const;

export default function NewDesignScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    imageUri?: string;
    width?: string;
    height?: string;
    /** Mo san che do "Phong trong" / "Phong mau" (tu Trang chu); t = moc thoi gian de bam lai van an */
    start?: string;
    t?: string;
  }>();
  const { pickFromCamera, pickFromGallery } = useRoomImagePicker();
  const corner = useRoomImagePicker(CORNER_PHOTO_QUALITY);

  // Vao tu Trang chu voi start=blank/template -> mo san che do do ngay lan dau ve
  const [mode, setMode] = useState<CreateMode>(() => {
    const start = firstParam(params.start);
    return start === 'blank' || start === 'template' ? start : 'photo';
  });
  const [image, setImage] = useState<PickedImage | null>(null);
  const [extraImages, setExtraImages] = useState<PickedImage[]>([]);
  const [measures, setMeasures] = useState(EMPTY_MEASURES);
  const [measureErrors, setMeasureErrors] = useState<Partial<Record<MeasureKey, string>>>({});
  const [measureOpen, setMeasureOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });
  const [name, setName] = useState(defaultName);
  const [nameError, setNameError] = useState<string | undefined>();
  const [roomType, setRoomType] = useState<RoomType>(DEFAULT_ROOM_TYPE);
  const [step, setStep] = useState<Step>('idle');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  // Lan dau mo che do "Anh phong": tu mo huong dan chup 1 lan (loi doc/ghi bo nho thi bo qua).
  // Vao thang "Phong trong" / "Phong mau" (tu Trang chu) thi khong mo: huong dan nay chi ve chup anh.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  useEffect(() => {
    if (mode !== 'photo') return;
    let active = true;
    AsyncStorage.getItem(SCAN_GUIDE_SEEN_KEY)
      .then((seen) => {
        if (!active || seen || modeRef.current !== 'photo') return;
        setGuideOpen(true);
        void AsyncStorage.setItem(SCAN_GUIDE_SEEN_KEY, '1');
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [mode]);

  const setMeasure = (key: MeasureKey) => (text: string): void => {
    setMeasures((prev) => ({ ...prev, [key]: text }));
  };

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
    setMode('photo');
    // params cua tab duoc giu lai -> chi dung theo uri
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramUri]);

  // Trang chu: "Khong co anh? Phong trong / Phong mau"
  const startMode = firstParam(params.start);
  const startNonce = firstParam(params.t);
  useEffect(() => {
    if (startMode === 'blank' || startMode === 'template') setMode(startMode);
  }, [startMode, startNonce]);

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
    setMeasures(EMPTY_MEASURES);
    setMeasureErrors({});
    setMeasureOpen(false);
    setName(defaultName());
    setRoomType(DEFAULT_ROOM_TYPE);
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
    const roomLengthMeters = parseMeters(measures.length);
    const roomWidthMeters = parseMeters(measures.width);
    const ceilingHeightMeters = parseMeters(measures.ceiling);
    const outOf = (v: number | undefined, min: number, max: number): boolean => v !== undefined && !(v >= min && v <= max);
    const errors: Partial<Record<MeasureKey, string>> = {};
    if (outOf(roomLengthMeters, SIDE_MIN, SIDE_MAX)) errors.length = `Từ ${SIDE_MIN} đến ${SIDE_MAX} m, ví dụ 5.1`;
    if (outOf(roomWidthMeters, SIDE_MIN, SIDE_MAX)) errors.width = `Từ ${SIDE_MIN} đến ${SIDE_MAX} m, ví dụ 3.6`;
    if (outOf(ceilingHeightMeters, CEILING_MIN, CEILING_MAX)) {
      errors.ceiling = `Từ ${CEILING_MIN} đến ${CEILING_MAX} m, ví dụ 2.7`;
    }
    setMeasureErrors(errors);
    if (Object.keys(errors).length > 0) {
      setMeasureOpen(true); // mo muc do de nguoi dung thay o bi loi
      return;
    }
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

      setStartedAt(Date.now());
      setNow(Date.now());
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
      const design = await designApi.create({ name: trimmed, roomImageId: roomImage.id, roomImageUri: image.uri, roomType });

      setStep('scanning');
      // Quet loi khong chan nguoi dung: van mo trinh chinh sua, bam "Quét lại" de thu lai
      let scanError: string | null = null;
      try {
        await floorPlanApi.scan(roomImage.id, { extraImageIds, roomLengthMeters, roomWidthMeters, ceilingHeightMeters });
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
  // Dem giay da cho: AI quet co the mat 1-2 phut, nguoi dung can thay app khong bi treo
  useEffect(() => {
    if (!busy) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  const filledMeasures = Object.values(measures).filter((v) => v.trim()).length;
  const elapsedSec = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0;
  const progress = step === 'idle' ? null : PROGRESS[step];
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
            <Text style={styles.subtitle}>{SUBTITLES[mode]}</Text>
          </View>

          <MockModeNotice />

          <View style={styles.modeRow} accessibilityRole="tablist">
            {CREATE_MODES.map((m) => {
              const active = mode === m.id;
              return (
                <Pressable
                  key={m.id}
                  style={[styles.modeItem, active && styles.modeItemActive]}
                  onPress={(): void => {
                    haptic.select();
                    setMode(m.id);
                  }}
                  disabled={busy}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active, disabled: busy }}
                >
                  <Ionicons name={m.icon} size={16} color={active ? COLORS.accent : COLORS.textSecondary} />
                  <Text style={[styles.modeText, active && styles.modeTextActive]} numberOfLines={1}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {mode !== 'photo' ? <BlankRoomForm key={mode} mode={mode} /> : (
          <>
          <ImagePickerBox
            imageUri={image?.uri ?? null}
            onPickCamera={(): void => void pick('camera')}
            onPickGallery={(): void => void pick('gallery')}
            onClear={reset}
            onImageError={clearImage}
          />

          {image && isPortrait(image) ? (
            <View style={styles.warnBox}>
              <Ionicons name="phone-portrait-outline" size={18} color={COLORS.warningText} />
              <Text style={styles.warnText}>
                Ảnh này chụp dọc nên AI thấy ít tường hơn. Nên chụp lại theo chiều ngang, thấy cả sàn lẫn trần.
              </Text>
            </View>
          ) : null}

          <Pressable
            style={styles.guideLink}
            onPress={(): void => setGuideOpen(true)}
            accessibilityRole="button"
            hitSlop={6}
          >
            <Ionicons name="camera-outline" size={18} color={COLORS.accent} />
            <Text style={styles.guideLinkText}>Cách chụp cho chính xác</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.accent} />
          </Pressable>

          {image ? (
            <View style={styles.form}>
              <CornerPhotosPicker
                images={extraImages}
                max={MAX_EXTRA_ROOM_IMAGES}
                disabled={busy}
                onPickCamera={(): void => void pickCorner('camera')}
                onPickGallery={(): void => void pickCorner('gallery')}
                onRemove={removeCorner}
              />
              <View style={styles.measureBox}>
                <Pressable
                  style={styles.measureHeader}
                  onPress={(): void => setMeasureOpen((v) => !v)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: measureOpen }}
                >
                  <Ionicons name="resize-outline" size={18} color={COLORS.accent} />
                  <View style={styles.flex}>
                    <Text style={styles.measureTitle}>Đo thêm cho chính xác hơn</Text>
                    <Text style={styles.measureSub}>
                      {filledMeasures > 0 ? `Đã nhập ${filledMeasures}/3 số đo` : 'Không bắt buộc · cần thước dây'}
                    </Text>
                  </View>
                  <Ionicons name={measureOpen ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
                </Pressable>
                {measureOpen ? (
                  <View style={styles.measureBody}>
                    <Text style={styles.measureHint}>
                      Đo sát chân tường, từ tường này sang tường đối diện. Chỉ nhập 1 số cũng được: cả phòng sẽ được
                      phóng to hoặc thu nhỏ đều theo số đó.
                    </Text>
                    <View style={styles.measureRow}>
                      <FormField
                        label="Chiều dài (m)"
                        value={measures.length}
                        onChangeText={setMeasure('length')}
                        error={measureErrors.length}
                        placeholder="VD 5.1"
                        keyboardType="decimal-pad"
                        maxLength={5}
                        editable={!busy}
                        containerStyle={styles.flex}
                      />
                      <FormField
                        label="Chiều rộng (m)"
                        value={measures.width}
                        onChangeText={setMeasure('width')}
                        error={measureErrors.width}
                        placeholder="VD 3.6"
                        keyboardType="decimal-pad"
                        maxLength={5}
                        editable={!busy}
                        containerStyle={styles.flex}
                      />
                    </View>
                    <FormField
                      label="Chiều cao trần (m)"
                      value={measures.ceiling}
                      onChangeText={setMeasure('ceiling')}
                      error={measureErrors.ceiling}
                      placeholder="VD 2.7"
                      keyboardType="decimal-pad"
                      maxLength={4}
                      editable={!busy}
                    />
                  </View>
                ) : null}
              </View>
              {/* Dat ten la buoc cuoi, ngay truoc nut Tao (da dien san ten mac dinh) */}
              <FormField
                label="Tên thiết kế"
                value={name}
                onChangeText={setName}
                error={nameError}
                placeholder="Ví dụ: Phòng khách nhà mình"
                maxLength={NAME_MAX}
                editable={!busy}
              />
              <RoomTypePicker value={roomType} onChange={setRoomType} disabled={busy} />
              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
              {progress ? (
                <View style={styles.progressRow} accessibilityLiveRegion="polite">
                  <Text style={styles.progressStep}>Bước {progress.index}/3</Text>
                  <Text style={styles.progressText} numberOfLines={1}>
                    {progress.label} · đã chờ {elapsedSec} giây
                  </Text>
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
          </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <ScanGuideSheet visible={guideOpen} onClose={(): void => setGuideOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xl },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, marginBottom: SPACING.md },
  title: { fontSize: 26, fontFamily: FONT.bold, color: COLORS.textPrimary },
  modeRow: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: 4,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  modeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: RADIUS.sm,
  },
  modeItemActive: { backgroundColor: COLORS.accentSoft },
  modeText: { fontSize: 13, fontFamily: FONT.semibold, color: COLORS.textSecondary },
  modeTextActive: { color: COLORS.textPrimary },
  subtitle: { fontSize: 13, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: 2 },
  form: { paddingHorizontal: SPACING.md, marginTop: SPACING.md },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.dangerSoft,
    marginBottom: SPACING.md,
  },
  errorText: { flex: 1, color: COLORS.dangerText, fontSize: 13, fontFamily: FONT.regular },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  progressStep: { fontSize: 12, fontFamily: FONT.bold, color: COLORS.accent },
  progressText: { flex: 1, fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    padding: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.warningSoft,
  },
  warnText: { flex: 1, color: COLORS.warningText, fontSize: 13, fontFamily: FONT.regular },
  guideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 44,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xs,
  },
  guideLinkText: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.accent },
  measureBox: { marginBottom: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  measureHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: SPACING.md },
  measureTitle: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.textPrimary },
  measureSub: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: 2 },
  measureBody: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xs },
  measureHint: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary, marginBottom: SPACING.md },
  measureRow: { flexDirection: 'row', gap: SPACING.sm },
  steps: { marginHorizontal: SPACING.md, marginTop: SPACING.lg, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  stepsTitle: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: 12, fontFamily: FONT.bold, color: COLORS.accent },
  stepText: { flex: 1, fontSize: 15, fontFamily: FONT.regular, color: COLORS.textSecondary },
});
