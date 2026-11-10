/**
 * src/components/design/DesignActionsSheet.tsx
 * Bang thao tac 1 thiet ke (nhan giu the hoac bam "..." o man "Của tôi"):
 *   Mở · Đổi tên · Đổi loại phòng · Nhân bản thành phương án mới · Xoá
 * Doi ten / loai phong lam ngay trong bang (khong mo man khac).
 */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import RoomTypePicker from '@/components/design/RoomTypePicker';
import { COLORS, FONT, RADIUS, SPACING } from '@/constants/colors';
import { isRoomType, DEFAULT_ROOM_TYPE, type RoomType } from '@/constants/room-types';
import type { DesignDetail, IoniconName } from '@/types';

const NAME_MAX = 200;

interface DesignActionsSheetProps {
  design: DesignDetail | null;
  onClose: () => void;
  onOpen: (design: DesignDetail) => void;
  onRename: (design: DesignDetail, name: string) => Promise<void>;
  onChangeType: (design: DesignDetail, type: RoomType) => Promise<void>;
  onDuplicate: (design: DesignDetail) => Promise<void>;
  onDelete: (design: DesignDetail) => void;
}

type Mode = 'menu' | 'rename' | 'type';

const ActionRow: React.FC<{ icon: IoniconName; label: string; hint?: string; danger?: boolean; onPress: () => void; disabled?: boolean }> = ({
  icon,
  label,
  hint,
  danger,
  onPress,
  disabled,
}) => (
  <Pressable
    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityState={{ disabled }}
  >
    <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
      <Ionicons name={icon} size={20} color={danger ? COLORS.dangerText : COLORS.textPrimary} />
    </View>
    <View style={styles.flex}>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
    </View>
    {danger ? null : <Ionicons name="chevron-forward" size={18} color={COLORS.inactive} />}
  </Pressable>
);

const DesignActionsSheet: React.FC<DesignActionsSheetProps> = ({
  design,
  onClose,
  onOpen,
  onRename,
  onChangeType,
  onDuplicate,
  onDelete,
}) => {
  const [mode, setMode] = useState<Mode>('menu');
  const [name, setName] = useState('');
  const [type, setType] = useState<RoomType>(DEFAULT_ROOM_TYPE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Moi lan mo bang cho 1 thiet ke khac -> ve menu, dien san ten / loai hien tai
  useEffect(() => {
    if (!design) return;
    setMode('menu');
    setName(design.name);
    setType(isRoomType(design.roomType) ? design.roomType : DEFAULT_ROOM_TYPE);
    setError(undefined);
    setBusy(false);
  }, [design]);

  if (!design) return null;

  const run = async (task: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      await task();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi, vui lòng thử lại.');
      setBusy(false);
    }
  };

  const saveName = (): void => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Tên không được để trống');
      return;
    }
    void run(() => onRename(design, trimmed.slice(0, NAME_MAX)));
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} accessibilityLabel="Đóng" />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />
          <View style={styles.header}>
            {mode !== 'menu' ? (
              <Pressable onPress={(): void => setMode('menu')} hitSlop={10} accessibilityLabel="Quay lại" disabled={busy}>
                <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
              </Pressable>
            ) : null}
            <Text style={styles.title} numberOfLines={1}>
              {mode === 'rename' ? 'Đổi tên' : mode === 'type' ? 'Đổi loại phòng' : design.name}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Đóng" disabled={busy}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </Pressable>
          </View>

          {mode === 'menu' ? (
            <View>
              <ActionRow icon="open-outline" label="Mở thiết kế" onPress={(): void => onOpen(design)} disabled={busy} />
              <ActionRow icon="create-outline" label="Đổi tên" onPress={(): void => setMode('rename')} disabled={busy} />
              <ActionRow icon="pricetag-outline" label="Đổi loại phòng" onPress={(): void => setMode('type')} disabled={busy} />
              <ActionRow
                icon="copy-outline"
                label={busy ? 'Đang nhân bản...' : 'Nhân bản thành phương án mới'}
                hint="Cùng căn phòng, bày nội thất khác để so sánh"
                onPress={(): void => void run(() => onDuplicate(design))}
                disabled={busy}
              />
              <ActionRow icon="trash-outline" label="Xoá thiết kế" danger onPress={(): void => onDelete(design)} disabled={busy} />
            </View>
          ) : mode === 'rename' ? (
            <View style={styles.body}>
              <FormField
                label="Tên thiết kế"
                value={name}
                onChangeText={setName}
                error={error}
                maxLength={NAME_MAX}
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={saveName}
                editable={!busy}
              />
              <Button title="Lưu tên" iconName="checkmark-outline" onPress={saveName} loading={busy} />
            </View>
          ) : (
            <View style={styles.body}>
              <RoomTypePicker value={type} onChange={setType} disabled={busy} label="" />
              <Button
                title="Lưu loại phòng"
                iconName="checkmark-outline"
                onPress={(): void => void run(() => onChangeType(design, type))}
                loading={busy}
              />
            </View>
          )}
          {error && mode !== 'rename' ? <Text style={styles.error}>{error}</Text> : null}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingBottom: SPACING.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.borderStrong, marginTop: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  title: { flex: 1, fontSize: 18, fontFamily: FONT.bold, color: COLORS.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: SPACING.md },
  pressed: { backgroundColor: COLORS.fill },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fill,
  },
  rowIconDanger: { backgroundColor: COLORS.dangerSoft },
  rowLabel: { fontSize: 15, fontFamily: FONT.semibold, color: COLORS.textPrimary },
  rowLabelDanger: { color: COLORS.dangerText },
  rowHint: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: 2 },
  body: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  error: { color: COLORS.dangerText, fontSize: 13, fontFamily: FONT.regular, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
});

export default DesignActionsSheet;
