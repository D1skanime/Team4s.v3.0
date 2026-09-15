---
phase: quick-260915-m2h
plan: "01"
subsystem: api-ui
tags: [jellyfin, chapters, selected-source, segment-editor]
requires:
  - phase: 161
    provides: Exact source resolver, source binding, shared transport and verified hook reconciliation at 3e410901
provides:
  - Selected-source file size and validated chapter hints for both authorized editor contexts
  - Exact millisecond labels with explicit nearest-second Start/End adoption for current-file segment creation
affects: [episode-version-editor, segment-creation]
tech-stack:
  added: []
  patterns: [existing-source-resolver, single-exact-file-enrichment, explicit-contributor-allowlist, saved-context-invalidation]
key-files:
  created: []
  modified:
    - backend/internal/handlers/jellyfin_media_source.go
    - backend/internal/handlers/admin_content_episode_version_editor_helpers.go
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentBasicFieldsSection.tsx
    - shared/contracts/openapi.yaml
key-decisions:
  - Preserve millisecond display and adopt Math.round(start_ms / 1000) explicitly; no persisted precision migration.
  - Item chapters require unique own-path evidence; alternate-source size remains independently available.
  - Contributors receive basename, size and chapter hints only; no provider selectors, URLs or private paths.
requirements-completed: [QUICK-CHAPTER-HINTS, QUICK-SELECTED-FILE-SIZE]
duration: implementation, integration and live verification in the same session
completed: 2026-09-15
status: complete
technical_status: passed
human_uat: partial-admin-live-only
---

# Quick 260915-m2h Plan 01: Chapter choices and selected-file size Summary

**The existing editor now exposes proven saved-file chapter times and selected-source bytes, with explicit whole-second Start/End adoption during segment creation.**

## Task commits

| Task | RED | GREEN |
| --- | --- | --- |
| 1 — Provider/DTO/contract and source evidence | `d8556893` | `b9e493d3` |
| 2 — Authorized context, redaction and request budgets | `ec939e9e` | `2c2dbf74` |
| 3 — Creation controls, precision and state invalidation | `af15a19b` | `c7e08f1e` |

All three implementation tasks and the root follow-ups are committed. Root adds this summary, evidence and the STATE quick entry in the final documentation commit. No ROADMAP/REQUIREMENTS edits or push belong to this quick. Existing Phase-161 reconciliation tests and other agents' files were preserved. The initial code gate and subsequent frontend/contracts freeze were honored.

| Root follow-up | RED | GREEN |
| --- | --- | --- |
| Forward chapter hints through the separate member-workspace consumer | `e50df4df` | `9d85f8b2` |
| Bound existing editor grid and tab strip at narrow widths | Live 390px root width 723px, also with dialog closed | `2cee78c9` |

## Changed behavior

- `Size` comes from the selected MediaSource; positive B bytes survive unavailable A-owned chapters. No filesystem stat or item-size inference.
- Chapter eligibility requires exact requested item plus existing ownership guard and exactly one matching nonempty normalized, case-sensitive own source path. Null/missing, ambiguous or invalid evidence stays unavailable. Explicit empty chapters remain `[]`.
- Raw int64 ticks are validated against selected runtime and stably ordered before display conversion; null/negative/out-of-runtime entries are discarded. Nonempty all-invalid lists, absent trustworthy runtime and over-256 lists are unavailable. Millisecond DTO conversion excludes only the sub-millisecond remainder.
- Both existing authorized context branches receive selected-file metadata. Contributors use an explicit allowlist of basename, bytes and chapter hints with empty required provider strings; selectors and URLs are omitted. Existing endpoint permission/status/envelope behavior remains intact.
- Initial selected-file size now uses the real context projection through the existing byte formatter. Scans can update visible file metadata but never replace the saved chapter authority.
- New current-file creation gets global `Select` controls beneath Start and Ende. Options preserve provider labels (fallback `Kapitel N`) and exact millisecond clocks. Explicit choices use `Math.round`; 1298.047 / 1378.043 become 1298 / 1378 seconds. The rounding note is visible. Only the chosen field changes; title, type, episode range and source stay untouched and Save stays explicit.
- Existing segments/shared bases/overrides, alternate playback origins and pending uploads receive no creation aid. Binding drafts and route changes withhold hints; a submitted source change permanently invalidates its old file context until a fresh context load, including failed/late saves. Variant changes close/reset an open drawer.
- The drawer uses its own inline-size container; the two-field layout requires 332px content width (160 + 12 + 160), otherwise fields stack. Selects and field children have bounded width/min-width zero. Existing section order, panel size and time inputs remain.

