import { describe, expect, it } from 'vitest'

import { ANIME_CONTRIBUTION_ROLES, normalizeRoleCodes, roleLabels } from './contributionRoles'

describe('admin anime contribution roles', () => {
  it('uses neutral task labels and includes project lead', () => {
    expect(ANIME_CONTRIBUTION_ROLES).toContainEqual({
      code: 'translator',
      label: 'Übersetzung',
    })
    expect(ANIME_CONTRIBUTION_ROLES).toContainEqual({
      code: 'quality_checker',
      label: 'Qualitätsprüfung',
    })
    expect(ANIME_CONTRIBUTION_ROLES).toContainEqual({
      code: 'project_lead',
      label: 'Projektleitung',
    })
  })

  it('orders project lead with the known role catalog', () => {
    expect(normalizeRoleCodes(['project_lead', 'translator', 'unknown_role'])).toEqual([
      'translator',
      'project_lead',
      'unknown_role',
    ])
    expect(roleLabels(['project_lead'])).toEqual(['Projektleitung'])
  })
})
