/**
 * src/hooks/useRoomImagePicker.ts
 * Chup anh / chon anh phong, tu xin quyen camera & thu vien anh.
 * Tra ve anh (uri + kich thuoc) hoac null neu nguoi dung huy / tu choi quyen.
 */
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

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

export const useRoomImagePicker = (): {
  pickFromCamera: () => Promise<PickedImage | null>;
  pickFromGallery: () => Promise<PickedImage | null>;
} => {
  const pickFromCamera = useCallback(async (): Promise<PickedImage | null> => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showPermissionAlert('camera');
      return null;
    }
    return toPicked(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  }, []);

  const pickFromGallery = useCallback(async (): Promise<PickedImage | null> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showPermissionAlert('thư viện ảnh');
      return null;
    }
    return toPicked(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  }, []);

  return { pickFromCamera, pickFromGallery };
};
