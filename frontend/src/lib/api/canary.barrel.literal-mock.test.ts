// @vitest-environment node
/**
 * Canary (b): full-literal-factory `vi.mock('@/lib/api', () => ({...}))`
 * (174-02, D-10) — the repo's majority mock shape (~120+ files, e.g.
 * `frontend/src/app/me/profile/page.test.tsx`). Exactly one `vi.mock('@/lib/api', ...)`
 * call lives in this file (Vitest hoists `vi.mock` calls to the top of the
 * file they're written in — a second, differently-shaped call in the same
 * file would collide with this one, which is why each pattern gets its own
 * canary file). Proves the literal-factory shape still intercepts calls
 * through the barrel once real code lives behind it in
 * `frontend/src/lib/api/client.ts`.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  apiClientFetch: vi.fn(() => "mocked-response"),
}));

import { callApiClientFetch } from "./canary.barrel.consumer";

describe("canary: literal-factory vi.mock('@/lib/api', ...)", () => {
  it("intercepts apiClientFetch calls routed through the barrel", async () => {
    const result = (await callApiClientFetch()) as unknown as string;
    expect(result).toBe("mocked-response");
  });
});
