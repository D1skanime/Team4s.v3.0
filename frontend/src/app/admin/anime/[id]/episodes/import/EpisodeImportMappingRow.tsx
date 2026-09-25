'use client'

import { Button, FormField, Input } from '@/components/ui'
import { jellyfinSourceKey } from '@/lib/jellyfinSourceIdentity'
import type { EpisodeImportMappingRow, EpisodeImportSelectedFansubGroup } from '@/types/episodeImport'

import { EpisodeImportMappingRowGroupField } from './EpisodeImportMappingRowGroupField'
import styles from './page.module.css'

const EMPTY_SELECTED_FANSUB_GROUPS: EpisodeImportSelectedFansubGroup[] = []

export function EpisodeImportMappingColumnHeader() {
  return (
    <div className={styles.mappingColumnHeader} role="row">
      <span role="columnheader">Dateiname</span>
      <span role="columnheader">Gruppe</span>
      <span role="columnheader">Episode</span>
      <span role="columnheader">Version</span>
      <span role="columnheader">Aktionen</span>
    </div>
  )
}

interface EpisodeImportMappingRowCardProps {
  episodeNumber: number
  row: EpisodeImportMappingRow
  onSetTargets: (sourceKey: string, rawTargets: string) => void
  onSetRelease: (sourceKey: string, meta: { fansubGroupName?: string; releaseVersion?: string }) => void
  onSetSelectedFansubGroups: (sourceKey: string, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  onAddSelectedFansubGroup: (sourceKey: string, fansubGroup: EpisodeImportSelectedFansubGroup) => void
  onRemoveSelectedFansubGroup: (sourceKey: string, fansubGroup: EpisodeImportSelectedFansubGroup) => void
  onApplyFansubGroupToEpisode: (episodeNumber: number, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  onApplyFansubGroupFromEpisode: (episodeNumber: number, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  onConfirm?: (sourceKey: string) => void
  onSkip: (sourceKey: string) => void
  onApplyRow?: (sourceKey: string) => void
  isApplyingRow?: boolean
  hideFileInfo?: boolean
}

/**
 * Three-region mapping row layout (GAP-09, 167-UAT.md): info (file/path/hints)
 * | fields (group/episode/version) | actions (status/skip/apply). Stacks
 * vertically on narrow viewports via .mappingRow's <=980px breakpoint
 * (page.module.css). The group field itself lives in
 * EpisodeImportMappingRowGroupField.tsx to keep this file small.
 */
export function EpisodeImportMappingRowCard({
  episodeNumber,
  row,
  onSetTargets,
  onSetRelease,
  onSetSelectedFansubGroups,
  onAddSelectedFansubGroup,
  onRemoveSelectedFansubGroup,
  onApplyFansubGroupToEpisode,
  onApplyFansubGroupFromEpisode,
  onConfirm,
  onSkip,
  onApplyRow,
  isApplyingRow,
  hideFileInfo,
}: EpisodeImportMappingRowCardProps) {
  const sourceKey = jellyfinSourceKey(row)
  const label = row.file_name || row.media_item_id
  const isSkipped = row.status === 'skipped'
  const selectedFansubGroups = row.fansub_groups ?? EMPTY_SELECTED_FANSUB_GROUPS

  return (
    <div className={`${styles.mappingRow} ${styles[row.status]}`}>
      <div className={styles.mappingRowInfo}>
        {!hideFileInfo ? (
          <>
            <strong className={styles.fileName}>{label}</strong>
          </>
        ) : null}
        {(row.target_episode_numbers ?? []).length > 1 ? (
          <span className={styles.multiEpisodeHint}>Deckt {row.target_episode_numbers.length} Episoden ab</span>
        ) : null}
        {row.suggestion_reason ? (
          <span className={styles.multiEpisodeHint}>{row.suggestion_reason}</span>
        ) : null}
      </div>
      <div className={styles.mappingRowFields}>
        <EpisodeImportMappingRowGroupField
          row={row}
          sourceKey={sourceKey}
          label={label}
          episodeNumber={episodeNumber}
          isSkipped={isSkipped}
          selectedFansubGroups={selectedFansubGroups}
          onSetSelectedFansubGroups={onSetSelectedFansubGroups}
          onAddSelectedFansubGroup={onAddSelectedFansubGroup}
          onRemoveSelectedFansubGroup={onRemoveSelectedFansubGroup}
          onApplyFansubGroupToEpisode={onApplyFansubGroupToEpisode}
          onApplyFansubGroupFromEpisode={onApplyFansubGroupFromEpisode}
        />
        <FormField label="Episode">
          <Input
            className={styles.targetInput}
            defaultValue={(row.target_episode_numbers ?? []).join(',')}
            disabled={isSkipped}
            onBlur={(event) => onSetTargets(sourceKey, event.target.value)}
            aria-label={`Ziel-Episoden für ${label}`}
            placeholder="z.B. 1"
          />
        </FormField>
        <FormField
          label="Version"
          hint={row.release_version_source === 'detected' ? 'Aus Dateiname übernommen' : undefined}
        >
          <Input
            value={row.release_version ?? ''}
            disabled={isSkipped}
            placeholder="z.B. v2"
            aria-label={`Release-Version für ${label}`}
            onChange={(event) => onSetRelease(sourceKey, { releaseVersion: event.target.value })}
          />
        </FormField>
      </div>
      <div className={styles.mappingRowActions}>
        {statusLabel(row.status) ? (
          <span className={`${styles.statusPill} ${styles[row.status]}`}>{statusLabel(row.status)}</span>
        ) : null}
        {(row.status === 'suggested' || row.status === 'conflict') ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm?.(sourceKey)}
          >
            Bestätigen
          </Button>
        ) : null}
        <Button
          variant={isSkipped ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onSkip(sourceKey)}
        >
          {isSkipped ? 'Reaktivieren' : 'Überspringen'}
        </Button>
        {row.status === 'confirmed' && onApplyRow ? (
          <Button
            variant="primary"
            size="sm"
            disabled={isApplyingRow}
            onClick={() => onApplyRow(sourceKey)}
          >
            {isApplyingRow ? 'Wird angewendet...' : 'Übernehmen'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function statusLabel(status: string): string {
  switch (status) {
    case 'suggested':
      return ''
    case 'confirmed':
      return 'Bestätigt'
    case 'conflict':
      return 'Konflikt'
    case 'skipped':
      return 'Übersprungen'
    default:
      return status
  }
}
