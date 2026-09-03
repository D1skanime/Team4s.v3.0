// Pure helpers für die Dashboard-"Achtung"-Sektion (Phase 116, D-02).
//
// Diese Funktionen sind absichtlich frei von React/Fetch-Abhängigkeiten, damit sie isoliert
// unit-testbar bleiben (Wave-0/interface-first, siehe 116-01-PLAN.md). AttentionSection.tsx
// (Plan 116-04/05) importiert sie direkt statt die Logik erneut zu implementieren.

import type { MeAnimeContribution } from "@/types/contributions";

/**
 * D-02/CONTEXT.md "Claude's Discretion": Zeitfenster in Tagen, innerhalb dessen eine
 * Zuweisung als "neu" gilt. Benannte Konstante statt Magic Number.
 */
export const ATTENTION_WINDOW_DAYS = 14;

/**
 * D-02/Pattern 3 (116-RESEARCH.md): true, wenn createdAt innerhalb der letzten windowDays
 * Tage liegt (Alter in Millisekunden gegen Date.now() verglichen).
 */
export function isRecentlyAssigned(
  createdAt: string,
  windowDays: number,
): boolean {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs <= windowDays * 24 * 60 * 60 * 1000;
}

/**
 * D-02/Pattern 2 (116-RESEARCH.md): release_version_id gesetzt -> Release-Version-Arbeitsfläche,
 * sonst -> anime-weite Projekt-Arbeitsfläche.
 */
export function resolveWorkspaceHref(
  contribution: Pick<
    MeAnimeContribution,
    "release_version_id" | "anime_id" | "fansub_group_id"
  >,
): string {
  return contribution.release_version_id
    ? `/me/releases/${contribution.release_version_id}/workspace?tab=segments`
    : `/me/projects/${contribution.anime_id}/group/${contribution.fansub_group_id}`;
}

function contributionScopeKey(contribution: MeAnimeContribution): string {
  return `${contribution.anime_id}:${contribution.fansub_group_id}`;
}

function roleSignature(contribution: MeAnimeContribution): string {
  return [...contribution.role_codes].sort().join(":");
}

/**
 * Projektrollen sind die Baseline einer Mitarbeit. Release-Zuweisungen mit exakt
 * derselben Rolle entstehen beim Vererben und sind keine eigene Dashboard-Aufgabe.
 */
export function filterAttentionContributions(
  contributions: MeAnimeContribution[],
): MeAnimeContribution[] {
  const projectRoleSignatures = new Map<string, string>();

  for (const contribution of contributions) {
    if (contribution.release_version_id === null) {
      projectRoleSignatures.set(
        contributionScopeKey(contribution),
        roleSignature(contribution),
      );
    }
  }

  return contributions.filter((contribution) => {
    if (contribution.release_version_id === null) {
      return true;
    }

    if (contribution.has_own_release_work) {
      // Abgelehnte eigene Arbeit auf demselben Release verdient weiterhin
      // Aufmerksamkeit, auch wenn andere eigene Arbeit dort bereits bestätigt
      // ist und has_own_release_work deshalb true bleibt.
      if (
        contribution.has_own_rejected_notes ||
        contribution.has_own_rejected_media
      ) {
        return true;
      }
      return false;
    }

    return (
      projectRoleSignatures.get(contributionScopeKey(contribution)) !==
      roleSignature(contribution)
    );
  });
}

export interface AttentionContributionPresentation {
  title: string;
  detail: string;
}

export function presentAttentionContribution(
  contribution: MeAnimeContribution,
): AttentionContributionPresentation {
  const roleLabel =
    contribution.role_labels?.join(" · ") ||
    contribution.role_codes.join(" · ");
  const roleDetail = roleLabel || "Rolle zugewiesen";

  if (contribution.release_version_id !== null) {
    const episode = contribution.episode_number
      ? `Folge ${contribution.episode_number}`
      : "Release-Version";
    return {
      title: contribution.anime_title ?? "Ohne Titel",
      detail: `${episode} · ${roleDetail}`,
    };
  }

  return {
    title: contribution.anime_title ?? "Ohne Titel",
    detail: roleDetail,
  };
}


export interface AttentionProjectGroup {
  key: string;
  animeTitle: string;
  fansubGroupName: string | null;
  contributions: MeAnimeContribution[];
  href: string;
  hasRecentAssignment: boolean;
  hasOwnRejectedWork: boolean;
}

/**
 * Fasst neue Projekt- und Release-Zuweisungen pro Anime/Fansubprojekt zusammen.
 * Release-spezifische Ausnahmen erhalten dabei Vorrang als Klickziel, damit z. B.
 * Folge 5 direkt im passenden Arbeitsbereich geöffnet wird.
 */
export function groupAttentionContributions(
  contributions: MeAnimeContribution[],
): AttentionProjectGroup[] {
  const grouped = new Map<string, MeAnimeContribution[]>();

  for (const contribution of filterAttentionContributions(contributions)) {
    const key = contributionScopeKey(contribution);
    const existing = grouped.get(key) ?? [];
    existing.push(contribution);
    grouped.set(key, existing);
  }

  return [...grouped.entries()]
    .map(([key, items]) => {
      const ordered = [...items].sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      );
      const primary = ordered.find((item) => item.release_version_id !== null) ?? ordered[0];
      return {
        key,
        animeTitle: primary.anime_title ?? 'Ohne Titel',
        fansubGroupName: primary.fansub_group_name?.trim() || null,
        contributions: ordered,
        href: resolveWorkspaceHref(primary),
        hasRecentAssignment: ordered.some((item) => isRecentlyAssigned(item.created_at, ATTENTION_WINDOW_DAYS)),
        hasOwnRejectedWork: ordered.some((item) => item.has_own_rejected_notes || item.has_own_rejected_media),
      };
    })
    .sort((left, right) => {
      const newestLeft = new Date(left.contributions[0]?.created_at ?? 0).getTime();
      const newestRight = new Date(right.contributions[0]?.created_at ?? 0).getTime();
      return newestRight - newestLeft;
    });
}
