"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
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

      {/* Procedurale Studio-Environment für Glas-Refraktion + Metall-
          Reflexion. drei rendert aus den <Lightformer>-Kindern eine
          Cube-Map in einen internen RenderTarget — KEIN externes File,
          KEIN CDN-Fetch (genau das Problem, das <Environment preset=…>
          früher hatte). `background={false}` heißt: nur als Env-Map
          fürs Beleuchten/Reflektieren, der sichtbare Hintergrund bleibt
          das <color attach="background"> oben. Eine Top-Softbox, zwei
          Side-Panels, ein Backlight — Standard-Produktfoto-Setup. */}
      <Environment background={false} resolution={256}>
        <Lightformer
          intensity={2.5}
          position={[0, 3.5, 0]}
          rotation-x={Math.PI / 2}
          scale={[5, 5, 1]}
          color="#ffffff"
        />
        <Lightformer
          intensity={1.0}
          position={[4, 1, 4]}
          rotation-y={-Math.PI / 4}
          scale={[3, 6, 1]}
          color="#ffffff"
        />
        <Lightformer
          intensity={1.0}
          position={[-4, 1, 4]}
          rotation-y={Math.PI / 4}
          scale={[3, 6, 1]}
          color="#ffffff"
        />
        <Lightformer
          intensity={0.8}
          position={[0, 2, -4]}
          rotation-y={Math.PI}
          scale={[4, 4, 1]}
          color="#ffffff"
        />
      </Environment>

      {/* Direct Lights ergänzend zur Env-Map — die Env liefert Ambient
          + Reflexionen, hier nur noch ein dezenter Key für Highlight-
          Richtung und ein sanftes Fill. Die früheren bunten Fill-Lights
          (#a89eff / #d6a854 / #b8a0ff) waren Kompensation für die
          fehlende Env-Map und sind jetzt überflüssig. */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 5, 4]} intensity={1.2} />
      <directionalLight position={[-3, 2, 3]} intensity={0.35} />

      <Suspense fallback={null}>
        <VialScene autoRotate={autoRotate} />
      </Suspense>

      {/* Soft Contact-Shadow direkt unter dem Vial — verankert das
          Modell visuell auf dem hellen Hintergrund (Produktfoto-Look). */}
      <ContactShadows
        position={[0, -1.05, 0]}
        scale={5}
        blur={2.4}
        opacity={0.32}
        far={2.5}
      />

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
