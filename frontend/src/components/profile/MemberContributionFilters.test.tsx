// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// MemberContributionFilters existiert noch nicht — macht diesen Test legitim RED (C/D-06).
import { MemberContributionFilters } from './MemberContributionFilters'

const MOCK_ROLE_TIMELINE = [
  { id: 1, anime_id: 10, anime_title: 'Naruto', role: 'Übersetzung', status: 'confirmed', year: 2020 },
  { id: 2, anime_id: 10, anime_title: 'Naruto', role: 'Timing', status: 'confirmed', year: 2021 },
  { id: 3, anime_id: 20, anime_title: 'One Piece', role: 'Editing', status: 'unverified', year: 2019 },
  { id: 4, anime_id: 30, anime_title: 'Bleach', role: 'Übersetzung', status: 'confirmed', year: 2022 },
]

describe('MemberContributionFilters', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('zeigt alle Einträge ohne aktiven Filter', () => {
    render(
      <MemberContributionFilters
        roleTimeline={MOCK_ROLE_TIMELINE}
      />,
    )

    // Alle vier Einträge sichtbar
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(4)

    // Kein API-Call erfolgt beim Rendern
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('reduziert sichtbare Einträge bei Status-Filter "confirmed" ohne API-Call (D-06)', () => {
    render(
      <MemberContributionFilters
        roleTimeline={MOCK_ROLE_TIMELINE}
      />,
    )

    // Status-Filter auf "confirmed" setzen
    const statusFilter = screen.getByRole('combobox', { name: /status/i })
    fireEvent.change(statusFilter, { target: { value: 'confirmed' } })

    // Unverified-Eintrag (One Piece/Editing) muss ausgeblendet sein
    const items = screen.getAllByRole('listitem')
    expect(items.length).toBeLessThan(MOCK_ROLE_TIMELINE.length)

    // Kein fetch-Aufruf: Filterung ist client-seitig via useMemo (D-06)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('filtert nach Anime-Titel ohne API-Call', () => {
    render(
      <MemberContributionFilters
        roleTimeline={MOCK_ROLE_TIMELINE}
      />,
    )

    const animeFilter = screen.getByRole('combobox', { name: /anime/i })
    fireEvent.change(animeFilter, { target: { value: '10' } })

    // Nur Naruto-Einträge (anime_id=10) sichtbar
    const items = screen.getAllByRole('listitem')
    expect(items.length).toBeLessThan(MOCK_ROLE_TIMELINE.length)

    // Noch immer kein fetch
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
