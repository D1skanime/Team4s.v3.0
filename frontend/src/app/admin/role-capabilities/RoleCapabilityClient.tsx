'use client'

import { useCallback, useEffect, useState } from 'react'

import { ApiError, listRoleCapabilities, grantRoleCapability, revokeRoleCapability } from '@/lib/api'
import type { RoleCapabilityMatrix, RoleEntry } from '@/types/admin-capability'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { RoleMasterList } from './RoleMasterList'
import { RoleCapabilityDetail } from './RoleCapabilityDetail'

/**
 * Props-Interface für externe Kontrolle (z.B. Tests).
 * Wenn matrix + isLoading übergeben werden, überspringt die Komponente den internen Fetch.
 */
export interface RoleCapabilityClientProps {
  matrix?: RoleCapabilityMatrix
  isLoading?: boolean
}

/**
 * Haupt-Client für die Capability-Verwaltung.
 *
 * Layout (D-11/D-12):
 * - Desktop (>= 760 px): Master-Liste links, Detail-Panel rechts
 * - Mobile (< 760 px): Master-Liste, Detail im Drawer variant="responsiveSheet"
 *
 * Nicht-assignable Rollen: klar markiert, Switches disabled; serverseitiger
 * 422-Guard (Plan 02) als Inline-Fehler sichtbar (D-13).
 */
export default function RoleCapabilityClient({
  matrix: externalMatrix,
  isLoading: externalLoading,
}: RoleCapabilityClientProps = {}) {
  const isControlled = externalMatrix !== undefined

  const [matrix, setMatrix] = useState<RoleCapabilityMatrix | null>(externalMatrix ?? null)
  const [isLoading, setIsLoading] = useState(externalLoading ?? !isControlled)
  const [error, setError] = useState<string | null>(null)

  const [selectedRoleCode, setSelectedRoleCode] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const [capabilityError, setCapabilityError] = useState<string | null>(null)
  const [isMutating, setIsMutating] = useState(false)

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

  function handleSelectRole(roleCode: string) {
    setSelectedRoleCode(roleCode)
    setCapabilityError(null)
    setIsDetailOpen(true)
  }

  async function handleGrant(roleCode: string, actionCode: string) {
    if (isMutating) return
    setIsMutating(true)
    setCapabilityError(null)
    try {
      await grantRoleCapability(roleCode, actionCode)
      await loadData()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.code === 'role_not_assignable') {
          setCapabilityError(
            'Diese Rolle ist nicht zuweisbar (historische Rolle). Capabilities können nicht vergeben werden.'
          )
        } else {
          setCapabilityError(err.message || 'Fehler beim Vergeben der Capability.')
        }
      } else {
        setCapabilityError('Fehler beim Vergeben der Capability.')
      }
    } finally {
      setIsMutating(false)
    }
  }

  async function handleRevoke(roleCode: string, actionCode: string) {
    if (isMutating) return
    setIsMutating(true)
    setCapabilityError(null)
    try {
      await revokeRoleCapability(roleCode, actionCode)
      await loadData()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.code === 'role_not_assignable') {
          setCapabilityError(
            'Diese Rolle ist nicht zuweisbar (historische Rolle). Capabilities können nicht entzogen werden.'
          )
        } else if (err.status === 409) {
          setCapabilityError(
            err.message || 'Lockout-Schutz: Diese Capability kann nicht entzogen werden.'
          )
        } else {
          setCapabilityError(err.message || 'Fehler beim Entziehen der Capability.')
        }
      } else {
        setCapabilityError('Fehler beim Entziehen der Capability.')
      }
    } finally {
      setIsMutating(false)
    }
  }

  const selectedRole: RoleEntry | null =
    matrix?.roles.find((r) => r.role_code === selectedRoleCode) ?? null

  if (isLoading) {
    return <LoadingState title="Lade Capability-Matrix …" description="Rollen und Aktionen werden geladen." />
  }

  if (error) {
    return <ErrorState title="Fehler beim Laden" description={error} />
  }

  const roles = matrix?.roles ?? []

  return (
    <div>
      <PageHeader title="Capability-Verwaltung" />

      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-4)' }}>
        Änderungen werden nach dem Cache-Reload der Rechte-Prüfung wirksam (typisch innerhalb weniger Sekunden nach dem Speichern).
      </p>

      {/* Master-Detail-Layout */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-6)',
          alignItems: 'flex-start',
        }}
      >
        {/* Master: Rollenliste */}
        <div
          style={{
            flex: '0 0 280px',
            minWidth: 0,
          }}
        >
          {roles.length > 0 ? (
            <RoleMasterList
              roles={roles}
              selectedRoleCode={selectedRoleCode}
              onSelectRole={handleSelectRole}
            />
          ) : (
            <p style={{ color: 'var(--color-text-secondary)' }}>Keine Rollen gefunden.</p>
          )}
        </div>

        {/* Detail: Desktop-Panel (>= 760 px) */}
        {selectedRole && (
          <div
            className="capabilityDetailDesktop"
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <RoleCapabilityDetail
              role={selectedRole}
              onGrant={handleGrant}
              onRevoke={handleRevoke}
              inlineError={capabilityError}
            />
          </div>
        )}
      </div>

      {/* Mobile-Detail: Drawer variant="responsiveSheet" (< 760 px) */}
      {selectedRole && (
        <Drawer
          open={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false)
            setCapabilityError(null)
          }}
          title={selectedRole.label_de}
          variant="responsiveSheet"
        >
          <RoleCapabilityDetail
            role={selectedRole}
            onGrant={handleGrant}
            onRevoke={handleRevoke}
            inlineError={capabilityError}
          />
        </Drawer>
      )}
    </div>
  )
}
