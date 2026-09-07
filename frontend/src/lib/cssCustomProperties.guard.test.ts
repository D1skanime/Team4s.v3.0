import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { extractDefinedProperties, extractVarUsages, findDeadReferences } from './cssCustomProperties'

describe('cssCustomProperties scanner (synthetic fixtures)', () => {
  it('extractDefinedProperties finds :root, scoped-selector, and TSX inline-style definitions', () => {
    const fixtures = new Map<string, string>([
      ['root.css', ':root { --foo: red; }'],
      ['scoped.module.css', '.bar { --scoped-x: blue; }'],
      ['inline.tsx', "export const Foo = () => <div style={{ '--inline-y': value }} />"],
    ])

    const defined = extractDefinedProperties(fixtures)

    expect(defined.has('--foo')).toBe(true)
    expect(defined.has('--scoped-x')).toBe(true)
    expect(defined.has('--inline-y')).toBe(true)
  })

  it('extractVarUsages captures name, 1-based line number, hasFallback, and fallbackVarName per usage', () => {
    const fixtures = new Map<string, string>([
      ['usages.css', ['color: var(--a);', 'color: var(--b, red);', 'color: var(--c, var(--d));'].join('\n')],
    ])

    const usages = extractVarUsages(fixtures)

    expect(usages).toHaveLength(3)

    expect(usages[0]).toMatchObject({ file: 'usages.css', line: 1, name: '--a', hasFallback: false, fallbackVarName: undefined })
    expect(usages[1]).toMatchObject({ file: 'usages.css', line: 2, name: '--b', hasFallback: true, fallbackVarName: undefined })
    expect(usages[2]).toMatchObject({ file: 'usages.css', line: 3, name: '--c', hasFallback: true, fallbackVarName: '--d' })
  })

  it('findDeadReferences flags a no-fallback undefined reference and a nested-fallback-to-undefined reference (Breadcrumbs class of bug), but not a defined reference or a literal-fallback-protected reference', () => {
    const fixtures = new Map<string, string>([
      ['usages.css', ['color: var(--a);', 'color: var(--b, red);', 'color: var(--c, var(--d));'].join('\n')],
    ])
    const defined = new Set(['--a'])
    const usages = extractVarUsages(fixtures)

    const dead = findDeadReferences(defined, usages)

    expect(dead).toHaveLength(1)
    expect(dead[0]).toMatchObject({ name: '--c', fallbackVarName: '--d' })
  })

  it('does not flag a no-fallback reference whose name IS in the defined set (positive path)', () => {
    const usages = extractVarUsages(new Map([['defined-ref.css', 'color: var(--already-defined);']]))
    const defined = new Set(['--already-defined'])

    expect(findDeadReferences(defined, usages)).toHaveLength(0)
  })

  it('does not flag a nested-fallback var() reference whose target IS in the defined set (resolving nested fallback)', () => {
    const usages = extractVarUsages(new Map([['nested-defined.css', 'color: var(--e, var(--a));']]))
    const defined = new Set(['--a'])

    expect(findDeadReferences(defined, usages)).toHaveLength(0)
  })
})

// This is this very test file's own basename -- excluded from the real-tree walk below because
// its synthetic fixtures above deliberately contain fake, never-defined token names ('--a',
// '--b', '--c', '--d', '--e', '--already-defined', '--inline-y', '--foo', '--scoped-x') as plain
// string literals. Those literals are real `.ts` source text living under frontend/src, so an
// unfiltered walk would "discover" them as if they were genuine usages/definitions in the app and
// corrupt the real-tree assertions below with self-referential noise. Excluding this one file by
// exact basename is the narrowest fix; it does not exclude any other *.test.ts/*.test.tsx file
// (those were verified during this plan's execution to only ever reference var(--name) tokens
// that are genuinely defined in globals.css, so they are safe -- and useful -- to include).
const GUARD_TEST_OWN_FILENAME = 'cssCustomProperties.guard.test.ts'

const SCANNED_EXTENSIONS = ['.css', '.ts', '.tsx']

