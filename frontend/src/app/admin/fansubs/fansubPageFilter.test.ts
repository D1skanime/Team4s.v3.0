import { describe, expect, it } from "vitest";
import type { FansubGroup } from "@/types/fansub";
import { filterFansubPageItems } from "./fansubPageFilter";

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

describe("filterFansubPageItems", () => {
  it("returns only active items when statusFilter is active and query is empty", () => {
    const active = makeGroup({ id: 1, name: "Alpha", status: "active" });
    const inactive = makeGroup({ id: 2, name: "Beta", status: "inactive" });
    const result = filterFansubPageItems([active, inactive], {
      statusFilter: "active",
      query: "",
    });
    expect(result).toEqual([active]);
  });

  it("maps statusFilter 'archived' to status === 'dissolved'", () => {
    const dissolved = makeGroup({ id: 1, name: "Alpha", status: "dissolved" });
    const active = makeGroup({ id: 2, name: "Beta", status: "active" });
    const result = filterFansubPageItems([dissolved, active], {
      statusFilter: "archived",
      query: "",
    });
    expect(result).toEqual([dissolved]);
  });

  it("includes a group matching only on kuerzel regardless of statusFilter 'all'", () => {
    const group = makeGroup({
      id: 1,
      name: "Alpha",
      slug: "alpha",
      kuerzel: "ZZZ",
      status: "inactive",
    });
    const result = filterFansubPageItems([group], {
      statusFilter: "all",
      query: "zzz",
    });
    expect(result).toEqual([group]);
  });

  it("includes a group matching only on one aliases entry", () => {
    const group = makeGroup({
      id: 1,
      name: "Alpha",
      slug: "alpha",
      aliases: ["FooBar", "OtherAlias"],
    });
    const result = filterFansubPageItems([group], {
      statusFilter: "all",
      query: "foobar",
    });
    expect(result).toEqual([group]);
  });

  it("does not throw when aliases is undefined", () => {
    const group = makeGroup({ id: 1, name: "Alpha", aliases: undefined });
    expect(() =>
      filterFansubPageItems([group], { statusFilter: "all", query: "alpha" }),
    ).not.toThrow();
  });

  it("matches an accented name/slug with an umlaut-stripped ASCII query", () => {
    const group = makeGroup({
      id: 1,
      name: "Übersetzer Grüppchen",
      slug: "uebersetzer-gruppchen",
    });
    const result = filterFansubPageItems([group], {
      statusFilter: "all",
      query: "Ubersetzer",
    });
    expect(result).toEqual([group]);
  });

  it("excludes a non-matching group when both status and search apply", () => {
    const match = makeGroup({ id: 1, name: "Alpha", status: "active" });
    const wrongStatus = makeGroup({ id: 2, name: "Alpha", status: "inactive" });
    const wrongQuery = makeGroup({ id: 3, name: "Beta", status: "active" });
    const result = filterFansubPageItems([match, wrongStatus, wrongQuery], {
      statusFilter: "active",
      query: "alpha",
    });
    expect(result).toEqual([match]);
  });
});
