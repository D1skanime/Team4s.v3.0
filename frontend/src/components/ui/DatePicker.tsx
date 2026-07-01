'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

import { classNames } from './classNames'
import styles from './ui.module.css'

type DatePickerProps = {
  id: string
  label: string
  value: string
  minYear: number
  maxYear: number
  minDate?: string
  maxDate?: string
  disabled?: boolean
  invalid?: boolean
  onChange: (value: string) => void
}

type PickerView = 'day' | 'month' | 'year'

const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const YEARS_PER_PAGE = 12

function clampYear(year: number, minYear: number, maxYear: number): number {
  return Math.min(maxYear, Math.max(minYear, year))
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

function parseDateValue(value: string, minYear: number, maxYear: number): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}$/.test(trimmed)) {
    return new Date(clampYear(Number(trimmed), minYear, maxYear), 0, 1)
  }
  if (!isIsoDate(trimmed)) return null
  const [yearRaw, monthRaw, dayRaw] = trimmed.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw) - 1
  const day = Number(dayRaw)
  const date = new Date(year, month, day)
  if (Number.isNaN(date.getTime())) return null
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null
  return new Date(clampYear(year, minYear, maxYear), month, day)
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDisplayDate(value: string, minYear: number, maxYear: number): string {
  const date = parseDateValue(value, minYear, maxYear)
  if (!date) return ''
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
}

function sameDate(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
}

function compareDateOnly(left: Date, right: Date): number {
  const leftTime = new Date(left.getFullYear(), left.getMonth(), left.getDate()).getTime()
  const rightTime = new Date(right.getFullYear(), right.getMonth(), right.getDate()).getTime()
  return leftTime - rightTime
}

function startOfCalendarGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1)
  const mondayBasedDay = (first.getDay() + 6) % 7
  return new Date(year, month, 1 - mondayBasedDay)
}

function pageStartForYear(year: number): number {
  return Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE
}

function yearRangeLabel(start: number, minYear: number, maxYear: number): string {
  const from = Math.max(start, minYear)
  const to = Math.min(start + YEARS_PER_PAGE - 1, maxYear)
  return `${from} - ${to}`
}

function yearIsSelectable(year: number, minDate: Date | null, maxDate: Date | null): boolean {
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  if (minDate && compareDateOnly(end, minDate) < 0) return false
  if (maxDate && compareDateOnly(start, maxDate) > 0) return false
  return true
}

function monthIsSelectable(year: number, month: number, minDate: Date | null, maxDate: Date | null): boolean {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  if (minDate && compareDateOnly(end, minDate) < 0) return false
  if (maxDate && compareDateOnly(start, maxDate) > 0) return false
  return true
}

