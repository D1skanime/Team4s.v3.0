'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui'
import { ApiError, listRoleCapabilities, listRoleHolders } from '@/lib/api'
import type { RoleCapabilityMatrix, RoleEntry, RoleHolderEntry } from '@/types/admin-capability'
import { sortCategories } from './capabilityCategories'
import { RoleRail } from './RoleRail'
import { RoleDetailPanel } from './RoleDetailPanel'
import { RoleCapabilityImpactPreviewModal } from './RoleCapabilityImpactPreviewModal'
import styles from './roles.module.css'

/**
 * Rollen-Arbeitsbereich (Quick 260824-ek3, D-01/D-08-Nachtrag 2026-08-24): eine Master-Detail-
 * Ansicht statt zweier getrennter Top-Level-Bereiche. RoleRail links beantwortet "welche Rolle",
 * RoleDetailPanel rechts beantwortet über zwei Tabs sowohl D-07 ("wer besitzt diese Rolle?")
 * als auch D-08 ("was darf diese Rolle?") -- eine einzige geladene Matrix bedient beide.
 */
export default function RolesClient() {
  const [matrix, setMatrix] = useState<RoleCapabilityMatrix | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const searchParams = useSearchParams()

  const [selectedRoleCode, setSelectedRoleCode] = useState<string | null>(null)
  // Default wird bei JEDEM Wechsel von selectedRoleCode neu berechnet (siehe handleSelectRole) --
  // ein bewusst manuell gewählter Tab bleibt beim nächsten Rollenwechsel NICHT erhalten, weil
  // D-07/D-08 pro Rolle jeweils einen sinnvollen eigenen Default vorschreiben (Test E).
  const [activeTabId, setActiveTabId] = useState<string>('holders')

  const [holders, setHolders] = useState<RoleHolderEntry[]>([])
  const [isHoldersLoading, setIsHoldersLoading] = useState(false)
  const [holdersError, setHoldersError] = useState<string | null>(null)

  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())

  const [impactPreviewRequest, setImpactPreviewRequest] = useState<{
    actionCode: string
    actionLabel: string
    add: boolean
  } | null>(null)

  // Verhindert, dass die ?role=-Vorauswahl (GAP-05) nach jedem Matrix-Refresh (z.B. nach
  // Grant/Revoke) erneut greift und eine zwischenzeitlich manuell gewählte andere Rolle
  // überschreibt -- die URL-Vorauswahl gilt nur für den initialen Load.
  const appliedUrlRoleRef = useRef(false)
  const railRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    setError(null)
    try {
      const data = await listRoleCapabilities()
      setMatrix(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Laden der Rollen.')
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setImpactPreviewRequest(null)
    const role = matrix?.roles.find((r) => r.role_code === roleCode)
    // D-07/D-08 pro-Rolle-Default: globale App-Rollen zeigen zuerst die Standardrechte
    // (keine Gruppen-Inhaber-Tabelle möglich), alle anderen Rollen zeigen zuerst ihre Inhaber.
    setActiveTabId(role?.role_kind === 'global_app_role' ? 'caps' : 'holders')
    if (role && role.role_kind !== 'global_app_role') {
      void loadHolders(roleCode)
    }
  }

  // GAP-05/D-06: ?role={code} wählt beim ersten erfolgreichen Matrix-Load die passende Rolle
  // automatisch aus und scrollt sie bei Bedarf in Sicht -- identisch zum manuellen Klick-Pfad,
  // aber zusätzlich mit Scroll-into-View (die alte RoleCapabilityClient.tsx hatte das nicht).
  useEffect(() => {
    if (!matrix || appliedUrlRoleRef.current) return
    appliedUrlRoleRef.current = true
    const roleParam = searchParams.get('role')
    if (!roleParam) return
    const exists = matrix.roles.some((r) => r.role_code === roleParam)
    if (!exists) return
    handleSelectRole(roleParam)
    requestAnimationFrame(() => {
      const target = railRef.current?.querySelector<HTMLElement>(
        `[data-role-code="${CSS.escape(roleParam)}"]`,
      )
      target?.scrollIntoView({ block: 'nearest' })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrix, searchParams])

  // D-08 "erste Kategorie offen": bei jedem Rollenwechsel wird die erste Kategorie (gemäß
  // sortCategories, dieselbe Reihenfolge wie RoleCapabilityDetail.tsx) automatisch aufgeklappt,
  // damit ein Deep-Link nie ein zugeklapptes Akkordeon mit 0 sichtbaren Capabilities zeigt.
  useEffect(() => {
    const role = matrix?.roles.find((r) => r.role_code === selectedRoleCode)
    if (!role) return
    const categories = sortCategories([...new Set(role.actions.map((a) => a.category))])
    setOpenCategories(categories.length > 0 ? new Set([categories[0]]) : new Set())
  }, [selectedRoleCode, matrix])

  // D-10/D-18/CAP-09: unverändert aus RoleCapabilityClient.tsx übernommen -- ein Switch-Toggle
  // fordert nur das Öffnen des Impact-Preview-Dialogs an, die eigentliche Mutation passiert erst
  // nach einer im Dialog bestätigten Vorschau, direkt in RoleCapabilityImpactPreviewModal.
  function handleRequestChange(actionCode: string, add: boolean) {
    const actionLabel = selectedRole?.actions.find((a) => a.code === actionCode)?.label_de ?? actionCode
    setImpactPreviewRequest({ actionCode, actionLabel, add })
  }

  const selectedRole: RoleEntry | null =
    matrix?.roles.find((r) => r.role_code === selectedRoleCode) ?? null

  if (isLoading) {
    return <LoadingState title="Lade Rollen …" description="Rollen und Aktionen werden geladen." />
  }

  if (error) {
    return <ErrorState title="Fehler beim Laden" description={error} />
  }

  return (
    <div>
      <PageHeader
        title="Rollen"
        description="Wer besitzt eine Rolle, und was darf sie standardmäßig? Beides an einem Ort — Auswahl links, Details rechts."
      />

      <div className={styles.workspace}>
        <RoleRail
          roles={matrix?.roles ?? []}
          selectedRoleCode={selectedRoleCode}
          onSelectRole={handleSelectRole}
          railRef={railRef}
        />
        {selectedRole ? (
          <RoleDetailPanel
            role={selectedRole}
            activeTabId={activeTabId}
            onActiveTabIdChange={setActiveTabId}
            holders={holders}
            isHoldersLoading={isHoldersLoading}
            holdersError={holdersError}
            onRequestChange={handleRequestChange}
            openCategories={openCategories}
            onOpenCategoriesChange={setOpenCategories}
          />
        ) : (
          <EmptyState title="Rolle auswählen." description="" />
        )}
      </div>

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
