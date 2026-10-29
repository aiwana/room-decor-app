/**
 * src/components/design/View3D.tsx
 * Xem phong 3D trong WebView bang Three.js. Phan dung canh (noi that theo loai, tuong tu cat khi chan camera,
 * cua, anh sang, bong do) nam trong view3d-scene.ts; file nay chi gom du lieu va tao trang HTML.
 *
 *  - three@0.169 khong con build/three.min.js va examples/js -> dung ES module + importmap
 *  - don vi 1 = 1 met; kich thuoc noi that (cm) doi sang met; toa do placement 0..1 -> nhan voi kich thuoc phong
 *  - san ve theo da giac cac goc (phong chu L...), tuong khoet lo cua ra vao / cua so
 *  - van san / tuong lay tu anh vat lieu cua may chu (textureUrl); trang dat baseUrl = dia chi may chu
 *    de WebGL doc anh cung nguon (khong vuong CORS)
 * Can Internet de tai Three.js tu CDN (lan dau).
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { COLORS } from '@/constants/colors';
import { getMaterialColor } from '@/constants/materials';
import type { FloorPlan, Furniture, FurniturePlacement, Material } from '@/types';
import { toAssetUrl } from '@/utils';
import { floorPlanPolygon } from '@/utils/room-geometry';

import { SCENE_SCRIPT } from './view3d-scene';

const THREE_VERSION = '0.169.0';
const CM_PER_M = 100;
/** Mot anh van vat lieu phu bao nhieu met (anh Poly Haven ~2m; granite_tile_03 la 2x2 vien 60cm) */
const TEXTURE_METERS: Record<string, number> = { 'granite_tile_03.jpg': 1.2 };
const DEFAULT_TEXTURE_METERS = 2;

interface View3DProps {
  floorPlan: FloorPlan;
  placements: FurniturePlacement[];
  furnitureById: Map<string, Furniture>;
  floorMaterial?: string;
  wallMaterial?: string;
  skirtingMaterial?: string;
  /** Danh sach vat lieu (de lay mau + anh van) */
  materials?: Material[];
}

interface TextureSpec {
  url: string;
  meters: number;
}

const textureOf = (code: string | undefined, materials?: Material[]): TextureSpec | null => {
  const url = toAssetUrl(materials?.find((m) => m.code === code)?.textureUrl);
  if (!url) return null;
  const file = url.split('/').pop() ?? '';
  return { url, meters: TEXTURE_METERS[file] ?? DEFAULT_TEXTURE_METERS };
};

const buildScene = ({
  floorPlan,
  placements,
  furnitureById,
  floorMaterial,
  wallMaterial,
  skirtingMaterial,
  materials,
}: View3DProps) => ({
  background: COLORS.background,
  room: { width: floorPlan.roomWidth, depth: floorPlan.roomDepth, height: floorPlan.ceilingHeight },
  floor: floorPlanPolygon(floorPlan),
  openings: floorPlan.openings ?? [],
  floorColor: getMaterialColor(floorMaterial, 'floor', materials),
  wallColor: getMaterialColor(wallMaterial, 'wall', materials),
  skirtingColor: getMaterialColor(skirtingMaterial, 'skirting', materials),
  floorTexture: textureOf(floorMaterial, materials),
  // Son tuong khong co anh van -> chi dung mau
  wallTexture: textureOf(wallMaterial, materials),
  items: placements.flatMap((p) => {
    const f = furnitureById.get(p.furnitureId);
    if (!f) return [];
    return [
      {
        x: p.x * floorPlan.roomWidth,
        z: p.y * floorPlan.roomDepth,
        w: Math.max((f.width / CM_PER_M) * p.scale, 0.02),
        d: Math.max((f.depth / CM_PER_M) * p.scale, 0.02),
        h: Math.max((f.height / CM_PER_M) * p.scale, 0.01),
        rotation: p.rotation,
        category: f.category,
        name: f.name,
        material: f.material ?? null,
        modelUrl: toAssetUrl(f.modelUrl) ?? null,
      },
    ];
  }),
});

export const buildView3DHtml = (scene: ReturnType<typeof buildScene>): string => `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
<style>html,body{margin:0;height:100%;overflow:hidden;background:${COLORS.background};color:#b0b0b0;font-family:sans-serif}
#msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-size:14px}</style>
<script type="importmap">{"imports":{
  "three":"https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.js",
  "three/addons/":"https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/examples/jsm/"}}</script>
</head><body>
<div id="msg">Đang tải 3D...</div>
<script>setTimeout(function(){var m=document.getElementById('msg');if(m)m.textContent='Không tải được 3D. Kiểm tra kết nối Internet rồi mở lại.';},15000);
window.__SCENE__=${JSON.stringify(scene).replace(/</g, '\\u003c')};</script>
<script type="module">${SCENE_SCRIPT}</script>
</body></html>`;

const View3D: React.FC<View3DProps> = (props) => {
  const { floorPlan, placements, furnitureById, floorMaterial, wallMaterial, skirtingMaterial, materials } = props;
  const html = useMemo(
    () =>
      buildView3DHtml(
        buildScene({ floorPlan, placements, furnitureById, floorMaterial, wallMaterial, skirtingMaterial, materials }),
      ),
    [floorPlan, placements, furnitureById, floorMaterial, wallMaterial, skirtingMaterial, materials],
  );
  // Cung nguon voi may chu de tai anh van san/tuong
  const baseUrl = toAssetUrl('/');

  return (
    <View style={styles.container}>
      <WebView originWhitelist={['*']} source={{ html, baseUrl }} style={styles.webview} javaScriptEnabled />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  webview: { flex: 1, backgroundColor: COLORS.background },
});

export default View3D;
