'use client'

import { useEffect, useState } from 'react'

import { FormField, Select } from '@/components/ui'
import { getAdminEpisodeClassificationOptions, updateAdminEpisode } from '@/lib/api'
import {
  type EpisodeClassification,
  type EpisodeClassificationOption,
  type EpisodeClassificationOptionsResponse,
  type EpisodeFillerType,
  type EpisodeType,
} from '@/types/episodeClassification'

import styles from './EpisodeClassificationFields.module.css'

type Field = 'filler_type' | 'episode_type'

// Modul-weiter Cache: Diese Komponente wird pro Episode-Zeile auf Listen-Seiten
// (EpisodesOverview/EpisodeAccordion) UND im Versionseditor gemountet. Ohne
// diesen Cache würde jede gleichzeitig gemountete Zeile einen eigenen Request
// gegen den Optionen-Endpunkt auslösen. Ein einziges geteiltes Promise sorgt
// dafür, dass unabhängig von der Anzahl der Mounts höchstens ein Request pro
// Seitenaufruf entsteht. Bei einem Fehler wird der Cache zurückgesetzt, damit
// ein späterer Mount (z.B. nach Navigation) einen neuen Versuch starten kann —
// es gibt aber keine automatische Wiederholungsschleife/kein Polling.
let classificationOptionsPromise: Promise<EpisodeClassificationOptionsResponse> | null = null

function loadClassificationOptions(): Promise<EpisodeClassificationOptionsResponse> {
  if (!classificationOptionsPromise) {
    classificationOptionsPromise = getAdminEpisodeClassificationOptions().catch((error: unknown) => {
      classificationOptionsPromise = null
      throw error
    })
  }
  return classificationOptionsPromise
}

interface EpisodeClassificationFieldsProps {
  classification: EpisodeClassification
  /** Wird nach erfolgreichem Speichern mit dem neuen Episode-Stand aufgerufen. */
  onSaved?: (next: EpisodeClassification) => void
  /** "inline" für die Episoden-Zeile, "stacked" für Formularbereiche. */
  layout?: 'inline' | 'stacked'
}

/**
 * Bearbeitet Canon/Filler und Episodentyp einer Episode. Jede Änderung speichert
 * sofort über PATCH /admin/episodes/:id und damit genau einen Episode-Datensatz.
 * Eltern remounten die Komponente per key, wenn sich die Werte von außen ändern.
 */
export function EpisodeClassificationFields({
  classification,
  onSaved,
  layout = 'inline',
}: EpisodeClassificationFieldsProps) {
  const [fillerType, setFillerType] = useState<EpisodeFillerType | ''>(classification.filler_type ?? '')
  const [episodeType, setEpisodeType] = useState<EpisodeType | ''>(classification.episode_type ?? '')
  const [savingField, setSavingField] = useState<Field | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [savedField, setSavedField] = useState<Field | null>(null)
  const [fillerOptions, setFillerOptions] = useState<EpisodeClassificationOption[]>([])
  const [episodeTypeOptions, setEpisodeTypeOptions] = useState<EpisodeClassificationOption[]>([])
  const [optionsLoaded, setOptionsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadClassificationOptions()
      .then((response) => {
        if (cancelled) return
        setFillerOptions(response.data.filler_types)
        setEpisodeTypeOptions(response.data.episode_types)
        setOptionsLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        // WR-04 (164 Code-Review): der Fehler wird nicht mehr verschluckt --
        // die Selects zeigen zwar weiterhin nur den aktuell gesetzten Wert
        // (siehe renderOptions unten), aber der bestehende
        // errorMessage/role="alert"-Slot macht sichtbar, dass die
        // Einstufungs-Optionen nicht geladen werden konnten. Ein späterer
        // Mount kann es erneut versuchen, da der Cache oben zurückgesetzt wird.
        setErrorMessage('Einstufungs-Optionen konnten nicht geladen werden.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const idPrefix = `episode-${classification.episode_id}`

  async function save(field: Field, value: string, previous: string) {
    setErrorMessage(null)
    setSavedField(null)
    setSavingField(field)
    try {
      const response = await updateAdminEpisode(classification.episode_id, { [field]: value })
      // Die PATCH-Antwort enthält den gespeicherten Stand beider Dimensionen.
      const saved = response.data
      const next: EpisodeClassification = {
        ...classification,
        filler_type: saved.filler_type ?? null,
        filler_type_source: saved.filler_type_source ?? null,
        episode_type: saved.episode_type ?? null,
        episode_type_source: saved.episode_type_source ?? null,
      }
      setSavedField(field)
      onSaved?.(next)
    } catch (error) {
      if (field === 'filler_type') setFillerType(previous as EpisodeFillerType | '')
      else setEpisodeType(previous as EpisodeType | '')
      setErrorMessage(
        error instanceof Error && error.message
          ? `Speichern fehlgeschlagen: ${error.message}`
          : 'Speichern fehlgeschlagen.',
      )
    } finally {
      setSavingField(null)
    }
  }

  const statusText =
    savingField !== null
      ? 'Speichert …'
      : savedField !== null
        ? 'Gespeichert – gilt für alle Versionen dieser Episode.'
        : null

  // Während die Optionen noch laden, wird nur der aktuell gesetzte Wert als
  // Option gerendert (statt eines leeren Dropdowns), damit es beim Laden nicht
  // kurz aufblitzt. Sobald die DB-Antwort da ist, ersetzen die echten
  // Code+Label-Paare diesen Platzhalter vollständig.
  function renderOptions(currentValue: string, options: EpisodeClassificationOption[]) {
    if (optionsLoaded) {
      return options.map((option) => (
        <option key={option.code} value={option.code}>
          {option.label}
        </option>
      ))
    }
    return currentValue !== '' ? <option value={currentValue}>{currentValue}</option> : null
  }

  return (
    <div
      className={layout === 'inline' ? styles.inline : styles.stacked}
      data-testid={`${idPrefix}-classification`}
    >
      <FormField label="Canon/Filler" htmlFor={`${idPrefix}-filler-type`}>
        <Select
          id={`${idPrefix}-filler-type`}
          value={fillerType}
          disabled={savingField !== null}
          onChange={(event) => {
            const previous = fillerType
            const value = event.target.value as EpisodeFillerType
            setFillerType(value)
            void save('filler_type', value, previous)
          }}
        >
          {fillerType === '' ? <option value="">Nicht gesetzt</option> : null}
          {renderOptions(fillerType, fillerOptions)}
        </Select>
      </FormField>
      <FormField label="Episodentyp" htmlFor={`${idPrefix}-episode-type`}>
        <Select
          id={`${idPrefix}-episode-type`}
          value={episodeType}
          disabled={savingField !== null}
          onChange={(event) => {
            const previous = episodeType
            const value = event.target.value as EpisodeType
            setEpisodeType(value)
            void save('episode_type', value, previous)
          }}
        >
          {episodeType === '' ? <option value="">Nicht gesetzt</option> : null}
          {renderOptions(episodeType, episodeTypeOptions)}
        </Select>
      </FormField>
      {errorMessage ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : statusText ? (
        <p className={styles.status} aria-live="polite">
          {statusText}
        </p>
      ) : null}
    </div>
  )
}
