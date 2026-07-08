import { FormField, Input, YearPicker } from '@/components/ui'

import { getMaxActivityYear, MIN_ACTIVITY_YEAR } from './activityYears'
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
  const maxYear = getMaxActivityYear()

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
      <section className={styles.activityPeriod} aria-labelledby="profile-activity-title">
        <div className={styles.activityPeriodHeader}>
          <div>
            <h3 id="profile-activity-title">Fansub-Zeitraum</h3>
            <p>Trage ein, seit wann du in der Fansub-Szene aktiv bist.</p>
          </div>
          <label className={styles.activityToggle}>
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
            <span>Aktuell aktiv</span>
          </label>
        </div>
        <div className={styles.yearGrid}>
          <FormField label="Aktiv seit" htmlFor="activeFromYear" error={errors?.activeFromYear} disabled={disabled}>
            <YearPicker
              id="activeFromYear"
              label="Aktiv seit"
              value={form.activeFromYear}
              minYear={MIN_ACTIVITY_YEAR}
              maxYear={maxYear}
              disabled={disabled}
              invalid={Boolean(errors?.activeFromYear)}
              onChange={(value) => onChange((current) => ({ ...current, activeFromYear: value }))}
            />
          </FormField>
          <FormField
            label="Aktiv bis"
            htmlFor="activeUntilYear"
            error={errors?.activeUntilYear}
            disabled={disabled || form.isCurrentlyActive}
          >
            <YearPicker
              id="activeUntilYear"
              label="Aktiv bis"
              value={form.activeUntilYear}
              minYear={MIN_ACTIVITY_YEAR}
              maxYear={maxYear}
              disabled={disabled || form.isCurrentlyActive}
              invalid={Boolean(errors?.activeUntilYear)}
              onChange={(value) => onChange((current) => ({ ...current, activeUntilYear: value }))}
            />
          </FormField>
        </div>
      </section>
    </div>
  )
}
