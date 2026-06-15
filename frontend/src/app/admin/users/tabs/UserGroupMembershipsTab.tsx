'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  Badge,
  Button,
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
import { ApiError, getAdminUserGroupMemberships } from '@/lib/api'
import type {
  AdminGroupMembershipSummary,
  AdminUserGroupMembershipsResponse,
} from '@/types/admin-users'

interface Props {
  userId: number
}

function memberStatusVariant(status: string): 'success' | 'warning' | 'neutral' | 'muted' {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'inactive':
    case 'removed':
      return 'muted'
    default:
      return 'neutral'
  }
}

function memberStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Aktiv'
    case 'pending':
      return 'Ausstehend'
    case 'inactive':
      return 'Inaktiv'
    case 'removed':
      return 'Entfernt'
    default:
      return status
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function MembershipsTable({ memberships }: { memberships: AdminGroupMembershipSummary[] }) {
  if (memberships.length === 0) {
    return <EmptyState title="Keine Gruppenmitgliedschaften vorhanden." description="" />
  }

  return (
    <Table variant="default">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Gruppe</TableHeaderCell>
          <TableHeaderCell>Rollen</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Beigetreten</TableHeaderCell>
          <TableHeaderCell>Aktion</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {memberships.map((m) => (
          <TableRow key={m.fansub_group_id}>
            <TableCell style={{ fontWeight: 600 }}>{m.fansub_group_name}</TableCell>
            <TableCell>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {m.roles.length === 0 ? (
                  <Badge variant="muted">–</Badge>
                ) : (
                  m.roles.map((r) => (
                    <Badge key={r} variant="info">{r}</Badge>
                  ))
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={memberStatusVariant(m.member_status)}>
                {memberStatusLabel(m.member_status)}
              </Badge>
            </TableCell>
            <TableCell>{formatDate(m.joined_at)}</TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  window.open(`/admin/fansubs/${m.fansub_group_id}/edit`, '_blank')
                }
              >
                In Gruppe öffnen
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function UserGroupMembershipsTab({ userId }: Props) {
  const [data, setData] = useState<AdminUserGroupMembershipsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await getAdminUserGroupMemberships(userId)
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
  if (!data) return <EmptyState title="Keine Einträge vorhanden." description="" />

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <SectionHeader
        title="Gruppenmitgliedschaften"
        description="Übersicht aller Gruppen, denen dieser Benutzer angehört (read-only)."
      />
      <MembershipsTable memberships={data.memberships} />
    </div>
  )
}
