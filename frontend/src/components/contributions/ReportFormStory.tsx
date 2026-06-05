'use client'

import { useState } from 'react'

import { ApiError, submitSuggestion } from '@/lib/api'
import { FormField, Select, Textarea } from '@/components/ui'

interface ReportFormStoryProps {
  onSuccess: () => void
}

type TargetType = 'anime' | 'contribution' | 'fansub_group' | 'member'

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

export function ReportFormStory({ onSuccess }: ReportFormStoryProps) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    update({ error: null })

    const targetIdNum = parseInt(state.targetId, 10)
    if (!state.targetId || isNaN(targetIdNum) || targetIdNum < 1) {
      update({ error: 'Bitte gib eine gültige Ziel-ID an.' })
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
    } catch (err) {
      update({
        error:
          err instanceof ApiError
            ? err.message
            : 'Die Story konnte nicht eingereicht werden. Bitte versuche es erneut.',
      })
    } finally {
      update({ isSubmitting: false })
    }
  }

  return (
    <form id="report-form-story" onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {state.error ? (
        <p role="alert" style={{ color: 'var(--button-danger-start)', fontSize: '0.875rem' }}>
          {state.error}
        </p>
      ) : null}

      <FormField label="Worauf bezieht sich deine Story?" htmlFor="story-target-type" required>
        <Select
          id="story-target-type"
          value={state.targetType}
          onChange={(e) => update({ targetType: e.target.value as TargetType, targetId: '' })}
          required
        >
          {TARGET_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="ID des Ziels" htmlFor="story-target-id" required hint="Die numerische ID des Eintrags, auf den sich deine Story bezieht.">
        <Select
          id="story-target-id"
          value={state.targetId}
          onChange={(e) => update({ targetId: e.target.value })}
          required
        >
          <option value="">Ziel auswählen</option>
        </Select>
      </FormField>

      <FormField label="Was ist deine Story?" htmlFor="story-text" required>
        <Textarea
          id="story-text"
          value={state.contentText}
          onChange={(e) => update({ contentText: e.target.value })}
          rows={5}
          placeholder="Erzähle eine Geschichte zu diesem Eintrag — z. B. Hintergründe, Entstehungsgeschichte oder persönliche Erfahrungen."
          required
        />
      </FormField>

      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        Deine Story wird geprüft und kann nach Freigabe veröffentlicht werden.
      </p>
    </form>
  )
}
