'use client'

import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { RoleEntry } from '@/types/admin-capability'

export interface RoleMasterListProps {
  roles: RoleEntry[]
  selectedRoleCode: string | null
  onSelectRole: (roleCode: string) => void
}

/**
 * Master-Rollenliste für die Capability-Verwaltung (D-11/D-13).
 *
 * Zeigt jede Rolle als anklickbaren Card-Row mit Kontext-Badge (Gap G4):
 * - capability_editable && assignable   → "Aktive App-Rolle" (Gruppenrolle, editierbar)
 * - capability_editable && !assignable  → "Projekt-/Release-Rolle" (Contribution-Rolle, editierbar)
 * - !capability_editable                → "Historische Rolle" (gesperrt, aria-disabled)
 */
export function RoleMasterList({ roles, selectedRoleCode, onSelectRole }: RoleMasterListProps) {
  if (roles.length === 0) {
    return (
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
        Keine Rollen gefunden.
      </p>
    )
  }

  return (
    <div role="list" aria-label="Rollenliste">
      {roles.map((role) => {
        // Editierbarkeit hängt an capability_editable (aktiver Kontext), NICHT an assignable
        // (nur Gruppen-Picker) — so sind auch Contribution-Rollen wie encoder editierbar (G4).
        const isEditable = role.capability_editable !== false
        const isAssignable = role.assignable === true
        const badgeLabel = !isEditable
          ? 'Historische Rolle'
          : isAssignable
            ? 'Aktive App-Rolle'
            : 'Projekt-/Release-Rolle'
        const isSelected = role.role_code === selectedRoleCode

        return (
          <div key={role.role_code} role="listitem">
            <Card
              variant="interactive"
              style={{
                marginBottom: 'var(--space-2)',
                cursor: isEditable ? 'pointer' : 'default',
                opacity: isEditable ? 1 : 0.7,
                outline: isSelected ? '2px solid var(--color-primary)' : undefined,
              }}
            >
              <button
                type="button"
                aria-disabled={!isEditable || undefined}
                aria-pressed={isSelected}
                onClick={() => {
                  if (isEditable) {
                    onSelectRole(role.role_code)
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-1)',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: 'var(--space-3)',
                  textAlign: 'left',
                  cursor: isEditable ? 'pointer' : 'not-allowed',
                  minHeight: '44px',
                }}
              >
                <span
                  style={{
                    fontWeight: 500,
                    fontSize: '0.9375rem',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {role.label_de}
                </span>
                <Badge variant={isEditable ? 'info' : 'muted'}>
                  {badgeLabel}
                </Badge>
              </button>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
