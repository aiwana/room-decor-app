/**
 * src/components/furniture/FurnitureThumb.tsx
 * Hinh dai dien 1 mon do: co thumbnailUrl -> hien anh; chua co (bang furniture
 * chua co anh / model 3D) -> hien icon theo danh muc tren nen toi.
 */
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '@/constants/colors';
import { getCategoryIcon } from '@/constants/furniture';
import type { Furniture } from '@/types';
import { toAssetUrl } from '@/utils';

interface FurnitureThumbProps {
  furniture: Pick<Furniture, 'category' | 'thumbnailUrl'>;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

const FurnitureThumb: React.FC<FurnitureThumbProps> = ({ furniture, iconSize = 36, style }) => {
  const uri = toAssetUrl(furniture.thumbnailUrl);
  return (
    <View style={[styles.box, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Ionicons name={getCategoryIcon(furniture.category)} size={iconSize} color={COLORS.accent} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

export default FurnitureThumb;
