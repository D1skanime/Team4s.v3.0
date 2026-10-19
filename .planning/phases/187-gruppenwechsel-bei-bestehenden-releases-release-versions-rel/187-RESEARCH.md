# Phase 187: Gruppenwechsel bei bestehenden Releases — Research

**Researched:** 2026-10-19
**Domain:** Go backend test architecture (httptest + fake-repository handler tests, real-Postgres
repository/FK-behavior tests) for a new dependency guard on `release_version_groups`
**Confidence:** HIGH (all findings are direct file:line reads of this repo, not external docs)

## Summary

187-CONTEXT.md already contains the full Ist-Analyse, schema findings, live-reproduced failure
cases, and 14 locked decisions (D-01..D-14). This document does not re-derive any of that. Its
job is narrower: it inventories the exact existing test infrastructure the planner should reuse
to validate the new "hängt etwas dran?" guard, and flags three implementation seams that already
exist in the codebase (partially unused) that the planner should wire into rather than
reinvent.

**Primary recommendation:** Split the guard's test strategy by layer. (1) The dependents-count
SQL (the part that must correctly distinguish FK-RESTRICT/credits vs CASCADE/empty-snapshot vs
no-FK/orphan-prone media+notes) needs a **real Postgres integration test**, following the
`openPhase108Pool` / `phase108_contribution_sources_test.go` precedent exactly — a hand-rolled
fake cannot safely reproduce Postgres's own FK enforcement semantics without secretly
re-implementing a fake FK engine in Go (a "don't hand-roll" violation in its own right). (2) The
HTTP-facing behaviour (409 status + German breakdown body, routing/looping logic, per-row
conflict marking without aborting the batch) is exactly what CLAUDE.md's Teststil rule and
187-CONTEXT.md's explicit instruction want: `httptest` against a **fake/stub repository
interface**, asserting status code and response body — following the
`admin_capability_impact_handler_test.go` / `admin_episode_import_ownership_test.go` precedent.
No render/click tests anywhere (confirmed instruction, Live-UAT covers the chip UI instead).

A second, equally important finding: `episode_import_repository_apply.go`'s `applyReleaseNative`
currently wraps the **entire batch in one transaction** and does `return nil, err` (hard abort,
whole request fails) for any per-mapping error. D-12 requires a single conflicting row to be
marked and skipped while the rest of the batch proceeds — this capability **does not exist yet**.
Two matching unused seams already exist for exactly this: `models.EpisodeImportMappingStatusConflict`
("conflict" status, currently only set pre-apply by validation) and
`models.EpisodeImportApplyResult.Conflicts int32` (declared, never incremented anywhere in the
codebase today). The planner should reuse these rather than invent new fields — and the test
plan must explicitly prove "one conflicting row marked, remaining rows applied, one HTTP 200
response" rather than assuming a per-row error implies a per-row HTTP error.

## User Constraints (from CONTEXT.md)

<user_constraints>

### Locked Decisions (D-01 .. D-14, verbatim summary — see 187-CONTEXT.md for full text)

- **D-01**: Stufe 1 — Gruppe frei änderbar solange nichts dranhängt.
- **D-02**: Stufe 2 — sobald etwas dranhängt, serverseitige Sperre mit deutscher
  Anhangs-Auskunft (Anzahl je Art) statt FK-Fehler/stillem CASCADE.
- **D-03**: Partnergruppe hinzufügen statt Wechsel (N Gruppen pro Release, bereits möglich).
- **D-04**: Kein Umzugs-Assistent (Stufe 3) in dieser Phase.
- **D-05**: Kein neuer Parallel-Knopf — bestehendes Suchfeld/Chip-UI im Editor bleibt der einzige
  Weg, Beschriftung wird zu „Partnergruppe hinzufügen" geändert.
- **D-06**: Letzte verbleibende Gruppe darf NICHT entfernt werden — ein Release hat immer ≥1
  Gruppe, serverseitig erzwungen.
- **D-07**: Entfernen einer Partnergruppe folgt derselben Stufe-2-Sperrlogik, keine Sonderregel.
- **D-08**: Medien (`release_version_media`) und Notizen (`release_version_notes`) mit
  `fansub_group_id` dieser Gruppe zählen als „hängt dran" und sperren.
- **D-09**: Ein leerer, nur `snapshot_mode='inherited'`-`release_crew_snapshots`-Eintrag ohne
  echte Credits zählt NICHT als „hängt dran"; wird beim Wechsel sauber neu angelegt.
- **D-10**: Doppelte Durchsetzung — Client (Chip vorab deaktiviert/ausgegraut mit Begründung) UND
  Server (409 mit Aufschlüsselung statt generischem 500 beim Speichern).
- **D-11**: Sperre gilt für ALLE, auch Plattform-Admins — reine Datenkonsistenzregel, keine
  Rechtefrage. Heutiger Zugriffsschutz (`IsPlatformAdmin`-Gate für das Gruppenfeld) bleibt
  unverändert.
