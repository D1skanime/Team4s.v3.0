---
phase: 157-projekt-memberseite-visuelles-referenzdesign
reviewed: 2026-09-14T00:00:00Z
depth: standard
files_reviewed: 31
files_reviewed_list:
  - backend/internal/handlers/project_member_public_handler_test.go
  - backend/internal/repository/project_member_public_repository_episodes_integration_test.go
  - backend/internal/repository/project_member_public_repository.go
  - frontend/scripts/lib/shotHelpers.mjs
  - frontend/scripts/shot-projectmember.mjs
  - frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.tsx
  - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberHero.test.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.module.css
  - frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.test.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css
  - frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.module.css
  - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberPage.module.css
  - frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx
  - frontend/src/components/ui/Button.tsx
  - frontend/src/components/ui/EmptyState.tsx
  - frontend/src/components/ui/HeroMetrics.test.tsx
  - frontend/src/components/ui/HeroMetrics.tsx
  - frontend/src/components/ui/SectionHeader.test.tsx
  - frontend/src/components/ui/SectionHeader.tsx
  - frontend/src/components/ui/ui.module.css
  - frontend/src/lib/scrollToSection.test.ts
  - frontend/src/lib/scrollToSection.ts
  - frontend/src/types/projectMember.ts
  - shared/contracts/openapi.yaml
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 157: Code Review Report

**Reviewed:** 2026-09-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 31
**Status:** issues_found

## Summary

This is a fresh, full re-review of phase 157's accumulated file set (project-member visual
reference redesign), including the just-landed GAP-03 closure work (157-15/157-16): SectionHeader
icon/counter slots, the permanent hover-independent hero-metric affordance with a
`:focus-visible` ring, Tab-containment for clamped note links, `isolation: isolate` on note
entries, and the deletion of the two orphaned `ProjectMemberSummary(Band)` components.

The GAP-03 additions themselves are solid: the CSS/DOM contracts match their unit-test and
live-browser (`shot-projectmember.mjs`) assertions exactly, the deleted components leave no
dangling references, and the new `countEpisodes` union-dedup SQL is proven against a real Postgres
fixture. No BLOCKER-level defects (security, crash, data loss, or broken user flow) were found in
this pass.

What remains are three real, if modest, quality/correctness gaps: a German-text edge-case bug in
the note timeline's meta line when `episode_label` is empty, a hand-rolled empty-state `<div>`
next to an unused `EmptyState` design-system primitive in the same review scope, and dead CSS left
behind by the SectionHeader-primitive migration. Three INFO-level notes round out the rest
(pre-existing legacy test pattern, non-parameterized cursor SQL, and non-deterministic
`ARRAY_AGG` ordering in `ListReleases`).

## Warnings

### WR-01: Note timeline meta line can render a stray "Folge " fragment when `episode_label` is empty

**File:** `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.tsx:64`
**Issue:** `metaLead` is built as:
```ts
const metaLead = [`Folge ${note.episode_label}`, note.release_version_label, formatDate(note.created_at)]
  .filter(Boolean)
  .join(' · ')
```
The backend repository defensively coalesces a missing `episodes.episode_number` to an empty
string (`COALESCE(e.episode_number, '') AS episode_label`, see
`backend/internal/repository/project_member_public_repository.go:277`). When that happens,
`` `Folge ${note.episode_label}` `` evaluates to the non-empty, truthy string `"Folge "` — it is
**not** filtered out by `.filter(Boolean)`, unlike `release_version_label` or `formatDate(...)`,
which correctly disappear when empty. The result is a visibly broken meta line such as
`"Folge  · v1 · 12.04.2024"` (double space) or, in the worst case, just `"Folge "` with a trailing
space, and the same broken text is echoed into the card's `aria-label`
(`` `Beitrag ansehen: ${metaLead}` `` at line 127).
**Fix:**
```ts
const metaLead = [
  note.episode_label ? `Folge ${note.episode_label}` : null,
  note.release_version_label,
  formatDate(note.created_at),
]
  .filter(Boolean)
  .join(' · ')
```

### WR-02: Project-member empty state re-implements markup the global `EmptyState` primitive already provides

**File:** `frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx:58-62`
**Issue:** CLAUDE.md's Frontend-UI rule requires user-facing UI to use the global primitives from
`@/components/ui`, and explicitly rejects "closest-analog" local-file-consistency as an excuse to
diverge from the design system. `frontend/src/components/ui/EmptyState.tsx` is exactly this
primitive (title/description/variant, including a `compact` variant that would fit here), and it
is part of this review's file set — yet nothing in `frontend/src/components/fansubs/projectMember/`
imports or uses it. `ProjectMemberPage.tsx` instead renders a hand-rolled `<div
className={styles.emptyState}>…</div>` with its own copy and its own CSS block
(`ProjectMemberPage.module.css:94-104`), duplicating what `EmptyState` already solves.
**Fix:** Replace the hand-rolled block with the shared primitive, e.g.:
```tsx
import { EmptyState } from '@/components/ui'
...
{isEmpty ? (
  <EmptyState
    variant="compact"
    title="Keine öffentlichen Beiträge"
    description="Für diese Projektmitwirkung sind derzeit keine öffentlichen Detailbeiträge, Notizen oder Medien vorhanden."
  />
) : ( ... )}
```

