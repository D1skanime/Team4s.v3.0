---
phase: 61
slug: fansub-contributions-datenmodell
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-02
updated: 2026-06-02
---

# Phase 61 - Security

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Migration runner -> database | Phase 61 only changes schema through SQL migrations | schema DDL, constraints, seed rows |
| anime_contributions -> hist_fansub_group_members | Contributions must point to a real historical group member | member/group/anime relationship identifiers |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-61-01 | Tampering | `member_claims.verified_by` | mitigate | `verified_by` is nullable until verification and references `app_users(id) ON DELETE SET NULL`; `member_id` is constrained to `members(id)` | closed |
| T-61-02 | Information Disclosure | `members.noindex DEFAULT true` | accept | Protected default is documented and implemented by `0081_historical_members_identity.up.sql`; no public exposure is created by this phase | closed |
| T-61-03 | Tampering | `role_definitions.code` | mitigate | Stable `TEXT PRIMARY KEY`; `hist_group_member_roles.role_code` receives FK `fk_hist_group_member_roles_role_code` in migration 0085 | closed |
| T-61-04 | Denial of Service | `fansub_group_history.year` nullable | accept | Nullable year is an intentional data-quality design for unknown historical dates, not a security-sensitive runtime branch | closed |
| T-61-05 | Tampering | `anime_contributions.fansub_group_member_id` | mitigate | `BIGINT NOT NULL REFERENCES hist_fansub_group_members(id) ON DELETE RESTRICT`; validation tests lock this contract | closed |
| T-61-06 | Information Disclosure | `anime_contributions.is_public_on_anime_page DEFAULT false` | accept | Public flags default false; Phase 61 adds no API or UI path that can publish contributions | closed |
| T-61-07 | Tampering | `member_badges.derived_from_id` polymorphic reference | accept | No FK is intentional for later Badge Engine ownership; Phase 61 stores fields only and does not compute badges | closed |
| T-61-SC | Tampering | package/dependency surface | accept | Phase 61 installed no packages and introduced only SQL migration files plus focused Go tests | closed |

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-61-01 | T-61-02 | `noindex DEFAULT true` is a protective default; any future public profile indexing change must be explicit. | Phase 61 plan | 2026-06-01 |
| AR-61-02 | T-61-04 | Historical group events may not have known years; nullable year avoids false precision. | Phase 61 plan | 2026-06-01 |
| AR-61-03 | T-61-06 | Public contribution flags default false and have no publication endpoint in this phase. | Phase 61 plan | 2026-06-01 |
| AR-61-04 | T-61-07 | `member_badges.derived_from_*` is intentionally polymorphic; integrity is deferred to the Badge Engine phase. | Phase 61 plan | 2026-06-01 |
| AR-61-05 | T-61-SC | No new dependency supply-chain surface was introduced. | Phase 61 plan | 2026-06-01 |

## Evidence

| Evidence | Result |
|----------|--------|
| `backend/internal/migrations/phase61_contributions_model_test.go` | Verifies FK, NOT NULL, cascade/restrict, unique, role seed, and polymorphic badge contracts |
| `cd backend && go test ./internal/migrations` | Passed |
| `.planning/phases/61-fansub-contributions-datenmodell/61-UAT.md` | Scratch DB applied and rolled back migrations 81-88 from live version-80 schema baseline |
| `61-01-SUMMARY.md`, `61-02-SUMMARY.md`, `61-03-SUMMARY.md` | Threat flags report no new network, auth, upload, or file-access surfaces |

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-02 | 8 | 8 | 0 | Codex |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer).
- [x] Accepted risks documented in Accepted Risks Log.
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.

Approval: verified 2026-06-02
