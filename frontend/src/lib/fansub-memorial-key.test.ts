import { describe, expect, it } from 'vitest'

import { buildFansubMemorialKey } from './fansub-memorial-key'

describe('buildFansubMemorialKey', () => {
  it('liefert unterschiedliche Keys für dieselbe id aus unterschiedlichen Quellen', () => {
    expect(buildFansubMemorialKey('member', 42)).not.toBe(buildFansubMemorialKey('historical', 42))
  })

  it('liefert deterministische, lesbare Keys', () => {
    expect(buildFansubMemorialKey('member', 7)).toBe('member-7')
    expect(buildFansubMemorialKey('historical', 7)).toBe('historical-7')
  })
})