### WR-03: Dead CSS left behind by the SectionHeader-primitive migration

**File:** `frontend/src/components/fansubs/projectMember/ProjectMemberPage.module.css:63-91`,
`frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.module.css:10-14`,
`frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.module.css:92-96`
**Issue:** `.sectionHead`, `.sectionTitle`, and `.placeholder` in `ProjectMemberPage.module.css`
are no longer referenced by any `.tsx` file that imports that module (confirmed via repo-wide
grep across every consumer: `ProjectMemberHero.tsx`, `ProjectMemberNotesSection.tsx`,
`ProjectMemberMediaGallery.tsx`, `ProjectMemberPage.tsx`) — they were superseded by the shared
`SectionHeader` primitive's own `.sectionTitle`/`.sectionHeaderTitleRow` classes in
`ui.module.css` once notes/media sections switched to `<SectionHeader icon counter underline
/>`. Separately, `.loadMoreWrap` is defined identically (and unused) in both
`ProjectMemberNotesSection.module.css` and `ProjectMemberMediaGallery.module.css` — both sections
use `pageStyles.pager`/`pageStyles.pagerButtons` from `ProjectMemberPage.module.css` instead.
**Fix:** Delete the four dead rules (`.sectionHead`, `.sectionTitle`, `.placeholder` in
`ProjectMemberPage.module.css`, and the two duplicate `.loadMoreWrap` blocks) to avoid the next
person assuming they are load-bearing and wiring new markup to them.

## Info

### IN-01: Legacy source-assertion test pattern remains in the reviewed handler test file

**File:** `backend/internal/handlers/project_member_public_handler_test.go:67-97, 233-295`
**Issue:** `TestProjectMemberHandler_MethodsExist`, `TestProjectMemberHandler_CursorEnvelopeAndLimit`,
`TestProjectMemberHandler_MediaURLBuilding`, `TestProjectMemberHandler_RoutesRegistered`, and
`TestPhase128ServerInjectsOneMemberResolverAndOptionalAuth` all read the handler's/`main.go`'s own
`.go` source via `os.ReadFile` and assert on lowercased `strings.Contains` fragments, without ever
invoking the handler or checking a real response — the pattern CLAUDE.md's Teststil section
explicitly forbids ("Verboten: ... Prüfung eines Substrings per `strings.Contains`, um zu
behaupten, etwas existiere oder greife, ohne den Code je aufzurufen"). This predates phase 157 and
is documented as part of the tracked 49-file/236-assertion Altlast
(`.planning/notes/2026-09-02-altlasten-cr01-wr02.md`), so it is not a regression — but the same
file also now contains `TestProjectMemberGetSummary_ReturnsEpisodesCount` (157's own addition),
which correctly calls `handler.GetSummary(c)` and asserts on the real JSON body. That test is the
right template; the older tests in this same file should not be copied forward as a pattern for
future changes to this handler.
**Fix:** No action required for this review; flagged so future edits to this file convert the
`os.ReadFile`-based tests to real `httptest` calls rather than extending the legacy pattern.

### IN-02: Cursor seek values are interpolated into SQL strings instead of passed as query parameters

**File:** `backend/internal/repository/project_member_public_repository.go:269-271, 320-321, 373-374`
**Issue:** `ListNotes`, `ListMedia`, and `ListReleases` build their seek-cursor `WHERE` clause via
`fmt.Sprintf` string interpolation (`rvn.created_at < '%s'`, `> %d`, etc.) instead of using
placeholder parameters like the rest of each query does (`$1`/`$2`/`$3`). The interpolated values
currently originate from strongly-typed `time.Time`/`int32`/`int64` values produced by
`decodeTimeInt64Cursor`/`decodeInt32Int64Cursor`, so this is not exploitable today — but it is
inconsistent with the parameterized style used two lines above in the same query, and any future
change that widens what those decode helpers accept (or that copies this snippet for a
string-typed cursor field) would silently reintroduce a SQL-injection-shaped bug with no test
currently guarding against it.
**Fix:** Pass the seek bound(s) as additional bound parameters (`$4`, `$5`) instead of formatting
them into the query text, e.g. `AND (rvn.created_at < $4 OR (rvn.created_at = $4 AND rvn.id < $5))`
with `t` and `id` appended to the `Query(ctx, q, memberID, animeID, groupID, t, id)` call.

### IN-03: `ListReleases`' aggregated `role_labels` ordering is not deterministic

**File:** `backend/internal/repository/project_member_public_repository.go:382`
**Issue:** `COALESCE(ARRAY_AGG(DISTINCT rd.label_de) FILTER (...), ARRAY[]::text[]) AS role_labels`
has no `ORDER BY` inside the aggregate. For a release version where a member holds more than one
role, Postgres does not guarantee a stable element order for `ARRAY_AGG(DISTINCT ...)` across
calls/plans, so `role_labels` for the same release version could vary between requests.
**Fix:** Add an explicit order, e.g.
`ARRAY_AGG(DISTINCT rd.label_de ORDER BY rd.label_de) FILTER (...)`.

---

_Reviewed: 2026-09-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