- **D-12**: Guard auch im Episoden-Import „Übernehmen" — aber enger als 1:1-Übernahme: gesperrt
  ist nur ENTFERNEN/ERSETZEN einer Gruppe mit Anhang, NICHT das Aktualisieren eines bestehenden
  Releases mit DERSELBEN Gruppe (immer erlaubt, auch mit Anhang) und NICHT das Hinzufügen einer
  Partnergruppe (immer erlaubt). Eine gesperrte Ersetzung markiert NUR diese Zeile als Konflikt
  mit Begründung, kein globaler Batch-Abbruch. Separater Prüfauftrag (nicht Umbau): ob der Import
  ein bestehendes Release heute zuverlässig wiedererkennt — falls nicht, nur als Befund melden.
- **D-13**: Fansub-Gruppen-Merge-Pfad ist NICHT Teil dieser Phase (eigener Todo).
- **D-14**: Editor UND Import lehnen beide eine leere Zielgruppenliste ab (0 Gruppen nie erlaubt,
  folgt aus D-06, schließt die heutige Editor/Import-Inkonsistenz).

### Verbindliche Vorgaben für Planung + Ausführung

- Bestehenden Editor wiederverwenden (`EpisodeVersionEditorPage.tsx`, Abschnitt „Fansub Gruppen") —
  keine neue Parallelseite.
- Datei-Split bei Anfassen: `EpisodeVersionEditorPage.tsx` (981 Zeilen) unter 450 Zeilen splitten,
  Gruppen-Abschnitt auf `@/components/ui`-Primitives (`Button`, `Input`) umstellen.
- Produktverhalten nie ändern, nur um Tests grün zu machen.
- Alle berührten Dateien ≤ 450 Zeilen (Inventur in 187-CONTEXT.md Abschnitt 8); wer sie anfasst,
  teilt sie im selben Auftrag auf (reiner Umbau-Commit zuerst, Tests/Typecheck grün, dann Inhalt).
- Deutsche UI-Texte mit echten Umlauten (ä/ö/ü/ß), keine ASCII-Ersetzungen.
- **Teststil (explizit für diese Phase, CONTEXT.md verbatim)**: "Tests prüfen die Logik hinter dem
  Button direkt — Guard-Funktion, API-Antwort, Repository (`httptest` gegen Fake-Repository mit
  Statuscode/Body-Prüfung, kein Quelltext-Grep-Test). KEINE Render-/Klick-Simulationstests für die
  UI. Klickabläufe im Editor werden stattdessen als Live-UAT geprüft."

### Deferred Ideas (OUT OF SCOPE)

- Umzugs-Assistent (Stufe 3) — D-04.
- Fansub-Gruppen-Merge-Pfad-Absicherung — D-13, eigener Todo
  (`.planning/todos/pending/2026-10-19-fansub-gruppen-merge-ungeschuetzter-pfad.md`).
- Gruppenleiter-Zugriffspfad für das Gruppenfeld (heute nur Plattform-Admin) — unverändert, D-11.
- „Releases ohne Jellyfin-Datei" Folge-Feature — separater Todo
  (`.planning/todos/pending/2026-10-19-releases-ohne-jellyfin-datei.md`), nur Motivation für
  D-12s genaue Scoping.

</user_constraints>

## Project Constraints (from CLAUDE.md)

- **Teststil (project-wide, CLAUDE.md)**: behaviour assertions must actually execute the code
  under test — for handlers, via `httptest` against a lightweight fake repository, checking
  status code AND response body. Forbidden: reading a handler's own `.go` source via
  `os.ReadFile` + `strings.Contains` to claim behaviour without ever calling it. Exceptions:
  absence-checks (an identifier must appear NOWHERE) and files that are themselves the subject
  under test (SQL migrations). **This phase's existing sibling file
  `episode_version_repository_write_helpers_test.go` is itself an example of the forbidden
  pattern (source-grep, see Code Examples below) — do not copy it as a precedent for new guard
  tests, despite living in the same package.**
- **Dateigrößen**: production files touched must stay ≤450 lines; split in a separate pure-refactor
  commit first if currently over limit (already covered by 187-CONTEXT.md Abschnitt 8/Verbindliche
  Vorgaben above).
- **Umlaute**: all German UI/error text must use real ä/ö/ü/ß, never ASCII substitutes.
- **GSD workflow enforcement**: execute via `/gsd:execute-phase`, no direct repo edits outside it.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dependents-count query (credits/media/notes/snapshot) | Database / Storage (SQL correctness vs real FK semantics) | API / Backend (guard function wraps the query) | Only Postgres can authoritatively tell RESTRICT vs CASCADE vs no-FK; must be proven against real schema, not re-derived in Go |
| Guard enforcement on editor PATCH | API / Backend (`episode_version_update.go` + `episode_version_repository_write_helpers.go`) | — | D-02/D-10: server must enforce, client disabling alone is insufficient |
| Guard enforcement on import apply | API / Backend (`episode_import_repository_release_helpers.go` / `episode_import_repository_apply.go`) | — | D-12: same guard, different per-row-continuation semantics |
| Chip pre-disable with reason | Browser / Client (`EpisodeVersionEditorPage.tsx`) | — | D-10: UX affordance only, never authoritative — Live-UAT, not automated render test |
| "0 Gruppen verboten" check | API / Backend (both write paths) | Browser / Client (pre-disable last chip) | D-06/D-14: must be server-enforced; client affordance is secondary |
| Access control for the group field (`IsPlatformAdmin` gate) | API / Backend (`episode_version_update.go:92-99`, unchanged) | — | D-11: orthogonal to the new guard, not touched by this phase |

## Standard Stack

No new external dependencies. Guard logic, tests, and error plumbing use only what this repo
already imports.

### Core (existing, reused)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `github.com/jackc/pgx/v5` | as pinned in `backend/go.mod` | Postgres driver for repository + fixture SQL | Already the sole DB driver project-wide |
| `github.com/gin-gonic/gin` | as pinned | HTTP handler + `gin.CreateTestContext` for handler tests | Already the sole HTTP framework |
| `github.com/stretchr/testify` (`require`) | as pinned | Assertions in both repository and handler tests | Already the project's sole assertion library |

### Package Legitimacy Audit

Not applicable — this phase introduces zero new external packages. No `npm view` / `pip index` /
`cargo search` / slopcheck run was needed.

## Architecture Patterns

### Recommended Test Structure (two layers, matching existing precedent exactly)

```
backend/internal/testsupport/
└── phase187_postgres.go          # NEW — real-Postgres fixture, mirrors
                                   #   phase108_contribution_sources_test.go's openPhase108Pool
                                   #   lineage (OpenPhase107Postgres + migration 0137 applied),
                                   #   PLUS release_version_media / release_version_notes
                                   #   (D-08's orphan-prone, non-FK tables) that phase108's
                                   #   fixture does not yet have.

backend/internal/repository/
└── release_version_group_guard_test.go   # NEW — real-Postgres repository test for the
                                           #   dependents-count SQL: RESTRICT (credits) vs
                                           #   CASCADE/empty (inherited snapshot) vs orphan-prone
                                           #   no-FK (media/notes). Package-internal, no httptest.

backend/internal/handlers/
├── episode_version_update_test.go        # NEW — httptest + fake dependents-check interface,
│                                          #   asserts 409 body/code for the editor PATCH path.
└── admin_episode_import_apply_conflict_test.go  # NEW — httptest + fake, asserts per-row
                                           #   conflict marking without aborting the batch (D-12).
```

### Pattern 1: Real-Postgres fixture for FK-behavior-dependent guard logic

**What:** A dedicated per-phase Postgres fixture (`testsupport.OpenPhase187Postgres`), following
the exact lineage of `backend/internal/testsupport/phase107_postgres.go` →
`backend/internal/testsupport/phase117_postgres.go` / the `openPhase108Pool` helper in
`backend/internal/migrations/phase108_contribution_sources_test.go:167-185`.

**When to use:** Any time the behaviour under test depends on actual FK `ON DELETE` semantics
(RESTRICT vs CASCADE) or the *absence* of an FK (the media/notes orphan case) — this is
precisely the Phase-187 guard's core correctness requirement. A fake cannot safely encode "and
then Postgres throws 23503" without re-implementing Postgres's own constraint engine by hand.

**Example (precedent to mirror, `backend/internal/migrations/phase108_contribution_sources_test.go:167-185`):**
```go
// Source: backend/internal/migrations/phase108_contribution_sources_test.go
func openPhase108Pool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	_, err := pool.Exec(context.Background(), `
CREATE TABLE anime (id BIGINT PRIMARY KEY);
CREATE TABLE release_version_groups (
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (release_version_id, fansub_group_id)
);
...`)
	require.NoError(t, err)
	testsupport.ApplySQLFile(t, pool, phase108MigrationPath(t, phase108Up)) // real 0137 migration
	return pool
}
```
This already applies the REAL `0137_phase108_contribution_sources.up.sql` migration — the exact
migration CONTEXT.md cites (Abschnitt 1) as defining `release_role_credit_lifecycles` (RESTRICT)
and `release_crew_snapshots` (CASCADE). The new Phase-187 fixture should do the same, additionally
creating `release_version_media` and `release_version_notes` with their real nullable
`fansub_group_id → fansub_groups(id) ON DELETE SET NULL` shape (no composite FK to
`release_version_groups` — this is the orphan case, D-08). `release_version_notes`'s real columns
are already modeled once in `backend/internal/testsupport/phase117_postgres.go:159-173` and can be
copied/adapted; `release_version_media` has no existing stand-in anywhere in `testsupport/` yet
(new territory — build it from the real migration that created it, not from guesswork).

**Database/schema naming convention to follow exactly** (`backend/internal/testsupport/phase117_postgres.go:14-19`):
```go
const phase187DSNEnv = "TEAM4S_PHASE187_TEST_DSN"
var (
	phase187DatabasePattern = regexp.MustCompile(`^team4s_phase187_test_[a-z0-9]+$`)
	phase187SchemaPattern   = regexp.MustCompile(`^phase187_[a-z0-9_]+$`)
)
```

### Pattern 2: httptest + fake interface for HTTP-facing guard behaviour

**What:** A narrow Go interface the handler depends on for the dependents-check (and, separately,
for the write), with a hand-written fake returning canned `DependencySummary`-shaped data —
**not** reimplementing SQL/FK logic, purely a pass-through test double for the HTTP-layer
behaviour (status code, JSON body shape, per-row loop semantics).

**When to use:** Testing the 409 response shape (D-02/D-10's German breakdown message + `code`
field), the "same-group update always allowed" / "replace-with-dependents blocked" distinction
(D-12), and the batch-continuation behaviour (one row conflict, rest proceed) — none of which
need a real database, only correct Go control flow given a known dependents count.

**Existing precedent to mirror (`backend/internal/handlers/admin_capability_impact_handler_test.go:23-30`):**
```go
// Source: backend/internal/handlers/admin_capability_impact_handler_test.go
type fakeCapabilityImpactRoleHolderRepo struct {
	entries []repository.RoleHolderEntry
	err     error
}
func (f *fakeCapabilityImpactRoleHolderRepo) ListRoleHolders(_ context.Context, _ string) ([]repository.RoleHolderEntry, error) {
	return f.entries, f.err
}
```
Same shape: a 2-3 field fake struct implementing exactly the interface the handler calls, with a
single exported field to control the canned return. Combine with
`gin.CreateTestContext`/`httptest.NewRecorder` exactly as in
`backend/internal/handlers/admin_episode_import_ownership_test.go:20-33` (the
`TestRejectUnownedJellyfinSeriesID_*` tests there are a strong structural analog: a guard function
called directly against a bare `httptest.NewRecorder()`/`gin.CreateTestContext(rec)`, asserting
`rec.Code` and `rec.Body.String()` — no server, no database).

**Important codebase-convention note:** `FansubHandler` (owner of `UpdateEpisodeVersion`,
`backend/internal/handlers/fansub_admin.go:39-63`) wires almost all repos as **concrete struct
pointers** (e.g. `episodeVersionRepo *repository.EpisodeVersionRepository`), not interfaces — this
is the majority pattern in this codebase. A narrow interface for only the new dependents-check
call (mirroring the existing `fansubProjectResolverRepo` interface field already present on the
same struct, line 62) is a *precedented, narrow* deviation, not an invented pattern — but it is a
seam the planner must deliberately add, it does not fall out "for free" from the existing field
types. **Alternative, equally valid given existing convention:** skip the interface and test
`UpdateEpisodeVersion` end-to-end against the real Phase-187 Postgres fixture + real
`*repository.EpisodeVersionRepository`, mirroring `evecFixtureHandler`
(`backend/internal/handlers/admin_content_episode_version_editor_context_test.go:102-121`)
instead of faking. Either is consistent with CLAUDE.md; the fake-interface route is faster/more
isolated, the fixture route needs zero new interface but one more Postgres round-trip per test.
Document whichever the planner picks — do not silently default to one.

### Pattern 3: Reuse the existing (currently inert) per-row-conflict seam instead of inventing a new one

**What goes wrong today:** `episode_import_repository_apply.go:107-116` wraps the whole batch in
one `tx.Begin()`/`tx.Commit()` and does `return nil, err` the instant any single mapping's
`upsertImportReleaseGraph` fails — a hard, whole-request abort. D-12 explicitly requires the
opposite: one conflicting row marked, the rest of the batch applied normally.

**Existing unused seams to reuse (do not invent new fields/enum values):**
- `models.EpisodeImportMappingStatusConflict` (`backend/internal/models/episode_import.go:10`,
  value `"conflict"`) — today only ever *set* by `admin_episode_import_validation.go:77` /
  `episode_import_repository.go:151` as a pre-apply validation rejection, never produced
  *during* apply. The new guard-triggered per-row rejection is a natural second producer of the
  same status value.
- `models.EpisodeImportApplyResult.Conflicts int32` (`backend/internal/models/episode_import.go:205`)
  — declared, has a `json:"conflicts"` tag, but **is never incremented anywhere in the current
  codebase** (confirmed via `grep -rn "result.Conflicts\b"` — zero matches outside the merge
  module's unrelated namesake struct `fansub_repository_merge_duplicates.go`, which is a
  different `Conflicts` field on a different type). This is the field D-12's per-row counter
  should increment.

**Test implication:** a correctness test for D-12 must prove, in one apply call with N mappings
where exactly one targets a group-replace with dependents: (a) HTTP 200 (not 409/500) for the
whole request, (b) `result.Conflicts == 1`, (c) `result.VersionsCreated + result.VersionsUpdated +
result.Skipped + result.Conflicts == N` (every mapping accounted for, none silently dropped), (d)
the conflicting mapping's row-level status/reason is retrievable by the caller (exact shape is a
planning decision, but the test should assert *something* identifies which row and why).

