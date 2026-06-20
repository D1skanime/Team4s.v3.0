'use client'

import { useRef, useState } from 'react'

import { FormField, Select } from '@/components/ui'
import { ApiError, uploadMediaSuggestion } from '@/lib/api'

import styles from './contributions.module.css'
import { ReportTargetField } from './ReportTargetField'
import type { ReportTargetOption, ReportTargetType } from './reportTargets'

interface ReportFormMediaProps {
  onSuccess: () => void
  targetOptions?: ReportTargetOption[]
}

type TargetType = Extract<ReportTargetType, 'anime' | 'fansub_group' | 'member'>

const TARGET_TYPE_OPTIONS: { value: TargetType; label: string }[] = [
  { value: 'anime', label: 'Anime / Projekt' },
  { value: 'fansub_group', label: 'Fansub-Gruppe' },
  { value: 'member', label: 'Member-Profil' },
]

const MEDIA_CATEGORIES = [
  { value: 'cover', label: 'Cover-Bild' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'promo', label: 'Promo-Material' },
  { value: 'other', label: 'Sonstiges' },
]

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

interface ReportFormMediaState {
  targetType: TargetType
  targetId: string
  category: string
  file: File | null
  isUploading: boolean
  uploadProgress: number
  error: string | null
}

export function ReportFormMedia({ onSuccess, targetOptions = [] }: ReportFormMediaProps) {
  const [state, setState] = useState<ReportFormMediaState>({
    targetType: 'anime',
    targetId: '',
    category: '',
    file: null,
    isUploading: false,
    uploadProgress: 0,
    error: null,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  function update(partial: Partial<ReportFormMediaState>) {
    setState((prev) => ({ ...prev, ...partial }))
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    if (!selected) {
      update({ file: null, error: null })
      return
    }
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      update({ file: null, error: 'Die Datei ist zu groß. Maximal erlaubt sind 20 MB.' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    update({ file: selected, error: null })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    update({ error: null })

    const targetIdNum = Number.parseInt(state.targetId, 10)
    if (!state.targetId || Number.isNaN(targetIdNum) || targetIdNum < 1) {
      update({ error: 'Bitte wähle ein gültiges Ziel aus oder gib eine gültige Ziel-ID an.' })
      return
    }
    if (!state.category) {
      update({ error: 'Bitte wähle eine Kategorie aus.' })
      return
    }
    if (!state.file) {
      update({ error: 'Bitte wähle eine Datei aus.' })
      return
    }

    try {
      update({ isUploading: true, uploadProgress: 0 })
      await uploadMediaSuggestion({
        file: state.file,
        fields: {
          target_type: state.targetType,
          target_id: String(targetIdNum),
          category: state.category,
        },
        onProgress: (percent) => update({ uploadProgress: percent }),
      })
      onSuccess()
    } catch (error) {
      update({
        error:
          error instanceof ApiError
            ? error.message
            : 'Der Upload konnte nicht abgeschlossen werden. Bitte versuche es erneut.',
      })
    } finally {
      update({ isUploading: false })
    }
  }

  return (
    <form id="report-form-media" onSubmit={(event) => void handleSubmit(event)} className={styles.reportForm}>
      {state.error ? (
        <p role="alert" className={styles.fieldError}>
          {state.error}
        </p>
      ) : null}

      <FormField label="Ziel-Typ" htmlFor="media-target-type" required>
        <Select
          id="media-target-type"
          value={state.targetType}
          onChange={(event) => update({ targetType: event.target.value as TargetType, targetId: '' })}
          required
        >
          {TARGET_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <ReportTargetField
        id="media-target-id"
        label="Ziel"
        hint="Wähle einen bekannten Eintrag aus deinen Beiträgen oder gib eine numerische ID ein."
        targetType={state.targetType}
        targetId={state.targetId}
        targetOptions={targetOptions}
        onTargetIdChange={(targetId) => update({ targetId })}
      />

      <FormField label="Kategorie" htmlFor="media-category" required>
        <Select
          id="media-category"
          value={state.category}
          onChange={(event) => update({ category: event.target.value })}
          required
        >
          <option value="">Kategorie wählen</option>
          {MEDIA_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Datei auswählen" htmlFor="media-file" required hint="Unterstützt werden gängige Bild- und Videoformate. Maximale Dateigröße: 20 MB.">
        {/* eslint-disable-next-line no-restricted-syntax -- file input: kein FileInput-Primitiv in @/components/ui verfügbar */}
        <input
          ref={fileInputRef}
          id="media-file"
          type="file"
          accept="image/*,video/mp4,video/webm"
          onChange={handleFileChange}
          disabled={state.isUploading}
          required
          style={{ fontSize: '0.875rem' }}
        />
      </FormField>

      {state.file ? (
        <p className={styles.formNote}>
          Ausgewählt: <strong>{state.file.name}</strong> ({(state.file.size / 1024 / 1024).toFixed(2)} MB)
        </p>
      ) : null}

      {state.isUploading ? (
        <div role="status" className={styles.formNote}>
          Wird hochgeladen... {state.uploadProgress}%
        </div>
      ) : null}
    </form>
  )
}
