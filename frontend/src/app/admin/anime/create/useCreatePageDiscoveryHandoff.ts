"use client";

import { useEffect, useRef } from "react";

/**
 * useCreatePageDiscoveryHandoff: kapselt zwei additive Discovery-Verhalten fuer die
 * Create-Seite, ausgelagert aus useAdminAnimeCreateController.ts (bereits 1451 Zeilen,
 * ueber dem 450-Zeilen-CLAUDE.md-Limit), damit diese Logik unabhaengig getestet werden
 * kann, ohne den Controller weiter wachsen zu lassen:
 *
 * 1. Auto-Adopt-Once (D-08): wenn `jellyfinID` gesetzt ist und die Vorschau noch nicht
 *    uebernommen wurde, wird `adoptCandidate(jellyfinID)` genau einmal aufgerufen — auch
 *    ueber mehrere Re-Renders hinweg mit derselben ID (intern per Ref abgesichert, nicht
 *    von einer Memoisierung durch den Aufrufer abhaengig).
 * 2. AniSearch-Prefill (D-09/D-26): sobald der Jellyfin-Serienname vorliegt und das
 *    AniSearch-Suchfeld noch leer ist, wird das Suchfeld genau einmal vorbefuellt — es
 *    wird dadurch NIE automatisch gesucht, nur der Eingabewert wird gesetzt.
 *
 * Dieser Hook haengt ausschliesslich von einfachen Werten/Callbacks ab, die der
 * Controller bereits exponiert — er importiert nichts aus
 * useAdminAnimeCreateController.ts.
 */
export interface UseCreatePageDiscoveryHandoffParams {
  jellyfinID: string | null;
  hasAdoptedPreview: boolean;
  adoptCandidate: (id: string) => void | Promise<void>;
  jellyfinPreviewSeriesName: string | undefined;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

export function useCreatePageDiscoveryHandoff(
  params: UseCreatePageDiscoveryHandoffParams,
): void {
  const {
    jellyfinID,
    hasAdoptedPreview,
    adoptCandidate,
    jellyfinPreviewSeriesName,
    searchQuery,
    setSearchQuery,
  } = params;

  const hasTriggeredAdoptRef = useRef(false);
  const hasPrefilledSearchRef = useRef(false);

  useEffect(() => {
    if (!jellyfinID) return;
    if (hasAdoptedPreview) return;
    if (hasTriggeredAdoptRef.current) return;

    hasTriggeredAdoptRef.current = true;
    void adoptCandidate(jellyfinID);
  }, [jellyfinID, hasAdoptedPreview, adoptCandidate]);

  useEffect(() => {
    if (!jellyfinID) return;
    if (hasPrefilledSearchRef.current) return;
    if (!jellyfinPreviewSeriesName) return;
    if (searchQuery.trim() !== "") return;

    hasPrefilledSearchRef.current = true;
    setSearchQuery(jellyfinPreviewSeriesName);
  }, [jellyfinID, jellyfinPreviewSeriesName, searchQuery, setSearchQuery]);
}
