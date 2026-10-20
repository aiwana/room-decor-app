/**
 * src/types/common.ts
 * Type dung chung, khong thuoc rieng module nao.
 */
import type { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';

import type { DesignStyleId, RoomTypeId } from './design';

/** Ten glyph hop le cua bo icon Ionicons */
export type IoniconName = keyof typeof Ionicons.glyphMap;

/** Item Quick Actions (icon tron tren man Home) */
export interface QuickAction {
  id: string;
  label: string;
  iconName: IoniconName;
  /** Duong dan Expo Router, vd '/ai-decor' */
  href: Href;
}

/** Anh cam hung (Inspiration) tren Home */
export interface Inspiration {
  id: string;
  title: string;
  styleId: DesignStyleId;
  roomTypeId: RoomTypeId;
  imageUrl: string;
}
