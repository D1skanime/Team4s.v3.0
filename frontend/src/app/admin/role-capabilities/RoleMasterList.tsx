'use client'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { RoleEntry } from '@/types/admin-capability'

export interface RoleMasterListProps {
  roles: RoleEntry[]
  selectedRoleCode: string | null
  onSelectRole: (roleCode: string) => void
}

/**
 * Rendert den Impact-Count für die Rolle→User-Querverlinkung (D-05).
 *
 * Zählbarkeit entscheidet sich über `global_assignment_count != null`, NICHT über
 * `assignable === true` (111-RESEARCH.md Pitfall 1 — `assignable` markiert die
 * gruppenzuweisbaren Rollen, nie eine der drei globalen App-Rollen).
 */
function renderImpactCount(role: RoleEntry) {
  if (role.global_assignment_count == null) {
    return (
      <span
        title="Nur global vergebene Rollen werden gezählt"
        style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}
      >
        –
      </span>
    )
  }

  if (role.global_assignment_count > 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        href={`/admin/users?role=${role.role_code}`}
        aria-label={`${role.global_assignment_count} Benutzer mit Rolle ${role.label_de} anzeigen`}
      >
        {role.global_assignment_count}× vergeben
      </Button>
    )
  }

  return <Badge variant="muted">0× vergeben</Badge>
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
        const badgeLabel =
          role.role_kind === 'global_app_role'
            ? 'Globale App-Rolle'
            : !isEditable
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
                outline: isSelected ? '2px solid var(--color-primary)' : undefined,
              }}
            >
              {/* Auswahl-Button (Label + Kontext-Badge) und Impact-Count als Geschwister-
                  Elemente derselben Zeile — verschachtelte interaktive Elemente (Button/Link
                  im Button) sind ungültiges HTML und würden Klicks fehlerhaft bubbeln lassen. */}
              <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
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
                    flex: 1,
                    minWidth: 0,
                    background: 'none',
                    border: 'none',
                    padding: 'var(--space-3)',
                    textAlign: 'left',
                    cursor: isEditable ? 'pointer' : 'not-allowed',
                    opacity: isEditable ? 1 : 0.7,
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 var(--space-3)',
                  }}
                >
                  {renderImpactCount(role)}
                </div>
              </div>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
