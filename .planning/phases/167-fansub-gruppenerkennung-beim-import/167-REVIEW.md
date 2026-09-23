---
phase: 167-fansub-gruppenerkennung-beim-import
reviewed: 2026-09-23T15:26:13Z
depth: deep
files_reviewed: 34
files_reviewed_list:
  - backend/cmd/server/admin_routes.go
  - backend/internal/handlers/admin_content_handler.go
  - backend/internal/handlers/admin_episode_import_fansub_match.go
  - backend/internal/handlers/admin_episode_import.go
  - backend/internal/handlers/fansub_admin.go
  - backend/internal/handlers/fansub_alias_validation.go
  - backend/internal/handlers/fansub_group_aliases.go
  - backend/internal/handlers/fansub_requests.go
  - backend/internal/handlers/phase167_fansub_preview_enrich_test.go
  - backend/internal/handlers/phase167_fansub_reassign_test.go
  - backend/internal/importutil/fansub_group.go
  - backend/internal/importutil/fansub_group_test.go
  - backend/internal/importutil/fansub_release_version.go
  - backend/internal/importutil/fansub_release_version_test.go
  - backend/internal/models/episode_import.go
  - backend/internal/models/fansub_group_match.go
  - backend/internal/repository/episode_import_repository_apply.go
  - backend/internal/repository/episode_import_repository.go
  - backend/internal/repository/episode_import_repository_release_helpers.go
  - backend/internal/repository/fansub_group_match.go
  - backend/internal/repository/fansub_repository.go
  - backend/internal/repository/phase167_fansub_learn_apply_test.go
  - backend/internal/repository/phase167_fansub_match_test.go
  - backend/internal/testsupport/phase167_postgres.go
  - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
  - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts
  - frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.tsx
  - frontend/src/app/admin/changes/ChangeEntryTranslator.ts
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx
  - frontend/src/lib/api.ts
  - frontend/src/types/episodeImport.ts
  - frontend/src/types/fansub.ts
  - shared/contracts/admin-content.yaml
findings:
  critical: 1
  warning: 4
  info: 1
  total: 6
status: issues_found
---

# Phase 167: Code Review Report

**Reviewed:** 2026-09-23T15:26:13Z
**Depth:** deep (cross-file call-chain tracing, plus independent runtime verification of two claims)
**Files Reviewed:** 34 (plus companion test files, CSS modules, and pre-existing call sites read for context but not counted as "changed")
**Status:** issues_found

## Summary

This phase adds filename-based fansub-group detection/auto-selection to the episode
import wizard, an alias-learning write path, and an alias-reassign admin surface,
closing D-01/D-02/D-03. The SQL is sound throughout: both the batch exact-match query
(`fansub_group_match.go`) and the trigram suggestion query bind every candidate via
`$1`/`unnest($1::text[])`, with zero string concatenation, and the batch query's
normalization expression is byte-identical to the production functional index in
`0140_search_foundation.up.sql`. The D-03 core fix is real — `resolveImportFansubSelection`
no longer derives or auto-creates a `fansub_groups` row from a bare filename fallback, and
`grep` confirms no other code path in this phase re-introduces an equivalent auto-create;
the only remaining upsert-from-name path (`upsertImportFansubGroup` in
`episode_import_repository_fansub_helpers.go`) is the pre-existing, explicit
admin-selection path, untouched by this phase, not a filename fallback. The D-02 IDOR
mitigation in `ReassignFansubAlias` is real and load-bearing: both the source-group and
destination-group `CanForFansubGroup` checks are present, and
`phase167_fansub_reassign_test.go` proves the second check actually gates the write (not
just called and ignored) by driving both checks through the real permission-evaluation
path. The race-safety of `maybeLearnFansubGroupAlias` is correctly designed: it re-checks
`resolveFansubGroupMatches` inside the same open apply transaction immediately before
insert, and the actual race-safety guarantee is `INSERT ... ON CONFLICT (normalized_alias)
DO NOTHING RETURNING id` against the real `UNIQUE(normalized_alias)` constraint, not a bare
application-level check-then-act — proven against a real isolated Postgres database in
`phase167_fansub_learn_apply_test.go`. The four new Go test files all execute real code
paths (httptest+fake permission resolver, hand-rolled fakes, or real Postgres) and never
use the forbidden source-inspection pattern. The `admin_episode_import.go`/`page.tsx`
line-count guardrails hold exactly as claimed (777 lines, +2 from the 775-line
pre-phase baseline; `page.tsx` unchanged at 597 lines — both independently verified with
`wc -l` and `git show` against the pre-phase commit, not taken on the SUMMARY's word). The
two new UI component files contain zero native `<button>/<input>/<select>/<textarea>`
elements. No ASCII umlaut substitutions were found in any line actually added by this
phase's diff (several pre-existing files touched by this phase, e.g.
`admin_content_handler.go`, do contain old `ae/oe/ue`-style comments, but none of those
lines were added or modified here). The JSON field names on the Go/TS/OpenAPI
triangle (`fansub_group_match_origin`, `fansub_group_suggestions`, `release_version_source`)
match byte-for-byte. Plan 06's REQ-167-21 finding — that `Naruto_026-027`-style bare-digit
double-episode filenames do not expand to multiple episode numbers — was independently
re-derived by executing the actual regex (`(?i)e(\d{1,4})-(\d{1,4})`) against the real
fixture strings; the SUMMARY's trace holds.

