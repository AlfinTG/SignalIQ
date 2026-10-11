import "@testing-library/jest-dom/vitest";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!("ResizeObserver" in window)) {
  // Recharts needs ResizeObserver in jsdom.
  window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
