'use client'

import { useState } from 'react'

import { FormField, Select, Textarea } from '@/components/ui'
import { ApiError, submitSuggestion } from '@/lib/api'

import { ReportTargetField } from './ReportTargetField'
import type { ReportTargetOption, ReportTargetType } from './reportTargets'

interface ReportFormStoryProps {
  onSuccess: () => void
  targetOptions?: ReportTargetOption[]
}

type TargetType = ReportTargetType

const TARGET_TYPE_OPTIONS: { value: TargetType; label: string }[] = [
  { value: 'anime', label: 'Anime / Projekt' },
  { value: 'fansub_group', label: 'Fansub-Gruppe' },
  { value: 'member', label: 'Member-Profil' },
  { value: 'contribution', label: 'Beitrag / Contribution' },
]

interface ReportFormStoryState {
  targetType: TargetType
  targetId: string
  contentText: string
  isSubmitting: boolean
  error: string | null
}

export function ReportFormStory({ onSuccess, targetOptions = [] }: ReportFormStoryProps) {
  const [state, setState] = useState<ReportFormStoryState>({
    targetType: 'anime',
    targetId: '',
    contentText: '',
    isSubmitting: false,
    error: null,
  })

  function update(partial: Partial<ReportFormStoryState>) {
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
      update({ error: 'Bitte beschreibe deine Story (mindestens 5 Zeichen).' })
      return
    }

    try {
      update({ isSubmitting: true })
      await submitSuggestion({
        suggestion_type: 'story',
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
            : 'Die Story konnte nicht eingereicht werden. Bitte versuche es erneut.',
      })
    } finally {
      update({ isSubmitting: false })
    }
  }

  return (
    <form id="report-form-story" onSubmit={(event) => void handleSubmit(event)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {state.error ? (
        <p role="alert" style={{ color: 'var(--button-danger-start)', fontSize: '0.875rem' }}>
          {state.error}
        </p>
      ) : null}

      <FormField label="Worauf bezieht sich deine Story?" htmlFor="story-target-type" required>
        <Select
          id="story-target-type"
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
        id="story-target-id"
        label="Ziel"
        hint="Wähle einen bekannten Eintrag aus deinen Beiträgen oder gib eine numerische ID ein."
        targetType={state.targetType}
        targetId={state.targetId}
        targetOptions={targetOptions}
        onTargetIdChange={(targetId) => update({ targetId })}
      />

      <FormField label="Was ist deine Story?" htmlFor="story-text" required>
        <Textarea
          id="story-text"
          value={state.contentText}
          onChange={(event) => update({ contentText: event.target.value })}
          rows={5}
          placeholder="Erzähle eine Geschichte zu diesem Eintrag, zum Beispiel Hintergründe, Entstehungsgeschichte oder persönliche Erfahrungen."
          required
        />
      </FormField>

      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        Deine Story wird geprüft und kann nach Freigabe veröffentlicht werden.
      </p>
    </form>
  )
}
