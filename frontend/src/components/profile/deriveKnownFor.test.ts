import { describe, expect, it } from 'vitest'

// deriveKnownFor existiert noch nicht — macht diesen Test legitim RED (D-03).
// Die Funktion wird in deriveKnownFor.ts (gleicher Ordner) implementiert.
// Rein read-only: kein fetch, kein Schreib-Flow, kein neues DB-Feld (D-03 explizit).
import { deriveKnownFor } from './deriveKnownFor'

// Feste Mock-role_timeline für deterministische Assertions
const MOCK_ROLE_TIMELINE = [
  { id: 1, anime_id: 10, anime_title: 'Naruto', role: 'Übersetzung', status: 'confirmed', year: 2019, group_name: 'SubGroup A' },
  { id: 2, anime_id: 11, anime_title: 'Bleach', role: 'Übersetzung', status: 'confirmed', year: 2021, group_name: 'SubGroup A' },
  { id: 3, anime_id: 12, anime_title: 'One Piece', role: 'Timing', status: 'confirmed', year: 2020, group_name: 'SubGroup B' },
  { id: 4, anime_id: 13, anime_title: 'Dragon Ball', role: 'Übersetzung', status: 'confirmed', year: 2022, group_name: 'SubGroup A' },
  { id: 5, anime_id: 14, anime_title: 'Fairy Tail', role: 'Editing', status: 'unverified', year: 2023, group_name: 'SubGroup C' },
]

describe('deriveKnownFor (D-03 — reine read-only Ableitung aus role_timeline)', () => {
  it('leitet aktive Jahre korrekt ab (min/max Jahr der Einträge)', () => {
    const result = deriveKnownFor(MOCK_ROLE_TIMELINE)

    // Aktive Jahre: 2019 (min) bis 2023 (max)
    expect(result.activeYears).toBe('2019–2023')
  })

  it('leitet Top-Rolle nach Häufigkeit ab (Übersetzung 3x)', () => {
    const result = deriveKnownFor(MOCK_ROLE_TIMELINE)

    // Übersetzung kommt 3x vor (häufigste Rolle)
    expect(result.topRoles[0]).toBe('Übersetzung')
  })

  it('listet bekannte Gruppen (distinct group_name) auf', () => {
    const result = deriveKnownFor(MOCK_ROLE_TIMELINE)

    // Distinct Gruppen: SubGroup A, SubGroup B, SubGroup C
    expect(result.knownGroups).toContain('SubGroup A')
    expect(result.knownGroups).toContain('SubGroup B')
    expect(result.knownGroups.length).toBeGreaterThanOrEqual(2)
  })

  it('gibt deterministisches Ergebnis bei identischer Eingabe zurück', () => {
    const result1 = deriveKnownFor(MOCK_ROLE_TIMELINE)
    const result2 = deriveKnownFor(MOCK_ROLE_TIMELINE)

    expect(result1.activeYears).toBe(result2.activeYears)
    expect(result1.topRoles[0]).toBe(result2.topRoles[0])
  })

  it('gibt leeres Ergebnis für leere role_timeline zurück', () => {
    const result = deriveKnownFor([])

    expect(result.activeYears).toBe('')
    expect(result.topRoles).toHaveLength(0)
    expect(result.knownGroups).toHaveLength(0)
  })

  it('läuft ohne fetch-Aufruf (rein client-seitig, D-03)', async () => {
    // deriveKnownFor darf keinen fetch/API-Call durchführen — nur Input transformieren
    let fetchCalled = false
    const origFetch = globalThis.fetch
    globalThis.fetch = () => {
      fetchCalled = true
      return Promise.resolve(new Response())
    }

    try {
      deriveKnownFor(MOCK_ROLE_TIMELINE)
    } finally {
      globalThis.fetch = origFetch
    }

    expect(fetchCalled).toBe(false)
  })
})
