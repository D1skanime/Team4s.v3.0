'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  SectionHeader,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import {
  ApiError,
  assignAdminUserGlobalRole,
  getAdminUserGlobalRoles,
  revokeAdminUserGlobalRole,
} from '@/lib/api'
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
// Entzugs-Modal
// ---------------------------------------------------------------------------

interface RevokeModalProps {
  open: boolean
  role: string
  displayName: string
  isMutating: boolean
  mutationError: string | null
  onConfirm: () => void
  onClose: () => void
}

function RevokeModal({
  open,
  role,
  displayName,
  isMutating,
  mutationError,
  onConfirm,
  onClose,
}: RevokeModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Globale Rolle entziehen"
      description={`Soll die Rolle „${roleLabel(role)}" von ${displayName} entzogen werden?`}
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button variant="secondary" onClick={onClose} disabled={isMutating}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isMutating}>
            {isMutating ? 'Wird verarbeitet …' : 'Rolle entziehen'}
          </Button>
        </div>
      }
    >
      {mutationError && (
        <p
          role="alert"
          style={{ color: 'var(--color-error)', fontSize: '0.9rem', margin: '0 0 var(--space-2)' }}
        >
          {mutationError}
        </p>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Vergabe-Modal
// ---------------------------------------------------------------------------

interface AssignModalProps {
  open: boolean
  assignableRoles: string[]
  selectedRole: string
  isMutating: boolean
  mutationError: string | null
  onRoleChange: (role: string) => void
  onConfirm: () => void
  onClose: () => void
}

function AssignModal({
  open,
  assignableRoles,
  selectedRole,
  isMutating,
  mutationError,
  onRoleChange,
  onConfirm,
  onClose,
}: AssignModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Globale Rolle vergeben"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button variant="secondary" onClick={onClose} disabled={isMutating}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isMutating || !selectedRole}
          >
            {isMutating ? 'Wird verarbeitet …' : 'Rolle vergeben'}
          </Button>
        </div>
      }
    >
      {mutationError && (
        <p
          role="alert"
          style={{ color: 'var(--color-error)', fontSize: '0.9rem', marginBottom: 'var(--space-2)' }}
        >
          {mutationError}
        </p>
      )}
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <label
          htmlFor="assign-role-select"
          style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 600, fontSize: '0.9rem' }}
        >
          Rolle auswählen
        </label>
        <Select
          id="assign-role-select"
          value={selectedRole}
          onChange={(e) => onRoleChange(e.target.value)}
          disabled={isMutating}
        >
          <option value="">– Rolle auswählen –</option>
          {assignableRoles.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </Select>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Aktive-Rollen-Tabelle
// ---------------------------------------------------------------------------

interface RolesTableProps {
  roles: string[]
  displayName: string
  onRevoke: (role: string) => void
}

function RolesTable({ roles, displayName, onRevoke }: RolesTableProps) {
  if (roles.length === 0) {
    return (
      <EmptyState
        title="Keine globalen Rollen"
        description="Diesem Benutzer sind keine globalen Rollen zugewiesen."
      />
    )
  }

  return (
    <Table variant="default">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Rolle</TableHeaderCell>
          <TableHeaderCell>Aktion</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role}>
            <TableCell>
              <Badge variant="info">{roleLabel(role)}</Badge>
            </TableCell>
            <TableCell>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onRevoke(role)}
                aria-label={`Rolle ${roleLabel(role)} von ${displayName} entziehen`}
              >
                Rolle entziehen
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

export function UserGlobalRolesTab({ userId, displayName = 'diesem Benutzer' }: Props) {
  const [data, setData] = useState<AdminUserGlobalRolesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Entzugs-Modal-State
  const [revokeRole, setRevokeRole] = useState<string>('')
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  // Vergabe-Modal-State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assignSelectedRole, setAssignSelectedRole] = useState('')
  const [assignError, setAssignError] = useState<string | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

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

  // --- Entzug-Handler ---
  function openRevokeModal(role: string) {
    setRevokeRole(role)
    setRevokeError(null)
    setIsRevokeModalOpen(true)
  }

  async function handleRevokeConfirm() {
    setRevokeError(null)
    setIsRevoking(true)
    try {
      await revokeAdminUserGlobalRole(userId, revokeRole)
      setIsRevokeModalOpen(false)
      await loadData()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setRevokeError('Die letzte Plattform-Admin-Rolle kann nicht entzogen werden.')
      } else if (err instanceof ApiError) {
        setRevokeError(err.message)
      } else {
        setRevokeError('Entzug fehlgeschlagen. Bitte erneut versuchen.')
      }
    } finally {
      setIsRevoking(false)
    }
  }

  // --- Vergabe-Handler ---
  function openAssignModal() {
    setAssignSelectedRole('')
    setAssignError(null)
    setIsAssignModalOpen(true)
  }

  async function handleAssignConfirm() {
    if (!assignSelectedRole) return
    setAssignError(null)
    setIsAssigning(true)
    try {
      await assignAdminUserGlobalRole(userId, assignSelectedRole)
      setIsAssignModalOpen(false)
      await loadData()
    } catch (err) {
      if (err instanceof ApiError) {
        setAssignError(err.message)
      } else {
        setAssignError('Vergabe fehlgeschlagen. Bitte erneut versuchen.')
      }
    } finally {
      setIsAssigning(false)
    }
  }

  if (isLoading) return <LoadingState title="Wird geladen …" description="" />
  if (error) {
    return <ErrorState title="Fehler beim Laden" description={error} />
  }
  if (!data) return <EmptyState title="Keine Daten vorhanden." description="" />

  const assignableFiltered = (data.assignable_roles ?? []).filter(
    (r) => !data.roles.includes(r),
  )

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <SectionHeader
        title="Aktive Rollen"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={openAssignModal}
            disabled={assignableFiltered.length === 0}
          >
            Rolle vergeben
          </Button>
        }
      />

      <RolesTable
        roles={data.roles}
        displayName={displayName}
        onRevoke={openRevokeModal}
      />

      <RevokeModal
        open={isRevokeModalOpen}
        role={revokeRole}
        displayName={displayName}
        isMutating={isRevoking}
        mutationError={revokeError}
        onConfirm={() => void handleRevokeConfirm()}
        onClose={() => {
          if (!isRevoking) {
            setIsRevokeModalOpen(false)
            setRevokeError(null)
          }
        }}
      />

      <AssignModal
        open={isAssignModalOpen}
        assignableRoles={assignableFiltered}
        selectedRole={assignSelectedRole}
        isMutating={isAssigning}
        mutationError={assignError}
        onRoleChange={setAssignSelectedRole}
        onConfirm={() => void handleAssignConfirm()}
        onClose={() => {
          if (!isAssigning) {
            setIsAssignModalOpen(false)
            setAssignError(null)
          }
        }}
      />
    </div>
  )
}
