"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { getAnimeByID, getAnimeFansubs, getFansubBySlug } from "@/lib/api";
import { PlatformAdminGate } from "@/components/auth/PlatformAdminGate";
import { useAuthSession } from "@/lib/useAuthSession";
import { AnimeDetail } from "@/types/anime";
import { FansubGroup } from "@/types/fansub";

import { AnimeEditWorkspace } from "../../components/AnimeEditPage/AnimeEditWorkspace";
import { AnimeRelationsSection } from "../../components/AnimeEditPage/AnimeRelationsSection";
import { AnimeContextFansubs } from "../../components/AnimeContext/AnimeContextFansubs";
import { AnimeContextFansubManager } from "../../components/AnimeContext/AnimeContextFansubManager";
import { DiscoveryReturnLink } from "../../create/DiscoveryReturnLink";
import styles from "../../AdminStudio.module.css";
import { parsePositiveInt } from "../../utils/anime-helpers";
import { formatEditLoadError } from "./formatEditLoadError";

function formatAnimeLabel(anime: AnimeDetail): string {
  return `${String(anime.id).padStart(3, "0")} ${anime.title}`;
}

function AdminAnimeEditContent() {
  const params = useParams<{ id: string }>();
  const animeID = useMemo(
    () => parsePositiveInt((params.id || "").trim()),
    [params.id],
  );
  const searchParams = useSearchParams();
  const discoveryReturnURL = searchParams.get("return") ?? undefined;

  const { hasAccessToken } = useAuthSession();
  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [fansubs, setFansubs] = useState<FansubGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFansubs, setIsLoadingFansubs] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnime() {
      if (!animeID) {
        setErrorMessage("Ungültige Anime-ID.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await getAnimeByID(animeID, {
          include_disabled: true,
        });
        setAnime(response.data);
      } catch (error) {
        setAnime(null);
        setErrorMessage(formatEditLoadError(error));
      } finally {
        setIsLoading(false);
      }
    }

    void loadAnime();
  }, [animeID]);

  const loadFansubs = useCallback(async () => {
    if (!animeID) {
      setFansubs([]);
      return;
    }

    setIsLoadingFansubs(true);
    try {
      const response = await getAnimeFansubs(animeID);
      const slugs = Array.from(
        new Set(
          response.data
            .map((relation) => relation.fansub_group?.slug?.trim() || "")
            .filter((slug) => slug.length > 0),
        ),
      );
      const details = await Promise.allSettled(
        slugs.map((slug) => getFansubBySlug(slug)),
      );
      setFansubs(
        details
          .filter((result) => result.status === "fulfilled")
          .map((result) =>
            result.status === "fulfilled" ? result.value.data : null,
          )
          .filter((group): group is FansubGroup => group !== null),
      );
    } catch {
      setFansubs([]);
    } finally {
      setIsLoadingFansubs(false);
    }
  }, [animeID]);

  useEffect(() => {
    void loadFansubs();
  }, [loadFansubs]);

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link>
        <span>/</span>
        <Link href="/admin/anime">Anime</Link>
        <span>/</span>
        {anime ? (
          <>
            <span>{formatAnimeLabel(anime)}</span>
            <span>/</span>
          </>
        ) : null}
        <span>Bearbeiten</span>
      </nav>

      <DiscoveryReturnLink returnURL={discoveryReturnURL} />

      {isLoading ? (
        <div className={styles.noticeBox}>Anime-Daten werden geladen...</div>
      ) : null}
      {errorMessage ? (
        <div className={styles.errorBox}>{errorMessage}</div>
      ) : null}
      {successMessage ? (
        <div className={styles.successBox}>{successMessage}</div>
      ) : null}

      {anime ? (
        <>
          <AnimeEditWorkspace
            anime={anime}
            onSaved={(nextAnime, message) => {
              setAnime(nextAnime);
              setErrorMessage(null);
              setSuccessMessage(message);
            }}
            onError={(message) => {
              setSuccessMessage(null);
              setErrorMessage(message);
            }}
            onRequest={setLastRequest}
            onResponse={setLastResponse}
          />

          {hasAccessToken ? (
            <>
              <section className={styles.card}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Fansub-Gruppen</h2>
                    <p className={styles.sectionMeta}>
                      Verknüpfe diesen Anime mit Fansub-Gruppen, damit er in
                      Gruppenprofilen und Release-Workflows auswählbar ist.
                    </p>
                  </div>
                </div>
                <AnimeContextFansubs
                  fansubs={fansubs}
                  isLoading={isLoadingFansubs}
                />
                <AnimeContextFansubManager
                  animeID={anime.id}
                  attachedFansubs={fansubs}
                  disabled={isLoadingFansubs}
                  onChanged={loadFansubs}
                  onSuccess={(message) => {
                    setErrorMessage(null);
                    setSuccessMessage(message);
                  }}
                  onError={(message) => {
                    setSuccessMessage(null);
                    setErrorMessage(message);
                  }}
                />
              </section>

              <AnimeRelationsSection
                animeID={anime.id}
                defaultOpen
                onSuccess={(message) => {
                  setErrorMessage(null);
                  setSuccessMessage(message);
                }}
                onError={(message) => {
                  setSuccessMessage(null);
                  setErrorMessage(message);
                }}
              />
            </>
          ) : null}

          {lastRequest || lastResponse ? (
            <section className={styles.card}>
              <details className={styles.developerPanel}>
                <summary>Developer Panel</summary>
                <div className={styles.developerPanelContent}>
                  {lastRequest ? (
                    <pre className={styles.codeBlock}>{lastRequest}</pre>
                  ) : null}
                  {lastResponse ? (
                    <pre className={styles.codeBlock}>{lastResponse}</pre>
                  ) : null}
                </div>
              </details>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

export default function AdminAnimeEditPage() {
  return (
    <PlatformAdminGate>
      <AdminAnimeEditContent />
    </PlatformAdminGate>
  );
}
