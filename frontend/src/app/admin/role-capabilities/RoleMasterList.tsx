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
 * Zeigt jede Rolle als anklickbaren Card-Row mit Kontext-Badge:
 * - assignable=true  → Badge "Aktive App-Rolle" (variant=info)
 * - assignable=false → Badge "Historische Rolle" (variant=muted) + aria-disabled
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
        const isAssignable = role.assignable !== false
        const isSelected = role.role_code === selectedRoleCode

        return (
          <div key={role.role_code} role="listitem">
            <Card
              variant="interactive"
              style={{
                marginBottom: 'var(--space-2)',
                cursor: isAssignable ? 'pointer' : 'default',
                opacity: isAssignable ? 1 : 0.7,
                outline: isSelected ? '2px solid var(--color-primary)' : undefined,
              }}
            >
              <button
                type="button"
                aria-disabled={!isAssignable || undefined}
                aria-pressed={isSelected}
                onClick={() => {
                  if (isAssignable) {
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
                  cursor: isAssignable ? 'pointer' : 'not-allowed',
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
                <Badge variant={isAssignable ? 'info' : 'muted'}>
                  {isAssignable ? 'Aktive App-Rolle' : 'Historische Rolle'}
                </Badge>
              </button>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
