import { describe, expect, it } from 'vitest'

import { formatMemberPeriod } from '../fansubTeamPeriod'

describe('formatMemberPeriod', () => {
  it('formatiert einen abgeschlossenen Zeitraum mit Halbgeviertstrich', () => {
    expect(formatMemberPeriod(2018, 2020)).toBe('2018–2020')
  })

  it('formatiert einen offenen Zeitraum mit "seit"', () => {
    expect(formatMemberPeriod(2018, null)).toBe('seit 2018')
  })

  it('formatiert ein fehlendes Startjahr mit "bis"', () => {
    expect(formatMemberPeriod(null, 2020)).toBe('bis 2020')
  })

  it('liefert einen leeren String, wenn beide Jahre fehlen', () => {
    expect(formatMemberPeriod(null, null)).toBe('')
  })
})