## Verification

| Check | Result |
| --- | --- |
| Task 1 RED | Selected-size and chapter validation tests failed for missing projection before implementation. |
| Task 2 RED | Context/redaction/failure/scan tests failed for missing metadata and old request fields before implementation. |
| Task 3 RED | New hook/creation tests failed for missing hints/controls before implementation. |
| Frontend focused | **208 passed**, 7 files, 0 failed/skipped. Includes 29 hook, 99 segment, 26 editor utility, 9 auth-boundary, 4 contract, 9 real API-helper and 32 refresh tests. |
| Root workspace/segment regression | **119 passed** (20 workspace + the same 99 segment tests). Together with the original 208 this covers **228 unique frontend tests**; overlapping reruns are not counted twice. |
| Root workspace ESLint | 0 errors; 1 existing unused `AdjacentReleases` warning. |
| Backend focused/broader relevant | **254 passed**, 0 failed/skipped (test cases including subtests); handler/model Jellyfin, source, editor-context, contributor and scan coverage. Guarded `team4s_phase117_test_161` fixtures actually ran. |
| Go build | `go build ./...` passed. |
| Go vet | `go vet ./...` passed. |
| Scoped ESLint | 0 errors, **11 pre-existing native-control warnings** in untouched controls of the edited pages. New controls use global Select. |
| Typecheck | Same **2 baseline page-type errors** in generated admin-anime page types; no new errors. |
| Production build | Compiled successfully in 31.5s; failed on the same baseline `formatEditLoadError` page export. Isolated NODE_ENV=production scratch build finished in 63.6s and was cleaned safely; dev `.next` untouched. |
| Diff | `git diff --check` passed; no task commit deleted files. |

Evidence is local to this quick directory: `backend-focused.json`, `frontend-focused.json`, `frontend-static.json`, `frontend-build.json`, `root-final-checks.json` and `browser-verification.json`. Root checks run at `2cee78c9`; the production build and original scoped lint remain scoped to the preceding implementation stage, not presented as fresh final-revision runs. Provider/DB credentials were held in memory only. No application rows, import/relink/rescan/play/render/save operation, migration, dependency install or runtime reset was performed for verification. Fixture state equality checks verify read-only endpoint behavior.

## Live browser evidence

Observed with the existing platform-admin session; all drafts were cancelled without Save.

| Surface | Observed result |
| --- | --- |
| Admin editor 28, episode 2 | Files shows **493 MB**; 4 chapter choices. Choosing 00:00:17.934 and 00:01:57.951 sets Start **00:00:18** and End **00:01:58**. Title stays empty and episode range remains 2–2. |
| Admin editor 43, episode 7 | Files shows **323 MB**; 5 chapter choices. 00:22:24.969 / 00:23:44.965 becomes **00:22:25 / 00:23:45**. |
| Member workspace 28, using admin session | Both chapter selectors present after root wiring fix; same 4 choices and explicit Start adoption. Draft cancelled. This is surface coverage, not proof of a distinct contributor login. |
| Width 320 / 390 / 768 / 1440px | Document scrollWidth **305 / 375 / 753 / 1440px**, respectively. Narrow fields stack; tab overflow is owned locally by the tab strip. Full-page tablet/desktop screenshots inspected inline. Viewport overrides reset. |

The original 390px editor overflow was 723px both with and without the new dialog. The root fix bounds its existing grid columns and tab strip; no global overflow hiding was added. Long chapter labels remain provider text and do not determine type or episode identity. Browser zoom was not exercised. Original millisecond labels are preserved; nearest-second adoption is the announced working default after the optional precision question received no answer, not a claimed explicit precision-policy sign-off.

Normal workspace discovery could not be verified: `/me/dashboard` displayed “Dashboard konnte nicht geladen werden”. The user-known workspace route loaded, but showed “Release-Navigation konnte nicht geladen werden” and “Member-Profil fehlt” in the admin session. These observations were not investigated or repaired in this quick and are not labelled proven pre-existing regressions. Distinct contributor live UAT remains open; guarded contributor/refresh integration tests passed.

## Measured budgets

