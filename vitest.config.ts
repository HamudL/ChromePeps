import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` ist eine Next-Marker-Lib, die zur Build-Zeit
      // sicherstellt, dass eine Datei nicht im Client-Bundle landet.
      // In Vitest gibt es kein Bundle-Splitting → wir aliasen den
      // Import auf einen leeren Stub, sonst failen Unit-Tests von
      // server-only-Modulen schon beim Vite-Resolve.
      "server-only": path.resolve(__dirname, "src/__tests__/__mocks__/server-only.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.tsx"],
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/store/**", "src/components/**"],
      exclude: [
        "**/*.d.ts",
        "**/node_modules/**",
        // react-pdf-Dokumentbaum (Rechnungs-PDF): nur über den
        // @react-pdf/renderer-Reconciler renderbar — ein Unit-Test in
        // jsdom kann das JSX weder ausführen noch sinnvoll assert-en.
        // Verifikation läuft über den E2E-/Download-Pfad.
        "src/lib/invoice/pdf.tsx",
        // Prisma-Singleton-Bootstrap: schon der IMPORT instanziiert als
        // Seiteneffekt einen echten PrismaClient — genau das vermeiden
        // alle Unit-Tests bewusst per vi.mock("@/lib/db") (siehe z.B.
        // stripe-webhook.test.ts). Der einzige weitere Export
        // (isPrismaUniqueError, struktureller P2002-Check) ist ohne
        // diesen Seiteneffekt nicht isoliert ladbar.
        "src/lib/db.ts",
      ],
      // Thresholds als Schutz vor stiller Coverage-Erosion. Zahlen sind
      // bewusst vorsichtig gesetzt — sie bleiben über dem aktuellen
      // Stand und blocken zukünftige Regressionen, ohne den Build heute
      // zu brechen. AUDIT_REPORT_v3 §6 PR 3.
      thresholds: {
        // Pro Pfad-Bereich differenziert: lib/** ist die meistgetestete
        // Schicht (Helpers, Validation), validators/** sollte hoch sein
        // weil pure Funktionen, components/** ist UI und schwerer
        // automatisiert testbar.
        "src/lib/**": { lines: 40, functions: 40, branches: 50, statements: 40 },
        "src/store/**": { lines: 50, functions: 50, branches: 60, statements: 50 },
      },
    },
  },
});
