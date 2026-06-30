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
import { categoryDisplayLabel } from './capabilityCategories'

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
})
