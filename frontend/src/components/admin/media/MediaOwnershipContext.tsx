'use client'

import { useEffect, useState } from 'react'

import { Badge, Card, ErrorState, FormField, Select } from '@/components/ui'

import { STATUS_LABEL_MAPPING, STATUS_LABELS_ORDERED } from './mediaStatusMapping'
import type { StatusLabel } from './mediaStatusMapping'
import styles from './MediaOwnershipContext.module.css'

// ─── Öffentliche Interfaces ──────────────────────────────────────────────────

export interface MediaOwnershipContextProps {
  /** Owner-Typ aus der Upload-Fläche (D-05) */
  ownerType: 'fansub_group' | 'anime' | 'release_theme' | 'release_version' | 'member'
  /** Owner-ID; null oder ≤ 0 blockiert den Upload (D-06) */
  ownerID: number | null
  /** Anzeigename im Owner-Chip */
  ownerLabel: string
  /** slot = read-only Badge; dropdown = echtes Select (D-08) */
  categoryMode: 'slot' | 'dropdown'
  /** Fix-Wert für Slot-Surfaces */
  categoryValue?: string
  /** Optionen für Dropdown-Surfaces */
  categoryOptions?: Array<{ value: string; label: string }>
  /** immediate = Branding sofort sichtbar (D-09); in_review = Standard-Default (D-03) */
  statusPolicy: 'immediate' | 'in_review'
  /** Sperrt alle Felder während Upload */
  disabled?: boolean
  /** Callback liefert aktuellen Kontext-Zustand */
  onContextChange: (ctx: MediaOwnershipContextValue) => void
}

export interface MediaOwnershipContextValue {
  /** false → Upload blockieren (D-06) */
  ownerResolved: boolean
  /** Sichtbarkeits-Code für Backend-Übergabe (D-02) */
  visibilityCode: string
  /** Reviewstatus-Code für Backend-Übergabe (D-02) */
  reviewStatusCode: string
  /** Gewählte Kategorie */
  categoryValue: string
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function isOwnerValid(ownerID: number | null): boolean {
  return ownerID !== null && ownerID > 0
}

function defaultStatusLabel(policy: 'immediate' | 'in_review'): StatusLabel {
  return policy === 'immediate' ? 'öffentlich' : 'in Prüfung'
}

// ─── Komponente ──────────────────────────────────────────────────────────────

/**
 * D-07: Gemeinsame Pflichtfeld-/Owner-Kontext-Komponente.
 *
 * Zeigt Owner-Hinweis-Chip (D-05), Kategorie-Feld (D-08) und Status-Feld (D-01/D-02).
 * Blockiert bei ungültigem Owner (D-06). Unterscheidet Branding- vs. Prozessmedien-Flow (D-09).
 */
export function MediaOwnershipContext({
  ownerType,
  ownerID,
  ownerLabel,
  categoryMode,
  categoryValue,
  categoryOptions,
  statusPolicy,
  disabled = false,
  onContextChange,
}: MediaOwnershipContextProps) {
  const ownerResolved = isOwnerValid(ownerID)

  // Default-Status je Policy
  const [selectedLabel, setSelectedLabel] = useState<StatusLabel>(
    defaultStatusLabel(statusPolicy),
  )

  // Kategorie-Zustand (für dropdown-Mode)
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categoryValue ?? categoryOptions?.[0]?.value ?? '',
  )

  // ─── D-06: Owner-Guard ───────────────────────────────────────────────────
  // Wenn Owner nicht auflösbar → sofort Callback mit ownerResolved=false und ErrorState zeigen
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

    // Owner gültig → Kontext-Werte aus gewähltem Status / Policy ableiten
    if (statusPolicy === 'immediate') {
      onContextChange({
        ownerResolved: true,
        visibilityCode: 'public',
        reviewStatusCode: 'approved',
        categoryValue: categoryMode === 'slot' ? (categoryValue ?? '') : selectedCategory,
      })
    } else {
      const axes = STATUS_LABEL_MAPPING[selectedLabel]
      onContextChange({
        ownerResolved: true,
        visibilityCode: axes.visibilityCode,
        reviewStatusCode: axes.reviewStatusCode,
        categoryValue: categoryMode === 'slot' ? (categoryValue ?? '') : selectedCategory,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerResolved, statusPolicy, selectedLabel, selectedCategory, categoryValue, categoryMode])

  // ─── D-06: ErrorState bei ungültigem Owner ───────────────────────────────
  if (!ownerResolved) {
    return (
      <ErrorState
        title="Upload nicht möglich"
        description="Dieser Upload-Bereich hat keinen gültigen Owner-Kontext. Bitte lade die Seite neu oder öffne den Upload erneut aus dem zugehörigen Bereich."
      />
    )
  }

  // ─── Owner-Chip Label (D-05) ─────────────────────────────────────────────
  const ownerTypeLabel: Record<MediaOwnershipContextProps['ownerType'], string> = {
    fansub_group: 'Gruppe',
    anime: 'Anime',
    release_theme: 'Release-Theme',
    release_version: 'Release-Version',
    member: 'Mitglied',
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedLabel(e.target.value as StatusLabel)
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedCategory(e.target.value)
  }

  return (
    <Card variant="nestedFlat" className={styles.ownerContextCard}>
      <div className={styles.fieldStack}>
        {/* D-05: Owner-Chip — read-only, nie editierbar */}
        <div>
          <div className={styles.ownerChipRow}>
            <Badge variant="info">
              Upload für: {ownerLabel} · Owner-Typ: {ownerTypeLabel[ownerType]}
            </Badge>
          </div>
          <p className={styles.ownerHint}>
            Der Owner ergibt sich aus diesem Bereich und kann nicht geändert werden.
          </p>
        </div>

        {/* D-08: Kategorie */}
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
              {(categoryOptions ?? []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {/* D-09/D-03: Status */}
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