Two real defects were found that the SUMMARYs do not surface. The more serious one is a
functional bug in the brand-new alias-reassign dropdown (`FansubAliasSection.tsx`): its
controlled `<select>` is initialized to a value that is deliberately excluded from its own
option list, which — independently reproduced via a real render in the project's own test
harness — causes the browser to silently select a *different* group than the component's
internal state believes is selected. With only two fansub groups in the system (the exact
fixture the plan's own tests use), this makes the reassign feature impossible to trigger
from a real, non-scripted browser interaction. The second is a false-positive class in the
newly hardened filename parser: the D-07 scene-prefix schema treats the words before the
first hyphen in almost any hyphenated real anime title (`Attack-on-Titan`, `Re-Zero`,
`K-On`, `One-Punch-Man`, ...) as a fansub-group candidate whenever an `sXXeYY` marker is
present anywhere in the filename — verified by executing the actual regex pair, not
inspection alone. Three further quality/robustness gaps are documented below.

## Critical Issues

### CR-01: Reassign-target `<select>` in `FansubAliasSection.tsx` is initialized to a value excluded from its own option list — silently mis-selects, and can make reassignment untriggerable with only two groups

**File:** `frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx:111, 228, 234-250`
**Issue:**
`availableTargetGroups` explicitly excludes the alias's *current* group
(`groups.filter((group) => group.id !== fansubID)`, line 111) — correct, an alias cannot be
reassigned to the group it already belongs to. But the per-row select's controlled value is
initialized to exactly that excluded group:

```tsx
const selectedTarget = reassignTargetByAliasID[row.id] ?? row.fansub_group_id; // line 228
...
<Select value={String(selectedTarget)} ...>
  {availableTargetGroups.map((group) => (
    <option key={group.id} value={String(group.id)}>{group.name}</option>
  ))}
</Select>
```

`selectedTarget` on first render equals `row.fansub_group_id`, which is `fansubID` itself —
but that value has no matching `<option>` in `availableTargetGroups` (it was filtered out
one prop up). A native `<select>` whose `value` prop does not match any child `<option>`
does not stay "unset" — the browser silently falls back to selecting the **first available
option**, while React's own state (`reassignTargetByAliasID`) still believes nothing has
been chosen. This was independently reproduced by rendering the real component with the
project's own fixtures (2 groups, id 10 = current, id 11 = "New-Subs") inside the actual
Vitest/jsdom harness:

```
SELECT.value = "11"
OPTIONS = ["11"]
selectedIndex = 0  selected option value = 11
```

The DOM shows "New-Subs" already selected. The "Umhängen" button's `disabled` check
(`selectedTarget === row.fansub_group_id`, line 254) is computed from React state, not the
DOM, so it correctly stays disabled at this point — but that only makes the bug worse in
the 2-group case: since the *only* available option ("New-Subs") is already the value the
browser is visually displaying, a real user clicking the select and picking the option
that's already shown does not fire a native `change` event (no value transition from the
browser's point of view), so `onChange` never fires, `reassignTargetByAliasID` is never
set, and the button can never become enabled. **With exactly two fansub groups in the
system — the plan's own test fixture's exact scenario — the reassign feature is
untriggerable via a real (non-scripted) browser interaction.** With three or more groups
the feature remains usable but the dropdown still visually misrepresents the pending
selection on every row on first render (shows an arbitrary other group as "selected" when
nothing has actually been chosen yet).

The existing test suite (`FansubAliasSection.test.tsx`) does not catch this because it
drives the select via RTL's `fireEvent.change(select, { target: { value: "11" } })`, which
sets the value directly and unconditionally fires `change` regardless of the DOM's prior
selected value — masking exactly the real-browser behavior described above.

**Fix:** Give the select an explicit "nothing chosen" state that is distinct from any real
group id, e.g.:
```tsx
const selectedTarget = reassignTargetByAliasID[row.id] ?? '';
...
<Select
  value={selectedTarget === '' ? '' : String(selectedTarget)}
  onChange={(event) => setReassignTargetByAliasID((c) => ({ ...c, [row.id]: Number(event.target.value) }))}
>
  <option value="" disabled>Zielgruppe wählen…</option>
  {availableTargetGroups.map((group) => (
    <option key={group.id} value={String(group.id)}>{group.name}</option>
  ))}
</Select>
<Button disabled={!canManage || !selectedTarget} ...>
```
so the initial DOM state genuinely has no group selected, matches React's own state, and
picking the only available option always fires a real `change` event.

## Warnings

### WR-01: D-07 scene-prefix schema false-positives on ordinary hyphenated anime titles

**File:** `backend/internal/importutil/fansub_group.go:13-14, 67-74`
**Issue:**
The new D-07 scene-schema detector fires whenever `sceneEpisodeMarkerPattern`
(`(?i)s\d{1,2}e\d{1,4}`) matches anywhere in the filename, and then
`scenePrefixGroupPattern` (`^[A-Za-z0-9]+-`) greedily treats everything before the first
hyphen from the start of the filename as the group name. This was designed against the
one real scene-release fixture in the measurement table
(`dmpd-mashle.magic.and.muscles.s01e17...`), but the guard has no way to distinguish a real
scene-release prefix from an ordinary hyphenated title. Verified by executing the actual
regex pair against common real anime titles:

```
Attack-on-Titan.S01E01.mkv                                  -> group candidate "Attack"
Re-Zero-Starting-Life-in-Another-World.S01E01.mkv            -> group candidate "Re"
K-On.S01E01.mkv                                               -> group candidate "K"
Non-Non-Biyori.S02E05.mkv                                     -> group candidate "Non"
One-Punch-Man.S01E01.mkv                                      -> group candidate "One"
```

None of these are fansub groups — they are the first word of the title itself. This is not
a hypothetical edge case; hyphenated titles are common in real anime naming, and several of
the examples above are extremely popular series. No test in
`fansub_group_test.go` exercises a hyphenated-title-plus-`sXXeYY` filename, so this
regression class shipped untested. Downstream, this pollutes
`enrichEpisodeImportPreviewFansubData`'s exact-match/suggestion pipeline with a wrong
candidate string for every such filename (best case: a bogus "did you mean" chip or no
match at all; worst case: if a real group happens to normalize-match the false candidate,
e.g. a group literally named "One", it gets auto-selected) and violates this phase's own
explicit honesty principle (D-06: "wenn nichts sicher erkennbar, liefert der Parser leer
statt zu raten").
**Fix:** Require the scene prefix to be followed by evidence the same alphanumeric-hyphen
schema is used title-wide (e.g. no `.`/`_`/space-only separators to that point, or a
minimum bracket/checksum-style token also present), or bound the group candidate to a
short, dictionary-unlikely token length, or simply add a regression test asserting these
five real titles return `""` and un-guess accordingly.

### WR-02: `FansubGroupOriginHint.handleReassign` has no error handling — a failed reassign silently disappears

**File:** `frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.tsx:55-75`
**Issue:**
```tsx
async function handleReassign() {
  ...
  await reassignFansubAlias(origin.group_id, origin.alias_id, { target_fansub_group_id: currentGroupID })
  setReassigned(true)
  ...
}
```
`handleReassign` is wired directly to `onClick` with no `try`/`catch`. If the API call
rejects (409 conflict — another admin already reassigned it, 403 — permission changed
mid-session, 500, network failure), the promise rejection is unhandled: `setReassigned`
never runs, the button silently reverts to its normal clickable state with no error message
shown anywhere. This directly contradicts the project's own Observability constraint
("operational errors must be visible immediately in the UI") and is inconsistent with the
sibling implementation in `FansubAliasSection.tsx:165-173`, which wraps the identical
`reassignFansubAlias` call in `try/catch` and surfaces the failure via `onToast(...)`. No
test exercises the failure path for this component (`FansubGroupOriginHint.test.tsx` only
covers the success case).
**Fix:** Wrap the call in `try/catch`, surface an error message (this component has no
existing toast wiring, so at minimum render an inline error state analogous to `Umgehängt.`
on failure, mirroring the pattern already used one directory over).

### WR-03: New `PATCH /fansubs/:id/aliases/:aliasId/reassign` endpoint is missing from both OpenAPI contracts

**File:** `shared/contracts/openapi.yaml`, `shared/contracts/fansubs.yaml`
**Issue:**
The sibling alias endpoints (`GET/POST /api/v1/fansubs/{id}/aliases`,
`DELETE /api/v1/fansubs/{id}/aliases/{aliasId}`) are documented in both
`openapi.yaml` (lines 3935, 4036) and `fansubs.yaml` (lines 134-174). The new reassign
route registered in `backend/cmd/server/admin_routes.go` and implemented in
`fansub_group_aliases.go` has no corresponding entry in either file — `grep -n "aliases"`
across both contracts shows no `reassign` path or `FansubAliasReassignRequest` schema.
Only `shared/contracts/admin-content.yaml` was updated, and only for the unrelated
episode-import preview fields. This is a real gap in "Contracts are tracked alongside code"
discipline for a newly shipped, permission-sensitive, IDOR-relevant endpoint — anyone
regenerating client code or auditing the API surface from the canonical OpenAPI document
will not see this route at all.
**Fix:** Add `PATCH /api/v1/fansubs/{id}/aliases/{aliasId}/reassign` to `openapi.yaml`
(request body `target_fansub_group_id`, 200/400/404/409 responses matching the handler) and
the equivalent entry to `fansubs.yaml`.

### WR-04: `enrichEpisodeImportPreviewFansubData` is called without the nil-guard the rest of the same function uses for the same field

**File:** `backend/internal/handlers/admin_episode_import.go:88-111`; `backend/internal/handlers/admin_episode_import_fansub_match.go:43-44`
**Issue:**
`PreviewEpisodeImport` guards `h.episodeImportRepo` with an explicit nil-check before using
it for `PreviewExistingCoverage` (line 88: `if h.episodeImportRepo != nil { ... }`), but
three lines later calls
`enrichEpisodeImportPreviewFansubData(c.Request.Context(), h.episodeImportRepo,
preview.Mappings)` (line 111) with no such guard. Inside that function, if any mapping row
has a non-empty `FansubGroupName` candidate,
`matchRepo.ResolveFansubGroupMatches(ctx, candidates)` is called unconditionally
(`admin_episode_import_fansub_match.go:78`). Calling a method on a nil interface value
panics in Go. The function's own doc comment asserts "callers (PreviewEpisodeImport)
always pass a non-nil h.episodeImportRepo" — but this invariant is not actually enforced,
and the codebase's own existing test helper `evecFixtureHandler`
(`admin_content_episode_version_editor_context_test.go:102-110`, reused by five
`PreviewEpisodeImport`-driving tests in `admin_episode_import_ownership_test.go`)
constructs `AdminContentHandler` **without** setting `episodeImportRepo`, leaving it nil.
Those five tests happen not to trigger the panic only because their fake Jellyfin server
always returns an empty `Items` array, so `mediaCandidates`/`candidates` end up empty and
`ResolveFansubGroupMatches` is never reached — but that is incidental to the test fixtures,
not a guarantee. Production wiring in `main.go` always constructs a real
`*repository.EpisodeImportRepository`, so this is not reachable in the live system today —
but it is a real, demonstrable landmine: any future test extension that gives that fixture
handler a filename-bearing Jellyfin item (a very natural thing to do when adding coverage)
will panic, and the invariant the code comment relies on is not actually verified anywhere.
**Fix:** Either guard the call site the same way the nearby `PreviewExistingCoverage` call
already is (`if h.episodeImportRepo != nil { preview.Mappings =
enrichEpisodeImportPreviewFansubData(...) }`), or make `enrichEpisodeImportPreviewFansubData`
itself defensively return `mappings` unchanged when `matchRepo` is nil.

## Info

### IN-01: `learnFansubGroupAliasesForExplicitSelection` can non-deterministically pick which of several explicitly-selected groups "wins" a learned alias for a collaboration release

**File:** `backend/internal/repository/episode_import_repository_release_helpers.go:304-339`
**Issue:**
When a mapping row has more than one explicit existing-group selection (a collaboration
release with two or more `mapping.FansubGroups[i].ID` entries), the loop attempts to learn
the *same* single `deriveFansubGroupName(media)` candidate as an alias for **every** one of
those groups in turn. Because `maybeLearnFansubGroupAlias` re-checks
`resolveFansubGroupMatches` before each insert (inside the same transaction), the first
group in `memberGroups`' sorted order successfully claims the alias and every subsequent
group's attempt is a no-op (the candidate is now "already known" for a different group) —
so no data corruption results, but which of the collaborating groups ends up owning the
learned alias is an accident of `canonicalizeResolvedImportFansubGroups`'s sort order, not
an explicit decision. This is not covered by any test and not mentioned in the SUMMARY.
**Fix:** Either skip alias-learning entirely when a row has more than one explicit group
selection (ambiguous by construction), or document the sort-order-wins behavior explicitly
so it isn't mistaken for a bug later.

---

_Reviewed: 2026-09-23T15:26:13Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
