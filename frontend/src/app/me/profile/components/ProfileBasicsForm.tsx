import { FormField, Input, Select, Textarea } from '@/components/ui'

import type { MemberProfileFormState } from './profileFormTypes'
import styles from '../page.module.css'

type ProfileBasicsFormProps = {
  form: MemberProfileFormState
  disabled: boolean
  errors?: {
    activeFromYear?: string
    activeUntilYear?: string
  }
  onChange: (updater: (current: MemberProfileFormState) => MemberProfileFormState) => void
}

export function ProfileBasicsForm({ form, disabled, errors, onChange }: ProfileBasicsFormProps) {
  const bioLength = form.bio.length
  const yearOptions = Array.from({ length: 2100 - 1970 + 1 }, (_, index) => String(2100 - index))

  return (
    <div className={styles.formGrid}>
      <FormField label="Fansub-Nick" htmlFor="fansubName">
        <Input
          id="fansubName"
          value={form.fansubName}
          disabled={disabled}
          onChange={(event) => onChange((current) => ({ ...current, fansubName: event.target.value }))}
        />
      </FormField>
      <FormField label="Aktuell aktiv" htmlFor="isCurrentlyActive">
        <label className={styles.checkboxControl}>
          <input
            id="isCurrentlyActive"
            type="checkbox"
            checked={form.isCurrentlyActive}
            disabled={disabled}
            onChange={(event) => onChange((current) => ({
              ...current,
              isCurrentlyActive: event.target.checked,
              activeUntilYear: event.target.checked ? '' : current.activeUntilYear,
            }))}
          />
          <span>Ich bin aktuell in der Fansub-Szene aktiv</span>
        </label>
      </FormField>
      <div className={styles.yearGrid}>
        <FormField
          label="Aktiv seit"
          htmlFor="activeFromYear"
          hint="Wähle ein Jahr für deinen Fansub-Zeitraum."
          error={errors?.activeFromYear}
        >
          <Select
            id="activeFromYear"
            value={form.activeFromYear}
            disabled={disabled}
            onChange={(event) => onChange((current) => ({ ...current, activeFromYear: event.target.value }))}
          >
            <option value="">Keine Angabe</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </Select>
        </FormField>
        <FormField
          label="Aktiv bis"
          htmlFor="activeUntilYear"
          disabled={form.isCurrentlyActive}
          error={errors?.activeUntilYear}
        >
          <Select
            id="activeUntilYear"
            value={form.activeUntilYear}
            disabled={disabled || form.isCurrentlyActive}
            onChange={(event) => onChange((current) => ({ ...current, activeUntilYear: event.target.value }))}
          >
            <option value="">Keine Angabe</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Kurzbeschreibung" htmlFor="bio" hint={`${bioLength}/280 Zeichen`}>
        <Textarea
          id="bio"
          className={styles.bioTextarea}
          rows={2}
          maxLength={280}
          value={form.bio}
          disabled={disabled}
          onChange={(event) => onChange((current) => ({ ...current, bio: event.target.value }))}
          placeholder="Ein kurzer Eindruck deiner Fansub-Rolle."
        />
      </FormField>
    </div>
  )
}
