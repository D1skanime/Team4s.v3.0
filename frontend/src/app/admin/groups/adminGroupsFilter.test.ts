import { describe, expect, it } from "vitest";
import type { FansubGroup } from "@/types/fansub";
import { filterAdminGroups } from "./adminGroupsFilter";

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

describe("filterAdminGroups", () => {
  it("returns every group unfiltered, in original order, for an empty query", () => {
    const a = makeGroup({ id: 1, name: "Alpha" });
    const b = makeGroup({ id: 2, name: "Beta" });
    expect(filterAdminGroups([a, b], "")).toEqual([a, b]);
  });

  it("returns every group unfiltered, in original order, for a whitespace-only query", () => {
    const a = makeGroup({ id: 1, name: "Alpha" });
    const b = makeGroup({ id: 2, name: "Beta" });
    expect(filterAdminGroups([a, b], "   ")).toEqual([a, b]);
  });

  it("matches a group by name or slug (existing behavior preserved)", () => {
    const a = makeGroup({ id: 1, name: "Alpha Fansubs", slug: "alpha-fansubs" });
    const b = makeGroup({ id: 2, name: "Beta", slug: "beta" });
    expect(filterAdminGroups([a, b], "alpha")).toEqual([a]);
    expect(filterAdminGroups([a, b], "beta")).toEqual([b]);
  });

  it("matches a group by Kuerzel only, not name or slug (D-18)", () => {
    const withKuerzel = makeGroup({ id: 1, name: "Nova Team", slug: "nova-team", kuerzel: "NVT" });
    const other = makeGroup({ id: 2, name: "Other", slug: "other" });
    expect(filterAdminGroups([withKuerzel, other], "nvt")).toEqual([withKuerzel]);
  });

  it("matches a group by one alias entry only, not name/slug/Kuerzel (D-18)", () => {
    const withAlias = makeGroup({
      id: 1,
      name: "Main Name",
      slug: "main-name",
      kuerzel: "MN",
      aliases: ["Old Crew", "Legacy Subs"],
    });
    const other = makeGroup({ id: 2, name: "Other", slug: "other" });
    expect(filterAdminGroups([withAlias, other], "legacy")).toEqual([withAlias]);
  });

  it("does not throw and excludes a group with aliases undefined when no other field matches", () => {
    const noAliases = makeGroup({ id: 1, name: "Alpha", slug: "alpha", aliases: undefined });
    expect(() => filterAdminGroups([noAliases], "legacy")).not.toThrow();
    expect(filterAdminGroups([noAliases], "legacy")).toEqual([]);
  });

  it("matches a group whose name contains the accented form via an umlaut-stripped ASCII query", () => {
    const umlaut = makeGroup({ id: 1, name: "Übersetzer Crew", slug: "uebersetzer-crew" });
    const other = makeGroup({ id: 2, name: "Other", slug: "other" });
    expect(filterAdminGroups([umlaut, other], "ubersetzer")).toEqual([umlaut]);
  });
});
