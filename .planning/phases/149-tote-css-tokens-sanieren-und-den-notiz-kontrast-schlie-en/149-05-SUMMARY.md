---
phase: 149-tote-css-tokens-sanieren-und-den-notiz-kontrast-schlie-en
plan: 05
subsystem: testing
tags: [css-custom-properties, design-tokens, regression-guard, vitest, static-analysis]

# Dependency graph
requires:
  - phase: 149-01, 149-02, 149-03 (Block A dead-token remediation)
    provides: the 39/39 fixed fallback-free dead-token occurrences this plan's real-tree assertion proves are exactly empty
provides:
  - "extractDefinedProperties(), extractVarUsages(), findDeadReferences() pure scanner functions (frontend/src/lib/cssCustomProperties.ts) with no file I/O"
  - "A permanent regression guard (frontend/src/lib/cssCustomProperties.guard.test.ts) in the regular vitest suite: synthetic-fixture unit tests proving scanner correctness (dead/literal-fallback/nested-fallback-dead/defined/nested-fallback-defined cases) plus a real-tree integration test asserting frontend/src has zero fallback-free dead references"
  - "A live, captured negative proof (this SUMMARY) demonstrating the guard actually fails with token/file/line when a real dead reference is reintroduced"
affects: [149-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure static-analysis scanner functions (no fs calls inside the scanner module) take a pre-read Map<filename, contents> so both synthetic in-memory fixtures and a real fs.readdirSync tree-walk can share identical detection logic."
    - "Nested var() fallback detection via an explicit two-alternative regex (nested-shape tried first, plain/literal-fallback shape second) instead of a single generic non-greedy fallback capture, which cannot correctly balance one level of parenthesis nesting."
    - "Self-referential-scan hygiene: a static-analysis test that reads its own source tree must exclude its own fixture file (by exact basename) and must avoid writing its own detection-pattern syntax literally in prose comments, since both would otherwise appear as spurious matches when the real-tree scan reads the tool's own file."

key-files:
  created:
    - frontend/src/lib/cssCustomProperties.ts
    - frontend/src/lib/cssCustomProperties.guard.test.ts
  modified: []

key-decisions:
  - "extractVarUsages uses two alternative regex branches (nested-var-fallback matched explicitly first, plain/literal-fallback second) rather than one generic non-greedy fallback capture, because a single '.+?' capture stops at the first upcoming close-paren -- which for 'var(--c, var(--d))' is the INNER var's own closing paren, one character too early, leaving the outer paren dangling and the fallback wrongly captured as 'var(--d' (missing its own close-paren). Verified by direct Node regex trace during Task 1's RED->GREEN cycle."
  - "The real-tree walk excludes cssCustomProperties.guard.test.ts by exact basename: its own synthetic fixtures contain fake token names (--a, --b, --c, --d, --e, --already-defined, etc.) as plain string literals, which are real .ts source text under frontend/src and would otherwise be 'discovered' as fake dead/defined references, corrupting the real-tree assertions with self-referential noise."
  - "cssCustomProperties.ts's own prose comments never spell out a literal var(--x)-shaped example, for the same self-referential reason -- the real-tree scan reads this file's own source too, and a literal example in a comment matches the same usage-scanning regex as real code."
  - "A narrow, explicit, size-locked allow-list (KNOWN_NON_CSS_TEXTUAL_MENTIONS) excludes exactly one pre-existing false positive: a Phase-148-authored it()-title string in roleCatalog.accessibility.test.ts:284 that mentions 'var(--surface-muted)' as prose describing now-stale, deferred debt (deferred-items.md), not an executable var() call. This file/describe-block is explicitly locked from editing by 149-UI-SPEC.md ('do not touch any other describe/it block in this file'), so the false positive could not be fixed at the source and is instead documented and excluded by exact (file, line, name) tuple. A companion test asserts the allow-list never silently grows (rawDead.length - dead.length must equal exactly 1), so a genuinely new dead reference in the same file would still fail the suite."

patterns-established:
  - "Static-analysis guard tests reading their own repo tree must (a) exclude their own fixture-bearing test file by basename and (b) avoid literal instances of their own detection syntax in prose, to prevent self-referential false positives."

requirements-completed: []

# Metrics
duration: ~25min
completed: 2026-09-06
---

# Phase 149 Plan 05: CSS Custom-Property Dead-Reference Guard Test Summary

**Built a permanent vitest regression guard (`cssCustomProperties.ts` scanner + `cssCustomProperties.guard.test.ts`) that fails with token/file/line the moment a fallback-free reference to an undefined CSS custom property is introduced anywhere under `frontend/src`, proven both by synthetic fixtures and by a real, captured failure when a dead reference was temporarily reintroduced into `Breadcrumbs.module.css`.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-06T06:58:00Z (approx)
- **Completed:** 2026-09-06T07:09:00Z
- **Tasks:** 2/2 completed
- **Files modified:** 2 (both created)

## Accomplishments
- `extractDefinedProperties`, `extractVarUsages`, `findDeadReferences` pure scanner functions exported from `frontend/src/lib/cssCustomProperties.ts`, with zero `fs` calls inside the module (callers pass in an already-read `Map<filename, contents>`).
- 5 synthetic-fixture tests proving: no-fallback dead reference flagged; literal-fallback protects even when the token itself is undefined; one-level nested `var()` fallback to an undefined token flagged (the `Breadcrumbs.module.css` class of bug); a defined no-fallback reference is never flagged; a nested-fallback reference resolving to a defined token is never flagged.
- A real-tree `describe` block walks every `.css`/`.ts`/`.tsx` file under `frontend/src` (excluding the guard test's own fixture file) and asserts `findDeadReferences` returns exactly `[]` — proving ROADMAP Success Criterion 1 (the fixed tree is genuinely clean) with a real, non-mocked scan.
- A positive assertion proves 5 representative known-safe fallback-protected usages (`--color-text-muted`, `--color-text`, `--color-surface`, `--breadcrumb-separator-color`, `--group-nav-bg`) are found by the usage scanner but never flagged as dead — proving Success Criterion 4.
- **Mandatory real (non-fixture) negative proof performed and captured** (see below): a genuine dead reference was temporarily reintroduced into `Breadcrumbs.module.css`, the guard test failed naming the exact token/file/line, the change was fully reverted, and the guard was re-confirmed green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the scanner's pure functions against synthetic fixtures** - `d74dd070` (test, tdd: RED confirmed with module temporarily removed, then GREEN)
2. **Task 2: Wire the scanner against the real frontend/src tree and assert the fixed tree is clean** - `3878217f` (test)

**Plan metadata:** (this commit, to follow)

## Files Created/Modified
- `frontend/src/lib/cssCustomProperties.ts` - Pure scanner: `extractDefinedProperties` (CSS declaration-position regex for `.css` files + quoted-key regex for TSX/TS inline-style object keys), `extractVarUsages` (two-alternative regex resolving one level of nested `var()` fallbacks correctly, per-line 1-based numbering), `findDeadReferences` (dead-reference rule per the plan's `<interfaces>` contract).
- `frontend/src/lib/cssCustomProperties.guard.test.ts` - Two `describe` blocks: synthetic-fixture unit tests (Task 1) and a real-frontend/src-tree integration test (Task 2), including the documented, size-locked known-non-CSS-textual-mention allow-list.

## Decisions Made

See `key-decisions` in frontmatter for the four substantive decisions (the two-alternative nested-fallback regex design, the guard-test self-exclusion, the comment-wording self-exclusion, and the one documented pre-existing-false-positive allow-list entry). All four were necessary to make the real-tree assertion both correct and non-flaky; none change the scanner's documented public contract from the plan's `<interfaces>` section.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Naive non-greedy fallback-capture regex mis-parsed nested `var()` fallbacks**
- **Found during:** Task 1, GREEN phase (first implementation attempt)
- **Issue:** A single `/var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*(.+?))?\s*\)/g` regex, when applied to `var(--c, var(--d))`, captured the fallback group as `"var(--d"` (missing its own closing paren) because the non-greedy `.+?` stops as soon as it sees ANY upcoming `)` -- which is the inner `var()`'s own closing paren, one character too early. This broke both `extractVarUsages`'s `fallbackVarName` capture and, downstream, `findDeadReferences`'s nested-fallback dead-reference detection (the exact Breadcrumbs class of bug the guard exists to catch).
- **Fix:** Replaced the single generic-capture regex with two explicit alternatives: a nested-var-fallback shape (`var(--name, var(--fallbackName))`) tried first, and a plain/literal-fallback shape second. This avoids parenthesis-balancing entirely by matching the nested shape as one fixed structural pattern instead of trying to bound a variable-length capture with lookahead on a stray close-paren.
- **Files modified:** `frontend/src/lib/cssCustomProperties.ts`
- **Verification:** All 5 synthetic-fixture tests pass, including the nested-fallback-dead and nested-fallback-defined cases; confirmed via a standalone Node regex trace during debugging that isolated the exact off-by-one-paren failure mode.
- **Committed in:** `d74dd070` (Task 1 commit)

**2. [Rule 1 - Bug] Guard test's own fixture strings and scanner's own prose comments self-contaminated the real-tree scan**
- **Found during:** Task 2, first real-tree run
- **Issue:** The real-tree scan reads every `.ts`/`.tsx` file under `frontend/src`, which includes both the guard test file itself (whose synthetic fixtures contain fake token strings like `'color: var(--a);'`) and `cssCustomProperties.ts`'s own prose comments (which originally spelled out literal examples like `"var(--c, var(--d))"`). Both were picked up by the naive text-based `var()`-usage regex as if they were real code, producing spurious dead-reference entries (`--a`, `--c` from the test file; `--name`, `--other-name`, `--c` from the scanner's own comments).
- **Fix:** (a) Excluded the guard test file itself from the real-tree walk by exact basename, with a documented rationale. (b) Reworded `cssCustomProperties.ts`'s prose comments to describe the algorithm without ever writing a literal `var(--x)`-shaped example.
- **Files modified:** `frontend/src/lib/cssCustomProperties.guard.test.ts`, `frontend/src/lib/cssCustomProperties.ts`
- **Verification:** Re-ran the real-tree test after each fix; the spurious entries from these two sources disappeared from the failure list.
- **Committed in:** `3878217f` (Task 2 commit)

**3. [Rule 4-adjacent, resolved without architectural change] One pre-existing false positive is locked from editing by 149-UI-SPEC.md**
- **Found during:** Task 2, real-tree run (after fix 2 above, one entry remained: `--surface-muted` at `roleCatalog.accessibility.test.ts:284`)
- **Issue:** That line's `it()` title is prose (`"...the row itself sets background: var(--surface-muted), an undefined token pre-existing and out of this plan's scope - see deferred-items.md"`), authored in Phase 148 (`commit 281182d1`), describing a background declaration in `app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx` that no longer exists in that file (confirmed via grep -- the described real CSS is gone; the title text is now stale documentation). This `describe`/`it` block is explicitly locked from any edit by `149-UI-SPEC.md`: "Do not touch any other describe/it block in this file... the RoleBadgeCard.stages/MemberBadgeChain non-text-indicator suite... all stay exactly as Phase 148 left them."
- **Resolution (not a plan deviation requiring a new architecture, but flagged per Rule 4's spirit since it touches a locked file):** Rather than edit the locked test title (forbidden) or silently ignore the false positive (would make the guard test wrong), added one explicit, narrowly-scoped, fully-documented allow-list entry (`KNOWN_NON_CSS_TEXTUAL_MENTIONS`) keyed by exact `(file, line, name)`, with an accompanying test asserting the allow-list's size never silently grows. This is the same category of solution the plan itself specified for genuinely fallback-protected tokens (a documented "known-safe" list), applied here to a documented "known non-CSS textual artifact" instead.
- **Files modified:** `frontend/src/lib/cssCustomProperties.guard.test.ts` only (the locked file, `roleCatalog.accessibility.test.ts`, was NOT touched)
- **Verification:** Full guard-test file green (8/8); the allow-list-size test would fail if this or any other silent exclusion were added later without updating the documented list.
- **Committed in:** `3878217f` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs found during TDD/integration, 1 documented locked-file allow-list entry). No scope creep -- all three were necessary for the guard test to be both correct and genuinely green on the real, already-fixed tree; none change the scanner's public contract or touch any file outside this plan's declared `files_modified`.

## Mandatory Real (Non-Fixture) Negative Proof

Per the execution instructions, a genuine (non-fixture) fallback-less-class dead reference was temporarily reintroduced into a real, already-fixed file — `frontend/src/components/navigation/Breadcrumbs.module.css:41` was reverted from its Plan-149-02-fixed form back to its original two-level dead-reference form:

```diff
- color: var(--breadcrumb-separator-color, var(--text-faint));
+ color: var(--breadcrumb-separator-color, var(--color-text-tertiary));
```

(`--color-text-tertiary` is one of this phase's 13 dead tokens and remains undefined anywhere in the codebase after Block A's fixes — this exactly recreates the original bug Plan 149-02 closed.)

**Guard test run against this real, temporarily-reintroduced defect** (`npx vitest run src/lib/cssCustomProperties.guard.test.ts` inside `team4sv30-frontend`), literal captured output:

```
 RUN  v3.2.4 /app

 ❯ src/lib/cssCustomProperties.guard.test.ts (8 tests | 2 failed) 13ms
   ✓ cssCustomProperties scanner (synthetic fixtures) > extractDefinedProperties finds :root, scoped-selector, and TSX inline-style definitions 1ms
   ✓ cssCustomProperties scanner (synthetic fixtures) > extractVarUsages captures name, 1-based line number, hasFallback, and fallbackVarName per usage 2ms
   ✓ cssCustomProperties scanner (synthetic fixtures) > findDeadReferences flags a no-fallback undefined reference and a nested-fallback-to-undefined reference (Breadcrumbs class of bug), but not a defined reference or a literal-fallback-protected reference 0ms
   ✓ cssCustomProperties scanner (synthetic fixtures) > does not flag a no-fallback reference whose name IS in the defined set (positive path) 0ms
   ✓ cssCustomProperties scanner (synthetic fixtures) > does not flag a nested-fallback var() reference whose target IS in the defined set (resolving nested fallback) 0ms
   × cssCustomProperties scanner (real frontend/src tree) > finds zero fallback-free dead custom-property references on the real, fixed tree (Success Criterion 1) 7ms
     → Dead custom-property references found:
--breadcrumb-separator-color at components/navigation/Breadcrumbs.module.css:41 (nested fallback --color-text-tertiary undefined): expected [ { …(5) } ] to deeply equal []
   ✓ cssCustomProperties scanner (real frontend/src tree) > the known-non-CSS-textual-mentions allow-list stays exactly as small as documented (no silent growth) 0ms
   × cssCustomProperties scanner (real frontend/src tree) > does not flag a representative sample of known-safe fallback-protected usages (Success Criterion 4) 2ms
     → --breadcrumb-separator-color in components/navigation/Breadcrumbs.module.css must not be flagged as dead (it is fallback-protected): expected [ { …(5) } ] to deeply equal []

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/lib/cssCustomProperties.guard.test.ts > cssCustomProperties scanner (real frontend/src tree) > finds zero fallback-free dead custom-property references on the real, fixed tree (Success Criterion 1)
AssertionError: Dead custom-property references found:
--breadcrumb-separator-color at components/navigation/Breadcrumbs.module.css:41 (nested fallback --color-text-tertiary undefined): expected [ { …(5) } ] to deeply equal []

- Expected
+ Received

- []
+ [
+   {
+     "fallbackVarName": "--color-text-tertiary",
+     "file": "components/navigation/Breadcrumbs.module.css",
+     "hasFallback": true,
+     "line": 41,
+     "name": "--breadcrumb-separator-color",
+   },
+ ]

 ❯ src/lib/cssCustomProperties.guard.test.ts:138:72

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  src/lib/cssCustomProperties.guard.test.ts > cssCustomProperties scanner (real frontend/src tree) > does not flag a representative sample of known-safe fallback-protected usages (Success Criterion 4)
AssertionError: --breadcrumb-separator-color in components/navigation/Breadcrumbs.module.css must not be flagged as dead (it is fallback-protected): expected [ { …(5) } ] to deeply equal []

- Expected
+ Received

- []
+ [
+   {
+     "fallbackVarName": "--color-text-tertiary",
+     "file": "components/navigation/Breadcrumbs.module.css",
+     "hasFallback": true,
+     "line": 41,
+     "name": "--breadcrumb-separator-color",
+   },
+ ]

 ❯ src/lib/cssCustomProperties.guard.test.ts:159:114

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

 Test Files  1 failed (1)
      Tests  2 failed | 6 passed (8)
   Start at  07:08:40
   Duration  434ms (transform 50ms, setup 75ms, collect 176ms, tests 13ms, environment 0ms, prepare 55ms)
```

This is real, unedited command output (only the trailing per-file summary lines from the terminal box-drawing were trimmed for readability) — the guard correctly named the exact token (`--breadcrumb-separator-color`'s nested fallback `--color-text-tertiary`), file (`components/navigation/Breadcrumbs.module.css`), and line (`41`).

**Revert and re-confirmation:**

```bash
$ git diff frontend/src/components/navigation/Breadcrumbs.module.css
# (showed the one-line diff above)
$ git checkout -- frontend/src/components/navigation/Breadcrumbs.module.css
$ git status --short frontend/
# (no output -- working tree byte-identical to before the proof)
$ git diff --stat
# (no output)
```

Guard test re-run after the revert, confirmed green again:

```
 RUN  v3.2.4 /app

 ✓ src/lib/cssCustomProperties.guard.test.ts (8 tests) 6ms

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

## Issues Encountered

None beyond the three items documented under "Deviations from Plan" above (all resolved within this plan's scope, no unresolved blockers).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ROADMAP Phase 149 Success Criteria 1, 3, and 4 are all true and automatically enforced going forward: the guard test exists in the regular `vitest` suite (`npm test` / `npx vitest run` picks it up via the existing `src/**/*.test.ts` glob, no config change needed), fails naming token/file/line on a reintroduced dead reference (proven live above, not just asserted), treats fallback'd references as legitimate with a positive real-tree proof, and is green against the real, already-fixed tree.
- No new npm dependency introduced (Node built-in `fs`/`path` only), matching the plan's threat-model disposition.
- Plan 149-06 (the phase's remaining live-UAT plan, Success Criteria 5-7) is unblocked.

---
*Phase: 149-tote-css-tokens-sanieren-und-den-notiz-kontrast-schlie-en*
*Completed: 2026-09-06*

## Self-Check: PASSED

- `frontend/src/lib/cssCustomProperties.ts` — FOUND
- `frontend/src/lib/cssCustomProperties.guard.test.ts` — FOUND
- Commit `d74dd070` — FOUND in `git log --oneline --all`
- Commit `3878217f` — FOUND in `git log --oneline --all`
- Working tree confirmed clean of the temporary proof change (`git diff --stat` empty) before this commit.

## Reconciliation: ROADMAP's "78 references" vs. 149-UI-SPEC.md's corrected "39"

The orchestrator investigated this discrepancy directly against the pre-phase baseline
(commit `aa9256f5`, immediately before any Phase 149 execution), independently of both
prior figures, using an exact-token-boundary `git grep` (`var(--TOKEN` followed by `,`,
whitespace, or `)` — not a bare substring match, which would falsely count e.g.
`--color-text-primary` as a hit for `--color-text`):

| Token | Total `var(--TOKEN...)` occurrences (any form) | Fallback-free (`var(--TOKEN)` only) |
|---|---|---|
| `--color-text-muted` | 22 | 4 |
| `--color-text` | 15 | 3 |
| `--color-surface` | 12 | 6 |
| `--surface-muted` | 8 | 8 (see note) |
| `--accent` | 5 | 5 |
| `--color-text-tertiary` | 4 | 4 |
| `--color-info` | 3 | 3 |
| `--success` | 2 | 2 |
| `--accent-primary-strong` | 2 | 2 |
| `--border-default` | 1 | 1 |
| `--border-soft` | 1 | 1 |
| `--radius` | 1 | 1 |
| **Subtotal (12 tokens)** | **76** | **40** |
| `--tag-` (2 template-string hits in `app/dev/ui-system/page.tsx:217`) | +2 | — |
| **Total** | **78** | **40 (39 real)** |

**76 + 2 = 78 — an exact match to the ROADMAP's original figure.** This proves the
ROADMAP's "78" was the raw count of every textual `var(--TOKEN...)` occurrence for these
13 names, **without checking whether each occurrence actually carried a fallback
argument** — it counted fallback-protected and fallback-free occurrences identically, plus
the 2 `--tag-` template-string hits, which don't even match real `var()` syntax (they're
runtime string interpolation over already-defined concrete tokens like `--tag-gallery-bg`).

The `--surface-muted` row needs one further correction: of its 8 occurrences, 7 are real
CSS declarations and the 8th is a **test-description string literal** in
`roleCatalog.accessibility.test.ts:288` that mentions `var(--surface-muted)` in prose
while documenting a separate, unrelated known gap — not an actual code reference. Removing
that false match brings the true fallback-free defect count to **39**, exactly matching
`149-UI-SPEC.md`'s corrected table.

**Which number is authoritative:** neither 78 nor 39 needs to be trusted on its own. This
plan's guard test (`cssCustomProperties.guard.test.ts`) performs a full, token-list-agnostic
scan of every `.css`/`.ts`/`.tsx` file under `frontend/src` for fallback-free references to
*any* undefined custom property — not just the pre-identified 13 — and asserts the
resulting dead-reference set is empty against the real, already-fixed tree (Plans 149-01
through 149-03 landed first). That assertion passed. This is direct, unbiased proof that
ROADMAP Success Criterion 1 is met: no additional "missing Stellen" beyond the 39 exist,
and none were needed.
