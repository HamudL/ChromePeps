"use client";

import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

/* ── Smooth organic noise for liquid chrome surface ── */
function liquidNoise(x: number, y: number, z: number): number {
  return (
    Math.sin(x * 0.9 + z * 0.5) * 0.3 +
    Math.sin(y * 1.2 + x * 0.4) * 0.25 +
    Math.sin(z * 1.5 + y * 0.55) * 0.2 +
    Math.cos(x * 0.45 + z * 1.6) * 0.15 +
    Math.sin(x * 2.0 + y * 0.8 + z * 0.4) * 0.1
  );
}

export function ChromeLogo3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8;
    container.appendChild(renderer.domElement);

    /* ── Scene + Camera ── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 4.5);

    /* ── Lighting — chrome with iridescent blue + gold reflections ── */
    scene.add(new THREE.AmbientLight(0x404858, 0.7));

    // Key light — bright white from top-right
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    // Fill light — cool blue from left (creates blue iridescence)
    const fillLight = new THREE.DirectionalLight(0x60a0ff, 1.4);
    fillLight.position.set(-5, 1, 3);
    scene.add(fillLight);

    // Rim light — warm gold from behind (gold pearl effect)
    const rimLight = new THREE.DirectionalLight(0xdaa520, 0.9);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);

    // Top accent
    const topLight = new THREE.PointLight(0xffffff, 4, 15);
    topLight.position.set(0, 5, 3);
    scene.add(topLight);

    // Front fill — neutral
    const frontLight = new THREE.PointLight(0xc0c8d8, 2, 12);
    frontLight.position.set(0, 0, 6);
    scene.add(frontLight);

    /* ── Env map — high-contrast chrome with colored reflections ── */
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileCubemapShader();
    const envScene = new THREE.Scene();

    // Sky dome — cool dark gradient for mirror chrome
    const skyGeo = new THREE.SphereGeometry(50, 64, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      vertexColors: true,
    });
    const skyColors: number[] = [];
    const skyPos = skyGeo.attributes.position;
    for (let i = 0; i < skyPos.count; i++) {
      const y = skyPos.getY(i) / 50;
      const x = skyPos.getX(i) / 50;
      skyColors.push(
        THREE.MathUtils.lerp(0.08, 0.22, (y + 1) * 0.5) + Math.max(0, x * 0.03),
        THREE.MathUtils.lerp(0.09, 0.22, (y + 1) * 0.5),
        THREE.MathUtils.lerp(0.12, 0.30, (y + 1) * 0.5)
      );
    }
    skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(skyColors, 3));
    envScene.add(new THREE.Mesh(skyGeo, skyMat));

    const addPanel = (
      w: number, h: number, color: number, intensity: number,
      px: number, py: number, pz: number
    ) => {
      const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      mat.color.multiplyScalar(intensity);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      panel.position.set(px, py, pz);
      panel.lookAt(0, 0, 0);
      envScene.add(panel);
    };

    // Bright key panel — main chrome highlight (top-right)
    addPanel(12, 5, 0xffffff, 8, 5, 7, -8);
    // Blue fill panel (left) — blue iridescence
    addPanel(8, 4, 0x4080ff, 5, -8, 3, -5);
    // Narrow top strip — sharp edge highlight
    addPanel(16, 1.5, 0xf0f4ff, 9, 0, 10, -4);
    // Warm gold accent (bottom) — gold pearl iridescence
    addPanel(10, 3, 0xdaa520, 3.5, 0, -7, -5);
    // Orange accent (bottom-right) — warm iridescence
    addPanel(6, 3, 0xff8040, 2.5, 6, -5, -6);
    // Side fills — subtle
    addPanel(4, 12, 0xa0b0c8, 3, 12, 0, 2);
    addPanel(4, 12, 0x8098b8, 2.5, -12, 0, 2);
    // Back rim — cool
    addPanel(16, 6, 0x506080, 3, 0, 0, -18);
    // Front bounce
    addPanel(14, 4, 0xd0d8e8, 2.5, 0, -3, 12);
    // Blue accent panel (right side) — more blue iridescence
    addPanel(5, 4, 0x3060d0, 3, 8, 2, -3);

    const envMap = pmrem.fromScene(envScene, 0.012).texture;
    scene.environment = envMap;
    envScene.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
    pmrem.dispose();

    /* ── Material — mirror chrome with subtle gold pearl sheen ── */
    const material = new THREE.MeshPhysicalMaterial({
      metalness: 1,
      roughness: 0.02,            // very smooth = mirror chrome
      envMapIntensity: 5.5,       // strong reflections
      color: new THREE.Color("#c8d0e0"),  // cool silver chrome base
      clearcoat: 0.7,
      clearcoatRoughness: 0.03,
      reflectivity: 1,
      sheen: 0.15,                        // subtle gold pearl
      sheenColor: new THREE.Color("#c8a050"),
      sheenRoughness: 0.25,
      iridescence: 0.15,                  // subtle color shift at angles
      iridescenceIOR: 1.5,
    });

    /* ── Font loading + text geometry ── */
    const fontLoader = new FontLoader();
    let textMesh: THREE.Mesh | null = null;
    let originalPositions: Float32Array | null = null;
    let normalBuffer: Float32Array | null = null;
    const targetRotation = { x: 0, y: 0 };
    let pointerX = 0;
    let pointerY = 0;

    fontLoader.load("/fonts/helvetiker_bold.typeface.json", (font) => {
      if (disposed) return;
      const geo = new TextGeometry("ChromePeps", {
        font,
        size: 0.95,
        depth: 0.35,              // thicker for more liquid volume
        bevelEnabled: true,
        bevelThickness: 0.07,     // rounder bevels
        bevelSize: 0.04,
        bevelSegments: 12,
        curveSegments: 20,
      });
      geo.center();
      geo.computeVertexNormals();

      originalPositions = new Float32Array(geo.attributes.position.array);
      normalBuffer = new Float32Array(geo.attributes.normal.array);

      textMesh = new THREE.Mesh(geo, material);
      scene.add(textMesh);
      setLoaded(true);
    });

    /* ── Pointer tracking ── */
    const onPointerMove = (e: PointerEvent) => {
      pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      pointerY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onPointerMove);

    /* ── Resize ── */
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    /* ── Animation — smooth liquid chrome flow ── */
    const clock = new THREE.Clock();
    let animId = 0;
    const DISPLACEMENT = 0.028;   // more liquid feel
    const FLOW_SPEED = 0.4;      // visible flowing

    const animate = () => {
      if (disposed) return;
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (textMesh && originalPositions && normalBuffer) {
        // Smooth mouse-follow
        targetRotation.y = pointerX * 0.12;
        targetRotation.x = -pointerY * 0.06;

        textMesh.rotation.y = THREE.MathUtils.lerp(
          textMesh.rotation.y,
          targetRotation.y + Math.sin(t * 0.2) * 0.02,
          0.02
        );
        textMesh.rotation.x = THREE.MathUtils.lerp(
          textMesh.rotation.x,
          targetRotation.x,
          0.02
        );
        textMesh.rotation.z = Math.sin(t * 0.15) * 0.004;

        // Gentle breathing
        const s = 1 + Math.sin(t * 0.3) * 0.003;
        textMesh.scale.setScalar(s);

        // ── Liquid chrome vertex displacement ──
        const posAttr = textMesh.geometry.attributes.position;
        const arr = posAttr.array as Float32Array;
        const speed = t * FLOW_SPEED;

        for (let i = 0; i < arr.length; i += 3) {
          const ox = originalPositions[i];
          const oy = originalPositions[i + 1];
          const oz = originalPositions[i + 2];
          const nx = normalBuffer[i];
          const ny = normalBuffer[i + 1];
          const nz = normalBuffer[i + 2];

          const d =
            liquidNoise(
              ox * 2.0 + speed,
              oy * 2.0 + speed * 0.45,
              oz * 2.0 + speed * 0.25
            ) * DISPLACEMENT;

          arr[i] = ox + nx * d;
          arr[i + 1] = oy + ny * d;
          arr[i + 2] = oz + nz * d;
        }
        posAttr.needsUpdate = true;
        textMesh.geometry.computeVertexNormals();

        // Chrome shimmer — oscillate roughness for flowing highlights
        material.roughness =
          0.018 + Math.sin(t * 0.4) * 0.008 + Math.sin(t * 0.7) * 0.004;
        material.envMapIntensity =
          5.5 + Math.sin(t * 0.25) * 0.6;
      }

      renderer.render(scene, camera);
    };
    animate();

    /* ── Cleanup ── */
    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      material.dispose();
      envMap.dispose();
      if (textMesh) textMesh.geometry.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full" style={{ height: "clamp(160px, 25vw, 300px)" }}>
      {!loaded && (
        <h1 className="absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight chrome-text">
          ChromePeps
        </h1>
      )}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.6s ease-out" }}
      />
    </div>
  );
}
