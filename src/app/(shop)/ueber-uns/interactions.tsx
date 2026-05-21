"use client";

import { useEffect } from "react";

/**
 * UeberUnsInteractions — client-side interactions for the /ueber-uns page
 * (Brand-Edition redesign from the Claude Design handoff).
 *
 * Ports `ueber-uns.js` from the handoff to React, with one substitution:
 * the design's 36-frame turntable scrub in the story section is replaced
 * by OUR 120-frame Cycles assembly sequence (Pulver rieselt → Stopfen →
 * Crimp → Cap → Label-Wipe) with rAF-lerp smoothing + decode preloading.
 *
 * Behaviors:
 *   - Reveal-on-scroll (.reveal → .in)
 *   - Chromatogram sub-nav: builds the HPLC trace + section peaks, drives a
 *     playhead + retention-time readout from scroll position
 *   - Hero specimen vial mouse-parallax (CSS vars --mx/--my on #specCard)
 *   - Scroll-locked story section: 4-panel switching + annotations + our
 *     120-frame assembly scrub (rAF-lerp, 3-digit frames, decode preload)
 *   - Count-up numbers ([data-count])
 *   - HPLC figure card: live-drawing trace + PASSED stamp on reveal
 *   - Smooth-scroll for in-page anchors (offset = site header + chrom-nav)
 *
 * Everything runs once on mount, cleans up on unmount. `prefers-reduced-
 * motion` short-circuits the mouse-parallax loop only.
 */
