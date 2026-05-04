import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturedProductCarousel } from "@/components/shop/featured-product-carousel";

/**
 * Tests für die a11y-relevante Reduced-Motion-Branch im
 * FeaturedProductCarousel.
 *
 * AUDIT_REPORT_v3 §6 PR 10.
 */

const samplePool = [
  {
    id: "p1",
    slug: "tirzepatide",
    name: "Tirzepatide 5 mg",
    shortDesc: "Dual GLP-1/GIP-Agonist",
    priceInCents: 4900,
    weight: "5 mg",
    form: "Lyophilisat",
    categoryName: "GLP-1",
    categorySlug: "glp-1",
    image: { url: "/products/tirzepatide.png", alt: "Tirzepatide" },
    coa: null,
  },
  {
    id: "p2",
    slug: "semaglutide",
    name: "Semaglutide 5 mg",
    shortDesc: "Selective GLP-1-Agonist",
    priceInCents: 4500,
    weight: "5 mg",
    form: "Lyophilisat",
    categoryName: "GLP-1",
    categorySlug: "glp-1",
    image: { url: "/products/semaglutide.png", alt: "Semaglutide" },
    coa: null,
  },
];

function stubMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        query === "(prefers-reduced-motion: reduce)" ? reducedMotion : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("FeaturedProductCarousel", () => {
  it("rendert null bei leerem pool (nichts zu featuren)", () => {
    stubMatchMedia(false);
    const { container } = render(
      <FeaturedProductCarousel pool={[]} intervalMs={1000} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("rendert das erste Produkt aus dem Pool", () => {
    stubMatchMedia(false);
    render(<FeaturedProductCarousel pool={samplePool} intervalMs={1000} />);
    expect(screen.getByText(/Tirzepatide/i)).toBeInTheDocument();
  });

  it("registriert KEIN Auto-Rotation-Interval bei prefers-reduced-motion", () => {
    stubMatchMedia(true);
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    render(<FeaturedProductCarousel pool={samplePool} intervalMs={1000} />);
    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it("registriert Auto-Rotation-Interval bei normaler Motion-Präferenz", () => {
    stubMatchMedia(false);
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    render(<FeaturedProductCarousel pool={samplePool} intervalMs={1000} />);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    setIntervalSpy.mockRestore();
  });
});
