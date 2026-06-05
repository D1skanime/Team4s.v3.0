---
phase: 75
slug: anime-gruppen-deep-dive-anime-id-group-groupid
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-05
---

# Phase 75 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 (Frontend) + testify (Go-Backend) |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npm test -- --reporter=verbose` |
| **Full suite command** | `cd frontend && npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm test -- --reporter=verbose`
- **After every plan wave:** Run `cd frontend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 75-01-01 | 01 | 1 | D, G, K | T-75-01-01, T-75-01-02, T-75-01-03, T-75-01-04 | parseAnimeID/parseGroupID reject non-integer and <=0 IDs with 400; only status='ready' assets returned by themes/release-media repos; GetProjectContributors scoped to correct animeID+groupID | unit (Go) | `cd backend && go build ./... && go test ./internal/repository/ -run GroupContributors` | ✅ W0 required → `backend/internal/repository/group_contributors_repository_test.go` | ⬜ pending |
| 75-01-02 | 01 | 1 | D, K | T-75-01-SC | Handler and routes compile; TypeScript types match Go JSON tags | build | `cd backend && go build ./cmd/server/... && cd ../frontend && npm run typecheck` | N/A (build check) | ⬜ pending |
| 75-02-01 | 02 | 2 | D, A | T-75-02-01, T-75-02-02 | projectNotesHtml passed to CollapsibleStory as text (no dangerouslySetInnerHTML); group.period nil-guarded before prop pass | type | `cd frontend && npm run typecheck 2>&1 \| grep -E "error\|Error" \| head -20` | N/A (typecheck) | ⬜ pending |
| 75-02-02 | 02 | 2 | D, A, K | T-75-02-SC | page.tsx ≤150 lines; GroupSectionsNav uses Button only; five anchor IDs present | build | `cd frontend && npm run typecheck && npm run build` | N/A (build check) | ⬜ pending |
| 75-03-01 | 03 | 3 | D, G, K | T-75-03-01, T-75-03-02, T-75-03-03 | TeamSection renders two distinct blocks; member_slug!=null → Link, null → span; empty arrays show EmptyState (section not hidden) | unit (Vitest) | `cd frontend && npm test -- --reporter=verbose TeamSection` | ✅ W0 required → `frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx` | ⬜ pending |
| 75-03-02 | 03 | 3 | D, G, K | T-75-03-04 | page.tsx calls all three new api helpers with try/catch; error catch blocks set empty defaults (no user-visible error strings); MediaSection always in DOM | build | `cd frontend && npm run typecheck && npm run build` | N/A (build check) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/repository/group_contributors_repository_test.go` — stubs for REQ G/K: GetProjectContributors scoping, visibility gate, empty-result non-nil slice
- [ ] `frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx` — stubs for REQ D-07, D-09: two-block separation, claim-based linking, empty state rendering

*These files must exist (even as failing test stubs) before Wave 3 execution begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vollständige Scroll-Seite mit sieben Abschnitten, Sticky-Nav, Umlaut-Korrektheit | D-01..D-15 | Visual layout, IntersectionObserver active-state, mobile chip-scroll — not automatable via CLI | Run `npm run dev` on port 3000; open `/anime/[id]/group/[groupId]`; verify all seven sections, sticky-nav chip highlighting on scroll, correct umlauts in all labels, no console errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
