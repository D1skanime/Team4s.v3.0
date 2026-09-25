"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PlatformAdminGate } from "@/components/auth/PlatformAdminGate";
import { EpisodeImportApplyErrorAlert } from "./EpisodeImportApplyErrorAlert";
import { EpisodeImportFolderSelector } from "./EpisodeImportFolderSelector";
import { EpisodeImportMappingRowCard } from "./EpisodeImportMappingRow";
import { EpisodeGroup } from "./EpisodeImportEpisodeGroup";
import { jellyfinSourceKey } from "@/lib/jellyfinSourceIdentity";
import styles from "./page.module.css";
import { useEpisodeImportBuilder } from "./useEpisodeImportBuilder";

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function AdminAnimeEpisodeImportContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const animeID = useMemo(
    () => parsePositiveInt((params.id || "").trim()),
    [params.id],
  );
  const builder = useEpisodeImportBuilder(animeID);
  // Tracks only an explicit admin override; the effective selection (default
  // main folder, or a still-valid prior override) is derived at render time
  // below instead of synced via an effect, avoiding a setState-in-effect
  // cascading render for the ordinary "no folders yet" and "context reload"
  // cases.
  const [folderOverride, setFolderOverride] = useState<string | null>(null);
  const jellyfinFolders = useMemo(
    () => builder.context?.jellyfin_folders ?? [],
    [builder.context],
  );
  const selectedFolderID = useMemo(() => {
    if (
      folderOverride &&
      jellyfinFolders.some(
        (folder) => folder.jellyfin_item_id === folderOverride,
      )
    ) {
      return folderOverride;
    }
    const mainFolder = jellyfinFolders.find((folder) => folder.is_main);
    return mainFolder?.jellyfin_item_id ?? jellyfinFolders[0]?.jellyfin_item_id ?? null;
  }, [folderOverride, jellyfinFolders]);

  function handleFolderChange(folderID: string) {
    setFolderOverride(folderID)
    void builder.loadPreview(folderID)
  }

  useEffect(() => {
    if (!animeID || !builder.applyResult) {
      return;
    }

    router.push(`/admin/anime/${animeID}/episodes`);
  }, [animeID, builder.applyResult, router]);

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link>
        <span>/</span>
        <Link href="/admin/anime">Anime</Link>
        <span>/</span>
        <Link
          href={animeID ? `/admin/anime/${animeID}/episodes` : "/admin/anime"}
        >
          Episoden
        </Link>
        <span>/</span>
        <span>Import</span>
      </nav>

      <section className={styles.heroCard}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Episode Import</p>
            <h1>{builder.context?.anime_title ?? "Episoden importieren"}</h1>
          </div>
          {animeID ? (
            <Link
              className={styles.secondaryButton}
              href={`/admin/anime/${animeID}/episodes`}
            >
              Zurück zur Übersicht
            </Link>
          ) : null}
        </header>

        {builder.context ? (
          <div className={styles.contextStrip}>
            <ContextField
              label="AniSearch ID"
              value={builder.context.anisearch_id ?? "nicht gesetzt"}
              mono
            />
            <ContextField
              label="Jellyfin-Serien-ID"
              value={builder.context.jellyfin_series_id ?? "nicht verknüpft"}
              mono
            />
            <ContextField
              label="Ordnerpfad"
              value={builder.context.folder_path ?? "nicht gesetzt"}
              mono
            />
          </div>
        ) : null}
      </section>

      {builder.isLoadingContext ? (
        <div className={styles.notice}>Import-Kontext wird geladen...</div>
      ) : null}
      {builder.errorMessage ? (
        <div className={styles.error} role="alert">{builder.errorMessage}</div>
      ) : null}

      {jellyfinFolders.length > 1 ? (
        <div className={styles.folderSelectorStrip}>
          <EpisodeImportFolderSelector
            folders={jellyfinFolders}
            value={selectedFolderID}
            onChange={handleFolderChange}
          />
        </div>
      ) : null}

      {builder.summary ? (
        <div className={styles.summaryStrip}>
          <SummaryPill
            label="Kanonisch"
            value={builder.summary.canonical_episode_count}
          />
          <SummaryPill
            label="Dateien"
            value={builder.summary.media_candidate_count}
          />
          <SummaryPill
            label="Vorschläge"
            value={builder.summary.suggested_count}
            tone="neutral"
          />
          <SummaryPill
            label="Bestätigt"
            value={builder.summary.confirmed_count}
            tone="good"
          />
          <SummaryPill
            label="Konflikte"
            value={builder.summary.conflict_count}
            tone={builder.summary.conflict_count ? "danger" : "good"}
          />
          <SummaryPill
            label="Übersprungen"
            value={builder.summary.skipped_count}
          />
          <SummaryPill
            label="Ohne Datei"
            value={builder.summary.unmapped_episode_count}
            tone={
              builder.summary.unmapped_episode_count ? "neutral" : undefined
            }
          />
        </div>
      ) : null}

      {builder.preview ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Mapping-Workbench</h2>
              <p>
                Jede Datei braucht ein Ziel oder wird übersprungen. Mehrere
                Episodennummern als Kommaliste, z.B. <code>9,10</code>. Mehrere
                Dateien für dieselbe Episode sind als parallele Versionen
                erlaubt.
              </p>
            </div>
            <div className={styles.workbenchActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => builder.skipAllSuggested()}
                disabled={!builder.hasSuggestedRows}
              >
                Alle Vorschläge überspringen
              </button>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => builder.confirmAllSuggested()}
                disabled={!builder.hasSuggestedRows}
              >
                Alle Vorschläge bestätigen
              </button>
              <button
                className={styles.primaryButton}
                type="button"
                disabled={!builder.canApply || builder.isApplying}
                onClick={() => void builder.applyMappings()}
              >
                {builder.isApplying ? "Wendet an..." : "Mapping anwenden"}
              </button>
            </div>
            <EpisodeImportApplyErrorAlert message={builder.applyErrorMessage} />
          </div>

          <div className={styles.episodeGroups}>
            {builder.episodeGroups.map((group, index) => (
              <EpisodeGroup
                key={group.episodeNumber}
                group={group}
                hasVisualGap={
                  index > 0 &&
                  group.episodeNumber >
                    builder.episodeGroups[index - 1].lastCoveredEpisodeNumber +
                      1
                }
                onSetTargets={builder.setTargets}
                onSetRelease={builder.setReleaseMeta}
                onSetSelectedFansubGroups={builder.setSelectedFansubGroups}
                onAddSelectedFansubGroup={builder.addSelectedFansubGroup}
                onRemoveSelectedFansubGroup={builder.removeSelectedFansubGroup}
                onApplyFansubGroupToEpisode={builder.applyFansubGroupToEpisode}
                onApplyFansubGroupFromEpisode={
                  builder.applyFansubGroupFromEpisode
                }
                onSetEpisodeTitle={builder.setEpisodeTitle}
                onConfirm={builder.confirmMapping}
                onSkip={builder.skipMapping}
                onApplyRow={(id) => void builder.applyRow(id)}
                applyingRowId={builder.applyingRowId}
                onConfirmEpisode={builder.confirmEpisodeRows}
                onSkipEpisode={builder.skipEpisodeRows}
              />
            ))}
            {builder.unmappedMappingRows.length > 0 ? (
              <div className={styles.episodeGroup}>
                <div className={styles.episodeGroupHeader}>
                  <span className={styles.episodeGroupLabel}>
                    Ohne Episodenzuordnung
                  </span>
                  <span className={styles.episodeGroupCount}>
                    {builder.unmappedMappingRows.length} Datei(en)
                  </span>
                </div>
                <div className={styles.mappingList}>
                  {builder.unmappedMappingRows.map((row) => (
                    <EpisodeImportMappingRowCard
                      key={jellyfinSourceKey(row)}
                      episodeNumber={0}
                      row={row}
                      onSetTargets={builder.setTargets}
                      onSetRelease={builder.setReleaseMeta}
                      onSetSelectedFansubGroups={
                        builder.setSelectedFansubGroups
                      }
                      onAddSelectedFansubGroup={builder.addSelectedFansubGroup}
                      onRemoveSelectedFansubGroup={
                        builder.removeSelectedFansubGroup
                      }
                      onApplyFansubGroupToEpisode={
                        builder.applyFansubGroupToEpisode
                      }
                      onApplyFansubGroupFromEpisode={
                        builder.applyFansubGroupFromEpisode
                      }
                      onConfirm={builder.confirmMapping}
                      onSkip={builder.skipMapping}
                      onApplyRow={(id) => void builder.applyRow(id)}
                      isApplyingRow={
                        builder.applyingRowId === jellyfinSourceKey(row)
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {builder.preview.unmapped_episodes?.length ? (
            <p className={styles.hint}>
              Episoden ohne Datei:{" "}
              {builder.preview.unmapped_episodes.join(", ")}
            </p>
          ) : null}
        </section>
      ) : null}

      {builder.applyResult ? (
        <section className={styles.success}>
          <h2>Mapping angewendet</h2>
          <p>
            Episoden erstellt:{" "}
            <strong>{builder.applyResult.episodes_created}</strong>, vorhanden:{" "}
            <strong>{builder.applyResult.episodes_existing}</strong>, Versionen
            erstellt: <strong>{builder.applyResult.versions_created}</strong>,
            aktualisiert:{" "}
            <strong>{builder.applyResult.versions_updated}</strong>, Mappings:{" "}
            <strong>{builder.applyResult.mappings_applied}</strong>.
          </p>
          {animeID ? (
            <Link
              className={styles.secondaryButton}
              href={`/admin/anime/${animeID}/episodes`}
            >
              Zur Episodenübersicht
            </Link>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

export default function AdminAnimeEpisodeImportPage() {
  return (
    <PlatformAdminGate>
      <AdminAnimeEpisodeImportContent />
    </PlatformAdminGate>
  );
}

function ContextField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className={styles.contextField}>
      <span className={styles.contextFieldLabel}>{label}</span>
      <span
        className={
          mono ? styles.contextFieldValueMono : styles.contextFieldValue
        }
      >
        {value}
      </span>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good" | "danger" | "neutral";
}) {
  const cls = [
    styles.summaryPill,
    tone === "good" ? styles.summaryPillGood : "",
    tone === "danger" ? styles.summaryPillDanger : "",
    tone === "neutral" ? styles.summaryPillNeutral : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
