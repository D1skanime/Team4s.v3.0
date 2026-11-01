/**
 * Reine Datums-/Kalender-Hilfsfunktionen für DatePicker: Parsen/Formatieren des ISO-Werts,
 * Jahres-/Monats-Auswählbarkeit innerhalb von min/max-Datum, Kalenderraster-Aufbau und
 * Jahres-Seiten-Paginierung. Ohne React/DOM-Abhängigkeit, daher unabhängig vom Komponenten-
 * Rendering testbar.
 */

export const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
export const YEARS_PER_PAGE = 12

export function clampYear(year: number, minYear: number, maxYear: number): number {
  return Math.min(maxYear, Math.max(minYear, year))
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

export function parseDateValue(value: string, minYear: number, maxYear: number): Date | null {
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

export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function toDisplayDate(value: string, minYear: number, maxYear: number): string {
  const date = parseDateValue(value, minYear, maxYear)
  if (!date) return ''
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
}

export function sameDate(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
}

export function compareDateOnly(left: Date, right: Date): number {
  const leftTime = new Date(left.getFullYear(), left.getMonth(), left.getDate()).getTime()
  const rightTime = new Date(right.getFullYear(), right.getMonth(), right.getDate()).getTime()
  return leftTime - rightTime
}

export function startOfCalendarGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1)
  const mondayBasedDay = (first.getDay() + 6) % 7
  return new Date(year, month, 1 - mondayBasedDay)
}

export function pageStartForYear(year: number): number {
  return Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE
}

export function yearRangeLabel(start: number, minYear: number, maxYear: number): string {
  const from = Math.max(start, minYear)
  const to = Math.min(start + YEARS_PER_PAGE - 1, maxYear)
  return `${from} - ${to}`
}

export function yearIsSelectable(year: number, minDate: Date | null, maxDate: Date | null): boolean {
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  if (minDate && compareDateOnly(end, minDate) < 0) return false
  if (maxDate && compareDateOnly(start, maxDate) > 0) return false
  return true
}

export function monthIsSelectable(year: number, month: number, minDate: Date | null, maxDate: Date | null): boolean {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  if (minDate && compareDateOnly(end, minDate) < 0) return false
  if (maxDate && compareDateOnly(start, maxDate) > 0) return false
  return true
}
