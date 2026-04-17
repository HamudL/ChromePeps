"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Atom,
  BadgeCheck,
  Beaker,
  CreditCard,
  FlaskConical,
  Mail,
  Microscope,
  ShieldCheck,
  Sparkles,
  Truck,
  Waves,
  Zap,
} from "lucide-react";

/* ============================================================
   Section wrapper — consistent spacing & labels
   ============================================================ */
function Section({
  id,
  label,
  title,
  description,
  dark = false,
  children,
}: {
  id: string;
  label: string;
  title: string;
  description: string;
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`relative border-b ${
        dark
          ? "border-white/5 bg-[hsl(20_14%_8%)] text-[hsl(40_10%_92%)]"
          : "border-black/5 bg-background text-foreground"
      }`}
    >
      <div className="container py-20 md:py-28">
        <div className="mb-10 max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary/80">
            <span className="h-px w-8 bg-primary/40" />
            {label}
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
            {title}
          </h2>
          <p className={dark ? "text-white/60" : "text-muted-foreground"}>
            {description}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

/* ============================================================
   1) MOUSE SPOTLIGHT
   ============================================================ */
function MouseSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState({ x: -9999, y: -9999 });
  const [on, setOn] = useState(false);

  return (
    <div
      ref={ref}
      className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-b from-white to-[hsl(40_20%_97%)]"
      onPointerMove={(e: ReactPointerEvent<HTMLDivElement>) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        setP({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onPointerEnter={() => setOn(true)}
      onPointerLeave={() => setOn(false)}
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(40 15% 60% / 0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* The spotlight */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: on ? 1 : 0,
          background: `radial-gradient(560px circle at ${p.x}px ${p.y}px, hsl(45 92% 55% / 0.22), transparent 45%)`,
        }}
      />
      {/* Center copy */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <FlaskConical className="mx-auto mb-3 h-6 w-6 text-primary" />
          <p className="text-lg font-medium tracking-tight">
            Bewege den Cursor über diese Fläche
          </p>
          <p className="text-sm text-muted-foreground">
            Weicher Gold-Spotlight folgt der Maus
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   2) ANIMATED MESH / AURORA
   ============================================================ */
function AuroraMesh() {
  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="absolute -top-32 -left-16 h-[500px] w-[500px] rounded-full blur-[100px] opacity-60"
           style={{ background: "hsl(45 92% 55%)", animation: "animDemoDrift1 18s ease-in-out infinite" }} />
      <div className="absolute -bottom-32 -right-24 h-[600px] w-[600px] rounded-full blur-[120px] opacity-40"
           style={{ background: "hsl(30 60% 50%)", animation: "animDemoDrift2 22s ease-in-out infinite" }} />
      <div className="absolute top-1/3 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[100px] opacity-40"
           style={{ background: "hsl(40 40% 75%)", animation: "animDemoDrift3 26s ease-in-out infinite" }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="mx-auto mb-3 h-6 w-6 text-primary" />
          <p className="text-lg font-medium tracking-tight">
            Langsam driftende Farbverläufe
          </p>
          <p className="text-sm text-muted-foreground">
            Niemals still, nie aufdringlich
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   3) GRAIN TEXTURE
   ============================================================ */
function GrainTexture() {
  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-br from-[hsl(40_20%_96%)] via-white to-[hsl(45_30%_92%)]">
      <div
        className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-25 anim-demo-grain"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          backgroundSize: "220px 220px",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Microscope className="mx-auto mb-3 h-6 w-6 text-primary" />
          <p className="text-lg font-medium tracking-tight">
            Filmkörnung / Noise
          </p>
          <p className="text-sm text-muted-foreground">
            Haptische Textur auf sonst flachen Flächen — gibt Tiefe
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   4) MOLECULE PARTICLES (Canvas 2D, mouse-attractive)
   ============================================================ */
function MoleculeParticles({ dark = false }: { dark?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let sized = false;

    const seed = () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.25 + Math.random() * 0.35) * dpr;
      return {
        x: Math.random() * (canvas.width || 800),
        y: Math.random() * (canvas.height || 500),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: (Math.random() * 1.2 + 1.2) * dpr,
      };
    };
    let particles: ReturnType<typeof seed>[] = [];

    const applySize = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (!sized) {
        particles = Array.from({ length: 70 }, seed);
        sized = true;
      }
    };

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        applySize(width, height);
      }
    });
    ro.observe(canvas);

    // Fallback: if ResizeObserver hasn't fired yet after first paint, poll once.
    const fallbackId = requestAnimationFrame(() => {
      if (!sized) {
        const rect = canvas.getBoundingClientRect();
        applySize(rect.width, rect.height);
      }
    });

    const mouse = { x: -9999, y: -9999 };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * dpr;
      mouse.y = (e.clientY - rect.top) * dpr;
    };
    const onLeave = () => {
      mouse.x = mouse.y = -9999;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    const tick = () => {
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);

      const R = 170 * dpr;
      const baseSpeed = 0.45 * dpr;

      for (const p of particles) {
        // Repel from cursor (push particles away)
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R && d2 > 1) {
          const d = Math.sqrt(d2);
          const force = (1 - d / R) * 0.8 * dpr;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }

        // Tiny random jitter so movement never feels mechanical
        p.vx += (Math.random() - 0.5) * 0.02 * dpr;
        p.vy += (Math.random() - 0.5) * 0.02 * dpr;

        // Soft damping, then re-normalize to a minimum cruising speed so they
        // never come to rest on a single point
        p.vx *= 0.985;
        p.vy *= 0.985;
        const speed = Math.hypot(p.vx, p.vy);
        if (speed < baseSpeed) {
          const k = speed === 0 ? 1 : baseSpeed / speed;
          p.vx *= k;
          p.vy *= k;
        }

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = dark ? "hsl(45 85% 60% / 0.9)" : "hsl(45 60% 45% / 0.85)";
        ctx.fill();
      }

      const link = 130 * dpr;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < link * link) {
            const alpha = (1 - Math.sqrt(d2) / link) * (dark ? 0.4 : 0.32);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = dark
              ? `hsl(45 70% 65% / ${alpha})`
              : `hsl(45 60% 45% / ${alpha})`;
            ctx.lineWidth = 0.7 * dpr;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(fallbackId);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [dark]);

  return (
    <div
      className={`relative h-[460px] w-full overflow-hidden rounded-2xl border ${
        dark
          ? "border-white/10 bg-[hsl(20_14%_8%)]"
          : "border-black/10 bg-white"
      }`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <Atom className={`mx-auto mb-3 h-6 w-6 ${dark ? "text-primary" : "text-primary"}`} />
          <p className={`text-lg font-medium tracking-tight ${dark ? "text-white" : ""}`}>
            Interaktive Peptid-/Molekül-Netzstruktur
          </p>
          <p className={`text-sm ${dark ? "text-white/60" : "text-muted-foreground"}`}>
            Partikel weichen dem Cursor aus
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   4b) PARTICLES — tuned for hero use-cases (light & dark)
   ============================================================ */
function HeroParticles({
  count = 55,
  dark = false,
}: {
  count?: number;
  dark?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let sized = false;

    const seed = () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.2 + Math.random() * 0.3) * dpr;
      return {
        x: Math.random() * (canvas.width || 1200),
        y: Math.random() * (canvas.height || 500),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: (Math.random() * 1.1 + 1.1) * dpr,
      };
    };
    let particles: ReturnType<typeof seed>[] = [];

    const applySize = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (!sized) {
        particles = Array.from({ length: count }, seed);
        sized = true;
      }
    };

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        applySize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    ro.observe(canvas);
    const fallbackId = requestAnimationFrame(() => {
      if (!sized) {
        const rect = canvas.getBoundingClientRect();
        applySize(rect.width, rect.height);
      }
    });

    const mouse = { x: -9999, y: -9999 };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * dpr;
      mouse.y = (e.clientY - rect.top) * dpr;
    };
    const onLeave = () => {
      mouse.x = mouse.y = -9999;
    };
    // Track cursor on the whole hero, not just the canvas itself
    const host = canvas.parentElement?.parentElement ?? canvas;
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    const tick = () => {
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);

      const R = 160 * dpr;
      const baseSpeed = 0.4 * dpr;

      for (const p of particles) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R && d2 > 1) {
          const d = Math.sqrt(d2);
          const force = (1 - d / R) * 0.75 * dpr;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
        p.vx += (Math.random() - 0.5) * 0.02 * dpr;
        p.vy += (Math.random() - 0.5) * 0.02 * dpr;
        p.vx *= 0.985;
        p.vy *= 0.985;
        const s = Math.hypot(p.vx, p.vy);
        if (s < baseSpeed) {
          const k = s === 0 ? 1 : baseSpeed / s;
          p.vx *= k;
          p.vy *= k;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? "hsl(45 85% 62% / 0.85)"
          : "hsl(45 80% 48% / 0.7)";
        ctx.fill();
      }

      const link = 140 * dpr;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < link * link) {
            const alpha = (1 - Math.sqrt(d2) / link) * (dark ? 0.35 : 0.28);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = dark
              ? `hsl(45 70% 60% / ${alpha})`
              : `hsl(45 70% 45% / ${alpha})`;
            ctx.lineWidth = 0.7 * dpr;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(fallbackId);
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [count, dark]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}

