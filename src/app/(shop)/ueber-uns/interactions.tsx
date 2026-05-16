"use client";

import { useEffect } from "react";

/**
 * UeberUnsInteractions — client-side interactions for the /ueber-uns page.
 *
 * Mirrors `ueber-uns.js` from the Claude Design handoff bundle, adapted to
 * React: everything runs once on mount and cleans up on unmount.
 *
 * Behaviors:
 *   - Reveal-on-scroll for `.reveal` elements (IntersectionObserver)
 *   - Top scroll-progress bar (#nav-progress-bar width tied to scrollY)
 *   - Hero vial mouse-parallax (CSS vars --mx/--my on #vial3d)
 *   - Sticky-scroll story section: panel switching + CSS class show-N
 *   - Count-up numbers ([data-count])
 *   - Magnetic buttons ([data-magnet])
 *   - HPLC chromatogram SVG draw-in animation
 *   - Smooth-scroll for in-page anchor links
 *
 * No frame-scrubbing in this iteration — assembly animation will land in
 * Phase 4. Currently the story-section vial is a static image whose
 * surrounding annotations swap per panel.
 *
 * `prefers-reduced-motion: reduce` short-circuits the parallax loop only
 * (other animations are CSS-controlled and respect their own queries).
 */
export function UeberUnsInteractions() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const cleanups: Array<() => void> = [];
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // ===== Reveal on scroll =====
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    document
      .querySelectorAll(".ueber-uns-design .reveal")
      .forEach((el) => revealObserver.observe(el));
    cleanups.push(() => revealObserver.disconnect());

    // ===== Nav scroll progress =====
    const navBar = document.getElementById("nav-progress-bar");
    let rafPending = false;
    const onScroll = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const ratio = Math.min(
          1,
          Math.max(0, window.scrollY / Math.max(1, max)),
        );
        if (navBar) navBar.style.width = ratio * 100 + "%";
        rafPending = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    cleanups.push(() =>
      window.removeEventListener("scroll", onScroll),
    );

    // ===== Hero vial — mouse parallax 3D tilt =====
    const heroStage = document.getElementById("heroVialStage");
    const vial3d = document.getElementById("vial3d");
    if (heroStage && vial3d && !reducedMotion) {
      let targetMx = 0,
        targetMy = 0,
        curMx = 0,
        curMy = 0;
      let rafId: number | null = null;

      const loop = () => {
        curMx += (targetMx - curMx) * 0.08;
        curMy += (targetMy - curMy) * 0.08;
        vial3d.style.setProperty("--mx", curMx.toFixed(3));
        vial3d.style.setProperty("--my", curMy.toFixed(3));
        if (
          Math.abs(targetMx - curMx) > 0.001 ||
          Math.abs(targetMy - curMy) > 0.001
        ) {
          rafId = requestAnimationFrame(loop);
        } else {
          rafId = null;
        }
      };
      const onMove = (e: MouseEvent) => {
        const r = heroStage.getBoundingClientRect();
        targetMx =
          (e.clientX - r.left - r.width / 2) / (r.width / 2);
        targetMy =
          (e.clientY - r.top - r.height / 2) / (r.height / 2);
        if (!rafId) loop();
      };
      const onLeave = () => {
        targetMx = 0;
        targetMy = 0;
        if (!rafId) loop();
      };
      heroStage.addEventListener("mousemove", onMove);
      heroStage.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        heroStage.removeEventListener("mousemove", onMove);
        heroStage.removeEventListener("mouseleave", onLeave);
        if (rafId) cancelAnimationFrame(rafId);
      });
    }

    // ===== Scroll-driven story section + Assembly-Frame-Scrubbing =====
    const storyTrack = document.getElementById("storyTrack");
    const storyFrame = document.getElementById("storyVialFrame");
    const storyAngle = document.getElementById("storyAngle");
    const storyFill = document.getElementById("storyProgressFill");
    const storyVialImg = document.getElementById(
      "storyVialImg",
    ) as HTMLImageElement | null;
    const panels = document.querySelectorAll<HTMLElement>(
      ".ueber-uns-design .story-panel",
    );
    const PANEL_COUNT = panels.length;

    // Assembly-Animation: 60 vor-gerenderte Cycles-Frames die das Vial von
    // disassembled (frame 1, Teile schweben) zu assembled (frame 60) zeigen.
    // Der scroll-Progress t (0-1) der Story-Section mappt direkt auf den
    // Frame-Index. Pfad: /ueber-uns/vial-assembly/frame_NN.webp.
    const ASSEMBLY_FRAMES = 60;
    const ASSEMBLY_URLS = Array.from(
      { length: ASSEMBLY_FRAMES },
      (_, i) =>
        `/ueber-uns/vial-assembly/frame_${String(i + 1).padStart(2, "0")}.webp`,
    );
    let currentAssemblyIdx = -1;

    // Frames im Hintergrund vorladen — beim ersten Mount kommen alle 60
    // (~3 MB) in den HTTP-Cache, damit Scroll-Scrubbing instant funktioniert.
    // `requestIdleCallback` falls verfügbar, sonst sofort.
    const preloadAssembly = () => {
      for (const url of ASSEMBLY_URLS) {
        const img = new Image();
        img.src = url;
      }
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(preloadAssembly, { timeout: 2000 });
    } else {
      window.setTimeout(preloadAssembly, 100);
    }

    const updateStory = () => {
      if (!storyTrack) return;
      const rect = storyTrack.getBoundingClientRect();
      const total = storyTrack.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const scrolled = -rect.top;
      const t = Math.min(1, Math.max(0, scrolled / total));

      if (storyFrame) storyFrame.style.setProperty("--t", t.toFixed(3));

      const idx = Math.min(
        PANEL_COUNT - 1,
        Math.floor(t * PANEL_COUNT * 0.999),
      );
      panels.forEach((p, i) => p.classList.toggle("active", i === idx));

      if (storyFrame) {
        for (let i = 1; i <= 4; i++)
          storyFrame.classList.remove("show-" + i);
        storyFrame.classList.add("show-" + (idx + 1));
      }
      if (storyAngle)
        storyAngle.textContent =
          String(idx + 1).padStart(2, "0") + " / 04";
      if (storyFill)
        storyFill.style.width = (t * 100).toFixed(1) + "%";

      // Assembly-Frame-Scrubbing: t → Frame-Index.
      // Nur src wechseln wenn sich der Index ändert (sonst flackert das
      // Browser-Image-Decoding bei jedem Scroll-Tick).
      if (storyVialImg) {
        const aIdx = Math.min(
          ASSEMBLY_FRAMES - 1,
          Math.floor(t * ASSEMBLY_FRAMES),
        );
        if (aIdx !== currentAssemblyIdx) {
          currentAssemblyIdx = aIdx;
          storyVialImg.src = ASSEMBLY_URLS[aIdx];
        }
      }
    };
    let storyRaf = false;
    const onStoryScroll = () => {
      if (storyRaf) return;
      storyRaf = true;
      requestAnimationFrame(() => {
        updateStory();
        storyRaf = false;
      });
    };
    window.addEventListener("scroll", onStoryScroll, { passive: true });
    window.addEventListener("resize", onStoryScroll);
    updateStory();
    cleanups.push(() => {
      window.removeEventListener("scroll", onStoryScroll);
      window.removeEventListener("resize", onStoryScroll);
    });

    // ===== Count-up numbers =====
    const counters = document.querySelectorAll<HTMLElement>(
      ".ueber-uns-design [data-count]",
    );
    const counted = new WeakSet<HTMLElement>();
    const animateCount = (el: HTMLElement) => {
      if (counted.has(el)) return;
      counted.add(el);
      const target = parseFloat(el.dataset.count || "0");
      // Robustness: if data-count is missing/non-numeric (z.B. wenn der
      // Server "—" eingesetzt hat statt einer Zahl), nicht animieren —
      // sonst würde "NaN" gerendert.
      if (!Number.isFinite(target)) return;
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const suffix = el.dataset.suffix || "";
      const duration = 1600;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = target * eased;
        el.textContent =
          val.toLocaleString("de-DE", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }) + suffix;
        if (t < 1) requestAnimationFrame(tick);
        else
          el.textContent =
            target.toLocaleString("de-DE", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            }) + suffix;
      };
      requestAnimationFrame(tick);
    };
    const countObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            animateCount(entry.target as HTMLElement);
            countObserver.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.4 },
    );
    counters.forEach((c) => countObserver.observe(c));
    cleanups.push(() => countObserver.disconnect());

    // ===== Magnetic buttons =====
    const magnetCleanups: Array<() => void> = [];
    document
      .querySelectorAll<HTMLElement>(".ueber-uns-design [data-magnet]")
      .forEach((btn) => {
        let rafId: number | null = null;
        const onMove = (e: MouseEvent) => {
          const r = btn.getBoundingClientRect();
          const x = e.clientX - r.left - r.width / 2;
          const y = e.clientY - r.top - r.height / 2;
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
            btn.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
          });
        };
        const onLeave = () => {
          if (rafId) cancelAnimationFrame(rafId);
          btn.style.transform = "";
        };
        btn.addEventListener("mousemove", onMove);
        btn.addEventListener("mouseleave", onLeave);
        magnetCleanups.push(() => {
          btn.removeEventListener("mousemove", onMove);
          btn.removeEventListener("mouseleave", onLeave);
          if (rafId) cancelAnimationFrame(rafId);
        });
      });
    cleanups.push(() => magnetCleanups.forEach((c) => c()));

    // ===== HPLC chromatogram =====
    const buildChromatogram = () => {
      const W = 600;
      const baseline = 270;
      const points: Array<[number, number]> = [];
      const gauss = (x: number, mu: number, sigma: number, amp: number) =>
        amp * Math.exp(-Math.pow(x - mu, 2) / (2 * sigma * sigma));
      for (let x = 0; x <= W; x += 2) {
        let y = baseline;
        y -= gauss(x, 40, 12, 22);
        y -= gauss(x, 150, 14, 14);
        y -= gauss(x, 280, 14, 215);
        y -= gauss(x, 430, 10, 18);
        y -= gauss(x, 510, 20, 8);
        y += (Math.random() - 0.5) * 1.4;
        points.push([x, Math.max(20, y)]);
      }
      let d = `M ${points[0][0]} ${points[0][1].toFixed(2)}`;
      for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i][0]} ${points[i][1].toFixed(2)}`;
      }
      const area = d + ` L ${W} ${baseline} L 0 ${baseline} Z`;
      return { d, area };
    };
    const chrom = buildChromatogram();
    const peakStroke = document.getElementById(
      "peakStroke",
    ) as SVGPathElement | null;
    const peakArea = document.getElementById(
      "peakArea",
    ) as SVGPathElement | null;
    const peakMarker = document.getElementById("peakMarker");
    const impurityMarker = document.getElementById("impurityMarker");

    if (peakStroke && peakArea) {
      peakStroke.setAttribute("d", chrom.d);
      peakArea.setAttribute("d", chrom.area);
      const pathLength = peakStroke.getTotalLength();
      peakStroke.setAttribute(
        "stroke-dasharray",
        `${pathLength} ${pathLength}`,
      );
      peakStroke.setAttribute("stroke-dashoffset", String(pathLength));
    }
    const runHplcAnim = () => {
      if (!peakStroke || !peakArea) return;
      const pathLength = peakStroke.getTotalLength();
      const duration = 2200;
      const start = performance.now();
      peakArea.style.transition = "opacity 1.2s ease";
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        peakStroke.setAttribute(
          "stroke-dashoffset",
          String(pathLength * (1 - eased)),
        );
        if (t < 1) requestAnimationFrame(tick);
        else {
          peakArea.style.opacity = "1";
          window.setTimeout(() => {
            if (peakMarker) {
              peakMarker.style.transition = "opacity 0.5s";
              peakMarker.style.opacity = "1";
            }
          }, 100);
          window.setTimeout(() => {
            if (impurityMarker) {
              impurityMarker.style.transition = "opacity 0.5s";
              impurityMarker.style.opacity = "1";
            }
          }, 350);
        }
      };
      requestAnimationFrame(tick);
    };
    const hplcWrap = document.querySelector(".ueber-uns-design .hplc");
    if (hplcWrap) {
      const hplcObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              runHplcAnim();
              hplcObserver.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.3 },
      );
      hplcObserver.observe(hplcWrap);
      cleanups.push(() => hplcObserver.disconnect());
    }

    // ===== Smooth-scroll for in-page anchor links =====
    const anchorCleanups: Array<() => void> = [];
    document
      .querySelectorAll<HTMLAnchorElement>(
        '.ueber-uns-design a[href^="#"]',
      )
      .forEach((a) => {
        const handler = (e: MouseEvent) => {
          const href = a.getAttribute("href");
          if (!href) return;
          const id = href.slice(1);
          if (!id) return;
          const target = document.getElementById(id);
          if (!target) return;
          e.preventDefault();
          const top =
            target.getBoundingClientRect().top + window.scrollY - 60;
          window.scrollTo({ top, behavior: "smooth" });
        };
        a.addEventListener("click", handler);
        anchorCleanups.push(() => a.removeEventListener("click", handler));
      });
    cleanups.push(() => anchorCleanups.forEach((c) => c()));

    return () => {
      for (const c of cleanups) c();
    };
  }, []);

  return null;
}
