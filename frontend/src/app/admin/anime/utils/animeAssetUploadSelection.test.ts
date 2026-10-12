import { describe, expect, it } from "vitest";

import { planAnimeAssetFileSelection } from "./animeAssetUploadSelection";

function fakeFile(name: string): File {
  return new File(["x"], name, { type: "image/png" });
}

describe("planAnimeAssetFileSelection", () => {
  it("returns noop when no files were selected", () => {
    expect(planAnimeAssetFileSelection("cover", [])).toEqual({ action: "noop" });
  });

  it.each(["cover", "banner", "logo"] as const)(
    "replaces the %s single-slot with exactly the first file",
    (kind) => {
      const first = fakeFile("a.png");
      const second = fakeFile("b.png");
      expect(planAnimeAssetFileSelection(kind, [first])).toEqual({
        action: "replace",
        kind,
        file: first,
      });
      // Defensive truncation even if UploadDropzone's own slicing were ever bypassed.
      expect(planAnimeAssetFileSelection(kind, [first, second])).toEqual({
        action: "replace",
        kind,
        file: first,
      });
    },
  );

  it.each(["background", "background_video"] as const)(
    "adds every dropped file as its own new %s entry",
    (kind) => {
      const first = fakeFile("a.png");
      const second = fakeFile("b.png");
      expect(planAnimeAssetFileSelection(kind, [first, second])).toEqual({
        action: "add",
        kind,
        files: [first, second],
      });
    },
  );
});
