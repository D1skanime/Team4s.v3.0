# Phase 186: Episoden-Import nachschärfen (Paket A aus UX-Abgleich) - Pattern Map

**Mapped:** 2026-10-18
**Files analyzed:** 8 (2 backend content files + 1 backend test file + 5 frontend files, per D-01..D-04)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/handlers/admin_episode_import.go` | handler (to be split first, D-04) | request-response | split precedent: `backend/internal/migrations/runner.go` → `migrations_dir.go` + `migration_file_loader.go` (commit `e1774a6da`); same-package sibling precedent: `admin_episode_import_fansub_match.go` | exact (split process), exact (sibling-file convention) |
| new file, e.g. `backend/internal/services/release_filename_parser.go` (interface + anitogo impl) | service (interface + concrete impl wrapping external library) | transform | `backend/internal/services/mailer.go` (`Mailer` interface, `SMTPMailer`/`NoopMailer` impls) | exact |
| `backend/internal/handlers/admin_episode_import_test.go` | test (handler-level integration + new parser unit tests) | request-response / transform | existing tests in same file (`TestPreviewEpisodeImport_FallsBackToFilenameEpisodeWhenJellyfinIndexIsMissing`); table-driven unit style: `backend/internal/importutil/fansub_release_version_test.go` | exact |
| `frontend/.../episodeImportMapping.ts` (new `applyGroupFromHere`) | utility (pure function, row-array transform) | transform | sibling function in same file: `applyFansubGroupFromEpisodeDown` (lines 267-279) | exact |
| `frontend/.../episodeImportMapping.test.ts` (new tests + rewritten "ab hier" test) | test (pure logic test, vitest) | transform | existing test block `"applyFansubGroupFromEpisodeDown patches only the current episode and later groups"` (lines 586-630) | exact |
| `frontend/.../useEpisodeImportBuilder.ts` (wiring, D-01) | hook (state-update wiring) | event-driven | existing wiring line for `applyFansubGroupFromEpisode` (line 334) in the same file | exact |
| `frontend/.../page.tsx` (button label + 3x native→`Button` migration, D-02) | component (page header controls) | request-response (UI action dispatch) | `frontend/src/components/anime/ReleaseVersionBreakdown.tsx` (native `<button>` → `Button` migration, commit `04691f5b8`) | exact |
| `frontend/.../EpisodeImportMappingRow.tsx` (label-only change, D-02) | component (row action button) | request-response (UI action dispatch) | already uses `Button` correctly — see its own current code | exact (no migration needed, text-only) |
| `frontend/.../EpisodeImportMappingRowGroupField.tsx` (wiring for rewritten "ab hier", D-01) | component (row group-chip controls) | event-driven | existing `onApplyFansubGroupFromEpisode` button wiring (lines 193-216) in the same file | exact |

## Pattern Assignments

### Backend: `ReleaseFilenameParser` interface + anitogo-backed implementation (D-03)

**Analog:** `backend/internal/services/mailer.go` (lines 1-56, 228-239)

This is the established project convention for "small interface + one swappable concrete
implementation wrapping an external capability, with a Noop/fake double for tests":

**Interface + config + constructor pattern** (`mailer.go:25-56`):
```go
// Mailer ist die Schnittstelle für den Mailversand.
// Eine Noop-Implementierung wird für Tests bereitgestellt.
type Mailer interface {
	Send(ctx context.Context, msg MailMessage) error
}

// SMTPMailer sendet E-Mails über einen echten SMTP-Server.
type SMTPMailer struct {
	cfg MailerConfig
}

// NewSMTPMailer erstellt einen SMTPMailer mit den übergebenen Parametern.
func NewSMTPMailer(cfg MailerConfig) *SMTPMailer {
	return &SMTPMailer{cfg: cfg}
}
```

**Test-double pattern** (`mailer.go:228-239`):
```go
// NoopMailer verwirft alle E-Mails ohne Versand. Geeignet für Tests und deaktivierten SMTP-Betrieb.
type NoopMailer struct{}

