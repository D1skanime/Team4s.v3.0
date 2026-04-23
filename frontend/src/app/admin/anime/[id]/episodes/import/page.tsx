'use client'

import Link from 'next/link'
import { useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'

import type { EpisodeImportMappingRow, EpisodeImportSelectedFansubGroup } from '@/types/episodeImport'

import { EpisodeImportMappingRowCard } from './EpisodeImportMappingRow'
import { fillerLabel } from './episodeImportMapping'
import styles from './page.module.css'
import { useEpisodeImportBuilder } from './useEpisodeImportBuilder'

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export default function AdminAnimeEpisodeImportPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const animeID = useMemo(() => parsePositiveInt((params.id || '').trim()), [params.id])
  const builder = useEpisodeImportBuilder(animeID)

  useEffect(() => {
    if (!animeID || !builder.applyResult) {
      return
    }

    router.push(`/admin/anime/${animeID}/episodes`)
  }, [animeID, builder.applyResult, router])

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
            Zurueck zur Uebersicht
          </Link>
        ) : null}
      </header>

      {builder.context ? (
        <div className={styles.contextStrip}>
          <ContextField label="AniSearch ID" value={builder.context.anisearch_id ?? 'nicht gesetzt'} mono />
          <ContextField label="Jellyfin Serie" value={builder.context.jellyfin_series_id ?? 'nicht verknuepft'} mono />
          <ContextField label="Ordnerpfad" value={builder.context.folder_path ?? 'nicht gesetzt'} mono />
          <ContextField label="Quelle" value={builder.context.source ?? '-'} />
        </div>
      ) : null}

      {builder.isLoadingContext ? <div className={styles.notice}>Import-Kontext wird geladen...</div> : null}
      {builder.errorMessage ? <div className={styles.error}>{builder.errorMessage}</div> : null}

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
            {builder.isPreviewing ? 'Vorschau laedt...' : 'Vorschau laden'}
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

      {builder.summary ? (
        <div className={styles.summaryStrip}>
          <SummaryPill label="Kanonisch" value={builder.summary.canonical_episode_count} />
          <SummaryPill label="Dateien" value={builder.summary.media_candidate_count} />
          <SummaryPill label="Vorschlaege" value={builder.summary.suggested_count} tone="neutral" />
          <SummaryPill label="Bestaetigt" value={builder.summary.confirmed_count} tone="good" />
          <SummaryPill
            label="Konflikte"
            value={builder.summary.conflict_count}
            tone={builder.summary.conflict_count ? 'danger' : 'good'}
          />
          <SummaryPill label="Uebersprungen" value={builder.summary.skipped_count} />
          <SummaryPill
            label="Ohne Datei"
            value={builder.summary.unmapped_episode_count}
            tone={builder.summary.unmapped_episode_count ? 'neutral' : undefined}
          />
        </div>
      ) : null}

      {builder.preview ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Mapping-Workbench</h2>
              <p>
                Jede Datei braucht ein Ziel oder wird uebersprungen. Mehrere Episodennummern als Kommaliste, z.B.{' '}
                <code>9,10</code>. Mehrere Dateien fuer dieselbe Episode sind als parallele Versionen erlaubt.
              </p>
            </div>
            <div className={styles.workbenchActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => builder.skipAllSuggested()}
                disabled={!builder.hasSuggestedRows}
              >
                Alle Vorschlaege ueberspringen
              </button>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => builder.confirmAllSuggested()}
                disabled={!builder.hasSuggestedRows}
              >
                Alle Vorschlaege bestaetigen
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

          <div className={styles.episodeGroups}>
            {builder.episodeGroups.map((group, index) => (
              <EpisodeGroup
                key={group.episodeNumber}
                group={group}
                hasVisualGap={
                  index > 0 &&
                  group.episodeNumber > builder.episodeGroups[index - 1].lastCoveredEpisodeNumber + 1
                }
                onSetTargets={builder.setTargets}
                onSetRelease={builder.setReleaseMeta}
                onSetSelectedFansubGroups={builder.setSelectedFansubGroups}
                onAddSelectedFansubGroup={builder.addSelectedFansubGroup}
                onRemoveSelectedFansubGroup={builder.removeSelectedFansubGroup}
                onApplyFansubGroupToEpisode={builder.applyFansubGroupToEpisode}
                onApplyFansubGroupFromEpisode={builder.applyFansubGroupFromEpisode}
                onSetEpisodeTitle={builder.setEpisodeTitle}
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
                  <span className={styles.episodeGroupLabel}>Ohne Episodenzuordnung</span>
                  <span className={styles.episodeGroupCount}>{builder.unmappedMappingRows.length} Datei(en)</span>
                </div>
                <div className={styles.mappingList}>
                  {builder.unmappedMappingRows.map((row) => (
                    <EpisodeImportMappingRowCard
                      key={row.media_item_id}
                      episodeNumber={0}
                      row={row}
                      onSetTargets={builder.setTargets}
                      onSetRelease={builder.setReleaseMeta}
                      onSetSelectedFansubGroups={builder.setSelectedFansubGroups}
                      onAddSelectedFansubGroup={builder.addSelectedFansubGroup}
                      onRemoveSelectedFansubGroup={builder.removeSelectedFansubGroup}
                      onApplyFansubGroupToEpisode={builder.applyFansubGroupToEpisode}
                      onApplyFansubGroupFromEpisode={builder.applyFansubGroupFromEpisode}
                      onSkip={builder.skipMapping}
                      onApplyRow={(id) => void builder.applyRow(id)}
                      isApplyingRow={builder.applyingRowId === row.media_item_id}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {builder.preview.unmapped_episodes?.length ? (
            <p className={styles.hint}>Episoden ohne Datei: {builder.preview.unmapped_episodes.join(', ')}</p>
          ) : null}
        </section>
      ) : null}

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
              Zur Episodenuebersicht
            </Link>
          ) : null}
        </section>
      ) : null}
    </main>
  )
}

