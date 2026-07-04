import { describe, expect, it } from 'vitest'

import { roleLabelForCode } from './useGroupMembersTab'

describe('roleLabelForCode', () => {
  it('labels historical founder roles neutrally in German', () => {
    expect(roleLabelForCode('founder')).toBe('Gründung')
  })

  it('keeps active role labels and unknown-code fallbacks', () => {
    expect(roleLabelForCode('translator')).toBe('Übersetzung')
    expect(roleLabelForCode('unknown_role')).toBe('unknown_role')
  })
})
