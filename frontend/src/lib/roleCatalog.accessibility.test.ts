import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { NEUTRAL_ROLE_COLOR_KEY, ROLE_COLOR_KEYS } from './roleCatalog'

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/globals.css'), 'utf8')

function hexRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as [number, number, number]
}

function mix(foreground: [number, number, number], background: [number, number, number], alpha: number): [number, number, number] {
  return foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha)) as [number, number, number]
}

function luminance(rgb: [number, number, number]): number {
  const channels = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

function rootHex(name: string): [number, number, number] {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))
  expect(match, `${name} must resolve to a concrete hex token`).not.toBeNull()
  return hexRgb(match![1])
}

describe('role catalog chip accessibility', () => {
  it('resolves every bounded treatment from the actual stylesheet with no role-code selector', () => {
    expect(css).not.toMatch(/\[data-role-code(?:=|\])/)
    for (const colorKey of [...ROLE_COLOR_KEYS, NEUTRAL_ROLE_COLOR_KEY]) {
      const selectorKey = colorKey.replace('#', '\\#')
      const accent = colorKey === NEUTRAL_ROLE_COLOR_KEY ? '#596176' : selectorKey
      expect(css).toMatch(new RegExp(`\\[data-color-key=['"]${selectorKey}['"]\\]\\s*\\{[^}]*--role-chip-accent:\\s*${accent}`, 'i'))
    }
  })

  it('proves text, boundary and focus contrast for all 15 catalog treatments', () => {
    const card = rootHex('--surface-card')
    const text = rootHex('--role-chip-text')
    const border = rootHex('--role-chip-border')
    const focus = rootHex('--role-chip-focus')
    for (const colorKey of ROLE_COLOR_KEYS) {
      const background = mix(hexRgb(colorKey), card, 0.14)
      expect(contrast(text, background), `${colorKey} text`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(border, background), `${colorKey} border`).toBeGreaterThanOrEqual(3)
      expect(contrast(focus, background), `${colorKey} focus`).toBeGreaterThanOrEqual(3)
    }
  })
})

/**
 * Plan 148-02, Task 2: contrast proofs for every restored --role-accent formula introduced
 * across the whole phase (UI-SPEC "Contrast Requirements" table), covering every surface except
 * the already-proven .role-catalog-chip formula above. All percentages below are extracted from
 * the real, post-restoration CSS/TSX text via regex - never hand-copied - per the UI-SPEC's "How
 * this is checked" section.
 *
 * IMPORTANT FINDING: reading the real formulas and computing genuine WCAG contrast (rather than
 * trusting the pre-existing ratios by eye) surfaces that several restored formulas fall short of
 * their locked threshold for some or all of the 15 catalog hexes. Per the UI-SPEC's own explicit
 * instruction for the FansubEdit role-toggle ("if any of the 15 hex values fails ... report the
 * failing hex(es) ... rather than silently forcing the assertion to pass"), the same treatment is
 * applied consistently to every formula below that provably falls short: the exact, currently
 * measured failing-hex set is asserted (a regression-detecting "known gap" snapshot), not hidden
 * behind a loosened threshold. None of these gaps are fixed here - Task 2's file list is this test
 * file only, the failing formulas' ratios are the Restoration Rule's locked pre-existing values,
 * and fixing them (raising a mix percentage, choosing a different mix target, etc.) is a formula
 * change outside this plan's scope. See 148-02-SUMMARY.md "Deviations" for the full write-up.
 */
