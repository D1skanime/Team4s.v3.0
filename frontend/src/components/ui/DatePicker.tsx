'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { CalendarDays, X } from 'lucide-react'

import { Button } from './Button'
import { classNames } from './classNames'
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  YEARS_PER_PAGE,
  clampYear,
  compareDateOnly,
  monthIsSelectable,
  pageStartForYear,
  parseDateValue,
  sameDate,
  startOfCalendarGrid,
  toDisplayDate,
  toIsoDate,
  yearIsSelectable,
  yearRangeLabel,
} from './DatePicker.dateLogic'
import { IconButton } from './IconButton'
import { NavArrow } from './NavArrow'
import styles from './DatePicker.module.css'

type DatePickerProps = {
  id: string
  label: string
  value: string
  minYear: number
  maxYear: number
  minDate?: string
  maxDate?: string
  disabled?: boolean
  panelAlign?: 'start' | 'end'
  invalid?: boolean
  /** Von FormField automatisch verknüpfte Fehler-/Hinweis-IDs (additiv, siehe FormField.tsx). */
  'aria-describedby'?: string
  onChange: (value: string) => void
}

type PickerView = 'day' | 'month' | 'year'

/**
 * Datums-Auswahl mit Tages-/Monats-/Jahres-Panel. Auslöser und Leeren-Symbol nutzen `IconButton`s
 * offizielle `field`-Variante (Feld-Zeilen-Auslöser, kein eigener Rahmen/Hintergrund) bzw.
 * `ghost`-Variante mit `tone="clear"` (dezent im Ruhezustand, deutlich bei Hover); Tages-/Monats-/
 * Jahres-Kacheln nutzen `IconButton`s offizielle `tile`-Variante mit `size="fill"` -- der
 * "ausgewählt"-Zustand kommt über `aria-current`, denselben Mechanismus wie bei `Button`. Mindest-
 * höhe (`minHeight`), gedämpfte Vormonats-/Folgemonats-Tage (`dimmed`), Wochenend-/Leeren-Akzent
 * (`tone="muted"`/`"line"`), die "heute"-Markierung (`highlighted`) sowie die gefüllte Optik der
 * größeren Monats-/Jahres-Kacheln (`tileFill`) sind ebenfalls offizielle `IconButton`-Optionen,
 * keine von außen injizierten CSS-Klassen. Monats-/Jahres-Titel-Umschalter und Fußzeilen-Aktionen
 * nutzen `Button`s `ghost`-Variante, die Fußzeile zusätzlich `tone="primary"`/`"line"` für ihre
 * Akzentfarbe. Der Auslöser nutzt `IconButton`s `icon`-Prop für sein Wert-/Symbol-Layout, da
 * `Button` keinen Ref weiterleitet, dieser Baustein aber für die Panel-Positionierung (Rand-
 * Erkennung oben/unten) einen echten `HTMLButtonElement`-Ref benötigt. Die reinen Datums-/
 * Kalender-Hilfsfunktionen (Parsen/Formatieren, Auswählbarkeit, Kalenderraster, Jahres-Seiten)
 * liegen in `DatePicker.dateLogic.ts` (Datei-Zeilenlimit, ohne React-Abhängigkeit unabhängig
 * testbar).
 */
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
  panelAlign = 'start',
  'aria-describedby': ariaDescribedBy,
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
    const date = selectedDate ?? minSelectableDate ?? maxSelectableDate ?? new Date(clampYear(today.getFullYear(), minYear, maxYear), today.getMonth(), today.getDate())
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
      <div className={classNames(styles.datePickerField, invalid && styles.datePickerFieldInvalid, disabled && styles.datePickerFieldDisabled)}>
        <IconButton
          id={id}
          ref={triggerRef}
          variant="field"
          size="fill"
          icon={
            <>
              <span className={displayValue ? styles.datePickerValue : styles.datePickerPlaceholder}>
                {displayValue || 'TT.MM.JJJJ'}
              </span>
              <CalendarDays size={16} aria-hidden="true" />
            </>
          }
          className={styles.datePickerTrigger}
          aria-label={`${label} auswählen`}
          aria-expanded={isOpen}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          onClick={openPicker}
        />
        <IconButton
          variant="ghost"
          size="sm"
          tone="clear"
          icon={<X size={14} aria-hidden="true" />}
          aria-label="Datum leeren"
          className={styles.datePickerClearButton}
          disabled={disabled || !value}
          onClick={clearDate}
        />
      </div>

      {isOpen ? (
        <div
          ref={panelRef}
          className={classNames(
            styles.datePickerPanel,
            openAbove && styles.datePickerPanelAbove,
            panelAlign === 'end' && styles.datePickerPanelEnd,
          )}
          role="dialog"
          aria-label={`${label} Kalender`}
        >
          <div className={styles.datePickerPanelHeader}>
            <NavArrow
              direction="previous"
              label="Zurück"
              size="sm"
              disabled={view === 'year' ? !canGoPreviousYears : view === 'month' ? visibleMonth.getFullYear() <= minYear : !canGoPreviousMonth}
              onClick={() => {
                if (view === 'year') setYearPageStart((current) => Math.max(minYear, current - YEARS_PER_PAGE))
                else if (view === 'month') setVisibleMonth((current) => new Date(clampYear(current.getFullYear() - 1, minYear, maxYear), current.getMonth(), 1))
                else changeMonth(-1)
              }}
            />
            <div className={styles.datePickerPanelTitle}>
              {view === 'year' ? (
                <span>{yearRangeLabel(yearPageStart, minYear, maxYear)}</span>
              ) : view === 'month' ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setYearPageStart(pageStartForYear(visibleMonth.getFullYear())); setView('year') }}
                >
                  {visibleMonth.getFullYear()}
                </Button>
              ) : (
                <>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setView('month')}>
                    {MONTH_LABELS[visibleMonth.getMonth()]}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setYearPageStart(pageStartForYear(visibleMonth.getFullYear())); setView('year') }}
                  >
                    {visibleMonth.getFullYear()}
                  </Button>
                </>
              )}
            </div>
            <NavArrow
              direction="next"
              label="Weiter"
              size="sm"
              disabled={view === 'year' ? !canGoNextYears : view === 'month' ? visibleMonth.getFullYear() >= maxYear : !canGoNextMonth}
              onClick={() => {
                if (view === 'year') setYearPageStart((current) => Math.min(maxYear, current + YEARS_PER_PAGE))
                else if (view === 'month') setVisibleMonth((current) => new Date(clampYear(current.getFullYear() + 1, minYear, maxYear), current.getMonth(), 1))
                else changeMonth(1)
              }}
            />
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
                  const isSelectable = isSelectableDate(date)
                  return (
                    <IconButton
                      key={toIsoDate(date)}
                      variant="tile"
                      size="fill"
                      minHeight="sm"
                      dimmed={!isCurrentMonth}
                      tone={isWeekend ? 'line' : !isCurrentMonth ? 'muted' : undefined}
                      highlighted={isToday}
                      icon={date.getDate()}
                      aria-label={String(date.getDate())}
                      aria-current={isSelected ? 'true' : undefined}
                      className={styles.datePickerDay}
                      disabled={!isSelectable}
                      onClick={() => selectDay(date)}
                    />
                  )
                })}
              </div>
            </>
          ) : null}

          {view === 'month' ? (
            <div className={styles.datePickerMonthGrid}>
              {MONTH_LABELS.map((month, index) => (
                <IconButton
                  key={month}
                  variant="tile"
                  size="fill"
                  minHeight="md"
                  tileFill
                  icon={month}
                  aria-label={month}
                  aria-current={index === visibleMonth.getMonth() ? 'true' : undefined}
                  disabled={!monthIsSelectable(visibleMonth.getFullYear(), index, minSelectableDate, maxSelectableDate)}
                  onClick={() => selectMonth(index)}
                />
              ))}
            </div>
          ) : null}

          {view === 'year' ? (
            <div className={styles.datePickerYearGrid}>
              {years.map((year) => (
                <IconButton
                  key={year}
                  variant="tile"
                  size="fill"
                  minHeight="md"
                  tileFill
                  icon={year}
                  aria-label={String(year)}
                  aria-current={year === visibleMonth.getFullYear() ? 'true' : undefined}
                  disabled={!yearIsSelectable(year, minSelectableDate, maxSelectableDate)}
                  onClick={() => selectYear(year)}
                />
              ))}
            </div>
          ) : null}

          {view === 'day' ? (
            <div className={styles.datePickerFooter}>
              <Button type="button" variant="ghost" size="sm" tone="primary" disabled={!isSelectableDate(today)} onClick={selectToday}>
                Heute
              </Button>
              <Button type="button" variant="ghost" size="sm" tone="line" disabled={!value} onClick={clearDate}>
                Leeren
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
