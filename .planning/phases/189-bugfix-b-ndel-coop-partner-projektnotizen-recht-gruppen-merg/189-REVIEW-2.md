---
phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg
reviewed: 2026-10-20T22:15:00Z
depth: standard
files_reviewed: 27
files_reviewed_list:
  - backend/internal/handlers/episode_version_update.go
  - backend/internal/handlers/fansub_groups.go
  - backend/internal/handlers/phase136_contract_parity_test.go
  - backend/internal/repository/episode_import_repository_apply.go
  - backend/internal/repository/fansub_repository_groups_delete.go
  - backend/internal/repository/fansub_repository_groups_delete_test.go
  - backend/internal/repository/release_version_group_guard_format_test.go
  - backend/internal/repository/release_version_group_guard.go
  - backend/internal/testsupport/phase189_postgres.go
  - frontend/src/app/admin/fansubs/useAdminFansubsList.test.ts
  - frontend/src/app/admin/fansubs/useAdminFansubsList.ts
  - frontend/src/app/anime/[id]/group/[groupId]/page.module.css
  - frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/releases/OtherGroupsChips.test.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/releases/OtherGroupsChips.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/releases/page.module.css
  - frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/releases/ReleaseEpisodeCard.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.test.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.test.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.tsx
  - frontend/src/lib/api/fansubs-groups.test.ts
  - frontend/src/lib/api/fansubs-groups.ts
  - frontend/src/lib/fansub-labels.ts
  - frontend/src/lib/fansubProjectRoutes.test.ts
  - frontend/src/lib/fansubProjectRoutes.ts
  - shared/contracts/admin-capabilities.yaml
  - shared/contracts/fansubs.yaml
  - shared/contracts/openapi.yaml
  - frontend/src/lib/api/episodes.ts (cross-reference, sibling bug-class check)
  - frontend/src/app/admin/fansubs/page.tsx (cross-reference, bulk-delete UI call site)
findings:
  critical: 0
  warning: 5
  info: 1
  total: 6
status: issues_found
---

# Phase 189: Code Review Report (Follow-up Round 2)

**Reviewed:** 2026-10-20T22:15:00Z
**Depth:** standard
**Files Reviewed:** 27 (+2 cross-reference files opened to verify specific review questions)
**Status:** issues_found

## Summary

This is the second review pass for Phase 189, covering the batch of commits made after the
first `189-REVIEW.md` was fixed: the German verb-agreement fix (`GermanHaengenVerb`) for the
fansub-group delete-lock, the `deleteFansubGroup` `ApiError.code` fix, the "Mehr entdecken"
heading fix, and the canonical-URL/icon/CSS live-UAT corrections.

Verified and confirmed correct (no bugs found):
- `GermanHaengenVerb`/`GermanReasonFragment`/`TotalCount` are used identically and correctly
  at all three call sites (`fansub_groups.go`, `episode_version_update.go`,
  `episode_import_repository_apply.go`); Go unit tests for all plural/singular combinations
  pass (`go test ./internal/repository/...`).
- `buildFansubProjectPath` correctly falls back to the technical route for `null`,
  `undefined`, empty-string, and whitespace-only slugs (verified by code reading and the
  existing test suite; all pass).
- `useAdminFansubsList.ts`'s bulk-delete loop does not double-remove rows and does correctly
  name the item that actually failed in the error message (see Warning WR-05 below for a
  related but distinct UX gap).
- `ReleaseEpisodeCard.tsx` uses `ResponsiveImage` exclusively; no raw `next/image` import
  remains (WR-02 from the first review is correctly and completely applied).
- `admin-capabilities.yaml`/`openapi.yaml`/`fansub-capabilities.ts` are in sync for
  `can_edit_project_notes` and the `TestPhase136ContractParity` test path fix; confirmed by
  running the test (`go test ./internal/handlers/... -run TestPhase136ContractParity`), which
  passes.
- `.otherGroupsLabel` in `page.module.css` and `releases/page.module.css` use different CSS
  variable names (`--text-primary` vs. `--color-text-primary`) but these resolve to the same
  value (`globals.css` aliases `--text-primary: var(--color-text-primary)`), so this is not a
  visual bug despite looking like drift at first glance.