### Anti-Patterns to Avoid

- **Source-grep tests for the guard itself:** `episode_version_repository_write_helpers_test.go`
  already in this package does exactly this (`os.ReadFile` + `strings.Index` on its own source,
  see lines 9-32/34-46/48-72/74-92 of that file) — explicitly named as pre-existing "Altlast" in
  CLAUDE.md's Teststil section (49 files / 236 assertions, "kein Vorbild zum Weiterkopieren").
  **Do not extend that file with the same pattern for the new guard** even though it is the
  existing test file for the exact production file (`episode_version_repository_write_helpers.go`)
  the guard will likely touch. Add new, behaviour-executing test functions instead (new file is
  fine, or new functions in the same file using the httptest/real-call pattern).
- **Hand-rolling a fake Postgres FK engine:** do not write a Go fake that tries to model "this
  delete would violate FK X" as an in-memory rule set. That is the exact "don't hand-roll"
  trap for this domain — Postgres already enforces it correctly; test against the real engine via
  the Phase-187 fixture instead (see Pattern 1).
- **Render/click simulation tests for the chip UI:** explicitly out of scope per CONTEXT.md's
  Teststil instruction. Frontend disabled-state logic (if extracted as a pure function, e.g.
  "given dependents summary, which chips are removable") may get a plain unit test; the
  click-and-see-it-grey-out flow is Live-UAT only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verifying RESTRICT vs CASCADE vs no-FK behaviour | An in-Go fake simulating Postgres constraint errors | Real Postgres fixture (Pattern 1) | Postgres is the actual source of truth; a fake re-derivation is strictly riskier and duplicative |
