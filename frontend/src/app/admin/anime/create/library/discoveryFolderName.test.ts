// GAP-19 (165-UAT.md): reine Funktionslogik ohne DOM, kein @vitest-environment jsdom nötig.

import { describe, expect, it } from "vitest";

import {
  buildDisplayFolderName,
  extractFolderNameFromPath,
  stripTrailingYearSuffix,
} from "./discoveryFolderName";

describe("stripTrailingYearSuffix", () => {
  it("removes a trailing four-digit year suffix in parentheses", () => {
    expect(stripTrailingYearSuffix("Accel World Infinite Burst (2016)")).toBe(
      "Accel World Infinite Burst",
    );
  });

  it("leaves non-year parenthetical suffixes untouched", () => {
    expect(stripTrailingYearSuffix("Naruto (Jellyfin)")).toBe("Naruto (Jellyfin)");
  });

  it("leaves a plain name without a parenthetical suffix untouched", () => {
    expect(stripTrailingYearSuffix("Redline")).toBe("Redline");
  });

  it("keeps special characters in the name and only removes the year suffix", () => {
    expect(stripTrailingYearSuffix("Accel World: Infinite Burst! (2016)")).toBe(
      "Accel World: Infinite Burst!",
    );
  });
});

describe("extractFolderNameFromPath", () => {
  it("returns the last segment of a multi-level unix path", () => {
    expect(extractFolderNameFromPath("/media/Anime/OVA/Anime.OVA.Sub/hack G.U Trilogy")).toBe(
      "hack G.U Trilogy",
    );
  });

  it("normalizes backslashes like the backend path.Base(ReplaceAll(...)) convention", () => {
    expect(
      extractFolderNameFromPath("D:\\Anime\\OVA\\Accel World Infinite Burst (2016)"),
    ).toBe("Accel World Infinite Burst (2016)");
  });

  it("returns an empty string for undefined, null, or empty input without throwing", () => {
    expect(extractFolderNameFromPath(undefined)).toBe("");
    expect(extractFolderNameFromPath(null)).toBe("");
    expect(extractFolderNameFromPath("")).toBe("");
  });
});

describe("buildDisplayFolderName", () => {
  it("combines extraction and year-suffix stripping for the GAP-19 live example", () => {
    expect(
      buildDisplayFolderName("D:\\Anime\\OVA\\Accel World Infinite Burst (2016)"),
    ).toBe("Accel World Infinite Burst");
  });

  it("returns an empty string when no path is given, letting the caller decide the fallback", () => {
    expect(buildDisplayFolderName(undefined)).toBe("");
  });
});
