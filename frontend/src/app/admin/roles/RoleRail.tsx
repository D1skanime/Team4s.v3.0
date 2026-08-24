'use client'

import type { Ref } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import type { RoleEntry } from '@/types/admin-capability'
import styles from './roles.module.css'

export interface RoleRailProps {
  roles: RoleEntry[]
  selectedRoleCode: string | null
  onSelectRole: (roleCode: string) => void
  railRef?: Ref<HTMLDivElement>
}

/**
 * Kontext-Chip-Text je Rolle (GAP-04 D-08 -- kanonisch, portiert 1:1 aus der ehemaligen
 * RoleMasterList.tsx, siehe 260824-ek3-PLAN.md Interfaces-Block).
 */
export function roleKindLabel(role: RoleEntry): string {
  const isEditable = role.capability_editable !== false
  const isAssignable = role.assignable === true
  if (role.role_kind === 'global_app_role') return 'Globale App-Rolle'
  if (!isEditable) return 'Historische Rolle'
  if (isAssignable) return 'Aktive App-Rolle'
  return 'Projekt-/Release-Rolle'
}

/**
 * Inhaberzahl-Text je Rolle (D-05). Dash für Gruppen-/Contribution-Rollen, da ohne neues
 * Backend-Feld kein günstiger Pro-Zeile-Count existiert; echte Zahl nur für die drei
 * synthetischen globalen Zeilen. Reiner Text -- KEIN Link (die "Benutzer anzeigen"-Aktion
 * wandert für globale Rollen ins Detail-Panel, siehe RoleDetailPanel.tsx, GAP-04-Befund-1).
 */
export function rowCountText(role: RoleEntry): string {
  if (role.global_assignment_count == null) return '–'
  return `${role.global_assignment_count}×`
}

interface RoleRowProps {
  role: RoleEntry
  isSelected: boolean
  onSelectRole: (roleCode: string) => void
}

function RoleRow({ role, isSelected, onSelectRole }: RoleRowProps) {
  return (
    <div role="listitem" key={role.role_code}>
      <Button
        type="button"
        variant="ghost"
        className={styles.roleRow}
        data-role-code={role.role_code}
        aria-current={isSelected ? 'true' : 'false'}
        onClick={() => onSelectRole(role.role_code)}
      >
        <span className={styles.roleRowName}>{role.label_de}</span>
        <span className={styles.roleRowMeta}>{roleKindLabel(role)}</span>
        <span className={styles.roleRowCount}>{rowCountText(role)}</span>
      </Button>
    </div>
  )
}

/**
 * Kompakte, registry-getriebene, vollflächig klickbare Rollenliste (GAP-04, D-08).
 *
 * Gruppiert `roles` in "Globale Rollen" (role_kind === 'global_app_role') und
 * "Gruppenrollen" (alle anderen) -- Reihenfolge innerhalb jeder Gruppe bleibt die von der
 * API gelieferte Reihenfolge. Jede Zeile ist EIN einziger Button (kein zweites
 * fokussierbares Element), trägt aria-current und data-role-code (für das
 * Scroll-into-View in RolesClient.tsx, GAP-05).
 */
export function RoleRail({ roles, selectedRoleCode, onSelectRole, railRef }: RoleRailProps) {
  const globalRoles = roles.filter((r) => r.role_kind === 'global_app_role')
  const groupRoles = roles.filter((r) => r.role_kind !== 'global_app_role')

  return (
    <div className={styles.rail}>
      <div className={styles.railScroll} ref={railRef} role="list" aria-label="Rollenliste">
        {roles.length === 0 ? (
          <EmptyState title="Keine Rollen gefunden." description="" />
        ) : (
          <>
            {globalRoles.length > 0 && (
              <>
                <p className={styles.railGroupLabel}>Globale Rollen</p>
                {globalRoles.map((role) => (
                  <RoleRow
                    key={role.role_code}
                    role={role}
                    isSelected={role.role_code === selectedRoleCode}
                    onSelectRole={onSelectRole}
                  />
                ))}
              </>
            )}
            {groupRoles.length > 0 && (
              <>
                <p className={styles.railGroupLabel}>Gruppenrollen</p>
                {groupRoles.map((role) => (
                  <RoleRow
                    key={role.role_code}
                    role={role}
                    isSelected={role.role_code === selectedRoleCode}
                    onSelectRole={onSelectRole}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