export function UeberUnsInteractions() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const cleanups: Array<() => void> = [];
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // ===== Reveal on scroll =====
    const revealObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            revealObs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    document
      .querySelectorAll(".ueber-uns-design .reveal")
      .forEach((el) => revealObs.observe(el));
    cleanups.push(() => revealObs.disconnect());

    // ===== Chromatogram sub-nav (table of contents as HPLC trace) =====
    const NAV_SECTIONS = [
      { id: "top", label: "01 Hero", peakX: 60 },
      { id: "manifest", label: "02 Manifest", peakX: 180 },
      { id: "story", label: "03 Vial", peakX: 320 },
      { id: "prozess", label: "04 Prozess", peakX: 460 },
      { id: "labor", label: "05 Labor", peakX: 610 },
      { id: "zahlen", label: "06 Zahlen", peakX: 750 },
      { id: "roadmap", label: "07 Roadmap", peakX: 870 },
      { id: "kontakt", label: "08 Kontakt", peakX: 960 },
    ];
    const NAV_HEIGHTS = [8, 14, 18, 16, 36, 14, 12, 9];
    const SVGNS = "http://www.w3.org/2000/svg";

    const buildChromNav = () => {
      const W = 1000;
      const BASE = 50;
      const trace = document.getElementById("chromNavTrace");
      const fill = document.getElementById("chromNavFill");
      const peaksG = document.getElementById("chromNavPeaks");
      if (!trace || !fill || !peaksG) return;

      const gauss = (x: number, mu: number, sigma: number, amp: number) =>
        amp * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));

      const pts: Array<[number, number]> = [];
      for (let x = 0; x <= W; x += 2) {
        let y = BASE;
        NAV_SECTIONS.forEach((s, i) => {
          y -= gauss(x, s.peakX, 11, NAV_HEIGHTS[i]);
        });
        y += Math.sin(x * 0.13) * 0.25 + (Math.random() - 0.5) * 0.35;
        pts.push([x, y]);
      }
      let d = `M ${pts[0][0]} ${pts[0][1].toFixed(2)}`;
      for (let i = 1; i < pts.length; i++)
        d += ` L ${pts[i][0]} ${pts[i][1].toFixed(2)}`;
      trace.setAttribute("d", d);
      fill.setAttribute("d", d + ` L ${W} ${BASE} L 0 ${BASE} Z`);

      NAV_SECTIONS.forEach((s, i) => {
        const a = document.createElementNS(SVGNS, "a");
        a.setAttribute("href", "#" + s.id);
        a.classList.add("peak-link");

        const hit = document.createElementNS(SVGNS, "rect");
        hit.setAttribute("x", String(s.peakX - 24));
        hit.setAttribute("y", "0");
        hit.setAttribute("width", "48");
        hit.setAttribute("height", "56");
        hit.setAttribute("fill", "transparent");

        const tick = document.createElementNS(SVGNS, "line");
        tick.setAttribute("class", "peak-tick");
        tick.setAttribute("x1", String(s.peakX));
        tick.setAttribute("x2", String(s.peakX));
        tick.setAttribute("y1", "50");
        tick.setAttribute("y2", "54");

        const dot = document.createElementNS(SVGNS, "circle");
        dot.setAttribute("cx", String(s.peakX));
        dot.setAttribute("cy", String(BASE - NAV_HEIGHTS[i]));
        dot.setAttribute("r", "1.6");
        dot.setAttribute("fill", "currentColor");

        const txt = document.createElementNS(SVGNS, "text");
        txt.setAttribute("class", "peak-label");
        txt.setAttribute("x", String(s.peakX));
        txt.setAttribute("y", "10");
        txt.setAttribute("text-anchor", "middle");
        txt.textContent = s.label;

        a.appendChild(hit);
        a.appendChild(tick);
        a.appendChild(dot);
        a.appendChild(txt);
        peaksG.appendChild(a);
      });
    };
    buildChromNav();

    // ===== Playhead + scroll progress (chrom-nav) =====
    const playhead = document.getElementById("chromNavPlayhead");
    const navTime = document.getElementById("chromNavTime");
    const navProgress = document.getElementById("navProgress"); // may be null
    const navSections = NAV_SECTIONS.map((s) => ({
      ...s,
      el: document.getElementById(s.id),
    })).filter((s) => s.el);

    const updatePlayhead = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const ratio = Math.min(1, Math.max(0, window.scrollY / max));
      const x = ratio * 1000;
      if (playhead) {
        playhead.setAttribute("x1", String(x));
        playhead.setAttribute("x2", String(x));
      }
      if (navProgress) navProgress.style.width = (ratio * 100).toFixed(2) + "%";
      if (navTime) {
        const tm = ratio * 10;
        const m = Math.floor(tm);
        const s = Math.floor((tm - m) * 60);
        navTime.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }
      const mid = window.scrollY + window.innerHeight * 0.35;
      let activeIdx = 0;
      for (let i = 0; i < navSections.length; i++) {
        const r = navSections[i].el!.getBoundingClientRect();
        const top = r.top + window.scrollY;
        if (top <= mid) activeIdx = i;
      }
      document.querySelectorAll(".ueber-uns-design .peak-link").forEach((g, i) => {
        g.classList.toggle("peak-hot", i === activeIdx);
      });
    };

    // ===== Hero specimen vial — mouse parallax =====
    const specCard = document.getElementById("specCard");
    if (specCard && !reduced) {
      let tx = 0,
        ty = 0,
        cx = 0,
        cy = 0;
      let rafId: number | null = null;
      const loop = () => {
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        specCard.style.setProperty("--mx", cx.toFixed(3));
        specCard.style.setProperty("--my", cy.toFixed(3));
        if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
          rafId = requestAnimationFrame(loop);
        } else {
          rafId = null;
        }
      };
      const onMove = (e: MouseEvent) => {
        const r = specCard.getBoundingClientRect();
        tx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        ty = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        if (!rafId) rafId = requestAnimationFrame(loop);
      };
      const onLeave = () => {
        tx = 0;
        ty = 0;
        if (!rafId) rafId = requestAnimationFrame(loop);
      };
      specCard.addEventListener("mousemove", onMove);
      specCard.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        specCard.removeEventListener("mousemove", onMove);
        specCard.removeEventListener("mouseleave", onLeave);
        if (rafId) cancelAnimationFrame(rafId);
      });
    }

    // ===== Story section — 120-frame assembly scrub + panels =====
    // Unsere vor-gerenderte Cycles-Assembly (Pulver rieselt 1-50, Stopfen
    // 30-64, Crimp 56-84, Cap 80-110, Label-Wipe 95-120). rAF-Lerp glättet
    // schnelle Scroll-Sprünge; img.decode() im Preload macht src-swaps <5ms.
    const storySection = document.getElementById("story");
    const storyVial = document.getElementById(
      "storyVial",
    ) as HTMLImageElement | null;
    const storyScan = document.getElementById("storyScan");
    const storyIdx = document.getElementById("storyIdx");
    const storyBar = document.getElementById("storyBar");
    const annots = document.querySelectorAll<HTMLElement>(
      ".ueber-uns-design .story-stage .annot",
    );
    const panels = document.querySelectorAll(
      ".ueber-uns-design .story-panel",
    );

    const ASSEMBLY_FRAMES = 120;
    const ASSEMBLY_URLS = Array.from(
      { length: ASSEMBLY_FRAMES },
      (_, i) =>
        `/ueber-uns/vial-assembly/frame_${String(i + 1).padStart(3, "0")}.webp`,
    );
    let currentAssemblyIdx = -1;
    let targetAssemblyIdx = 0;
    let displayedAssemblyIdx = 0;
    let lerpRaf: number | null = null;

    const preloadAssembly = () => {
      for (const url of ASSEMBLY_URLS) {
        const img = new Image();
        img.src = url;
        img.decode?.().catch(() => {});
      }
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(preloadAssembly, { timeout: 2000 });
    } else {
      window.setTimeout(preloadAssembly, 100);
    }

    const lerpAssemblyTick = () => {
      const diff = targetAssemblyIdx - displayedAssemblyIdx;
      if (Math.abs(diff) < 0.5) {
        displayedAssemblyIdx = targetAssemblyIdx;
        lerpRaf = null;
      } else {
        displayedAssemblyIdx += diff * 0.25;
        lerpRaf = requestAnimationFrame(lerpAssemblyTick);
      }
      const intIdx = Math.max(
        0,
        Math.min(ASSEMBLY_FRAMES - 1, Math.round(displayedAssemblyIdx)),
      );
      if (storyVial && intIdx !== currentAssemblyIdx) {
        currentAssemblyIdx = intIdx;
        storyVial.src = ASSEMBLY_URLS[intIdx];
      }
    };
    cleanups.push(() => {
      if (lerpRaf !== null) cancelAnimationFrame(lerpRaf);
    });

    const updateStory = () => {
      if (!storySection || !storyVial) return;
      const rect = storySection.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height + vh;
      const scrolled = vh - rect.top;
      const t = Math.min(1, Math.max(0, scrolled / total));

      // 4-panel index + annotations
      const active = Math.min(
        panels.length - 1,
        Math.floor(t * panels.length * 0.999),
      );
      annots.forEach((a) => {
        const want = parseInt(a.dataset.show || "0", 10);
        a.classList.toggle("show", active + 1 === want);
      });
      if (storyIdx)
        storyIdx.textContent = String(active + 1).padStart(2, "0") + " / 04";
      if (storyBar) storyBar.style.width = (t * 100).toFixed(1) + "%";
      if (storyScan) storyScan.style.setProperty("--t", t.toFixed(3));

      // Assembly frame scrub: t → target index, lerp tick does the swap.
      targetAssemblyIdx = Math.min(
        ASSEMBLY_FRAMES - 1,
        Math.floor(t * ASSEMBLY_FRAMES),
      );
      if (lerpRaf === null) lerpRaf = requestAnimationFrame(lerpAssemblyTick);
    };

    // ===== Master scroll loop =====
    let pending = false;
    const onScroll = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        updatePlayhead();
        updateStory();
        pending = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    });

    // ===== Count-up numbers =====
    const counted = new WeakSet<HTMLElement>();
    const animateCount = (el: HTMLElement) => {
      if (counted.has(el)) return;
      counted.add(el);
      const target = parseFloat(el.dataset.count || "");
      if (!Number.isFinite(target)) return; // "—" / unreplaced → skip
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const duration = 1600;
      const start = performance.now();
      const fmt = (v: number) =>
        v.toLocaleString("de-DE", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt(target * eased);
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = fmt(target);
      };
      requestAnimationFrame(tick);
    };
    const countObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            animateCount(e.target as HTMLElement);
            countObs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.4 },
    );
    document
      .querySelectorAll<HTMLElement>(".ueber-uns-design [data-count]")
      .forEach((c) => countObs.observe(c));
    cleanups.push(() => countObs.disconnect());

    // ===== HPLC chromatogram trace + PASSED stamp =====
    const buildHplc = () => {
      const W = 1000;
      const BASE = 280;
      const gauss = (x: number, mu: number, sigma: number, amp: number) =>
        amp * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
      const pts: Array<[number, number]> = [];
      for (let x = 0; x <= W; x += 2) {
        let y = BASE;
        y -= gauss(x, 60, 16, 22);
        y -= gauss(x, 240, 20, 16);
        y -= gauss(x, 465, 18, 238);
        y -= gauss(x, 710, 14, 20);
        y -= gauss(x, 850, 26, 10);
        y += (Math.random() - 0.5) * 1.4;
        pts.push([x, Math.max(20, y)]);
      }
      let d = `M ${pts[0][0]} ${pts[0][1].toFixed(2)}`;
      for (let i = 1; i < pts.length; i++)
        d += ` L ${pts[i][0]} ${pts[i][1].toFixed(2)}`;
      return { d, area: d + ` L ${W} ${BASE} L 0 ${BASE} Z` };
    };
    const hplc = buildHplc();
    const peakStroke = document.getElementById(
      "peakStroke",
    ) as SVGPathElement | null;
    const peakArea = document.getElementById(
      "peakArea",
    ) as SVGPathElement | null;
    const peakMarker = document.getElementById("peakMarker");
    const impurityMarker = document.getElementById("impurityMarker");
    const stampPass = document.getElementById("stampPass");

    if (peakStroke && peakArea) {
      peakStroke.setAttribute("d", hplc.d);
      peakArea.setAttribute("d", hplc.area);
      const L = peakStroke.getTotalLength();
      peakStroke.setAttribute("stroke-dasharray", `${L} ${L}`);
      peakStroke.setAttribute("stroke-dashoffset", String(L));
    }
    let hplcPlayed = false;
    const runHplcAnim = () => {
      if (hplcPlayed || !peakStroke || !peakArea) return;
      hplcPlayed = true;
      const L = peakStroke.getTotalLength();
      const duration = 2200;
      const start = performance.now();
      peakArea.style.transition = "opacity 1.2s ease";
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        peakStroke.setAttribute("stroke-dashoffset", String(L * (1 - eased)));
        if (t < 1) requestAnimationFrame(tick);
        else {
          peakArea.style.opacity = "1";
          window.setTimeout(() => {
            if (peakMarker) {
              peakMarker.style.transition = "opacity .5s";
              peakMarker.style.opacity = "1";
            }
          }, 80);
          window.setTimeout(() => {
            if (impurityMarker) {
              impurityMarker.style.transition = "opacity .5s";
              impurityMarker.style.opacity = "1";
            }
          }, 340);
          window.setTimeout(() => {
            if (stampPass) stampPass.classList.add("in");
          }, 900);
        }
      };
      requestAnimationFrame(tick);
    };
    const hplcCard = document.querySelector(".ueber-uns-design .hplc-card");
    if (hplcCard) {
      const hplcObs = new IntersectionObserver(
        (entries, o) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              runHplcAnim();
              o.disconnect();
            }
          });
        },
        { threshold: 0.2 },
      );
      hplcObs.observe(hplcCard);
      cleanups.push(() => hplcObs.disconnect());
    }

    // ===== Smooth-scroll for in-page anchors =====
    // Offset accounts for the sticky site header (64px) + chrom-nav (56px).
    const anchorCleanups: Array<() => void> = [];
    document
      .querySelectorAll<HTMLAnchorElement>('.ueber-uns-design a[href^="#"]')
      .forEach((a) => {
        const handler = (e: MouseEvent) => {
          const href = a.getAttribute("href");
          if (!href || href === "#") return;
          const target = document.getElementById(href.slice(1));
          if (!target) return;
          e.preventDefault();
          const chrom = document.querySelector(
            ".ueber-uns-design .chrom-nav",
          ) as HTMLElement | null;
          const offset = 64 + (chrom ? chrom.offsetHeight : 0) + 8;
          const top =
            target.getBoundingClientRect().top + window.scrollY - offset;
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
