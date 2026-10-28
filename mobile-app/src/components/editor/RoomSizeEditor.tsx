/**
 * src/components/editor/RoomSizeEditor.tsx
 * Sua kich thuoc phong do AI uoc luong: rong, dai, cao tran (met).
 */
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Button from '@/components/common/Button';
import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import { getErrorMessage } from '@/services/api-error';
import type { FloorPlan } from '@/types';

export interface RoomSizeValues {
  roomWidth: number;
  roomDepth: number;
  ceilingHeight: number;
}

interface RoomSizeEditorProps {
  visible: boolean;
  floorPlan: FloorPlan;
  onClose: () => void;
  onSave: (values: RoomSizeValues) => Promise<void>;
}

const MIN_SIDE = 0.5;
const MAX_SIDE = 50;
const MIN_CEILING = 1;
const MAX_CEILING = 10;

const formatValue = (value: number): string => String(Number(value.toFixed(2)));

const parseValue = (raw: string): number | null => {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
};

const SizeField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  grow?: boolean;
}> = ({ label, value, onChange, grow }) => (
  <View style={[styles.field, grow && styles.fieldGrow]}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrap}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        selectTextOnFocus
        placeholder="0"
        placeholderTextColor={COLORS.inactive}
        accessibilityLabel={label}
      />
      <Text style={styles.unit}>m</Text>
    </View>
  </View>
);

const RoomSizeEditor: React.FC<RoomSizeEditorProps> = ({ visible, floorPlan, onClose, onSave }) => {
  const [width, setWidth] = useState('');
  const [depth, setDepth] = useState('');
  const [ceiling, setCeiling] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setWidth(formatValue(floorPlan.roomWidth));
    setDepth(formatValue(floorPlan.roomDepth));
    setCeiling(formatValue(floorPlan.ceilingHeight));
    setError(null);
  }, [visible, floorPlan.roomWidth, floorPlan.roomDepth, floorPlan.ceilingHeight]);

  const handleSave = async (): Promise<void> => {
    const nextWidth = parseValue(width);
    const nextDepth = parseValue(depth);
    const nextCeiling = parseValue(ceiling);

    if (nextWidth === null || nextDepth === null || nextCeiling === null) {
      setError('Vui lòng nhập đủ số đo bằng mét.');
      return;
    }
    if (
      nextWidth < MIN_SIDE ||
      nextWidth > MAX_SIDE ||
      nextDepth < MIN_SIDE ||
      nextDepth > MAX_SIDE
    ) {
      setError(`Chiều rộng và chiều dài phải từ ${MIN_SIDE} đến ${MAX_SIDE} m.`);
      return;
    }
    if (nextCeiling < MIN_CEILING || nextCeiling > MAX_CEILING) {
      setError(`Chiều cao trần phải từ ${MIN_CEILING} đến ${MAX_CEILING} m.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({ roomWidth: nextWidth, roomDepth: nextDepth, ceilingHeight: nextCeiling });
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Kích thước phòng</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Đóng">
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Số đo do AI ước lượng từ ảnh. Bạn có thể sửa lại theo kích thước thực tế.
          </Text>

          <View style={styles.row}>
            <SizeField label="Chiều rộng" value={width} onChange={setWidth} grow />
            <SizeField label="Chiều dài" value={depth} onChange={setDepth} grow />
          </View>
          <SizeField label="Chiều cao trần" value={ceiling} onChange={setCeiling} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button title="Huỷ" variant="secondary" onPress={onClose} style={styles.action} />
            <Button title="Lưu kích thước" onPress={(): void => void handleSave()} loading={saving} style={styles.action} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.overlay,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  hint: { fontSize: 12, lineHeight: 18, color: COLORS.textSecondary },
  row: { flexDirection: 'row', gap: SPACING.md },
  field: { gap: 6 },
  fieldGrow: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: { flex: 1, fontSize: 16, color: COLORS.textPrimary, paddingVertical: 0 },
  unit: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 4 },
  error: { fontSize: 12, lineHeight: 17, color: COLORS.danger },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  action: { flex: 1 },
});

export default RoomSizeEditor;
