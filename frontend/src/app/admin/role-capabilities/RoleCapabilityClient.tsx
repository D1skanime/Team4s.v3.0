'use client'

import { useCallback, useEffect, useState } from 'react'

import { ApiError, listRoleCapabilities, grantRoleCapability, revokeRoleCapability } from '@/lib/api'
import type { RoleCapabilityMatrix } from '@/types/admin-capability'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { GrantCapabilityModal } from './GrantCapabilityModal'
import { RevokeCapabilityModal } from './RevokeCapabilityModal'
import { RoleCapabilityTable } from './RoleCapabilityTable'

interface PendingCapability {
  roleCode: string
  actionCode: string
  roleLabel: string
  actionLabel: string
}

/**
 * Props-Interface für externe Kontrolle (z.B. Tests).
 * Wenn matrix + isLoading übergeben werden, überspringt die Komponente den internen Fetch.
 */
export interface RoleCapabilityClientProps {
  matrix?: RoleCapabilityMatrix
  isLoading?: boolean
}

export default function RoleCapabilityClient({
  matrix: externalMatrix,
  isLoading: externalLoading,
}: RoleCapabilityClientProps = {}) {
  const isControlled = externalMatrix !== undefined

  const [matrix, setMatrix] = useState<RoleCapabilityMatrix | null>(externalMatrix ?? null)
  const [isLoading, setIsLoading] = useState(externalLoading ?? !isControlled)
  const [error, setError] = useState<string | null>(null)

  const [filteredCategory, setFilteredCategory] = useState('')

  const [pendingGrant, setPendingGrant] = useState<PendingCapability | null>(null)
  const [pendingRevoke, setPendingRevoke] = useState<PendingCapability | null>(null)

  const [grantError, setGrantError] = useState<string | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [isRevokeError409, setIsRevokeError409] = useState(false)

  const [isGranting, setIsGranting] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  const loadData = useCallback(async () => {
    if (isControlled) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await listRoleCapabilities()
      setMatrix(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Fehler beim Laden der Capability-Matrix.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [isControlled])

  useEffect(() => {
    if (!isControlled) {
      loadData()
    }
  }, [isControlled, loadData])

  // Controlled-Mode: externe Props synchronisieren
  useEffect(() => {
    if (isControlled) {
      setMatrix(externalMatrix ?? null)
    }
  }, [isControlled, externalMatrix])

  useEffect(() => {
    if (isControlled && externalLoading !== undefined) {
      setIsLoading(externalLoading)
    }
  }, [isControlled, externalLoading])

  const uniqueCategories = Array.from(
    new Set((matrix?.all_actions ?? []).map((a) => a.category))
  ).sort()

  function openGrantModal(roleCode: string, actionCode: string) {
    const role = matrix?.roles.find((r) => r.role_code === roleCode)
    const action = matrix?.all_actions.find((a) => a.code === actionCode)
    if (!role || !action) return
    setGrantError(null)
    setPendingGrant({
      roleCode,
      actionCode,
      roleLabel: role.label_de,
      actionLabel: action.label_de,
    })
  }

  function openRevokeModal(roleCode: string, actionCode: string) {
    const role = matrix?.roles.find((r) => r.role_code === roleCode)
    const action = matrix?.all_actions.find((a) => a.code === actionCode)
    if (!role || !action) return
    setRevokeError(null)
    setIsRevokeError409(false)
    setPendingRevoke({
      roleCode,
      actionCode,
      roleLabel: role.label_de,
      actionLabel: action.label_de,
    })
  }

  async function handleGrantConfirm() {
    if (!pendingGrant) return
    setIsGranting(true)
    setGrantError(null)
    try {
      await grantRoleCapability(pendingGrant.roleCode, pendingGrant.actionCode)
      setPendingGrant(null)
      await loadData()
    } catch (err) {
      if (err instanceof ApiError) {
        setGrantError(err.message)
      } else {
        setGrantError('Fehler beim Vergeben der Capability.')
      }
    } finally {
      setIsGranting(false)
    }
  }

  async function handleRevokeConfirm() {
    if (!pendingRevoke) return
    setIsRevoking(true)
    setRevokeError(null)
    setIsRevokeError409(false)
    try {
      await revokeRoleCapability(pendingRevoke.roleCode, pendingRevoke.actionCode)
      setPendingRevoke(null)
      await loadData()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setIsRevokeError409(true)
          setRevokeError(err.message || 'Lockout-Schutz: Diese Capability kann nicht entzogen werden.')
        } else {
          setRevokeError(err.message)
        }
      } else {
        setRevokeError('Fehler beim Entziehen der Capability.')
      }
    } finally {
      setIsRevoking(false)
    }
  }

  if (isLoading) {
    return <LoadingState title="Lade Capability-Matrix …" description="Rollen und Aktionen werden geladen." />
  }

  if (error) {
    return <ErrorState title="Fehler beim Laden" description={error} />
  }

  return (
    <div>
      <PageHeader title="Capability-Verwaltung" />

      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-4)' }}>
        Änderungen werden nach dem Cache-Reload der Rechte-Prüfung wirksam (typisch innerhalb weniger Sekunden nach dem Speichern).
      </p>

      {uniqueCategories.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Select
            value={filteredCategory}
            onChange={(e) => setFilteredCategory(e.target.value)}
            aria-label="Kategorie filtern"
          >
            <option value="">Alle Kategorien</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
        </div>
      )}

      {matrix && matrix.roles.length > 0 ? (
        <RoleCapabilityTable
          roles={matrix.roles}
          allActions={matrix.all_actions}
          filteredCategory={filteredCategory}
          onGrant={openGrantModal}
          onRevoke={openRevokeModal}
        />
      ) : (
        <p style={{ color: 'var(--color-text-secondary)' }}>Keine Rollen gefunden.</p>
      )}

      {pendingGrant && (
        <GrantCapabilityModal
          open={true}
          roleLabel={pendingGrant.roleLabel}
          actionLabel={pendingGrant.actionLabel}
          isMutating={isGranting}
          mutationError={grantError}
          onConfirm={handleGrantConfirm}
          onClose={() => {
            setPendingGrant(null)
            setGrantError(null)
          }}
        />
      )}

      {pendingRevoke && (
        <RevokeCapabilityModal
          open={true}
          roleLabel={pendingRevoke.roleLabel}
          actionLabel={pendingRevoke.actionLabel}
          isMutating={isRevoking}
          mutationError={revokeError}
          isLockout={isRevokeError409}
          onConfirm={handleRevokeConfirm}
          onClose={() => {
            setPendingRevoke(null)
            setRevokeError(null)
            setIsRevokeError409(false)
          }}
        />
      )}
    </div>
  )
}
