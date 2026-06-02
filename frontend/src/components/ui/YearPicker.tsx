'use client'

import { useMemo, useState } from 'react'

import styles from './ui.module.css'

const YEARS_PER_PAGE = 12

type YearPickerProps = {
  id: string
  label: string
  value: string
  minYear: number
  maxYear: number
  disabled?: boolean
  invalid?: boolean
  onChange: (value: string) => void
}

function pageStartForYear(rawYear: string, minYear: number, maxYear: number): number {
  const parsed = Number.parseInt(rawYear, 10)
  if (!Number.isFinite(parsed) || parsed < minYear || parsed > maxYear) return maxYear
  const offset = maxYear - parsed
  return maxYear - Math.floor(offset / YEARS_PER_PAGE) * YEARS_PER_PAGE
}

export function YearPicker({
  id,
  label,
  value,
  minYear,
  maxYear,
  disabled = false,
  invalid = false,
  onChange,
}: YearPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pageStartYear, setPageStartYear] = useState(() => pageStartForYear(value, minYear, maxYear))
  const pageYears = useMemo(
    () =>
      Array.from({ length: YEARS_PER_PAGE }, (_, index) => pageStartYear - index).filter(
        (year) => year >= minYear && year <= maxYear,
      ),
    [maxYear, minYear, pageStartYear],
  )
  const canShowEarlier = pageYears[pageYears.length - 1] > minYear
  const canShowLater = pageStartYear < maxYear
  const rangeLabel = pageYears.length ? `${pageYears[pageYears.length - 1]}-${pageYears[0]}` : String(maxYear)

  const closeAfterSelect = (nextValue: string) => {
    onChange(nextValue)
    setIsOpen(false)
  }

  const togglePicker = () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }
    setPageStartYear(pageStartForYear(value, minYear, maxYear))
    setIsOpen(true)
  }

  return (
    <div
      className={styles.yearPicker}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false)
      }}
    >
      <button
        id={id}
        type="button"
        className={`${styles.yearPickerTrigger} ${invalid ? styles.yearPickerTriggerInvalid : ''}`}
        disabled={disabled}
        aria-label={label}
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
              onClick={() => setPageStartYear((current) => Math.max(minYear, current - YEARS_PER_PAGE))}
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
  )
}
