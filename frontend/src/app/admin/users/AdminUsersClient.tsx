'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import { ApiError, listAdminUsersPage } from '@/lib/api'
import type { AdminUserListItem, AdminUserListParams } from '@/types/admin-users'

import { UserDetailDrawer } from './UserDetailDrawer'

function formatRelativeDate(isoDate: string | null): string {
  if (!isoDate) return '—'
  const diff = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Heute'
  if (days === 1) return 'Gestern'
  if (days < 30) return `vor ${days} Tagen`
  if (days < 365) return `vor ${Math.floor(days / 30)} Monat(en)`
  return `vor ${Math.floor(days / 365)} Jahr(en)`
}

function getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'disabled') return 'danger'
  return 'neutral'
}

function getStatusLabel(status: string): string {
  if (status === 'active') return 'Aktiv'
  if (status === 'pending') return 'Ausstehend'
  if (status === 'disabled') return 'Deaktiviert'
  return status
}

function readErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

export function AdminUsersClient() {
  const [items, setItems] = useState<AdminUserListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [params, setParams] = useState<AdminUserListParams>({
    sort: 'last_activity_desc',
    limit: 25,
    offset: 0,
  })
  const [searchValue, setSearchValue] = useState('')
  const [hasConflictsOnly, setHasConflictsOnly] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await listAdminUsersPage(params)
      setItems(resp.data)
      setTotal(resp.meta.total)
    } catch (err) {
      setError(readErrorMessage(err, 'Benutzerliste konnte nicht geladen werden. Bitte Seite neu laden.'))
    } finally {
      setIsLoading(false)
    }
  }, [params])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  function handleSearchChange(value: string) {
    setSearchValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setParams((prev) => ({ ...prev, q: value || undefined, offset: 0 }))
    }, 300)
  }

  function handleStatusChange(value: string) {
    setParams((prev) => ({ ...prev, status: value || undefined, offset: 0 }))
  }

  function handleRoleChange(value: string) {
    setParams((prev) => ({ ...prev, global_role: value || undefined, offset: 0 }))
  }

  function handleConflictsToggle() {
    const next = !hasConflictsOnly
    setHasConflictsOnly(next)
    setParams((prev) => ({ ...prev, has_conflicts: next || undefined, offset: 0 }))
  }

  const limit = params.limit ?? 25
  const currentPage = Math.floor((params.offset ?? 0) / limit) + 1
  const totalPages = Math.ceil(total / limit)

  function handlePageChange(page: number) {
    setParams((prev) => ({ ...prev, offset: (page - 1) * limit }))
  }

  return (
    <div>
      <h1>Benutzerverwaltung</h1>

      {/* Filter-Bereich */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <Input
          type="search"
          placeholder="Name oder E-Mail-Adresse suchen …"
          value={searchValue}
          onChange={(e) => handleSearchChange(e.currentTarget.value)}
          aria-label="Benutzer suchen"
        />

        <div>
          <Select
            id="status-filter"
            aria-label="Accountstatus"
            value={params.status ?? ''}
            onChange={(e) => handleStatusChange(e.currentTarget.value)}
          >
            <option value="">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="pending">Ausstehend</option>
            <option value="disabled">Deaktiviert</option>
          </Select>
        </div>

        <div>
          <label htmlFor="role-filter" style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
            Globale Rolle
          </label>
          <Select
            id="role-filter"
            value={params.global_role ?? ''}
            onChange={(e) => handleRoleChange(e.currentTarget.value)}
          >
            <option value="">Alle Rollen</option>
            <option value="platform_admin">Plattform-Admin</option>
            <option value="content_admin">Content-Admin</option>
            <option value="user">Nutzer</option>
          </Select>
        </div>

        <Button
          variant={hasConflictsOnly ? 'secondary' : 'ghost'}
          size="sm"
          onClick={handleConflictsToggle}
          aria-pressed={hasConflictsOnly}
        >
          Nur mit Konflikten
        </Button>
      </div>

      {/* Tabelle — wird nicht gerendert wenn Drawer offen ist */}
      {selectedUserId !== null ? null : isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="Fehler beim Laden" description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Keine Benutzer gefunden"
          description="Passen Sie Ihre Suchkriterien an oder prüfen Sie die aktiven Filter."
        />
      ) : (
        <>
          <Table variant="selectable">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Benutzer</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Globale Rollen</TableHeaderCell>
                <TableHeaderCell>Member-Profil</TableHeaderCell>
                <TableHeaderCell>Gruppen</TableHeaderCell>
                <TableHeaderCell>Leader-Kontext</TableHeaderCell>
                <TableHeaderCell>Offene Claims</TableHeaderCell>
                <TableHeaderCell>Beiträge</TableHeaderCell>
                <TableHeaderCell>Medienuploads</TableHeaderCell>
                <TableHeaderCell>Letzte Aktivität</TableHeaderCell>
                <TableHeaderCell>Konflikte</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <AdminUserTableRow
                  key={item.id}
                  item={item}
                  onClick={() => setSelectedUserId(item.id)}
                />
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      {selectedUserId !== null && (
        <UserDetailDrawer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  )
}

interface AdminUserTableRowProps {
  item: AdminUserListItem
  onClick: () => void
}

function AdminUserTableRow({ item, onClick }: AdminUserTableRowProps) {
  const initials = item.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const visibleRoles = item.global_roles.slice(0, 2)
  const hiddenRoleCount = item.global_roles.length - visibleRoles.length

  return (
    <TableRow
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      role="row"
    >
      {/* Benutzer */}
      <TableCell>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            aria-hidden="true"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--color-primary, #5f84dd)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{item.display_name}</div>
            <div style={{ fontSize: '13px', color: 'var(--color-muted, #666)' }}>{item.email}</div>
          </div>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge variant={getStatusVariant(item.status)}>{getStatusLabel(item.status)}</Badge>
      </TableCell>

      {/* Globale Rollen */}
      <TableCell>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {visibleRoles.map((role) => (
            <Badge key={role} variant="info">{role}</Badge>
          ))}
          {hiddenRoleCount > 0 && <Badge variant="muted">+{hiddenRoleCount}</Badge>}
          {item.global_roles.length === 0 && <span style={{ color: 'var(--color-muted, #666)' }}>—</span>}
        </div>
      </TableCell>

      {/* Member-Profil */}
      <TableCell>
        {item.member_profile_id != null ? (
          <span title={item.member_profile_name ?? undefined}>
            ✓{item.member_profile_name ? ` ${item.member_profile_name}` : ''}
          </span>
        ) : (
          <span style={{ color: 'var(--color-muted, #666)' }}>—</span>
        )}
      </TableCell>

      {/* Gruppen */}
      <TableCell>{item.group_membership_count}</TableCell>

      {/* Leader-Kontext */}
      <TableCell>{item.leader_context_count}</TableCell>

      {/* Offene Claims */}
      <TableCell>
        {item.open_claims_count > 0 ? (
          <Badge variant="warning">{item.open_claims_count}</Badge>
        ) : (
          item.open_claims_count
        )}
      </TableCell>

      {/* Beiträge */}
      <TableCell>
        {item.open_contributions_count}/{item.total_contributions_count}
      </TableCell>

      {/* Medienuploads */}
      <TableCell>{item.media_upload_count}</TableCell>

      {/* Letzte Aktivität */}
      <TableCell>{formatRelativeDate(item.last_activity_at)}</TableCell>

      {/* Konflikte */}
      <TableCell>
        {item.conflict_count > 0 ? (
          <Badge variant="warning">
            {item.conflict_count} {item.conflict_count === 1 ? 'Konflikt' : 'Konflikte'}
          </Badge>
        ) : null}
      </TableCell>
    </TableRow>
  )
}
