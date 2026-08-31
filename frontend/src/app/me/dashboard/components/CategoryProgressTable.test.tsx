// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { OwnDashboardData } from "@/types/dashboard";

import { CategoryProgressTable } from "./CategoryProgressTable";

const contributionRoles = [
  {
    code: "translator",
    label_de: "Übersetzung",
    contexts: ["anime_contribution"],
    sort_order: 5,
  },
  {
    code: "typer",
    label_de: "Typesetting",
    contexts: ["anime_contribution"],
    sort_order: 10,
  },
  {
    code: "karaoke_fx",
    label_de: "Karaoke-FX",
    contexts: ["anime_contribution"],
    sort_order: 20,
  },
];

vi.mock("@/providers/RoleCatalogProvider", () => ({
  useRoleCatalog: () => ({ roles: contributionRoles, error: null }),
}));

afterEach(() => {
  cleanup();
});

function makeData(overrides: Partial<OwnDashboardData> = {}): OwnDashboardData {
  return {
    has_member_profile: true,
    total_points: 0,
    badges_count: 0,
    projects_count: 0,
    images_count: 0,
    contributions_count: 0,
    role_volume: [],
    category_progress: [
      {
        family: "contribution_archivist",
        current_tier: "",
        current_count: 0,
        next_threshold: null,
      },
      {
        family: "contribution_chronicle",
        current_tier: "",
        current_count: 0,
        next_threshold: null,
      },
      {
        family: "contribution_projects",
        current_tier: "",
        current_count: 0,
        next_threshold: null,
      },
    ],
    pending_claims: [],
    pending_group_media_reviews: [],
    pending_release_reviews: [],
    ...overrides,
  };
}

describe("CategoryProgressTable (Phase 116, D-04)", () => {
  it("ordnet Karaoke-FX und Typesetting nach dem Katalog und zeigt unbekannte Rollen neutral lesbar", () => {
    render(
      <CategoryProgressTable
        data={makeData({
          role_volume: [
            { role_code: "unknown_helper", count: 12 },
            { role_code: "karaoke_fx", count: 12 },
            { role_code: "typer", count: 12 },
          ],
        })}
      />,
    );

    const labels = screen
      .getAllByText(/Rollen-Volumen$/)
      .map((node) => node.textContent);
    expect(labels).toEqual([
      "Typesetting · Rollen-Volumen",
      "Karaoke-FX · Rollen-Volumen",
      "Unknown Helper · Rollen-Volumen",
    ]);
    expect(screen.getAllByText("Bronze · 12+")).toHaveLength(3);
    expect(screen.getAllByText("noch 96 bis Silber")).toHaveLength(3);
  });

  it('rendert die Punkte-Meilenstein-Zeile mit "noch X bis Y" aus resolveNextPointMilestone, ohne neue Schwellen', () => {
    render(<CategoryProgressTable data={makeData({ total_points: 62 })} />);

    expect(screen.getByText("Punkte-Meilenstein")).not.toBeNull();
    expect(screen.getByText("Aktiv dabei")).not.toBeNull();
    expect(screen.getByText("noch 138 bis Erfahrungsstufe")).not.toBeNull();
  });

  it("rendert eine Rollen-Volumen-Zeile je role_volume-Eintrag mit Rollen-Praefix", () => {
    render(
      <CategoryProgressTable
        data={makeData({
          role_volume: [{ role_code: "translator", count: 20 }],
        })}
      />,
    );

    expect(screen.getByText("Übersetzung · Rollen-Volumen")).not.toBeNull();
    expect(screen.getByText("Bronze · 12+")).not.toBeNull();
    expect(screen.getByText("noch 88 bis Silber")).not.toBeNull();
  });

  it("rendert Bildarchivpflege-Zeile verbatim aus category_progress mit Familie+Tier-Badge", () => {
    render(
      <CategoryProgressTable
        data={makeData({
          category_progress: [
            {
              family: "contribution_archivist",
              current_tier: "silver",
              current_count: 60,
              next_threshold: 150,
            },
            {
              family: "contribution_chronicle",
              current_tier: "",
              current_count: 0,
              next_threshold: null,
            },
            {
              family: "contribution_projects",
              current_tier: "",
              current_count: 0,
              next_threshold: null,
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("Bildarchivpflege")).not.toBeNull();
    expect(screen.getByText("Bildarchivpflege · Silber")).not.toBeNull();
    expect(screen.getByText("noch 90 bis Gold")).not.toBeNull();
  });

  it('rendert "Höchste Stufe erreicht" wenn next_threshold null ist (höchste Stufe)', () => {
    render(
      <CategoryProgressTable
        data={makeData({
          category_progress: [
            {
              family: "contribution_archivist",
              current_tier: "gold",
              current_count: 500,
              next_threshold: null,
            },
            {
              family: "contribution_chronicle",
              current_tier: "bronze",
              current_count: 12,
              next_threshold: 40,
            },
            {
              family: "contribution_projects",
              current_tier: "",
              current_count: 0,
              next_threshold: 5,
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("Höchste Stufe erreicht")).not.toBeNull();
  });

  it("rendert TableEmptyState statt der Punkte-Zeile bei komplett fehlender Aktivität", () => {
    render(<CategoryProgressTable data={makeData()} />);

    expect(screen.getByText("Noch kein Fortschritt")).not.toBeNull();
    expect(
      screen.getByText(
        "Sobald du an einem Projekt mitwirkst, siehst du hier deinen Fortschritt je Kategorie.",
      ),
    ).not.toBeNull();
    expect(screen.queryByText("Punkte-Meilenstein")).toBeNull();
  });
});
