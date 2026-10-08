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
  // Produktionsstand (Migration 0148_role_catalog_uat_corrections): admin/other bleiben im
  // anime_contribution-Kontext gelistet, sind aber assignable=false und duerfen deshalb in
  // keinem Mitwirkende-/Crew-Picker auswaehlbar sein (176 scope addition 1).
  {
    code: 'admin',
    label_de: 'Administration',
    contexts: ['anime_contribution', 'group_history'],
    sort_order: 5,
    assignable: false,
  },
  {
    code: 'other',
    label_de: 'Sonstiges',
    contexts: ['anime_contribution'],
    sort_order: 6,
    assignable: false,
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

  it('never offers non-assignable roles (admin/other) as picker options, even though they are listed for anime_contribution', () => {
    const codes = contributionRoleDefinitions(catalog).map((role) => role.code)
    expect(codes).not.toContain('admin')
    expect(codes).not.toContain('other')
  })

  it('still resolves the label of an already-stored non-assignable role code (display must not break)', () => {
    expect(roleLabels(catalog, ['admin', 'other'])).toEqual(['Administration', 'Sonstiges'])
  })

  it('keeps assignable roles selectable alongside the admin/other exclusion', () => {
    expect(contributionRoleDefinitions(catalog)).toEqual([
      { code: 'translator', label_de: 'Übersetzung' },
      { code: 'karaoke_fx', label_de: 'Karaoke FX' },
      { code: 'typer', label_de: 'Typesetting' },
    ])
  })
})
