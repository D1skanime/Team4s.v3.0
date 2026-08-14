# Phase 129 Patterns — new/changed files → closest analog

**Rule:** reuse the existing seam; do not fork a parallel projection. Analog = the file whose
structure/idiom the new or edited code must match.

## Backend — repository split (behavior-preserving)
| New file | Analog / source | Notes |
|---|---|---|
| `member_profile_own_repository.go` | carved from `member_profile_repository.go` | own-profile read/write cluster |
| `member_profile_ensure_repository.go` | carved from `member_profile_repository.go` | `ensureProfileBaseTx` |
| `member_profile_public_repository.go` | carved from `member_profile_repository.go` | public read + badges + points |
| `member_profile_memberships_repository.go` | carved from `member_profile_repository.go` | `loadMemberships`, `loadHistoricalCredits` |
| `member_profile_projects_repository.go` | carved from `member_profile_repository.go` | current projects + counts |
| `member_profile_contributions_repository.go` | carved from `member_profile_repository.go` | latest/previous contributions |
| `member_profile_recent_repository.go` | carved (or deleted for public) | own-profile-only after PMDA-09 |

All keep `package repository`, method receiver `(r *MemberProfileRepository)`, same imports style.

## Backend — correctness edits
| Change | Analog to copy | Where |
|---|---|---|
| Roles as `{code,label_de}` pairs | `anime_contributions_public_repository.go:102-103,223-224` (`role_codes`+`role_labels`) | projects/contributions/release-version projections + models `PublicMemberCurrentProject`, `PublicMemberProjectReleaseVersion`, `PublicMemberPreviousContribution` |
| count == list predicates | `loadCurrentProjects` predicate set | `countCurrentProjects` |
| public-facts-only progress | `loadCurrentProjects` `is_public_on_member_profile` predicate | `member_profile_progress_repository.go` project count + archivist count |
| secure/remove recent media | `loadLatestContributions` media joins (`visibilities`+`review_statuses`+`media_files ready`) | `loadRecentMedia` (or delete) |
| membership dedupe + is_current + hist roles | `loadCurrentProjects` `DISTINCT/GROUP BY`; `hist_group_member_roles` visibility gate | `loadMemberships` |
| add `status='confirmed'` / remove endpoint | `loadPreviousContributions` predicate | `GetPublicMemberContributionsByID` (or route removal) |
| year columns in public read | own-profile query (`:703-704,744-745` already read years) | `GetPublicMemberProfileByID` public query |

## Contracts / types / frontend
| Change | Analog | File |
|---|---|---|
| OpenAPI shape updates (roles pairs, year fields, drop recent_*) | existing member schemas in the file | `shared/contracts/openapi.yaml` |
| Go model fields | sibling `Public*` structs | `backend/internal/models/member_profile.go` |
| TS types (roles pairs, `active_*_year`, precision flag, drop recent_*) | existing `PublicMemberProfileData` | `frontend/src/types/profile.ts` |
| consume structured roles; delete reverse map | `anime_contributions_public` consumers | `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` |
| membership all-roles + is_current | — (rewrite) | `frontend/src/components/profile/MembershipsSection.tsx` |
| year-only render | `MemberProfileHero` date rendering | hero/membership components |
| remove dead components + helper | — (deletion) | `MemberRoleTimeline.tsx`, `MemberContributionFilters.tsx`, `getMemberContributions` in `api.ts` |

## Tests (Phase-128 pattern)
| New/edited test | Analog | Notes |
|---|---|---|
| PostgreSQL projection contracts | `member_profile_repository_postgres_test.go` | self-seed fixtures; dedicated test DSN (`TEAM4S_PHASE129_TEST_DSN`) |
| unit projection tests | `member_profile_repository_test.go` | table-driven |
| progress/badge public-facts tests | `member_profile_progress_repository_*`, `member_profile_contribution_badges_repository_test.go` | |
| frontend component tests | `MemberCurrentProjectsSection.test.tsx`, `MemberBadgeChain.test.tsx` | structured roles, no reverse map |

## Seed (Wave 1)
| New file | Analog | Notes |
|---|---|---|
| `scripts/seed-member-profile-fixtures.mjs` (or `.sh`) | `frontend/scripts/collect-member-profile-evidence.mjs` (evidence harness pattern) | idempotent; Keycloak direct-grant token helper; the 10-step sequence in RESEARCH §3; reused by Phase 134 |