export function DatePicker({
  id,
  label,
  value,
  minYear,
  maxYear,
  minDate,
  maxDate,
  disabled = false,
  invalid = false,
  onChange,
}: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const selectedDate = useMemo(() => parseDateValue(value, minYear, maxYear), [value, minYear, maxYear])
  const minSelectableDate = useMemo(() => parseDateValue(minDate ?? '', minYear, maxYear), [minDate, minYear, maxYear])
  const maxSelectableDate = useMemo(() => parseDateValue(maxDate ?? '', minYear, maxYear), [maxDate, minYear, maxYear])
  const initialVisible = selectedDate ?? new Date(clampYear(new Date().getFullYear(), minYear, maxYear), new Date().getMonth(), new Date().getDate())
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<PickerView>('day')
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(initialVisible.getFullYear(), initialVisible.getMonth(), 1))
  const [yearPageStart, setYearPageStart] = useState(() => pageStartForYear(initialVisible.getFullYear()))
  const [openAbove, setOpenAbove] = useState(false)

  useEffect(() => {
    if (!selectedDate || isOpen) return
    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
    setYearPageStart(pageStartForYear(selectedDate.getFullYear()))
  }, [selectedDate, isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    window.setTimeout(() => {
      triggerRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      const triggerBox = triggerRef.current?.getBoundingClientRect()
      const panelHeight = panelRef.current?.offsetHeight ?? 360
      if (!triggerBox) return
      const spaceBelow = window.innerHeight - triggerBox.bottom
      const spaceAbove = triggerBox.top
      setOpenAbove(spaceBelow < panelHeight + 16 && spaceAbove > spaceBelow)
    }, 0)
  }, [isOpen, view])

  const calendarDays = useMemo(() => {
    const start = startOfCalendarGrid(visibleMonth.getFullYear(), visibleMonth.getMonth())
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  }, [visibleMonth])

  const years = useMemo(
    () => Array.from({ length: YEARS_PER_PAGE }, (_, index) => yearPageStart + index).filter((year) => year >= minYear && year <= maxYear),
    [yearPageStart, minYear, maxYear],
  )

  const today = new Date()
  const displayValue = toDisplayDate(value, minYear, maxYear)
  const previousMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
  const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
  const effectiveMinYear = minSelectableDate?.getFullYear() ?? minYear
  const effectiveMaxYear = maxSelectableDate?.getFullYear() ?? maxYear
  const canGoPreviousMonth = previousMonth.getFullYear() >= minYear && monthIsSelectable(previousMonth.getFullYear(), previousMonth.getMonth(), minSelectableDate, maxSelectableDate)
  const canGoNextMonth = nextMonth.getFullYear() <= maxYear && monthIsSelectable(nextMonth.getFullYear(), nextMonth.getMonth(), minSelectableDate, maxSelectableDate)
  const canGoPreviousYears = yearPageStart > effectiveMinYear
  const canGoNextYears = yearPageStart + YEARS_PER_PAGE - 1 < effectiveMaxYear

  function isSelectableDate(date: Date): boolean {
    if (date.getFullYear() < minYear || date.getFullYear() > maxYear) return false
    if (minSelectableDate && compareDateOnly(date, minSelectableDate) < 0) return false
    if (maxSelectableDate && compareDateOnly(date, maxSelectableDate) > 0) return false
    return true
  }

  function openPicker() {
    if (disabled) return
    const date = selectedDate ?? new Date(clampYear(today.getFullYear(), minYear, maxYear), today.getMonth(), today.getDate())
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    setYearPageStart(pageStartForYear(date.getFullYear()))
    setView('year')
    setIsOpen(true)
  }

  function changeMonth(delta: number) {
    setVisibleMonth((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() + delta, 1)
      return new Date(clampYear(next.getFullYear(), minYear, maxYear), next.getMonth(), 1)
    })
  }

  function selectYear(year: number) {
    if (!yearIsSelectable(year, minSelectableDate, maxSelectableDate)) return
    setVisibleMonth((current) => new Date(year, current.getMonth(), 1))
    setView('month')
  }

  function selectMonth(month: number) {
    if (!monthIsSelectable(visibleMonth.getFullYear(), month, minSelectableDate, maxSelectableDate)) return
    setVisibleMonth((current) => new Date(current.getFullYear(), month, 1))
    setView('day')
  }

  function selectDay(date: Date) {
    if (!isSelectableDate(date)) return
    onChange(toIsoDate(date))
    setIsOpen(false)
  }

  function clearDate() {
    onChange('')
    setIsOpen(false)
  }

  function selectToday() {
    const next = new Date(clampYear(today.getFullYear(), minYear, maxYear), today.getMonth(), today.getDate())
    if (!isSelectableDate(next)) return
    onChange(toIsoDate(next))
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1))
    setIsOpen(false)
  }

  return (
    <div className={styles.datePicker} ref={rootRef}>
      <div className={styles.datePickerTopRow}>
        <button
          id={id}
          ref={triggerRef}
          type="button"
          className={classNames(styles.datePickerTrigger, invalid && styles.controlInvalid)}
          aria-label={`${label} auswählen`}
          aria-expanded={isOpen}
          disabled={disabled}
          onClick={openPicker}
        >
          <span className={displayValue ? styles.datePickerValue : styles.datePickerPlaceholder}>
            {displayValue || 'TT.MM.JJJJ'}
          </span>
          <CalendarDays size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.datePickerInlineClear}
          disabled={disabled || !value}
          onClick={clearDate}
        >
          Leeren
        </button>
      </div>

      {isOpen ? (
        <div
          ref={panelRef}
          className={classNames(styles.datePickerPanel, openAbove && styles.datePickerPanelAbove)}
          role="dialog"
          aria-label={`${label} Kalender`}
        >
          <div className={styles.datePickerPanelHeader}>
            <button
              type="button"
              className={styles.datePickerNavButton}
              disabled={view === 'year' ? !canGoPreviousYears : view === 'month' ? visibleMonth.getFullYear() <= minYear : !canGoPreviousMonth}
              onClick={() => {
                if (view === 'year') setYearPageStart((current) => Math.max(minYear, current - YEARS_PER_PAGE))
                else if (view === 'month') setVisibleMonth((current) => new Date(clampYear(current.getFullYear() - 1, minYear, maxYear), current.getMonth(), 1))
                else changeMonth(-1)
              }}
              aria-label="Zurück"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <div className={styles.datePickerPanelTitle}>
              {view === 'year' ? (
                <span>{yearRangeLabel(yearPageStart, minYear, maxYear)}</span>
              ) : view === 'month' ? (
                <button type="button" onClick={() => { setYearPageStart(pageStartForYear(visibleMonth.getFullYear())); setView('year') }}>
                  {visibleMonth.getFullYear()}
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => setView('month')}>
                    {MONTH_LABELS[visibleMonth.getMonth()]}
                  </button>
                  <button type="button" onClick={() => { setYearPageStart(pageStartForYear(visibleMonth.getFullYear())); setView('year') }}>
                    {visibleMonth.getFullYear()}
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              className={styles.datePickerNavButton}
              disabled={view === 'year' ? !canGoNextYears : view === 'month' ? visibleMonth.getFullYear() >= maxYear : !canGoNextMonth}
              onClick={() => {
                if (view === 'year') setYearPageStart((current) => Math.min(maxYear, current + YEARS_PER_PAGE))
                else if (view === 'month') setVisibleMonth((current) => new Date(clampYear(current.getFullYear() + 1, minYear, maxYear), current.getMonth(), 1))
                else changeMonth(1)
              }}
              aria-label="Weiter"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          {view === 'day' ? (
            <>
              <div className={styles.datePickerWeekdays}>
                {WEEKDAY_LABELS.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>
              <div className={styles.datePickerDayGrid}>
                {calendarDays.map((date) => {
                  const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()
                  const isSelected = selectedDate ? sameDate(date, selectedDate) : false
                  const isToday = sameDate(date, today)
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  const isOutOfRange = date.getFullYear() < minYear || date.getFullYear() > maxYear
                  return (
                    <button
                      key={toIsoDate(date)}
                      type="button"
                      className={classNames(
                        styles.datePickerDay,
                        !isCurrentMonth && styles.datePickerDayMuted,
                        isWeekend && styles.datePickerDayWeekend,
                        isToday && styles.datePickerDayToday,
                        isSelected && styles.datePickerDaySelected,
                      )}
                      disabled={isOutOfRange}
                      onClick={() => selectDay(date)}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>
            </>
          ) : null}

          {view === 'month' ? (
            <div className={styles.datePickerMonthGrid}>
              {MONTH_LABELS.map((month, index) => (
                <button
                  key={month}
                  type="button"
                  className={classNames(index === visibleMonth.getMonth() && styles.datePickerTileSelected)}
                  disabled={!monthIsSelectable(visibleMonth.getFullYear(), index, minSelectableDate, maxSelectableDate)}
                  onClick={() => selectMonth(index)}
                >
                  {month}
                </button>
              ))}
            </div>
          ) : null}

          {view === 'year' ? (
            <div className={styles.datePickerYearGrid}>
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  className={classNames(year === visibleMonth.getFullYear() && styles.datePickerTileSelected)}
                  disabled={!yearIsSelectable(year, minSelectableDate, maxSelectableDate)}
                  onClick={() => selectYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          ) : null}

          {view === 'day' ? (
            <div className={styles.datePickerFooter}>
              <button type="button" disabled={!isSelectableDate(today)} onClick={selectToday}>Heute</button>
              <button type="button" disabled={!value} onClick={clearDate}>Leeren</button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
