'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'

import { Badge, Button, useConfirmDialog } from '@/components/ui'
import { reassignFansubAlias } from '@/lib/api'
import type { EpisodeImportMappingRow, EpisodeImportSelectedFansubGroup } from '@/types/episodeImport'

import styles from './FansubGroupOriginHint.module.css'

const MATCHED_VIA_LABELS: Record<'alias' | 'name' | 'slug', string> = {
  alias: 'Alias',
  name: 'Name',
  slug: 'Slug',
}

interface FansubGroupOriginHintProps {
  row: EpisodeImportMappingRow
  selectedFansubGroups: EpisodeImportSelectedFansubGroup[]
  onAddSelectedFansubGroup: (fansubGroup: EpisodeImportSelectedFansubGroup) => void
  sourceKey: string
  label: string
}

/**
 * Renders the origin hint / suggestion chips / conflict warning for a single import mapping
 * row's fansub group selection (167-UI-SPEC.md Screen 1, Zustände A-D). Self-contained so
 * neither EpisodeImportMappingRow.tsx nor page.tsx grow with this phase's UI logic.
 */
export function FansubGroupOriginHint({
  row,
  selectedFansubGroups,
  onAddSelectedFansubGroup,
  sourceKey,
  label,
}: FansubGroupOriginHintProps) {
  const [reassigned, setReassigned] = useState(false)
  const { confirm, confirmDialog } = useConfirmDialog()

  const origin = row.fansub_group_match_origin ?? null
  const suggestions = row.fansub_group_suggestions ?? []

  if (!origin && suggestions.length === 0) {
    return null
  }

  const currentGroup = selectedFansubGroups[0] ?? null
  const currentGroupID = typeof currentGroup?.id === 'number' && Number.isFinite(currentGroup.id) ? currentGroup.id : null
  const currentGroupName =
    currentGroup?.name ?? currentGroup?.slug ?? (currentGroupID != null ? `#${currentGroupID}` : '')

  const hasConflict = Boolean(origin) && currentGroupID !== null && currentGroupID !== origin!.group_id

  async function handleReassign() {
    if (!origin || !origin.alias_id || currentGroupID == null) {
      return
    }

    const confirmed = await confirm({
      title: 'Alias umhängen?',
      description: `„${origin.raw}" gehört aktuell zu ${origin.group_name}. Nach dem Umhängen ist der Alias nur noch bei ${currentGroupName} hinterlegt. Bereits importierte Releases bleiben unverändert.`,
      confirmLabel: 'Trotzdem umhängen',
      tone: 'danger',
    })
    if (!confirmed) {
      return
    }

    await reassignFansubAlias(origin.group_id, origin.alias_id, { target_fansub_group_id: currentGroupID })
    setReassigned(true)
    if (currentGroup) {
      onAddSelectedFansubGroup(currentGroup)
    }
  }

  if (reassigned) {
    return (
      <span className={styles.originHint} aria-label={`Alias-Herkunft für ${label}`} data-source-key={sourceKey}>
        Umgehängt.
      </span>
    )
  }

  if (origin && !hasConflict) {
    const matchedViaLabel = MATCHED_VIA_LABELS[origin.matched_via]
    return (
      <span className={styles.originHint} aria-label={`Alias-Herkunft für ${label}`} data-source-key={sourceKey}>
        <Sparkles size={12} aria-hidden="true" />
        {`Erkannt aus Dateiname: ${origin.raw} → ${origin.group_name} (${matchedViaLabel})`}
      </span>
    )
  }

  if (origin && hasConflict) {
    return (
      <div className={styles.conflictRow} data-source-key={sourceKey}>
        <Badge variant="warning">{`Kürzel „${origin.raw}" gehört bereits zu ${origin.group_name}.`}</Badge>
        {origin.matched_via === 'alias' && origin.alias_id ? (
          <Button variant="danger" size="sm" onClick={handleReassign}>
            {`Trotzdem zu ${currentGroupName} umhängen`}
          </Button>
        ) : null}
        {confirmDialog}
      </div>
    )
  }

  return (
    <div className={styles.suggestionRow} aria-label={`Vorschläge für ${label}`} data-source-key={sourceKey}>
      {suggestions.slice(0, 3).map((suggestion) => (
        <Button
          key={suggestion.id}
          variant="subtle"
          size="sm"
          onClick={() =>
            onAddSelectedFansubGroup({ id: suggestion.id, name: suggestion.name, slug: suggestion.slug })
          }
        >
          {`Meinten Sie: ${suggestion.name}?`}
        </Button>
      ))}
    </div>
  )
}
