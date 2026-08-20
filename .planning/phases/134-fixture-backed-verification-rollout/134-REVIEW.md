---
phase: 134-fixture-backed-verification-rollout
reviewed: 2026-08-20T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - backend/internal/migrations/fresh_proof_test.go
  - backend/internal/repository/phase134_verification_matrix_access_test.go
  - backend/internal/repository/phase134_verification_matrix_test.go
  - backend/internal/testsupport/phase134_postgres.go
  - database/migrations/0037_add_release_decomposition_tables.down.sql
  - frontend/next.config.mjs
  - frontend/scripts/capture-phase134-uat-evidence.mjs
  - frontend/src/components/profile/AnimeProjectStage.module.css
  - frontend/src/components/profile/LockedStageArtwork.module.css
  - frontend/src/components/profile/MemberProfileHero.test.tsx
  - frontend/src/components/profile/profile.module.css
  - frontend/src/components/profile/RoleBadgeCard.stages.module.css
  - frontend/src/components/ui/FocalCarousel.module.css
  - frontend/src/components/ui/ResponsiveImage.config.test.ts
  - scripts/fixtures/seed134-story.jpg
  - scripts/member-profile-fixture.manifest.json
  - scripts/phase134-green-gate.sh
  - scripts/provision-phase134-matrix-db.sh
  - scripts/README-manifest.md
  - scripts/README-seed.md
  - scripts/reset-member-profile-fixture.sh
  - scripts/seed-member-profile-fixtures.mjs
  - scripts/verify-protected-assets.mjs
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 134: Code Review Report

**Reviewed:** 2026-08-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

This phase adds the fixture-backed migration fresh/up/down proof, the Phase-134
verification matrix (Go + fixture manifest + provisioning/reset/UAT scripts),
several new/rewritten profile-hero CSS modules, and a scoped "green gate"
shell script meant to gate the milestone on real, non-deferred CI signal.

Most of the work is careful and well-documented (extensive inline rationale
for every non-obvious decision, fail-closed DSN/database-identity guards in
the Go test-support helpers and the destructive reset script, a genuinely
useful bit-identical asset verifier). However, the **`phase134-green-gate.sh`
script — whose entire purpose is to be a trustworthy pass/fail signal — has a
logic gap that lets it report a false "PASS" for the backend Go test and
frontend vitest sections when the underlying test run never actually executes
(compile failure, panic, or vitest start failure produce no matching output
lines and are silently treated as zero failures)**. That is a genuine
correctness defect in a script whose own header comment promises "nothing is
ever silently patched or silently ignored."

Additional, lower-severity findings: a newly-added CSS module
(`RoleBadgeCard.stages.module.css`) redeclares the same selectors many times
with conflicting property values, leaving several rule blocks fully dead and
making the actual computed style hard to reason about; `next.config.mjs`'s
new `configuredApiMediaPatterns()` helper can crash the entire Next.js config
load on a malformed `NEXT_PUBLIC_API_URL`; and a database-name safety check in
`testsupport/phase134_postgres.go` is tautological (checks a constant against
a pattern built from that same constant) and can never fail.

## Critical Issues

### CR-01: `phase134-green-gate.sh` can report a false "PASS" when the backend/frontend test run never executes

**File:** `scripts/phase134-green-gate.sh:196-222` (backend scoped `go test`) and `scripts/phase134-green-gate.sh:261-283` (frontend scoped `vitest run`)

**Issue:** Both sections pipe the test-runner's output through `tee` and then
derive pass/fail *exclusively* from scanning the captured output for
`^--- FAIL: ` (Go) / `^ FAIL ` (vitest) lines:

```bash
docker compose exec -T ... "${BACKEND_SVC}" go test ./internal/repository/... ... \
  -run 'Phase12|Phase13' -count=1 -timeout=300s 2>&1 | tee "${BACKEND_TEST_OUTPUT_FILE}"
# ... no check of the pipeline's exit status anywhere ...
while IFS= read -r line; do
  ...
done < <(grep -E '^--- FAIL: ' "${BACKEND_TEST_OUTPUT_FILE}" || true)
```

Neither section ever inspects `$?`/`${PIPESTATUS[@]}` for the `go test` /
`npx vitest run` command. `set -o pipefail` is enabled but the pipeline's
non-zero status is never read or acted on — it is simply discarded because no
`if`/assignment captures it.

Concretely, this means: a **package that fails to compile** (`go test` prints
`FAIL    <pkg> [build failed]` with no `--- FAIL: TestName` lines), an
**unrecovered panic** in a `TestMain`/setup path, a **`go test -timeout`
kill**, or a **vitest process that fails before any test file runs** (e.g. a
broken import, a config error) — none of these produce output matching the
grep patterns used, so `BACKEND_NEW_FAILURES` / `VITEST_NEW_FAILURES` stay
empty and the summary prints `PASS (deferred-only, see below)` and
`GATE: GREEN (0)`, even though the scoped test suite never actually ran.

