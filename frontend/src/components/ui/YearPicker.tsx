'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'

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
  const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
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

  const updatePanelPosition = () => {
    const trigger = triggerRef.current
    if (!trigger || typeof window === 'undefined') return

    const rect = trigger.getBoundingClientRect()
    const margin = 12
    const gap = 8
    const preferredHeight = 248
    const footerTop = Array.from(document.querySelectorAll('[class*="drawerFooter"]'))
      .map((footer) => footer.getBoundingClientRect().top)
      .filter((top) => top > rect.bottom)
      .sort((a, b) => a - b)[0]
    const viewportBottom = Math.min(window.innerHeight, footerTop ?? window.innerHeight)
    const spaceBelow = viewportBottom - rect.bottom - margin
    const spaceAbove = rect.top - margin
    const openAbove = spaceBelow < preferredHeight && spaceAbove > spaceBelow
    const availableHeight = Math.max(176, Math.min(preferredHeight, (openAbove ? spaceAbove : spaceBelow) - gap))
    const top = openAbove
      ? Math.max(margin, rect.top - availableHeight - gap)
      : Math.min(rect.bottom + gap, window.innerHeight - availableHeight - margin)

    setPanelStyle({
      left: Math.max(margin, Math.min(rect.left, window.innerWidth - rect.width - margin)),
      top,
      width: rect.width,
      maxHeight: availableHeight,
    })
  }

  const togglePicker = () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }
    setPageStartYear(pageStartForYear(value, minYear, maxYear))
    updatePanelPosition()
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) return
    updatePanelPosition()

    const handleReposition = () => updatePanelPosition()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, value, minYear, maxYear])

  const pickerPanel = isOpen && !disabled ? (
    <div
      id={`${id}-picker`}
      ref={panelRef}
      className={styles.yearPickerPanel}
      style={panelStyle ?? undefined}
      role="dialog"
      aria-label={`${label} auswählen`}
      onMouseDown={(event) => event.preventDefault()}
    >
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
  ) : null

  return (
    <div
      className={styles.yearPicker}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null
        if (!event.currentTarget.contains(nextTarget) && !panelRef.current?.contains(nextTarget)) setIsOpen(false)
      }}
    >
      <button
        id={id}
        ref={triggerRef}
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
      {pickerPanel && typeof document !== 'undefined' ? createPortal(pickerPanel, document.body) : null}
    </div>
  )
}
