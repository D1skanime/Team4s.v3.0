'use client'

import { Plus, X } from 'lucide-react'

import { Badge, Button } from '@/components/ui'
import type { AdminThemeSegment } from '@/types/admin'
import { findAssignedEpisodeNumber, formatAssignmentChipLabel } from './SegmenteTab.helpers'

interface SegmentAssignmentsRowProps {
  segment: AdminThemeSegment
  currentReleaseVersionId: number | null
  currentEpisodeNumber: number | null
  onAssignCurrent: () => void
  onUnassign: (releaseVersionId: number) => void
  isBusy: boolean
}

/**
 * Zuweisungs-Zeile fuer JEDES Segment (nicht nur bereits geteilte, Gap 2): zeigt pro
 * zugewiesener Folge einen Chip (inkl. "verschoben"-Markierung bei Zeit-Override) mit
 * Entfernen-Aktion, plus -- falls die aktuell geoeffnete Folge noch nicht zugewiesen ist --
 * einen "Diese Folge zuweisen"-Button. Ausschliesslich @/components/ui-Primitives.
 */
export function SegmentAssignmentsRow({
  segment,
  currentReleaseVersionId,
  currentEpisodeNumber,
  onAssignCurrent,
  onUnassign,
  isBusy,
}: SegmentAssignmentsRowProps) {
  const assignedReleaseVersionIds = segment.assigned_release_version_ids ?? []
  const isCurrentAssigned =
    currentReleaseVersionId != null && assignedReleaseVersionIds.includes(currentReleaseVersionId)
  const canRemove = assignedReleaseVersionIds.length > 1

  return (
    // maxWidth/boxSizing/minWidth:0 verhindern horizontalen Overflow auf schmalen Breiten --
    // die Zeile kann in einer Table-Zelle oder im Drawer eingebettet sein, deren verfuegbare
    // Breite kleiner ist als die Summe der ungebremsten Chip-Inhaltsbreiten (mobile-first).
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', minWidth: 0, maxWidth: '100%' }}>
        {assignedReleaseVersionIds.map((assignedReleaseVersionId) => {
          const assignedEpisodeNumber =
            findAssignedEpisodeNumber(segment, assignedReleaseVersionId) ?? String(assignedReleaseVersionId)
          const isCurrent = assignedReleaseVersionId === currentReleaseVersionId
          const chipVariant = isCurrent ? 'info' : segment.has_episode_override ? 'warning' : 'neutral'
          const chipLabel = formatAssignmentChipLabel(assignedEpisodeNumber, segment.has_episode_override ?? false)
          return (
            <span
              key={assignedReleaseVersionId}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 2, maxWidth: '100%', minWidth: 0 }}
            >
              <Badge variant={chipVariant}>{chipLabel}</Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                leftIcon={<X size={12} />}
                aria-label={`Zuweisung für Folge ${assignedEpisodeNumber} entfernen`}
                onClick={() => onUnassign(assignedReleaseVersionId)}
                disabled={isBusy || !canRemove}
              />
            </span>
          )
        })}
      </div>
      {currentReleaseVersionId != null && !isCurrentAssigned ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Plus size={12} />}
          disabled={isBusy}
          onClick={onAssignCurrent}
          style={{ maxWidth: '100%', whiteSpace: 'normal', textAlign: 'center' }}
        >
          {`Diese Folge (${currentEpisodeNumber ?? '?'}) zuweisen`}
        </Button>
      ) : null}
    </div>
  )
}
