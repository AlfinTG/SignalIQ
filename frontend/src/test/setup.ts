import "@testing-library/jest-dom/vitest";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!("ResizeObserver" in globalThis)) {
  // Recharts needs ResizeObserver in jsdom.
  (globalThis as unknown as Record<string, unknown>)["ResizeObserver"] =
    ResizeObserverStub;
}
