/**
 * src/screens/AIDecorScreen/index.tsx
 * CHUC NANG CHINH: chon anh -> loai phong -> phong cach -> mau -> Generate.
 * 1 man hinh cuon voi 4 buoc danh so (don gian hon 4 man rieng).
 *
 * Nhan params (tu Home / Result "Thiet ke lai"):
 *   imageUri, roomType, style, colorTheme
 */
import React, { useState } from 'react';
import { FlatList, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/common/Button';
import Chip from '@/components/common/Chip';
import GeneratingOverlay from '@/components/decor/GeneratingOverlay';
import ImagePickerBox from '@/components/decor/ImagePickerBox';
import StyleCard from '@/components/home/StyleCard';
import { COLORS } from '@/constants/colors';
import {
  COLOR_THEMES,
  DESIGN_STYLES,
  ROOM_TYPES,
  isColorThemeId,
  isRoomTypeId,
  isStyleId,
} from '@/constants/decorOptions';
import { useDesigns } from '@/context/DesignContext';
import { useRoomImagePicker } from '@/hooks/useRoomImagePicker';
import type { ColorThemeId, DesignStyleId, DesignStyleOption, RoomTypeId } from '@/types';
import { firstParam } from '@/utils/format';

import styles from './styles';

type Params = {
  imageUri?: string;
  roomType?: string;
  style?: string;
  colorTheme?: string;
};

const AIDecorScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { generate } = useDesigns();
  const { pickFromCamera, pickFromGallery } = useRoomImagePicker();

  /* ---------------- State cua form ---------------- */
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [roomType, setRoomType] = useState<RoomTypeId | null>(null);
  const [style, setStyle] = useState<DesignStyleId | null>(null);
  const [colorTheme, setColorTheme] = useState<ColorThemeId | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /* -------- Nhan du lieu dien san tu man khac (qua URL params) -------- */
  const pImage = firstParam(params.imageUri);
  const pRoom = firstParam(params.roomType);
  const pStyle = firstParam(params.style);
  const pColor = firstParam(params.colorTheme);

  // Khi params doi (vd bam "Thiet ke lai") -> dien vao form.
  // Cap nhat ngay trong luc render (React khuyen dung thay cho useEffect).
  const paramsKey = [pImage, pRoom, pStyle, pColor].join('|');
  const [appliedKey, setAppliedKey] = useState<string>('');
  if (paramsKey !== appliedKey) {
    setAppliedKey(paramsKey);
    if (pImage) setImageUri(pImage);
    if (isRoomTypeId(pRoom)) setRoomType(pRoom);
    if (isStyleId(pStyle)) setStyle(pStyle);
    if (isColorThemeId(pColor)) setColorTheme(pColor);
  }

  const canGenerate = imageUri !== null && roomType !== null && style !== null && !generating;

  /* ---------------- Handlers ---------------- */
  const handleCamera = async (): Promise<void> => {
    const uri = await pickFromCamera();
    if (uri) setImageUri(uri);
  };

  const handleGallery = async (): Promise<void> => {
    const uri = await pickFromGallery();
    if (uri) setImageUri(uri);
  };

  const handleGenerate = async (): Promise<void> => {
    if (!imageUri || !roomType || !style) return;
    setError(null);
    setGenerating(true);
    try {
      const design = await generate({
        imageUri,
        roomType,
        style,
        colorTheme: colorTheme ?? undefined,
        prompt: prompt.trim() || undefined,
      });
      router.push({ pathname: '/result/[id]', params: { id: design.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI chưa xử lý được ảnh này.');
    } finally {
      setGenerating(false);
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>AI Decor</Text>
        <Text style={styles.subtitle}>Chọn ảnh và phong cách, AI sẽ thiết kế lại căn phòng cho bạn.</Text>

        {/* ===== 1. ANH PHONG ===== */}
        <Text style={styles.step}>1. Ảnh căn phòng</Text>
        <ImagePickerBox
          imageUri={imageUri}
          onPickCamera={(): void => void handleCamera()}
          onPickGallery={(): void => void handleGallery()}
          onClear={(): void => setImageUri(null)}
        />

        {/* ===== 2. LOAI PHONG ===== */}
        <Text style={styles.step}>2. Loại phòng</Text>
        <View style={styles.chipWrap}>
          {ROOM_TYPES.map((r) => (
            <Chip
              key={r.id}
              label={r.label}
              iconName={r.iconName}
              selected={roomType === r.id}
              onPress={(): void => setRoomType(r.id)}
            />
          ))}
        </View>

        {/* ===== 3. PHONG CACH ===== */}
        <Text style={styles.step}>3. Phong cách</Text>
        <FlatList
          horizontal
          data={DESIGN_STYLES}
          keyExtractor={(item): string => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: DesignStyleOption }): React.JSX.Element => (
            <StyleCard item={item} selected={style === item.id} onPress={(s): void => setStyle(s.id)} />
          )}
        />
        {style ? (
          <Text style={styles.styleHint}>{DESIGN_STYLES.find((s) => s.id === style)?.description}</Text>
        ) : null}

        {/* ===== 4. MAU / CHU DE (tuy chon) ===== */}
        <Text style={styles.step}>
          4. Màu chủ đạo <Text style={styles.optional}>(tuỳ chọn)</Text>
        </Text>
        <View style={styles.chipWrap}>
          {COLOR_THEMES.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              swatchColor={c.hex}
              selected={colorTheme === c.id}
              // Bam lai lan nua de bo chon
              onPress={(): void => setColorTheme(colorTheme === c.id ? null : c.id)}
            />
          ))}
        </View>

        {/* ===== Ghi chu cho AI ===== */}
        <Text style={styles.step}>
          Ghi chú cho AI <Text style={styles.optional}>(tuỳ chọn)</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ví dụ: thêm nhiều cây xanh, giữ nguyên cửa sổ..."
          placeholderTextColor={COLORS.inactive}
          value={prompt}
          onChangeText={setPrompt}
          multiline
          maxLength={200}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ===== Nut Generate co dinh duoi man hinh ===== */}
      <View style={styles.footer}>
        {!canGenerate && !generating ? (
          <Text style={styles.footerHint}>Cần chọn ảnh, loại phòng và phong cách</Text>
        ) : null}
        <Button
          title={error ? 'Thử lại' : '✨ Thiết kế bằng AI'}
          onPress={(): void => void handleGenerate()}
          disabled={!canGenerate}
          loading={generating}
        />
      </View>

      <GeneratingOverlay visible={generating} />
    </SafeAreaView>
  );
};

export default AIDecorScreen;
