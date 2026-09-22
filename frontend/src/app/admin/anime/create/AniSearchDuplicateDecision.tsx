"use client";

// AniSearchDuplicateDecision: extrahiert aus CreateAniSearchIntakeCard.tsx und um eine
// echte "Verbinden"-Aktion erweitert (D-02). Ersetzt sowohl den bisherigen reinen "Zum
// vorhandenen Anime wechseln"-Link als auch die vorherige automatische
// Vollseiten-Navigation aus loadAniSearchDraftByID (Design-Entscheidung 20/21). Rendert
// an BEIDEN Konflikt-Auslösepunkten (D-02 Auswahlzeit, D-20 save-time Re-Check) — im
// zweiten Fall mit einer zusätzlichen Kontextzeile (`conflict.viaSaveTimeRecheck`).
// D-30 (165-18, Nachtrag nach Live-UAT): "Trotzdem als neuen Anime anlegen" entfaellt
// ersatzlos an BEIDEN Ausloesepunkten -- eine AniSearch-ID gehoert zu genau einem Anime
// (uq_anime_source_links_source), ein zweiter Anime mit derselben ID ist fachlich
// unmoeglich. Bei einem Treffer bleiben ausschliesslich "Mit bestehendem Anime
// verbinden" und "Zum vorhandenen Anime" -- es gibt keinen Recovery-Pfad ueber
// "trotzdem neu" mehr. Nutzt ausschliesslich @/components/ui-Primitives (Button); dies
// ist neuer Code, die D-13-Ausnahme fuer die uebrigen nativen Elemente in
// CreateAniSearchIntakeCard.tsx gilt hier nicht.

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui";
import { applyAdminAnimeMetadataFromJellyfin, ApiError } from "@/lib/api";
import styles from "../../admin.module.css";
import type { CreateAniSearchConflictState } from "./createAniSearchControllerHelpers";
import { isValidDiscoveryReturnURL } from "./DiscoveryReturnLink";

export interface AniSearchDuplicateDecisionProps {
  conflict: CreateAniSearchConflictState;
  /** D-08: Jellyfin-Serien-ID des aktuell im Draft aktiven Kandidaten, falls vorhanden. */
  activeJellyfinSeriesID?: string | null;
}

export function AniSearchDuplicateDecision({
  conflict,
  activeJellyfinSeriesID,
}: AniSearchDuplicateDecisionProps) {
  const searchParams = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectedTitle, setConnectedTitle] = useState<string | null>(null);

  if (connectedTitle) {
    return (
      <div className={styles.details}>
        <p role="status" className={styles.hint}>
          Jellyfin-Referenz mit „{connectedTitle}“ verknüpft.
        </p>
      </div>
    );
  }

  async function handleConnect() {
    if (!activeJellyfinSeriesID) return;

    setConnectError(null);
    setIsConnecting(true);
    try {
      await applyAdminAnimeMetadataFromJellyfin(conflict.existingAnimeID, {
        jellyfin_series_id: activeJellyfinSeriesID,
        connect: true,
      });
      setConnectedTitle(conflict.existingTitle);

      // GAP-12: leave the (now-stale) create draft after a successful connect instead of
      // staying on it, preserving the discovery return-link when present and valid
      // (same open-redirect contract as DiscoveryReturnLink itself).
      const returnURL = searchParams.get("return");
      const target = isValidDiscoveryReturnURL(returnURL)
        ? `${conflict.redirectPath}?return=${encodeURIComponent(returnURL as string)}`
        : conflict.redirectPath;
      window.location.href = target;
    } catch (error) {
      setConnectError(
        error instanceof ApiError
          ? `(${error.status}) ${error.message}`
          : "Verknüpfung fehlgeschlagen.",
      );
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div className={styles.details}>
      {conflict.viaSaveTimeRecheck ? (
        <p className={styles.hint}>
          Beim Speichern wurde erneut ein bestehender Anime mit dieser AniSearch-ID
          gefunden.
        </p>
      ) : null}
      <p className={styles.hint}>
        AniSearch ID {conflict.anisearchID} ist bereits mit{" "}
        <strong>{conflict.existingTitle}</strong> verknüpft.
      </p>

      <div
        style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}
      >
        {activeJellyfinSeriesID ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={isConnecting}
            disabled={isConnecting}
            onClick={() => {
              void handleConnect();
            }}
          >
            Mit bestehendem Anime verbinden
          </Button>
        ) : null}

        <Button href={conflict.redirectPath} variant="ghost" size="sm">
          Zum vorhandenen Anime wechseln
        </Button>
      </div>

      {connectError ? (
        <div className={styles.errorBox}>
          <p>{connectError}</p>
        </div>
      ) : null}
    </div>
  );
}
