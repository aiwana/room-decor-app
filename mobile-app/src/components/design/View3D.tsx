/**
 * src/components/design/View3D.tsx
 * Xem phong 3D trong WebView bang Three.js: tuong dung len tu mat bang, noi that la cac khoi hop
 * dat dung vi tri / goc xoay / ti le nhu trong trinh chinh sua. Keo 1 ngon de xoay camera, chum de zoom.
 *
 * Dua tren View3D cua nhanh test-tinh-nang, sua:
 *  - three@0.169 khong con build/three.min.js va examples/js -> dung ES module + importmap
 *  - don vi 1 = 1 met; kich thuoc noi that (cm) doi sang met
 *  - toa do placement la ti le 0..1 -> nhan voi kich thuoc phong
 * Can Internet de tai Three.js tu CDN (lan dau).
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { COLORS } from '@/constants/colors';
import { getFloorColor, getWallColor } from '@/constants/materials';
import type { FloorPlan, Furniture, FurniturePlacement } from '@/types';

const THREE_VERSION = '0.169.0';
const CM_PER_M = 100;

interface View3DProps {
  floorPlan: FloorPlan;
  placements: FurniturePlacement[];
  furnitureById: Map<string, Furniture>;
  floorMaterial?: string;
  wallMaterial?: string;
}

interface SceneBox {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rotation: number;
}

const buildScene = (
  floorPlan: FloorPlan,
  placements: FurniturePlacement[],
  furnitureById: Map<string, Furniture>,
  floorMaterial?: string,
  wallMaterial?: string,
) => ({
  room: { width: floorPlan.roomWidth, depth: floorPlan.roomDepth, height: floorPlan.ceilingHeight },
  walls: floorPlan.walls,
  floorColor: getFloorColor(floorMaterial),
  wallColor: getWallColor(wallMaterial),
  boxes: placements.flatMap((p): SceneBox[] => {
    const f = furnitureById.get(p.furnitureId);
    if (!f) return [];
    return [
      {
        x: p.x * floorPlan.roomWidth,
        z: p.y * floorPlan.roomDepth,
        w: (f.width / CM_PER_M) * p.scale,
        d: (f.depth / CM_PER_M) * p.scale,
        h: (f.height / CM_PER_M) * p.scale,
        rotation: p.rotation,
      },
    ];
  }),
});

const buildHtml = (scene: ReturnType<typeof buildScene>): string => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
<style>html,body{margin:0;height:100%;overflow:hidden;background:${COLORS.background};color:#b0b0b0;font-family:sans-serif}
#msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-size:14px}</style>
<script type="importmap">{"imports":{
  "three":"https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.js",
  "three/addons/":"https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/examples/jsm/"}}</script>
</head><body>
<div id="msg">Đang tải 3D...</div>
<script>setTimeout(function(){var m=document.getElementById('msg');if(m)m.textContent='Không tải được 3D. Kiểm tra kết nối Internet rồi mở lại.';},15000);</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const data = ${JSON.stringify(scene)};
const { width: W, depth: D, height: H } = data.room;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
document.getElementById('msg').remove();

const scene = new THREE.Scene();
scene.background = new THREE.Color('${COLORS.background}');
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(W * 0.5, Math.max(W, D) * 1.5, D * 1.9);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(W / 2, 0, D / 2);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.05;

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(W, H * 3, D);
sun.castShadow = true;
scene.add(sun);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: data.floorColor, roughness: 0.75 }));
floor.rotation.x = -Math.PI / 2;
floor.position.set(W / 2, 0, D / 2);
floor.receiveShadow = true;
scene.add(floor);

// Duong ke 1m de nhin ro gach/vat lieu san
const gridPoints = [];
for (let x = 1; x < W; x++) gridPoints.push(new THREE.Vector3(x, 0.003, 0), new THREE.Vector3(x, 0.003, D));
for (let z = 1; z < D; z++) gridPoints.push(new THREE.Vector3(0, 0.003, z), new THREE.Vector3(W, 0.003, z));
if (gridPoints.length) {
  const grid = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(gridPoints),
    new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 })
  );
  scene.add(grid);
}

// Tuong hoi trong suot de nhin thay noi that tu moi goc
const wallMat = new THREE.MeshStandardMaterial({ color: data.wallColor, transparent: true, opacity: 0.35, depthWrite: false });
for (const w of data.walls) {
  const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(len, H, 0.08), wallMat);
  wall.position.set((w.x1 + w.x2) / 2, H / 2, (w.y1 + w.y2) / 2);
  wall.rotation.y = -Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
  wall.receiveShadow = true;
  scene.add(wall);
}

const palette = [0xe67e22, 0x8b4513, 0x6b8e23, 0xcd853f, 0x556b2f, 0xa0522d];
data.boxes.forEach((b, i) => {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(b.w, 0.05), Math.max(b.h, 0.05), Math.max(b.d, 0.05)),
    new THREE.MeshStandardMaterial({ color: palette[i % palette.length] })
  );
  box.position.set(b.x, b.h / 2, b.z);
  box.rotation.y = -(b.rotation * Math.PI) / 180;
  box.castShadow = true;
  scene.add(box);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
</script>
</body></html>`;

const View3D: React.FC<View3DProps> = ({
  floorPlan,
  placements,
  furnitureById,
  floorMaterial,
  wallMaterial,
}) => {
  const html = useMemo(
    () => buildHtml(buildScene(floorPlan, placements, furnitureById, floorMaterial, wallMaterial)),
    [floorPlan, placements, furnitureById, floorMaterial, wallMaterial],
  );

  return (
    <View style={styles.container}>
      <WebView originWhitelist={['*']} source={{ html }} style={styles.webview} javaScriptEnabled />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  webview: { flex: 1, backgroundColor: COLORS.background },
});

export default View3D;
