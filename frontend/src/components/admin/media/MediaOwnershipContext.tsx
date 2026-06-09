'use client'

import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'

import { Badge, Card, ErrorState, FormField, Select } from '@/components/ui'

import { STATUS_LABEL_MAPPING, STATUS_LABELS_ORDERED } from './mediaStatusMapping'
import type { StatusLabel } from './mediaStatusMapping'
import styles from './MediaOwnershipContext.module.css'

export interface MediaOwnershipContextProps {
  /** Fachlicher Besitzkontext aus der Upload-Fläche (D-05). */
  ownerType: 'fansub_group' | 'anime' | 'release_theme' | 'release_version' | 'member'
  /** Owner-ID; null oder <= 0 blockiert den Upload (D-06). */
  ownerID: number | null
  /** Anzeigename des fachlichen Besitzers; bleibt API-kompatibel, wird aber nicht sichtbar gerendert. */
  ownerLabel: string
  /** slot = read-only Badge; dropdown = echtes Select (D-08). */
  categoryMode: 'slot' | 'dropdown'
  /** Fix-Wert für Slot-Surfaces. */
  categoryValue?: string
  /** Optionen für Dropdown-Surfaces. */
  categoryOptions?: Array<{ value: string; label: string }>
  /** immediate = Branding sofort sichtbar (D-09); in_review = Standard-Default (D-03). */
  statusPolicy: 'immediate' | 'in_review'
  /** Sperrt alle Felder während Upload. */
  disabled?: boolean
  /** Callback liefert aktuellen Kontext-Zustand. */
  onContextChange: (ctx: MediaOwnershipContextValue) => void
}

export interface MediaOwnershipContextValue {
  /** false -> Upload blockieren (D-06). */
  ownerResolved: boolean
  /** Sichtbarkeits-Code für Backend-Übergabe (D-02). */
  visibilityCode: string
  /** Reviewstatus-Code für Backend-Übergabe (D-02). */
  reviewStatusCode: string
  /** Gewählte Kategorie. */
  categoryValue: string
}

function isOwnerValid(ownerID: number | null): boolean {
  return ownerID !== null && ownerID > 0
}

function defaultStatusLabel(policy: 'immediate' | 'in_review'): StatusLabel {
  return policy === 'immediate' ? 'öffentlich' : 'in Prüfung'
}

/**
 * Gemeinsamer Media-Kontext für Upload-Surfaces.
 *
 * Die Komponente hält den Owner-Guard intern aktiv, rendert aber keine
 * technischen Ownership-Hinweise in der UI.
 */
export function MediaOwnershipContext({
  ownerID,
  categoryMode,
  categoryValue,
  categoryOptions,
  statusPolicy,
  disabled = false,
  onContextChange,
}: MediaOwnershipContextProps) {
  const ownerResolved = isOwnerValid(ownerID)
  const [selectedLabel, setSelectedLabel] = useState<StatusLabel>(
    defaultStatusLabel(statusPolicy),
  )
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categoryValue ?? '',
  )

  useEffect(() => {
    if (!ownerResolved) {
      onContextChange({
        ownerResolved: false,
        visibilityCode: '',
        reviewStatusCode: '',
        categoryValue: '',
      })
      return
    }

    const resolvedCategory = categoryMode === 'slot' ? (categoryValue ?? '') : selectedCategory

    if (statusPolicy === 'immediate') {
      onContextChange({
        ownerResolved: true,
        visibilityCode: 'public',
        reviewStatusCode: 'approved',
        categoryValue: resolvedCategory,
      })
      return
    }

    const axes = STATUS_LABEL_MAPPING[selectedLabel]
    onContextChange({
      ownerResolved: true,
      visibilityCode: axes.visibilityCode,
      reviewStatusCode: axes.reviewStatusCode,
      categoryValue: resolvedCategory,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerResolved, statusPolicy, selectedLabel, selectedCategory, categoryValue, categoryMode])

  if (!ownerResolved) {
    return (
      <ErrorState
        title="Upload nicht möglich"
        description="Dieser Upload-Bereich konnte nicht eindeutig zugeordnet werden. Bitte lade die Seite neu oder öffne den Upload erneut aus dem zugehörigen Bereich."
      />
    )
  }

  function handleStatusChange(e: ChangeEvent<HTMLSelectElement>) {
    setSelectedLabel(e.target.value as StatusLabel)
  }

  function handleCategoryChange(e: ChangeEvent<HTMLSelectElement>) {
    setSelectedCategory(e.target.value)
  }

  return (
    <Card variant="nestedFlat" className={styles.ownerContextCard}>
      <div className={styles.fieldStack}>
        {categoryMode === 'slot' ? (
          <div>
            <Badge variant="neutral">{categoryValue}</Badge>
          </div>
        ) : (
          <FormField
            label="Kategorie"
            htmlFor="media-ownership-category"
            hint="Die Kategorie ergibt sich aus diesem Upload-Bereich."
            disabled={disabled}
          >
            <Select
              id="media-ownership-category"
              value={selectedCategory}
              onChange={handleCategoryChange}
              disabled={disabled}
            >
              <option value="">Bitte auswählen ...</option>
              {(categoryOptions ?? []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {statusPolicy === 'immediate' ? (
          <p className={styles.ownerHint}>
            Dieses Medium ist Teil der öffentlichen Identität und wird sofort sichtbar.
          </p>
        ) : (
          <FormField
            label="Status"
            htmlFor="media-ownership-status"
            hint="Neue Uploads starten in «in Prüfung» und werden im Review freigegeben."
            disabled={disabled}
          >
            <Select
              id="media-ownership-status"
              value={selectedLabel}
              onChange={handleStatusChange}
              disabled={disabled}
            >
              {STATUS_LABELS_ORDERED.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
        )}
      </div>
    </Card>
  )
}
