"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Product3DVial — echtes 3D-Vial-Modell via react-three-fiber.
 *
 * Geometrie ist synthetisch (Three.js primitives), kein externes GLB:
 *   - Glas-Zylinder mit Physical-Material (Transmission/IOR für echtes Glas)
 *   - Crimp-Ring (silber, metallic) am Übergang Hals→Cap
 *   - Cap (farbig, matte) — Farbe per Prop
 *   - Label-Plane mit dynamisch generierter Canvas-Texture
 *     (ChromePeps-Logo + Produktname + „Research Use Only")
 *   - Bottom-Cap (subtle dunkler Glasboden)
 *
 * UX:
 *   - OrbitControls: User dragt zum Drehen, kein Zoom, kein Pan
 *   - Auto-Rotation langsam (idle bei keine Interaktion)
 *   - prefers-reduced-motion → kein auto-rotate, OrbitControls bleiben
 *   - Lazy-mounted via next/dynamic (Three.js gehört nicht in den
 *     First-Load Bundle)
 *
 * AUDIT_REPORT_v3 §6 — User-Wunsch nach echtem 3D-Modell statt CSS-Tilt.
 */

interface VialModelProps {
  productName: string;
  capColor: string;
}

function VialModel({ productName, capColor }: VialModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [userInteracting, setUserInteracting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Listener für Pointer-Interaktion: pause Auto-Rotate während der
  // User selbst dreht, resume nach 2 s ohne Interaktion.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const onDown = () => {
      setUserInteracting(true);
      clearTimeout(timeout);
    };
    const onUp = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setUserInteracting(false), 2000);
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
    if (reducedMotion || userInteracting) return;
    if (groupRef.current) {
      // ~12°/s = sanftes Drehen, ein ganzer 360°-Turn alle 30 s
      groupRef.current.rotation.y += delta * 0.21;
    }
  });

  // Label-Texture: per Canvas-2D generiert. Wrapped einmal vollständig
  // um den Glaskörper (UV-Map vom CylinderGeometry mapped 0..1 auf den
  // Umfang).
  const labelTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const w = 1024;
    const h = 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background: dunkel mit subtle horizontal gradient für tiefe
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "#050507");
    grad.addColorStop(0.5, "#0d0d12");
    grad.addColorStop(1, "#050507");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // CP-Logo monogramm — oben mittig
    ctx.fillStyle = "#f5f3ee";
    ctx.font = "bold 110px 'Comfortaa', 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CP", w / 2, 140);

    // Hairline trennt Logo von Name
    ctx.strokeStyle = "rgba(214, 168, 84, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 80, 220);
    ctx.lineTo(w / 2 + 80, 220);
    ctx.stroke();

    // Produktname — groß, zentriert
    ctx.fillStyle = "#f5f3ee";
    const maxNameWidth = w * 0.85;
    let fontSize = 140;
    do {
      ctx.font = `bold ${fontSize}px 'Comfortaa', 'DM Sans', sans-serif`;
      fontSize -= 8;
    } while (ctx.measureText(productName).width > maxNameWidth && fontSize > 40);
    ctx.fillText(productName, w / 2, h / 2 + 30);

    // „Research Use Only" - pill-Badge am unteren Rand
    const badgeY = h - 90;
    const badgeWidth = 460;
    const badgeHeight = 56;
    const badgeX = w / 2 - badgeWidth / 2;
    ctx.fillStyle = "#1a1a1f";
    roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 28);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 28);
    ctx.stroke();

    ctx.fillStyle = "rgba(245, 243, 238, 0.85)";
    ctx.font = "500 30px 'DM Mono', 'JetBrains Mono', monospace";
    ctx.fillText("Research Use Only", w / 2, badgeY + badgeHeight / 2 + 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [productName]);

  return (
    <group ref={groupRef}>
      {/* Glas-Korpus — Hauptkörper */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 1.6, 64, 1, false]} />
        <meshPhysicalMaterial
          color="#e0e0e8"
          transmission={0.85}
          opacity={0.6}
          transparent
          roughness={0.05}
          thickness={0.3}
          ior={1.5}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glas-Pulver/Lyophilisat im unteren Drittel (heller Grund) */}
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.53, 0.53, 0.55, 64]} />
        <meshStandardMaterial
          color="#f0f0f4"
          roughness={0.85}
          metalness={0}
          opacity={0.95}
          transparent
        />
      </mesh>

      {/* Label — wraps fast den ganzen Korpus außer Hals */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.555, 0.555, 1.1, 64, 1, true]} />
        {labelTexture ? (
          <meshStandardMaterial
            map={labelTexture}
            side={THREE.DoubleSide}
            roughness={0.6}
            metalness={0}
          />
        ) : (
          <meshStandardMaterial color="#0a0a0c" side={THREE.DoubleSide} />
        )}
      </mesh>

      {/* Hals — schmaler Übergang nach oben */}
      <mesh position={[0, 0.86, 0]}>
        <cylinderGeometry args={[0.42, 0.55, 0.13, 64]} />
        <meshPhysicalMaterial
          color="#e0e0e8"
          transmission={0.6}
          opacity={0.55}
          transparent
          roughness={0.1}
          thickness={0.2}
          ior={1.5}
        />
      </mesh>

      {/* Crimp-Ring — Aluminium-Verschluss zwischen Hals und Cap */}
      <mesh position={[0, 0.97, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.13, 64]} />
        <meshStandardMaterial
          color="#bababf"
          roughness={0.25}
          metalness={0.85}
        />
      </mesh>

      {/* Cap — farbig je nach Produkt */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.43, 0.45, 0.17, 64]} />
        <meshStandardMaterial color={capColor} roughness={0.55} metalness={0.05} />
      </mesh>

      {/* Cap-Top (etwas heller wegen direct lighting) */}
      <mesh position={[0, 1.195, 0]}>
        <cylinderGeometry args={[0.43, 0.43, 0.02, 64]} />
        <meshStandardMaterial color={capColor} roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Boden — heller Glasboden mit Highlight */}
      <mesh position={[0, -0.81, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.5, 0.05, 64]} />
        <meshPhysicalMaterial
          color="#e0e0e8"
          transmission={0.7}
          opacity={0.7}
          transparent
          roughness={0.15}
        />
      </mesh>
    </group>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

