import { describe, expect, it } from "vitest";
import { matchesSearch, normalizeSearchText } from "./textFilter";

describe("normalizeSearchText", () => {
  it("strips diacritics and lowercases (Mädchen -> madchen)", () => {
    expect(normalizeSearchText("Mädchen")).toBe("madchen");
  });

  it("leaves ß untouched (Straße -> straße, never strasse)", () => {
    expect(normalizeSearchText("Straße")).toBe("straße");
  });

  it("strips all umlaut diacritics (ÄÖÜ -> aou)", () => {
    expect(normalizeSearchText("ÄÖÜ")).toBe("aou");
  });
});

describe("matchesSearch", () => {
  it("matches an accent-stripped ASCII query against an accented haystack value", () => {
    expect(matchesSearch(["Mädchen"], "madchen")).toBe(true);
  });

  it("does not expand ß to ss (no digraph expansion)", () => {
    expect(matchesSearch(["Straße"], "strasse")).toBe(false);
  });

  it("filters out null/undefined haystack entries without throwing", () => {
    expect(matchesSearch([null, undefined, "Berlin"], "berlin")).toBe(true);
  });

  it("matches everything when the query is empty or whitespace-only", () => {
    expect(matchesSearch(["anything"], "")).toBe(true);
  });

  it("never matches a non-empty query against an empty haystack array", () => {
    expect(matchesSearch([], "query")).toBe(false);
  });
});
