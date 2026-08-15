---
phase: 132
slug: shared-ssr-composition-race-safe-frontend-state
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-15
---

# Phase 132 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^3.2.4 (`frontend/vitest.config.ts`) |
| **Config file** | `frontend/vitest.config.ts` (globals enabled, `@` alias to `src`, includes `src/**/*.test.{ts,tsx}`) |
| **Quick run command** | `cd frontend && npx vitest run <path/to/file>.test.tsx` |
| **Full suite command** | `cd frontend && npm run test` (runs `vitest run`) |
| **Estimated runtime** | ~30 seconds (targeted); full suite varies with repo size |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run <changed test file>`
- **After every plan wave:** Run `cd frontend && npm run test` plus `npm run typecheck` plus `npm run lint`
- **Before `/gsd:verify-work`:** Full suite green, plus `cd frontend && npm run build` (Next.js 16 App Router SSR/metadata changes are a common build-time failure source — `generateMetadata` signature/type errors surface here)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | PMFE-02/PMFE-10 | Owner-UI-flash race | Fail-closed default: no owner-only UI until hook returns positive, key-matched `is_owner: true` | unit | `npx vitest run src/lib/useMemberViewer.test.ts` | ❌ W0 (new hook) | ⬜ pending |
| TBD | TBD | 0 | PMFE-03/PMFE-04 | Stale-response overwrite | Slug-keyed requestKey-match guard + real `AbortController` cancellation | unit | `npx vitest run src/hooks/useCancellableSlugState.test.ts` | ❌ W0 (new hook) | ⬜ pending |
| TBD | TBD | — | PMFE-01 | — | SSR and owner-preview render identical `MemberProfileContent` composition from the same DTO | unit/component | `npx vitest run src/app/members/[slug]/page.test.tsx src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx` | ✅ (both exist) | ⬜ pending |
| TBD | TBD | — | PMFE-05/PMFE-11 | Aggregate filter leakage | New backend aggregate query reuses identical approved/visible WHERE-clause filters as existing full-set query | unit | `npx vitest run src/components/profile/MemberProfileHero.test.tsx` (extend) + new backend Go test | ✅ frontend exists; ❌ backend new | ⬜ pending |
| TBD | TBD | — | PMFE-07 | — | `generateMetadata` produces member-specific title/description for visible profiles, unchanged neutral metadata for hidden | unit | `npx vitest run src/app/members/[slug]/page.test.tsx` (extend) | ✅ exists, extend | ⬜ pending |
| TBD | TBD | — | PMFE-08 | — | Progressive disclosure keeps full content mounted, visually clamps | unit/component | `npx vitest run src/components/profile/MemberStorySection.test.tsx src/components/profile/MemberBadgeChain.test.tsx` (extend) | ✅ both exist | ⬜ pending |
| TBD | TBD | — | PMFE-09 | — | Relative dates stable across SSR/hydration (no `Date.now()` drift) | unit | `npx vitest run src/components/profile/LatestContributionsSection.test.tsx` (extend to pass explicit `referenceNow`) | ✅ exists, extend | ⬜ pending |

*Task IDs, plan IDs, and wave numbers are TBD until the planner assigns them — this map will be reconciled against the actual plan task list at execution time.*

---

## Wave 0 Requirements

- [ ] `frontend/src/lib/useMemberViewer.test.ts` (or equivalent path per naming discretion) — stubs for PMFE-02/PMFE-10, covers the new consolidated viewer hook (single dedup request, fail-closed on uncertain/error)
- [ ] `frontend/src/hooks/useCancellableSlugState.test.ts` (or equivalent path per naming discretion) — stubs for PMFE-03/PMFE-04, covers the new shared cancellable-state hook including a StrictMode double-invoke regression test per D-04
- [ ] Backend Go test for the new D-06 full-set aggregate query/DTO fields (file TBD, likely alongside `backend/internal/repository/member_profile_public_repository_postgres_test.go`) — covers PMFE-11's server-side computation requirement; no existing file covers this today
- [ ] No new test framework/config install needed — Vitest is already fully configured for `frontend/src/**`

---

## Manual-Only Verifications

*All phase behaviors have automated verification via Vitest (frontend) and Go tests (backend aggregate). No manual-only verifications identified.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`useMemberViewer`, `useCancellableSlugState`, backend aggregate test)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
