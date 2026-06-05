'use client'

import { useState } from 'react'

import { ApiError, submitSuggestion } from '@/lib/api'
import { FormField, Select, Textarea } from '@/components/ui'

interface ReportFormFehlerProps {
  onSuccess: () => void
  prefillContributionId?: number
}

type TargetType = 'anime' | 'contribution' | 'fansub_group' | 'member'

const TARGET_TYPE_OPTIONS: { value: TargetType; label: string }[] = [
  { value: 'anime', label: 'Anime / Projekt' },
  { value: 'contribution', label: 'Beitrag / Contribution' },
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

export function ReportFormFehler({ onSuccess, prefillContributionId }: ReportFormFehlerProps) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    update({ error: null })

    const targetIdNum = parseInt(state.targetId, 10)
    if (!state.targetId || isNaN(targetIdNum) || targetIdNum < 1) {
      update({ error: 'Bitte gib eine gültige Ziel-ID an.' })
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
    } catch (err) {
      update({
        error:
          err instanceof ApiError
            ? err.message
            : 'Der Vorschlag konnte nicht eingereicht werden. Bitte versuche es erneut.',
      })
    } finally {
      update({ isSubmitting: false })
    }
  }

  return (
    <form id="report-form-fehler" onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {state.error ? (
        <p role="alert" style={{ color: 'var(--button-danger-start)', fontSize: '0.875rem' }}>
          {state.error}
        </p>
      ) : null}

      <FormField label="Worauf bezieht sich dein Vorschlag?" htmlFor="fehler-target-type" required>
        <Select
          id="fehler-target-type"
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

      <FormField label="ID des Ziels" htmlFor="fehler-target-id" required hint="Die numerische ID des Eintrags, auf den sich dein Vorschlag bezieht.">
        <Select
          id="fehler-target-id"
          value={state.targetId}
          onChange={(e) => update({ targetId: e.target.value })}
          required
        >
          <option value="">ID eingeben (manuell)</option>
          {prefillContributionId && state.targetType === 'contribution' ? (
            <option value={String(prefillContributionId)}>Contribution #{prefillContributionId}</option>
          ) : null}
        </Select>
      </FormField>

      <FormField label="Was ist falsch oder unvollständig?" htmlFor="fehler-text" required>
        <Textarea
          id="fehler-text"
          value={state.contentText}
          onChange={(e) => update({ contentText: e.target.value })}
          rows={4}
          placeholder="Beschreibe den Fehler oder die gewünschte Korrektur."
          required
        />
      </FormField>

      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        Dein Vorschlag wird geprüft und kann bei Bedarf vom Team umgesetzt werden.
      </p>
    </form>
  )
}
