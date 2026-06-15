'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  Badge,
  Button,
  Card,
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
import { ApiError, getAdminUserGroupRights } from '@/lib/api'
import type {
  AdminGroupRightsSummary,
  AdminUserGroupRightsResponse,
} from '@/types/admin-users'

interface Props {
  userId: number
}

function RightsTable({ rights }: { rights: AdminGroupRightsSummary[] }) {
  if (rights.length === 0) {
    return <EmptyState title="Keine scoped Gruppenrechte vorhanden." description="" />
  }

  return (
    <Table variant="default">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Gruppe</TableHeaderCell>
          <TableHeaderCell>Rollen</TableHeaderCell>
          <TableHeaderCell>Inhalte bearbeiten</TableHeaderCell>
          <TableHeaderCell>Mitglieder einsehen</TableHeaderCell>
          <TableHeaderCell>Aktion</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rights.map((r) => (
          <TableRow key={r.fansub_group_id}>
            <TableCell style={{ fontWeight: 600 }}>{r.fansub_group_name}</TableCell>
            <TableCell>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {r.granted_roles.length === 0 ? (
                  <Badge variant="muted">–</Badge>
                ) : (
                  r.granted_roles.map((role) => (
                    <Badge key={role} variant="info">{role}</Badge>
                  ))
                )}
              </div>
            </TableCell>
            <TableCell>
              {r.can_edit_content ? (
                <Badge variant="success">Ja</Badge>
              ) : (
                <Badge variant="muted">Nein</Badge>
              )}
            </TableCell>
            <TableCell>
              {r.can_view_members ? (
                <Badge variant="success">Ja</Badge>
              ) : (
                <Badge variant="muted">Nein</Badge>
              )}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  window.open(`/admin/fansubs/${r.fansub_group_id}/edit`, '_blank')
                }
              >
                Gruppe bearbeiten
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function UserGroupRightsTab({ userId }: Props) {
  const [data, setData] = useState<AdminUserGroupRightsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await getAdminUserGroupRights(userId)
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
      <SectionHeader title="Gruppenrechte (read-only)" />
      <Card variant="section" style={{ marginBottom: 'var(--space-4)' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Gruppenrechte können in der jeweiligen Gruppenansicht bearbeitet werden.
        </p>
      </Card>
      <RightsTable rights={data.group_rights} />
    </div>
  )
}
