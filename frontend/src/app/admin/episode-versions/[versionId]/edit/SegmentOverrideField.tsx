'use client'

import { Switch, FormField, Input, Button } from '@/components/ui'
import { formatTimeInput, parseFlexibleTimeInput } from './SegmenteTab.helpers'
import styles from './SegmenteTab.module.css'

interface SegmentOverrideFieldProps {
  isSharedSegment: boolean
  overrideEnabled: boolean
  onOverrideToggle: (next: boolean) => void
  currentEpisodeLabel: string
  overrideStartTime: string
  onOverrideStartTimeChange: (value: string) => void
  computedOverrideEndTime: string | null
  baseDurationSeconds: number | null
  overrideDisplayError: string | null
  currentReleaseHasOverride: boolean
  onRemoveOverrideClick: () => void
  isSavingOverride: boolean
}

/**
 * Per-Folge Zeit-Override-Block (UI-SPEC Surface 1) -- nur bei geteilten Segmenten. Aus
 * SegmentEditPanel.tsx extrahiert (Phase 156, Plan 156-14, Dateigroessen-Vorgabe aus
 * 156-UAT.md), reine Praesentationskomponente: alle abgeleiteten Werte (Fehlermeldung,
 * berechnete Endzeit, Basis-Dauer) kommen fertig aus SegmentEditPanel.tsx.
 */
export function SegmentOverrideField({
  isSharedSegment,
  overrideEnabled,
  onOverrideToggle,
  currentEpisodeLabel,
  overrideStartTime,
  onOverrideStartTimeChange,
  computedOverrideEndTime,
  baseDurationSeconds,
  overrideDisplayError,
  currentReleaseHasOverride,
  onRemoveOverrideClick,
  isSavingOverride,
}: SegmentOverrideFieldProps) {
  if (!isSharedSegment) return null

  return (
    <div className={styles.panelField}>
      <Switch
        checked={overrideEnabled}
        onCheckedChange={onOverrideToggle}
        label="Zeit nur für diese Folge abweichend setzen"
        disabled={isSavingOverride}
      />
      {overrideEnabled ? (
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
            Zeit-Override für Folge {currentEpisodeLabel}
          </h4>
          <FormField
            label={`Start (Folge ${currentEpisodeLabel})`}
            htmlFor="segment-override-start"
            hint="Nur Startzeit — Dauer bleibt gleich wie Basis. Ende wird automatisch berechnet."
            error={overrideDisplayError ?? undefined}
          >
            <Input
              id="segment-override-start"
              type="text"
              inputMode="numeric"
              placeholder="z. B. 0:00"
              value={overrideStartTime}
              onChange={(e) => onOverrideStartTimeChange(e.target.value)}
              onBlur={(e) => {
                const parsed = parseFlexibleTimeInput(e.target.value)
                if (parsed != null) onOverrideStartTimeChange(formatTimeInput(parsed))
              }}
            />
          </FormField>
          <p className={styles.sourceHelpText}>
            {`Ende (automatisch): ${computedOverrideEndTime ?? '—'} · gleiche Dauer wie Basis (${formatTimeInput(baseDurationSeconds ?? 0)})`}
          </p>
          <p className={styles.sourceHelpText}>Nur Startzeit — Dauer bleibt gleich wie Basis</p>
          {currentReleaseHasOverride ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onRemoveOverrideClick}
              disabled={isSavingOverride}
            >
              Override entfernen
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
