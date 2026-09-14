'use client'

import type { GenericSegmentThemeOption } from './useReleaseSegments'
import type { FormState } from './SegmentEditPanel'
import { formatTimeInput, parseFlexibleTimeInput } from './SegmenteTab.helpers'
import styles from './SegmenteTab.module.css'

interface SegmentBasicFieldsSectionProps {
  formState: FormState
  onFormChange: (patch: Partial<FormState>) => void
  genericThemeOptions: GenericSegmentThemeOption[]
  isSharedSegment: boolean
  runtimeKnown: boolean
  runtimeFromPlayback: boolean
  effectiveDuration: number | null
  isStartTimeError: boolean
  isEndTimeError: boolean
  formError: string | null
  isMissingEpisodeRange: boolean
  hasInvalidEpisodeValue: boolean
  hasInvalidEpisodeRange: boolean
  isMissingTimeRange: boolean
  hasInvalidTimeInput: boolean
  exceedsDuration: boolean
  startSeconds: number | null
  endSeconds: number | null
  exceedsMaxSegmentWindow: boolean
}

/**
 * Typ/Name-Felder plus Episoden- und Zeitbereich (samt Validierungsmeldungen), aus
 * SegmentEditPanel.tsx extrahiert (Phase 156, Plan 156-14, Dateigroessen-Vorgabe aus
 * 156-UAT.md). Reine Praesentationskomponente -- alle Validierungs-Flags werden fertig aus
 * SegmentEditPanel.tsx uebergeben, hier findet keine eigene Berechnung statt.
 */
