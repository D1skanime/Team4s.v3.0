// @vitest-environment node
/**
 * Canary (d): `import * as api from '@/lib/api'` + runtime `vi.spyOn(api, ...)`
 * with NO `vi.mock` call at all (174-02, D-10) — used today in
 * `ReleaseNotesList.test.tsx` and `ReleaseGallery.test.tsx` to spy on functions
 * that move to other Welle-2 modules in later plans. Proves the namespace-
 * import + `vi.spyOn` pattern still gets a mutable, spy-able namespace object
 * through the barrel once real code lives behind it in
 * `frontend/src/lib/api/client.ts`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";

describe("canary: namespace import + vi.spyOn('@/lib/api', ...)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("spies on and restores resolveApiUrl through the barrel namespace object", () => {
    const spy = vi.spyOn(api, "resolveApiUrl").mockReturnValue("spied-url");
    expect(api.resolveApiUrl("/api/x")).toBe("spied-url");

    spy.mockRestore();
    expect(api.resolveApiUrl("/api/x")).not.toBe("spied-url");
  });
});
