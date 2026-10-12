import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealth, resolveApiUrl } from "./api";
import { setApiSession } from "./auth";

describe("backend API URL handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setApiSession(null);
  });

  it("normalizes and joins a configured production API origin", () => {
    expect(resolveApiUrl("/api/health", "https://signaliq-api-wuwu.onrender.com/")).toBe(
      "https://signaliq-api-wuwu.onrender.com/api/health",
    );
    expect(resolveApiUrl("api/feedback?limit=100", "https://signaliq-api-wuwu.onrender.com///")).toBe(
      "https://signaliq-api-wuwu.onrender.com/api/feedback?limit=100",
    );
  });

  it("keeps relative paths when no API origin is configured for Vite's local proxy", () => {
    expect(resolveApiUrl("/api/health", undefined)).toBe("/api/health");
    expect(resolveApiUrl("api/health", undefined)).toBe("/api/health");
  });

  it("uses the resolved URL and preserves the Supabase bearer header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    setApiSession({ access_token: "test-access-token" } as never);

    await fetchHealth();

    expect(fetchMock).toHaveBeenCalledWith(
      resolveApiUrl("/api/health"),
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-access-token");
  });
});
