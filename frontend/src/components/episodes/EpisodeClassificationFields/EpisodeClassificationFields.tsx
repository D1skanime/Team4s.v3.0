'use client'

import { useState } from 'react'

import { FormField, Select } from '@/components/ui'
import { updateAdminEpisode } from '@/lib/api'
import {
  EPISODE_FILLER_TYPE_OPTIONS,
  EPISODE_TYPE_OPTIONS,
  type EpisodeClassification,
  type EpisodeFillerType,
  type EpisodeType,
} from '@/types/episodeClassification'

import styles from './EpisodeClassificationFields.module.css'

type Field = 'filler_type' | 'episode_type'

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
          {EPISODE_FILLER_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
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
          {EPISODE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
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
