import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/health")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            service: "signaliq",
            version: "0.1.0",
            environment: "test",
            gemini_configured: false,
            adaption_configured: false,
            max_analysis_rows: 80,
            gemini_model: null,
          }),
        } as Response;
      }
      if (url.includes("/api/analyze")) {
        return {
          ok: false,
          status: 503,
          json: async () => ({
            detail: {
              error: "Live AI analysis is not configured. Use the labelled demo analysis fallback.",
              code: "missing_gemini_key",
            },
          }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }),
  );
});

describe("SignalIQ shell", () => {
  it("renders dashboard KPIs from sample data", async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getAllByText(/Demonstration dataset|synthetic demonstration/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Total feedback")).toBeInTheDocument();
  });

  it("navigates to explorer and adaption lab", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("link", { name: "Feedback Explorer" }));
    expect(await screen.findByRole("heading", { name: "Feedback Explorer" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Adaption Lab" }));
    expect(await screen.findByRole("heading", { name: "Adaption Lab" })).toBeInTheDocument();
    expect(screen.getByText(/Adaption is not configured/i)).toBeInTheDocument();
  });

  it("falls back to labelled demo analysis when Gemini is not configured", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("link", { name: "Feedback Explorer" }));
    await screen.findByRole("heading", { name: "Feedback Explorer" });
    await user.click(screen.getByRole("button", { name: /Analyze unclassified with live AI/i }));
    expect(
      await screen.findByText(/labelled demo analysis was used instead/i),
    ).toBeInTheDocument();
  });
});