| Per-row batch continuation state | A brand-new result/status field | Existing `EpisodeImportMappingStatusConflict` + `EpisodeImportApplyResult.Conflicts` (Pattern 3) | Already declared, already wired into the JSON contract (`conflicts` field), zero-cost reuse |
| 409 response shape for the guard | A new ad-hoc error envelope | The established `gin.H{"error": gin.H{"message": ..., "code": ...}}` shape, e.g. `backend/internal/handlers/admin_content_anime_relations.go:172` (`"relation_conflict"`) | Dozens of existing 409 handlers already use this exact envelope; a new shape would be an unnecessary one-off |

**Key insight:** Nearly every piece of plumbing this guard needs (conflict status enum value,
conflicts counter, 409 envelope shape, real-Postgres FK fixture pattern) already exists somewhere
in this codebase in a form directly reusable or trivially extensible. The main net-new work is the
dependents-count SQL itself, the guard function that calls it, and wiring both call sites to use
it — not inventing new plumbing shapes.

## Common Pitfalls

### Pitfall 1: Treating the import apply-loop abort as "already handled" because an error path exists
**What goes wrong:** A plan could wire the guard into `upsertReleaseVersionGroup`
(`episode_import_repository_release_helpers.go:210-269`) and have it return an error, assuming
the existing `if err != nil { return false, err }` at
`episode_import_repository_apply.go:110-112` is sufficient — but that still aborts the entire
transaction/request for every other mapping in the batch, directly violating D-12.
**Why it happens:** The existing code's error-propagation pattern is uniform and looks "already
correct" at a glance; the batch-vs-row distinction only becomes visible when tracing where the
transaction boundary sits.
**How to avoid:** The guard check for a given mapping must either (a) run as a pure pre-check
(SELECT only) before any write for that mapping, letting the apply loop catch the specific guard
sentinel error and `continue` to the next mapping (incrementing `Conflicts`) instead of
`return`ing — the current single-tx-for-the-whole-batch shape makes this safe only if the guard
check never requires rolling back a partial write; or (b) use a `SAVEPOINT` per mapping. Confirm
with the planner which approach is chosen, and write a test that proves N-1 other mappings in the
same request still succeed when one is a guard violation.
**Warning signs:** A test that asserts "apply returns an error when one mapping is blocked"
without also asserting the other mappings' outcomes is testing the OLD (wrong, D-12-violating)
behaviour by omission.

