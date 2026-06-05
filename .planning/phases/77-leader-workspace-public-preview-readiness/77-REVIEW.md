---
phase: 77-leader-workspace-public-preview-readiness
reviewed: 2026-06-05T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/PublicPreviewPanel.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 77: Code Review Report

**Reviewed:** 2026-06-05
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed the new capability-gated, read-only "Veröffentlichung" (readiness) tab in the
admin fansub-edit workspace: `ReadinessTab.tsx`, `PublicPreviewPanel.tsx`, the four
surgical edits to `page.tsx`, both test files, and the new CSS classes.

Overall the implementation is disciplined: hook order is correct (all hooks precede the
`if (!canEdit) return null` early return), only the three permitted API seams are used
(Lock K honored), all user-facing strings use correct umlaut spelling, and every
user-facing primitive comes from `@/components/ui` (no hand-built native controls in the
new components). `ReadinessTab.tsx` (313 lines) and `PublicPreviewPanel.tsx` (55 lines)
are under the 450-line cap. The four `page.tsx` edits are surgical and contain no
unrelated logic — except for one omission.

**Key concern (BLOCKER):** one of the four `page.tsx` surgical edits added `"readiness"`
to the `SectionKey` union but failed to add the corresponding key to the
`openSections` state initializer, which is typed `Record<SectionKey, boolean>`. This is a
TypeScript compile error (TS2741). Because the task explicitly disabled `tsc`/build
verification (empty node_modules symlink), this was not caught by the test run and must be
fixed before this code ships. Remaining findings are correctness/quality concerns in the
readiness heuristics and a few maintainability nits.

## Critical Issues

### CR-01: `openSections` initializer is missing the `readiness` key — TypeScript type error

**File:** `frontend/src/app/admin/fansubs/[id]/edit/page.tsx:1106-1120` (in conjunction with the `SectionKey` union at `:122-134`)
**Issue:** One of the four surgical edits added `"readiness"` to the `SectionKey` union
(line 134). The `openSections` state is declared as
`useState<Record<SectionKey, boolean>>({...})`, and `Record<SectionKey, boolean>` has no
index signature, so it requires an entry for **every** member of `SectionKey`. The
initializer object (lines 1107-1119) lists `basic, media, links, collaboration, releases,
"anime-projekte", notes, mitglieder, rollen, claims, vorschlaege` — 11 keys — but omits
`readiness`. This is a compile error (TS2741: "Property 'readiness' is missing in type
... but required in type 'Record<SectionKey, boolean>'"). It was not caught because
`tsc`/build was intentionally skipped for this review (empty cross-linked node_modules),
and the Vitest suite does not type-check. The readiness branch renders `ReadinessTab`
directly and never calls `isSectionOpen("readiness")`, so there is no runtime crash today —
but the project will fail `tsc`/lint and any production build.
**Fix:**
```ts
const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
  basic: true,
  media: true,
  links: true,
  collaboration: true,
  releases: true,
  "anime-projekte": true,
  notes: true,
  mitglieder: true,
  rollen: true,
  claims: true,
  vorschlaege: true,
  readiness: true, // add the missing key
});
```

## Warnings

### WR-01: "Medien korrekt kategorisiert" criterion is satisfied by a copy-pasted `animeCount > 0` heuristic that does not measure media categorization

**File:** `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx:159-172`
**Issue:** Both the `contributions` item ("Externe Mitwirkende geprüft") and the `media`
item ("Medien korrekt kategorisiert") use the identical predicate
`satisfied: animeCount > 0`. Neither value reflects what its label asserts: the count of
anime projects says nothing about whether external contributors were reviewed, nor whether
media is correctly categorized. As a result both rows flip to "erfüllt" the moment a single
anime exists, giving operators a false "done" signal for two distinct maintenance tasks.
This is a correctness defect in the checklist's semantics (the checklist is the primary
value of the tab). The duplicated literal is a strong smell that one line was copy-pasted.
**Fix:** Either (a) derive distinct signals from data already available under Lock K (e.g.,
gate `media` on logo/banner presence which is already known, and `contributions` on a
member/contribution signal), or (b) if no honest signal exists without a new endpoint,
demote these two rows to `infoItems` (variant=info, no satisfied/unsatisfied verdict),
matching the D-06 treatment already used for `story`/`claims`. Do not present an
`animeCount > 0` proxy as a satisfied verdict for "Medien korrekt kategorisiert".

### WR-02: `loadCounts` fires 3 API calls even when the user lacks readiness capability

**File:** `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx:95-127`
**Issue:** `loadCounts` is invoked unconditionally by the `useEffect` (line 121-123),
which runs after the first render. The capability gate `if (!canEdit) return null` (line
127) runs during render and returns null, but the effect has already been scheduled and
will still execute `listGroupMembers`, `listPendingMemberClaims`, and `getAdminFansubAnime`
for a user who is not permitted to see readiness content. In normal flow `page.tsx` only
mounts `ReadinessTab` when the tab is capability-visible, so this is mitigated in practice,
but `ReadinessTab` is exported and self-gates, so the component should not issue
privileged reads it then throws away. This wastes three admin API round-trips and leaks
data fetching past the capability boundary the component claims to enforce.
**Fix:** Guard the fetch on capability, e.g. compute `canEdit` before the effect and early-return inside `loadCounts`:
```ts
const loadCounts = useCallback(async () => {
  if (!(Boolean(group.can_edit_group) || Boolean(group.can_edit_notes))) return;
  // ...existing body
}, [fansubId, group.can_edit_group, group.can_edit_notes]);
```
Note this also changes the `useCallback` deps; alternatively move the `canEdit` check ahead of the effect and gate the effect body.

