'use client'

import { useEffect, useState } from 'react'

import { EmptyState, ErrorState, LoadingState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui'
import { ApiError, listOverrideHistory as fetchOverrideHistory } from '@/lib/api'
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
  const [entries, setEntries] = useState<CapabilityOverrideAuditItem[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetchOverrideHistory(fansubGroupId, appUserId, 10, 0)
      .then((result) => {
        if (cancelled) return
        // Eine gruppen-weite Historie-Seite kann auch Einträge anderer Capabilities enthalten --
        // dieses Panel ist strikt auf EINE Capability skopiert (D-13b).
        setEntries(result.filter((entry) => entry.action_code === actionCode))
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Historie konnte nicht geladen werden.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fansubGroupId, appUserId, actionCode])

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
