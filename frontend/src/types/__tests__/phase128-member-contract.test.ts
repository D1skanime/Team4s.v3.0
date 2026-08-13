import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import type { PublicMemberContributionsResponse } from '../contributions'
import type {
  ProfileVisibility,
  PublicMemberProfileData,
  PublicMemberProfileResponse,
} from '../profile'
import type { ProjectMemberSummary } from '../projectMember'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false
type Assert<Value extends true> = Value
type IsRequired<Type, Key extends keyof Type> =
  Record<Key, Type[Key]> extends Pick<Type, Key> ? true : false

type _VisibilityVocabulary = Assert<Equal<ProfileVisibility, 'public' | 'private'>>
type _StoredSlugIsRequired = Assert<IsRequired<PublicMemberProfileData, 'slug'>>
type _StoredSlugIsCanonicalString = Assert<Equal<PublicMemberProfileData['slug'], string>>
type _PublicDTOHidesAppUserID = Assert<
  Equal<'app_user_id' extends keyof PublicMemberProfileData ? true : false, false>
>
type _ViewerFactsAreRequired = Assert<
  Equal<
    PublicMemberProfileResponse['viewer'],
    { is_owner: boolean; is_private_preview: boolean }
  >
>
type _ContributionEnvelopeParity = Assert<
  Equal<keyof PublicMemberContributionsResponse, 'role_timeline' | 'has_unverified'>
>
type _ProjectMemberSummaryParity = Assert<
  Equal<
    Pick<ProjectMemberSummary, 'member_id' | 'member_slug'>,
    { member_id: number; member_slug: string | null }
  >
>

void (0 as unknown as _VisibilityVocabulary)
void (0 as unknown as _StoredSlugIsRequired)
void (0 as unknown as _StoredSlugIsCanonicalString)
void (0 as unknown as _PublicDTOHidesAppUserID)
void (0 as unknown as _ViewerFactsAreRequired)
void (0 as unknown as _ContributionEnvelopeParity)
void (0 as unknown as _ProjectMemberSummaryParity)

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const profileSource = fs.readFileSync(path.resolve(currentDir, '..', 'profile.ts'), 'utf8')

describe('Phase 128 public-member TypeScript contract', () => {
  it('keeps hidden response unions and stale visibility vocabulary out of the DTO', () => {
    expect(profileSource).not.toContain('MemberProfileHidden')
    expect(profileSource).not.toContain('members_only')
    expect(profileSource).not.toMatch(/visible\s*:\s*false/)
  })
})