func NewNoopMailer() *NoopMailer {
	return &NoopMailer{}
}

func (m *NoopMailer) Send(_ context.Context, _ MailMessage) error {
	return nil
}
```

**DI wiring at startup** (`backend/cmd/server/main.go:168-183`):
```go
var mailerSvc services.Mailer
if cfg.SMTPEnabled {
	mailerSvc = services.NewSMTPMailer(services.MailerConfig{ /* ... */ })
	log.Printf("SMTP-Mailer aktiv: ...")
} else {
	mailerSvc = services.NewNoopMailer()
	log.Printf("SMTP_ENABLED=false: Noop-Mailer aktiv (kein Mailversand)")
}
```

**Apply to `ReleaseFilenameParser`:** define the interface (e.g. `ParseFilename(fileName string)
(ReleaseFilenameResult, bool)`, returning a small project-owned result struct — NOT
`anitogo.Elements`) in `services` (or `importutil`, see note below), with a concrete
`AnitogoReleaseFilenameParser` struct wrapping the `anitogo` call, constructed via
`NewAnitogoReleaseFilenameParser()`. D-03 explicitly requires anitogo types never leak past the
interface boundary — mirror how `Mailer`'s `Send(ctx, MailMessage)` signature never leaks
`net/smtp` types to callers.

**Compile-time interface-satisfaction check already used in this exact handler file**
(`admin_episode_import.go:703`):
```go
var _ adminAniSearchEpisodeFetcher = (*services.AniSearchClient)(nil)
```
Use the same `var _ Interface = (*ConcreteType)(nil)` idiom for the new parser type.

**Package placement note:** `admin_episode_import.go` already imports
`"team4s.v3/backend/internal/importutil"` and calls `importutil.DeriveFansubGroupName` /
`importutil.DeriveReleaseVersion` for closely related filename-parsing concerns (see
`admin_episode_import.go:446` and `admin_episode_import_fansub_match.go:58`). Either `services`
(closest structural analog: interface + swappable impl, matches `Mailer`) or `importutil`
(closest topical analog: existing filename-parsing pure functions) is a defensible home; `services`
is slightly favored because `Mailer`'s pattern is specifically "interface for a 3rd-party-backed
capability", while `importutil`'s existing functions are plain regex-only pure functions with no
interface/swap requirement today.

---

### Backend: splitting `admin_episode_import.go` before the D-03 change (D-04)

**Analog 1 — pure-refactor split-commit precedent (different package, same pattern):**
`backend/internal/migrations/runner.go` split, commit `e1774a6da` ("refactor(185-03): runner.go in
3 Dateien je <=450 Zeilen aufteilen"). Commit message documents the exact discipline required by
CLAUDE.md D-04: a pure extraction with verbatim-identical function bodies, verified test-count
equality before/after, done as a standalone commit before any behavior change.

Resulting sibling files (concern-based, not line-count-based, split):
- `backend/internal/migrations/migrations_dir.go` (56 lines): `ResolveMigrationsDir`,
  `validateMigrationDir`, `isDir` — all directory-resolution helpers.
- `backend/internal/migrations/migration_file_loader.go` (78 lines): the filename-pattern regexp,
  `loadMigrations`, `parseMigrationFilename` — all file-discovery/parsing helpers.
- `backend/internal/migrations/runner.go` (351 lines, kept): the core `Runner` type and its
  methods — the thing the package is actually "about".

**Analog 2 — same-package, same-cluster precedent (`admin_episode_import_*.go` sibling files
already exist in this exact handler cluster):**
`backend/internal/handlers/admin_episode_import_fansub_match.go` (173 lines) was deliberately
carved out of `admin_episode_import.go` in an earlier phase, with the rationale documented inline
(lines 3-16):
```go
// enrichEpisodeImportPreviewFansubData wires Plan 01's hardened filename parser
// ...
// Deliberately kept out of admin_episode_import.go (already at the file-size
// ceiling) so that file only gains the single call-site line wiring this in.
```
and defines its own narrow interface for testability (lines 30-37):
```go
// fansubGroupMatchResolver is the narrow seam this function needs from
// *repository.EpisodeImportRepository (...), kept as its own interface so unit tests can
// substitute a hand-rolled fake without a database.
type fansubGroupMatchResolver interface {
	ResolveFansubGroupMatches(ctx context.Context, candidates []string) ([]models.FansubGroupMatch, error)
	SuggestSimilarFansubGroups(ctx context.Context, candidate string) ([]models.FansubGroupSuggestion, error)
}
```

**Established naming convention in this package** (confirmed via `ls`):
`admin_episode_import_einteiler.go`, `admin_episode_import_fansub_match.go`,
`admin_episode_import_folder_filter.go`, `admin_episode_import_ownership.go`,
`admin_episode_import_validation.go` — each a `admin_episode_import_<concern>.go` sibling file in
the `handlers` package, each with its own matching `_test.go` file where behavior warrants it.

**Apply to this phase:** split `admin_episode_import.go` (783 lines) along its existing natural
seams — the filename-regexp cluster (lines 521-589: the three `regexp.MustCompile` vars,
`episodeImportEvidenceEpisodeNumber`, `episodeImportEvidenceSeasonNumber`,
`parseEpisodeImportFilenameSeasonEpisode`, `parseEpisodeImportFilenameEpisode`,
`parseEpisodeImportFilenameRangeEnd`) is the natural candidate for extraction into a new sibling
file (e.g. `admin_episode_import_filename_parser.go`), verbatim, as a pure refactor commit — mirror
`e1774a6da`'s approach exactly (byte-identical function bodies, test-count verification). Only
*after* that pure-refactor commit lands should the D-03 content change (replacing the `Exx`
fallback regex call with the new `ReleaseFilenameParser` call) happen, in a separate commit.

---

### Backend: handler-level tests for the parser (D-03, two test groups)

**Analog 1 — table-driven pure-function unit test** (preferred style for the new parser's own
tests, both the "raw fansub filenames" group and the "regression" group):
`backend/internal/importutil/fansub_release_version_test.go` (full file, 63 lines):
```go
func TestDeriveReleaseVersion(t *testing.T) {
	tests := []struct {
		name        string
		fileName    string
		wantVersion string
		wantOK      bool
	}{
		{
			name:        "v4 glued directly after a checksum bracket, zero separator, real fixture",
			fileName:    `[GK]No Game, No Life - 01(720p 10bit)[C281B950]v4.mkv`,
			wantVersion: "v4",
			wantOK:      true,
		},
		// ... more cases, including explicit "must NOT match" negative cases
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotVersion, gotOK := DeriveReleaseVersion(tt.fileName)
			if gotVersion != tt.wantVersion || gotOK != tt.wantOK {
				t.Fatalf("DeriveReleaseVersion(%q) = (%q, %v), want (%q, %v)", tt.fileName, gotVersion, gotOK, tt.wantVersion, tt.wantOK)
			}
		})
	}
}
```
Use this exact table-driven `t.Run` structure for both D-03 test groups: group 1 (new CRC/batch/
specials filenames, asserting checksum lands in the checksum field not the episode number) and
group 2 (the 15 real `release_variants.filename` values, asserting 1:1 parity between old and new
parser output — this doubles as the regression-safety gate the Context explicitly requires).

**Analog 2 — existing handler-level integration test style** (for confirming the parser is
correctly wired into the full preview pipeline, not just unit-correct):
`backend/internal/handlers/admin_episode_import_test.go:260-302`
(`TestPreviewEpisodeImport_FallsBackToFilenameEpisodeWhenJellyfinIndexIsMissing`) — calls
`buildEpisodeImportPreview(...)` directly with fabricated `models.EpisodeImportMediaCandidate`
inputs (no httptest/gin needed, since this is a pure-function pipeline test), then asserts on the
returned `preview.Mappings` statuses/episode numbers. Follow this style for an end-to-end
"CRC-tagged filename survives the full preview pipeline" test, complementing the parser's own
isolated unit tests.

---

### Frontend: `applyGroupFromHere` pure function (D-01)

**Analog:** `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts:267-279`
(the function this phase replaces/rewrites), plus its neighbors in the same file for the
project's established pure-function conventions (`detectMappingConflicts` wrapping, no row
mutation, `...row` spread):
```typescript
export function applyFansubGroupFromEpisodeDown(
  rows: EpisodeImportMappingRow[],
  episodeNumber: number,
  fansubGroups: EpisodeImportSelectedFansubGroup[],
): EpisodeImportMappingRow[] {
  const normalized = normalizeFansubGroups(fansubGroups)
  return rows.map((row) => {
    const suggestedEpisode = row.suggested_episode_numbers?.[0]
    return suggestedEpisode != null && suggestedEpisode >= episodeNumber
      ? applyFansubGroupsToRow(row, normalized)
      : row
  })
}
```
All exported functions in this file follow the same shape: plain `(rows, ...args) => newRows`
signature, no classes, `rows.map(...)` immutable transforms, delegating normalization/merging to
small private helpers at the bottom of the file (`applyFansubGroupsToRow`, `normalizeFansubGroup`,
`getFansubGroupKey`).

**Note on signature shape (important for the planner, not a modification task for this agent):**
CONTEXT.md's pseudocode specifies `applyGroupFromHere(rows, startIndex, oldValue, newValue)` —
index-based and single-string-value-based — which is at a different abstraction level than the
existing `EpisodeImportMappingRow[]` / `EpisodeImportSelectedFansubGroup[]`-based functions in this
file (episode-number-based, multi-group-array-based). The planner must decide whether
`applyGroupFromHere` is (a) a new low-level helper operating on a simpler row/group-string
representation that the rewritten `applyFansubGroupFromEpisodeDown` call-site then adapts to/from,
or (b) directly generalized to the existing row/group-array shape. Either way, this file
(`episodeImportMapping.ts`) is the correct and only home for it, colocated with its sibling pure
functions.

---

### Frontend: logic tests for `applyGroupFromHere` (D-01)

**Analog:** `episodeImportMapping.test.ts:586-630` — the exact test this phase must rewrite
(`"applyFansubGroupFromEpisodeDown patches only the current episode and later groups"`). Shows the
project's convention for this file: `describe('episodeImportMapping', () => { it('...', () => {
...` blocks, fully literal `EpisodeImportMappingRow[]` fixtures (no factory helpers), and
`expect(result[n].fansub_groups).toEqual([...])` per-row assertions rather than snapshot
assertions. The CONTEXT.md D-01 table (4 mandatory cases: rule 1, rules 1+2+3 combined, rule 3
isolated, Sonderfall) should be implemented as 4 `it(...)` blocks (or one parameterized
`it.each`-equivalent) in this same `describe('episodeImportMapping', ...)` block, directly
replacing the existing single test.

---

### Frontend: wiring the rewritten "ab hier" action (D-01)

**Analog:** `useEpisodeImportBuilder.ts:333-334` (existing wiring, same file, to be updated to call
the rewritten logic):
```typescript
applyFansubGroupFromEpisode: (episodeNumber, fansubGroups) =>
  setMappings((current) => applyFansubGroupFromEpisodeDown(current, episodeNumber, fansubGroups)),
```
All builder actions in this hook follow this `actionName: (...args) => setMappings((current) =>
pureFunction(current, ...args))` shape — keep the same wiring style, only the pure function body
(and, if the planner chooses signature option (a) above, an adapter at this call site) changes.

**Call-site in the component tree** (unchanged wiring shape, confirms the "episode number + full
`EpisodeImportSelectedFansubGroup[]`" values available at the button click):
`EpisodeImportMappingRowGroupField.tsx:201-216`:
```tsx
<Button
  variant="subtle"
  size="sm"
  disabled={isSkipped || episodeNumber <= 0 || !hasSelectedGroups}
  onClick={() => onApplyFansubGroupFromEpisode(episodeNumber, selectedFansubGroups)}
>
  Ab hier
</Button>
<Button
  variant="subtle"
  size="sm"
  disabled={isSkipped || episodeNumber <= 0}
  onClick={() => onApplyFansubGroupFromEpisode(episodeNumber, [])}
>
  Ab hier entfernen
</Button>
```
These two buttons (labels unchanged per D-02) are the only call sites and need no label change —
only the underlying pure-function behavior changes via D-01.

---

### Frontend: native `<button>` → `Button` primitive migration + label rename (D-02)

**Analog:** `frontend/src/components/anime/ReleaseVersionBreakdown.tsx`, commit `04691f5b8`
("feat(83-07): ReleaseVersionBreakdown native button → Button; D-16 Kommentar") — a real,
already-merged migration of exactly this kind:
```diff
+import { Button } from '@/components/ui'
...
-      <button
+      <Button
+        variant="ghost"
         type="button"
         className={blockStyles.toggleButton}
         onClick={() => setOpen((prev) => !prev)}
         ...
       >
         {open ? '▾' : '▸'} Nach Release-Version
-      </button>
+      </Button>
```
Other precedents for the same migration pattern: `2257e2f36`/`96a752426` ("WR-04 replace native
button with Button primitive"), `8ef4661ec` ("WR-02 handgebautes Rollen-Auswahl-Button auf
UI-Primitive umgestellt").

**Current code to migrate** (`page.tsx:186-210`):
```tsx
<button
  className={styles.secondaryButton}
  type="button"
  onClick={() => builder.skipAllSuggested()}
  disabled={!builder.hasSuggestedRows}
>
  Alle Vorschläge überspringen
</button>
<button
  className={styles.secondaryButton}
  type="button"
  onClick={() => builder.confirmAllSuggested()}
  disabled={!builder.hasSuggestedRows}
>
  Alle Vorschläge bestätigen
</button>
<button
  className={styles.primaryButton}
  type="button"
  disabled={!builder.canApply || builder.isApplying}
  onClick={() => void builder.applyMappings()}
>
  {builder.isApplying ? "Wendet an..." : "Mapping anwenden"}
</button>
```
Migrate all three to `Button` (likely `variant="secondary"` for the first two, `variant="primary"`
for the third, matching the existing `styles.secondaryButton`/`styles.primaryButton` CSS-module
class intent — `Button` already supports `className` passthrough, see
`frontend/src/components/ui/Button.tsx:11-21` `CommonButtonProps.className`). Only the third
button's label text changes (`"Mapping anwenden"` → `"Alle bestätigten übernehmen"`,
`"Wendet an..."` stays as the loading label per CONTEXT.md scope — D-02 does not mention it).

**`Button` primitive prop surface** (`frontend/src/components/ui/Button.tsx:8-21`):
```typescript
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'success' | 'text' | 'floating'
type ButtonSize = 'sm' | 'md' | 'lg'

type CommonButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  iconOnly?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  className?: string
  disabled?: boolean
  children?: ReactNode
}
```

**Row-level button needing only a label change, no migration** — already correct
(`EpisodeImportMappingRow.tsx:3, 143-152`):
```tsx
import { Button, FormField, Input } from '@/components/ui'
...
{row.status === 'confirmed' && onApplyRow ? (
  <Button
    variant="primary"
    size="sm"
    disabled={isApplyingRow}
    onClick={() => onApplyRow(sourceKey)}
  >
    {isApplyingRow ? 'Wird angewendet...' : 'Übernehmen'}
  </Button>
) : null}
```
Only `'Übernehmen'` → `'Nur diese Version übernehmen'` changes here; everything else (including the
loading label `'Wird angewendet...'`) stays as-is per CONTEXT.md scope.

## Shared Patterns

### Backend: narrow package-private interfaces for testability
**Source:** `backend/internal/handlers/admin_content_handler.go:169-194` (e.g.
`adminEpisodeImportRepository`, `adminAniSearchEpisodeFetcher`), reinforced by
`admin_episode_import_fansub_match.go:30-37` (`fansubGroupMatchResolver`).
**Apply to:** the new `ReleaseFilenameParser` interface and any seam the split-out filename-parser
file needs from the handler struct — keep it minimal (only the methods actually called), defined
right next to its first consumer, with a doc comment stating *why* it's a separate interface (so a
hand-rolled fake can substitute for it in tests without a database or external library call).

### Backend: compile-time interface-satisfaction assertion
**Source:** `backend/internal/handlers/admin_episode_import.go:703`
```go
var _ adminAniSearchEpisodeFetcher = (*services.AniSearchClient)(nil)
```
**Apply to:** `var _ ReleaseFilenameParser = (*AnitogoReleaseFilenameParser)(nil)` (or wherever the
new type lives), immediately after its definition.

### Backend: pure-refactor split commits (CLAUDE.md D-04 enforcement)
**Source:** commit `e1774a6da` (migrations/runner.go split) — the concrete, already-applied
template for "split first in its own commit with zero behavior change, verify test-count parity,
then make the real change in a second commit."
**Apply to:** `admin_episode_import.go` before the D-03 content change (see Pattern Assignments
above for the exact proposed seam).

### Frontend: `@/components/ui` `Button` primitive is mandatory for all user-facing buttons
**Source:** `frontend/src/components/ui/Button.tsx`; enforcement already documented in
`frontend/eslint.config.mjs` (`no-restricted-syntax` warning on native `<select>/<input>/
<textarea>`, native `<button>` covered by project convention + prior fix commits even where ESLint
doesn't yet flag it).
**Apply to:** all three `page.tsx` header buttons (D-02 scope-consequence), already-compliant row
button in `EpisodeImportMappingRow.tsx` (label-only change), already-compliant group-field buttons
in `EpisodeImportMappingRowGroupField.tsx` (no change needed beyond D-01 wiring).

### Frontend: pure-function + colocated-test convention for mapping logic
**Source:** `episodeImportMapping.ts` + `episodeImportMapping.test.ts` (whole-file pattern: every
exported row-transform function is pure, returns a new array, is independently unit-tested with
literal fixtures in the same `describe('episodeImportMapping', ...)` block).
**Apply to:** `applyGroupFromHere` and its rewritten test block.

## No Analog Found

None. All 8 files in scope have at least one exact or near-exact analog in the current codebase.

## Metadata

**Analog search scope:**
- `backend/internal/handlers/` (admin_episode_import*.go cluster, admin_content_handler.go
  interface definitions)
- `backend/internal/services/` (mailer.go, anisearch_client.go, anisearch_episode_import.go,
  markdown_service.go)
- `backend/internal/importutil/` (fansub_group.go, fansub_release_version.go + tests)
- `backend/internal/migrations/` (runner.go split precedent, commit `e1774a6da`)
- `frontend/src/app/admin/anime/[id]/episodes/import/` (all 9 route files + tests)
- `frontend/src/components/ui/` (Button.tsx, index.ts)
- git history (`git log --oneline --all`) for prior file-split and native-button-migration commits

**Files scanned:** ~25 read/grepped directly; git log scanned for ~30 matching commit messages.
**Pattern extraction date:** 2026-10-18