describe('restored role-accent formulas across Phase 148 (Plan 148-02, Task 2)', () => {
  function readModule(relativePath: string): string {
    return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
  }

  /** Extracts every `color-mix(in srgb, var(--<accentVar>) N%, <mixTargetSource>)` percentage
   *  (as a 0-1 fraction), in source order, from real CSS text. Never hand-copies a ratio. */
  function extractMixPercents(cssText: string, accentVar: string, mixTargetSource: string): number[] {
    const regex = new RegExp(
      `color-mix\\(in srgb,\\s*var\\(--${accentVar}\\)\\s*(\\d+)%,\\s*${mixTargetSource}\\)`,
      'g',
    )
    const percents: number[] = []
    let match: RegExpExecArray | null
    while ((match = regex.exec(cssText)) !== null) {
      percents.push(Number(match[1]) / 100)
    }
    return percents
  }

  const surfaceCard = rootHex('--surface-card')
  const colorBorder = rootHex('--color-border')
  const textPrimary = rootHex('--color-text-primary')
  const textSecondary = rootHex('--color-text-secondary')
  const white: [number, number, number] = [255, 255, 255]

  function borderSubtleFlatOverCard(): [number, number, number] {
    const match = css.match(/--border-subtle:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
    expect(match, '--border-subtle must resolve to an rgba() token').not.toBeNull()
    const [, r, g, b, a] = match!
    return mix([Number(r), Number(g), Number(b)], surfaceCard, Number(a))
  }
  const borderSubtle = borderSubtleFlatOverCard()

  describe('PublicNoteCard.module.css', () => {
    const cssText = readModule('src/components/public/PublicNoteCard.module.css')

    it('.head background (role-accent/--color-border mix) vs .role text (role-accent/--text-primary mix) - flags the known gap against the 4.5:1 text threshold for every catalog hex', () => {
      const [headPct] = extractMixPercents(cssText, 'role-accent', 'var\\(--color-border\\)')
      const [rolePct] = extractMixPercents(cssText, 'role-accent', 'var\\(--text-primary\\)')
      expect(headPct, '.head must be a role-accent/--color-border color-mix').toBeDefined()
      expect(rolePct, '.role must be a role-accent/--text-primary color-mix').toBeDefined()
      const failing = ROLE_COLOR_KEYS.filter((colorKey) => {
        const accent = hexRgb(colorKey)
        const headBackground = mix(accent, colorBorder, headPct)
        const roleText = mix(accent, textPrimary, rolePct)
        return contrast(roleText, headBackground) < 4.5
      })
      // Measured today: every one of the 15 catalog hexes lands between ~4.0:1 and ~4.4:1 for
      // this pre-existing 55%/38% ratio pair - consistently just under the 4.5:1 AA text floor.
      // Restoration Rule locks these ratios; not fixed by this plan (file not in Task 1's scope).
      expect(failing, '.head/.role known-gap hex list').toEqual(ROLE_COLOR_KEYS)
    })

    it('.avatar background (role-accent 70% + #000) vs white text meets 4.5:1 for every catalog hex', () => {
      const [avatarPct] = extractMixPercents(cssText, 'role-accent', '#000')
      expect(avatarPct, '.avatar must be a role-accent/#000 color-mix').toBeDefined()
      for (const colorKey of ROLE_COLOR_KEYS) {
        const avatarBackground = mix(hexRgb(colorKey), [0, 0, 0], avatarPct)
        expect(contrast(white, avatarBackground), `${colorKey} .avatar white text`).toBeGreaterThanOrEqual(4.5)
      }
    })

    it('.card bottom stripe (solid role-accent) meets 3:1 against --surface-card for every catalog hex', () => {
      expect(cssText).toMatch(/border-bottom:\s*8px solid var\(--role-accent\);/)
      for (const colorKey of ROLE_COLOR_KEYS) {
        expect(contrast(hexRgb(colorKey), surfaceCard), `${colorKey} stripe vs --surface-card`).toBeGreaterThanOrEqual(3)
      }
    })

    it('.card bottom stripe vs the secondary --color-border adjacency - flags the one known-borderline hex', () => {
      const failing = ROLE_COLOR_KEYS.filter((colorKey) => contrast(hexRgb(colorKey), colorBorder) < 3)
      // #c26a2e measures ~2.99:1 against --color-border (just under the 3:1 floor) while clearing
      // 3:1 comfortably against the dominant --surface-card background checked above.
      expect(failing, 'stripe-vs-color-border known-gap hex list').toEqual(['#c26a2e'])
    })
  })

  function chipTextSuite(label: string, relativePath: string, accentVar: string, expectedFailing: string[]) {
    it(`${label}: text-mix vs bg-mix meets 4.5:1, flagging any known-gap hex measured against the real formula`, () => {
      const cssText = readModule(relativePath)
      const [bgPct] = extractMixPercents(cssText, accentVar, 'var\\(--surface-card\\)')
      const [textPct] = extractMixPercents(cssText, accentVar, 'var\\(--text-primary\\)')
      expect(bgPct, `${relativePath} background must be a role-accent/--surface-card mix`).toBeDefined()
      expect(textPct, `${relativePath} text must be a role-accent/--text-primary mix`).toBeDefined()
      const failing = ROLE_COLOR_KEYS.filter((colorKey) => {
        const accent = hexRgb(colorKey)
        const background = mix(accent, surfaceCard, bgPct)
        const text = mix(accent, textPrimary, textPct)
        return contrast(text, background) < 4.5
      })
      expect(failing, `${label} known-gap hex list`).toEqual(expectedFailing)
    })
  }

  function chipBorderSuite(label: string, relativePath: string, accentVar: string) {
    it(`${label}: border-mix (composited over bg-mix) falls short of 3:1 for every catalog hex - a known, pre-existing formula gap outside this plan's file scope`, () => {
      const cssText = readModule(relativePath)
      const [bgPct] = extractMixPercents(cssText, accentVar, 'var\\(--surface-card\\)')
      const [borderPct] = extractMixPercents(cssText, accentVar, 'transparent')
      expect(bgPct, `${relativePath} background must be a role-accent/--surface-card mix`).toBeDefined()
      expect(borderPct, `${relativePath} border must be a role-accent/transparent mix`).toBeDefined()
      const failing = ROLE_COLOR_KEYS.filter((colorKey) => {
        const accent = hexRgb(colorKey)
        const background = mix(accent, surfaceCard, bgPct)
        const border = mix(accent, background, borderPct)
        return contrast(border, background) < 3
      })
      // The `color-mix(role-accent <border%>, transparent)` border, alpha-composited over the
      // chip's own tinted background, does not reach 3:1 for any of the 15 catalog hexes today -
      // both colors derive from the same low-strength accent tint and stay close in luminance.
      expect(failing, `${label} border known-gap hex list`).toEqual(ROLE_COLOR_KEYS)
    })
  }

  describe('ProjectMemberPage.module.css .roleChip', () => {
    chipTextSuite(
      'ProjectMemberPage .roleChip',
      'src/components/fansubs/projectMember/ProjectMemberPage.module.css',
      'role-accent',
      ['#c26a2e'],
    )
    chipBorderSuite(
      'ProjectMemberPage .roleChip',
      'src/components/fansubs/projectMember/ProjectMemberPage.module.css',
      'role-accent',
    )
  })

  describe('ProjectMemberReleasesSection.module.css .roleTag', () => {
    chipTextSuite(
      'ProjectMemberReleasesSection .roleTag',
      'src/components/fansubs/projectMember/ProjectMemberReleasesSection.module.css',
      'role-accent',
      [],
    )
    chipBorderSuite(
      'ProjectMemberReleasesSection .roleTag',
      'src/components/fansubs/projectMember/ProjectMemberReleasesSection.module.css',
      'role-accent',
    )
  })

  describe('MemberCurrentProjectsSection.module.css .roleChip', () => {
    chipTextSuite(
      'MemberCurrentProjectsSection .roleChip',
      'src/components/profile/MemberCurrentProjectsSection.module.css',
      'project-role-accent',
      [],
    )
    chipBorderSuite(
      'MemberCurrentProjectsSection .roleChip',
      'src/components/profile/MemberCurrentProjectsSection.module.css',
      'project-role-accent',
    )
  })

  describe('RoleBadgeCard.stages.module.css and MemberBadgeChain.module.css non-text indicators', () => {
    it("every role-accent/--border-subtle border and box-shadow mix falls short of 3:1 against --surface-card for every catalog hex - a known, pre-existing formula gap outside this plan's file scope", () => {
      const stagesCss = readModule('src/components/profile/RoleBadgeCard.stages.module.css')
      const chainCss = readModule('src/components/profile/MemberBadgeChain.module.css')
      const stagesPercents = extractMixPercents(stagesCss, 'role-accent', 'var\\(--border-subtle\\)')
      const chainPercents = extractMixPercents(chainCss, 'role-accent', 'var\\(--border-subtle\\)')
      expect(stagesPercents.length, 'RoleBadgeCard.stages.module.css must contain its 4 role-accent/--border-subtle mixes').toBe(4)
      expect(chainPercents.length, 'MemberBadgeChain.module.css must contain its 1 role-accent/--border-subtle mix').toBe(1)

      for (const pct of [...stagesPercents, ...chainPercents]) {
        const failing = ROLE_COLOR_KEYS.filter((colorKey) => {
          const mixed = mix(hexRgb(colorKey), borderSubtle, pct)
          return contrast(mixed, surfaceCard) < 3
        })
        expect(failing, `${Math.round(pct * 100)}% mix known-gap hex list`).toEqual(ROLE_COLOR_KEYS)
      }
    })
  })

  describe('FansubEdit.module.css role-toggle and historical-role label (read-only reference; not modified by this plan)', () => {
    const cssText = readModule('src/app/admin/fansubs/[id]/edit/FansubEdit.module.css')

    it('unselected toggle: raw role-accent as text and border color vs --surface-card - flags the highest-risk row per UI-SPEC', () => {
      expect(cssText).toMatch(/\.fansubEditMemberRoleToggle\s*\{[^}]*border:\s*1px solid var\(--role-accent\);/)
      expect(cssText).toMatch(/\.fansubEditMemberRoleToggle\s*\{[^}]*color:\s*var\(--role-accent\);/)
      const failing = ROLE_COLOR_KEYS.filter((colorKey) => contrast(hexRgb(colorKey), surfaceCard) < 4.5)
      // UI-SPEC calls this the phase's highest-risk row and mandates explicit per-hex flagging
      // rather than silently forcing a pass; any fix must stay within the formula and must not
      // alter the locked hex palette - out of this plan's file scope (Plan 148-04 owns this file).
      expect(failing, 'unselected-toggle known-gap hex list').toEqual(['#c26a2e', '#6b7f2a'])
    })

    it('selected toggle: white #fff text on solid role-accent fill - flags the same highest-risk hexes', () => {
      expect(cssText).toMatch(/\.fansubEditMemberRoleToggleSelected\s*\{[^}]*background:\s*var\(--role-accent\);/)
      expect(cssText).toMatch(/\.fansubEditMemberRoleToggleSelected\s*\{[^}]*color:\s*#fff;/)
      const failing = ROLE_COLOR_KEYS.filter((colorKey) => contrast(white, hexRgb(colorKey)) < 4.5)
      expect(failing, 'selected-toggle known-gap hex list').toEqual(['#c26a2e', '#6b7f2a'])
    })

    it('historical-role small label (74% role-accent mix + --text-secondary) vs --surface-card - flags the one known-gap hex', () => {
      const [pct] = extractMixPercents(cssText, 'role-accent', 'var\\(--text-secondary\\)')
      expect(pct, 'the historical-role small label must be a role-accent/--text-secondary color-mix').toBeDefined()
      const failing = ROLE_COLOR_KEYS.filter((colorKey) => {
        const label = mix(hexRgb(colorKey), textSecondary, pct)
        return contrast(label, surfaceCard) < 4.5
      })
      expect(failing, 'historical-label known-gap hex list').toEqual(['#c26a2e'])
    })
  })

  describe('/me/projects role-row border-inline-start indicator', () => {
    it('solid role-accent 3px border-inline-start meets 3:1 for every catalog hex against --surface-card (the resolvable ambient card surface; the row itself sets background: var(--surface-muted), an undefined token pre-existing and out of this plan\'s scope - see deferred-items.md)', () => {
      const pageText = readModule(
        'src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx',
      )
      expect(pageText).toMatch(/borderInlineStartColor:\s*'var\(--role-accent\)'/)
      for (const colorKey of ROLE_COLOR_KEYS) {
        expect(contrast(hexRgb(colorKey), surfaceCard), `${colorKey} role-row border`).toBeGreaterThanOrEqual(3)
      }
    })
  })
})