function collectRealSourceFiles(rootDir: string): Map<string, string> {
  const files = new Map<string, string>()

  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }

      if (entry.name === GUARD_TEST_OWN_FILENAME) continue
      if (!SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) continue

      const relativePath = path.relative(rootDir, fullPath)
      files.set(relativePath, fs.readFileSync(fullPath, 'utf8'))
    }
  }

  walk(rootDir)
  return files
}

// Pre-existing textual (non-CSS) mentions of a token name that would otherwise false-positive as
// a "dead reference" because the naive var()-usage regex matches raw text, not just real CSS/JS
// var() calls. Each entry here is a `describe`/`it` title string in a test file, not executable
// code -- there is no actual rendered `var()` call at that file/line. Both entries are locked by
// 149-UI-SPEC.md's explicit "do not touch any other describe/it block in this file" instruction
// (the RoleBadgeCard.stages/MemberBadgeChain non-text-indicator suite authored in Phase 148,
// out of this phase's scope per ROADMAP's Scope-Grenze), so they cannot be edited away here; they
// are instead documented and excluded from the empty-set assertion below. Each is re-verified by
// name+file+line so a genuinely new, unrelated dead reference in the same file would still fail.
const KNOWN_NON_CSS_TEXTUAL_MENTIONS = [
  {
    file: 'lib/roleCatalog.accessibility.test.ts',
    line: 282,
    name: '--surface-muted',
    reason:
      "test-description prose ('the row itself sets background: var(--surface-muted)...out of this plan's scope - see deferred-items.md'), authored Phase 148 (commit 281182d1); not an executable var() call",
  },
]

describe('cssCustomProperties scanner (real frontend/src tree)', () => {
  const srcDir = path.resolve(process.cwd(), 'src')
  const realFiles = collectRealSourceFiles(srcDir)
  const defined = extractDefinedProperties(realFiles)
  const usages = extractVarUsages(realFiles)
  const rawDead = findDeadReferences(defined, usages)
  const dead = rawDead.filter(
    (usage) =>
      !KNOWN_NON_CSS_TEXTUAL_MENTIONS.some(
        (known) => known.file === usage.file && known.line === usage.line && known.name === usage.name,
      ),
  )

  it('finds zero fallback-free dead custom-property references on the real, fixed tree (Success Criterion 1)', () => {
    const message = dead
      .map((usage) => `${usage.name} at ${usage.file}:${usage.line}${usage.fallbackVarName ? ` (nested fallback ${usage.fallbackVarName} undefined)` : ' (no fallback)'}`)
      .join('\n')

    expect(dead, `Dead custom-property references found:\n${message}`).toEqual([])
  })

  it('the known-non-CSS-textual-mentions allow-list stays exactly as small as documented (no silent growth)', () => {
    expect(rawDead.length - dead.length).toBe(KNOWN_NON_CSS_TEXTUAL_MENTIONS.length)
  })

  it('does not flag a representative sample of known-safe fallback-protected usages (Success Criterion 4)', () => {
    const knownSafeSamples = [
      { file: 'app/me/profile/page.module.css', name: '--color-text-muted' },
      { file: 'app/me/profile/page.module.css', name: '--color-text' },
      { file: 'app/anime/[id]/group/[groupId]/releases/page.module.css', name: '--color-surface' },
      { file: 'components/navigation/Breadcrumbs.module.css', name: '--breadcrumb-separator-color' },
      { file: 'components/groups/GroupEdgeNavigation.module.css', name: '--group-nav-bg' },
    ]

    for (const sample of knownSafeSamples) {
      const matchingUsages = usages.filter((usage) => usage.file === sample.file && usage.name === sample.name)
      expect(matchingUsages.length, `expected at least one usage of ${sample.name} in ${sample.file}`).toBeGreaterThan(0)

      const flagged = dead.filter((usage) => usage.file === sample.file && usage.name === sample.name)
      expect(flagged, `${sample.name} in ${sample.file} must not be flagged as dead (it is fallback-protected)`).toEqual([])
    }
  })
})
