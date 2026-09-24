import { describe, expect, it } from "vitest";
import type { FansubGroup } from "@/types/fansub";
import { compareFansubListItems } from "./fansubListSort";

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

describe("compareFansubListItems", () => {
  it("sorts by name ascending/descending", () => {
    const a = makeGroup({ id: 1, name: "Alpha" });
    const b = makeGroup({ id: 2, name: "Beta" });
    expect(compareFansubListItems("name", "asc", a, b)).toBeLessThan(0);
    expect(compareFansubListItems("name", "desc", a, b)).toBeGreaterThan(0);
  });

  it("sorts by status ascending/descending (active < inactive < dissolved)", () => {
    const active = makeGroup({ id: 1, name: "Alpha", status: "active" });
    const dissolved = makeGroup({ id: 2, name: "Beta", status: "dissolved" });
    expect(compareFansubListItems("status", "asc", active, dissolved)).toBeLessThan(0);
    expect(compareFansubListItems("status", "desc", active, dissolved)).toBeGreaterThan(0);
  });

  it("sorts by period ascending/descending using founded_year", () => {
    const early = makeGroup({ id: 1, name: "Alpha", founded_year: 2004 });
    const late = makeGroup({ id: 2, name: "Beta", founded_year: 2020 });
    expect(compareFansubListItems("period", "asc", early, late)).toBeLessThan(0);
    expect(compareFansubListItems("period", "desc", early, late)).toBeGreaterThan(0);
  });

  it("sorts by kuerzel ascending/descending", () => {
    const a = makeGroup({ id: 1, name: "Alpha", kuerzel: "AAA" });
    const b = makeGroup({ id: 2, name: "Beta", kuerzel: "ZZZ" });
    expect(compareFansubListItems("kuerzel", "asc", a, b)).toBeLessThan(0);
    expect(compareFansubListItems("kuerzel", "desc", a, b)).toBeGreaterThan(0);
  });

  it("falls back to name tie-break when two groups share the sort key", () => {
    const a = makeGroup({ id: 1, name: "Alpha", status: "active" });
    const b = makeGroup({ id: 2, name: "Beta", status: "active" });
    expect(compareFansubListItems("status", "asc", a, b)).toBeLessThan(0);
    expect(compareFansubListItems("status", "asc", b, a)).toBeGreaterThan(0);
  });

  it("sorts a null/missing kuerzel before any group with a set kuerzel in ascending order", () => {
    const withoutKuerzel = makeGroup({ id: 1, name: "Zeta", kuerzel: null });
    const withKuerzel = makeGroup({ id: 2, name: "Alpha", kuerzel: "AAA" });
    expect(compareFansubListItems("kuerzel", "asc", withoutKuerzel, withKuerzel)).toBeLessThan(0);
    expect(compareFansubListItems("kuerzel", "desc", withoutKuerzel, withKuerzel)).toBeGreaterThan(0);
  });
});
