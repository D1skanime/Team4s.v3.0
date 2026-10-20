// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { updateEpisodeVersion } from "./episodes";

// Phase 189 Review-2 (WR-02): updateEpisodeVersion used parseApiError (message-only), dropping
// ApiError.code for the 409 release_version_group_has_dependents case -- the exact bug class
// just fixed for deleteFansubGroup. Deckt den echten fetch-Pfad ab.
describe("updateEpisodeVersion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("wirft einen ApiError mit gesetztem code bei 409 release_version_group_has_dependents", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: vi.fn().mockResolvedValue({
          error: {
            message: "Diese Gruppe kann nicht entfernt werden: 1 Credit hängt noch daran.",
            code: "release_version_group_has_dependents",
          },
        }),
      }),
    );

    await expect(updateEpisodeVersion(1, {})).rejects.toMatchObject({
      status: 409,
      code: "release_version_group_has_dependents",
    });
  });
});
