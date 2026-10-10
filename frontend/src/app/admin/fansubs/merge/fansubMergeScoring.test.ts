import { describe, expect, it } from "vitest";
import type { FansubGroup } from "@/types/fansub";
import { filterMergeCandidates, scoreMergeRelevance } from "./fansubMergeScoring";

function makeGroup(overrides: Partial<FansubGroup> = {}): FansubGroup {
  return {
    id: 1,
    slug: "group",
    name: "Group",
    status: "active",
    anime_relations_count: 0,
    projects_count: 0,
    release_versions_count: 0,
    members_count: 0,
    aliases_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("scoreMergeRelevance", () => {
  it("returns 0 for an empty query", () => {
    const group = makeGroup({ name: "Alpha Subs", slug: "alpha-subs" });
    expect(scoreMergeRelevance(group, "")).toBe(0);
  });

  it("returns 120 for an exact name match", () => {
    const group = makeGroup({ name: "Alpha Subs", slug: "other-slug" });
    expect(scoreMergeRelevance(group, "Alpha Subs")).toBe(120);
  });

  it("returns 120 for an exact slug match", () => {
    const group = makeGroup({ name: "Other Name", slug: "alpha-subs" });
    expect(scoreMergeRelevance(group, "alpha-subs")).toBe(120);
  });

  it("returns 90 for a name-prefix match", () => {
    const group = makeGroup({ name: "Alpha Subs Team", slug: "unrelated" });
    expect(scoreMergeRelevance(group, "Alpha")).toBe(90);
  });

  it("returns 80 for a slug-prefix match", () => {
    const group = makeGroup({ name: "Unrelated Name", slug: "alpha-subs-team" });
    expect(scoreMergeRelevance(group, "alpha")).toBe(80);
  });

  it("returns 55 for a name-substring match", () => {
    const group = makeGroup({ name: "Team Alpha Subs", slug: "unrelated" });
    expect(scoreMergeRelevance(group, "Alpha")).toBe(55);
  });

  it("returns 45 for a slug-substring match", () => {
    const group = makeGroup({ name: "Unrelated Name", slug: "team-alpha-subs" });
    expect(scoreMergeRelevance(group, "alpha")).toBe(45);
  });

  it("returns 115 for an exact Kuerzel match", () => {
    const group = makeGroup({ name: "Other Name", slug: "other-slug", kuerzel: "AST" });
    expect(scoreMergeRelevance(group, "AST")).toBe(115);
  });

  it("returns 110 for an exact Alias match", () => {
    const group = makeGroup({
      name: "Other Name",
      slug: "other-slug",
      aliases: ["Alpha Fansubs"],
    });
    expect(scoreMergeRelevance(group, "Alpha Fansubs")).toBe(110);
  });

  it("returns 75 for a Kuerzel-prefix match", () => {
    const group = makeGroup({ name: "Other Name", slug: "other-slug", kuerzel: "ASTeam" });
    expect(scoreMergeRelevance(group, "AST")).toBe(75);
  });

  it("returns 70 for an Alias-prefix match", () => {
    const group = makeGroup({
      name: "Other Name",
      slug: "other-slug",
      aliases: ["Alpha Fansubs Team"],
    });
    expect(scoreMergeRelevance(group, "Alpha Fansubs")).toBe(70);
  });

  it("returns 40 for a Kuerzel-substring match", () => {
    const group = makeGroup({ name: "Other Name", slug: "other-slug", kuerzel: "TeamAST" });
    expect(scoreMergeRelevance(group, "AST")).toBe(40);
  });

  it("returns 35 for an Alias-substring match", () => {
    const group = makeGroup({
      name: "Other Name",
      slug: "other-slug",
      aliases: ["Team Alpha Fansubs"],
    });
    expect(scoreMergeRelevance(group, "Alpha Fansubs")).toBe(35);
  });

  it("never lets a Kuerzel/Alias tier outrank a name/slug tier of equal specificity", () => {
    const group = makeGroup({
      name: "Alpha Subs",
      slug: "alpha-subs",
      kuerzel: "Alpha Subs",
      aliases: ["Alpha Subs"],
    });
    // exact name/slug (120) beats exact kuerzel (115) / exact alias (110)
    expect(scoreMergeRelevance(group, "Alpha Subs")).toBe(120);
  });

  it("scores an accented name's exact match against an unaccented query at the top tier", () => {
    const group = makeGroup({ name: "Über Subs", slug: "ueber-subs-slug" });
    expect(scoreMergeRelevance(group, "Uber Subs")).toBe(120);
  });
});

describe("filterMergeCandidates", () => {
  it("includes a group matching only on Kuerzel", () => {
    const groups = [
      makeGroup({ id: 1, name: "Alpha", slug: "alpha", kuerzel: "ZXQ" }),
      makeGroup({ id: 2, name: "Beta", slug: "beta" }),
    ];
    const result = filterMergeCandidates(groups, { query: "ZXQ", statusFilter: "all" });
    expect(result.map((g) => g.id)).toEqual([1]);
  });

  it("includes a group matching only on one Alias entry", () => {
    const groups = [
      makeGroup({ id: 1, name: "Alpha", slug: "alpha", aliases: ["Old Name", "Legacy Crew"] }),
      makeGroup({ id: 2, name: "Beta", slug: "beta" }),
    ];
    const result = filterMergeCandidates(groups, { query: "Legacy Crew", statusFilter: "all" });
    expect(result.map((g) => g.id)).toEqual([1]);
  });

  it("excludes groups that match neither name/slug/kuerzel/alias nor pass status", () => {
    const groups = [
      makeGroup({ id: 1, name: "Alpha", slug: "alpha" }),
      makeGroup({ id: 2, name: "Beta", slug: "beta" }),
    ];
    const result = filterMergeCandidates(groups, { query: "zzz-no-match", statusFilter: "all" });
    expect(result).toEqual([]);
  });

  it("preserves the exact existing statusFilter exclusion behavior", () => {
    const groups = [
      makeGroup({ id: 1, name: "Alpha", slug: "alpha", status: "active" }),
      makeGroup({ id: 2, name: "Beta", slug: "beta", status: "inactive" }),
    ];
    const result = filterMergeCandidates(groups, { query: "", statusFilter: "active" });
    expect(result.map((g) => g.id)).toEqual([1]);
  });
});
