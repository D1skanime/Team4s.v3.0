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
        </div>
        {animeID ? (
          <Link className={styles.secondaryButton} href={`/admin/anime/${animeID}/episodes`}>
            Zurück zur Übersicht
          </Link>
        ) : null}
      </header>

      {/* Context strip: always visible once context is loaded */}
      {builder.context ? (
        <div className={styles.contextStrip}>
          <ContextField label="AniSearch ID" value={builder.context.anisearch_id ?? 'nicht gesetzt'} mono />
          <ContextField label="Jellyfin Serie" value={builder.context.jellyfin_series_id ?? 'nicht verknüpft'} mono />
          <ContextField label="Ordnerpfad" value={builder.context.folder_path ?? 'nicht gesetzt'} mono />
          <ContextField label="Quelle" value={builder.context.source ?? '—'} />
        </div>
      ) : null}

      {builder.isLoadingContext ? <div className={styles.notice}>Import-Kontext wird geladen...</div> : null}
      {builder.errorMessage ? <div className={styles.error}>{builder.errorMessage}</div> : null}

      {/* Sources panel */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Quellen konfigurieren</h2>
            <p>AniSearch bestimmt die Episodennummern. Jellyfin liefert die Dateien.</p>
          </div>
          <button
            className={styles.primaryButton}
            type="button"
            disabled={builder.isPreviewing || !animeID}
            onClick={() => void builder.loadPreview()}
          >
            {builder.isPreviewing ? 'Vorschau lädt...' : 'Vorschau laden'}
          </button>
        </div>

        <div className={styles.sourceGrid}>
          <label className={styles.field}>
            <span>AniSearch ID</span>
            <input value={builder.anisearchID} onChange={(event) => builder.setAniSearchID(event.target.value)} placeholder="z.B. 12345" />
          </label>
          <label className={styles.field}>
            <span>Season Offset</span>
            <input value={builder.seasonOffset} onChange={(event) => builder.setSeasonOffset(event.target.value)} placeholder="0" />
          </label>
        </div>
      </section>

      {/* Summary metrics */}
      {builder.summary ? (
        <div className={styles.summaryStrip}>
          <SummaryPill label="Kanonisch" value={builder.summary.canonical_episode_count} />
          <SummaryPill label="Dateien" value={builder.summary.media_candidate_count} />
          <SummaryPill label="Vorschläge" value={builder.summary.suggested_count} tone="neutral" />
          <SummaryPill label="Bestätigt" value={builder.summary.confirmed_count} tone="good" />
          <SummaryPill label="Konflikte" value={builder.summary.conflict_count} tone={builder.summary.conflict_count ? 'danger' : 'good'} />
          <SummaryPill label="Übersprungen" value={builder.summary.skipped_count} />
          <SummaryPill label="Ohne Datei" value={builder.summary.unmapped_episode_count} tone={builder.summary.unmapped_episode_count ? 'neutral' : undefined} />
        </div>
      ) : null}

      {/* Mapping workbench — main operator surface */}
      {builder.preview ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Mapping-Workbench</h2>
              <p>
                Jede Datei braucht ein Ziel oder wird übersprungen. Mehrere Episodennummern als Kommaliste, z.B.{' '}
                <code>9,10</code>. Mehrere Dateien für dieselbe Episode sind als parallele Versionen erlaubt.
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
                {builder.isApplying ? 'Wendet an...' : 'Mapping anwenden'}
              </button>
            </div>
          </div>

          {/* Episode groups */}
          <div className={styles.episodeGroups}>
            {builder.episodeGroups.map((group) => (
              <EpisodeGroup
                key={group.episodeNumber}
                group={group}
                onSetTargets={builder.setTargets}
                onSkip={builder.skipMapping}
                onConfirmEpisode={builder.confirmEpisodeRows}
                onSkipEpisode={builder.skipEpisodeRows}
              />
            ))}
            {/* Rows with no suggested episode (unmapped candidates) */}
            {builder.unmappedMappingRows.length > 0 ? (
              <div className={styles.episodeGroup}>
                <div className={styles.episodeGroupHeader}>
                  <span className={styles.episodeGroupLabel}>Ohne Episodenzuordnung</span>
                  <span className={styles.episodeGroupCount}>{builder.unmappedMappingRows.length} Datei(en)</span>
                </div>
                <div className={styles.mappingList}>
                  {builder.unmappedMappingRows.map((row) => (
                    <MappingRow
                      key={row.media_item_id}
                      row={row}
                      onSetTargets={builder.setTargets}
                      onSkip={builder.skipMapping}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {builder.preview.unmapped_episodes?.length ? (
            <p className={styles.hint}>
              Episoden ohne Datei: {builder.preview.unmapped_episodes.join(', ')}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Apply result */}
      {builder.applyResult ? (
        <section className={styles.success}>
          <h2>Mapping angewendet</h2>
          <p>
            Episoden erstellt: <strong>{builder.applyResult.episodes_created}</strong>, vorhanden:{' '}
            <strong>{builder.applyResult.episodes_existing}</strong>, Versionen erstellt:{' '}
            <strong>{builder.applyResult.versions_created}</strong>, aktualisiert:{' '}
            <strong>{builder.applyResult.versions_updated}</strong>, Mappings:{' '}
            <strong>{builder.applyResult.mappings_applied}</strong>.
          </p>
          {animeID ? (
            <Link className={styles.secondaryButton} href={`/admin/anime/${animeID}/episodes`}>
              Zur Episodenübersicht
            </Link>
          ) : null}
        </section>
      ) : null}
    </main>
  )
}

// --- Sub-components ---

interface EpisodeGroupProps {
  group: {
    episodeNumber: number
    title: string | null
    existingEpisodeId: number | null
    rows: import('@/types/episodeImport').EpisodeImportMappingRow[]
  }
  onSetTargets: (mediaItemID: string, rawTargets: string) => void
  onSkip: (mediaItemID: string) => void
  onConfirmEpisode: (episodeNumber: number) => void
  onSkipEpisode: (episodeNumber: number) => void
}

function EpisodeGroup({ group, onSetTargets, onSkip, onConfirmEpisode, onSkipEpisode }: EpisodeGroupProps) {
  const hasActionable = group.rows.some((row) => row.status === 'suggested' || row.status === 'conflict')

  return (
    <div className={styles.episodeGroup}>
      <div className={styles.episodeGroupHeader}>
        <div className={styles.episodeGroupMeta}>
          <span className={styles.episodeGroupNumber}>#{group.episodeNumber}</span>
          <span className={styles.episodeGroupTitle}>{group.title ?? 'Ohne Titel'}</span>
          {group.existingEpisodeId ? <span className={styles.existingBadge}>lokal vorhanden</span> : null}
        </div>
        {hasActionable ? (
          <div className={styles.episodeGroupActions}>
            <button
              className={styles.microButton}
              type="button"
              onClick={() => onConfirmEpisode(group.episodeNumber)}
            >
              Alle bestätigen
            </button>
            <button
              className={styles.microButton}
              type="button"
              onClick={() => onSkipEpisode(group.episodeNumber)}
            >
              Alle überspringen
            </button>
          </div>
        ) : null}
      </div>
      <div className={styles.mappingList}>
        {group.rows.map((row) => (
          <MappingRow
            key={row.media_item_id}
            row={row}
            onSetTargets={onSetTargets}
            onSkip={onSkip}
          />
        ))}
      </div>
    </div>
  )
}

interface MappingRowProps {
  row: import('@/types/episodeImport').EpisodeImportMappingRow
  onSetTargets: (mediaItemID: string, rawTargets: string) => void
  onSkip: (mediaItemID: string) => void
}

function MappingRow({ row, onSetTargets, onSkip }: MappingRowProps) {
  const label = row.file_name || row.media_item_id
  const isSkipped = row.status === 'skipped'

  return (
    <div className={`${styles.mappingRow} ${styles[row.status]}`}>
      <div className={styles.mappingRowFile}>
        <strong className={styles.fileName}>{label}</strong>
        {row.display_path ? <span className={styles.displayPath}>{row.display_path}</span> : null}
        {(row.target_episode_numbers ?? []).length > 1 ? (
          <span className={styles.multiEpisodeHint}>Deckt {row.target_episode_numbers.length} Episoden ab</span>
        ) : null}
      </div>
      <span className={`${styles.statusPill} ${styles[row.status]}`}>{statusLabel(row.status)}</span>
      <input
        className={styles.targetInput}
        defaultValue={(row.target_episode_numbers ?? []).join(',')}
        disabled={isSkipped}
        onBlur={(event) => onSetTargets(row.media_item_id, event.target.value)}
        aria-label={`Ziel-Episoden für ${label}`}
        placeholder="z.B. 1"
      />
      <button
        className={`${styles.microButton} ${isSkipped ? styles.microButtonActive : ''}`}
        type="button"
        onClick={() => onSkip(row.media_item_id)}
      >
        {isSkipped ? 'Reaktivieren' : 'Überspringen'}
      </button>
    </div>
  )
}

function ContextField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.contextField}>
      <span className={styles.contextFieldLabel}>{label}</span>
      <span className={mono ? styles.contextFieldValueMono : styles.contextFieldValue}>{value}</span>
    </div>
  )
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'good' | 'danger' | 'neutral'
}) {
  const cls = [
    styles.summaryPill,
    tone === 'good' ? styles.summaryPillGood : '',
    tone === 'danger' ? styles.summaryPillDanger : '',
    tone === 'neutral' ? styles.summaryPillNeutral : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function statusLabel(status: string): string {
  switch (status) {
    case 'suggested': return 'Vorschlag'
    case 'confirmed': return 'Bestätigt'
    case 'conflict': return 'Konflikt'
    case 'skipped': return 'Übersprungen'
    default: return status
  }
}
