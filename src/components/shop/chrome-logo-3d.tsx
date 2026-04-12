"use client";

import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

/* ── Smoother organic noise for liquid metal displacement ── */
function liquidNoise(x: number, y: number, z: number): number {
  return (
    Math.sin(x * 1.0 + z * 0.5) * 0.3 +
    Math.sin(y * 1.3 + x * 0.4) * 0.25 +
    Math.sin(z * 1.6 + y * 0.6) * 0.2 +
    Math.cos(x * 0.5 + z * 1.8) * 0.15 +
    Math.sin(x * 2.2 + y * 0.9 + z * 0.5) * 0.1
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
    renderer.toneMappingExposure = 1.6;
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

    /* ── Warm chrome + gold lighting ── */
    scene.add(new THREE.AmbientLight(0x605040, 0.6));

    // Key light — warm white from top-right
    const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.5);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    // Fill light — cool silver from left (chrome contrast)
    const fillLight = new THREE.DirectionalLight(0xc0d0e8, 1.0);
    fillLight.position.set(-5, 1, 3);
    scene.add(fillLight);

    // Rim light — warm gold from behind
    const rimLight = new THREE.DirectionalLight(0xdaa520, 0.8);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);

    // Top accent
    const topLight = new THREE.PointLight(0xfff0d0, 3, 15);
    topLight.position.set(0, 5, 3);
    scene.add(topLight);

    // Front fill
    const frontLight = new THREE.PointLight(0xe0d8c8, 1.5, 12);
    frontLight.position.set(0, 0, 6);
    scene.add(frontLight);

    /* ── Env map — chrome with warm gold reflections ── */
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileCubemapShader();
    const envScene = new THREE.Scene();

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
      // Warm silver-gold gradient sky
      skyColors.push(
        THREE.MathUtils.lerp(0.14, 0.30, (y + 1) * 0.5) + Math.max(0, x * 0.05),
        THREE.MathUtils.lerp(0.12, 0.24, (y + 1) * 0.5),
        THREE.MathUtils.lerp(0.10, 0.20, (y + 1) * 0.5)
      );
    }
    skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(skyColors, 3));
    envScene.add(new THREE.Mesh(skyGeo, skyMat));

    // Studio panels
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

    // Warm key panel (top-right)
    addPanel(12, 5, 0xfff5e0, 6, 5, 7, -8);
    // Silver fill panel (left)
    addPanel(8, 4, 0xd0d8e8, 4, -8, 3, -5);
    // Narrow top strip
    addPanel(16, 1.5, 0xfff8ee, 7, 0, 10, -4);
    // Gold bottom accent
    addPanel(10, 3, 0xdaa520, 2.5, 0, -7, -5);
    // Side fills
    addPanel(4, 12, 0xb0a890, 2.5, 12, 0, 2);
    addPanel(4, 12, 0xa0988a, 2, -12, 0, 2);
    // Back rim
    addPanel(16, 6, 0x706050, 2.5, 0, 0, -18);
    // Front bounce — warm
    addPanel(14, 4, 0xe0d4c0, 2, 0, -3, 12);

    const envMap = pmrem.fromScene(envScene, 0.015).texture;
    scene.environment = envMap;
    envScene.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
    pmrem.dispose();

    /* ── Material — chrome with subtle gold pearl ── */
    const material = new THREE.MeshPhysicalMaterial({
      metalness: 1,
      roughness: 0.03,
      envMapIntensity: 4.5,
      color: new THREE.Color("#d8d0be"),    // warm chrome-gold base
      clearcoat: 0.6,
      clearcoatRoughness: 0.04,
      reflectivity: 1,
      sheen: 0.3,
      sheenColor: new THREE.Color("#c8a050"), // gold pearl sheen
      sheenRoughness: 0.2,
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
        size: 0.95,          // bigger
        depth: 0.32,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.035,
        bevelSegments: 10,
        curveSegments: 18,
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

    /* ── Animation loop — smoother, rounder motion ── */
    const clock = new THREE.Clock();
    let animId = 0;
    const DISPLACEMENT = 0.015;        // subtler
    const FLOW_SPEED = 0.35;           // slower = smoother

    const animate = () => {
      if (disposed) return;
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (textMesh && originalPositions && normalBuffer) {
        // Smoother mouse-follow (lower lerp factor)
        targetRotation.y = pointerX * 0.12;
        targetRotation.x = -pointerY * 0.06;

        textMesh.rotation.y = THREE.MathUtils.lerp(
          textMesh.rotation.y,
          targetRotation.y + Math.sin(t * 0.25) * 0.02,
          0.025    // smoother
        );
        textMesh.rotation.x = THREE.MathUtils.lerp(
          textMesh.rotation.x,
          targetRotation.x,
          0.025
        );
        textMesh.rotation.z = Math.sin(t * 0.18) * 0.005;

        // Gentle breathing
        const s = 1 + Math.sin(t * 0.35) * 0.003;
        textMesh.scale.setScalar(s);

        // Liquid metal displacement — smoother
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
              ox * 2.2 + speed,
              oy * 2.2 + speed * 0.5,
              oz * 2.2 + speed * 0.3
            ) * DISPLACEMENT;

          arr[i] = ox + nx * d;
          arr[i + 1] = oy + ny * d;
          arr[i + 2] = oz + nz * d;
        }
        posAttr.needsUpdate = true;
        textMesh.geometry.computeVertexNormals();

        // Subtle shimmer
        material.roughness =
          0.025 + Math.sin(t * 0.5) * 0.008;
        material.envMapIntensity =
          4.5 + Math.sin(t * 0.3) * 0.5;
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