This directly contradicts the script's own stated guarantee ("Nothing is ever
silently patched or silently ignored; every deferred failure is printed by
name in the final summary") and defeats the purpose of a green gate: a
genuinely broken build/test run is exactly the case a gate exists to catch,
and this is the one case this implementation cannot detect.

Contrast with the `npm run build` section a few lines below (296-309), which
*does* correctly capture and branch on `BUILD_EXIT=$?` — proving the pattern
was known and simply not applied to the two sections above.

**Fix:** Capture and check the real exit status for both sections, e.g.:

```bash
docker compose exec -T ... "${BACKEND_SVC}" go test ... 2>&1 | tee "${BACKEND_TEST_OUTPUT_FILE}"
BACKEND_TEST_EXIT="${PIPESTATUS[0]}"
...
if [ "${BACKEND_TEST_EXIT}" -ne 0 ] && [ "${#BACKEND_NEW_FAILURES[@]}" -eq 0 ]; then
  # go test failed but produced no matching "--- FAIL:" lines (build failure,
  # panic, timeout) -- treat as a new, unattributable failure so the gate
  # cannot go green silently.
  BACKEND_NEW_FAILURES+=("<unattributed go test failure, exit=${BACKEND_TEST_EXIT}, see full output above>")
fi
```

and the mirror-image change for the vitest section (using `bash`'s
`PIPESTATUS[0]` after the `docker exec ... | tee` pipeline).

## Warnings

### WR-01: `next.config.mjs` can crash the entire Next.js config load on a malformed `NEXT_PUBLIC_API_URL`

**File:** `frontend/next.config.mjs:7-19`

**Issue:** `configuredApiMediaPatterns()` calls `new URL(publicApiURL)`
without any validation or `try/catch`:

```js
function configuredApiMediaPatterns() {
  const publicApiURL = (process.env.NEXT_PUBLIC_API_URL || '').trim()
  if (!publicApiURL) return []

  const mediaOrigin = new URL(publicApiURL)
  ...
}
```

Before this phase, `remotePatterns` was a hardcoded empty array; this phase
introduces a dependency on parsing an operator-controlled environment
variable at config-load time. If `NEXT_PUBLIC_API_URL` is ever set but
malformed (typo, missing scheme, trailing garbage), `new URL()` throws
`TypeError: Invalid URL`, which propagates out of `next.config.mjs` and takes
down the entire dev server / production build — not just image
optimization. This is a new single-point-of-failure introduced by this
change with no operator-facing error message pointing at the actual cause.

**Fix:** Fail with a clear, actionable message (or degrade gracefully),
e.g.:

```js
function configuredApiMediaPatterns() {
  const publicApiURL = (process.env.NEXT_PUBLIC_API_URL || '').trim()
  if (!publicApiURL) return []

  let mediaOrigin
  try {
    mediaOrigin = new URL(publicApiURL)
  } catch (error) {
    throw new Error(`NEXT_PUBLIC_API_URL is set but is not a valid URL ("${publicApiURL}"): ${error.message}`)
  }
  ...
}
```

### WR-02: `RoleBadgeCard.stages.module.css` redeclares the same selectors repeatedly, leaving several rule blocks dead

**File:** `frontend/src/components/profile/RoleBadgeCard.stages.module.css` (new file this phase)

**Issue:** Several selectors are declared multiple times as separate rule
blocks instead of being consolidated, and later blocks silently override
earlier ones property-by-property:

- `.roleProgression` is declared **5 times** (lines 8-18, 35-42, 159-163, plus
  the `padding-top`/`border-top` block and the `::before` block share the
  same selector namespace).
- `.roleStageEarned, .roleStageLocked` (as a combined selector) is declared
  **3 times** (lines 44-60, 62-74, 181-190). The third occurrence
  (`border: 0; background: transparent; box-shadow: none;`) fully overrides
  the `border`/`background` set by the earlier, more specific single-selector
  rules at lines 76-86 (`.roleStageEarned { border: 1px solid ...; background:
  color-mix(...) }` / `.roleStageLocked { border: 1px solid ...; background:
  color-mix(...) }`), making those two rules' `border`/`background`
  declarations permanently dead — they can never be the value that actually
  renders.
- `.roleStageMarker` is declared **twice** (lines 93-101 and 192-198); the
  second block overrides every property the first sets (`width`, `height`,
  `border`, `background`) and adds `box-shadow`, making the first block fully
  dead code.
