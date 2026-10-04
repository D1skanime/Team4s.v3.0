// @vitest-environment node
/**
 * Canary (c): partial `vi.mock('@/lib/api', async () => { const actual = await
 * vi.importActual(...) })` (174-02, D-10) — the 7-file minority shape (e.g.
 * `frontend/src/app/admin/roles/RolesClient.test.tsx`). Exactly one
 * `vi.mock('@/lib/api', ...)` call lives in this file for the same hoisting-
 * collision reason documented in the other canary files. Proves the
 * `vi.importActual` partial-mock shape keeps mixing mocked and real exports
 * correctly once real code lives behind the barrel in
 * `frontend/src/lib/api/client.ts`.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    resolveApiUrl: vi.fn(() => "mocked-url"),
  };
});

import { ApiError } from "@/lib/api";
import { callResolveApiUrl } from "./canary.barrel.consumer";

describe("canary: vi.importActual('@/lib/api') partial mock", () => {
  it("intercepts the mocked export (resolveApiUrl) through the barrel", () => {
    expect(callResolveApiUrl()).toBe("mocked-url");
  });

  it("still resolves the real, unmocked export (ApiError) through the same partial mock", () => {
    expect(new ApiError(404, "x")).toBeInstanceOf(Error);
  });
});
