---
phase: 57
slug: profil-aktivzeitraum-als-jahrbegrenzte-datumsfelder
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-29
updated: 2026-05-29
---

# Phase 57 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go test, Vitest, TypeScript, Next build |
| **Config file** | `backend/go.mod`, `frontend/vitest.config.ts`, `frontend/tsconfig.json`, `frontend/package.json` |
| **Quick run command** | `cd backend && go test ./internal/handlers ./internal/repository`; `cd frontend && npm run test -- --run src/app/me/profile/page.test.tsx` |
| **Full suite command** | `cd backend && go test ./internal/migrations ./internal/handlers ./internal/repository`; `cd frontend && npm run typecheck`; `cd frontend && npm run build`; `git diff --check` |
| **Estimated runtime** | ~35 seconds for focused checks; ~60 seconds including build |

---

## Sampling Rate

- **After backend contract changes:** Run `go test ./internal/handlers ./internal/repository`.
- **After migration changes:** Run `go test ./internal/migrations`.
- **After frontend profile changes:** Run `npm run test -- --run src/app/me/profile/page.test.tsx`.
- **Before commit:** Run typecheck, build, and `git diff --check`.
- **Max feedback latency:** under 2 minutes for the focused Phase 57 suite.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 57-01-01 | 01 | 1 | MEMBER-PROFILE-ACTIVITY-PERIOD-DATE-01 | T-57-03 | Migration adds real date columns, preserves old years, and enforces normalized range constraints. | source invariant | `cd backend && go test ./internal/migrations` | yes | green |
| 57-01-02 | 01 | 1 | MEMBER-PROFILE-ACTIVITY-PERIOD-DATE-01 | T-57-02, T-57-05 | Handler accepts only normalized dates, rejects invalid dates/ranges, and clears until date when currently active. | handler unit | `cd backend && go test ./internal/handlers` | yes | green |
| 57-01-03 | 01 | 1 | MEMBER-PROFILE-ACTIVITY-PERIOD-DATE-01 | T-57-02, T-57-03 | Repository writes date fields as source of truth and keeps legacy years as mirrors/fallback only. | repository invariant | `cd backend && go test ./internal/repository` | yes | green |
| 57-02-01 | 02 | 2 | MEMBER-PROFILE-ACTIVITY-PERIOD-DATE-01 | T-57-04 | Frontend DTOs and profile page send `active_from_date` / `active_until_date` normalized as `YYYY-01-01`. | frontend unit | `cd frontend && npm run test -- --run src/app/me/profile/page.test.tsx` | yes | green |
| 57-02-02 | 02 | 2 | MEMBER-PROFILE-ACTIVITY-PERIOD-DATE-01 | T-57-02 | UI exposes bounded year selects instead of free text/number controls. | frontend unit | `cd frontend && npm run test -- --run src/app/me/profile/page.test.tsx` | yes | green |
| 57-02-03 | 02 | 2 | MEMBER-PROFILE-ACTIVITY-PERIOD-DATE-01 | T-57-01 | Protected profile still loads with refresh session when access token is absent. | frontend auth regression | `cd frontend && npm run test -- --run src/app/me/profile/page.test.tsx` | yes | green |
| 57-03-01 | 03 | 3 | MEMBER-PROFILE-ACTIVITY-PERIOD-DATE-01 | all | Contract, typecheck, production build, and diff hygiene stay aligned. | integration/checks | `cd frontend && npm run typecheck`; `cd frontend && npm run build`; `git diff --check` | yes | green |

---

## Wave 0 Requirements

Existing infrastructure covered all Phase 57 requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Authenticated save/reload of `/me/profile` activity years | MEMBER-PROFILE-ACTIVITY-PERIOD-DATE-01 | Browser context had no logged-in session; unauthenticated smoke only reached the auth gate. | Log in locally, open `http://127.0.0.1:3000/me/profile`, save `Aktiv seit`/`Aktiv bis`, reload, then verify years persist. |
| `Aktuell aktiv` save/reload behavior in live UI | MEMBER-PROFILE-ACTIVITY-PERIOD-DATE-01 | Automated tests cover payload and handler clearing; live persistence still needs an authenticated session. | Enable `Aktuell aktiv`, save, reload, and confirm `Aktiv bis` remains empty and disabled. |

---

## Validation Audit 2026-05-29

| Metric | Count |
|--------|-------|
| Gaps found | 0 automated coverage gaps |
| Resolved | 7 automated verification rows |
| Escalated | 2 manual authenticated UAT rows |

---

## Validation Sign-Off

- [x] All tasks have automated verify coverage or documented manual-only UAT.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency under 2 minutes.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-05-29