/* ============================================================
   USE CASE: Homepage Hero mit Particles
   ============================================================ */
function HeroWithParticles() {
  return (
    <div className="relative overflow-hidden border-t border-black/5 bg-[hsl(40_20%_98%)]">
      {/* Particles layer */}
      <div className="absolute inset-0 pointer-events-auto">
        <HeroParticles />
      </div>

      {/* Soft radial vignette behind text — boosts readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(600px 340px at 50% 50%, hsl(40 20% 98% / 0.85), transparent 70%)",
        }}
      />

      {/* Hero content — matches real homepage structure */}
      <div className="container relative py-24 md:py-32 lg:py-40 pointer-events-none">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <h1 className="text-[clamp(2.5rem,10vw,5rem)] font-bold tracking-tight chrome-text leading-none">
            ChromePeps
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
            Premium-Forschungspeptide. Laborgeprüfte Reinheit.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 pointer-events-auto">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-8 h-12 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Shop
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-white px-8 h-12 text-base font-medium hover:bg-accent"
            >
              Qualitätskontrolle
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   USE CASE: Qualitätskontrolle Hero (dark)
   ============================================================ */
function QualityHeroWithParticles() {
  return (
    <div className="relative overflow-hidden border-t border-white/5 bg-[hsl(20_14%_7%)]">
      <div className="absolute inset-0 pointer-events-auto">
        <HeroParticles dark count={60} />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(520px 280px at 50% 55%, hsl(20 14% 7% / 0.7), transparent 70%)",
        }}
      />
      <div className="container relative py-16 md:py-24 text-center pointer-events-none">
        <ShieldCheck className="mx-auto h-10 w-10 text-primary mb-4" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Qualitätskontrolle
        </h1>
        <p className="text-white/60 max-w-xl mx-auto text-lg">
          Jede Charge wird durch das unabhängige Analyselabor Janoshik getestet
          — ohne Ausnahme.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   USE CASE: Trust Section (dark, "Warum ChromePeps?")
   ============================================================ */
function TrustSectionWithParticles() {
  const cards = [
    {
      icon: Microscope,
      title: "Drittlabor-geprüft",
      desc: "Jede Charge wird durch Janoshik unabhängig auf Reinheit getestet.",
      linkText: "Qualitätskontrolle",
    },
    {
      icon: CreditCard,
      title: "Sichere Zahlung",
      desc: "Stripe, Apple Pay, Google Pay oder Banküberweisung.",
      linkText: "Zahlungsoptionen",
    },
    {
      icon: Mail,
      title: "CoA zu jeder Bestellung",
      desc: "Das passende Analysezertifikat erhalten Sie automatisch per E-Mail mit Ihrer Bestellung.",
      linkText: "Qualitätskontrolle",
    },
  ];

  return (
    <div className="relative overflow-hidden border-t border-white/5 bg-[hsl(20_14%_7%)]">
      <div className="absolute inset-0 pointer-events-auto">
        <HeroParticles dark count={45} />
      </div>
      <div className="container relative py-16 md:py-20 pointer-events-none">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-12">
          Warum ChromePeps?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pointer-events-auto">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 h-full flex flex-col"
            >
              <card.icon className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">{card.title}</h3>
              <p className="text-sm text-white/60 flex-1 mb-4">{card.desc}</p>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {card.linkText}
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   USE CASE: Footer Band (thin dark strip)
   ============================================================ */
function FooterBandWithParticles() {
  return (
    <div className="relative h-[120px] w-full overflow-hidden border-t border-white/5 bg-[hsl(20_14%_7%)]">
      <HeroParticles dark count={30} />
      {/* Soft horizontal gradient fades at the edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, hsl(20 14% 7%) 0%, transparent 15%, transparent 85%, hsl(20 14% 7%) 100%)",
        }}
      />
    </div>
  );
}

/* ============================================================
   5) DNA HELIX / BIO-WAVEFORM
   ============================================================ */
function DnaHelix() {
  const cols = 32;
  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-br from-white to-[hsl(40_20%_97%)] flex items-center justify-center">
      <div
        className="relative flex items-center gap-1"
        style={{
          perspective: "600px",
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="relative flex flex-col items-center"
            style={{
              animation: `animDemoHelixSpin 3.8s linear ${i * -0.12}s infinite`,
              transformStyle: "preserve-3d",
            }}
          >
            <span
              className="block h-3 w-3 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, hsl(45 92% 70%), hsl(45 92% 40%))",
                boxShadow: "0 0 8px hsl(45 92% 55% / 0.5)",
              }}
            />
            <span className="block w-px flex-1 bg-gradient-to-b from-[hsl(45_30%_60%)] to-[hsl(40_15%_55%)] my-1 h-16" />
            <span
              className="block h-3 w-3 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, hsl(40 20% 80%), hsl(40 15% 45%))",
                boxShadow: "0 0 8px hsl(40 20% 60% / 0.4)",
              }}
            />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-6 left-0 right-0 text-center">
        <Waves className="mx-auto mb-1 h-5 w-5 text-primary/70" />
        <p className="text-sm text-muted-foreground">Peptid-Helix · 3D-Rotation</p>
      </div>
    </div>
  );
}

/* ============================================================
   6) 3D TILT CARD
   ============================================================ */
function TiltCard({
  title,
  subtitle,
  price,
}: {
  title: string;
  subtitle: string;
  price: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ transform: string }>({
    transform: "perspective(900px) rotateX(0deg) rotateY(0deg)",
  });

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - y) * 10;
    const ry = (x - 0.5) * 12;
    setStyle({
      transform: `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`,
    });
    if (glareRef.current) {
      glareRef.current.style.background = `radial-gradient(400px circle at ${
        x * 100
      }% ${y * 100}%, hsl(45 100% 90% / 0.35), transparent 50%)`;
    }
  };

  const onLeave = () => {
    setStyle({
      transform: "perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)",
    });
    if (glareRef.current) glareRef.current.style.background = "transparent";
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition-transform duration-200 will-change-transform"
      style={{ ...style, transformStyle: "preserve-3d" }}
    >
      <div className="aspect-[4/5] relative bg-gradient-to-br from-[hsl(40_25%_94%)] via-white to-[hsl(45_30%_92%)] flex items-center justify-center">
        <Beaker className="h-24 w-24 text-primary/80" />
        <div
          ref={glareRef}
          className="pointer-events-none absolute inset-0 transition-opacity"
        />
      </div>
      <div className="p-5">
        <p className="text-xs font-mono uppercase tracking-widest text-primary/80">
          {subtitle}
        </p>
        <h3 className="mt-1 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-xl font-semibold text-primary">{price}</p>
      </div>
    </div>
  );
}

/* ============================================================
   7) CHROME SHIMMER BUTTON
   ============================================================ */
function ChromeShimmerButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="anim-demo-shimmer-btn group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-primary/30 bg-gradient-to-b from-[hsl(45_92%_55%)] to-[hsl(40_60%_40%)] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-[hsl(45_92%_50%/0.25)] transition-transform hover:scale-[1.03]"
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span className="anim-demo-shimmer-sweep pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </button>
  );
}

