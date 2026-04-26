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
      exclude: ["**/*.d.ts", "**/node_modules/**"],
    },
  },
});
