import { describe, expect, it } from 'vitest'

import type { RoleDefinitionOption } from '@/types/admin-capability'

import {
  contributionRoleDefinitions,
  normalizeRoleCodes,
  roleLabels,
} from './contributionRoles'

const catalog: RoleDefinitionOption[] = [
  {
    code: 'typer',
    label_de: 'Typesetting',
    contexts: ['anime_contribution'],
    sort_order: 30,
  },
  {
    code: 'karaoke_fx',
    label_de: 'Karaoke FX',
    contexts: ['fansub_group', 'anime_contribution'],
    sort_order: 20,
  },
  {
    code: 'translator',
    label_de: 'Übersetzung',
    contexts: ['anime_contribution'],
    sort_order: 10,
  },
  {
    code: 'founder',
    label_de: 'Gründer',
    contexts: ['fansub_group'],
    sort_order: 1,
  },
]

describe('admin anime contribution roles', () => {
  it('derives options exclusively from anime_contribution catalog rows', () => {
    expect(contributionRoleDefinitions(catalog)).toEqual([
      {
      code: 'translator',
        label_de: 'Übersetzung',
      },
      { code: 'karaoke_fx', label_de: 'Karaoke FX' },
      { code: 'typer', label_de: 'Typesetting' },
    ])
  })

  it('orders known roles by the injected catalog and preserves unknown codes', () => {
    expect(normalizeRoleCodes(catalog, ['typer', 'unknown_role', 'karaoke_fx', 'translator', 'unknown_role'])).toEqual([
      'translator',
      'karaoke_fx',
      'typer',
      'unknown_role',
    ])
  })

  it('keeps karaoke fx distinct from typesetting and labels unknown roles neutrally', () => {
    expect(roleLabels(catalog, ['typer', 'invented_role', 'karaoke_fx'])).toEqual([
      'Karaoke FX',
      'Typesetting',
      'Invented Role',
    ])
  })
})
