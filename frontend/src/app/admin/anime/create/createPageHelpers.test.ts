import { describe, expect, it } from "vitest";

import {
  buildAssistedCreateRedirectPath,
  buildManualCreateRedirectPath,
} from "./createPageHelpers";

describe("buildAssistedCreateRedirectPath", () => {
  it("routes series types to /episodes with a URL-encoded return param", () => {
    expect(
      buildAssistedCreateRedirectPath(42, "tv", "/admin/anime/create/library?filter=open"),
    ).toBe("/admin/anime/42/episodes?return=%2Fadmin%2Fanime%2Fcreate%2Flibrary%3Ffilter%3Dopen");
  });

  it("routes film to /edit (D-10 transitional rule)", () => {
    expect(
      buildAssistedCreateRedirectPath(42, "film", "/admin/anime/create/library"),
    ).toBe("/admin/anime/42/edit?return=%2Fadmin%2Fanime%2Fcreate%2Flibrary");
  });

  it("omits the return query param entirely when no returnURL is given", () => {
    expect(buildAssistedCreateRedirectPath(42, "tv", undefined)).toBe(
      "/admin/anime/42/episodes",
    );
  });
});

describe("buildManualCreateRedirectPath (regression)", () => {
  it("remains unchanged by the new assisted helper", () => {
    expect(buildManualCreateRedirectPath(42)).toBe("/admin/anime?created=42#anime-42");
  });
});
