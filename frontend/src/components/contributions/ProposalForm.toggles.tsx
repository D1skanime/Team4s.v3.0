'use client'

import { Check } from 'lucide-react'

import styles from './contributions.module.css'

export type GroupScope = 'own' | 'foreign'

interface RadioOption<T extends string> {
  value: T
  label: string
}

/**
 * Zwei-Optionen-Umschalter im Radiogroup-Button-Muster (identisch zum Darstellungsmuster
 * von `Step2Role`'s `rolePicker` in ProposalForm.steps.tsx) — Projekt-Konvention laut
 * 191-UI-SPEC.md: binäre, immer sichtbare Auswahlmengen bekommen diese
 * Button-Radiogroup-Darstellung statt eines `Select`/Dropdowns, das für größere/such­bare
 * Auswahlmengen reserviert bleibt.
 */
function RadioToggle<T extends string>({
  ariaLabel,
  value,
  options,
  onSelect,
}: {
  ariaLabel: string
  value: T | ''
  options: RadioOption<T>[]
  onSelect: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={styles.rolePicker}>
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={selected ? styles.roleChoiceActive : styles.roleChoice}
            onClick={() => onSelect(option.value)}
          >
            {selected ? <Check size={15} aria-hidden="true" /> : null}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

const GROUP_SCOPE_OPTIONS: RadioOption<GroupScope>[] = [
  { value: 'own', label: 'Eigene Gruppe' },
  { value: 'foreign', label: 'Andere Gruppe' },
]

export function GroupScopeToggle({
  value,
  onSelect,
}: {
  value: GroupScope
  onSelect: (value: GroupScope) => void
}) {
  return <RadioToggle ariaLabel="Gruppen-Bereich" value={value} options={GROUP_SCOPE_OPTIONS} onSelect={onSelect} />
}
