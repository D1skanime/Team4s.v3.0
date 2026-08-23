'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { ApiError, listRoleCapabilities } from '@/lib/api'
import type { RoleCapabilityMatrix, RoleEntry } from '@/types/admin-capability'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { RoleMasterList } from './RoleMasterList'
import { RoleCapabilityDetail } from './RoleCapabilityDetail'
import { RoleCapabilityImpactPreviewModal } from './RoleCapabilityImpactPreviewModal'

/**
 * Gibt zurück, ob der Viewport als "mobil" gilt (< 760 px).
 * Wird per matchMedia gated — reagiert auf Viewport-Änderungen.
 * SSR-sicher: Startzustand ist false (Desktop-Annahme), bis matchMedia läuft.
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 759px)')
    const onChange = () => setIsMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

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

  const isMobile = useIsMobile()
  const searchParams = useSearchParams()

  const [selectedRoleCode, setSelectedRoleCode] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  // Verhindert, dass die ?role=-Vorauswahl (D-06) nach jedem Matrix-Refresh (z.B. nach
  // Grant/Revoke) erneut greift und eine zwischenzeitlich manuell gewählte andere Rolle
  // überschreibt — die URL-Vorauswahl gilt nur für den initialen Load.
  const appliedUrlRoleRef = useRef(false)

  // Controlled Accordion-Open-Zustand — überlebt Switch-Toggle + Daten-Refresh,
  // sodass eine aufgeklappte Kategorie nach einer Mutation offen bleibt.
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())

  // Plan 138-13 (D-18): Switch-Toggles fordern nur noch das Öffnen des Impact-Preview-Dialogs
  // an; die eigentliche Mutation (inkl. 422/409-Fehlerbehandlung) lebt jetzt vollständig im
  // Dialog selbst (RoleCapabilityImpactPreviewModal), nicht mehr hier.
  const [impactPreviewRequest, setImpactPreviewRequest] = useState<{
    actionCode: string
    actionLabel: string
    add: boolean
  } | null>(null)

  /**
   * Lädt die Matrix neu.
   * @param showLoading - true beim Initial-Load (vollflächiger LoadingState);
   *   false bei Refresh nach einer Mutation, damit das Detail-Panel (und damit
   *   der Accordion-Open-Zustand) NICHT unmounted/neu gemountet wird.
   */
  const loadData = useCallback(async (showLoading = true) => {
    if (isControlled) return
    if (showLoading) setIsLoading(true)
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
      if (showLoading) setIsLoading(false)
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
    setImpactPreviewRequest(null)
    // Sheet nur auf Mobile öffnen — Desktop zeigt den Inline-Panel
    if (isMobile) {
      setIsSheetOpen(true)
    }
  }

  // D-06: ?role={code} wählt beim ersten erfolgreichen Matrix-Load die passende Rolle
  // automatisch aus — identisch zum manuellen Klick-Pfad (Desktop Inline-Panel bzw. Mobile
  // Drawer). Stale/Typo-Codes bleiben bewusst still (kein Error-State, T-111-08).
  useEffect(() => {
    if (!matrix || appliedUrlRoleRef.current) return
    appliedUrlRoleRef.current = true
    const roleParam = searchParams.get('role')
    if (!roleParam) return
    const exists = matrix.roles.some((r) => r.role_code === roleParam)
    if (exists) {
      handleSelectRole(roleParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrix, searchParams])

  // Plan 138-13 (D-18/CAP-09): ein Switch-Toggle fordert nur noch das Öffnen des
  // Impact-Preview-Dialogs an; `add=true` -> Vergabe, `add=false` -> Entziehung. Die
  // eigentliche Mutation (inkl. 422/409-Fehlerbehandlung) passiert erst nach einer im Dialog
  // bestätigten Vorschau, direkt in RoleCapabilityImpactPreviewModal.
  function handleRequestChange(actionCode: string, add: boolean) {
    const actionLabel = selectedRole?.actions.find((a) => a.code === actionCode)?.label_de ?? actionCode
    setImpactPreviewRequest({ actionCode, actionLabel, add })
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
        Änderungen werden nach Bestätigung sofort im Rechte-Cache aktualisiert.
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

        {/* Detail: Inline-Panel nur auf Desktop (>= 760 px) */}
        {!isMobile && selectedRole && (
          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <RoleCapabilityDetail
              role={selectedRole}
              onRequestChange={handleRequestChange}
              inlineError={null}
              openCategories={openCategories}
              onOpenCategoriesChange={setOpenCategories}
            />
          </div>
        )}
      </div>

      {/* Mobile-Detail: Drawer variant="responsiveSheet" nur auf Mobile (< 760 px) */}
      {isMobile && selectedRole && (
        <Drawer
          open={isSheetOpen}
          onClose={() => {
            setIsSheetOpen(false)
            setImpactPreviewRequest(null)
          }}
          title={selectedRole.label_de}
          variant="responsiveSheet"
        >
          <RoleCapabilityDetail
            role={selectedRole}
            onRequestChange={handleRequestChange}
            inlineError={null}
            openCategories={openCategories}
            onOpenCategoriesChange={setOpenCategories}
          />
        </Drawer>
      )}

      {/* CAP-09/D-18/D-20/D-21: Impact-Preview-Dialog -- gate vor jeder Capability-Mutation. */}
      {impactPreviewRequest && selectedRole && (
        <RoleCapabilityImpactPreviewModal
          open
          onClose={() => setImpactPreviewRequest(null)}
          roleCode={selectedRole.role_code}
          roleLabel={selectedRole.label_de}
          actionCode={impactPreviewRequest.actionCode}
          actionLabel={impactPreviewRequest.actionLabel}
          add={impactPreviewRequest.add}
          onMutated={() => {
            void loadData(false)
          }}
        />
      )}
    </div>
  )
}
