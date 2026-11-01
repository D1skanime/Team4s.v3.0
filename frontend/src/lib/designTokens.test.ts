// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { readGlobalsCssResolved } from '@/test/readGlobalsCss'

import { extractDesignTokens, groupDesignTokens, isColorLikeValue } from './designTokens'

describe('extractDesignTokens', () => {
  it('liest alle --name: wert;-Deklarationen aus einem :root-Block, auch über mehrere Blöcke hinweg', () => {
    const css = `
      :root {
        --space-1: 4px;
        --accent-primary: #5f84dd;
      }
      .unrelated { color: red; }
      :root {
        --role-accent: #596176;
      }
    `
    const tokens = extractDesignTokens(css)
    expect(tokens).toContainEqual({ name: '--space-1', value: '4px' })
    expect(tokens).toContainEqual({ name: '--accent-primary', value: '#5f84dd' })
    expect(tokens).toContainEqual({ name: '--role-accent', value: '#596176' })
    expect(tokens).toHaveLength(3)
  })

  it('behält bei mehrfach deklariertem Namen die zuletzt im Text gefundene Deklaration (entspricht der echten Kaskade)', () => {
    const css = `:root { --accent-primary: #111; } :root { --accent-primary: #222; }`
    const tokens = extractDesignTokens(css)
    expect(tokens).toEqual([{ name: '--accent-primary', value: '#222' }])
  })

  it('erfasst jede Token-Deklaration aus der echten globals.css -- Vollständigkeitsnachweis gegen eine unabhängige Regex-Zählung derselben Datei', () => {
    const css = readGlobalsCssResolved()
    const tokens = extractDesignTokens(css)

    const rootBlocks = [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map((match) => match[1])
    const independentNames = new Set<string>()
    for (const block of rootBlocks) {
      for (const match of block.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) {
        independentNames.add(match[1])
      }
    }

    expect(tokens.length).toBeGreaterThan(100)
    expect(new Set(tokens.map((token) => token.name))).toEqual(independentNames)
  })
})

describe('groupDesignTokens', () => {
  it('gruppiert automatisch nach dem ersten Namenssegment, ohne eine von Hand gepflegte Zuordnungsliste je Token', () => {
    const groups = groupDesignTokens([
      { name: '--space-1', value: '4px' },
      { name: '--space-2', value: '8px' },
      { name: '--accent-primary', value: '#5f84dd' },
    ])
    const spaceGroup = groups.find((group) => group.key === 'space')
    const accentGroup = groups.find((group) => group.key === 'accent')
    expect(spaceGroup?.tokens).toHaveLength(2)
    expect(accentGroup?.tokens).toHaveLength(1)
  })

  it('übersetzt bekannte Namensfamilien, fällt bei unbekannten Präfixen auf das großgeschriebene Rohsegment zurück statt das Token stillschweigend zu verlieren', () => {
    const groups = groupDesignTokens([
      { name: '--space-1', value: '4px' },
      { name: '--brandnew-token', value: '1px' },
    ])
    expect(groups.find((group) => group.key === 'space')?.label).toBe('Abstände')
    expect(groups.find((group) => group.key === 'brandnew')?.label).toBe('Brandnew')
  })

  it('sortiert Gruppen alphabetisch nach deutscher Beschriftung', () => {
    const groups = groupDesignTokens([
      { name: '--space-1', value: '4px' },
      { name: '--accent-primary', value: '#5f84dd' },
    ])
    const labels = groups.map((group) => group.label)
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'de')))
  })
})

describe('isColorLikeValue', () => {
  it('erkennt echte Farbwerte (Hex/rgba/color-mix/var()) als farbartig', () => {
    expect(isColorLikeValue('#f9f9f9')).toBe(true)
    expect(isColorLikeValue('rgba(0, 0, 0, 0.72)')).toBe(true)
    expect(isColorLikeValue('color-mix(in srgb, var(--accent-primary) 20%, transparent)')).toBe(true)
    expect(isColorLikeValue('var(--color-bg-light)')).toBe(true)
  })

  it('erkennt Verläufe über den gradient()-Substring als farbartig', () => {
    expect(isColorLikeValue('linear-gradient(180deg, #fff 0%, #000 100%)')).toBe(true)
  })

  it('verwirft Längen-, Zahl- und Schriftfamilien-Werte (keine echten Farben)', () => {
    expect(isColorLikeValue('12px')).toBe(false)
    expect(isColorLikeValue('0.75rem')).toBe(false)
    expect(isColorLikeValue('clamp(2rem, 3vw, 2.75rem)')).toBe(false)
    expect(isColorLikeValue('Inter, "Segoe UI", system-ui, sans-serif')).toBe(false)
    expect(isColorLikeValue('0 1px 2px rgba(25, 21, 18, 0.06)')).toBe(false)
    expect(isColorLikeValue('700')).toBe(false)
    expect(isColorLikeValue('')).toBe(false)
  })
})