interface Product3DVialProps {
  productName: string;
  /** Cap-Farbe als HEX. Default lila (für GLP-1-Klasse passend). */
  capColor?: string;
}

export function Product3DVial({
  productName,
  capColor = "#8b5fbf",
}: Product3DVialProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 3.4], fov: 32 }}
      gl={{ antialias: true, alpha: false }}
      style={{
        width: "100%",
        height: "100%",
        background:
          "radial-gradient(circle at 50% 45%, #1a1b22 0%, #0a0a0c 80%)",
      }}
    >
      {/* Lighting-Setup für glaubwürdige Glas-Reflexionen */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 5, 5]} intensity={1.1} />
      <directionalLight position={[-5, 3, 4]} intensity={0.45} color="#7a6fff" />
      <directionalLight position={[0, -4, 3]} intensity={0.3} color="#d6a854" />
      <pointLight position={[0, 0, 2.2]} intensity={0.25} />

      {/* Environment für Reflexionen auf dem Glas/Metall — preset
          „studio" ist eine kontrastreiche HDRI die in @react-three/drei
          mitkommt und keinen Network-Fetch braucht. */}
      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.5} />
        <VialModel productName={productName} capColor={capColor} />
      </Suspense>

      {/* OrbitControls: User dragt → drehen. Kein Zoom, kein Pan,
          Damping für smooth Verhalten, Polar-Range begrenzt damit
          das Vial nicht auf den Kopf gestellt wird. */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={(Math.PI * 2) / 3}
      />
    </Canvas>
  );
}
