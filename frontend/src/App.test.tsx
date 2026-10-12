import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("SignalIQ authentication boundary", () => {
  it("redirects a visitor from a private route to sign in", async () => {
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("renders sign-up inputs when Supabase is configured", async () => {
    render(<MemoryRouter initialEntries={["/sign-up"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders a dedicated password-reset form", async () => {
    render(<MemoryRouter initialEntries={["/reset-password"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Set a new password" })).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });
});
