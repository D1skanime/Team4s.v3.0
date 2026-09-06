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
