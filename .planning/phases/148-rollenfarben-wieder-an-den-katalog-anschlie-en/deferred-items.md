# Deferred Items — Phase 148

## Pre-existing, out-of-scope `tsc --noEmit` failure

- **Found during:** Plan 01, verification step (`npx tsc --noEmit` inside the frontend container)
- **File:** `.next/dev/types/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.ts` (generated
  Next.js route-type file, mirroring `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx`)
- **Error:** `TS2344: Type 'Props' does not satisfy the constraint 'PageProps'` — the route's
  `params` prop type is `{ id, groupId, releaseVersionId } | Promise<...>` instead of the
  Next.js-15+ expected `Promise<any> | undefined`.
- **Why out of scope:** Not touched by any Plan 01 task/file list, not caused by any commit in this
  plan (`git diff` against the pre-plan-01 HEAD shows zero changes under `frontend/src/app/anime/`).
  Pre-existing generated-type drift unrelated to the role-color restoration work.
- **Action:** Not fixed, per SCOPE BOUNDARY rule. Left for a future dedicated Next.js route-type
  cleanup pass.

## Pre-existing, out-of-scope undefined `--surface-muted` custom property

- **Found during:** Plan 02, Task 2 (extending `roleCatalog.accessibility.test.ts`)
- **File:** `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/project.module.css`
  (`.roleDetailRow { background: var(--surface-muted); }`, also used 5x in
  `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.module.css`)
- **Issue:** `--surface-muted` is referenced but never defined anywhere in
  `frontend/src/styles/globals.css` or any other stylesheet (confirmed via repo-wide grep). A
  `var()` reference to an undefined custom property with no fallback makes the `background`
  declaration invalid at computed-value time, so the actual rendered background is whatever
  ambient surface sits behind the element (not a deliberate design choice).
- **Why out of scope:** Not touched by any Plan 02 file (`project.module.css` and
  `GroupMediaReviewSection.module.css` are not in Plan 02's `files_modified` list); pre-existing
  drift unrelated to the `--role-accent` restoration work. The new `roleCatalog.accessibility.test.ts`
  contrast proof for `/me/projects`' role-row `border-inline-start` indicator approximates the row's
  "own background" as `--surface-card` (the closest resolvable, concrete ambient surface) since
  `--surface-muted` itself cannot be resolved to a hex.
- **Action:** Not fixed, per SCOPE BOUNDARY rule. Left for a future pass that defines
  `--surface-muted` in `globals.css` (or replaces its two call sites with an existing token, e.g.
  `--surface-card-muted`).

## Major finding: several restored --role-accent formulas fail their locked WCAG threshold

- **Found during:** Plan 02, Task 2 (extending `roleCatalog.accessibility.test.ts` with real,
  regex-extracted contrast proofs per the UI-SPEC's "Contrast Requirements" table)
- **Formulas that measurably fail, for every one of the 15 catalog hexes:**
  - `PublicNoteCard.module.css` `.head`/`.role` (55%/38% ratio pair): every hex lands between
    ~4.01:1 and ~4.37:1, consistently short of the 4.5:1 AA text floor.
  - `ProjectMemberPage.module.css`, `ProjectMemberReleasesSection.module.css`,
    `MemberCurrentProjectsSection.module.css` `.roleChip`/`.roleTag` borders
    (`color-mix(role-accent 32-34%, transparent)`, alpha-composited over the chip's own tinted
    background): 0:15 pass 3:1 for any catalog hex, for all three files.
  - `RoleBadgeCard.stages.module.css` (4 formulas: 42%/36%/30%/32% mixes with `--border-subtle`)
    and `MemberBadgeChain.module.css` (1 formula: 32%) composited over `--surface-card`: 0:15 pass
    3:1 for any catalog hex, for all 5 formulas.
- **Formulas that fail for 1-2 specific hexes only** (`#c26a2e`, sometimes also `#6b7f2a`):
  `PublicNoteCard` stripe vs `--color-border` (secondary adjacency only; passes vs `--surface-card`);
  `ProjectMemberPage .roleChip` text; `FansubEdit` unselected/selected role-toggle (the UI-SPEC's
  own predicted "highest-risk row" — confirmed); `FansubEdit` historical-role label.
- **Why out of scope for Plan 02:** Every one of these ratios is the Restoration Rule's locked,
  pre-existing formula (unchanged percentages, exactly as authored before the regression); fixing
  any of them means changing a mix ratio or mix target, which is a formula change outside both
  Task 1's file list (globals.css + 3 simple modules only) and Task 2's file list (test file only).
  The UI-SPEC pre-authorizes a formula fix only for the FansubEdit toggle row specifically; the
  other newly-discovered gaps (PublicNoteCard `.head`/`.role`, the three chip borders, all 5
  RoleBadgeCard.stages/MemberBadgeChain border/box-shadow mixes) have no such pre-authorization.
- **Action:** Not fixed. `roleCatalog.accessibility.test.ts` asserts the exact, currently measured
  failing-hex set per formula as an honest "known gap" regression guard (never silently forced to
  pass) — see `148-02-SUMMARY.md` "Deviations" for the full write-up. This needs a follow-up
  design/plan decision: either accept the visual-parity restoration as sufficient (matching the
  pre-regression, also-non-compliant state) or add a new remediation plan that raises these mix
  percentages (a locked-hex-preserving formula change, same pattern UI-SPEC pre-authorized for
  the FansubEdit row).

## Pre-existing, out-of-scope stale `data-role-code` expectation in `src/app/members/[slug]/page.test.tsx`

- **Found during:** Plan 05, Task 2 full-suite regression run (`npx vitest run`)
- **File:** `frontend/src/app/members/[slug]/page.test.tsx`, line 471
  (`expect(...).getAttribute('data-role-code')).toBe('other')` for an unmatched `future_role` fixture)
- **Issue:** Plan 01 changed `data-role-code` behavior so an unmatched role code now carries the raw
  fallback value verbatim (e.g. `'future_role'`) instead of a synthesized `'other'` category string
  (148-01-SUMMARY.md "Decisions Made"), and updated three touched test files accordingly — but this
  fourth file with the identical `future_role` -> `'other'` assertion pattern was not caught/updated
  in that pass, so it now fails: expected `'other'`, received `'future_role'`.
- **Why out of scope for Plan 05:** Not in Plan 05's `files_modified` list; not caused by any Task 1/2
  commit in this plan (`git diff` against the pre-Plan-05 HEAD shows zero changes to
  `src/app/members/[slug]/page.tsx` or `page.test.tsx`); the stale expectation predates this plan and
  stems entirely from Plan 01's `data-role-code` semantics change.
- **Action:** Not fixed, per SCOPE BOUNDARY rule. The one-line fix is updating the assertion's expected
  value from `'other'` to `'future_role'` to match Plan 01's already-decided, already-shipped behavior
  — left for a follow-up pass (or Plan 01's own closing review) rather than touching an out-of-list file
  in Plan 05.