- `backend go build ./...` and the full relevant Vitest/Go test subsets pass.

Real defects found below are all Warning-level (text/grammar/documentation quality and one
latent recurrence of the exact bug class this phase exists to fix) — none rise to Critical
(no crash, data loss, or security impact).

## Warnings

### WR-01: Fansub contract still documents the pre-fix (always-plural) verb form

**File:** `shared/contracts/fansubs.yaml:122-127`
**Affects:** Backend/contract documentation (not directly user-visible, but misleads API
consumers and anyone cross-checking the contract against the implementation).

**Issue:** The `fansub-delete` `error_responses` doc for the 409 case still hardcodes:

```
Gruppe hat echte Dependents (D-12): Code
"fansub_group_has_dependents", Nachricht "Diese Gruppe kann nicht
entfernt werden: {GermanReasonFragment} hängen noch daran."
```

This was written during the *first* review round's WR-01 fix (commit `0a1f20889`), **before**
the German verb-agreement fix (`GermanHaengenVerb`, introduced later in commit `1e5d633c4`)
existed. The actual runtime message (`fansub_groups.go` `DeleteFansub`) now varies the verb:
`"... hängt noch daran."` when `TotalCount() == 1`, `"... hängen noch daran."` otherwise. The
contract doc was never updated to reflect this and now documents behavior that is wrong for
the (very common) single-dependent case.

**Fix:** Update the doc string to describe the conditional verb, e.g.:

```yaml
      - status: 409
        description: >-
          Gruppe hat echte Dependents (D-12): Code
          "fansub_group_has_dependents", Nachricht "Diese Gruppe kann nicht
          entfernt werden: {GermanReasonFragment} {hängt|hängen} noch daran."
          (Verb stimmt mit der Gesamtanzahl ueberein: "hängt" bei genau 1
          Element, sonst "hängen" -- siehe GermanHaengenVerb).
```

---

### WR-02: The exact "ApiError loses `code`" bug class recurs in a sibling function (`updateEpisodeVersion`)

**File:** `frontend/src/lib/api/episodes.ts:180-209` (cross-referenced; not in the original
file list, but directly parallel to the fixed `deleteFansubGroup` bug and to
`episode_version_update.go`, which *is* in scope)
**Affects:** Frontend API layer. Currently latent (not yet user-visible), but it is the same
anti-pattern the orchestrator asked to hunt for.

**Issue:** `episode_version_update.go`'s `UpdateEpisodeVersion` handler can return a 409 with
`"code": "release_version_group_has_dependents"` (see `episode_version_update.go:79-91`).
`updateEpisodeVersion` in `episodes.ts` still parses this response with `parseApiError`
(message-only), exactly the bug that `deleteFansubGroup` had before this phase's fix
(`f6fd3f86d`). Today no frontend caller inspects `.code` for this particular conflict, so the
dropped field has no observable effect yet — but the instant any caller wants to special-case
this conflict (the same way `formatDeleteFansubError` does for the fansub-group case), it will
silently fail the same way the original bug did, because `ApiError.code` will always be `null`.

**Fix:** Use `parseApiErrorPayload` + preserve `code`/`details`, mirroring `deleteFansubGroup`:

```typescript
if (!response.ok) {
  const parsed = await parseApiErrorPayload(
    response,
    `API request failed: ${response.status}`,
  );
  throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
}
```

---

### WR-03: Singular/plural grammar bug in the bulk-delete confirmation/success text (user-visible)

**File:** `frontend/src/app/admin/fansubs/useAdminFansubsList.ts:264`, `:281`
**Affects:** Frontend UI (user-visible German text in the admin fansub list).

**Issue:**

```typescript
title: `${selected.length} Fansub-Gruppen wirklich löschen?`,
...
setSuccessMessage(`${selected.length} Fansub-Gruppen gelöscht.`);
```

Both strings always use the plural noun `Fansub-Gruppen`, even when `selected.length === 1`.
This path is reachable in production: `admin/fansubs/page.tsx` shows the bulk-delete button
whenever `selectedIDs.size > 0`, including exactly `1` (a user can tick a single checkbox and
click the bulk "Löschen" button instead of using the per-row delete action). The result is a
grammatically broken dialog/success message ("1 Fansub-Gruppen wirklich löschen?") shipped in
the *same file*, in the *same phase*, whose entire purpose was fixing exactly this class of
singular/plural agreement bug on the backend side (`GermanHaengenVerb`). This one was missed
on the frontend.