interface EpisodeGroupProps {
  group: {
    episodeNumber: number
    title: string | null
    existingEpisodeId: number | null
    fillerType: string | null
    fillerNote: string | null
    coveredEpisodes: Array<{
      episodeNumber: number
      title: string | null
      fillerType: string | null
    }>
    lastCoveredEpisodeNumber: number
    rows: EpisodeImportMappingRow[]
  }
  hasVisualGap: boolean
  onSetTargets: (mediaItemID: string, rawTargets: string) => void
  onSetRelease: (mediaItemID: string, meta: { fansubGroupName?: string; releaseVersion?: string }) => void
  onSetSelectedFansubGroups: (mediaItemID: string, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  onAddSelectedFansubGroup: (mediaItemID: string, fansubGroup: EpisodeImportSelectedFansubGroup) => void
  onRemoveSelectedFansubGroup: (mediaItemID: string, fansubGroup: EpisodeImportSelectedFansubGroup) => void
  onApplyFansubGroupToEpisode: (episodeNumber: number, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  onApplyFansubGroupFromEpisode: (episodeNumber: number, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  onSetEpisodeTitle: (episodeNumber: number, title: string) => void
  onSkip: (mediaItemID: string) => void
  onApplyRow: (mediaItemID: string) => void
  applyingRowId: string | null
  onConfirmEpisode: (episodeNumber: number) => void
  onSkipEpisode: (episodeNumber: number) => void
}

function EpisodeGroup({
  group,
  hasVisualGap,
  onSetTargets,
  onSetRelease,
  onSetSelectedFansubGroups,
  onAddSelectedFansubGroup,
  onRemoveSelectedFansubGroup,
  onApplyFansubGroupToEpisode,
  onApplyFansubGroupFromEpisode,
  onSetEpisodeTitle,
  onSkip,
  onApplyRow,
  applyingRowId,
  onConfirmEpisode,
  onSkipEpisode,
}: EpisodeGroupProps) {
  const hasActionable = group.rows.some((row) => row.status === 'suggested' || row.status === 'conflict')

  return (
    <div className={styles.episodeGroup}>
      <div className={`${styles.episodeGroupHeader} ${hasVisualGap ? styles.episodeGroupHeaderGap : ''}`}>
        <div className={styles.episodeGroupMeta}>
          <span className={`${styles.episodeGroupNumber} ${hasVisualGap ? styles.episodeGroupNumberGap : ''}`}>#{group.episodeNumber}</span>
          <div className={styles.episodeTitleBlock}>
            <label className={styles.episodeTitleEditor}>
              <span className={styles.episodeTitleLabel}>Titel (DE)</span>
              <textarea
                className={styles.episodeTitleInput}
                rows={2}
                value={group.title ?? ''}
                placeholder={`Episode ${group.episodeNumber}`}
                aria-label={`Deutscher Titel fuer Episode ${group.episodeNumber}`}
                onChange={(event) => onSetEpisodeTitle(group.episodeNumber, event.target.value)}
              />
            </label>
            <div className={styles.episodeGroupBadges}>
              {group.existingEpisodeId ? <span className={styles.existingBadge}>lokal vorhanden</span> : null}
              {fillerLabel(group.fillerType) ? (
                <span
                  className={`${styles.fillerBadge} ${styles[`filler_${group.fillerType ?? ''}`] ?? ''}`}
                  title={group.fillerNote ?? undefined}
                >
                  {fillerLabel(group.fillerType)}
                </span>
              ) : null}
            </div>
            {group.coveredEpisodes.length > 0 ? (
              <div className={styles.coveredEpisodeList}>
                {group.coveredEpisodes.map((coveredEpisode) => (
                  <div key={coveredEpisode.episodeNumber} className={styles.coveredEpisodeItem}>
                    <label className={styles.coveredEpisodeEditor}>
                      <span className={styles.coveredEpisodeNumber}>#{coveredEpisode.episodeNumber}</span>
                      <textarea
                        className={`${styles.episodeTitleInput} ${styles.coveredEpisodeInput}`}
                        rows={2}
                        value={coveredEpisode.title ?? ''}
                        placeholder={`Episode ${coveredEpisode.episodeNumber}`}
                        aria-label={`Deutscher Titel fuer Episode ${coveredEpisode.episodeNumber}`}
                        onChange={(event) => onSetEpisodeTitle(coveredEpisode.episodeNumber, event.target.value)}
                      />
                    </label>
                    {fillerLabel(coveredEpisode.fillerType) ? (
                      <span className={`${styles.fillerBadge} ${styles[`filler_${coveredEpisode.fillerType ?? ''}`] ?? ''}`}>
                        {fillerLabel(coveredEpisode.fillerType)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {hasActionable ? (
          <div className={styles.episodeGroupActions}>
            <button className={styles.microButton} type="button" onClick={() => onConfirmEpisode(group.episodeNumber)}>
              Alle bestaetigen
            </button>
            <button className={styles.microButton} type="button" onClick={() => onSkipEpisode(group.episodeNumber)}>
              Alle ueberspringen
            </button>
          </div>
        ) : null}
      </div>
      <div className={styles.mappingList}>
        {group.rows.map((row) => (
          <EpisodeImportMappingRowCard
            key={row.media_item_id}
            episodeNumber={group.episodeNumber}
            row={row}
            onSetTargets={onSetTargets}
            onSetRelease={onSetRelease}
            onSetSelectedFansubGroups={onSetSelectedFansubGroups}
            onAddSelectedFansubGroup={onAddSelectedFansubGroup}
            onRemoveSelectedFansubGroup={onRemoveSelectedFansubGroup}
            onApplyFansubGroupToEpisode={onApplyFansubGroupToEpisode}
            onApplyFansubGroupFromEpisode={onApplyFansubGroupFromEpisode}
            onSkip={onSkip}
            onApplyRow={onApplyRow}
            isApplyingRow={applyingRowId === row.media_item_id}
          />
        ))}
      </div>
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
