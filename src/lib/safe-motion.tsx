"use client";

/**
 * Safe wrapper around framer-motion's `motion` component.
 * Falls back to plain HTML elements if motion is unavailable at runtime
 * (e.g., in standalone Docker builds where module resolution can fail).
 */
import * as React from "react";

type AnyProps = Record<string, unknown>;

// Strip framer-motion-specific props so a plain element doesn't get them
const MOTION_PROP_KEYS = new Set([
  "initial", "animate", "exit", "transition", "variants",
  "whileInView", "whileHover", "whileTap", "whileFocus", "whileDrag",
  "viewport", "layout", "layoutId",
  "drag", "dragConstraints", "dragElastic", "dragMomentum",
  "onAnimationStart", "onAnimationComplete",
  "onViewportEnter", "onViewportLeave",
]);

function stripMotionProps(props: AnyProps): AnyProps {
  const cleaned: AnyProps = {};
  for (const key of Object.keys(props)) {
    if (!MOTION_PROP_KEYS.has(key)) {
      cleaned[key] = props[key];
    }
  }
  return cleaned;
}

// Create a fallback component that renders a plain HTML element
function createFallback(tag: string) {
  const Fallback = React.forwardRef<HTMLElement, AnyProps>((props, ref) => {
    return React.createElement(tag, { ...stripMotionProps(props), ref });
  });
  Fallback.displayName = `SafeMotion.${tag}`;
  return Fallback;
}

// Try to import motion from framer-motion
let realMotion: Record<string, React.ComponentType<AnyProps>> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fm = require("framer-motion");
  if (fm && fm.motion && typeof fm.motion.div !== "undefined") {
    realMotion = fm.motion;
  } else {
    console.warn("[safe-motion] framer-motion loaded but motion.div is undefined — using fallback divs");
  }
} catch (e) {
  console.warn("[safe-motion] framer-motion not available — using fallback divs:", e);
}

// Create a proxy that returns the real motion component or a fallback
export const safeMotion = new Proxy({} as Record<string, React.ComponentType<AnyProps>>, {
  get(_, tag: string) {
    if (realMotion && realMotion[tag]) {
      return realMotion[tag];
    }
    return createFallback(tag);
  },
});

// Also re-export Variants type for convenience
export type { Variants } from "framer-motion";
