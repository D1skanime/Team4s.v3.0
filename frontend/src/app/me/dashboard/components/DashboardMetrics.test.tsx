// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { OwnDashboardData } from "@/types/dashboard";

import { DashboardMetrics } from "./DashboardMetrics";

afterEach(() => {
  cleanup();
});

function makeDashboardData(
  overrides: Partial<OwnDashboardData> = {},
): OwnDashboardData {
  return {
    has_member_profile: true,
    total_points: 1234,
    badges_count: 7,
    projects_count: 3,
    images_count: 42,
    contributions_count: 5,
    role_volume: [],
    category_progress: [],
    pending_claims: [],
    pending_group_media_reviews: [],
    pending_release_reviews: [],
    pending_own_note_revisions: [],
    ...overrides,
  };
}

describe("DashboardMetrics (Phase 116, D-03)", () => {
  it("rendert genau 5 HeroMetrics-Kacheln in fester Reihenfolge", () => {
    const { container } = render(
      <DashboardMetrics data={makeDashboardData()} />,
    );

    const dtElements = container.querySelectorAll("dl dt");
    expect(Array.from(dtElements).map((el) => el.textContent)).toEqual([
      "Punkte",
      "Badges",
      "Projekte",
      "Hochgeladene Bilder",
      "Geschriebene Beiträge",
    ]);
  });

  it('formatiert total_points > 999 mit toLocaleString("de-DE") und zeigt die anderen vier als Ganzzahlen', () => {
    render(
      <DashboardMetrics data={makeDashboardData({ total_points: 1234 })} />,
    );

    expect(screen.getByText("1.234")).not.toBeNull();
    expect(screen.getByText("7")).not.toBeNull();
    expect(screen.getByText("3")).not.toBeNull();
    expect(screen.getByText("42")).not.toBeNull();
    expect(screen.getByText("5")).not.toBeNull();
  });

  it("rendert bei komplett Null-Werten weiterhin alle 5 Kacheln mit Wert 0, kein Empty-State", () => {
    render(
      <DashboardMetrics
        data={makeDashboardData({
          total_points: 0,
          badges_count: 0,
          projects_count: 0,
          images_count: 0,
          contributions_count: 0,
        })}
      />,
    );

    expect(screen.getAllByText("0")).toHaveLength(5);
    expect(screen.queryByText(/nicht verfügbar/i)).toBeNull();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });
});
