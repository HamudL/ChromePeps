"use client";

import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

/* ── Organic noise for liquid metal displacement ── */
function liquidNoise(x: number, y: number, z: number): number {
  return (
    Math.sin(x * 1.4 + z * 0.7) * 0.35 +
    Math.sin(y * 1.8 + x * 0.6) * 0.25 +
    Math.sin(z * 2.1 + y * 0.9) * 0.2 +
    Math.sin(x * 3.2 + y * 1.3 + z * 0.8) * 0.12 +
    Math.cos(x * 0.7 + z * 2.4) * 0.18 +
    Math.sin(y * 2.6 + z * 1.1 + x * 0.5) * 0.1 +
    Math.cos(x * 4.1 + y * 2.7) * 0.08
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
    camera.position.set(0, 0, 4.2);

    /* ── Bright chrome lighting ── */
    scene.add(new THREE.AmbientLight(0x506080, 0.8));

    // Key light — bright top-right
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    // Fill light — cool blue from left
    const fillLight = new THREE.DirectionalLight(0x80a0ff, 1.2);
    fillLight.position.set(-5, 1, 3);
    scene.add(fillLight);

    // Rim light — warm gold from behind
    const rimLight = new THREE.DirectionalLight(0xffc070, 0.6);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);

    // Top accent point light
    const topLight = new THREE.PointLight(0xffffff, 4, 15);
    topLight.position.set(0, 5, 3);
    scene.add(topLight);

    // Front fill point light
    const frontLight = new THREE.PointLight(0xc0d0f0, 2, 12);
    frontLight.position.set(0, 0, 6);
    scene.add(frontLight);

    /* ── High-contrast env map for mirror-like chrome ── */
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileCubemapShader();
    const envScene = new THREE.Scene();

    // Medium-bright sky for chrome reflections
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
        THREE.MathUtils.lerp(0.12, 0.28, (y + 1) * 0.5) + Math.max(0, x * 0.04),
        THREE.MathUtils.lerp(0.12, 0.25, (y + 1) * 0.5),
        THREE.MathUtils.lerp(0.15, 0.35, (y + 1) * 0.5)
      );
    }
    skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(skyColors, 3));
    envScene.add(new THREE.Mesh(skyGeo, skyMat));

    // Studio light panels — creates dramatic highlights on chrome
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

    // Bright key panel (top-right — main highlight streak)
    addPanel(12, 5, 0xffffff, 7, 5, 7, -8);
    // Secondary fill panel (left)
    addPanel(8, 4, 0xd0e0ff, 5, -8, 3, -5);
    // Narrow top strip (creates sharp edge highlights)
    addPanel(16, 1.5, 0xf0f4ff, 8, 0, 10, -4);
    // Warm bottom accent
    addPanel(10, 3, 0xffc080, 3, 0, -7, -5);
    // Side fills (brighter)
    addPanel(4, 12, 0xa0b0d0, 3, 12, 0, 2);
    addPanel(4, 12, 0x90a8c8, 2.5, -12, 0, 2);
    // Back rim panel
    addPanel(16, 6, 0x607090, 3, 0, 0, -18);
    // Front bounce panel
    addPanel(14, 4, 0xd0d8e8, 2, 0, -3, 12);

    const envMap = pmrem.fromScene(envScene, 0.015).texture;
    scene.environment = envMap;
    envScene.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
    pmrem.dispose();

    /* ── Chrome material — bright mirror-like metallic finish ── */
    const material = new THREE.MeshPhysicalMaterial({
      metalness: 1,
      roughness: 0.025,
      envMapIntensity: 5.0,
      color: new THREE.Color("#d0daf0"),
      clearcoat: 0.5,
      clearcoatRoughness: 0.05,
      reflectivity: 1,
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
        size: 0.85,
        depth: 0.3,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.03,
        bevelSegments: 10,
        curveSegments: 18,
      });
      geo.center();
      geo.computeVertexNormals();

      // Store originals for displacement
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

    /* ── Animation loop ── */
    const clock = new THREE.Clock();
    let animId = 0;
    const DISPLACEMENT = 0.02;
    const FLOW_SPEED = 0.55;

    const animate = () => {
      if (disposed) return;
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (textMesh && originalPositions && normalBuffer) {
        // Mouse-follow rotation
        targetRotation.y = pointerX * 0.15;
        targetRotation.x = -pointerY * 0.08;

        textMesh.rotation.y = THREE.MathUtils.lerp(
          textMesh.rotation.y,
          targetRotation.y + Math.sin(t * 0.35) * 0.025,
          0.04
        );
        textMesh.rotation.x = THREE.MathUtils.lerp(
          textMesh.rotation.x,
          targetRotation.x,
          0.04
        );
        textMesh.rotation.z = Math.sin(t * 0.25) * 0.008;

        // Subtle breathing
        const s = 1 + Math.sin(t * 0.5) * 0.004;
        textMesh.scale.setScalar(s);

        // ── Liquid metal vertex displacement ──
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

          // Flowing noise along vertex normal
          const d =
            liquidNoise(
              ox * 2.8 + speed,
              oy * 2.8 + speed * 0.65,
              oz * 2.8 + speed * 0.35
            ) * DISPLACEMENT;

          arr[i] = ox + nx * d;
          arr[i + 1] = oy + ny * d;
          arr[i + 2] = oz + nz * d;
        }
        posAttr.needsUpdate = true;
        textMesh.geometry.computeVertexNormals();

        // Shimmer — oscillate roughness & env intensity
        material.roughness =
          0.02 + Math.sin(t * 0.7) * 0.01 + Math.sin(t * 1.1) * 0.006;
        material.envMapIntensity =
          5.0 + Math.sin(t * 0.4) * 0.8;
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
    <div className="relative w-full" style={{ height: "clamp(140px, 22vw, 260px)" }}>
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