- Five separate `@media (max-width: 520px) { ... }` blocks (lines 231-239,
  241-257, 259-264, 266-285, 287-316) instead of one consolidated block —
  easy to miss when a future edit needs to touch "the 520px breakpoint" and
  only updates one of the five.

None of this is necessarily a visible rendering bug today (CSS cascade
resolves it deterministically, and the final values appear to reflect a
deliberate "no card styling" redesign per the "Der Ziel-Track ist eine
durchgehende Etappenlinie" comment) — but it is a real maintainability trap:
a future contributor editing the standalone `.roleStageEarned` block at line
76 (the one with the color-mix background) will have zero visible effect
because it is unconditionally overridden ~100 lines later, and the five
duplicate `@media` blocks make it easy to update only part of a breakpoint's
rules.

**Fix:** Consolidate each selector into a single rule block (or, if the
override is intentional per state, make that explicit via a differently-named
class/modifier rather than re-declaring the same selector later in the file),
and merge the five `@media (max-width: 520px)` blocks into one.

### WR-03: `testsupport/phase134_postgres.go` has a tautological, always-true safety check

**File:** `backend/internal/testsupport/phase134_postgres.go:74-76`

**Issue:**

```go
const phase134FreshDBName = "team4s_phase134_migration_fresh"
var phase134FreshDBNamePattern = regexp.MustCompile(`^team4s_phase134_migration_fresh$`)
...
func DropAndCreatePhase134FreshDatabase(t *testing.T, maintPool *pgxpool.Pool) {
	...
	if !phase134FreshDBNamePattern.MatchString(phase134FreshDBName) {
		t.Fatalf("refusing to operate on unsafe database name %q", phase134FreshDBName)
	}
```

`phase134FreshDBNamePattern` is a regex built directly from the literal value
of `phase134FreshDBName`, and both are hardcoded package constants — this
check compares a fixed string against a regex derived from that exact same
fixed string. It can never evaluate to false; the `t.Fatalf` branch is dead
code. This differs from the (legitimate) analogous check a few lines below
for `phase134MatrixDatabasePattern`, which validates an *externally supplied*
value (`config.ConnConfig.Database`, parsed from an env-var DSN) against a
fixed pattern — that one is a real guard. This one gives a false sense of
"defense in depth" for a value that was never at risk of drifting.

**Fix:** Either remove the check (it protects nothing), or restructure the
function to take the target database name as a parameter validated against
the pattern, matching the genuinely protective shape used elsewhere in this
same file for the matrix database.

## Info

### IN-01: `OpenPhase134MatrixPostgres` is dead code

**File:** `backend/internal/testsupport/phase134_postgres.go:131-159`

**Issue:** `OpenPhase134MatrixPostgres` is exported and fully implemented
(DSN validation, fail-closed `t.Fatalf`, live `current_database()`
cross-check — mirroring `OpenPhase134MaintenancePool`), but nothing in the
repository calls it (`grep -rn "OpenPhase134MatrixPostgres"` only matches its
own declaration/doc comment). The Phase-134 verification matrix tests
(`phase134_verification_matrix_access_test.go` /
`phase134_verification_matrix_test.go`) exercise the matrix database
exclusively over HTTP against the temporary backend instance, never through
this pool.

**Fix:** Remove it if it is genuinely unused, or wire it into whichever test
was intended to use it directly against Postgres.

### IN-02: `MemberProfileHero.test.tsx` relies heavily on regex-matching raw CSS/source text instead of rendered behavior

**File:** `frontend/src/components/profile/MemberProfileHero.test.tsx:178-201, 260-268, 574-580, 584-596`

**Issue:** Several tests read `profile.module.css` / `MemberProfileHero.tsx`
as raw text via `readFileSync` and assert on regex matches against source
formatting (exact selector text, exact `grid-template-columns` string,
function-body substrings) rather than actual computed/rendered behavior.
These are brittle: any harmless reformatting of the CSS/source (reordering
declarations, changing whitespace, renaming a helper) can break the test
without any real regression, and conversely a real regression that keeps the
matched substrings intact (e.g. a `.heroPanel` rule with the right *properties*
but different values interleaved) can slip through undetected. This pattern
is pre-existing in the codebase (not introduced by this phase) but this
phase adds more of it.

**Fix:** Where feasible, prefer assertions against actual rendered/computed
styles (e.g. `getComputedStyle` in jsdom, or component-level behavioral
assertions) over string-matching source files; keep source-text assertions
only for things that genuinely can't be observed behaviorally (e.g. proving
a forbidden identifier is entirely absent from a function body).

---

_Reviewed: 2026-08-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
