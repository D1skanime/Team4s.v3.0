"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { getAnimeByID, getAnimeFansubs, getFansubBySlug } from "@/lib/api";
import { PlatformAdminGate } from "@/components/auth/PlatformAdminGate";
import { useAuthSession } from "@/lib/useAuthSession";
import { AnimeDetail } from "@/types/anime";
import { FansubGroup } from "@/types/fansub";

import { AnimeEditWorkspace } from "../../components/AnimeEditPage/AnimeEditWorkspace";
import { AnimeRelationsSection } from "../../components/AnimeEditPage/AnimeRelationsSection";
import { AnimeContextFansubs } from "../../components/AnimeContext/AnimeContextFansubs";
import { AnimeContextFansubManager } from "../../components/AnimeContext/AnimeContextFansubManager";
import styles from "../../AdminStudio.module.css";
import { parsePositiveInt, resolveCoverUrl } from "../../utils/anime-helpers";
import { formatAdminError } from "../../utils/studio-helpers";

function formatAnimeLabel(anime: AnimeDetail): string {
  return `${String(anime.id).padStart(3, "0")} ${anime.title}`;
}

export function formatEditLoadError(error: unknown): string {
  return formatAdminError(error, "Anime konnte nicht geladen werden.");
}

function AdminAnimeEditContent() {
  const params = useParams<{ id: string }>();
  const animeID = useMemo(
    () => parsePositiveInt((params.id || "").trim()),
    [params.id],
  );

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

  async function loadFansubs() {
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
  }

  useEffect(() => {
    void loadFansubs();
  }, [animeID]);

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

      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.pageTitle}>Anime bearbeiten</h1>
          <p className={styles.pageSubtitle}>
            Diese Route basiert jetzt auf dem Create-Flow und ersetzt den alten
            Edit-Baukasten. Bearbeitet werden nur Stammdaten und Assets des
            Anime selbst.
          </p>
        </div>
        {anime ? (
          <div className={styles.headerActions}>
            <Link
              href={`/admin/anime/${anime.id}/episodes`}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Zu Episoden wechseln
            </Link>
            <Link
              href={`/anime/${anime.id}`}
              className={`${styles.button} ${styles.buttonSecondary}`}
              target="_blank"
              rel="noreferrer"
            >
              Public ansehen
            </Link>
          </div>
        ) : null}
        {anime ? (
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.itemTitle}>{anime.title}</p>
              <p className={styles.sectionMeta}>
                #{String(anime.id).padStart(3, "0")} | Typ {anime.type} | Status{" "}
                {anime.status} | Quelle {anime.source || "manuell"}
              </p>
            </div>
            <Image
              className={styles.cover}
              src={resolveCoverUrl(anime.cover_image)}
              alt=""
              width={96}
              height={136}
              unoptimized
            />
          </div>
        ) : null}
      </header>

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
