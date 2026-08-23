'use client'

import { useMemo } from 'react'
import { Accordion } from '@/components/ui/Accordion'
import { Switch } from '@/components/ui/Switch'
import type { RoleEntry } from '@/types/admin-capability'
import { categoryDisplayLabel } from './capabilityCategories'

// Deliberate Reihenfolge der 7 realen Kategorien (138-RESEARCH.md Pitfall 2, Plan 138-13);
// unbekannte Kategorien fallen alphabetisch ans Ende (siehe sortedCats unten).
const CATEGORY_ORDER = [
  'gruppe',
  'gruppenmedien',
  'gruppenseite',
  'projekt',
  'rechteverwaltung',
  'release',
  'review',
]

export interface RoleCapabilityDetailProps {
  role: RoleEntry
  /**
   * Ersetzt die vormals direkten onGrant/onRevoke-Mutationsaufrufe (Plan 138-13, D-18): ein
   * Switch-Toggle löst NIEMALS mehr eine sofortige Mutation aus, sondern fordert nur an, dass
   * der Parent (RoleCapabilityClient.tsx) den RoleCapabilityImpactPreviewModal für
   * (actionCode, add) öffnet -- die eigentliche Vergabe/Entziehung passiert erst nach einer
   * im Dialog bestätigten, resolver-gestützten Vorschau.
   */
  onRequestChange: (actionCode: string, add: boolean) => void
  /** Inline-Fehler (z.B. 422 role_not_assignable oder 409 lockout_guard). */
  inlineError: string | null
  /**
   * Controlled Accordion-Open-Zustand (Kategorie-IDs). Vom Parent gehalten,
   * damit eine aufgeklappte Kategorie nach einem Switch-Toggle / Daten-Refresh
   * offen bleibt.
   */
  openCategories: Set<string>
  onOpenCategoriesChange: (next: Set<string>) => void
}

/**
 * Kategorisierte Detail-Ansicht für eine Rolle (D-11/D-12).
 *
 * - Gruppiert actions nach category → je Kategorie ein Accordion-Item.
 * - Pro Capability eine Row mit Switch (checked = granted).
 * - Bei role.capability_editable === false (rein historische Rolle) alle Switches disabled.
 */
export function RoleCapabilityDetail({
  role,
  onRequestChange,
  inlineError,
  openCategories,
  onOpenCategoriesChange,
}: RoleCapabilityDetailProps) {
  const isEditable = role.capability_editable !== false

  const accordionItems = useMemo(() => {
    // Aktionen nach Kategorie gruppieren
    const byCategory = new Map<string, typeof role.actions>()
    for (const action of role.actions) {
      const existing = byCategory.get(action.category) ?? []
      existing.push(action)
      byCategory.set(action.category, existing)
    }

    // Deterministische Reihenfolge: CATEGORY_ORDER zuerst, unbekannte Kategorien alphabetisch ans Ende
    const sortedCats = [...byCategory.keys()].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a)
      const bi = CATEGORY_ORDER.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })

    return sortedCats.map((cat) => {
      const actions = byCategory.get(cat) ?? []
      return {
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
                    disabled={!isEditable}
                    aria-label={action.label_de}
                    onCheckedChange={(next) => {
                      if (!isEditable) return
                      // Kein sofortiges Speichern (D-18): nur den Impact-Preview-Dialog
                      // anfordern; `checked` bleibt bis zur bestätigten Mutation + Refresh
                      // unverändert (keine optimistische Vorab-Änderung, T-138-24).
                      onRequestChange(action.code, next)
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        ),
      }
    })
  }, [role, isEditable, onRequestChange])

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
        {!isEditable && (
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
        <Accordion
          items={accordionItems}
          mode="multi"
          openIds={openCategories}
          onOpenChange={onOpenCategoriesChange}
        />
      )}
    </div>
  )
}
