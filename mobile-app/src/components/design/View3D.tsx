import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import type { FloorPlan, FurniturePlacement, Furniture } from "@/types";

interface Props {
  floorPlan: FloorPlan;
  placements: FurniturePlacement[];
  furnitureMap: Map<string, Furniture>;
}

/**
 * 3D room view rendered in a WebView using Three.js.
 * Walls are extruded from the 2D floor plan; furniture is placed at 2D coordinates as 3D boxes.
 */
export function View3D({ floorPlan, placements, furnitureMap }: Props) {
  const html = useMemo(
    () => buildThreeHtml(floorPlan, placements, furnitureMap),
    [floorPlan, placements, furnitureMap]
  );

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

function buildThreeHtml(
  floorPlan: FloorPlan,
  placements: FurniturePlacement[],
  furnitureMap: Map<string, Furniture>
): string {
  const ppm = 50; // pixels per meter in 3D scene
  const wallHeight = floorPlan.ceilingHeight;

  // Build wall JSON for the script
  const wallsJson = JSON.stringify(
    floorPlan.walls.map((w) => ({
      x1: w.x1 * ppm, y1: w.y1 * ppm,
      x2: w.x2 * ppm, y2: w.y2 * ppm,
    }))
  );

  // Build furniture JSON
  const furnitureJson = JSON.stringify(
    placements.map((p) => {
      const f = furnitureMap.get(p.furnitureId);
      return f ? {
        x: p.x * ppm,
        y: p.y * ppm,
        w: f.width * ppm * p.scale,
        d: f.depth * ppm * p.scale,
        h: f.height * ppm * p.scale,
        rotation: p.rotation,
        name: f.name,
      } : null;
    }).filter(Boolean)
  );

  const roomW = floorPlan.roomWidth * ppm;
  const roomD = floorPlan.roomDepth * ppm;

  return `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>html,body{margin:0;padding:0;overflow:hidden;background:#1a1a2e;}canvas{display:block;}</style>
</head><body>
<script src="https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.169.0/examples/js/controls/OrbitControls.js"></script>
<script>
(function(){
  if (typeof THREE === 'undefined') { document.body.innerHTML = '<p style="color:#fff;text-align:center;padding:40px">Đang tải 3D...</p>'; return; }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 1, 5000);
  camera.position.set(${roomW} * 1.2, ${roomW} * 1.0, ${roomD} * 1.2);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(${roomW/2}, 0, ${roomD/2});

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(${roomW}, ${roomW * 2}, ${roomD});
  dir.castShadow = true;
  scene.add(dir);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(${roomW}, ${roomD}),
    new THREE.MeshStandardMaterial({ color: 0xd4c5a9, side: THREE.DoubleSide })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(${roomW/2}, 0, ${roomD/2});
  floor.receiveShadow = true;
  scene.add(floor);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, side: THREE.DoubleSide });
  const walls = ${wallsJson};
  walls.forEach(function(w){
    var len = Math.sqrt(Math.pow(w.x2-w.x1,2)+Math.pow(w.y2-w.y1,2));
    var angle = Math.atan2(w.y2-w.y1, w.x2-w.x1);
    var geo = new THREE.BoxGeometry(len, ${wallHeight * ppm}, 8);
    var mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set((w.x1+w.x2)/2, ${wallHeight * ppm}/2, (w.y1+w.y2)/2);
    mesh.rotation.y = -angle;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  // Furniture as boxes
  const furnitures = ${furnitureJson};
  var colorPalette = [0x8B4513, 0x6B8E23, 0xCD853F, 0x556B2F, 0xA0522D, 0xD2691E];
  furnitures.forEach(function(f, i){
    var color = colorPalette[i % colorPalette.length];
    var geo = new THREE.BoxGeometry(Math.max(f.w, 5), f.h, Math.max(f.d, 5));
    var mat = new THREE.MeshStandardMaterial({ color: color });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(f.x, f.h/2, f.y);
    mesh.rotation.y = -(f.rotation * Math.PI / 180);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  function animate(){
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', function(){
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
</script>
</body></html>`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  webview: { flex: 1, backgroundColor: "transparent" },
});
