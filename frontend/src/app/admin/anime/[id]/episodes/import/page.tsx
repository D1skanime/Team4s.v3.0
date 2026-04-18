'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useParams } from 'next/navigation'

import styles from './page.module.css'
import { useEpisodeImportBuilder } from './useEpisodeImportBuilder'

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export default function AdminAnimeEpisodeImportPage() {
  const params = useParams<{ id: string }>()
  const animeID = useMemo(() => parsePositiveInt((params.id || '').trim()), [params.id])
  const builder = useEpisodeImportBuilder(animeID)

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link>
        <span>/</span>
        <Link href="/admin/anime">Anime</Link>
        <span>/</span>
        <Link href={animeID ? `/admin/anime/${animeID}/episodes` : '/admin/anime'}>Episoden</Link>
        <span>/</span>
        <span>Import</span>
      </nav>

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Episode Import</p>
          <h1>{builder.context?.anime_title ?? 'Episoden importieren'}</h1>
          <p>
            AniSearch liefert die kanonische Episodenliste. Jellyfin liefert nur Dateien und Hinweise. Gespeichert wird
            erst nach deiner Mapping-Freigabe.
          </p>
        </div>
        {animeID ? (
          <Link className={styles.secondaryButton} href={`/admin/anime/${animeID}/episodes`}>
            Zurueck zur Uebersicht
          </Link>
        ) : null}
      </header>

      {builder.isLoadingContext ? <div className={styles.notice}>Import-Kontext wird geladen...</div> : null}
      {builder.errorMessage ? <div className={styles.error}>{builder.errorMessage}</div> : null}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Quellen</h2>
            <p>AniSearch bestimmt die Nummern, Jellyfin bleibt Dateiquelle.</p>
          </div>
          <button
            className={styles.primaryButton}
            type="button"
            disabled={builder.isPreviewing || !animeID}
            onClick={() => void builder.loadPreview()}
          >
            {builder.isPreviewing ? 'Preview laedt...' : 'Preview laden'}
          </button>
        </div>

        <div className={styles.sourceGrid}>
          <label className={styles.field}>
            <span>AniSearch ID</span>
            <input value={builder.anisearchID} onChange={(event) => builder.setAniSearchID(event.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Season Offset</span>
            <input value={builder.seasonOffset} onChange={(event) => builder.setSeasonOffset(event.target.value)} />
          </label>
          <div className={styles.readonlyField}>
            <span>Jellyfin Serie</span>
            <strong>{builder.context?.jellyfin_series_id ?? 'nicht gesetzt'}</strong>
          </div>
          <div className={styles.readonlyField}>
            <span>Ordnerpfad</span>
            <strong>{builder.context?.folder_path ?? 'nicht gesetzt'}</strong>
          </div>
        </div>
      </section>

      {builder.summary ? (
        <section className={styles.summaryGrid}>
          <Metric label="AniSearch Episoden" value={builder.summary.canonical_episode_count} />
          <Metric label="Jellyfin Dateien" value={builder.summary.media_candidate_count} />
          <Metric label="Vorschlaege" value={builder.summary.suggested_count} />
          <Metric label="Bestaetigt" value={builder.summary.confirmed_count} />
          <Metric label="Konflikte" value={builder.summary.conflict_count} tone={builder.summary.conflict_count ? 'danger' : 'normal'} />
          <Metric label="Uebersprungen" value={builder.summary.skipped_count} />
        </section>
      ) : null}

      {builder.preview ? (
        <div className={styles.contentGrid}>
          <section className={styles.panel}>
            <h2>Kanonische Episoden</h2>
            <div className={styles.list}>
              {builder.preview.canonical_episodes.map((episode) => (
                <div className={styles.episodeRow} key={episode.episode_number}>
                  <strong>#{episode.episode_number}</strong>
                  <span>{episode.title ?? episode.existing_title ?? 'Ohne Titel'}</span>
                  {episode.existing_episode_id ? <em>lokal vorhanden</em> : null}
                </div>
              ))}
            </div>
            {builder.preview.unmapped_episodes?.length ? (
              <p className={styles.hint}>Unmapped: {builder.preview.unmapped_episodes.join(', ')}</p>
            ) : null}
          </section>

          <section className={styles.panel}>
            <h2>Jellyfin Dateien</h2>
            <div className={styles.list}>
              {builder.preview.media_candidates.map((media) => (
                <div className={styles.mediaRow} key={media.media_item_id}>
                  <strong>{media.file_name || media.media_item_id}</strong>
                  <span>{formatJellyfinEvidence(media.jellyfin_season_number, media.jellyfin_episode_number)}</span>
                  <small>{media.path || media.media_item_id}</small>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {builder.preview ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Mapping Builder</h2>
              <p>Targets als Komma-Liste eintragen, z.B. <code>9,10</code> fuer eine Datei mit zwei Folgen.</p>
            </div>
            <button
              className={styles.primaryButton}
              type="button"
              disabled={!builder.canApply || builder.isApplying}
              onClick={() => void builder.applyMappings()}
            >
              {builder.isApplying ? 'Wendet an...' : 'Mapping anwenden'}
            </button>
          </div>

          <div className={styles.mappingList}>
            {builder.mappings.map((row) => (
              <div className={styles.mappingRow} key={row.media_item_id}>
                <div>
                  <strong>{row.media_item_id}</strong>
                  <span className={`${styles.statusPill} ${styles[row.status]}`}>{row.status}</span>
                </div>
                <input
                  defaultValue={row.target_episode_numbers.join(',')}
                  onBlur={(event) => builder.setTargets(row.media_item_id, event.target.value)}
                  aria-label={`Targets fuer ${row.media_item_id}`}
                />
                <button className={styles.secondaryButton} type="button" onClick={() => builder.skipMapping(row.media_item_id)}>
                  Ueberspringen
                </button>
                {row.target_episode_numbers.length > 1 ? <p>Diese Datei deckt mehrere kanonische Episoden ab.</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {builder.applyResult ? (
        <section className={styles.success}>
          <h2>Apply abgeschlossen</h2>
          <p>
            Episoden erstellt: {builder.applyResult.episodes_created}, vorhanden: {builder.applyResult.episodes_existing},
            Versionen erstellt: {builder.applyResult.versions_created}, aktualisiert: {builder.applyResult.versions_updated},
            Mappings: {builder.applyResult.mappings_applied}.
          </p>
        </section>
      ) : null}
    </main>
  )
}

function Metric({ label, value, tone = 'normal' }: { label: string; value: number; tone?: 'normal' | 'danger' }) {
  return (
    <div className={`${styles.metric} ${tone === 'danger' ? styles.metricDanger : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function formatJellyfinEvidence(season?: number | null, episode?: number | null): string {
  const safeSeason = season && season > 0 ? String(season).padStart(2, '0') : '??'
  const safeEpisode = episode && episode > 0 ? String(episode).padStart(2, '0') : '??'
  return `S${safeSeason}E${safeEpisode}`
}
