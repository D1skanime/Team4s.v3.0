'use client'

import { Accordion } from '@/components/ui/Accordion'
import { Switch } from '@/components/ui/Switch'
import type { RoleEntry } from '@/types/admin-capability'
import { categoryDisplayLabel } from './capabilityCategories'

export interface RoleCapabilityDetailProps {
  role: RoleEntry
  onGrant: (roleCode: string, actionCode: string) => void
  onRevoke: (roleCode: string, actionCode: string) => void
  /** Inline-Fehler (z.B. 422 role_not_assignable oder 409 lockout_guard). */
  inlineError: string | null
}

/**
 * Kategorisierte Detail-Ansicht für eine Rolle (D-11/D-12).
 *
 * - Gruppiert actions nach category → je Kategorie ein Accordion-Item.
 * - Pro Capability eine Row mit Switch (checked = granted).
 * - Bei role.assignable === false alle Switches disabled.
 */
export function RoleCapabilityDetail({
  role,
  onGrant,
  onRevoke,
  inlineError,
}: RoleCapabilityDetailProps) {
  const isAssignable = role.assignable !== false

  // Aktionen nach Kategorie gruppieren
  const byCategory = new Map<string, typeof role.actions>()
  for (const action of role.actions) {
    const existing = byCategory.get(action.category) ?? []
    existing.push(action)
    byCategory.set(action.category, existing)
  }

  const accordionItems = Array.from(byCategory.entries()).map(([cat, actions]) => ({
    id: cat,
    title: categoryDisplayLabel(cat),
    children: (
      <div>
        {actions.map((action) => (
          <div
            key={action.code}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-3)',
              borderBottom: '1px solid var(--color-border)',
              minHeight: '44px',
            }}
          >
            <span
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-primary)',
                flex: 1,
              }}
            >
              {action.label_de}
            </span>
            {action.standalone ? (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                  fontStyle: 'italic',
                }}
              >
                Systemaktion
              </span>
            ) : (
              <Switch
                checked={action.granted}
                disabled={!isAssignable}
                aria-label={action.label_de}
                onCheckedChange={(next) => {
                  if (!isAssignable) return
                  if (next) {
                    onGrant(role.role_code, action.code)
                  } else {
                    onRevoke(role.role_code, action.code)
                  }
                }}
              />
            )}
          </div>
        ))}
      </div>
    ),
  }))

  return (
    <div>
      {/* Rollenüberschrift */}
      <div
        style={{
          marginBottom: 'var(--space-3)',
          paddingBottom: 'var(--space-2)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          {role.label_de}
        </h3>
        {!isAssignable && (
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
              marginTop: 'var(--space-1)',
            }}
          >
            Historische Rolle — Capabilities können nicht bearbeitet werden.
          </p>
        )}
      </div>

      {/* Inline-Fehler */}
      {inlineError && (
        <div
          role="alert"
          style={{
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
            background: 'var(--color-danger-bg, #fef2f2)',
            border: '1px solid var(--color-danger-border, #fca5a5)',
            borderRadius: 'var(--radius)',
            color: 'var(--color-danger, #dc2626)',
            fontSize: '0.875rem',
          }}
        >
          {inlineError}
        </div>
      )}

      {accordionItems.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          Keine Capabilities für diese Rolle.
        </p>
      ) : (
        <Accordion items={accordionItems} mode="multi" />
      )}
    </div>
  )
}
