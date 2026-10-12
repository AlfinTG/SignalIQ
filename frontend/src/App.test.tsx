import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("SignalIQ authentication boundary", () => {
  it("redirects a visitor from a private route to sign in", async () => {
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("does not collect credentials while Supabase is unconfigured", async () => {
    render(<MemoryRouter initialEntries={["/sign-up"]}><App /></MemoryRouter>);
    expect(await screen.findByText(/Authentication is not configured/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });
});
