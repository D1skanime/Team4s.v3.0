import { FormField, Input, Textarea } from '@/components/ui'

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
          hint="Jahr, z. B. 2016. Monatsdaten sind noch nicht Teil des Profil-Contracts."
          error={errors?.activeFromYear}
        >
          <Input
            id="activeFromYear"
            type="number"
            min={1970}
            max={2100}
            inputMode="numeric"
            value={form.activeFromYear}
            disabled={disabled}
            onChange={(event) => onChange((current) => ({ ...current, activeFromYear: event.target.value }))}
          />
        </FormField>
        <FormField
          label="Aktiv bis"
          htmlFor="activeUntilYear"
          disabled={form.isCurrentlyActive}
          error={errors?.activeUntilYear}
        >
          <Input
            id="activeUntilYear"
            type="number"
            min={1970}
            max={2100}
            inputMode="numeric"
            value={form.activeUntilYear}
            disabled={disabled || form.isCurrentlyActive}
            onChange={(event) => onChange((current) => ({ ...current, activeUntilYear: event.target.value }))}
          />
        </FormField>
      </div>
      <FormField label="Kurzbeschreibung" htmlFor="bio" hint={`${bioLength}/280 Zeichen`}>
        <Textarea
          id="bio"
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
