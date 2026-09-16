'use client'

import { useCallback } from 'react'

import { EmptyState, ErrorState, LoadingState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui'
import { ApiError, listOverrideHistory as fetchOverrideHistory } from '@/lib/api'
import { useCancellableSlugState } from '@/hooks/useCancellableSlugState'
import type { CapabilityOverrideAuditItem } from '@/types/admin-capability'

/**
 * Inline per-capability override history (D-13b, CAP-08 companion): a compact list scoped to
 * ONE capability in ONE group's context, rendered directly in the row-expansion area next to
 * the guided grant/revoke actions. This supplements, never replaces, the later central
 * "Änderungen" workspace (D-13b) -- fetches a small page only.
 */

const REASON_CATEGORY_LABEL: Record<string, string> = {
  task_delegation: 'Aufgabenübertragung',
  security_measure: 'Sicherheitsmaßnahme',
  role_gap: 'Rollen-Lücke',
}

function reasonLabel(item: CapabilityOverrideAuditItem): string {
  if (!item.reason) return '–'
  if (item.reason.category === 'other') {
    return item.reason.text || 'Sonstiger Grund'
  }
  return REASON_CATEGORY_LABEL[item.reason.category] ?? item.reason.category
}

function effectLabel(state: CapabilityOverrideAuditItem['before' | 'after']): string {
  if (!state) return '–'
  return state.effect === 'allow' ? 'Erlaubt' : 'Entzogen'
}

function formatOccurredAt(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('de-DE')
}

export interface CapabilityHistoryPanelProps {
  fansubGroupId: number
  appUserId: number
  actionCode: string
}

export function CapabilityHistoryPanel({ fansubGroupId, appUserId, actionCode }: CapabilityHistoryPanelProps) {
  // requestKey enthaelt actionCode, OBWOHL der Fetcher selbst ihn nicht verwendet: das erhaelt
  // die heutige Paritaet, dass eine reine actionCode-Aenderung (gleiche Gruppe/Nutzer) ebenfalls
  // einen frischen Request ausloest (siehe Interfaces-Block, Pattern A).
  const requestKey = `${fansubGroupId}:${appUserId}:${actionCode}`
  const fetcher = useCallback(() => fetchOverrideHistory(fansubGroupId, appUserId, 10, 0), [fansubGroupId, appUserId])
  const { state } = useCancellableSlugState<CapabilityOverrideAuditItem[]>({ requestKey, enabled: true, fetcher })

  const isLoading = state.key !== requestKey || state.status === 'loading' || state.status === 'idle'
  const error = state.status === 'error'
    ? (state.error instanceof ApiError ? state.error.message : 'Historie konnte nicht geladen werden.')
    : null
  // Eine gruppen-weite Historie-Seite kann auch Einträge anderer Capabilities enthalten --
  // dieses Panel ist strikt auf EINE Capability skopiert (D-13b). Die null/[]-Unterscheidung
  // bleibt erhalten, damit die drei Render-Zweige unten unveraendert funktionieren.
  const entries = state.status === 'success'
    ? state.data!.filter((entry) => entry.action_code === actionCode)
    : null

  if (isLoading) {
    return <LoadingState title="Historie wird geladen …" description="" />
  }
  if (error) {
    return <ErrorState title="Fehler beim Laden der Historie" description={error} />
  }
  if (!entries || entries.length === 0) {
    return <EmptyState variant="compact" title="Keine Änderungen für dieses Recht." description="" />
  }

  return (
    <Table variant="compact">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Vorher</TableHeaderCell>
          <TableHeaderCell>Nachher</TableHeaderCell>
          <TableHeaderCell>Grund</TableHeaderCell>
          <TableHeaderCell>Zeitpunkt</TableHeaderCell>
          <TableHeaderCell>Akteur</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{effectLabel(entry.before)}</TableCell>
            <TableCell>{effectLabel(entry.after)}</TableCell>
            <TableCell>{reasonLabel(entry)}</TableCell>
            <TableCell>{formatOccurredAt(entry.occurred_at)}</TableCell>
            <TableCell>{entry.actor_user_id}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
