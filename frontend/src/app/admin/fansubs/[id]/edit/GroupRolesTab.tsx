'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  Badge,
  Button,
  Card,
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
import { ApiError, listFansubAppMembers } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import { labelForRole } from '@/lib/roleCatalog'
import { useRoleCatalog } from '@/providers/RoleCatalogProvider'
import type { FansubAppMember } from '@/types/fansub'

/**
 * D-06 (Gruppenansicht "Rollen"): Wer hält welche Rolle IN DIESER GRUPPE. Kein neuer
 * Backend-Endpunkt — reines Client-seitiges Umgruppieren der bereits vorhandenen,
 * bereits autorisierten `listFansubAppMembers(fansubId)`-Antwort (Plan 138-16, D-06/D-09/D-34).
 * Plan 138-01s `listRoleHolders` bleibt die gruppenübergreifende, override-bewusste Ansicht
 * unter `/admin/roles` — diese Tab hier ist bewusst gruppen-lokal und einfacher.
 */

interface GroupRolesTabProps {
  fansubId: number
}

interface RoleHolderRow {
  key: string
  roleCode: string
  appUserId: number
  displayName: string
  status: FansubAppMember['status']
}

function displayNameForMember(member: FansubAppMember): string {
  return (
    member.member?.fansub_name?.trim()
    || member.app_user?.display_name?.trim()
    || member.app_user?.preferred_username?.trim()
    || member.app_user?.email?.trim()
    || `Mitglied #${member.app_user_id}`
  )
}

function statusLabel(status: FansubAppMember['status']): string {
  return status === 'active' ? 'Aktiv' : 'Deaktiviert'
}

function groupMembersByRole(members: FansubAppMember[]): RoleHolderRow[] {
  const rows: RoleHolderRow[] = []
  for (const member of members) {
    for (const roleCode of member.roles) {
      rows.push({
        key: `${roleCode}-${member.app_user_id}`,
        roleCode,
        appUserId: member.app_user_id,
        displayName: displayNameForMember(member),
        status: member.status,
      })
    }
  }
  return rows.sort((a, b) => a.roleCode.localeCompare(b.roleCode) || a.displayName.localeCompare(b.displayName))
}

export function GroupRolesTab({ fansubId }: GroupRolesTabProps) {
  const router = useRouter()
  const { hasAccessToken, isClientInitialized } = useAuthSession()
  const { roles } = useRoleCatalog('fansub_group')
  const [members, setMembers] = useState<FansubAppMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!isClientInitialized) return () => { cancelled = true }
    if (!hasAccessToken || fansubId <= 0) {
      setMembers([])
      setIsLoading(false)
      return () => { cancelled = true }
    }
    setIsLoading(true)
    listFansubAppMembers(fansubId)
      .then((response) => {
        if (cancelled) return
        setMembers(response.data)
        setLoadError(null)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(error instanceof ApiError ? error.message : 'Rollen konnten nicht geladen werden.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [fansubId, hasAccessToken, isClientInitialized])

  const holderRows = useMemo(() => groupMembersByRole(members), [members])

  function handleNavigateUser(appUserId: number) {
    router.push(`/admin/users/${appUserId}`)
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Rollen werden geladen"
        description="Team4s lädt die Rolleninhaber dieser Fansubgruppe."
      />
    )
  }

  if (loadError) {
    return <ErrorState title="Rollen konnten nicht geladen werden" description={loadError} />
  }

  if (holderRows.length === 0) {
    return (
      <EmptyState
        title="Keine Rolleninhaber in dieser Gruppe"
        description="Sobald Mitglieder Rollen zugewiesen bekommen, erscheinen sie hier nach Rolle gruppiert."
      />
    )
  }

  return (
    <Card variant="section">
      <Table variant="default" caption="Rollen dieser Gruppe">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Rolle</TableHeaderCell>
            <TableHeaderCell>Benutzer</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Rechte-Abweichungen</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {holderRows.map((row) => (
            <TableRow key={row.key}>
              <TableCell>{labelForRole(roles, row.roleCode)}</TableCell>
              <TableCell>
                <Button variant="ghost" onClick={() => handleNavigateUser(row.appUserId)}>
                  {row.displayName}
                </Button>
              </TableCell>
              <TableCell>
                <Badge variant={row.status === 'active' ? 'success' : 'danger'}>
                  {statusLabel(row.status)}
                </Badge>
              </TableCell>
              {/* Kein Override-Signal auf FansubAppMember vorhanden (nur Plan 138-01s
                  cross-group RoleHolderEntry.has_overrides kennt das) — ehrlich "–" statt
                  eines erfundenen Werts (Interfaces-Block, honest-fallback). */}
              <TableCell>–</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
