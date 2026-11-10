/**
 * src/utils/haptics.ts
 * Rung nhe phan hoi thao tac (UI UX Pro Max: moi lan bam phai co phan hoi ro rang).
 *  - tap:     bam nut chinh
 *  - select:  doi lua chon (chip, tab, che do xem)
 *  - press:   nhan giu mo menu
 *  - success / warning: luu xong / sap xoa
 * May khong ho tro (web, may ao) -> bo qua im lang.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';
const safe = (task: () => Promise<void>): void => {
  if (!enabled) return;
  task().catch(() => undefined);
};

export const haptic = {
  tap: (): void => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  select: (): void => safe(() => Haptics.selectionAsync()),
  press: (): void => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: (): void => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: (): void => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
