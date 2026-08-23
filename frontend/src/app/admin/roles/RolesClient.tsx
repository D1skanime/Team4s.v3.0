'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button, Card, ErrorState, LoadingState, PageHeader, SectionHeader } from '@/components/ui'
import { ApiError, listRoleCapabilities, listRoleHolders } from '@/lib/api'
import type { RoleCapabilityMatrix, RoleEntry, RoleHolderEntry } from '@/types/admin-capability'

import { RoleHoldersTable } from './RoleHoldersTable'

/**
 * "Rollen"-Top-Level-Ansicht (D-07).
 *
 * Rollen-Picker für gruppenkontextbezogene Rollen — beantwortet als Erstes "wer besitzt
 * diese Rolle?" (RoleHoldersTable, Plan 138-12 Task 2), nicht die Standard-Capabilities der
 * Rolle. Globale App-Rollen (platform_admin/content_admin/user) bleiben bewusst außen vor:
 * sie behalten ihren bestehenden Filter-Pfad über `/admin/users?role=` (Plan 138-01
 * Scope-Entscheidung).
 *
 * Datenquelle: dieselbe bereits genutzte `listRoleCapabilities()`-Matrix wie
 * RoleCapabilityClient.tsx — es wird keine zweite, separat geladene Rollenliste aufgebaut.
 */
export default function RolesClient() {
  const [matrix, setMatrix] = useState<RoleCapabilityMatrix | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoleCode, setSelectedRoleCode] = useState<string | null>(null)

  // Rolleninhaber-Ladezustand (D-07's RoleHoldersTable) — bewusst eine eigene Loading-/
  // Error-Triade, unabhängig vom Ladezustand des Rollen-Pickers selbst.
  const [holders, setHolders] = useState<RoleHolderEntry[]>([])
  const [isHoldersLoading, setIsHoldersLoading] = useState(false)
  const [holdersError, setHoldersError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await listRoleCapabilities()
        if (!cancelled) setMatrix(data)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Fehler beim Laden der Rollen.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const loadHolders = useCallback(async (roleCode: string) => {
    setIsHoldersLoading(true)
    setHoldersError(null)
    try {
      const data = await listRoleHolders(roleCode)
      setHolders(data)
    } catch (err) {
      setHoldersError(err instanceof ApiError ? err.message : 'Fehler beim Laden der Rolleninhaber.')
    } finally {
      setIsHoldersLoading(false)
    }
  }, [])

  function handleSelectRole(roleCode: string) {
    setSelectedRoleCode(roleCode)
    void loadHolders(roleCode)
  }

  if (isLoading) {
    return <LoadingState title="Lade Rollen …" description="Gruppenrollen werden geladen." />
  }

  if (error) {
    return <ErrorState title="Fehler beim Laden" description={error} />
  }

  // Nur echte gruppenkontextbezogene Rollen — genau die Menge, die Plan 138-01s
  // role-holders-Endpunkt akzeptiert (kein zweiter, abweichend gefilterter Rollen-Katalog).
  const roles: RoleEntry[] = (matrix?.roles ?? []).filter(
    (role) => role.role_kind !== 'global_app_role' && role.contexts?.includes('fansub_group'),
  )

  const selectedRole = roles.find((r) => r.role_code === selectedRoleCode) ?? null

  return (
    <div>
      <PageHeader
        title="Rollen"
        description="Wer besitzt welche Gruppenrolle? Die Standard-Capabilities einer Rolle bleiben über den jeweiligen Link erreichbar."
      />

      {roles.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>Keine gruppenkontextbezogenen Rollen gefunden.</p>
      ) : (
        <div
          role="list"
          aria-label="Rollenliste"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}
        >
          {roles.map((role) => {
            const isSelected = role.role_code === selectedRoleCode
            return (
              <div key={role.role_code} role="listitem">
                <Card
                  variant="interactive"
                  style={{ outline: isSelected ? '2px solid var(--color-primary)' : undefined }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--space-3)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      aria-pressed={isSelected}
                      onClick={() => handleSelectRole(role.role_code)}
                      style={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', textAlign: 'left' }}
                    >
                      {role.label_de}
                    </Button>
                    <Button variant="ghost" size="sm" href={`/admin/role-capabilities?role=${role.role_code}`}>
                      Standard-Capabilities dieser Rolle ansehen
                    </Button>
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      {selectedRole ? (
        <div>
          <SectionHeader
            title={`Rolleninhaber: ${selectedRole.label_de}`}
            description="Wer besitzt diese Rolle, in welcher Gruppe, mit welchem Mitgliedsstatus und welchen Rechte-Abweichungen?"
          />
          {isHoldersLoading ? (
            <LoadingState title="Lade Rolleninhaber …" description="" />
          ) : holdersError ? (
            <ErrorState title="Fehler beim Laden" description={holdersError} />
          ) : (
            <RoleHoldersTable holders={holders} />
          )}
        </div>
      ) : null}
    </div>
  )
}
