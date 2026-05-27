import type { ProfileVisibility } from '@/types/profile'
import { formatProfileVisibilityLabel } from '@/lib/profileLabels'

import type { MemberProfileFormState } from './profileFormTypes'
import styles from '../page.module.css'

type VisibilityCardProps = {
  value: ProfileVisibility
  disabled: boolean
  onChange: (updater: (current: MemberProfileFormState) => MemberProfileFormState) => void
}

const OPTIONS: Array<{ value: ProfileVisibility; description: string }> = [
  { value: 'members_only', description: 'Konservativer Standard: sichtbar nur für angemeldete Mitglieder.' },
  { value: 'public', description: 'Öffentlich sichtbar, sobald eine stabile Public-Route vorhanden ist.' },
]

export function VisibilityCard({ value, disabled, onChange }: VisibilityCardProps) {
  return (
    <fieldset className={styles.radioGroup}>
      <legend>Profil-Sichtbarkeit</legend>
      {OPTIONS.map((option) => (
        <label key={option.value} className={styles.radioCard}>
          <input
            type="radio"
            name="profileVisibility"
            value={option.value}
            checked={value === option.value}
            disabled={disabled}
            onChange={() => onChange((current) => ({ ...current, profileVisibility: option.value }))}
          />
          <span>
            <strong>{formatProfileVisibilityLabel(option.value)}</strong>
            <small>{option.description}</small>
          </span>
        </label>
      ))}
      <p className={styles.mutedText}>Fehlende oder unklare Sichtbarkeit wird nie als öffentlich behandelt.</p>
    </fieldset>
  )
}