### Pitfall 2: Empty inherited snapshot counted as "hängt dran"
**What goes wrong:** A naive `COUNT(*) FROM release_crew_snapshots WHERE ...` would count the
empty, `snapshot_mode='inherited'`-only row CONTEXT.md's Case A reproduced, wrongly blocking a
change D-09 says must be allowed.
**Why it happens:** The row exists and matches the group's composite key — only its *content*
(no real credit rows attached) makes it safe, not its mere existence.
**How to avoid:** The dependents check for `release_crew_snapshots` must distinguish "row exists
with `snapshot_mode='inherited'` and no linked `release_role_credit_lifecycles` rows" (safe) from
"row exists with real credits" (blocks). Since `release_role_credit_lifecycles` is RESTRICT, in
practice a safe-to-change inherited snapshot with zero credits will never itself be the blocking
constraint — but the guard's own pre-check SQL (which runs before any DB-level FK is hit) must
replicate this distinction correctly, or it will block changes D-09 explicitly allows.
**Warning signs:** A guard unit test using CONTEXT.md's live-reproduced Case A data (release
30 Credits/Crew/Medien/Notizen alle leer, nur ein `inherited`-Snapshot) returning "blocked" instead
of "allowed" is this pitfall, surfaced.

### Pitfall 3: "Same group update" in the import path accidentally hitting the guard
**What goes wrong:** D-12 requires the import to ALWAYS allow re-applying the same group to an
existing release (the core `VersionsUpdated` case, motivated by the future "Release ohne
Jellyfin-Datei" workflow). If the guard is wired as a blanket "does the target group list differ
from the DB and does the removed/changed group have dependents" check without first special-casing
"target group set already includes/equals the current group(s)", a routine re-import of the same
file could spuriously 409/mark-conflict.
**Why it happens:** The editor path's guard (D-07: removing ANY group with dependents blocks,
no exception) and the import path's guard (D-12: only blocks REPLACING, never same-group updates
or additions) look superficially identical but have different exception carve-outs. Copy-pasting
the editor's guard verbatim into the import path would be too strict.
**How to avoid:** Test both paths against the *same* dependents-having fixture data, asserting
different allowed outcomes: editor removing that group → blocked; import re-applying that exact
same group to the same existing release → always allowed regardless of dependents.
**Warning signs:** A shared guard helper function with no "is this an add/same-group update vs a
replace/remove" parameter is a sign the two call sites' differing semantics got collapsed into one.