- **0 new SQL:** enrichment test uses a handler without repositories; context reuses the already loaded version/anime. Existing fixture state stays byte-identical across each context GET.
- **1 exact-file GET/context:** both known and missing duration, both admin and contributor, A and B selection; same response supplies duration/size/chapters.
- Admin keeps **1 existing series/folder GET** in the success fixture; contributor adds **0 series/folder GETs** and uses loaded ownership metadata.
- **0 requests/chapter; 0 additional scan GETs.** Default batch and series `Fields` remain unchanged; only the opt-in exact-item read requests Chapters. Scan size is projected from already loaded sources and its chapter property stays omitted.

## Deviations from plan

**[Rule 2 — Contract alignment]** Root identified the existing `shared/contracts/episode-versions.yaml` focused DSL alongside the planned canonical/focused files. Task 1 aligned its existing context/media-file definitions and added the hint DTO. The legacy file is not parsed wholesale as YAML. No API surface or schema was added outside the additive planned read projection. Commit: `b9e493d3`.

**[Root consumer completion]** The member workspace renders `SegmenteTab` directly rather than through `EpisodeVersionEditorPage`. Forwarding `context.selected_file?.chapter_hints ?? null` closes this real consumer gap without adding a fetch. A RED test reproduces the missing propagation; the 20-test workspace suite passes after the one-line fix. Commits: `e50df4df`, `9d85f8b2`.

**[Root responsive prerequisite]** Live inspection exposed an existing root overflow unrelated to dialog visibility. `EpisodeVersionEditor.module.css` now uses zero-minimum grid tracks/children and a locally scrollable tab strip. This narrow prerequisite makes the chapter controls usable at the required widths without hiding document overflow globally. Commit: `2cee78c9`.

**Test correction:** Go JSON unmarshalling of explicit null into a slice pointer yields a nil pointer. The response test therefore verifies the serialized `chapter_hints` key and null value directly; the wire contract remained unchanged.

## Deferred issues and baseline limitations

- Current typecheck reproduces the two recorded unrelated admin-anime page errors (`formatEditLoadError` unsupported page export and AdminAnimePageProps/undefined).
- Phase-161 frozen broader baseline recorded **50 Go failure headings**, frontend **2 CSS guard failures**, full lint **13 errors / 328 warnings**, and the frontend build page-export failure. These are unrelated and were not repaired here. The broad full suites were not repeated merely to rediscover that baseline after root's immediately preceding verification.
- Live admin/editor and workspace-surface verification is complete as described above. Distinct contributor live navigation, browser zoom and human sign-off remain unperformed. The observed dashboard/navigation failures limit discoverability verification; they do not block the tested editor controls.
- No new stub/placeholder functionality was introduced. Intentional null/empty metadata states are documented behavior. Threat boundaries are covered by the plan's T-Q01–T-Q06; no unplanned security surface was added.

## Files changed

- `backend/internal/handlers/admin_content_episode_version_editor_context_test.go`
- `backend/internal/handlers/admin_content_episode_version_editor_helpers.go`
- `backend/internal/handlers/admin_content_episode_version_editor_scan.go`
- `backend/internal/handlers/jellyfin_client.go`
- `backend/internal/handlers/jellyfin_media_source.go`
- `backend/internal/handlers/jellyfin_media_source_test.go`
- `backend/internal/handlers/jellyfin_source_batch.go`
- `backend/internal/handlers/jellyfin_source_batch_test.go`
- `backend/internal/models/episode_version.go`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditor.module.css`
- `frontend/src/app/me/releases/[versionId]/workspace/page.tsx`
- `frontend/src/app/me/releases/[versionId]/workspace/page.test.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentBasicFieldsSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.module.css`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.test.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts`
- `frontend/src/lib/api.episode-versions.test.ts`
- `frontend/src/types/__tests__/episode-version-contract.test.ts`
- `frontend/src/types/episodeVersion.ts`
- `shared/contracts/admin-content.yaml`
- `shared/contracts/episode-versions.yaml`
- `shared/contracts/openapi.yaml`

## Self-Check: PASSED

All 27 changed application/contract/test files exist. All six task commits and three root follow-up commits exist. Each functional task has RED before GREEN; the low-impact CSS correction has measured before/after browser evidence. No implementation or focused regression test remains pending. Live admin checks passed; the explicitly listed contributor/zoom/discoverability limitations and human sign-off remain open. No unauthorized product expansion, database/schema change or application-data mutation occurred.
