'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import { ApiError, getAdminUserGlobalRoles } from '@/lib/api'
import type { AdminUserGlobalRolesResponse } from '@/types/admin-users'

interface Props {
  userId: number
  displayName?: string
}

// Leserliche Rollen-Labels
function roleLabel(role: string): string {
  switch (role) {
    case 'platform_admin':
      return 'Plattform-Admin'
    case 'content_admin':
      return 'Content-Admin'
    case 'user':
      return 'Benutzer'
    default:
      return role
  }
}

// ---------------------------------------------------------------------------
// Aktive-Rollen-Tabelle (schreibgeschützt — Quelle ist der Identity Provider)
// ---------------------------------------------------------------------------

interface RolesTableProps {
  roles: string[]
}

function RolesTable({ roles }: RolesTableProps) {
  if (roles.length === 0) {
    return (
      <EmptyState
        variant="inline"
        title="Keine globalen Rollen"
        description="Aus Keycloak synchronisiert, hier nur lesbar."
      />
    )
  }

  return (
    <>
      <p
        style={{ margin: '0 0 var(--space-2)', color: 'var(--text-soft)', fontSize: '0.85rem' }}
        title="Diese Rollen werden automatisch aus dem Identity Provider (Keycloak) synchronisiert und sind hier nur lesbar."
      >
        Aktive Rollen — automatisch aus Keycloak synchronisiert, nur lesbar.
      </p>
      <Table variant="default">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Rolle</TableHeaderCell>
            <TableHeaderCell>Quelle</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role}>
              <TableCell>
                <Badge variant="info">{roleLabel(role)}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="muted">aus IdP</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

export function UserGlobalRolesTab({ userId }: Props) {
  const [data, setData] = useState<AdminUserGlobalRolesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await getAdminUserGlobalRoles(userId)
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
    return <ErrorState title="Fehler beim Laden" description={error} />
  }
  if (!data) return <EmptyState title="Keine Daten vorhanden." description="" />

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <RolesTable roles={data.roles} />
    </div>
  )
}
