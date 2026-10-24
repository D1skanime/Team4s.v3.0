'use client'

import type { ChangeEvent } from 'react'

import { FormField, Select } from '@/components/ui'

import type { ProposalReleaseOption } from './ProposalForm.useReleaseOptions'

/**
 * D-29/D-31 (Plan 191-34): die einzige Stelle, an der die optionale Release-Einschraenkung
 * des Hinweis-Formulars gerendert wird. Beide Verbrauchsstellen -- der Wizard-Schritt 1
 * ("Gruppe & Projekt") UND Plan 191-35s vorausgefuellter Kontext-Einstieg -- mounten exakt
 * diese Komponente, damit die Options-Liste/Lade-Zustand-Markup nicht zweimal gebaut wird
 * (191-34-PLAN.md key_links). Backed by `useProposalFormReleaseOptions` (Plan 191-33) --
 * diese Komponente selbst laedt nichts, sie ist rein praesentational.
 */
export interface ProposalReleaseSelectProps {
  options: ProposalReleaseOption[]
  selectedReleaseVersionId: number | null
  isLoading: boolean
  /** Gesetzt, solange noch kein vollstaendiges (Projekt, Gruppe)-Paar gewaehlt ist. */
  disabled?: boolean
  error?: string | null
  onChange: (id: number | null) => void
}

export function ProposalReleaseSelect({
  options,
  selectedReleaseVersionId,
  isLoading,
  disabled = false,
  error,
  onChange,
}: ProposalReleaseSelectProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const { value } = event.target
    // Leerer Wert = "Ganzes Projekt" -- niemals 0/NaN bei einer gueltigen Auswahl.
    onChange(value === '' ? null : Number(value))
  }

  return (
    <FormField label="Release (optional)" error={error ?? undefined}>
      <Select
        aria-label="Release (optional)"
        value={isLoading ? '' : selectedReleaseVersionId == null ? '' : String(selectedReleaseVersionId)}
        disabled={disabled || isLoading}
        onChange={handleChange}
      >
        {isLoading ? (
          // Waehrend ein neues (Projekt, Gruppe)-Paar laedt, wird NIE die vorherige
          // Optionsliste weiterangezeigt -- sonst waere kurzzeitig eine Release-ID aus dem
          // vorherigen Projekt waehlbar, die zum neuen Projekt gar nicht gehoert.
          <option value="">Wird geladen…</option>
        ) : (
          <>
            <option value="">Ganzes Projekt</option>
            {options.map((option) => (
              <option key={option.id} value={String(option.id)}>
                {option.label}
              </option>
            ))}
          </>
        )}
      </Select>
    </FormField>
  )
}
