import "@testing-library/jest-dom/vitest";

// Mock next/navigation for component tests
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock next/image — render a plain <img>
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // Strip Next-specific props before spreading onto a native <img>
    const { fill: _fill, priority: _priority, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

// Mock next/link — render a plain <a>
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
