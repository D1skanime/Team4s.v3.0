import { describe, expect, it } from 'vitest'
import type { RoleDefinitionOption } from '@/types/admin-capability'
import {
  NEUTRAL_ROLE_COLOR_KEY,
  ROLE_COLOR_KEYS,
  getRole,
  labelForRole,
  orderForContext,
  presentationForRole,
} from './roleCatalog'

const role = (code: string, overrides: Partial<RoleDefinitionOption> = {}): RoleDefinitionOption => ({
  code, label_de: code, contexts: ['fansub_group'], sort_order: 10, assignable: true,
  color_key: '#A16207', icon_key: 'image', operative_capability_count: 0,
  has_operative_capabilities: false, ...overrides,
})

describe('roleCatalog', () => {
  it('accepts catalog-injected roles without code branches', () => {
    const rows = [role('karaoke_fx', { label_de: 'Karaoke FX' }), role('future_role', { sort_order: 5 })]
    expect(getRole(rows, 'karaoke_fx')?.label_de).toBe('Karaoke FX')
    expect(orderForContext(rows, 'fansub_group').map((item) => item.code)).toEqual(['future_role', 'karaoke_fx'])
  })

  it('accepts the exact canonical Karaoke-FX migration presentation', () => {
    const karaoke = [role('karaoke_fx', {
      label_de: 'Karaoke-FX', color_key: '#A16207', icon_key: 'image',
    })]
    const typesetting = [role('typesetter', { color_key: '#7B3C4E', icon_key: 'wrench' })]
    expect(presentationForRole(karaoke, 'karaoke_fx')).toEqual({ colorKey: '#a16207', iconKey: 'image' })
    expect(presentationForRole(karaoke, 'karaoke_fx')).not.toEqual(presentationForRole(typesetting, 'typesetter'))
  })

  it('keeps unknown codes readable and neutral', () => {
    expect(labelForRole([], 'future_role')).toBe('Future Role')
    expect(presentationForRole([], 'future_role')).toEqual({ colorKey: NEUTRAL_ROLE_COLOR_KEY, iconKey: 'user' })
    expect(presentationForRole([role('future_role', { color_key: '#123456', icon_key: 'evil' })], 'future_role')).toEqual({ colorKey: NEUTRAL_ROLE_COLOR_KEY, iconKey: 'user' })
  })

  it('bounds and normalizes exactly the 15 migrated catalog color keys', () => {
    expect(ROLE_COLOR_KEYS).toHaveLength(15)
    expect(new Set(ROLE_COLOR_KEYS).size).toBe(15)
    expect(presentationForRole([role('typesetter', { color_key: '#7B3C4E' })], 'typesetter').colorKey).toBe('#7b3c4e')
    expect(presentationForRole([role('typesetter', { color_key: '#123456' })], 'typesetter').colorKey).toBe(NEUTRAL_ROLE_COLOR_KEY)
  })
})

