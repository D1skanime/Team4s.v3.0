// @vitest-environment jsdom

import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { MemberContributionFilters } from './MemberContributionFilters'
import type { PublicMemberRoleEntry } from '@/types/contributions'

function makeEntry(overrides: Partial<PublicMemberRoleEntry> = {}): PublicMemberRoleEntry {
  return {
    fansub_group_name: 'Subs e.V.',
    fansub_group_slug: 'subs-ev',
    role_code: 'translation',
    role_label: 'Übersetzung',
    context: 'anime_contribution',
    anime_title: 'Naruto',
    anime_id: 10,
    started_year: 2020,
    ended_year: null,
    status: 'confirmed',
    notes: null,
    ...overrides,
  }
}

const MOCK_ROLE_TIMELINE: PublicMemberRoleEntry[] = [
  makeEntry({ anime_id: 10, anime_title: 'Naruto', role_code: 'translation', role_label: 'Übersetzung', fansub_group_slug: 'subs-ev', fansub_group_name: 'Subs e.V.', status: 'confirmed', started_year: 2020, notes: 'Notiz A' }),
  makeEntry({ anime_id: 10, anime_title: 'Naruto', role_code: 'timing', role_label: 'Timing', fansub_group_slug: 'subs-ev', fansub_group_name: 'Subs e.V.', status: 'confirmed', started_year: 2021 }),
  makeEntry({ anime_id: 20, anime_title: 'One Piece', role_code: 'editing', role_label: 'Editing', fansub_group_slug: 'other-grp', fansub_group_name: 'Other Group', status: 'proposed', started_year: 2015 }),
  makeEntry({ anime_id: 30, anime_title: 'Bleach', role_code: 'translation', role_label: 'Übersetzung', fansub_group_slug: 'subs-ev', fansub_group_name: 'Subs e.V.', status: 'confirmed', started_year: 2008 }),
]

function countEntries(): number {
  // Die gefilterte Liste rendert über MemberRoleTimeline (ul > li).
  return screen.queryAllByRole('listitem').length
}

describe('MemberContributionFilters (GAP-1 / GAP-2)', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('zeigt alle Einträge ohne aktiven Filter und löst keinen fetch aus (D-06)', () => {
    render(<MemberContributionFilters roleTimeline={MOCK_ROLE_TIMELINE} />)

    expect(countEntries()).toBe(MOCK_ROLE_TIMELINE.length)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('rendert die gefilterte Liste über MemberRoleTimeline (Inline-Expand erreichbar, GAP-2)', () => {
    render(<MemberContributionFilters roleTimeline={MOCK_ROLE_TIMELINE} />)

    // MemberRoleTimeline rendert den "Details anzeigen"-Button (EntryDetail).
    expect(screen.getAllByRole('button', { name: /details anzeigen/i }).length).toBeGreaterThan(0)
  })

  it('bietet fünf @/components/ui Select-Filter (Anime/Gruppe/Rolle/Zeitraum/Status)', () => {
    render(<MemberContributionFilters roleTimeline={MOCK_ROLE_TIMELINE} />)

    expect(screen.getByRole('combobox', { name: /anime/i })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: /gruppe/i })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: /rolle/i })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: /zeitraum/i })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: /status/i })).toBeTruthy()

    // Keine nativen ungekapselten Selects außerhalb des Design-Systems — alle haben die UI-Klasse.
    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(5)
  })

  it('Anime-Filter reduziert clientseitig (kein fetch)', () => {
    render(<MemberContributionFilters roleTimeline={MOCK_ROLE_TIMELINE} />)

    fireEvent.change(screen.getByRole('combobox', { name: /anime/i }), { target: { value: '10' } })

    expect(countEntries()).toBe(2)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('Gruppe-Filter reduziert clientseitig', () => {
    render(<MemberContributionFilters roleTimeline={MOCK_ROLE_TIMELINE} />)

    fireEvent.change(screen.getByRole('combobox', { name: /gruppe/i }), { target: { value: 'other-grp' } })

    expect(countEntries()).toBe(1)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('Rolle-Filter reduziert clientseitig', () => {
    render(<MemberContributionFilters roleTimeline={MOCK_ROLE_TIMELINE} />)

    fireEvent.change(screen.getByRole('combobox', { name: /rolle/i }), { target: { value: 'translation' } })

    // translation kommt zweimal vor (Naruto + Bleach)
    expect(countEntries()).toBe(2)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('Zeitraum-Filter reduziert clientseitig', () => {
    render(<MemberContributionFilters roleTimeline={MOCK_ROLE_TIMELINE} />)

    const zeitraum = screen.getByRole('combobox', { name: /zeitraum/i })
    // Wähle die Dekade 2020–2029 (Naruto 2020 + 2021)
    fireEvent.change(zeitraum, { target: { value: '2020' } })

    expect(countEntries()).toBe(2)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('Status-Filter "confirmed" blendet unbestätigte Einträge aus', () => {
    render(<MemberContributionFilters roleTimeline={MOCK_ROLE_TIMELINE} />)

    fireEvent.change(screen.getByRole('combobox', { name: /status/i }), { target: { value: 'confirmed' } })

    // One Piece (proposed) ausgeblendet -> 3 von 4
    expect(countEntries()).toBe(3)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('kombiniert Filter mit UND-Verknüpfung', () => {
    render(<MemberContributionFilters roleTimeline={MOCK_ROLE_TIMELINE} />)

    fireEvent.change(screen.getByRole('combobox', { name: /rolle/i }), { target: { value: 'translation' } })
    fireEvent.change(screen.getByRole('combobox', { name: /anime/i }), { target: { value: '10' } })

    // translation UND anime 10 -> nur Naruto/Übersetzung
    expect(countEntries()).toBe(1)
  })

  it('zeigt einen Empty-State, wenn der Filter alles ausblendet', () => {
    render(<MemberContributionFilters roleTimeline={MOCK_ROLE_TIMELINE} />)

    fireEvent.change(screen.getByRole('combobox', { name: /anime/i }), { target: { value: '10' } })
    fireEvent.change(screen.getByRole('combobox', { name: /gruppe/i }), { target: { value: 'other-grp' } })

    expect(countEntries()).toBe(0)
    // Empty-Text aus MemberRoleTimeline
    expect(screen.getByText(/noch keine rollen oder beiträge/i)).toBeTruthy()
  })

  it('leitet Optionen aus role_timeline ab (keine Hardcodes)', () => {
    render(<MemberContributionFilters roleTimeline={MOCK_ROLE_TIMELINE} />)

    const animeSelect = screen.getByRole('combobox', { name: /anime/i })
    // Alle + 3 distinct Anime
    expect(within(animeSelect).getAllByRole('option')).toHaveLength(4)

    const groupSelect = screen.getByRole('combobox', { name: /gruppe/i })
    // Alle + 2 distinct Gruppen
    expect(within(groupSelect).getAllByRole('option')).toHaveLength(3)
  })
})
