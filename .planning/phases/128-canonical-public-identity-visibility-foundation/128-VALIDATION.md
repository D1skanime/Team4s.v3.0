---
phase: 128
slug: canonical-public-identity-visibility-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-13
---

# Phase 128 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `128-RESEARCH.md` Validation Architecture and Security Domain.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go `testing` + `stretchr/testify` 1.9.0; Vitest 3.2.4 + Testing Library/jsdom; guarded PostgreSQL 16 integration tests |
| **Config file** | No Go test config; frontend Vitest config/package script; Wave 0 adds a guarded `TEAM4S_PHASE128_TEST_DSN` helper |
| **Quick run command** | `docker compose exec -T team4sv30-backend go test ./internal/repository ./internal/handlers -run 'PublicMember|MemberSlug|MemberAccess|ProjectMember' -count=1` plus the focused frontend member-route/auth test files owned by the task |
| **Full suite command** | `docker compose exec -T team4sv30-backend go test ./... -count=1` and `docker compose exec -T team4sv30-frontend npm test -- --run`, followed by frontend typecheck, lint, build, migration up/down proof on the guarded Phase-128 database, and `git diff --check` |
| **Estimated runtime** | Quick feedback under 120 seconds; full phase gate several minutes |

---

## Sampling Rate

- **After every task commit:** Run the task-owned narrow Go package/test regex or Vitest files plus `git diff --check`.
- **After every plan wave:** Run backend repository/handler/migration focused suites, frontend member/auth suites, typecheck, and lint.
- **Before `$gsd-verify-work`:** Run both full suites, production frontend build if feasible, guarded migration fresh/up/down, source-invariant grep, and live refresh-only owner/private-nonowner browser UAT.
- **Max feedback latency:** 120 seconds for the per-task sample.

---

## Per-Task Verification Map

> Task IDs are assigned by the planner. The executor/Nyquist auditor binds them to these requirement rows and updates status.

