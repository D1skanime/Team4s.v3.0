import { useMemo, useState } from 'react'

import { FormField, Input, Textarea } from '@/components/ui'

import { getMaxActivityYear, MIN_ACTIVITY_YEAR } from './activityYears'
import type { MemberProfileFormState } from './profileFormTypes'
import styles from '../page.module.css'

const YEARS_PER_PAGE = 12

type ProfileBasicsFormProps = {
  form: MemberProfileFormState
  disabled: boolean
  errors?: {
    activeFromYear?: string
    activeUntilYear?: string
  }
  onChange: (updater: (current: MemberProfileFormState) => MemberProfileFormState) => void
}

type YearFieldProps = {
  id: string
  label: string
  value: string
  disabled: boolean
  error?: string
  onValueChange: (value: string) => void
}

function pageStartForYear(rawYear: string, maxYear: number): number {
  const parsed = Number.parseInt(rawYear, 10)
  if (!Number.isFinite(parsed) || parsed < MIN_ACTIVITY_YEAR || parsed > maxYear) return maxYear
  const offset = maxYear - parsed
  return maxYear - Math.floor(offset / YEARS_PER_PAGE) * YEARS_PER_PAGE
}

function YearField({ id, label, value, disabled, error, onValueChange }: YearFieldProps) {
  const maxYear = getMaxActivityYear()
  const [isOpen, setIsOpen] = useState(false)
  const [pageStartYear, setPageStartYear] = useState(() => pageStartForYear(value, maxYear))
  const pageYears = useMemo(() => (
    Array.from({ length: YEARS_PER_PAGE }, (_, index) => pageStartYear - index)
      .filter((year) => year >= MIN_ACTIVITY_YEAR && year <= maxYear)
  ), [maxYear, pageStartYear])
  const canShowEarlier = pageYears[pageYears.length - 1] > MIN_ACTIVITY_YEAR
  const canShowLater = pageStartYear < maxYear
  const rangeLabel = pageYears.length
    ? `${pageYears[pageYears.length - 1]}-${pageYears[0]}`
    : String(maxYear)

  const closeAfterSelect = (nextValue: string) => {
    onValueChange(nextValue)
    setIsOpen(false)
  }

  const togglePicker = () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }
    setPageStartYear(pageStartForYear(value, maxYear))
    setIsOpen(true)
  }

  return (
    <FormField label={label} htmlFor={id} error={error} disabled={disabled}>
      <div
        className={styles.yearPicker}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false)
        }}
      >
        <button
          id={id}
          type="button"
          className={`${styles.yearPickerTrigger} ${error ? styles.yearPickerTriggerInvalid : ''}`}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${id}-picker` : undefined}
          onClick={togglePicker}
        >
          <span>{value || 'Keine Angabe'}</span>
          <span className={styles.yearPickerHint}>Jahr wählen</span>
        </button>
        {isOpen && !disabled ? (
          <div id={`${id}-picker`} className={styles.yearPickerPanel} role="dialog" aria-label={`${label} auswählen`}>
            <div className={styles.yearPickerToolbar}>
              <button
                type="button"
                className={styles.yearPickerNav}
                disabled={!canShowEarlier}
                onClick={() => setPageStartYear((current) => Math.max(MIN_ACTIVITY_YEAR, current - YEARS_PER_PAGE))}
              >
                Früher
              </button>
              <strong>{rangeLabel}</strong>
              <button
                type="button"
                className={styles.yearPickerNav}
                disabled={!canShowLater}
                onClick={() => setPageStartYear((current) => Math.min(maxYear, current + YEARS_PER_PAGE))}
              >
                Später
              </button>
            </div>
            <div className={styles.yearPickerGrid}>
              <button
                type="button"
                className={`${styles.yearPickerYear} ${!value ? styles.yearPickerYearSelected : ''} ${styles.yearPickerClear}`}
                onClick={() => closeAfterSelect('')}
              >
                Keine Angabe
              </button>
              {pageYears.map((year) => {
                const yearValue = String(year)
                return (
                  <button
                    key={year}
                    type="button"
                    className={`${styles.yearPickerYear} ${value === yearValue ? styles.yearPickerYearSelected : ''}`}
                    onClick={() => closeAfterSelect(yearValue)}
                  >
                    {year}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </FormField>
  )
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
          <YearField
            id="activeFromYear"
            label="Aktiv seit"
            value={form.activeFromYear}
            disabled={disabled}
            error={errors?.activeFromYear}
            onValueChange={(value) => onChange((current) => ({ ...current, activeFromYear: value }))}
          />
          <YearField
            id="activeUntilYear"
            label="Aktiv bis"
            value={form.activeUntilYear}
            disabled={disabled || form.isCurrentlyActive}
            error={errors?.activeUntilYear}
            onValueChange={(value) => onChange((current) => ({ ...current, activeUntilYear: value }))}
          />
        </div>
      </section>
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
