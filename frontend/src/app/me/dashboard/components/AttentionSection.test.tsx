// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MeAnimeContribution } from "@/types/contributions";

import { AttentionSection } from "./AttentionSection";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

function makeContribution(
  overrides: Partial<MeAnimeContribution> = {},
): MeAnimeContribution {
  return {
    id: 1,
    anime_id: 5,
    anime_title: "Testanime",
    fansub_group_id: 9,
    fansub_group_member_id: 2,
    status: "confirmed",
    role_codes: ["translation"],
    started_year: 2026,
    ended_year: null,
    is_public_on_anime_page: true,
    is_public_on_member_profile: true,
    note: null,
    release_version_id: null,
    is_own_proposal: false,
    created_at: "2026-07-28T00:00:00Z",
    ...overrides,
  };
}

describe("AttentionSection (Phase 116, D-02)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rendert die exakte Empty-State-Copy und keine Cards, wenn contributions leer ist", () => {
    const { container } = render(
      <AttentionSection contributions={[]} pendingClaims={[]} />,
    );

    expect(screen.getByText("Nichts Neues im Moment")).not.toBeNull();
    expect(
      screen.getByText(
        "Du hast in den letzten 14 Tagen keine neuen Projekt- oder Release-Zuweisungen erhalten.",
      ),
    ).not.toBeNull();
    expect(
      container.querySelectorAll('section[class*="cardInteractive"]'),
    ).toHaveLength(0);
  });

  it('sortiert absteigend nach created_at und zeigt die "Neu"-Badge nur innerhalb des 14-Tage-Fensters', () => {
    const oldItem = makeContribution({
      id: 1,
      anime_title: "Altes Projekt",
      created_at: "2026-06-01T00:00:00Z", // > 14 Tage alt
    });
    const newItem = makeContribution({
      id: 2,
      anime_id: 6,
      fansub_group_id: 10,
      anime_title: "Neues Projekt",
      created_at: "2026-07-27T00:00:00Z", // 2 Tage alt
    });

    render(
      <AttentionSection
        contributions={[oldItem, newItem]}
        pendingClaims={[]}
      />,
    );

    const titles = screen.getAllByRole("link").map((link) => link.textContent);
    expect(titles[0]).toContain("Neues Projekt");
    expect(titles[1]).toContain("Altes Projekt");

    const badges = screen.getAllByText("Neu");
    expect(badges).toHaveLength(1);
    expect(badges[0].closest("a")?.textContent).toContain("Neues Projekt");
  });

  it("verlinkt jede Zeile exakt auf resolveWorkspaceHref(item) fuer beide Href-Zweige", () => {
    const withRelease = makeContribution({
      id: 3,
      anime_title: "Release-Zuweisung",
      role_codes: ["quality_control"],
      role_labels: ["Qualitätsprüfung"],
      release_version_id: 62,
      created_at: "2026-07-28T00:00:00Z",
    });
    const withoutRelease = makeContribution({
      id: 4,
      anime_title: "Projekt-Zuweisung",
      release_version_id: null,
      anime_id: 6,
      fansub_group_id: 10,
      created_at: "2026-07-20T00:00:00Z",
    });

    render(
      <AttentionSection
        contributions={[withRelease, withoutRelease]}
        pendingClaims={[]}
      />,
    );

    expect(
      screen
        .getByRole("link", { name: /Release-Zuweisung/i })
        .getAttribute("href"),
    ).toBe("/me/releases/62/workspace?tab=segments");
    expect(
      screen
        .getByRole("link", { name: /Projekt-Zuweisung/i })
        .getAttribute("href"),
    ).toBe("/me/projects/6/group/10");
  });

  it("zeigt einen offenen Claim mit direktem Link in die Mitgliederverwaltung", () => {
    render(
      <AttentionSection
        contributions={[]}
        pendingClaims={[
          {
            claim_id: 17,
            fansub_group_id: 9,
            fansub_group_name: "New-Subs",
            member_nickname: "Qc",
            created_at: "2026-07-28T00:00:00Z",
          },
        ]}
      />,
    );

    const link = screen.getByRole("link", { name: /Claim von Qc prüfen/i });
    expect(link.getAttribute("href")).toBe(
      "/admin/fansubs/9/edit?tab=collaboration",
    );
    expect(screen.getByText("Offen")).not.toBeNull();
  });

  it("zeigt die Projektrolle nur einmal und blendet gleichartige geerbte Release-Rollen aus", () => {
    const projectRole = makeContribution({
      id: 10,
      role_codes: ["translator"],
      role_labels: ["Übersetzung"],
      release_version_id: null,
    });
    const inheritedReleaseRole = makeContribution({
      id: 11,
      role_codes: ["translator"],
      role_labels: ["Übersetzung"],
      release_version_id: 51,
      episode_number: "01",
    });

    render(
      <AttentionSection
        contributions={[projectRole, inheritedReleaseRole]}
        pendingClaims={[]}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Testanime.*Übersetzung/i }),
    ).not.toBeNull();
    expect(screen.queryByText(/Folge 01/i)).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("zeigt nur abweichende oder ausschließlich releasebezogene Rollen mit Folgenummer", () => {
    const projectRole = makeContribution({
      id: 20,
      role_codes: ["translator"],
      role_labels: ["Übersetzung"],
      release_version_id: null,
    });
    const releaseOnlyRole = makeContribution({
      id: 21,
      role_codes: ["quality_control"],
      role_labels: ["Qualitätsprüfung"],
      release_version_id: 61,
      episode_number: "05",
    });

    render(
      <AttentionSection
        contributions={[projectRole, releaseOnlyRole]}
        pendingClaims={[]}
      />,
    );

    const releaseLink = screen.getByRole("link", {
      name: /Testanime.*Folge 05.*Qualitätsprüfung/i,
    });
    expect(releaseLink.getAttribute("href")).toBe("/me/releases/61/workspace?tab=segments");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(releaseLink.textContent).toContain('Übersetzung');
  });

  it("blendet eine releasebezogene Zuweisung nach eigener Arbeit aus", () => {
    const completedRelease = makeContribution({
      release_version_id: 61,
      episode_number: "05",
      role_codes: ["quality_control"],
      has_own_release_work: true,
    });

    render(
      <AttentionSection
        contributions={[completedRelease]}
        pendingClaims={[]}
      />,
    );

    expect(screen.getByText("Nichts Neues im Moment")).not.toBeNull();
    expect(screen.queryByText(/Folge 05/i)).toBeNull();
  });

  it("fasst offene Release-Prüfungen pro Anime zusammen und verlinkt die Prüfungsseite", () => {
    render(
      <AttentionSection
        contributions={[]}
        pendingClaims={[]}
        pendingReleaseReviews={[
          {
            fansub_group_id: 9,
            anime_id: 5,
            anime_title: "Testanime",
            image_count: 3,
            text_count: 2,
          },
        ]}
      />,
    );

    const link = screen.getByRole("link", {
      name: /Testanime.*3 Bilder und 2 Texte prüfen/i,
    });
    expect(link.getAttribute("href")).toBe(
      "/admin/fansubs/9/edit?tab=pruefungen",
    );
  });

  it("zeigt ausstehende Gruppenmedien mit direktem Link zur Prüfung", () => {
    render(
      <AttentionSection
        contributions={[]}
        pendingClaims={[]}
        pendingGroupMediaReviews={[
          { fansub_group_id: 9, fansub_group_name: "New-Subs", count: 1 },
        ]}
      />,
    );

    const link = screen.getByRole("link", {
      name: /1 Gruppenbild prüfen in New-Subs/i,
    });
    expect(link.getAttribute("href")).toBe("/admin/fansubs/9/edit?tab=media");
    expect(screen.getByText("Offen")).not.toBeNull();
  });

  it("rendert das dekorative ArrowRight-Icon mit aria-hidden", () => {
    const { container } = render(
      <AttentionSection
        contributions={[makeContribution()]}
        pendingClaims={[]}
      />,
    );

    const icon = container.querySelector('svg[aria-hidden="true"]');
    expect(icon).not.toBeNull();
  });
});