**Fix:** Reuse the same singular/plural pattern already established by `germanPluralCount` on
the backend (or a small local helper), e.g.:

```typescript
const noun = selected.length === 1 ? "Fansub-Gruppe" : "Fansub-Gruppen";
title: `${selected.length} ${noun} wirklich löschen?`,
...
const deletedNoun = selected.length === 1 ? "Fansub-Gruppe" : "Fansub-Gruppen";
setSuccessMessage(`${selected.length} ${deletedNoun} gelöscht.`);
```

---

### WR-04: ASCII-umlaut typo in a Go response string, inconsistent with the sibling handler

**File:** `backend/internal/handlers/episode_version_update.go:49`
**Affects:** Backend response string, surfaced verbatim as an error message in the admin UI —
user-visible text, in scope per CLAUDE.md ("Go-Response-Strings" are explicitly covered by the
Umlaut rule).

**Issue:**

```go
writePermissionInternalError(c, permissionErr, "Release-Metadaten-Berechtigung konnte nicht geprueft werden.")
```

`"geprueft"` is the forbidden ASCII substitution for `"geprüft"`. The sibling call in the same
review batch's file set already gets this right:

```go
// fansub_groups.go:283
writePermissionInternalError(c, err, "Fansub-Berechtigung konnte nicht geprüft werden.")
```

This line pre-dates this phase (introduced in commit `0481b671a`), but `episode_version_update.go`
was directly touched by this phase's grammar-fix commits (`1e5d633c4`) and is explicitly in
this review's file list, so it's a real, currently-shippable defect in a reviewed file.

**Fix:**

```go
writePermissionInternalError(c, permissionErr, "Release-Metadaten-Berechtigung konnte nicht geprüft werden.")
```

---

### WR-05: Bulk-delete partial failure communicates incompletely (no correctness bug, but a real UX gap)

**File:** `frontend/src/app/admin/fansubs/useAdminFansubsList.ts:252-294` (`onBulkDelete`)
**Affects:** Frontend UI/UX.

**Issue:** `onBulkDelete` iterates `selected` sequentially with `await deleteFansubGroup(item.id)`
inside a `for` loop. On the first failure (e.g. item 3 of 5 is blocked by the new D-12 lock),
the loop stops; items 1–2 were already deleted, items 4–5 were never attempted. The `catch`
block correctly names the one item that failed (`formatDeleteFansubError(error, failedItem.name)`
— confirmed this part is NOT a bug, the failing item is never silently dropped from the
message), and the `finally` block correctly removes only the truly-deleted rows from `items`
(no double-removal, confirmed by reading the logic and the existing passing test suite).
However:
- No success message is shown for the items that *did* succeed before the failure (the admin
  only sees one error about one group and has to guess how many of their N selected groups
  actually got deleted).
- Items *after* the failure point are silently never attempted at all, with nothing in the UI
  distinguishing "blocked by dependents" from "never even tried because an earlier item failed
  first".

This is not a data-integrity bug (the list refresh via `loadList()` is authoritative), but it
is a real clarity gap for an admin operating on more than 2 selected groups at once.

**Fix (optional, not required for correctness):** Collect all per-item outcomes instead of
aborting the whole batch on the first error, e.g. run each delete independently with
`Promise.allSettled` or a try/catch per iteration, then report a combined summary: "3 von 5
Gruppen gelöscht, 2 nicht (siehe Details)."

## Info

### IN-01: Pre-existing inconsistent JSX indentation in `ProjectPage.tsx`

**File:** `frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx:48-50`
**Issue:** The `releaseBackdropUrl`/`releaseFallbackImageUrl` props on `<ReleasesSection>` are
indented at a different column than their sibling props (`animeID`, `groupID`,
`canonicalProjectPath`), a leftover from an older, unrelated commit (`7d2a1fcb8`, predates
Phase 189). Purely cosmetic, no functional impact, not introduced by this phase's commits —
noted only because the file is in this review's explicit scope.
**Fix:** Re-indent to match sibling props when this block is next touched.

---

_Reviewed: 2026-10-20T22:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