### Pitfall 4: Leaving the editor/import 0-group inconsistency only half-fixed
**What goes wrong:** CONTEXT.md Abschnitt 3 #3/#5 documents today's asymmetry: the editor's
`syncEpisodeVersionSelectedGroups` does a blanket `DELETE` even down to 0 rows, while the import's
`upsertReleaseVersionGroup` aborts early on an empty list without deleting anything. D-14 requires
both to reject 0-groups identically. A plan that only patches one call site leaves the other
silently reachable via its existing code path.
**How to avoid:** Write one test per call site (not one shared test) proving a 0-length target
group list is rejected before any `DELETE`/`INSERT` runs, for both
`episode_version_repository_write_helpers.go` and `episode_import_repository_release_helpers.go`.

## Code Examples

### Existing 409 envelope shape to reuse for the new guard error
```go
// Source: backend/internal/handlers/admin_content_anime_relations.go:172
c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "relation existiert bereits oder ist ungültig", "code": "relation_conflict"}})
```
The new guard's 409 should follow the same `{"error": {"message": "<deutscher Text mit
Aufschlüsselung>", "code": "release_version_group_has_dependents"}}` shape (exact code string is
the planner's choice; the two-field envelope convention is not).

### Existing sentinel-error → status-code mapping pattern to extend
```go
// Source: backend/internal/handlers/episode_version_update.go:65-78
item, err := h.episodeVersionRepo.Update(c.Request.Context(), versionID, input)
if errors.Is(err, models.ErrEpisodeVersionDateOrder) {
	badRequest(c, models.ErrEpisodeVersionDateOrder.Error())
	return
}
if errors.Is(err, repository.ErrNotFound) {
	c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "episodenversion nicht gefunden"}})
	return
}
if errors.Is(err, repository.ErrConflict) {
	c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "versionskombination bereits vorhanden"}})
	return
}
```
A new sentinel (e.g. `repository.ErrGroupHasDependents`, exact name is the planner's choice)
slots into this exact `errors.Is` chain, replacing today's fall-through to the generic
`"interner serverfehler"` 500 CONTEXT.md identifies as today's failure mode for Case B.

### Existing real-Postgres handler-test wiring to reuse/mirror if the fixture route is chosen
```go
// Source: backend/internal/handlers/admin_content_episode_version_editor_context_test.go:102-121
func evecFixtureHandler(pool *pgxpool.Pool, jellyfinBaseURL, jellyfinAPIKey string) *AdminContentHandler {
	return &AdminContentHandler{
		repo:               repository.NewAdminContentRepository(pool),
		episodeVersionRepo: repository.NewEpisodeVersionRepository(pool),
		...
	}
}
func evecFixtureRequest(h *AdminContentHandler) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/episode-versions/3301/editor-context", nil)
	c.Params = gin.Params{{Key: "versionId", Value: "3301"}}
	c.Set("auth_identity", evecFixturePlatformAdminIdentity())
	h.GetEpisodeVersionEditorContext(c)
	return w
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Group change errors as raw FK-RESTRICT 500 or silent CASCADE/orphan | Explicit guard + 409 with breakdown | This phase (not yet implemented) | Admin gets actionable German feedback instead of a crash or silent data corruption |
| `episode_import_repository_apply.go` aborts the whole batch on any mapping error | Per-row conflict marking, rest of batch proceeds | This phase, D-12 (not yet implemented) | One bad row no longer blocks N-1 good rows in the same import apply |

**Deprecated/outdated:** None — this is new guard logic, not a replacement of a prior pattern.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A new `testsupport.OpenPhase187Postgres` fixture (new file) is the right unit, rather than extending `phase108_contribution_sources_test.go`'s existing `openPhase108Pool` in place | Architecture Patterns / Pattern 1 | Low — either works; `phase108`'s fixture lives in `backend/internal/migrations` package (migration-focused), while repository/handler tests live in different packages and cannot import unexported test helpers from another package's `_test.go` file. A new `testsupport` fixture is the only way to share it across the `repository`/`handlers` test packages, so this is a structural near-certainty, not a loose guess — but confirm before locking Wave 0 tasks. |
| A2 | The dependents-check should be a pre-check (SELECT before write), not a caught DB-level FK error, so the import per-row continuation (D-12) doesn't need SAVEPOINTs | Common Pitfalls / Pitfall 1 | Medium — if the planner instead chooses to catch the FK error after a failed write, every per-row continuation test must also verify the transaction's write-set is correctly unwound (savepoint rollback), which is meaningfully more test surface than a pure pre-check approach implies. |
| A3 | A narrow interface seam for the dependents-check (fake-based handler tests) is preferable to real-Postgres-fixture-only handler tests | Architecture Patterns / Pattern 2 | Low — both are valid per CLAUDE.md; this is a recommendation, not a verified fact, and the planner may reasonably choose the fixture-only route instead (documented as an explicit alternative in the same section). |

## Open Questions (RESOLVED)

1. **Exact guard function signature / package placement**
   - What we know: the guard's core SQL needs access to `release_version_id` + candidate
     `fansub_group_id` and must query `release_role_credit_lifecycles`,
     `release_crew_snapshots`, `release_version_media`, `release_version_notes`.
   - What's unclear: whether this lives as one shared `repository` package function called by
     both `episode_version_repository_write_helpers.go` and
     `episode_import_repository_release_helpers.go`, or two call-site-specific wrappers around one
     shared low-level dependents-count function (given Pitfall 3's differing exception carve-outs).
   - Recommendation: one shared low-level `countReleaseVersionGroupDependents(ctx, tx, releaseVersionID, groupID) (DependencySummary, error)`, with each call site applying its own allow/block exception logic (same-group-update bypass for import, none for editor) around the shared count.
   - RESOLVED: see Plan 01 <architecture_decisions> (package placement + the unification insight that makes the same-group/add exception fall out of `diffRemovedReleaseVersionGroupIDs` with no special-casing).

2. **Whether "does the import reliably recognize an existing release" (D-12's Prüfauftrag) blocks test-writing for the rest of this phase**
   - What we know: D-12 explicitly asks this be investigated and reported, not silently fixed.
   - What's unclear: if the finding is "no, it does not reliably recognize existing releases",
     the per-row continuation tests in this research may need an additional fixture scenario
     (duplicate-detection false negative) that isn't yet scoped.
   - Recommendation: the planner should resolve this Prüfauftrag early (Wave 0) since it could
     change the shape of the import-path test fixtures needed.
   - RESOLVED: see Plan 05 Task 1 (D-12's Prüfauftrag is investigated and the finding documented as a code comment plus a named "Finding" section in 187-05-SUMMARY.md, not silently fixed).

## Environment Availability

Skipped — this phase has no new external tool/service dependency (pure Go + existing Postgres
dev container, unaffected).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Go `testing` + `github.com/stretchr/testify/require`, `net/http/httptest`, `gin.CreateTestContext` |
| Config file | none (no test framework config file in this Go stack) |
| Quick run command | `go test ./backend/internal/repository/... ./backend/internal/handlers/... -run <TestName> -v` |
| Full suite command | `go test ./backend/...` (requires `TEAM4S_PHASE187_TEST_DSN` + other `TEAM4S_PHASE*_TEST_DSN` env vars pointing at a disposable Postgres instance, per existing `testsupport` convention — confirm current CI/dev harness wiring before Wave 0) |

### Phase Requirements → Test Map

No formal `REQ-187-XX` IDs exist yet in `.planning/REQUIREMENTS.md` (this phase is additive,
pre-planning — see `.planning/STATE.md` Accumulated Context, "Phase 187 added"). The table below
maps CONTEXT.md's locked decisions (D-01..D-14) to concrete tests, since those are this phase's
de facto requirements until the planner assigns formal IDs.

| Decision | Behavior | Test Type | Target File (new) | Postgres Needed? |
|------|----------|-----------|-------------------|-------------------|
| D-01 | Group change allowed when nothing attached (Case A baseline) | integration | `repository/release_version_group_guard_test.go` | Yes — real fixture |
| D-02/D-10 | Server 409 with German per-kind breakdown when something attached (Case B/C) | handler (httptest+fake) | `handlers/episode_version_update_test.go` | No (fake) — or Yes if fixture-only route chosen (A3) |
| D-06/D-14 (editor) | Reducing to 0 groups rejected before any DELETE | repository unit (pure, no DB needed for the length check itself; DB needed to prove no row was deleted) | `repository/episode_version_repository_write_helpers_test.go` (new function, not the existing grep-style ones) | Yes, to prove no mutation occurred |
| D-06/D-14 (import) | Reducing to 0 groups rejected identically in import path | repository/handler | `repository/episode_import_repository_release_helpers_test.go` or handler equivalent | Yes |
| D-07 | Removing a partner group with dependents blocked same as sole-group case | integration | `repository/release_version_group_guard_test.go` | Yes |
| D-08 | Media/notes rows with this group's `fansub_group_id` count as attached (closes Case C orphan) | integration | `repository/release_version_group_guard_test.go` | Yes — needs new `release_version_media`/`release_version_notes` fixture tables |
| D-09 | Empty `inherited`-only snapshot does NOT count as attached | integration | `repository/release_version_group_guard_test.go` | Yes |
| D-11 | Guard applies regardless of `IsPlatformAdmin` (no bypass) | handler | `handlers/episode_version_update_test.go` (platform-admin identity, still 409 when dependents exist) | No (fake) or Yes |
| D-12 (same-group update always allowed) | Import re-applying identical group to existing release never blocked, even with dependents | integration/handler | `repository/episode_import_repository_release_helpers_test.go` | Yes |
| D-12 (per-row conflict, no batch abort) | One blocked row marked conflict, rest of batch succeeds, `result.Conflicts` incremented | handler/repository | `handlers/admin_episode_import_apply_conflict_test.go` | Yes (apply path is transactional against real schema) |
| D-13 | Merge path untouched (negative/absence check only) | absence check (CLAUDE.md-permitted exception) | n/a — grep is acceptable here per CLAUDE.md's explicit "Abwesenheits-Prüfungen" exception | No |

### Sampling Rate
- **Per task commit:** run the specific new test function(s) for that task
  (`go test ./backend/internal/... -run TestXxx -v`).
- **Per wave merge:** run `go test ./backend/internal/repository/... ./backend/internal/handlers/...`.
- **Phase gate:** full `go test ./backend/...` green before `/gsd:verify-work`, plus confirm no
  existing test in `episode_version_repository_write_helpers_test.go` /
  `episode_import_repository_apply_test.go` / `admin_episode_import_test.go` regressed.

### Wave 0 Gaps
- [ ] `backend/internal/testsupport/phase187_postgres.go` — new real-Postgres fixture (release
  tables + migration 0137 applied + new `release_version_media`/`release_version_notes` stand-ins)
- [ ] `TEAM4S_PHASE187_TEST_DSN` env var wiring confirmed available in the dev/CI Postgres
  container this project already uses for `TEAM4S_PHASE117_TEST_DSN` etc. (same mechanism,
  no new infra, but unconfirmed in this research pass — verify before Wave 1 tasks depend on it)
- [ ] Decide and document Pattern 2's interface-vs-fixture choice for handler tests (A3) before
  writing the first handler test, so all new handler tests follow one consistent approach
- [ ] Decide and document Pitfall 1's pre-check-vs-savepoint approach before writing the apply-loop
  continuation test, since the test's fixture setup differs meaningfully between the two

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V4 Access Control | Yes, but unchanged | Existing `IsPlatformAdmin` gate (`episode_version_update.go:92-99`) continues to gate who may even attempt a group PATCH; this phase adds a data-consistency guard layered *underneath* that gate, not a new authz dimension (D-11: the new guard applies even to platform admins — it is not a permission check) |
| V5 Input Validation | Yes | Candidate `fansub_group_id` values must already resolve via existing FK (`fansub_groups(id)`); the guard's dependents-count query must use parameterized SQL (standard `pgx` placeholder usage already universal in this codebase) — no new injection surface |
| V6 Cryptography | No | Not applicable to this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Confused-deputy via stale group-list diff (client sends a group list that silently drops a group with dependents, relying on client-only enforcement) | Tampering | D-10's server-side 409 enforcement is itself the mitigation — this is precisely why D-10 mandates server enforcement regardless of client UI state |
| Partial-batch data corruption (import apply partially commits one mapping's writes before hitting a later mapping's guard violation, if savepoints are mishandled) | Tampering / Repudiation | Pitfall 1's pre-check-before-write approach avoids this entirely by never writing a row that will be blocked; if savepoints are used instead, a dedicated rollback-correctness test is required |

## Sources

### Primary (HIGH confidence — direct repository reads, this session)
- `.planning/phases/187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel/187-CONTEXT.md` — full Ist-Analyse, D-01..D-14, live DB reproduction
- `backend/internal/migrations/phase108_contribution_sources_test.go:167-227` — real-Postgres fixture precedent (`openPhase108Pool`), confirms no existing RESTRICT/CASCADE guard test
- `backend/internal/testsupport/phase107_postgres.go`, `phase117_postgres.go`, `phase165_postgres.go` — fixture-harness naming/structure convention (DSN env, DB/schema regex, `ApplySQLFile`)
- `backend/internal/handlers/admin_content_episode_version_editor_context_test.go:24-194` — real-Postgres + httptest handler-test pattern (`evecFixtureHandler`/`evecFixtureRequest`)
- `backend/internal/handlers/admin_episode_import_ownership_test.go:1-193` — httptest + guard-function-direct-call pattern, status/body assertions
- `backend/internal/handlers/admin_capability_impact_handler_test.go:1-60` — fake-interface + httptest handler-test pattern
- `backend/internal/handlers/episode_version_update.go:1-99` — current sentinel-error → status-code chain, current fall-through to generic 500
- `backend/internal/repository/episode_import_repository_apply.go:1-135` — confirms single whole-batch transaction, hard abort on any mapping error
- `backend/internal/models/episode_import.go:3-211` — `EpisodeImportMappingStatusConflict` enum value and `EpisodeImportApplyResult.Conflicts` field, both confirmed unused/underused by `grep`
- `backend/internal/repository/episode_version_repository_write_helpers_test.go:1-93` — confirmed source-grep anti-pattern present in this exact package (CLAUDE.md-flagged Altlast)
- `backend/internal/handlers/admin_content_anime_relations.go:172` — 409 envelope shape precedent (`message` + `code`)

### Secondary / Tertiary
None used — all findings this round came directly from the local codebase (primary source), no
external docs or web search were needed for this narrowly-scoped test-architecture question.

## Metadata

**Confidence breakdown:**
- Test harness/fixture pattern: HIGH — read multiple working precedents directly (`phase107/117/165_postgres.go`, `phase108_contribution_sources_test.go`)
- Handler test pattern (fake vs fixture): HIGH for both options existing as valid precedent; MEDIUM on which the planner should pick (flagged as Assumption A3, explicit alternative documented)
- Per-row batch continuation design: HIGH that it's currently broken/missing (confirmed by reading the actual loop); MEDIUM on the exact mechanism (pre-check vs savepoint — flagged as Assumption A2)

**Research date:** 2026-10-19
**Valid until:** Low churn risk — these are internal test-infrastructure conventions in a
brownfield repo, not externally versioned APIs. Treat as valid until this phase is planned
(no 30-day decay expected before then).
