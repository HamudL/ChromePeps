import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveMetrics } from "@/components/shop/live-metrics";

// IntersectionObserver ist in jsdom nicht implementiert — Stub damit
// MetricTile beim Mount nicht crashed.
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

// matchMedia ebenfalls nicht in jsdom. Default = "no reduced motion"
// damit die Animation-Branch im useEffect ausgeführt wird (entspricht
// dem Verhalten echter Browser ohne explizite User-Präferenz).
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("LiveMetrics", () => {
  it("returnt null bei leerem metrics-Array (kein Section-Render)", () => {
    const { container } = render(<LiveMetrics metrics={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("rendert pro Metric einen Tile mit Label + initialem Target-Wert", () => {
    render(
      <LiveMetrics
        metrics={[
          { target: 47, label: "Chargen · getestet" },
          {
            target: 99.71,
            suffix: "%",
            decimals: 2,
            label: "Ø Reinheit · 12 Monate",
          },
        ]}
      />,
    );
    expect(screen.getByText("Chargen · getestet")).toBeInTheDocument();
    expect(
      screen.getByText("Ø Reinheit · 12 Monate"),
    ).toBeInTheDocument();
    // SSR-/Initial-Render zeigt Target-Werte direkt — Bug-Fix gegen
    // useState(0) initial. "47" muss da sein, "99,71" muss da sein
    // (deutsche Locale-Formatierung mit Komma-Dezimaltrenner).
    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("99,71")).toBeInTheDocument();
  });

  it("formatiert große Zahlen mit deutschem Tausender-Separator", () => {
    render(
      <LiveMetrics
        metrics={[{ target: 12480, label: "Bestellungen" }]}
      />,
    );
    expect(screen.getByText("12.480")).toBeInTheDocument();
  });

  it("zeigt Suffix neben dem Wert (z.B. % für Reinheit)", () => {
    render(
      <LiveMetrics
        metrics={[
          {
            target: 99.71,
            suffix: "%",
            decimals: 2,
            label: "Reinheit",
          },
        ]}
      />,
    );
    expect(screen.getByText("%")).toBeInTheDocument();
  });
});
