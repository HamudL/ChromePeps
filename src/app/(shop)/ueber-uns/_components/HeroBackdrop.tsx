"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ScreenQuad } from "@react-three/drei";
import * as THREE from "three";

/**
 * WebGL-Atmosphäre für den cinematischen Hero: domain-warped Fractal-Fog in
 * warmem Gold/Amber auf fast-schwarzem Grund, maus- & zeitreaktiv, mit
 * Vignette + Film-Grain. Fullscreen-Triangle via drei <ScreenQuad>.
 */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uMouse;
  uniform vec2  uRes;

  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0,0.0)), c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
    vec2 u = f*f*(3.0 - 2.0*f);
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }

  void main(){
    vec2 uv = vUv;
    float aspect = uRes.x / max(uRes.y, 1.0);
    vec2 p = (uv - 0.5); p.x *= aspect;
    vec2 m = uMouse * 0.35;
    float t = uTime * 0.04;
    vec2 q = vec2(fbm(p*1.4 + t), fbm(p*1.4 - t + 3.1));
    vec2 r = vec2(fbm(p*1.4 + q*1.1 + m + t*1.1), fbm(p*1.4 + q*1.1 - m + 1.7));
    float n = fbm(p*1.3 + r*1.6);
    float v = pow(smoothstep(0.15, 1.0, n), 1.8);
    vec3 base = vec3(0.035, 0.026, 0.016);
    vec3 gold = vec3(0.55, 0.36, 0.08);
    vec3 col = mix(base, gold, v * 0.5);
    float d = length(p - m * aspect);
    col += (0.04 / (d + 0.4)) * vec3(0.9, 0.6, 0.2) * 0.5;
    col *= mix(0.42, 1.0, smoothstep(1.25, 0.15, length(uv - 0.5)));
    col += (hash(uv * uRes + uTime) - 0.5) * 0.03;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Fog({ reduced }: { reduced: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uRes: { value: new THREE.Vector2(1, 1) },
    }),
    [],
  );
  useFrame((state) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    u.uTime.value = reduced ? 2.0 : state.clock.elapsedTime;
    u.uRes.value.set(size.width, size.height);
    const tx = state.pointer.x;
    const ty = state.pointer.y;
    u.uMouse.value.x += (tx - u.uMouse.value.x) * 0.04;
    u.uMouse.value.y += (ty - u.uMouse.value.y) * 0.04;
  });
  return (
    <ScreenQuad>
      <shaderMaterial
        ref={mat}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </ScreenQuad>
  );
}

export function HeroBackdrop({ className }: { className?: string }) {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <Canvas
      className={className}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      dpr={[1, 1.6]}
      frameloop={reduced ? "demand" : "always"}
      orthographic
      camera={{ position: [0, 0, 1] }}
    >
      <Fog reduced={reduced} />
    </Canvas>
  );
}
