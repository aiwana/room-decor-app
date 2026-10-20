/**
 * src/hooks/useRoomImagePicker.ts
 * Hook chup anh / chon anh phong, tu xin quyen camera & thu vien anh.
 * Tra ve uri cua anh (hoac null neu nguoi dung huy / tu choi quyen).
 */
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: false,
  quality: 0.8,
};

const showPermissionAlert = (what: string): void => {
  Alert.alert(
    'Cần quyền truy cập',
    `Room Decor AI cần quyền ${what} để lấy ảnh phòng. Bạn có thể bật trong Cài đặt.`,
    [
      { text: 'Để sau', style: 'cancel' },
      { text: 'Mở Cài đặt', onPress: (): void => void Linking.openSettings() },
    ],
  );
};

export const useRoomImagePicker = (): {
  pickFromCamera: () => Promise<string | null>;
  pickFromGallery: () => Promise<string | null>;
} => {
  const pickFromCamera = useCallback(async (): Promise<string | null> => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showPermissionAlert('camera');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    return result.canceled ? null : (result.assets[0]?.uri ?? null);
  }, []);

  const pickFromGallery = useCallback(async (): Promise<string | null> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showPermissionAlert('thư viện ảnh');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    return result.canceled ? null : (result.assets[0]?.uri ?? null);
  }, []);

  return { pickFromCamera, pickFromGallery };
};
