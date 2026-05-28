---
phase: 55
slug: sichere-tiptap-persistenz-fuer-profilgeschichte
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-29
validated: 2026-05-29
requirements:
  - MEMBER-PROFILE-STORY-RICH-TEXT-01
---

# Phase 55 - Validation Strategy

## Scope

Phase 55 fixes profile-story rich-text persistence. TipTap JSON is the editing source of truth, HTML is rendered and sanitized server-side, plain text is derived for compatibility/search/preview, and `/me/profile` shows a read mode until the user explicitly clicks `Bearbeiten`.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Go `testing`; Vitest; TypeScript `tsc` |
| Config file | `frontend/vitest.config.ts`; backend uses package-local `go test` |
| Quick run command | `go test ./internal/handlers ./internal/repository`; `npm run test -- --run "src/app/me/profile/page.test.tsx" "src/components/editor/RichTextEditor.test.tsx"` |
| Full suite command | `go test ./internal/handlers ./internal/repository ./internal/services`; `npm run typecheck`; `git diff --check` |
| Estimated runtime | ~15 seconds for focused validation on warm cache |

## Sampling Rate

- After backend profile-handler/repository changes: run `go test ./internal/handlers ./internal/repository`.
- After TipTap service changes: run `go test ./internal/services`.
- After profile UI changes: run `npm run test -- --run "src/app/me/profile/page.test.tsx" "src/components/editor/RichTextEditor.test.tsx"`.
- Before `$gsd-verify-work`: run focused backend checks, focused frontend checks, `npm run typecheck`, and `git diff --check`.
- Before accepting live UAT for schema-backed work: confirm migration status and running container rebuild.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 55-01-01 | 01 | 1 | MEMBER-PROFILE-STORY-RICH-TEXT-01 | T-55-04 | Migration adds reversible TipTap story columns without dropping compatibility text | migration/runtime | `go run ./cmd/migrate status -dir ../database/migrations -database-url ...` | yes | green |
| 55-01-02 | 01 | 1 | MEMBER-PROFILE-STORY-RICH-TEXT-01 | T-55-04 | Repository reads and writes JSON, HTML, text, editor type, and schema version together | unit | `go test ./internal/repository` | yes | green |
| 55-01-03 | 01 | 1 | MEMBER-PROFILE-STORY-RICH-TEXT-01 | T-55-01 / T-55-02 | Handler validates TipTap JSON, renders/sanitizes HTML server-side, and rejects client HTML | unit | `go test ./internal/handlers` | yes | green |
| 55-01-04 | 01 | 1 | MEMBER-PROFILE-STORY-RICH-TEXT-01 | T-55-04 | OpenAPI documents JSON source, sanitized HTML, derived text, and 400 validation path | contract/diff | `git diff --check` | yes | green |
| 55-02-01 | 02 | 2 | MEMBER-PROFILE-STORY-RICH-TEXT-01 | T-55-FE-01 | Profile tests assert read mode, edit mode, JSON payload preservation, and save return to read mode | unit/component | `npm run test -- --run "src/app/me/profile/page.test.tsx"` | yes | green |
| 55-02-02 | 02 | 2 | MEMBER-PROFILE-STORY-RICH-TEXT-01 | T-55-FE-01 | Frontend DTOs and API helpers expose the documented rich-text profile fields | typecheck | `npm run typecheck` | yes | green |
| 55-02-03 | 02 | 2 | MEMBER-PROFILE-STORY-RICH-TEXT-01 | T-55-FE-02 | Story card renders server-provided HTML in read mode and shows editor only after `Bearbeiten` | unit/component | `npm run test -- --run "src/app/me/profile/page.test.tsx"` | yes | green |
| 55-02-04 | 02 | 2 | MEMBER-PROFILE-STORY-RICH-TEXT-01 | T-55-FE-01 / T-55-FE-03 | Profile page sends `member_story_json`, preserves dirty state, and relies on central API/auth seams | unit/component/typecheck | `npm run test -- --run "src/app/me/profile/page.test.tsx"`; `npm run typecheck` | yes | green |
| 55-03-01 | 03 | 3 | MEMBER-PROFILE-STORY-RICH-TEXT-01 | all | Focused backend/frontend verification documents passing checks | verification | `go test ./internal/handlers ./internal/repository`; `go test ./internal/services`; `npm run test -- --run ...`; `npm run typecheck`; `git diff --check` | yes | green |
| 55-03-02 | 03 | 3 | MEMBER-PROFILE-STORY-RICH-TEXT-01 | T-55-01 / T-55-02 / T-55-FE-03 | Security review confirms JSON/HTML/auth boundaries and no parallel sanitizer/API seam | review | `55-SECURITY.md` plus focused tests | yes | green |
| 55-03-03 | 03 | 3 | MEMBER-PROFILE-STORY-RICH-TEXT-01 | T-55-04 | UAT confirms H1, color, and table survive save/reload in live app after migration/rebuild | UAT/runtime | `55-UAT.md`; migration status command; DB column query | yes | green |

## Gap Analysis

| Requirement | Coverage | Status |
|-------------|----------|--------|
| MEMBER-PROFILE-STORY-RICH-TEXT-01 | Backend handler/repository/service tests, frontend profile/RichTextEditor tests, typecheck, OpenAPI diff review, migration status, live UAT | covered |

No missing automated validation gaps were found. No generated test files were needed during this validate pass because the Phase 55 implementation already added focused backend and frontend tests, and the runtime issue was resolved by applying migration 78 and rebuilding the running containers.

## Runtime Validation Evidence

| Check | Result |
|-------|--------|
| `go test ./internal/handlers ./internal/repository` | passed |
| `go test ./internal/services` | passed |
| `npm run test -- --run "src/app/me/profile/page.test.tsx" "src/components/editor/RichTextEditor.test.tsx"` | passed; 2 files, 22 tests |
| `npm run typecheck` | passed |
| `git diff --check` | passed with CRLF normalization warnings only |
| `go run ./cmd/migrate status -dir ../database/migrations -database-url ...` | migration 78 applied; Applied: 78, Pending: 0 |
| DB column query on `members` | `member_story_json`, `member_story_html`, `member_story_text`, `member_story_editor_type`, and `member_story_content_schema_version` exist |
| `docker ps --filter name=team4sv30` | frontend, backend, db, keycloak, keycloak-db, and redis containers running |

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live browser smoke of real editor toolbar and profile read/edit transition | MEMBER-PROFILE-STORY-RICH-TEXT-01 | Confirms the running app uses the applied schema and rebuilt containers; the underlying behavior is also automated | Open `/me/profile`, edit profile story, add H1/H2/H3, color and table, save, confirm read mode without toolbar, reload, confirm formatting persists, click `Bearbeiten` and confirm editor reopens with saved state |

Manual live UAT passed on 2026-05-29 in the in-app browser at `http://127.0.0.1:3002/me/profile`; user reported `pass`.

## Validation Audit 2026-05-29

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved by new tests | 0 |
| Escalated manual-only gaps | 0 |
| Additional runtime smoke checks | 2 |

## Validation Sign-Off

- [x] All Phase 55 tasks have automated verification or documented runtime/UAT evidence.
- [x] No requirement has three consecutive tasks without automated feedback.
- [x] Existing test infrastructure covers all Phase 55 requirements.
- [x] No watch-mode commands are required.
- [x] Feedback latency is under 30 seconds for focused validation on warm cache.
- [x] `nyquist_compliant: true` is set in frontmatter.

Approval: approved 2026-05-29
