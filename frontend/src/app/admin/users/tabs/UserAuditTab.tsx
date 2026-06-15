'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import { ApiError, getAdminUserAudit } from '@/lib/api'
import type { AdminAuditEntry, AdminUserAuditResponse } from '@/types/admin-users'

interface Props {
  userId: number
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

function outcomeVariant(outcome: string): 'success' | 'danger' | 'neutral' {
  switch (outcome.toLowerCase()) {
    case 'allowed':
    case 'success':
    case 'granted':
      return 'success'
    case 'denied':
    case 'forbidden':
    case 'error':
      return 'danger'
    default:
      return 'neutral'
  }
}

function outcomeLabel(outcome: string): string {
  switch (outcome.toLowerCase()) {
    case 'allowed':
    case 'success':
    case 'granted':
      return 'Erlaubt'
    case 'denied':
    case 'forbidden':
    case 'error':
      return 'Verweigert'
    default:
      return outcome
  }
}

function AuditTable({ entries }: { entries: AdminAuditEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState title="Keine Audit-Einträge vorhanden." description="" />
  }

  return (
    <Table variant="compact">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Zeitstempel</TableHeaderCell>
          <TableHeaderCell>Ereignistyp</TableHeaderCell>
          <TableHeaderCell>Aktion</TableHeaderCell>
          <TableHeaderCell>Ziel</TableHeaderCell>
          <TableHeaderCell>Ergebnis</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.event_id}>
            <TableCell style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
              {formatDateTime(entry.occurred_at)}
            </TableCell>
            <TableCell>
              <Badge variant="info">{entry.event_type}</Badge>
            </TableCell>
            <TableCell style={{ fontSize: '0.9rem' }}>{entry.action}</TableCell>
            <TableCell style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {entry.target_type}
              {entry.target_id != null ? ` #${entry.target_id}` : ''}
            </TableCell>
            <TableCell>
              <Badge variant={outcomeVariant(entry.outcome)}>
                {outcomeLabel(entry.outcome)}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function UserAuditTab({ userId }: Props) {
  const [data, setData] = useState<AdminUserAuditResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await getAdminUserAudit(userId)
      setData(resp)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Daten konnten nicht geladen werden. Erneut versuchen.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (isLoading) return <LoadingState title="Wird geladen …" description="" />
  if (error) {
    return (
      <ErrorState
        title="Fehler beim Laden"
        description={error}
      />
    )
  }
  if (!data) return <EmptyState title="Keine Audit-Einträge vorhanden." description="" />

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <SectionHeader
        title="Aktivitätsprotokoll"
        description="Alle aufgezeichneten Zugriffs- und Änderungsereignisse dieses Benutzers."
        actions={<Badge variant="neutral">{data.entries.length}</Badge>}
      />
      <AuditTable entries={data.entries} />
    </div>
  )
}