export function SegmentBasicFieldsSection({
  formState,
  onFormChange,
  genericThemeOptions,
  isSharedSegment,
  runtimeKnown,
  runtimeFromPlayback,
  effectiveDuration,
  isStartTimeError,
  isEndTimeError,
  formError,
  isMissingEpisodeRange,
  hasInvalidEpisodeValue,
  hasInvalidEpisodeRange,
  isMissingTimeRange,
  hasInvalidTimeInput,
  exceedsDuration,
  startSeconds,
  endSeconds,
  exceedsMaxSegmentWindow,
}: SegmentBasicFieldsSectionProps) {
  return (
    <>
      <div className={styles.panelField}>
        <label htmlFor="segment-type">Typ</label>
        <select
          id="segment-type"
          value={formState.themeKind}
          onChange={(e) => onFormChange({ themeKind: e.target.value })}
        >
          <option value="">-- Typ auswählen --</option>
          {genericThemeOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.panelField}>
        <label htmlFor="segment-name">Name (optional)</label>
        <input
          id="segment-name"
          type="text"
          placeholder="z. B. Naruto OP 1"
          value={formState.themeTitle}
          onChange={(e) => onFormChange({ themeTitle: e.target.value })}
        />
        <span className={styles.sourceHelpText}>
          Gleicher Typ plus gleicher Name wird wiederverwendet. Ein neuer Name erzeugt bei Bedarf automatisch ein neues Theme.
        </span>
      </div>

      <div className={styles.panelField}>
        <label>Episodenbereich</label>
        <span className={styles.sourceHelpText}>
          Von und Bis werden gespeichert. Für eine einzelne Folge beide Felder gleich setzen.
        </span>
        <span className={styles.sourceHelpText}>
          Wird den freien Folgen im Bereich zugewiesen. Bereits belegte Folgen für denselben Typ
          werden übersprungen und nach dem Speichern angezeigt. OP und ED sind unabhängig.
        </span>
      </div>
      <div className={styles.panelFieldRow}>
        <div className={styles.panelField}>
          <label htmlFor="seg-ep-start">Von</label>
          <input
            id="seg-ep-start"
            type="number"
            min="1"
            placeholder="z. B. 1"
            value={formState.startEpisode}
            onChange={(e) => onFormChange({ startEpisode: e.target.value })}
          />
        </div>
        <div className={styles.panelField}>
          <label htmlFor="seg-ep-end">Bis</label>
          <input
            id="seg-ep-end"
            type="number"
            min="1"
            placeholder="z. B. 12"
            value={formState.endEpisode}
            onChange={(e) => onFormChange({ endEpisode: e.target.value })}
          />
        </div>
      </div>
      {isMissingEpisodeRange ? (
        <div className={styles.assetError}>
          Bitte Von und Bis ausfüllen. Für eine einzelne Folge beide Felder gleich setzen.
        </div>
      ) : hasInvalidEpisodeValue ? (
        <div className={styles.assetError}>
          Episoden müssen positive ganze Zahlen sein.
        </div>
      ) : hasInvalidEpisodeRange ? (
        <div className={styles.assetError}>
          Bis muss größer oder gleich Von sein.
        </div>
      ) : null}

      <div className={styles.panelField}>
        <label>{isSharedSegment ? 'Basis-Zeitbereich (gilt für alle zugewiesenen Folgen)' : 'Zeitbereich im Video'}</label>
        <span className={styles.sourceHelpText}>
          Eingabe einfach als `1:20`, `12:03` oder Sekunden.{' '}
          {runtimeKnown
            ? <>Videodauer: <strong>{formatTimeInput(effectiveDuration!)}</strong>{runtimeFromPlayback ? ' (aus Jellyfin/Release)' : ' (aus Version)'}. Das Ende wird automatisch auf diese Grenze begrenzt.</>
            : 'Keine reale Laufzeit bekannt — Zeitbereich kann frei eingegeben werden.'}
        </span>
      </div>
      <div className={styles.panelFieldRow}>
        <div className={styles.panelField}>
          <label htmlFor="seg-time-start">Start</label>
          <input
            id="seg-time-start"
            type="text"
            inputMode="numeric"
            placeholder="z. B. 0:00"
            value={formState.startTime}
            onChange={(e) => onFormChange({ startTime: e.target.value })}
            onBlur={(e) => {
              const parsed = parseFlexibleTimeInput(e.target.value)
              if (parsed != null) onFormChange({ startTime: formatTimeInput(parsed) })
            }}
            style={isStartTimeError ? { borderColor: '#c0392b' } : undefined}
          />
          {isStartTimeError ? (
            <span className={styles.assetError} style={{ display: 'block', marginTop: 4 }}>{formError}</span>
          ) : null}
        </div>
        <div className={styles.panelField}>
          <label htmlFor="seg-time-end">Ende</label>
          <input
            id="seg-time-end"
            type="text"
            inputMode="numeric"
            placeholder="z. B. 1:20"
            value={formState.endTime}
            onChange={(e) => onFormChange({ endTime: e.target.value })}
            onBlur={(e) => {
              const parsed = parseFlexibleTimeInput(e.target.value)
              if (parsed == null) return
              const clamped = effectiveDuration != null ? Math.min(parsed, effectiveDuration) : parsed
              onFormChange({ endTime: formatTimeInput(clamped) })
            }}
            style={isEndTimeError ? { borderColor: '#c0392b' } : undefined}
          />
          {isEndTimeError ? (
            <span className={styles.assetError} style={{ display: 'block', marginTop: 4 }}>{formError}</span>
          ) : null}
        </div>
      </div>
      {isMissingTimeRange ? (
        <div className={styles.assetError}>
          Bitte Start und Ende ausfüllen.
        </div>
      ) : hasInvalidTimeInput ? (
        <div className={styles.assetError}>
          Zeitangaben müssen z. B. 1:20, 00:01:20 oder Sekunden sein.
        </div>
      ) : null}
      {exceedsDuration ? (
        <div className={styles.assetError}>
          Ende liegt über der bekannten Videodauer und wird beim Verlassen des Felds auf {formatTimeInput(effectiveDuration!)} begrenzt.
        </div>
      ) : null}
      {startSeconds != null && endSeconds != null && endSeconds <= startSeconds ? (
        <div className={styles.assetError}>
          Ende muss nach dem Start liegen.
        </div>
      ) : null}
      {exceedsMaxSegmentWindow ? (
        <div className={styles.assetError}>
          Segment-Zeitbereich darf maximal 4 Minuten lang sein.
        </div>
      ) : null}
    </>
  )
}
