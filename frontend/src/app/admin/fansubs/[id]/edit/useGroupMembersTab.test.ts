import { describe, expect, it } from 'vitest'

import type { HistFansubGroupMember } from '@/types/fansub'

import { findDuplicateMemberMatches, roleLabelForCode } from './useGroupMembersTab'

describe('roleLabelForCode', () => {
  it('labels historical founder roles neutrally in German', () => {
    expect(roleLabelForCode('founder')).toBe('Gründung')
  })

  it('keeps active role labels and unknown-code fallbacks', () => {
    expect(roleLabelForCode('translator')).toBe('Übersetzung')
    expect(roleLabelForCode('unknown_role')).toBe('unknown_role')
  })
})

function buildMember(overrides: Partial<HistFansubGroupMember> = {}): HistFansubGroupMember {
  return {
    id: 1,
    fansub_group_id: 10,
    member_id: 100,
    display_name: 'Sora',
    joined_date: null,
    left_date: null,
    app_user_id: null,
    app_username: null,
    active_app_member_id: null,
    status: 'historical',
    visibility: 'internal',
    confirmed_by_app_user_id: null,
    confirmed_by_display_name: null,
    confirmed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('findDuplicateMemberMatches', () => {
  it('finds a case-insensitive, trimmed exact match', () => {
    const members = [buildMember({ id: 1, display_name: 'sora' }), buildMember({ id: 2, display_name: '  Sora  ' })]
    const matches = findDuplicateMemberMatches(members, 'Sora')
    expect(matches).toHaveLength(2)
    expect(matches.map((m) => m.member.id).sort()).toEqual([1, 2])
  })

  it('flags active/linked members via active_app_member_id or app_user_id', () => {
    const linked = buildMember({ id: 1, display_name: 'Sora', active_app_member_id: 5 })
    const unlinked = buildMember({ id: 2, display_name: 'Riko' })
    expect(findDuplicateMemberMatches([linked], 'Sora')[0].isActiveLinked).toBe(true)
    expect(findDuplicateMemberMatches([unlinked], 'Riko')[0].isActiveLinked).toBe(false)
  })

  it('sorts the active/linked match first regardless of input order', () => {
    const historical = buildMember({ id: 1, display_name: 'Sora' })
    const linked = buildMember({ id: 2, display_name: 'Sora', app_user_id: 42 })
    const matches = findDuplicateMemberMatches([historical, linked], 'Sora')
    expect(matches[0].member.id).toBe(2)
    expect(matches[0].isActiveLinked).toBe(true)
    expect(matches[1].member.id).toBe(1)
    expect(matches[1].isActiveLinked).toBe(false)
  })

  it('returns an empty array for an empty or whitespace-only display name', () => {
    const members = [buildMember({ display_name: 'Sora' })]
    expect(findDuplicateMemberMatches(members, '')).toEqual([])
    expect(findDuplicateMemberMatches(members, '   ')).toEqual([])
  })

  it('returns an empty array when no name matches', () => {
    const members = [buildMember({ display_name: 'Sora' })]
    expect(findDuplicateMemberMatches(members, 'Riko')).toEqual([])
  })
})
