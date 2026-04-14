/**
 * ChromePeps CP monogram — premium liquid chrome 3D logomark.
 *
 * Renders the chrome CP image from /public/logo.png via next/image so it
 * gets responsive sizing, lazy loading where appropriate, and cache headers.
 *
 * The logo aspect ratio is roughly 1.4:1 (wider than tall) — width and
 * height props are kept in sync via that ratio when only one is given.
 *
 * Used in the header at small sizes and anywhere else a brand mark
 * is needed. For the favicon and apple touch icon, see
 * src/app/icon.png and src/app/apple-icon.png.
 */

import Image from "next/image";
import logoSrc from "../../../public/logo.png";

interface LogoIconProps {
  className?: string;
  /** Visible height in pixels (width is computed from aspect ratio). Defaults to 36. */
  size?: number;
  /** Mark this instance as the LCP image — use on the homepage hero only. */
  priority?: boolean;
}

export function LogoIcon({ className, size = 36, priority }: LogoIconProps) {
  // Logo source is 396×286 — keep that aspect ratio so the chrome edges
  // never look squished, regardless of the requested height.
  const aspectRatio = 396 / 286;
  const height = size;
  const width = Math.round(size * aspectRatio);

  return (
    <Image
      src={logoSrc}
      alt="ChromePeps"
      width={width}
      height={height}
      priority={priority}
      className={className}
      // The PNG already has its own anti-aliased edges; let the browser
      // do bilinear interpolation rather than pixelating on small sizes.
      style={{ width: "auto", height: `${height}px` }}
    />
  );
}
