import { describe, expect, it } from 'vitest'

import { canonicalMemberSlug } from './memberCanonicalSlug'

describe('Phase 128 canonical member-slug normalization (syntax-only)', () => {
  it('lowercases non-canonical casing to the stored form', () => {
    expect(canonicalMemberSlug('Sheppert')).toBe('sheppert')
    expect(canonicalMemberSlug('SHEPPERT')).toBe('sheppert')
    expect(canonicalMemberSlug('Csubs-Leader')).toBe('csubs-leader')
  })

  it('is idempotent for already-canonical slugs', () => {
    expect(canonicalMemberSlug('sheppert')).toBe('sheppert')
    expect(canonicalMemberSlug('csubs-leader')).toBe('csubs-leader')
  })

  it('canonicalizes independently of member existence', () => {
    expect(canonicalMemberSlug('Guessed-New-Nickname')).toBe('guessed-new-nickname')
    expect(canonicalMemberSlug('Private-Member')).toBe('private-member')
  })

  it('trims surrounding whitespace', () => {
    expect(canonicalMemberSlug('  Sheppert  ')).toBe('sheppert')
  })

  it('returns null (no redirect) for numeric segments', () => {
    expect(canonicalMemberSlug('2')).toBeNull()
    expect(canonicalMemberSlug('12345')).toBeNull()
  })

  it('returns null (no redirect) for empty, malformed, or unsafe segments', () => {
    expect(canonicalMemberSlug('')).toBeNull()
    expect(canonicalMemberSlug('   ')).toBeNull()
    expect(canonicalMemberSlug('has space')).toBeNull()
    expect(canonicalMemberSlug('trailing-')).toBeNull()
    expect(canonicalMemberSlug('-leading')).toBeNull()
    expect(canonicalMemberSlug('double--dash')).toBeNull()
  })

  it('returns null for over-long segments', () => {
    expect(canonicalMemberSlug('a'.repeat(513))).toBeNull()
  })
})
