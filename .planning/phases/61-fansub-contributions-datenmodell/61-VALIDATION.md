---
phase: 61
slug: fansub-contributions-datenmodell
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-02
updated: 2026-06-02
---

# Phase 61 - Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Go test |
| Config file | `backend/go.mod` |
| Quick run command | `cd backend && go test ./internal/migrations` |
| Full suite command | `cd backend && go test ./internal/migrations` plus scratch DB migration up/down from live version-80 schema |
| Estimated runtime | ~15 seconds focused, ~20 seconds with scratch DB |

## Sampling Rate

- After every migration-plan change: run `cd backend && go test ./internal/migrations`
- Before UAT/sign-off: run focused migration tests and scratch DB up/down from the current live schema baseline.
- Max feedback latency: under 30 seconds for focused validation.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 61-01-01 | 01 | 1 | P61-SC1, P61-SC3, P61-SC4, P61-SC5 | T-61-01, T-61-02 | `member_claims` uses FK ownership and `members.noindex` defaults protected | source unit | `cd backend && go test ./internal/migrations` | yes | green |
| 61-01-02 | 01 | 1 | P61-SC1, P61-SC3, P61-SC4 | T-61-01 | `hist_fansub_group_members` keeps member/group FKs RESTRICT and year/status checks | source unit | `cd backend && go test ./internal/migrations` | yes | green |
| 61-02-01 | 02 | 2 | P61-SC1, P61-SC2, P61-SC3, P61-SC4 | T-61-03 | `hist_group_member_roles` defers role FK until role definitions exist | source unit | `cd backend && go test ./internal/migrations` | yes | green |
| 61-02-02 | 02 | 2 | P61-SC1, P61-SC2, P61-SC3, P61-SC4 | T-61-03, T-61-04 | `role_definitions` has 15 codes and group-history contexts; history FK is constrained | source unit | `cd backend && go test ./internal/migrations` | yes | green |
| 61-03-01 | 03 | 3 | P61-SC1, P61-SC3, P61-SC4, P61-SC5 | T-61-05, T-61-06 | `anime_contributions.fansub_group_member_id` is NOT NULL with RESTRICT FK and protected public defaults | source unit + scratch DB | `cd backend && go test ./internal/migrations` | yes | green |
| 61-03-02 | 03 | 3 | P61-SC1, P61-SC3, P61-SC4 | T-61-07 | contribution roles cascade from contribution; badges keep unique member/code and polymorphic source fields | source unit + scratch DB | `cd backend && go test ./internal/migrations` | yes | green |

## Wave 0 Requirements

Existing infrastructure covers all Phase 61 requirements.

- `backend/internal/migrations/phase61_contributions_model_test.go` validates the Phase 61 migration contracts.
- `.planning/phases/61-fansub-contributions-datenmodell/61-UAT.md` records scratch DB up/down proof from the current live version-80 schema baseline.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live frontend browser smoke | Phase readiness | Phase 61 is schema-only; browser smoke verifies no obvious local app regression but does not inspect DB internals | See `61-UAT.md`, Test 1 |

## Validation Audit 2026-06-02

| Metric | Count |
|--------|-------|
| Requirements audited | 5 |
| Automated coverage added | 1 focused Go test file |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated/manual-only | 1 browser smoke |

## Validation Sign-Off

- [x] All tasks have automated verification coverage.
- [x] Sampling continuity has no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency is under 30 seconds for focused checks.
- [x] `nyquist_compliant: true` set in frontmatter.

Approval: approved 2026-06-02
