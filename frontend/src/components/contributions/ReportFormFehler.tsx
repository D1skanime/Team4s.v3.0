'use client'

import { useState } from 'react'

import { FormField, Select, Textarea } from '@/components/ui'
import { ApiError, submitSuggestion } from '@/lib/api'

import styles from './contributions.module.css'
import { ReportTargetField } from './ReportTargetField'
import type { ReportTargetOption, ReportTargetType } from './reportTargets'

interface ReportFormFehlerProps {
  onSuccess: () => void
  prefillContributionId?: number
  targetOptions?: ReportTargetOption[]
}

type TargetType = ReportTargetType

const TARGET_TYPE_OPTIONS: { value: TargetType; label: string }[] = [
  { value: 'anime', label: 'Anime / Projekt' },
  { value: 'contribution', label: 'Projekt-/Rollenhinweis' },
  { value: 'fansub_group', label: 'Fansub-Gruppe' },
  { value: 'member', label: 'Member-Profil' },
]

interface ReportFormFehlerState {
  targetType: TargetType
  targetId: string
  contentText: string
  isSubmitting: boolean
  error: string | null
}

export function ReportFormFehler({
  onSuccess,
  prefillContributionId,
  targetOptions = [],
}: ReportFormFehlerProps) {
  const [state, setState] = useState<ReportFormFehlerState>({
    targetType: prefillContributionId ? 'contribution' : 'anime',
    targetId: prefillContributionId ? String(prefillContributionId) : '',
    contentText: '',
    isSubmitting: false,
    error: null,
  })

  function update(partial: Partial<ReportFormFehlerState>) {
    setState((prev) => ({ ...prev, ...partial }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    update({ error: null })

    const targetIdNum = Number.parseInt(state.targetId, 10)
    if (!state.targetId || Number.isNaN(targetIdNum) || targetIdNum < 1) {
      update({ error: 'Bitte wähle ein gültiges Ziel aus oder gib eine gültige Ziel-ID an.' })
      return
    }
    if (state.contentText.trim().length < 5) {
      update({ error: 'Bitte beschreibe den Fehler oder die Korrektur (mindestens 5 Zeichen).' })
      return
    }

    try {
      update({ isSubmitting: true })
      await submitSuggestion({
        suggestion_type: 'error_report',
        target_type: state.targetType,
        target_id: targetIdNum,
        content_text: state.contentText.trim(),
      })
      onSuccess()
    } catch (error) {
      update({
        error:
          error instanceof ApiError
            ? error.message
            : 'Der Vorschlag konnte nicht eingereicht werden. Bitte versuche es erneut.',
      })
    } finally {
      update({ isSubmitting: false })
    }
  }

  const prefillOption: ReportTargetOption[] = prefillContributionId
    ? [{
        type: 'contribution',
        id: prefillContributionId,
        label: `Hinweis #${prefillContributionId}`,
      }]
    : []

  return (
    <form id="report-form-fehler" onSubmit={(event) => void handleSubmit(event)} className={styles.reportForm}>
      {state.error ? (
        <p role="alert" className={styles.fieldError}>
          {state.error}
        </p>
      ) : null}

      <FormField label="Worauf bezieht sich dein Vorschlag?" htmlFor="fehler-target-type" required>
        <Select
          id="fehler-target-type"
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
        id="fehler-target-id"
        label="Ziel"
        hint="Wähle einen bekannten Eintrag aus deinen Hinweisen oder gib eine numerische ID ein."
        targetType={state.targetType}
        targetId={state.targetId}
        targetOptions={targetOptions}
        extraOptions={prefillOption}
        onTargetIdChange={(targetId) => update({ targetId })}
      />

      <FormField label="Was ist falsch oder unvollständig?" htmlFor="fehler-text" required>
        <Textarea
          id="fehler-text"
          value={state.contentText}
          onChange={(event) => update({ contentText: event.target.value })}
          rows={4}
          placeholder="Beschreibe den Fehler oder die gewünschte Korrektur."
          required
        />
      </FormField>

    </form>
  )
}
