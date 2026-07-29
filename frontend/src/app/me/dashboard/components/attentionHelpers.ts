// Pure helpers für die Dashboard-"Achtung"-Sektion (Phase 116, D-02).
//
// Diese Funktionen sind absichtlich frei von React/Fetch-Abhängigkeiten, damit sie isoliert
// unit-testbar bleiben (Wave-0/interface-first, siehe 116-01-PLAN.md). AttentionSection.tsx
// (Plan 116-04/05) importiert sie direkt statt die Logik erneut zu implementieren.

import type { MeAnimeContribution } from '@/types/contributions'

/**
 * D-02/CONTEXT.md "Claude's Discretion": Zeitfenster in Tagen, innerhalb dessen eine
 * Zuweisung als "neu" gilt. Benannte Konstante statt Magic Number.
 */
export const ATTENTION_WINDOW_DAYS = 14

/**
 * D-02/Pattern 3 (116-RESEARCH.md): true, wenn createdAt innerhalb der letzten windowDays
 * Tage liegt (Alter in Millisekunden gegen Date.now() verglichen).
 */
export function isRecentlyAssigned(createdAt: string, windowDays: number): boolean {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  return ageMs <= windowDays * 24 * 60 * 60 * 1000
}

/**
 * D-02/Pattern 2 (116-RESEARCH.md): release_version_id gesetzt -> Release-Version-Arbeitsfläche,
 * sonst -> anime-weite Projekt-Arbeitsfläche.
 */
export function resolveWorkspaceHref(
  contribution: Pick<MeAnimeContribution, 'release_version_id' | 'anime_id' | 'fansub_group_id'>,
): string {
  return contribution.release_version_id
    ? `/me/releases/${contribution.release_version_id}/workspace`
    : `/me/projects/${contribution.anime_id}/group/${contribution.fansub_group_id}`
}
