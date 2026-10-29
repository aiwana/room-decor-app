/**
 * src/hooks/useRoomImagePicker.ts
 * Chup anh / chon anh phong, tu xin quyen camera & thu vien anh.
 * Tra ve anh (uri + kich thuoc) hoac null neu nguoi dung huy / tu choi quyen.
 */
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { createId } from '@/utils';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: false,
  quality: 0.8,
};

/**
 * Anh goc phong chup them: nen manh hon de 6 anh gui cho AI van duoi gioi han 14 MB
 * cua backend (AI chi can nhin hinh dang phong, khong can anh net cang).
 */
export const CORNER_PHOTO_QUALITY = 0.5;

const showPermissionAlert = (what: string): void => {
  Alert.alert('Cần quyền truy cập', `RoomDecor cần quyền ${what} để lấy ảnh phòng. Bạn có thể bật trong Cài đặt.`, [
    { text: 'Để sau', style: 'cancel' },
    { text: 'Mở Cài đặt', onPress: (): void => void Linking.openSettings() },
  ]);
};

const toPicked = (result: ImagePicker.ImagePickerResult): PickedImage | null => {
  if (result.canceled) return null;
  const asset = result.assets[0];
  return asset ? { uri: asset.uri, width: asset.width, height: asset.height } : null;
};

const IMAGE_DIR = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}room-images/` : null;

/**
 * Expo Go (va he dieu hanh) co the xoa file tam cua ImagePicker, lam preview/upload
 * mat anh sau khi app reload. Copy sang documentDirectory de giu anh on dinh.
 */
const persistPicked = async (picked: PickedImage): Promise<PickedImage> => {
  if (!IMAGE_DIR) return picked;
  try {
    const info = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
    }
    const ext = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(picked.uri)?.[1]?.toLowerCase() ?? 'jpg';
    const target = `${IMAGE_DIR}${createId('room')}.${ext}`;
    await FileSystem.copyAsync({ from: picked.uri, to: target });
    return { ...picked, uri: target };
  } catch (e) {
    if (__DEV__) console.warn('[RoomImage] persist failed', e);
    return picked;
  }
};

export const useRoomImagePicker = (
  quality: number = PICKER_OPTIONS.quality ?? 0.8,
): {
  pickFromCamera: () => Promise<PickedImage | null>;
  pickFromGallery: () => Promise<PickedImage | null>;
} => {
  const pickFromCamera = useCallback(async (): Promise<PickedImage | null> => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showPermissionAlert('camera');
      return null;
    }
    const picked = toPicked(await ImagePicker.launchCameraAsync({ ...PICKER_OPTIONS, quality }));
    return picked ? persistPicked(picked) : null;
  }, [quality]);

  const pickFromGallery = useCallback(async (): Promise<PickedImage | null> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showPermissionAlert('thư viện ảnh');
      return null;
    }
    const picked = toPicked(await ImagePicker.launchImageLibraryAsync({ ...PICKER_OPTIONS, quality }));
    return picked ? persistPicked(picked) : null;
  }, [quality]);

  return { pickFromCamera, pickFromGallery };
};