### WR-03: Sprungmarken navigate to tabs the user may not be able to open

**File:** `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx:52-62, 159-203`
**Issue:** `useTabNavigation` sets `?tab=<target>` via `router.replace` with no check that
the target tab is reachable under the current capabilities. For example "In Anime &
Veröffentlichungen prüfen" jumps to `?tab=releases`, but a leader without
`can_view_releases` will be silently bounced back to the default tab by
`resolveMainTabForAccess` in `page.tsx`. The user clicks a guidance link and lands
somewhere unexpected with no feedback. This is a robustness/UX gap for the very
"Leitfaden" the tab advertises.
**Fix:** Either hide/disable a Sprungmarke whose target tab is not in the visible tab set,
or pass the capability-derived visible-tab list into `ReadinessTab` and skip emitting
buttons for unreachable targets. At minimum, document that targets are best-effort.

### WR-04: `PublicPreviewPanel` double-casts admin DTOs through `as unknown as` to public types — type safety is bypassed at the boundary

**File:** `frontend/src/app/admin/fansubs/[id]/edit/PublicPreviewPanel.tsx:33-34,44` and `ReadinessTab.tsx:148,305`
**Issue:** `members as unknown as FansubMember[]` and `projects as unknown as
AnimeListItem[]` (and in `ReadinessTab`, `group as unknown as FansubGroup`) erase all type
checking between the admin-side DTOs (`HistFansubGroupMember`, `AdminFansubAnimeEntry`) and
the public shapes `FansubProfileTabs` consumes (`FansubMember`, `AnimeListItem`). The
double-cast through `unknown` is the strongest possible "trust me" assertion: if the field
sets diverge (e.g. `FansubProfileTabs` reads a field present on `FansubMember` but absent on
`HistFansubGroupMember`), the result is `undefined` at runtime with no compile-time warning,
silently degrading the preview. The inline comments acknowledge this is a transitional
hack pending Phase 73, which is reasonable, but it remains a latent runtime risk while it
lives.
**Fix:** Map the admin DTOs to the public types with an explicit adapter that names the
fields actually consumed by `FansubProfileTabs`/`GroupLeaderTimeline`, so a field mismatch
surfaces at compile time rather than as a blank section. If a full adapter is out of scope
until Phase 73, narrow the cast to the specific consumed fields and add a `// TODO(Phase 73)`
that ties the cast removal to the section-component swap (the TODO already exists at
`PublicPreviewPanel.tsx:19-22`; reference it from the cast site).

## Info

### IN-01: `contributions-open` info label uses a confusing inline ternary

**File:** `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx:199-203`
**Issue:** ``label: `Offene Vorschläge: ${animeCount > 0 ? '(pro Projekt verfügbar)' : '0'}` ``
produces either "Offene Vorschläge: (pro Projekt verfügbar)" or "Offene Vorschläge: 0",
which conflates a count with a free-text qualifier and reads awkwardly. `animeCount` is
also the wrong proxy for "offene Vorschläge".
**Fix:** Use a plain static label ("Offene Vorschläge prüfen") consistent with the other
info rows, and let the linked `vorschlaege` tab show the real count.

### IN-02: Duplicate `import type { ... } from '@/types/fansub'` statements

**File:** `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx:23-24` and `PublicPreviewPanel.tsx:7-8`
**Issue:** Both files split `FansubGroup`/`FansubMember` and `HistFansubGroupMember` into
two separate `import type` lines from the same module `@/types/fansub` instead of one
combined statement. Harmless but inconsistent with the merged-import style used elsewhere.
**Fix:** Merge into a single import, e.g.
`import type { FansubGroup, HistFansubGroupMember } from '@/types/fansub'`.

### IN-03: `ReadinessGroupProps` index signature `[key: string]: unknown` weakens prop typing

**File:** `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx:35-45`
**Issue:** The `[key: string]: unknown` catch-all on `ReadinessGroupProps` lets any extra
property pass silently and is what enables the `group as unknown as FansubGroup` cast at
line 148/305 to type-check without complaint. It documents test-fixture convenience but
removes the compiler's ability to catch a misspelled or removed group field.
**Fix:** Drop the index signature and list the fields actually read; for tests, build
fixtures as `FansubGroup` (or a `Partial<FansubGroup>` helper) rather than loosening the
production prop type.

### IN-04: `formatApiError` fallback path is reachable but the success-path types are untested

**File:** `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx:64-67`, `ReadinessTab.test.tsx`
**Issue:** `formatApiError` returns the fallback string for any non-`ApiError`. The test
suite (`ReadinessTab.test.tsx`) mocks all three seams to resolve successfully and asserts
the happy path, capability gating, Lock K, Sprungmarken, and the info badge, but never
exercises a rejected API call, so the error branch (lines 109-118, the `ErrorState` render,
and the "Erneut laden" retry button at line 234) is uncovered. Not a defect in product
code, but the most failure-prone path has no regression guard.
**Fix:** Add a test that rejects one of the three mocked seams (e.g. with the mocked
`ApiError`) and asserts the `ErrorState` title renders and clicking "Erneut laden" re-invokes
the loaders.

---

_Reviewed: 2026-06-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
