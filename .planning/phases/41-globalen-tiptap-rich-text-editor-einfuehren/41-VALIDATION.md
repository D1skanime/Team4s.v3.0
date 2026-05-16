---
phase: 41
slug: globalen-tiptap-rich-text-editor-einfuehren
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-12
updated: 2026-05-14
---

# Phase 41 - Validation Strategy

> Per-phase validation contract and audited verification coverage for the TipTap rollout.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | go test (backend), vitest (frontend), TypeScript compiler |
| **Config file** | [frontend/vitest.config.ts](/C:/Users/admin/Documents/Team4s/frontend/vitest.config.ts:1) |
| **Quick run command** | `cd backend && go test ./internal/services/... -run TestTipTap -count=1 && cd ../frontend && npm run typecheck` |
| **Phase-focused command** | `cd frontend && npx vitest run "src/components/editor/RichTextEditor.test.tsx" "src/components/editor/ColorTokenExtension.test.ts" "src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx" "src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx" "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx" "src/lib/api.fansubNotes.test.ts" "src/lib/api.releaseVersionNotes.test.ts"` |
| **Full verification command** | `cd backend && go build ./... && go test ./internal/services/... -run TestTipTap -count=1 && go test ./internal/handlers ./internal/repository -run "ReleaseVersionNotes|ContributorGuardSourceInvariants|FansubGroupNotes|MemberStories|AnimeProjectNotes" -count=1 && cd ../frontend && npm run typecheck` |
| **Observed runtime** | ~35s backend + ~6s frontend focused tests |

---

## Sampling Rate

- **After backend service work:** `cd backend && go test ./internal/services/... -run TestTipTap -count=1`
- **After frontend editor wiring work:** `cd frontend && npm run typecheck`
- **After note-flow changes:** run the phase-focused `vitest` suite
- **Before `/gsd-verify-work 41`:** backend focused suite + frontend focused suite must be green
- **Max feedback latency:** under 60 seconds for the smallest focused check

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Evidence | Status |
|---------|------|------|-------------|-----------|-------------------|----------|--------|
| 41-01-01 | 01 | 1 | TIPTAP-EDITOR-01 | planning consistency | artifact review | [41-01-SUMMARY.md](/C:/Users/admin/Documents/Team4s/.planning/phases/41-globalen-tiptap-rich-text-editor-einfuehren/41-01-SUMMARY.md:1) confirms requirement routing and migration numbering decisions | COVERED |
| 41-02-01 | 02 | 1 | TIPTAP-EDITOR-01 | backend unit | `cd backend && go test ./internal/services/... -run TestTipTap -count=1` | [tiptap_service_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/services/tiptap_service_test.go:17) covers validation, rendering, sanitizing, text extraction, and emptiness | COVERED |
| 41-03-01 | 03 | 2 | TIPTAP-EDITOR-01 | backend integration guards | `cd backend && go test ./internal/handlers ./internal/repository -run "ReleaseVersionNotes|ContributorGuardSourceInvariants|FansubGroupNotes|MemberStories|AnimeProjectNotes" -count=1` | [admin_content_release_version_notes_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/handlers/admin_content_release_version_notes_test.go:12) and [release_version_notes_repository_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/repository/release_version_notes_repository_test.go:20) keep context-guard seams covered | COVERED |
| 41-04-01 | 04 | 2 | TIPTAP-EDITOR-01 | frontend component unit | `cd frontend && npx vitest run "src/components/editor/RichTextEditor.test.tsx" "src/components/editor/ColorTokenExtension.test.ts"` | [RichTextEditor.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/components/editor/RichTextEditor.test.tsx:33) and [ColorTokenExtension.test.ts](/C:/Users/admin/Documents/Team4s/frontend/src/components/editor/ColorTokenExtension.test.ts:4) cover render safety, shortnote behavior, helper text, and token allowlist | COVERED |
| 41-05-01 | 05 | 3 | TIPTAP-EDITOR-01 | frontend flow/API | `cd frontend && npx vitest run "src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx" "src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx" "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx" "src/lib/api.fansubNotes.test.ts" "src/lib/api.releaseVersionNotes.test.ts"` | [NotesTab.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx:146), [AnimeProjectNotesSection.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx:85), [ReleaseVersionNotesTab.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx:1), [api.fansubNotes.test.ts](/C:/Users/admin/Documents/Team4s/frontend/src/lib/api.fansubNotes.test.ts:1), [api.releaseVersionNotes.test.ts](/C:/Users/admin/Documents/Team4s/frontend/src/lib/api.releaseVersionNotes.test.ts:1) verify `body_json` usage and UI save paths | COVERED |
| 41-06-01 | 06 | 3 | TIPTAP-EDITOR-01 | final regression gate | `cd backend && go build ./... && cd ../frontend && npm run typecheck` | [41-06-SUMMARY.md](/C:/Users/admin/Documents/Team4s/.planning/phases/41-globalen-tiptap-rich-text-editor-einfuehren/41-06-SUMMARY.md:1) plus rerun on 2026-05-14 confirms final phase regression checks stay green | COVERED |

*Status: COVERED · PARTIAL · MISSING*

---

## Wave 0 Requirements

- [x] [backend/internal/services/tiptap_service_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/services/tiptap_service_test.go:1) covers TipTap JSON validation, render, sanitize, and emptiness checks
- [x] [frontend/src/components/editor/RichTextEditor.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/components/editor/RichTextEditor.test.tsx:1) covers editor render behavior
- [x] [frontend/src/components/editor/ColorTokenExtension.test.ts](/C:/Users/admin/Documents/Team4s/frontend/src/components/editor/ColorTokenExtension.test.ts:1) covers token allowlist behavior
- [x] Existing note-tab and API tests were extended to assert `body_json` editor flows instead of legacy markdown

Wave 0 is now complete; the earlier placeholders in this file are no longer gaps.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RichTextEditor renders in a live browser with toolbar interactions | TIPTAP-EDITOR-01 | TipTap DOM behavior and browser integration are richer than jsdom mocks | Open the admin page, create or edit a note, type content, and interact with the toolbar |
| Token color palette presents only curated tokens in the real UI | TIPTAP-EDITOR-01 | Final affordance and dropdown presentation are visual | Open color picker and verify no free hex-entry path is exposed |
| Shortnote mode shows the release guidance copy | TIPTAP-EDITOR-01 | Final layout/text visibility is UI-specific | Open release-version notes and verify the shortnote helper copy |
| Table insertion and row/column controls remain usable live | TIPTAP-EDITOR-01 | Browser interaction path is manual UX | Insert a table and add rows/columns in the live editor |

---

## Validation Audit 2026-05-14

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 5 |
| Escalated | 0 |

Resolved means the prior draft-only or Wave-0-placeholder entries were replaced by verified automated coverage.

---

## Validation Sign-Off

- [x] All tasks have automated verification or are explicitly manual-only
- [x] Sampling continuity: no 3 consecutive tasks without automated verification
- [x] Wave 0 covers all formerly missing references
- [x] No watch-mode flags are required for the phase-focused suite
- [x] Feedback latency stays under 60 seconds for focused checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-05-14