/* ============================================================
   8) MAGNETIC BUTTON
   ============================================================ */
function MagneticButton({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const btn = btnRef.current;
    if (!wrap || !btn) return;
    const radius = 120;

    const onMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d < radius) {
        const strength = (1 - d / radius) * 0.45;
        btn.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      } else {
        btn.style.transform = "translate(0, 0)";
      }
    };
    const onLeave = () => {
      btn.style.transform = "translate(0, 0)";
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <span ref={wrapRef} className="inline-block">
      <button
        ref={btnRef}
        type="button"
        className="inline-flex items-center gap-2 rounded-full bg-[hsl(20_14%_10%)] px-7 py-3 text-sm font-semibold text-white shadow-lg transition-transform duration-200 ease-out will-change-transform hover:bg-[hsl(20_14%_16%)]"
      >
        {children}
      </button>
    </span>
  );
}

/* ============================================================
   9) STAGGER REVEAL (IntersectionObserver)
   ============================================================ */
function StaggerReveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    const reveal = () => {
      setTimeout(() => {
        el.style.transition = "opacity 700ms ease-out, transform 700ms ease-out";
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, delay);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          reveal();
          io.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <div ref={ref}>{children}</div>;
}

/* ============================================================
   10) NUMBER COUNTER
   ============================================================ */
function NumberCounter({
  end,
  suffix = "",
  prefix = "",
  duration = 1600,
  decimals = 0,
}: {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = end * eased;
        el.textContent = `${prefix}${v.toLocaleString("de-DE", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}${suffix}`;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          run();
          io.unobserve(el);
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [end, duration, decimals, prefix, suffix]);
  return <span ref={ref}>{prefix}0{suffix}</span>;
}

/* ============================================================
   11) PINNED HORIZONTAL SCROLL
   ============================================================ */
function PinnedScroll() {
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const onScroll = () => {
      const rect = outer.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setProgress(total > 0 ? scrolled / total : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const slides = [
    { icon: FlaskConical, title: "Synthese", text: "Reine Festphasen-Synthese" },
    { icon: Microscope, title: "Analyse", text: "HPLC / Massenspektrometrie" },
    { icon: ShieldCheck, title: "Zertifikat", text: "Jede Charge dokumentiert" },
    { icon: BadgeCheck, title: "Freigabe", text: "Nur nach Qualitätsprüfung" },
  ];

  return (
    <div ref={outerRef} className="relative" style={{ height: "280vh" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center">
        <div
          ref={trackRef}
          className="flex gap-8 px-[max(2rem,10vw)] will-change-transform"
          style={{
            transform: `translateX(calc(-${progress * 70}%))`,
            transition: "transform 120ms linear",
          }}
        >
          {slides.map(({ icon: Icon, title, text }, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[70vw] md:w-[50vw] lg:w-[42vw] aspect-[4/3] rounded-3xl border border-black/10 bg-gradient-to-br from-white via-[hsl(40_30%_96%)] to-[hsl(45_30%_92%)] p-10 flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-primary/80">
                  Schritt {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="mt-4 max-w-sm text-muted-foreground">{text}</p>
              </div>
              <Icon className="h-14 w-14 text-primary/80" />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {[0, 0.33, 0.66, 1].map((stop) => (
            <span
              key={stop}
              className="h-1 w-12 rounded-full bg-black/10 overflow-hidden"
            >
              <span
                className="block h-full bg-primary transition-all duration-200"
                style={{
                  width: `${Math.max(0, Math.min(1, (progress - stop) * 6 + 1)) * 100}%`,
                }}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function AnimationsDemoPage() {
  return (
    <main className="min-h-screen">
      {/* Back link */}
      <div className="fixed left-4 top-4 z-50">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 backdrop-blur px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Shop
        </Link>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-black/5 bg-white">
        <div
          className="absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full blur-[110px] opacity-30"
          style={{ background: "hsl(45 92% 55%)", animation: "animDemoDrift1 20s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full blur-[110px] opacity-25"
          style={{ background: "hsl(30 60% 50%)", animation: "animDemoDrift2 24s ease-in-out infinite" }}
        />
        <div className="container relative py-24 md:py-32 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-primary/80 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Animations Lab
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
            <span className="chrome-text">Interaktive Effekte</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Eine Sammlung dezenter, premium-tauglicher Animationen. Prüfe, was
            zum ChromePeps-Look passt — und was nicht.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#spotlight"
              className="rounded-full bg-[hsl(20_14%_10%)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[hsl(20_14%_16%)]"
            >
              Effekte erkunden
            </a>
            <a
              href="#pinned"
              className="rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-medium hover:bg-black/5"
            >
              Direkt zu Scroll-Effekten
            </a>
          </div>
        </div>
      </section>

      {/* 1. Mouse Spotlight */}
      <Section
        id="spotlight"
        label="01 · Hover"
        title="Mouse Spotlight"
        description="Weicher Lichtkegel in Gold folgt dem Cursor. Idealer Ersatz für flache, leere Flächen im Hero-Bereich."
      >
        <MouseSpotlight />
      </Section>

      {/* 2. Aurora Mesh */}
      <Section
        id="aurora"
        label="02 · Ambient"
        title="Animated Mesh Gradient (Aurora)"
        description="Langsam driftende Gradient-Blobs im Hintergrund. Bringt Leben in den Hero, lenkt aber nicht ab."
      >
        <AuroraMesh />
      </Section>

      {/* 3. Grain */}
      <Section
        id="grain"
        label="03 · Textur"
        title="Noise / Film-Grain"
        description="Leichte Körnung liegt über ruhigen Farbflächen. Gibt Tiefe und wirkt hochwertig-analog."
      >
        <GrainTexture />
      </Section>

      {/* 4. Molecules */}
      <Section
        id="molecules"
        label="04 · Brand-Fit"
        title="Peptid-Netzwerk (Partikel)"
        description="Punkte und Verbindungslinien. Reagieren auf den Cursor. Passt thematisch perfekt zu Peptiden."
        dark
      >
        <MoleculeParticles dark />
      </Section>

      {/* 5. DNA Helix */}
      <Section
        id="helix"
        label="05 · Brand-Fit"
        title="3D Peptid-Helix"
        description="Rotierende Doppelhelix als dezentes Hero- oder Footer-Element. Wissenschaftlich, unaufdringlich."
      >
        <DnaHelix />
      </Section>

      {/* 6. Tilt Cards */}
      <Section
        id="tilt"
        label="06 · Interaktion"
        title="3D-Tilt auf Product-Cards"
        description="Karten reagieren dezent auf Mausposition mit leichter Neigung und wanderndem Lichtreflex. Bewege den Cursor über die Karten."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TiltCard title="BPC-157" subtitle="Forschungspeptid" price="ab 49,90 €" />
          <TiltCard title="TB-500" subtitle="Forschungspeptid" price="ab 59,90 €" />
          <TiltCard title="GHK-Cu" subtitle="Forschungspeptid" price="ab 39,90 €" />
        </div>
      </Section>

      {/* 7. Shimmer */}
      <Section
        id="shimmer"
        label="07 · Hover"
        title="Chrome Shimmer"
        description="Lichtreflex wandert über die Oberfläche beim Hover. Macht CTAs edel ohne schreiend zu sein."
      >
        <div className="flex flex-wrap gap-4 items-center">
          <ChromeShimmerButton>
            <Zap className="h-4 w-4" />
            Jetzt kaufen
          </ChromeShimmerButton>
          <ChromeShimmerButton>
            <ShieldCheck className="h-4 w-4" />
            Zertifikat ansehen
          </ChromeShimmerButton>
        </div>
      </Section>

      {/* 8. Magnetic Buttons */}
      <Section
        id="magnetic"
        label="08 · Hover"
        title="Magnetic Buttons"
        description="Buttons ziehen sich leicht zum Cursor, sobald man in die Nähe kommt. Gefühl von Präzision und Responsivität."
      >
        <div className="flex flex-wrap items-center gap-8 py-10">
          <MagneticButton>
            <FlaskConical className="h-4 w-4" />
            Zum Katalog
          </MagneticButton>
          <MagneticButton>
            <Microscope className="h-4 w-4" />
            Analysezertifikate
          </MagneticButton>
        </div>
      </Section>

      {/* 9. Stagger Reveal */}
      <Section
        id="reveal"
        label="09 · Scroll"
        title="Stagger Reveals"
        description="Elemente faden versetzt ein, sobald sie in den Viewport kommen. Subtil, wirkt hochwertig."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: FlaskConical,
              title: "99,8 % Reinheit",
              text: "HPLC-analysiert pro Charge",
            },
            {
              icon: ShieldCheck,
              title: "EU-Versand",
              text: "Diskret, verfolgbar, sicher",
            },
            {
              icon: Microscope,
              title: "Forschungsqualität",
              text: "Ausschließlich für Laboruse",
            },
          ].map((f, i) => (
            <StaggerReveal key={i} delay={i * 150}>
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <f.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </div>
            </StaggerReveal>
          ))}
        </div>
      </Section>

      {/* 10. Number Counter */}
      <Section
        id="counter"
        label="10 · Scroll"
        title="Number Counter"
        description="Zahlen zählen animiert hoch, wenn sie sichtbar werden. Für Stats, Reinheit, Chargen-Anzahl etc."
        dark
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { end: 99.8, suffix: " %", label: "Durchschn. Reinheit", decimals: 1 },
            { end: 12, suffix: "+", label: "Produkte im Katalog" },
            { end: 1420, label: "Zufriedene Labore" },
            { end: 24, suffix: " h", label: "Versand-SLA" },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-4xl md:text-5xl font-semibold tracking-tight text-primary">
                <NumberCounter
                  end={s.end}
                  suffix={s.suffix}
                  decimals={s.decimals ?? 0}
                />
              </div>
              <div className="mt-2 text-sm text-white/60">{s.label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* 11. Pinned scroll */}
      <div id="pinned">
        <Section
          id="pinned-header"
          label="11 · Scroll"
          title="Pinned Horizontal Scroll"
          description="Section bleibt während des Scrollens fixiert, der Inhalt wandert horizontal. Scroll nach unten, um den Effekt zu sehen."
        >
          <div className="rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-muted-foreground">
            ↓ Bitte weiter nach unten scrollen
          </div>
        </Section>
        <PinnedScroll />
      </div>

      {/* =============================================
          USE CASE · ChromePeps Homepage Hero
          ============================================= */}
      <section
        id="use-case-hero"
        className="relative border-y border-black/5 bg-white"
      >
        <div className="container pt-12 pb-6 max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary/80">
            <span className="h-px w-8 bg-primary/40" />
            Use Case · Homepage
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
            So würde das auf der Homepage aussehen
          </h2>
          <p className="text-muted-foreground">
            Echter Hero-Inhalt — nur der Hintergrund ist gegen das
            Peptid-Netzwerk getauscht. Grid und Gold-Blobs entfallen, Partikel
            übernehmen die ambiente Ebene. Bewege den Cursor über den Bereich.
          </p>
        </div>

        <HeroWithParticles />

        <div className="container py-8 max-w-3xl text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Hinweise zur Integration:</strong>{" "}
            Partikelfarbe angepasst an Gold-Brand · Dichte reduziert auf 55
            Punkte · sanfte Radial-Maske um Text-Bereich für Lesbarkeit ·
            deaktiviert sich auf Mobile für Performance (noch nicht im Demo).
          </p>
        </div>
      </section>

      {/* =============================================
          USE CASE · Qualitätskontrolle Hero (dark)
          ============================================= */}
      <section
        id="use-case-quality"
        className="relative border-b border-white/5 bg-[hsl(20_14%_8%)] text-[hsl(40_10%_92%)]"
      >
        <div className="container pt-12 pb-6 max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary/80">
            <span className="h-px w-8 bg-primary/40" />
            Use Case · Qualitätskontrolle
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
            Dark-Hero mit Peptid-Netzwerk
          </h2>
          <p className="text-white/60">
            Der Hero der Qualitätskontroll-Seite braucht wissenschaftliche
            Autorität. Partikel in hellerem Gold auf dunklem Grund wirken wie
            Moleküle unter UV-Licht — passt thematisch perfekt zum Labor-Feel.
          </p>
        </div>

        <QualityHeroWithParticles />
      </section>

      {/* =============================================
          USE CASE · "Warum ChromePeps?" Trust Section (dark)
          ============================================= */}
      <section
        id="use-case-trust"
        className="relative border-b border-white/5 bg-[hsl(20_14%_8%)] text-[hsl(40_10%_92%)]"
      >
        <div className="container pt-12 pb-6 max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary/80">
            <span className="h-px w-8 bg-primary/40" />
            Use Case · Trust Section
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
            &quot;Warum ChromePeps?&quot; mit subtilen Partikeln
          </h2>
          <p className="text-white/60">
            Die Trust-Section auf der Homepage — aktuell mit uni-schwarzem
            Hintergrund. Mit dezent leuchtenden Partikeln bekommt sie Tiefe,
            ohne dass die Karten weniger greifbar werden.
          </p>
        </div>

        <TrustSectionWithParticles />
      </section>

      {/* =============================================
          USE CASE · Footer Band (dark strip)
          ============================================= */}
      <section
        id="use-case-footer"
        className="relative border-b border-white/5 bg-[hsl(20_14%_8%)] text-[hsl(40_10%_92%)]"
      >
        <div className="container pt-12 pb-6 max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary/80">
            <span className="h-px w-8 bg-primary/40" />
            Use Case · Footer Band
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
            Schmaler Partikel-Streifen über dem Footer
          </h2>
          <p className="text-white/60">
            Als visuelle Signatur kurz vor dem Footer — 120 px Höhe, reduzierte
            Dichte, kein Text. Funktioniert als dezente Wiedererkennung über
            alle Seiten hinweg.
          </p>
        </div>

        <FooterBandWithParticles />

        <div className="container py-8 max-w-3xl text-sm text-white/50">
          <p>
            Alle dunklen Varianten nutzen dieselbe Logik wie der Homepage-Hero —
            nur Partikelfarbe, Dichte und optionale Vignette werden pro Kontext
            angepasst. Ein einziger Component-Code für die ganze Site.
          </p>
        </div>
      </section>

      {/* Final note */}
      <footer className="border-t border-black/5 bg-[hsl(20_14%_8%)] text-white/70 py-14">
        <div className="container text-center text-sm">
          <p className="text-white/50">
            Alle Effekte ohne externe Libraries · React + Canvas 2D + CSS
          </p>
          <p className="mt-2 text-white/40">
            Sag mir, welche bleiben sollen.
          </p>
        </div>
      </footer>

    </main>
  );
}
