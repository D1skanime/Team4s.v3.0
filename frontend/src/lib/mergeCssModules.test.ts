import { describe, expect, it } from 'vitest'

import { mergeCssModules } from './mergeCssModules'

describe('mergeCssModules', () => {
  it('gibt die eigene Klasse zurück, wenn eigener und geteilter Stil denselben Key haben', () => {
    const merged = mergeCssModules({ a: 'own-a' }, { a: 'shared-a', b: 'shared-b' })
    expect(merged.a).toBe('own-a')
  })

  it('fällt auf die geteilte Klasse zurück, wenn die eigene sie nicht definiert', () => {
    const merged = mergeCssModules({ a: 'own-a' }, { a: 'shared-a', b: 'shared-b' })
    expect(merged.b).toBe('shared-b')
  })

  it('liefert undefined für einen unbekannten Key, ohne zu werfen', () => {
    const merged = mergeCssModules<Record<string, string>>({ a: 'own-a' }, { a: 'shared-a' })
    expect(merged.unbekannterKey).toBeUndefined()
  })

  it('verschachtelter 3er-Merge: höchste Priorität gewinnt bei gemeinsamem Key', () => {
    const merged = mergeCssModules<Record<string, string>>(
      { x: 'a-x' },
      mergeCssModules<Record<string, string>>({ y: 'b-y' }, { x: 'c-x', y: 'c-y', z: 'c-z' }),
    )
    expect(merged.x).toBe('a-x')
  })

  it('verschachtelter 3er-Merge: mittlere Priorität gewinnt, wenn höchste den Key nicht hat', () => {
    const merged = mergeCssModules<Record<string, string>>(
      { x: 'a-x' },
      mergeCssModules<Record<string, string>>({ y: 'b-y' }, { x: 'c-x', y: 'c-y', z: 'c-z' }),
    )
    expect(merged.y).toBe('b-y')
  })

  it('verschachtelter 3er-Merge: niedrigste Priorität als letzter Fallback', () => {
    const merged = mergeCssModules<Record<string, string>>(
      { x: 'a-x' },
      mergeCssModules<Record<string, string>>({ y: 'b-y' }, { x: 'c-x', y: 'c-y', z: 'c-z' }),
    )
    expect(merged.z).toBe('c-z')
  })
})
