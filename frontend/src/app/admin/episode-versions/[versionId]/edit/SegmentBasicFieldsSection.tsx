'use client'

import { useState } from 'react'
import { Select } from '@/components/ui'
import type { EpisodeVersionChapterHint } from '@/types/episodeVersion'
import type { GenericSegmentThemeOption } from './useReleaseSegments'
import type { FormState } from './SegmentEditPanel'
import { formatTimeInput, parseFlexibleTimeInput } from './SegmenteTab.helpers'
import styles from './SegmenteTab.module.css'

interface SegmentBasicFieldsSectionProps {
  chapterHints?: EpisodeVersionChapterHint[] | null
  showChapterHints?: boolean
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
 * 156-UAT.md). Validierungs-Flags kommen aus SegmentEditPanel.tsx. Kapitelhilfen
 * setzen nur Formularzeiten; lokale Auswahlidentitaeten sind keine gespeicherten Segmentdaten.
 */
export function SegmentBasicFieldsSection({
  chapterHints,
  showChapterHints = false,
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
  const [chosen, setChosen] = useState<{
    start: EpisodeVersionChapterHint | null
    end: EpisodeVersionChapterHint | null
    range: EpisodeVersionChapterHint | null
  }>({ start: null, end: null, range: null })
  const chapters = chapterHints ?? []
  const ranges = chapters.map((chapter) => {
    // Equal markers name the same boundary. Use the next strictly later boundary.
    const next = chapters.reduce<number | null>((earliest, candidate) =>
      candidate.start_ms > chapter.start_ms && (earliest == null || candidate.start_ms < earliest)
        ? candidate.start_ms : earliest, null)
    const endMs = next ?? (effectiveDuration != null ? effectiveDuration * 1000 : null)
    const start = Math.round(chapter.start_ms / 1000)
    const end = endMs == null ? null : Math.round(endMs / 1000)
    return { chapter, endMs, start, end, available: end != null && end > start && (effectiveDuration == null || end <= effectiveDuration) }
  })
  const selectedMark = (chapter: EpisodeVersionChapterHint | null, seconds: number | null) => {
    const index = chapter == null ? -1 : chapters.indexOf(chapter)
    return index >= 0 && seconds === Math.round(chapter!.start_ms / 1000) ? String(index) : ''
  }
  const selectedRange = ranges.findIndex((range) => range.chapter === chosen.range && range.available && range.start === startSeconds && range.end === endSeconds)
  const markerSelect = (field: 'start' | 'end') => (
    <>
      <label htmlFor={`seg-chapter-${field}`}>Kapitelmarke als {field === 'start' ? 'Start' : 'Ende'}</label>
      <Select
        id={`seg-chapter-${field}`}
        className={styles.chapterSelect}
        value={selectedMark(chosen[field], field === 'start' ? startSeconds : endSeconds)}
        onChange={(event) => {
          if (event.target.value === '') return
          const chapter = chapters[Number(event.target.value)]
          if (!chapter) return
          const seconds = Math.round(chapter.start_ms / 1000)
          if (field === 'end' && startSeconds != null && seconds <= startSeconds) return
          setChosen((previous) => ({ ...previous, [field]: chapter, range: null }))
          onFormChange({ [field === 'start' ? 'startTime' : 'endTime']: formatTimeInput(seconds) })
        }}
      >
        <option value="">Kapitelmarke auswählen</option>
        {chapters.map((chapter, index) => (
          <option key={index} value={index} disabled={field === 'end' && startSeconds != null && Math.round(chapter.start_ms / 1000) <= startSeconds}>
            {formatTimeInput(chapter.start_ms / 1000, true)} · {chapter.name?.trim() ? chapter.name : `Kapitel ${index + 1}`}
          </option>
        ))}
      </Select>
    </>
  )
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
            ? <>Videodauer: <strong>{formatTimeInput(effectiveDuration!)}</strong>{runtimeFromPlayback ? ' (aus Stream/Release)' : ' (aus Version)'}. Das Ende wird automatisch auf diese Grenze begrenzt.</>
            : 'Keine reale Laufzeit bekannt — Zeitbereich kann frei eingegeben werden.'}
        </span>
      </div>
      {showChapterHints && chapters.length > 0 ? (
        <div className={styles.panelField}>
          <label htmlFor="seg-chapter-range">Kapitelabschnitt übernehmen</label>
          <Select
            id="seg-chapter-range"
            className={styles.chapterSelect}
            value={selectedRange >= 0 ? String(selectedRange) : ''}
            onChange={(event) => {
              if (event.target.value === '') return
              const range = ranges[Number(event.target.value)]
              if (!range?.available || range.end == null) return
              setChosen({ start: range.chapter, end: chapters.find((chapter) => chapter.start_ms === range.endMs) ?? null, range: range.chapter })
              onFormChange({ startTime: formatTimeInput(range.start), endTime: formatTimeInput(range.end) })
            }}
          >
            <option value="">Kapitelabschnitt auswählen</option>
            {ranges.map((range, index) => (
              <option key={index} value={index} disabled={!range.available}>
                {range.chapter.name?.trim() ? range.chapter.name : `Kapitel ${index + 1}`} · {formatTimeInput(range.chapter.start_ms / 1000, true)} → {range.endMs == null ? 'Ende unbekannt' : formatTimeInput(range.endMs / 1000, true)}{range.endMs != null && !range.available ? ' (kein gültiger Zeitbereich)' : ''}
              </option>
            ))}
          </Select>
          <span className={styles.sourceHelpText}>
            Setzt Start und Ende bis zur nächsten Kapitelmarke. Beim letzten Kapitel wird die bekannte Videodauer verwendet.
          </span>
        </div>
      ) : null}
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
          {showChapterHints && chapters.length > 0 ? markerSelect('start') : null}
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
          {showChapterHints && chapters.length > 0 ? markerSelect('end') : null}
          {isEndTimeError ? (
            <span className={styles.assetError} style={{ display: 'block', marginTop: 4 }}>{formError}</span>
          ) : null}
        </div>
      </div>
      {showChapterHints ? (
        <p className={styles.sourceHelpText}>
          {chapterHints == null
            ? 'Für diese Datei sind keine verlässlichen Kapitelzeiten verfügbar.'
            : chapterHints.length === 0
              ? 'Diese Datei enthält keine Kapitel.'
              : 'Bei der Übernahme wird auf ganze Sekunden gerundet (z. B. 21:38.047 → 21:38). Endmarken müssen nach dem Start liegen.'}
        </p>
      ) : null}
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
