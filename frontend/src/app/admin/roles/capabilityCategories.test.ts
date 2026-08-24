// @vitest-environment jsdom
/**
 * Tests für capabilityCategories.ts (Plan 94-06, TDD RED).
 *
 * Test 1: Mapping von "gruppe" auf deutschen Anzeigenamen
 * Test 2: Mapping von "projekt" auf deutschen Anzeigenamen
 * Test 3: Mapping von "release" auf deutschen Anzeigenamen
 * Test 4: Unbekannte Kategorie → Default-Fallback (kein Crash)
 */
import { describe, it, expect } from 'vitest'
import { categoryDisplayLabel, sortCategories } from './capabilityCategories'

describe('categoryDisplayLabel', () => {
  it('mappt "gruppe" auf "Gruppe"', () => {
    expect(categoryDisplayLabel('gruppe')).toBe('Gruppe')
  })

  it('mappt "projekt" auf "Projekt"', () => {
    expect(categoryDisplayLabel('projekt')).toBe('Projekt')
  })

  it('mappt "release" auf "Release"', () => {
    expect(categoryDisplayLabel('release')).toBe('Release')
  })

  it('gibt Default-Anzeigenamen bei unbekannter Kategorie zurück (kein Crash)', () => {
    const result = categoryDisplayLabel('unbekannt_xyz')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  // Plan 138-13 (138-RESEARCH.md Pitfall 2): die vier zuvor fehlenden echten Kategorien
  // erhalten jetzt deliberate deutsche Labels statt des capitalizeFirst-Fallbacks.
  it('mappt "gruppenmedien" auf "Gruppenmedien"', () => {
    expect(categoryDisplayLabel('gruppenmedien')).toBe('Gruppenmedien')
  })

  it('mappt "gruppenseite" auf "Gruppenseite"', () => {
    expect(categoryDisplayLabel('gruppenseite')).toBe('Gruppenseite')
  })

  it('mappt "rechteverwaltung" auf "Rechteverwaltung"', () => {
    expect(categoryDisplayLabel('rechteverwaltung')).toBe('Rechteverwaltung')
  })

  it('mappt "review" auf "Review"', () => {
    expect(categoryDisplayLabel('review')).toBe('Review')
  })
})

describe('sortCategories', () => {
  it('sortiert alle sieben bekannten Kategorien in zufaelliger Eingabereihenfolge in die feste CATEGORY_ORDER', () => {
    const shuffled = [
      'review',
      'gruppenseite',
      'release',
      'gruppe',
      'rechteverwaltung',
      'projekt',
      'gruppenmedien',
    ]
    expect(sortCategories(shuffled)).toEqual([
      'gruppe',
      'gruppenmedien',
      'gruppenseite',
      'projekt',
      'rechteverwaltung',
      'release',
      'review',
    ])
  })

  it('haengt eine unbekannte Kategorie alphabetisch hinter alle bekannten Kategorien', () => {
    expect(sortCategories(['release', 'unbekannt_xyz', 'gruppe'])).toEqual([
      'gruppe',
      'release',
      'unbekannt_xyz',
    ])
  })

  it('sortiert zwei unbekannte Kategorien untereinander alphabetisch', () => {
    expect(sortCategories(['zeta_unbekannt', 'alpha_unbekannt'])).toEqual([
      'alpha_unbekannt',
      'zeta_unbekannt',
    ])
  })
})
