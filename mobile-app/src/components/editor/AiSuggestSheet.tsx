/**
 * src/components/editor/AiSuggestSheet.tsx
 * Bang hoi truoc khi goi AI goi y bo tri:
 *   - Kieu goi y: "Sap xep lai do dang co" hoac "Goi y them do tu danh muc"
 *   - Phong cach (khong bat buoc): gia tri gui di trung voi cot style cua noi that trong CSDL
 *   - Ghi chu tu do (vd "chua cho de xe dap", "ban lam viec gan cua so")
 */
import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/common/Button';
import Chip from '@/components/common/Chip';
import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import type { AiSuggestMode, IoniconName } from '@/types';

/** value = gia tri cot style trong CSDL noi that, label = chu hien thi */
const STYLES = [
  { value: 'Hiện đại', label: 'Hiện đại' },
  { value: 'Minimal', label: 'Tối giản' },
  { value: 'Scandinavian', label: 'Bắc Âu' },
  { value: 'Retro', label: 'Cổ điển' },
  { value: 'Industrial', label: 'Công nghiệp' },
  { value: 'Bohemian', label: 'Bohemian' },
] as const;

const NOTE_MAX = 300;

const MODES: { id: AiSuggestMode; icon: IoniconName; title: string; detail: string }[] = [
  {
    id: 'rearrange',
    icon: 'swap-horizontal-outline',
    title: 'Sắp xếp lại đồ đang có',
    detail: 'Giữ nguyên các món, AI tìm chỗ đặt hợp lý hơn.',
  },
  {
    id: 'add',
    icon: 'add-circle-outline',
    title: 'Gợi ý thêm đồ từ danh mục',
    detail: 'Giữ nguyên đồ đang đặt, AI chọn thêm vài món còn thiếu.',
  },
];

export interface AiSuggestChoice {
  mode: AiSuggestMode;
  style?: string;
  note?: string;
}

interface AiSuggestSheetProps {
  visible: boolean;
  /** Phong chua co mon nao thi khong cho chon "Sap xep lai" */
  hasFurniture: boolean;
  onClose: () => void;
  onSubmit: (choice: AiSuggestChoice) => void;
}

const AiSuggestSheet: React.FC<AiSuggestSheetProps> = ({ visible, hasFurniture, onClose, onSubmit }) => {
  const [mode, setMode] = useState<AiSuggestMode>(hasFurniture ? 'rearrange' : 'add');
  const [style, setStyle] = useState<string | undefined>();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (!hasFurniture) setMode('add');
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, hasFurniture, onClose]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Đóng" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>AI gợi ý bố trí</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Đóng">
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {MODES.map((m) => {
              const disabled = m.id === 'rearrange' && !hasFurniture;
              const selected = mode === m.id;
              return (
                <Pressable
                  key={m.id}
                  style={[styles.mode, selected && styles.modeSelected, disabled && styles.modeDisabled]}
                  onPress={(): void => setMode(m.id)}
                  disabled={disabled}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled }}
                >
                  <Ionicons name={m.icon} size={22} color={selected ? COLORS.accent : COLORS.textSecondary} />
                  <View style={styles.modeText}>
                    <Text style={styles.modeTitle}>{m.title}</Text>
                    <Text style={styles.modeDetail}>{disabled ? 'Phòng chưa có món nào để sắp xếp.' : m.detail}</Text>
                  </View>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? COLORS.accent : COLORS.inactive}
                  />
                </Pressable>
              );
            })}

            <Text style={styles.label}>Phong cách (không bắt buộc)</Text>
            <View style={styles.chips}>
              {STYLES.map((s) => (
                <Chip
                  key={s.value}
                  label={s.label}
                  selected={style === s.value}
                  onPress={(): void => setStyle((prev) => (prev === s.value ? undefined : s.value))}
                />
              ))}
            </View>

            <Text style={styles.label}>Ghi chú cho AI (không bắt buộc)</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="VD: chừa lối đi rộng, bàn làm việc gần cửa sổ"
              placeholderTextColor={COLORS.inactive}
              maxLength={NOTE_MAX}
              multiline
              accessibilityLabel="Ghi chú cho AI"
            />
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Gợi ý"
              iconName="sparkles-outline"
              onPress={(): void => onSubmit({ mode, style, note: note.trim() || undefined })}
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 25, elevation: 25 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay },
  sheet: {
    maxHeight: '90%',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  body: { padding: SPACING.md, gap: 10 },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modeSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  modeDisabled: { opacity: 0.5 },
  modeText: { flex: 1 },
  modeTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  modeDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginTop: SPACING.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  input: {
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    color: COLORS.textPrimary,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  footer: { paddingHorizontal: SPACING.md, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
});

export default AiSuggestSheet;
