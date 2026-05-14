"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import type * as THREE from "three";

/**
 * Product3DVial — echtes 3D-Vial-Modell aus einem GLB-Asset.
 *
 * Das GLB (`public/3d/vial.glb`) ist ein gekauftes Pharma-Vial-Modell
 * (Moderna-Vaccine-Vial), in Blender vorbereitet:
 *   - 6 Meshes: bottle / cap / closing_cap / frame / liquid / sticker
 *   - 1 Material (Principled BSDF: diffuse + glossiness→roughness +
 *     normal map), Texturen auf 1024/512 px downscaled, WEBP-embedded
 *   - zentriert auf Origin, Höhe ~2 units
 *   - GLB ~2.5 MB
 *
 * Warum GLB statt synthetischer Geometrie (vorheriger Versuch):
 *   - GLB lädt deterministisch über useGLTF/Suspense statt fragiler
 *     manueller Mesh-Konstruktion
 *   - Asset liegt lokal in public/ — kein CDN-Fetch der den
 *     Render-Stream killt
 *
 * UX:
 *   - OrbitControls: Drag zum Drehen, kein Zoom/Pan
 *   - Auto-Rotation (idle), pausiert bei Pointer-Interaktion
 *   - prefers-reduced-motion → kein Auto-Rotate
 *
 * Lazy-mounted via product-3d-vial-lazy.tsx — Three.js + GLB landen
 * nicht im First-Load Bundle.
 */

const VIAL_GLB_PATH = "/3d/vial.glb";

interface VialSceneProps {
  /** Auto-Rotation an/aus (von reduced-motion gesteuert). */
  autoRotate: boolean;
}

function VialScene({ autoRotate }: VialSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  // useGLTF(path, useDraco=false, useMeshopt=false): beide Decoder
  // explizit AUS. drei aktiviert sie sonst per Default — und der
  // Meshopt-Decoder ruft WebAssembly.instantiate() auf, was unsere
  // CSP (script-src ohne 'wasm-unsafe-eval' in Production) blockt:
  // der GLTF-Loader crasht beim Setup, die R3F-Scene initialisiert
  // nie (canvas.__r3f bleibt undefined). Unser GLB ist plain und
  // unkomprimiert (kein KHR_draco_* / EXT_meshopt_*), braucht also
  // keinen der beiden Decoder. useDraco=false killt zusätzlich den
  // gstatic.com-CDN-Fetch, den der Draco-Decoder sonst auslöst.
  const { scene } = useGLTF(VIAL_GLB_PATH, false, false);
  const [userInteracting, setUserInteracting] = useState(false);

  // Auto-Rotation pausiert während der User selbst dreht.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const onDown = () => {
      setUserInteracting(true);
      clearTimeout(timeout);
    };
    const onUp = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setUserInteracting(false), 2500);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      clearTimeout(timeout);
    };
  }, []);

  useFrame((_state, delta) => {
    if (!autoRotate || userInteracting) return;
    if (groupRef.current) {
      // ~14°/s — ein voller Turn alle ~26 s
      groupRef.current.rotation.y += delta * 0.24;
    }
  });

  // `scene` ist das geladene GLB-Root. primitive rendert es direkt.
  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

interface Product3DVialProps {
  /** Aktuell ungenutzt — reserviert für späteres dynamisches Label.
      Das gekaufte Modell hat ein fixes Moderna-Label-Mesh; ein
      Austausch der sticker-Textur kommt in einer Folge-Iteration. */
  productName?: string;
}

export function Product3DVial({}: Product3DVialProps) {
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setAutoRotate(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setAutoRotate(!e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.2, 3.6], fov: 32 }}
      gl={{ antialias: true, alpha: false }}
      style={{
        width: "100%",
        height: "100%",
        // Heller Pre-Render-Fallback. Sobald R3F rendert und gl.alpha
        // false ist, zählt nicht dieses CSS-background sondern das
        // <color attach="background"> unten — beide hell gehalten,
        // damit es vor/nach R3F-Mount keinen Farbsprung gibt.
        background: "#eef0f2",
      }}
    >
      {/* Scene-Background hell: das Vial-Modell ist überwiegend dunkel
          (schwarzes Label, dunkellila Cap, Klarglas) und war auf dem
          vorherigen fast-schwarzen Grund praktisch unsichtbar. Hell
          lässt es abheben, entspricht dem Produktfoto-Look UND gibt
          dem transmissiven Klarglas etwas Helles zum Durchscheinen. */}
      <color attach="background" args={["#eef0f2"]} />

      {/* Lighting — kein <Environment>, weil dessen HDRI-Preset über
          eine CDN fetched und im Production-Container den Render-
          Stream killt. Stattdessen mehrere Lights aus verschiedenen
          Winkeln + Farben für approximated reflections. */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 6, 5]} intensity={1.5} />
      <directionalLight position={[-5, 3, 4]} intensity={0.7} color="#a89eff" />
      <directionalLight position={[0, -3, 4]} intensity={0.4} color="#d6a854" />
      <directionalLight position={[3, -1, -4]} intensity={0.5} color="#ffffff" />
      <pointLight position={[0, 2, 3]} intensity={0.5} />
      <pointLight position={[-2, 0, 2]} intensity={0.35} color="#b8a0ff" />

      <Suspense fallback={null}>
        <VialScene autoRotate={autoRotate} />
      </Suspense>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={(Math.PI * 2) / 3}
      />
    </Canvas>
  );
}

// Preload damit das GLB schon im Hintergrund lädt sobald die
// Komponente importiert wird (next/dynamic-Chunk). Dieselben
// Decoder-Flags (false, false) wie beim useGLTF-Hook oben — sonst
// fasst der Preload-Pfad den Meshopt-WASM-Decoder an und scheitert
// genauso an der CSP.
useGLTF.preload(VIAL_GLB_PATH, false, false);
