---
phase: 01
slug: ownership-foundations
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-24
---

# Phase 01 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | go test + vitest |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `go test ./internal/repository -run 'TestAdminContentRepository|TestAnimeRepository' -count=1` |
| **Full suite command** | `go test ./... && npm run test` |
| **Frontend targeted run** | `npm run test -- src/app/admin/anime/components/shared/AnimeEditorShell.test.tsx src/app/admin/anime/utils/anime-editor-ownership.test.ts` |
| **Estimated runtime** | ~90-150 seconds depending on targeted Vitest slice |

---

## Sampling Rate

- **After backend repository tasks:** Run the task-specific `go test` slice from the plan verify block.
- **After frontend tasks:** Run the task-specific Vitest slice from the plan verify block.
- **After every plan wave:** Run `go test ./... && npm run test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 150 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INTK-06, RLY-04 | backend repository contract | `go test ./internal/repository -run 'TestAdminContentRepository|TestAnimeRepository' -count=1` | planned | pending |
| 01-01-02 | 01 | 1 | INTK-06, RLY-04 | backend repository regression | `go test ./internal/repository -run 'TestAdminContentRepository' -count=1` | planned | pending |
| 01-02-01 | 02 | 2 | RLY-03 | backend repository + migration | `go test ./internal/repository -run 'TestAdminContentRepository' -count=1` | planned | pending |
| 01-02-02 | 02 | 2 | RLY-03 | backend handler/integration | `go test ./internal/handlers ./internal/repository -run 'TestAdminContent|TestMediaUpload' -count=1` | planned | pending |
| 01-03-01 | 03 | 2 | INTK-06, RLY-04 | frontend shared-surface integration | `npm run test -- src/app/admin/anime/components/shared/AnimeEditorShell.test.tsx src/app/admin/anime/utils/anime-helpers.test.ts src/app/admin/anime/utils/studio-helpers.test.ts` | planned | pending |
| 01-03-02 | 03 | 2 | INTK-06 | frontend ownership regression | `npm run test -- src/app/admin/anime/utils/anime-editor-ownership.test.ts` | planned | pending |

*Status: pending / green / red / flaky*

---

## Verification Architecture

- Wave 1 is repository-first: establish authoritative metadata writes, then prove readback and genre-token behavior through repository tests before any frontend editor extraction starts.
- Wave 2 runs two bounded tracks in parallel:
  - `01-02` covers durable actor attribution, route auth restoration, and upload/save persistence via handler and repository tests.
  - `01-03` covers shared editor extraction and ownership hints via a dedicated `AnimeEditorShell` integration test plus the ownership utility regression.
- Modularity is enforced inside task acceptance criteria with file-length checks on touched production files, not as a separate manual-only Wave 0 gate.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Existing anime edit still behaves as one coherent editor surface | INTK-06 | The automated shell test covers shared wiring, but final operator judgment still needs a browser pass on the actual route | Open an existing anime in the admin editor, modify multiple sections, confirm one central save path still applies and reload shows the saved state. |
| Ownership hint presentation is understandable but lightweight | INTK-06 | Phase 1 only adds light UI provenance hints, which need product judgment | Verify the editor shows simple ownership/source hints without introducing full Phase 4 provenance UI. |
| Authenticated cover/upload path is attributable to the acting admin | RLY-03 | Handler tests prove auth enforcement, but the full browser upload and save flow still needs operator confirmation | Upload or remove a cover through the editor, save, then confirm the actor attribution path and resulting anime state are both correct. |

---

## Validation Sign-Off

- [ ] All tasks have automated verify steps or explicit Wave 0 dependencies
- [x] All 6 planned tasks are mapped to automated verify commands
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] No Wave 0 gaps remain for planned work
- [ ] No watch-mode flags
- [ ] Feedback latency < 150s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
