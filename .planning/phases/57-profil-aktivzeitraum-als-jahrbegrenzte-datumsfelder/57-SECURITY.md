---
phase: 57
slug: profil-aktivzeitraum-als-jahrbegrenzte-datumsfelder
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-29
---

# Phase 57 - Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser profile form -> frontend API client | `/me/profile` sends user-owned profile edits through the central API helper. | Authenticated profile activity dates and visibility-adjacent profile data. |
| Frontend API client -> Go profile handler | Protected profile update request crosses from browser runtime into backend validation. | JSON payload containing `active_from_date`, `active_until_date`, and profile fields. |
| Handler/repository -> PostgreSQL members table | Backend persists normalized activity dates. | `DATE` columns plus deprecated legacy year mirrors. |
| Migration chain -> existing member rows | Migration backfills old integer years into new date columns. | Historical profile activity year data. |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-57-01 | Spoofing / Auth bypass | `/me/profile` frontend and profile API | mitigate | Profile page still gates on `hasAccessToken || hasRefreshToken`, uses `useAuthSession`, and calls `updateOwnProfile` through `frontend/src/lib/api.ts`; handler requires `CommentAuthIdentityFromContext`. Covered by `loads profile data when the access cookie expired but refresh session remains`. | closed |
| T-57-02 | Tampering | Profile date payload validation | mitigate | Handler and repository normalize `YYYY-MM-DD`, reject non-January-1 dates, reject years outside 1970-2100, and reject `until < from`. Covered by handler tests for invalid arbitrary date and invalid range. | closed |
| T-57-03 | Tampering / Data integrity | Database migration and persistence | mitigate | Migration 0079 is additive/reversible, backfills only valid old years, adds date bounds and range constraints, and down migration drops only new constraints/columns. Covered by `TestMemberProfileActivityDateMigrationKeepsYearLimitedDates`. | closed |
| T-57-04 | Repudiation / Contract drift | OpenAPI, DTOs, frontend payload | mitigate | OpenAPI and frontend DTOs document `active_from_date` / `active_until_date`; deprecated year fields remain explicitly marked as compatibility mirrors. Profile page tests assert normalized date payloads. | closed |
| T-57-05 | Information integrity | `Aktuell aktiv` semantics | mitigate | Frontend sends `active_until_date: null` when currently active; handler/repository clear the until date when `is_currently_active` is true. Covered by handler and frontend tests. | closed |

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-29 | 5 | 5 | 0 | Codex |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-29
