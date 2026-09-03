'use client'

import { Button, ErrorState, LoadingState, Tabs } from '@/components/ui'
import type { RoleEntry, RoleHolderEntry } from '@/types/admin-capability'
import { roleKindLabel, rowCountText } from './RoleRail'
import { RoleCapabilityDetail } from './RoleCapabilityDetail'
import { RoleHoldersTable } from './RoleHoldersTable'

export interface RoleDetailPanelProps {
  role: RoleEntry
  activeTabId: string
  onActiveTabIdChange: (id: string) => void
  holders: RoleHolderEntry[]
  isHoldersLoading: boolean
  holdersError: string | null
  onRequestChange: (actionCode: string, add: boolean) => void
  openCategories: Set<string>
  onOpenCategoriesChange: (next: Set<string>) => void
}

export function holderCountText(role: RoleEntry, holders: RoleHolderEntry[], isHoldersLoading: boolean): string {
  if (role.role_kind === 'global_app_role') {
    const count = role.global_assignment_count ?? 0
    return count > 0 ? `${rowCountText(role)} vergeben` : 'Noch niemandem zugewiesen'
  }
  // 145-03: die reservierte Mitgliedschafts-Grundausstattung hat keine eigene Inhaberliste --
  // ohne diesen Zweig würde hier ein stehengebliebener Inhaber-Count der zuvor ausgewählten
  // Rolle angezeigt, da loadHolders() für diese Rolle nie aufgerufen wird und `holders` beim
  // Rollenwechsel nicht zurückgesetzt wird.
  if (role.role_kind === 'reserved_baseline') return '–'
  if (isHoldersLoading) return 'Inhaber werden geladen …'
  return `${holders.length} Inhaber`
}

/**
 * Subjekt-Header + Tabs (Inhaber/Standardrechte) für die im Rollen-Arbeitsbereich
 * ausgewählte Rolle (D-07/D-08). Rein präsentational -- keine eigenen Datenaufrufe,
 * State/Fetch-Orchestrierung lebt vollständig in RolesClient.tsx.
 */
export function RoleDetailPanel({
  role,
  activeTabId,
  onActiveTabIdChange,
  holders,
  isHoldersLoading,
  holdersError,
  onRequestChange,
  openCategories,
  onOpenCategoriesChange,
}: RoleDetailPanelProps) {
  const isGlobalRole = role.role_kind === 'global_app_role'
  const isReservedBaseline = role.role_kind === 'reserved_baseline'

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
          marginBottom: 'var(--space-4)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-strong)' }}>{role.label_de}</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>{roleKindLabel(role)}</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
          {holderCountText(role, holders, isHoldersLoading)}
        </span>
      </div>

      <Tabs
        activeId={activeTabId}
        onActiveIdChange={onActiveTabIdChange}
        items={[
          {
            id: 'holders',
            label: 'Inhaber',
            content: isGlobalRole ? (
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-soft)' }}>
                  Globale App-Rollen werden nicht gruppenbezogen verwaltet — wer diese Rolle
                  besitzt, zeigt die Benutzerliste.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  href={`/admin/users?role=${encodeURIComponent(role.role_code)}`}
                >
                  Benutzer mit dieser Rolle anzeigen
                </Button>
              </div>
            ) : isReservedBaseline ? (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-soft)' }}>
                Diese Grundausstattung wird nicht einzeln zugewiesen — jedes aktive Mitglied
                jeder Fansub-Gruppe besitzt sie automatisch. Es gibt daher keine gesonderte
                Inhaberliste.
              </p>
            ) : isHoldersLoading ? (
              <LoadingState title="Lade Rolleninhaber …" description="" />
            ) : holdersError ? (
              <ErrorState title="Fehler beim Laden" description={holdersError} />
            ) : (
              <RoleHoldersTable holders={holders} />
            ),
          },
          {
            id: 'caps',
            label: 'Standardrechte',
            content: (
              <RoleCapabilityDetail
                role={role}
                onRequestChange={onRequestChange}
                inlineError={null}
                openCategories={openCategories}
                onOpenCategoriesChange={onOpenCategoriesChange}
              />
            ),
          },
        ]}
      />
    </div>
  )
}
