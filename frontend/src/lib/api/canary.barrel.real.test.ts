// @vitest-environment node
/**
 * Canary (a): plain, unmocked real import through the `@/lib/api` barrel
 * (174-02, D-10). No `vi.mock` call in this file at all — proves that every
 * test file which imports from `@/lib/api` without mocking it continues to
 * resolve the real shared-infra implementations once they live behind the
 * barrel re-export (`frontend/src/lib/api/client.ts`).
 */
import { describe, expect, it } from "vitest";
import { ApiError, resolveApiUrl } from "@/lib/api";

describe("canary: real unmocked import through @/lib/api barrel", () => {
  it("resolves resolveApiUrl as a real callable function", () => {
    expect(typeof resolveApiUrl).toBe("function");
    expect(resolveApiUrl("")).toBe("");
  });

  it("resolves ApiError as the real Error subclass", () => {
    const error = new ApiError(404, "x");
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(404);
  });
});