| Requirement | Secure behavior | Threat Ref | Test Type | Automated Command | File Exists | Status |
|-------------|-----------------|------------|-----------|-------------------|-------------|--------|
| PMID-01 | Required unique stored slug; normalization, reserved/empty rejection, suffix allocation, and concurrent collisions are deterministic | T-128-SLUG-RACE | unit + guarded PostgreSQL integration | `go test ./internal/repository ./internal/migrations -run 'MemberSlug|PublicIdentity' -race -count=1` | ❌ W0 | ⬜ pending |
| PMID-02 | Nickname changes cannot alter `public_slug`; direct slug updates are rejected | T-128-IDENTITY-DRIFT | guarded PostgreSQL integration | `go test ./internal/repository ./internal/migrations -run 'SlugImmutable|Nickname' -count=1` | ❌ W0 | ⬜ pending |
| PMID-03 | Every backend projection and frontend link uses stored slug; numeric/derived fallbacks are absent | T-128-NUMERIC-FALLBACK | source invariant + Go/Vitest regression | focused projection repositories and member-link component tests, followed by a repository grep for prohibited fallback patterns | ⚠️ analogs exist; assertions missing | ⬜ pending |
| PMPR-01 | Missing, private anonymous, and private non-owner requests return the same neutral status and body | T-128-ENUMERATION | table-driven handler tests | `go test ./internal/handlers -run 'PublicMember.*Unavailable' -count=1` | ⚠️ old hidden-200 assertions must be rewritten | ⬜ pending |
| PMPR-02 | Every denied request invokes zero protected profile-detail loaders | T-128-POSTLOAD-LEAK | handler spy + repository integration | `go test ./internal/handlers ./internal/repository -run 'VisibilityFirst|NoDetailLoad' -count=1` | ❌ W0 | ⬜ pending |
| PMPR-03 | Profile, projects, contributions, summary, notes, media, and releases share the same access matrix | T-128-BOLA | table-driven handler integration | `go test ./internal/handlers -run 'PublicMemberAccessMatrix' -count=1` | ❌ W0 | ⬜ pending |
| PMPR-04 | Missing/expired access token plus valid refresh session refreshes through the central client, loads the authoritative private DTO, shows the owner notice, and never flashes correction/404 UI | T-128-AUTH-BYPASS | Vitest with mocked central refresh | `npm test -- --run src/lib/api.auth-refresh.test.ts 'src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx' 'src/app/members/[slug]/page.test.tsx'` | ⚠️ partial coverage exists | ⬜ pending |
| PMPR-05 | Owner/viewer-specific responses are `private, no-store`, vary on authorization, and are never shared-cacheable | T-128-CACHE-LEAK | handler/header + route source tests | focused Go handler cache tests plus member-page Vitest assertions | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/repository/member_public_slug_test.go` — normalization, validation, suffix allocation, and concurrency for PMID-01/PMID-02.
- [ ] `backend/internal/repository/member_public_access_repository_test.go` — public/private/verified-owner/admin/non-owner/missing/numeric outcomes for PMPR-01/PMPR-03.
- [ ] `backend/internal/migrations/phase128_public_identity_test.go` — schema, precondition, uniqueness, immutability, and reversible up/down proof on a dedicated guarded database.
- [ ] `backend/internal/handlers/public_member_access_matrix_test.go` — neutral response, zero-loader, subresource parity, and cache-header assertions for PMPR-01/02/03/05.
- [ ] Rewrite old `members_only`/hidden-200 expectations in `backend/internal/handlers/app_public_profile_test.go`.
- [ ] Extend `frontend/src/lib/api.auth-refresh.test.ts` and rewrite `OwnHiddenProfilePreview.test.tsx` to prove `getMemberProfile`, not `getOwnProfile`, owns refresh-only preview behavior.
- [ ] Extend page/link tests for stored slugs, owner notice, correction suppression, canonical redirects, numeric rejection, and neutral unavailable states.
- [ ] Add a guarded `TEAM4S_PHASE128_TEST_DSN` helper. It must reject the main `team4s_v2` database identity and never use `docker compose down -v`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Refresh-only hidden-profile owner preview in the authoritative browser route | PMPR-04 | Final discoverability and no-flash behavior require the shared browser flow with live Keycloak/session state | Remove/expire only the access token while retaining a valid refresh session; open the exact hidden member route through the app navigation; verify central refresh succeeds, the full private DTO and owner notice render, no correction/404 UI flashes, and the URL stays canonical. Then repeat as anonymous and authenticated non-owner and verify the same neutral unavailable result. |
| Live disposable member-row reset checkpoint | PMID-01, PMID-02 | Resetting live test rows is destructive and requires explicit execution approval plus database-identity checks | Before migration execution against the main runtime DB, stop and show the exact target database and reset SQL/procedure. Proceed only after explicit approval. Migration proof itself must use the dedicated guarded Phase-128 database. |

---

## Security Domain

- **T-128-BOLA / IDOR:** One injected deny-first resolver must resolve stored slug and verified ownership for every public member endpoint; admin role alone never grants private access.
- **T-128-ENUMERATION:** Private non-owner and missing responses must be identical; canonical syntax redirects must not disclose existence.
- **T-128-POSTLOAD-LEAK:** Visibility is decided before memberships, badges, points, projects, contributions, media, story, or other detail methods run.
- **T-128-CACHE-LEAK:** Owner/viewer responses use `private, no-store` with authorization variation; central browser calls must not introduce shared caching.
- **T-128-SLUG-RACE:** PostgreSQL transaction coordination and a unique constraint protect concurrent allocation; `name` versus literal `name-2` is included.
- **T-128-IDENTITY-DRIFT:** Update DTOs/SQL omit `public_slug`, and the database enforces immutability.
- **T-128-AUTH-BYPASS:** Protected browser flows gate on `hasAccessToken || hasRefreshToken`; components never refresh tokens or construct bearer headers directly.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verification or explicit Wave-0 dependencies.
- [ ] Sampling continuity: no three consecutive tasks without an automated verification command.
- [ ] Wave 0 covers every missing test reference above.
- [ ] No watch-mode flags.
- [ ] Per-task feedback latency remains below 120 seconds.
- [ ] Guarded migration up/down passes without touching `team4s_v2`.
- [ ] `nyquist_compliant: true` is set in frontmatter.

**Approval:** pending
