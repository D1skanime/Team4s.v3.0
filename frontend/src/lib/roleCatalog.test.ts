import { describe, expect, it } from 'vitest'
import type { RoleDefinitionOption } from '@/types/admin-capability'
import { getRole, labelForRole, orderForContext, presentationForRole } from './roleCatalog'

const role = (code: string, overrides: Partial<RoleDefinitionOption> = {}): RoleDefinitionOption => ({
  code, label_de: code, contexts: ['fansub_group'], sort_order: 10, assignable: true,
  color_key: 'creative', icon_key: 'image', operative_capability_count: 0,
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
      label_de: 'Karaoke-FX', color_key: 'creative', icon_key: 'image',
    })]
    const typesetting = [role('typesetter', { color_key: 'technical', icon_key: 'wrench' })]
    expect(presentationForRole(karaoke, 'karaoke_fx')).toEqual({ colorKey: 'creative', iconKey: 'image' })
    expect(presentationForRole(karaoke, 'karaoke_fx')).not.toEqual(presentationForRole(typesetting, 'typesetter'))
  })
  it('keeps unknown codes readable and neutral', () => {
    expect(labelForRole([], 'future_role')).toBe('Future Role')
    expect(presentationForRole([], 'future_role')).toEqual({ colorKey: 'other', iconKey: 'user' })
    expect(presentationForRole([role('future_role', { color_key: 'script', icon_key: 'evil' })], 'future_role')).toEqual({ colorKey: 'other', iconKey: 'user' })
  })
})
