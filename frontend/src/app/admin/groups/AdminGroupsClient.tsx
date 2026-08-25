'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
} from '@/components/ui'
import { ApiError, getFansubList, listChanges, listClaims, listFansubAppMembers } from '@/lib/api'
import { labelForRole } from '@/lib/roleCatalog'
import { useRoleCatalog } from '@/providers/RoleCatalogProvider'
import type { AdminChangeEntry, AdminClaimListRow } from '@/types/admin-users'
import type { FansubAppMember, FansubGroup } from '@/types/fansub'

type GroupTabId = 'users' | 'roles' | 'claims' | 'changes'

const TAB_IDS: GroupTabId[] = ['users', 'roles', 'claims', 'changes']

function parseTab(value: string | null): GroupTabId {
  return TAB_IDS.includes(value as GroupTabId) ? (value as GroupTabId) : 'users'
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

function displayNameForMember(member: FansubAppMember): string {
  return (
    member.member?.fansub_name?.trim()
    || member.app_user?.display_name?.trim()
    || member.app_user?.preferred_username?.trim()
    || member.app_user?.email?.trim()
    || `Benutzer #${member.app_user_id}`
  )
}

function formatRelativeDate(isoDate: string | null): string {
  if (!isoDate) return '�'
  const diff = Math.max(0, Date.now() - new Date(isoDate).getTime())
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Heute'
  if (days === 1) return 'Gestern'
  if (days < 30) return `vor ${days} Tagen`
  if (days < 365) return `vor ${Math.floor(days / 30)} Monat(en)`
  return `vor ${Math.floor(days / 365)} Jahr(en)`
}

function formatChange(entry: AdminChangeEntry): string {
  const actor = entry.actor_display_name?.trim() || 'Jemand'
  const action = entry.action?.trim() || 'hat eine �nderung vorgenommen'
  const target = entry.target_display_name?.trim()
  return target ? `${actor} � ${action} � ${target}` : `${actor} � ${action}`
}

interface GroupMembersSummaryProps {
  fansubGroupId: number
}

function GroupMembersSummary({ fansubGroupId }: GroupMembersSummaryProps) {
  const router = useRouter()
  const { roles } = useRoleCatalog('fansub_group')
  const [members, setMembers] = useState<FansubAppMember[]>([])
  const [claims, setClaims] = useState<AdminClaimListRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    Promise.all([
      listFansubAppMembers(fansubGroupId),
      listClaims({ fansub_group_id: fansubGroupId, limit: 100, offset: 0 }),
    ])
      .then(([membersResponse, claimsResponse]) => {
        if (cancelled) return
        setMembers(membersResponse.data)
        setClaims(claimsResponse.data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(readErrorMessage(err, 'Gruppenmitglieder konnten nicht geladen werden.'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [fansubGroupId])

  const openClaimsByUserId = useMemo(() => {
    const counts = new Map<number, number>()
    for (const claim of claims) {
      counts.set(claim.app_user_id, (counts.get(claim.app_user_id) ?? 0) + 1)
    }
    return counts
  }, [claims])

  if (isLoading) {
    return <LoadingState title="Benutzer werden geladen �" description="" />
  }

  if (error) {
    return <ErrorState title="Benutzer konnten nicht geladen werden" description={error} />
  }

  if (members.length === 0) {
    return <EmptyState title="Keine Benutzer in dieser Gruppe" description="" />
  }

  return (
    <Table variant="default">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Benutzer</TableHeaderCell>
          <TableHeaderCell>Rollen</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Rechte-Abweichungen</TableHeaderCell>
          <TableHeaderCell>Offene Claims</TableHeaderCell>
          <TableHeaderCell>Letzte Aktivit�t</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {members.map((member) => {
          const openClaims = openClaimsByUserId.get(member.app_user_id) ?? 0
          const detailHref = `/admin/users/${member.app_user_id}?tab=roles-rights&group=${fansubGroupId}`
          return (
            <TableRow key={member.id}>
              <TableCell>
                <Button variant="ghost" onClick={() => router.push(detailHref)}>
                  {displayNameForMember(member)}
                </Button>
              </TableCell>
              <TableCell>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                  {member.roles.length > 0
                    ? member.roles.map((roleCode) => (
                      <Button
                        key={roleCode}
                        variant="ghost"
                        size="sm"
                        href={`/admin/roles?role=${encodeURIComponent(roleCode)}&tab=caps`}
                      >
                        {labelForRole(roles, roleCode)}
                      </Button>
                    ))
                    : <Badge variant="muted">Keine Rolle</Badge>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={member.status === 'active' ? 'success' : 'danger'}>
                  {member.status === 'active' ? 'Aktiv' : 'Deaktiviert'}
                </Badge>
              </TableCell>
              <TableCell>�</TableCell>
              <TableCell>{openClaims > 0 ? `${openClaims} offen` : 'Keine'}</TableCell>
              <TableCell>{formatRelativeDate(member.app_user?.last_login_at ?? null)}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function GroupRolesSummary({ fansubGroupId }: GroupMembersSummaryProps) {
  const router = useRouter()
  const { roles } = useRoleCatalog('fansub_group')
  const [members, setMembers] = useState<FansubAppMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    listFansubAppMembers(fansubGroupId)
      .then((response) => {
        if (!cancelled) {
          setMembers(response.data)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(readErrorMessage(err, 'Rollen konnten nicht geladen werden.'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [fansubGroupId])

  const rows = useMemo(() => {
    return members
      .flatMap((member) => member.roles.map((roleCode) => ({
        key: `${roleCode}-${member.app_user_id}`,
        roleCode,
        appUserId: member.app_user_id,
        displayName: displayNameForMember(member),
      })))
      .sort((left, right) => left.roleCode.localeCompare(right.roleCode) || left.displayName.localeCompare(right.displayName))
  }, [members])

  if (isLoading) {
    return <LoadingState title="Rollen werden geladen �" description="" />
  }

  if (error) {
    return <ErrorState title="Rollen konnten nicht geladen werden" description={error} />
  }

  if (rows.length === 0) {
    return <EmptyState title="Keine Rollen in dieser Gruppe" description="" />
  }

  return (
    <Table variant="default">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Rolle</TableHeaderCell>
          <TableHeaderCell>Benutzer</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell>
              <Button variant="ghost" href={`/admin/roles?role=${encodeURIComponent(row.roleCode)}&tab=caps`}>
                {labelForRole(roles, row.roleCode)}
              </Button>
            </TableCell>
            <TableCell>
              <Button variant="ghost" onClick={() => router.push(`/admin/users/${row.appUserId}?tab=roles-rights&group=${fansubGroupId}`)}>
                {row.displayName}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function GroupClaimsSummary({ fansubGroupId }: GroupMembersSummaryProps) {
  const router = useRouter()
  const [claims, setClaims] = useState<AdminClaimListRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    listClaims({ fansub_group_id: fansubGroupId, limit: 100, offset: 0 })
      .then((response) => {
        if (!cancelled) {
          setClaims(response.data)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(readErrorMessage(err, 'Claims konnten nicht geladen werden.'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [fansubGroupId])

  if (isLoading) {
    return <LoadingState title="Claims werden geladen �" description="" />
  }

  if (error) {
    return <ErrorState title="Claims konnten nicht geladen werden" description={error} />
  }

  if (claims.length === 0) {
    return <EmptyState title="Keine Claims in dieser Gruppe" description="" />
  }

  return (
    <Table variant="default">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Benutzer</TableHeaderCell>
          <TableHeaderCell>Claim</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Workflow</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {claims.map((claim) => (
          <TableRow key={claim.claim_id}>
            <TableCell>
              <Button variant="ghost" onClick={() => router.push(`/admin/users/${claim.app_user_id}`)}>
                {claim.app_user_display_name}
              </Button>
            </TableCell>
            <TableCell>{claim.member_nickname}</TableCell>
            <TableCell>{claim.claim_status}</TableCell>
            <TableCell>
              <Button variant="ghost" href={`/admin/claims?fansub_group_id=${fansubGroupId}`}>
                Claim-Workflow �ffnen
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function GroupChangesSummary({ fansubGroupId }: GroupMembersSummaryProps) {
  const [entries, setEntries] = useState<AdminChangeEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    listChanges({ gruppe: fansubGroupId, limit: 25, offset: 0 })
      .then((response) => {
        if (!cancelled) {
          setEntries(response.data)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(readErrorMessage(err, '�nderungen konnten nicht geladen werden.'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [fansubGroupId])

  if (isLoading) {
    return <LoadingState title="�nderungen werden geladen �" description="" />
  }

  if (error) {
    return <ErrorState title="�nderungen konnten nicht geladen werden" description={error} />
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
      {entries.length === 0 ? (
        <EmptyState title="Keine �nderungen f�r diese Gruppe" description="" />
      ) : entries.map((entry) => (
        <Card key={entry.event_id} variant="flat">
          <p style={{ margin: 0 }}>{formatChange(entry)}</p>
        </Card>
      ))}
      <div>
        <Button variant="secondary" href={`/admin/changes?gruppe=${fansubGroupId}`}>
          �nderungen im Kontext �ffnen
        </Button>
      </div>
    </div>
  )
}

export function AdminGroupsClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [groups, setGroups] = useState<FansubGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState(searchParams.get('q') ?? '')
  const activeTab = parseTab(searchParams.get('tab'))
  const selectedGroupId = Number(searchParams.get('group'))

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  )

  const filteredGroups = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) return groups
    return groups.filter((group) => group.name.toLowerCase().includes(query) || group.slug.toLowerCase().includes(query))
  }, [groups, searchValue])

  const loadGroups = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const perPage = 500
      const statuses: Array<FansubGroup['status']> = ['active', 'inactive', 'dissolved']
      const byId = new Map<number, FansubGroup>()

      for (const status of statuses) {
        let page = 1
        let totalPages = 1
        do {
          const response = await getFansubList({ page, per_page: perPage, status })
          for (const group of response.data) {
            byId.set(group.id, group)
          }
          totalPages = response.meta.total_pages || 1
          page += 1
        } while (page <= totalPages)
      }

      setGroups(Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name, 'de', { sensitivity: 'base' })))
    } catch (err) {
      setError(readErrorMessage(err, 'Gruppen konnten nicht geladen werden.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadGroups()
  }, [loadGroups])

  function updateParams(next: { group?: number | null; tab?: GroupTabId; q?: string }) {
    const params = new URLSearchParams(searchParams.toString())
    if (next.group == null) params.delete('group')
    else params.set('group', String(next.group))
    if (next.tab) params.set('tab', next.tab)
    if (next.q !== undefined) {
      if (next.q.trim()) params.set('q', next.q)
      else params.delete('q')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const tabItems = selectedGroup ? [
    { id: 'users', label: 'Benutzer', content: <GroupMembersSummary fansubGroupId={selectedGroup.id} /> },
    { id: 'roles', label: 'Rollen', content: <GroupRolesSummary fansubGroupId={selectedGroup.id} /> },
    { id: 'claims', label: 'Claims', content: <GroupClaimsSummary fansubGroupId={selectedGroup.id} /> },
    { id: 'changes', label: '�nderungen', content: <GroupChangesSummary fansubGroupId={selectedGroup.id} /> },
  ] : []

  return (
    <div style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-4)' }}>
      <SectionHeader
        title="Gruppen"
        description="Gruppen als Kontext f�r Benutzer, Rollen, Claims und �nderungen."
      />

      {isLoading ? <LoadingState title="Gruppen werden geladen �" description="" /> : null}
      {error ? <ErrorState title="Gruppen konnten nicht geladen werden" description={error} /> : null}

      {!isLoading && !error ? (
        <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'minmax(18rem, 24rem) minmax(0, 1fr)' }}>
          <Card variant="section">
            <SectionHeader title="Gruppenliste" />
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <Input
                type="search"
                placeholder="Gruppe suchen �"
                aria-label="Gruppen suchen"
                value={searchValue}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value
                  setSearchValue(nextValue)
                  updateParams({ q: nextValue })
                }}
              />
            </div>
            {filteredGroups.length === 0 ? (
              <EmptyState title="Keine Gruppen gefunden" description="" />
            ) : (
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {filteredGroups.map((group) => (
                  <Button
                    key={group.id}
                    variant={selectedGroup?.id === group.id ? 'secondary' : 'ghost'}
                    onClick={() => updateParams({ group: group.id, tab: activeTab })}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    {group.name}
                  </Button>
                ))}
              </div>
            )}
          </Card>

          <Card variant="section">
            {selectedGroup ? (
              <>
                <SectionHeader
                  title={selectedGroup.name}
                  actions={
                    <Button variant="secondary" href={`/admin/fansubs/${selectedGroup.id}/edit`}>
                      Fansub verwalten
                    </Button>
                  }
                />
                <Tabs
                  items={tabItems}
                  activeId={activeTab}
                  onActiveIdChange={(id) => updateParams({ group: selectedGroup.id, tab: parseTab(id) })}
                  keepMountedIds={new Set([activeTab])}
                />
              </>
            ) : (
              <EmptyState
                title="Gruppe ausw�hlen"
                description="W�hlen Sie links eine Fansub-Gruppe, um Benutzer, Rollen, Claims und �nderungen im Gruppenkontext zu sehen."
              />
            )}
          </Card>
        </div>
      ) : null}
    </div>
  )
}
