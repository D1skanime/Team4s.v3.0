---
phase: quick-260924-dso
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - database/migrations/0171_fansub_group_kuerzel.up.sql
  - database/migrations/0171_fansub_group_kuerzel.down.sql
  - backend/internal/models/fansub.go
  - backend/internal/repository/fansub_repository.go
  - backend/internal/repository/errors.go
  - backend/internal/testsupport/phase167_postgres.go
  - backend/internal/handlers/fansub_group_patch_validation.go
  - backend/internal/handlers/fansub_groups.go
  - backend/internal/handlers/fansub_group_aliases.go
  - backend/internal/handlers/fansub_test.go
  - backend/internal/repository/phase167_fansub_kuerzel_conflict_test.go
  - backend/internal/repository/fansub_group_match.go
  - backend/internal/models/fansub_group_match.go
  - backend/internal/models/episode_import.go
  - backend/internal/repository/phase167_fansub_kuerzel_detection_test.go
  - frontend/src/types/episodeImport.ts
  - frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.tsx
  - frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.test.tsx
  - frontend/src/types/fansub.ts
  - frontend/src/app/admin/fansubs/[id]/edit/fansubEditTypes.ts
  - frontend/src/app/admin/fansubs/[id]/edit/fansubEditFormMapping.ts
  - frontend/src/app/admin/fansubs/[id]/edit/FansubGroupKuerzelField.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.test.tsx
  - frontend/src/app/admin/fansubs/fansubListSort.ts
  - frontend/src/app/admin/fansubs/fansubListSort.test.ts
  - frontend/src/app/admin/fansubs/FansubSortHeaderCell.tsx
  - frontend/src/app/admin/fansubs/page.tsx
  - frontend/src/app/admin/fansubs/page.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.test.tsx
  - .planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md
autonomous: true
requirements: [QUICK-260924-DSO-05, QUICK-260924-DSO-06, QUICK-260924-DSO-07]
user_setup: []

must_haves:
  truths:
    - "GAP-05: Jede Fansub-Gruppe hat ein optionales Kürzel-Feld (Stammdatum), editierbar direkt neben dem Namen auf der Gruppen-Bearbeitungsseite, sichtbar und sortierbar als Spalte in /admin/fansubs; ein Kürzel ist systemweit eindeutig (gegen Kürzel UND Alias anderer Gruppen, in derselben Normalform wie fansub_group_aliases.normalized_alias) und ein Konflikt liefert HTTP 409 mit dem Namen der bereits besitzenden Gruppe statt stillem Überschreiben."
    - "GAP-05: Die Import-Erkennung prüft in genau dieser Reihenfolge Kürzel -> Name -> Slug -> Alias, in EINER gebündelten Abfrage (kein N+1), und der Herkunftshinweis benennt die Trefferquelle korrekt inklusive 'Kürzel'."
    - "GAP-06: Die Alias-Zeile in der Gruppen-Bearbeitung zeigt standardmäßig nur Alias-Text, Erstellungsdatum und die zwei Aktionen 'Umhängen…'/Löschen; das Ziel-Gruppen-Dropdown ist erst nach Klick auf 'Umhängen…' inline sichtbar (mit 'Übernehmen'/'Abbrechen') und klappt danach wieder ein."
    - "GAP-07: Aliase und Kürzel werden überall exakt in der eingegebenen bzw. aus dem Dateinamen gelernten Schreibweise angezeigt; Normalisierung wird ausschließlich intern für Vergleiche verwendet, nie für die Anzeige."
    - "Migration 0171 ist additiv (keine UPDATE/INSERT/DELETE an Bestandsdaten), gegen team4s_v2 angewendet; Backend- und Frontend-Container laufen danach mit neuerem Start-Zeitpunkt; kein git push; kein git stash."
  artifacts:
    - path: "database/migrations/0171_fansub_group_kuerzel.up.sql"
      provides: "fansub_groups.kuerzel (VARCHAR(32), nullable) + fansub_groups.normalized_kuerzel (VARCHAR(32), nullable) + partieller UNIQUE-Index auf normalized_kuerzel; kein Backfill."
    - path: "backend/internal/repository/fansub_repository.go"
      provides: "findFansubKuerzelOwner/findFansubKuerzelOrAliasOwner (owner-benannte Konfliktprüfung), verdrahtet in CreateAlias und UpdateGroup; kuerzel in allen fansub_groups-Lese-/Schreibpfaden."
    - path: "backend/internal/repository/fansub_group_match.go"
      provides: "buildFansubGroupBatchMatchQuery mit vierter Tier-Stufe kuerzel_hits/kuerzel_resolved, Präzedenz kuerzel > alias > name > slug, weiterhin genau EINE Query."
    - path: "frontend/src/app/admin/fansubs/[id]/edit/FansubGroupKuerzelField.tsx"
      provides: "Kürzel-Eingabefeld (@/components/ui FormField/Input) neben dem Namensfeld, ohne FansubBasicInfoTab.tsx über 450 Zeilen zu vergrößern."
    - path: "frontend/src/app/admin/fansubs/fansubListSort.ts"
      provides: "compareFansubListItems inkl. Kürzel-Sortierschlüssel, extrahiert aus page.tsx, damit page.tsx durch die neue Spalte nicht netto wächst."
    - path: "frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx"
      provides: "Alias-Zeile mit eingeklapptem Umhängen-Bereich (Default) und Expand/Collapse über 'Umhängen…'/'Übernehmen'/'Abbrechen'."
    - path: ".planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md"
      provides: "GAP-05..GAP-07 als neue Einträge, status: resolved nach Verifikation."
  key_links:
    - from: "backend/internal/handlers/fansub_groups.go (UpdateFansub)"
      to: "repository.ConflictOwnerError"
      via: "errors.As auf den UpdateGroup-Fehler, HTTP 409 mit Gruppennamen"
      pattern: "ConflictOwnerError"
    - from: "backend/internal/repository/fansub_group_match.go (buildFansubGroupBatchMatchQuery)"
      to: "fansub_groups.normalized_kuerzel"
      via: "neue kuerzel_hits-CTE vor alias_hits"
      pattern: "kuerzel_hits"
    - from: "frontend/src/app/admin/fansubs/page.tsx"
      to: "frontend/src/app/admin/fansubs/fansubListSort.ts"
      via: "compareFansubListItems(sortKey, sortDirection, left, right) im sortedItems useMemo"
      pattern: "compareFansubListItems"
    - from: "frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx"
      to: "reassigningAliasID state"
      via: "bedingtes Rendern von Select/Übernehmen/Abbrechen nur wenn row.id === reassigningAliasID"
      pattern: "reassigningAliasID"
---

<objective>
Drei verbindliche Auftraggeber-Entscheidungen aus dem fansub.de-Review (Live-UAT-Folgeauftrag zu
Phase 167) umsetzen, dokumentiert als GAP-05..GAP-07 in `167-UAT.md`:

- GAP-05: Das Gruppenkürzel wird ein echtes Stammdatum der Fansub-Gruppe (eigene Spalte,
  systemweit eindeutig gegen Kürzel UND Alias anderer Gruppen, editierbar in der
  Gruppenverwaltung, sichtbar/sortierbar in der Gruppenliste), und die Import-Erkennung prüft
  künftig in der Reihenfolge Kürzel -> Name -> Slug -> Alias statt nur Alias -> Name -> Slug.
- GAP-06: Die Alias-Zeile in der Gruppen-Bearbeitung wird beruhigt -- das Ziel-Gruppen-Dropdown
  ist nicht mehr dauerhaft sichtbar, sondern klappt erst nach "Umhängen…" auf.
- GAP-07: Aliase und (künftig) Kürzel werden überall exakt in der Original-Schreibweise
  angezeigt; Normalisierung bleibt rein intern für Vergleiche.

Purpose: Diese drei Punkte sind bindende Produktentscheidungen aus einem Referenz-Review
(fansub.de), keine offenen Fragen -- Scope ist exakt wie oben beschrieben, keine Erweiterung
(z. B. kein Kürzel-Feld auf der Anlegen-Seite, keine Public-Profil-Änderung).

Output: Additive DB-Migration, owner-benannte 409-Konfliktprüfung (Kürzel vs. Kürzel, Kürzel vs.
Alias, Alias vs. Kürzel), vierstufige Import-Erkennung (Kürzel/Name/Slug/Alias) in weiterhin
genau einer Query, editierbares Kürzel-Feld + sortierbare Kürzel-Spalte im Admin, beruhigte
Alias-Zeile, Original-Schreibweisen-Audit, `167-UAT.md` aktualisiert, Migration gegen
`team4s_v2` angewendet, beide Container neu gebaut/neu gestartet.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@.planning/phases/167-fansub-gruppenerkennung-beim-import/167-CONTEXT.md
@.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md

<critical_gotcha>
The dev backend container (team4sv30-backend) runs via air with docker compose watch live-syncing
./backend into /app. If docker compose watch is not actively running, `docker exec team4sv30-backend
... go test` can silently run against a stale build-time-baked copy of the source. Before trusting
any `docker exec team4sv30-backend ... go test` result, either confirm `docker compose watch` is
running, or `docker cp` every edited/created backend file into the container first. Prefer the
scratch-container pattern used throughout 167-02/167-06 (`docker run --rm -v
/home/d1sk/team4s/backend:/app -w /app -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache -e
GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache --network team4s_default golang:1.25-alpine ...`)
for build/vet/test verification throughout this plan -- it always reads the current host files, no
live-sync ambiguity. Reserve `docker exec team4sv30-backend` for the final deploy step only.
</critical_gotcha>

<interfaces>
Existing normalization (DO NOT reinvent a third copy -- reuse these two, one per package):
- handlers package: `normalizeFansubAliasKey(raw string) string` in
  backend/internal/handlers/fansub_aliases.go (lowercase, keep only a-z0-9).
- repository package: `normalizeAliasKey(raw string) string` in
  backend/internal/repository/fansub_repository.go (byte-identical algorithm, already what
  produces every existing `normalized_alias` value). Use this one for the Kürzel-side
  normalization computed inside FansubRepository.UpdateGroup.

Current fansub_group_aliases uniqueness (database/migrations/0014_fansub_group_aliases.up.sql):
  normalized_alias VARCHAR(120) NOT NULL, CONSTRAINT uq_fansub_group_aliases_normalized_alias
  UNIQUE (normalized_alias). This plan's Kürzel normalization MUST land in the exact same
  normalized form (i.e. `normalizeAliasKey`/`normalizeFansubAliasKey` applied to the raw Kürzel),
  so a direct string-equality comparison against `normalized_alias` is valid -- no f_unaccent/SQL
  normalization needed for the Go-side conflict checks (those are plain `=` comparisons against
  already-Go-normalized values). The batch MATCH query in fansub_group_match.go is a different,
  pre-existing concern: it normalizes filename-derived raw candidates via SQL
  (`regexp_replace(lower(f_unaccent(...)), '[^a-z0-9]+', '', 'g')`) to compare against those same
  stored normalized_alias/normalized_kuerzel values -- keep that SQL-side expression exactly as
  the existing tiers already use it, do not change it.

Current models.FansubGroup (backend/internal/models/fansub.go, ~36-63): add `Kuerzel *string
  \`json:"kuerzel,omitempty"\`` immediately after the `Name string` field.

Current models.FansubGroupPatchInput (backend/internal/models/fansub.go, ~212-227): add `Kuerzel
  OptionalString \`json:"kuerzel"\`` (same OptionalString pattern as every other field).
  models.FansubGroupCreateInput is intentionally NOT touched -- Kürzel is edit-page-only per the
  locked decision (no create-page scope).

New DTO to add in backend/internal/models/fansub.go, next to FansubGroupCreateInput:
  type FansubGroupConflictOwner struct { ID int64; Name string }

New sentinel error to add in backend/internal/repository/errors.go:
  type ConflictOwnerError struct { OwnerGroupID int64; OwnerGroupName string }
  func (e *ConflictOwnerError) Error() string { return fmt.Sprintf("normalized value already
    belongs to fansub group %d (%s)", e.OwnerGroupID, e.OwnerGroupName) }
  (add "fmt" to that file's imports.)

Current UpdateGroup RETURNING/Scan column list (fansub_repository.go, ~677-715), current
CreateGroup RETURNING/Scan (~110-169), current GetGroupByID (~172-213), current GetGroupBySlug
(~215-256), current scanFansubGroup (~1589-1615) -- all five share IDENTICAL column order:
  id, slug, name, logo_id, banner_id, logo_url, banner_url, founded_year, dissolved_year,
  closed_year, status, group_type, website_url, discord_url, irc_url, country, created_at,
  updated_at
Add `kuerzel` to the SELECT/RETURNING column list right after `name` in ALL FIVE places, and add
`&item.Kuerzel` to the corresponding Scan() call right after `&item.Name` in all five. Do NOT
touch GetPublicProfileBySlug / the public-profile load path (getPublicGroupBase and friends,
~258+) -- Kürzel is admin-only, out of scope for the public profile.

Current FansubRepository.CreateAlias (fansub_repository.go, ~993-1028): inserts
  (fansubID, input.Alias, input.NormalizedAlias); on isUniqueViolation returns the existing
  (unnamed-owner) ErrConflict -- that alias-vs-alias path stays UNCHANGED. Add a NEW check before
  the insert (see Task 2).

Current requiredFansubGroupPatchActions (fansub_groups.go, ~332-358): the existing line
  `if input.Name.Set || input.Country.Set { add(permissions.ActionFansubGroupPageGeneralEdit) }`
  becomes `if input.Name.Set || input.Country.Set || input.Kuerzel.Set { ... }` -- same
  permission tier as Name/Country, zero new lines.

Current hasAnyFansubGroupPatchField (fansub_group_patch_validation.go, ~111-126): add
  `|| req.Kuerzel.Set` to the existing OR-chain.

Current buildFansubGroupBatchMatchQuery (fansub_group_match.go, ~33-107) tier structure:
  alias_hits (top tier, no exclusion) -> alias_resolved (hit_count=1)
  name_hits (WHERE row_ord NOT IN alias_resolved) -> name_resolved
  slug_hits (WHERE row_ord NOT IN alias_resolved AND NOT IN name_resolved) -> slug_resolved
  final: UNION ALL of the three _resolved sets, tagged 'alias'/'name'/'slug', ORDER BY row_ord.
New target shape (kuerzel becomes the TOP tier, everything below gets one more exclusion):
```sql
WITH candidates AS (
	SELECT c.row_ord, c.raw_group
	FROM unnest($1::text[]) WITH ORDINALITY AS c(raw_group, row_ord)
),
kuerzel_hits AS (
	SELECT
		candidates.row_ord, candidates.raw_group,
		fansub_groups.id AS group_id, fansub_groups.name AS group_name,
		fansub_groups.slug AS group_slug,
		COUNT(*) OVER (PARTITION BY candidates.row_ord) AS hit_count
	FROM candidates
	JOIN fansub_groups
		ON fansub_groups.normalized_kuerzel = regexp_replace(lower(f_unaccent(candidates.raw_group)), '[^a-z0-9]+', '', 'g')
),
kuerzel_resolved AS (
	SELECT row_ord, raw_group, group_id, group_name, group_slug
	FROM kuerzel_hits WHERE hit_count = 1
),
alias_hits AS (
	-- same JOIN as today, PLUS: WHERE candidates.row_ord NOT IN (SELECT row_ord FROM kuerzel_resolved)
	...
),
alias_resolved AS ( ... unchanged ... ),
name_hits AS (
	-- WHERE candidates.row_ord NOT IN (SELECT row_ord FROM kuerzel_resolved)
	--   AND candidates.row_ord NOT IN (SELECT row_ord FROM alias_resolved)
	...
),
name_resolved AS ( ... unchanged ... ),
slug_hits AS (
	-- add a third: AND candidates.row_ord NOT IN (SELECT row_ord FROM kuerzel_resolved)
	...
),
slug_resolved AS ( ... unchanged ... )
SELECT row_ord, raw_group, group_id, group_name, group_slug, 'kuerzel' AS matched_via,
  NULL::bigint AS alias_id, NULL::text AS alias_text FROM kuerzel_resolved
UNION ALL
SELECT ..., 'alias' AS matched_via, alias_id, alias_text FROM alias_resolved
UNION ALL
SELECT ..., 'name' AS matched_via, NULL::bigint, NULL::text FROM name_resolved
UNION ALL
SELECT ..., 'slug' AS matched_via, NULL::bigint, NULL::text FROM slug_resolved
ORDER BY row_ord
```
Update the function's doc comment: "Tier precedence is kuerzel > alias > name > slug" (was
"alias > name > slug"). models.FansubGroupMatch.MatchedVia doc comment (models/fansub_group_match.go,
~13-14): "one of alias, name, slug" -> "one of kuerzel, alias, name, slug".
models.EpisodeImportFansubGroupMatchOrigin doc comment (models/episode_import.go, ~73): same
"(alias/name/slug)" -> "(kuerzel/alias/name/slug)" wording update, no field/type change needed
(MatchedVia is already a plain `string`, not a Go-level enum).

frontend/src/types/episodeImport.ts, ~84: `matched_via: 'alias' | 'name' | 'slug'` ->
  `matched_via: 'alias' | 'name' | 'slug' | 'kuerzel'`.

frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.tsx, ~12-16:
  const MATCHED_VIA_LABELS: Record<'alias' | 'name' | 'slug', string> = { alias: 'Alias', name:
  'Name', slug: 'Slug' } -> add `'kuerzel'` to both the Record key union and the object:
  `kuerzel: 'Kürzel'`. This is the ONLY change needed in this file for GAP-05's Herkunftshinweis
  requirement -- the existing render logic at ~99-106 already does
  `MATCHED_VIA_LABELS[origin.matched_via]` generically, no branch-specific code to touch.
  GAP-07 requires no change here: `origin.raw`/`origin.group_name` are already rendered verbatim
  (no .toUpperCase()/.toLowerCase() anywhere in this file -- verified, none exist).

frontend/src/types/fansub.ts, FansubGroup interface ~21-46: add `kuerzel?: string | null;`
  immediately after `name: string;`. FansubGroupPatchRequest interface ~326-341: add
  `kuerzel?: string | null;` immediately after `name?: string | null;`.

frontend/src/app/admin/fansubs/[id]/edit/fansubEditTypes.ts, FormState ~36-47: add
  `kuerzel: string;` immediately after `name: string;`.

frontend/src/app/admin/fansubs/[id]/edit/fansubEditFormMapping.ts: mapGroupToForm (~15-31) add
  `kuerzel: group.kuerzel || "",` after `name: group.name || "",`. emptyForm (~124-137) add
  `kuerzel: "",` after `name: "",`. formToPayload (~103-122), inside the existing
  `if (options.includeGeneral !== false) { payload.name = ...; payload.country = ...; }` block,
  add `payload.kuerzel = form.kuerzel.trim() ? form.kuerzel.trim() : null;` -- same permission
  tier as name/country, zero new `if` blocks.

Current FansubBasicInfoTab.tsx name field block (~94-121): the Kürzel field must render directly
  after this block's closing `</div>` and before the Slug conditional block (~122). This file is
  already at 440 lines (project ceiling 450) -- the insertion here MUST be a single compact call
  to the new FansubGroupKuerzelField component (Task 4), not inline FormField/Input markup.

Current page.tsx locations for Task 5: type SortKey line ~37; statusRank/periodValue functions
  ~66-76; sortedItems useMemo body ~175-196; mobile sort <select> options ~482-484; the three
  sortable TableHeaderCell blocks ~579-621 (name/status/period) plus the plain
  `<TableHeaderCell>Slug</TableHeaderCell>` at ~593; desktop row TableCell block ~640-707 (name
  at ~650, slug at ~653-667, status at ~668-674). page.tsx is already at 845 lines (already over
  the 450-line guideline, legacy debt per CLAUDE.md) -- Task 5 MUST NOT increase this file's line
  count; extracting the sort comparator and the repeated header-cell markup into
  fansubListSort.ts/FansubSortHeaderCell.tsx is the mechanism, not optional polish.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Migration + FansubGroup model field + repository column wiring (GAP-05 foundation)</name>
  <files>database/migrations/0171_fansub_group_kuerzel.up.sql, database/migrations/0171_fansub_group_kuerzel.down.sql, backend/internal/models/fansub.go, backend/internal/repository/fansub_repository.go, backend/internal/testsupport/phase167_postgres.go</files>
  <action>
    Create database/migrations/0171_fansub_group_kuerzel.up.sql: ALTER TABLE fansub_groups ADD
    COLUMN kuerzel VARCHAR(32) (nullable, no default); ADD COLUMN normalized_kuerzel VARCHAR(32)
    (nullable, no default, internal-only -- never exposed via JSON); CREATE UNIQUE INDEX
    uq_fansub_groups_normalized_kuerzel ON fansub_groups (normalized_kuerzel) WHERE
    normalized_kuerzel IS NOT NULL (partial index so multiple NULLs -- groups without a Kürzel
    yet -- are allowed). No UPDATE/INSERT/DELETE against existing rows anywhere in this file --
    purely additive, per the locked "no backfill" decision. Create the matching down.sql: DROP
    INDEX IF EXISTS uq_fansub_groups_normalized_kuerzel, then DROP COLUMN IF EXISTS
    normalized_kuerzel, then DROP COLUMN IF EXISTS kuerzel.

    In backend/internal/models/fansub.go, add the `Kuerzel *string` field to FansubGroup, the
    `FansubGroupConflictOwner` struct, and the `Kuerzel OptionalString` field on
    FansubGroupPatchInput exactly as specified in the interfaces block. Do NOT touch
    FansubGroupCreateInput (out of scope).

    In backend/internal/repository/fansub_repository.go, add `kuerzel` to the SELECT/RETURNING
    column list and `&item.Kuerzel` to the Scan() call in all five places named in the interfaces
    block (ListGroups' shared scanFansubGroup helper, CreateGroup, GetGroupByID, GetGroupBySlug,
    UpdateGroup). UpdateGroup's actual Kürzel-writing logic (the new conflict-checked
    `if input.Kuerzel.Set { ... }` assignment block) is Task 2's job -- this task only makes the
    column round-trip through every READ path and keeps UpdateGroup's RETURNING/Scan compiling.

    In backend/internal/testsupport/phase167_postgres.go, extend createPhase167Prerequisites'
    inline CREATE TABLE fansub_groups statement with the same two nullable columns (kuerzel
    VARCHAR(32), normalized_kuerzel VARCHAR(32)) plus a matching partial unique index on
    normalized_kuerzel (WHERE normalized_kuerzel IS NOT NULL) -- mirror the real migration's
    shape exactly, keeping this fixture's existing minimal-mirror philosophy.
  </action>
  <verify>
    <automated>docker run --rm -v /home/d1sk/team4s/backend:/app -w /app -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache --network team4s_default golang:1.25-alpine sh -c "go build ./... && go vet ./..." && ! grep -iE '\b(update|insert into|delete from)\b' /home/d1sk/team4s/database/migrations/0171_fansub_group_kuerzel.up.sql</automated>
  </verify>
  <done>go build/go vet clean; FansubGroup carries Kuerzel *string; all five fansub_groups read
  paths select/scan the new column; migration up.sql contains zero UPDATE/INSERT/DELETE
  statements; the phase167 test fixture mirrors the real migration's two new nullable columns
  plus the partial unique index.</done>
</task>

<task type="auto">
  <name>Task 2: Kürzel uniqueness cross-check + owner-named 409 conflicts (GAP-05)</name>
  <files>backend/internal/repository/errors.go, backend/internal/repository/fansub_repository.go, backend/internal/handlers/fansub_group_patch_validation.go, backend/internal/handlers/fansub_groups.go, backend/internal/handlers/fansub_group_aliases.go, backend/internal/handlers/fansub_test.go, backend/internal/repository/phase167_fansub_kuerzel_conflict_test.go</files>
  <action>
    In backend/internal/repository/errors.go, add the `ConflictOwnerError` type exactly as
    specified in the interfaces block (add "fmt" to imports).

    In backend/internal/repository/fansub_repository.go, add two new methods on
    *FansubRepository: `findFansubKuerzelOwner(ctx, normalizedValue string, excludeGroupID
    int64) (*models.FansubGroupConflictOwner, error)` -- a single `SELECT id, name FROM
    fansub_groups WHERE normalized_kuerzel = $1 AND id <> $2 LIMIT 1` scanned into
    models.FansubGroupConflictOwner, returning (nil, nil) on pgx.ErrNoRows; and
    `findFansubKuerzelOrAliasOwner(ctx, normalizedValue string, excludeGroupID int64)
    (*models.FansubGroupConflictOwner, error)` -- a UNION of that same fansub_groups.
    normalized_kuerzel check with a second branch joining fansub_group_aliases to fansub_groups
    on `a.normalized_alias = $1 AND a.fansub_group_id <> $2`, LIMIT 1 on the union, same
    ErrNoRows-to-nil handling. Both use plain `=` comparisons (the caller passes an
    already-normalized value, no SQL-side f_unaccent/regexp needed here).

    Wire findFansubKuerzelOwner into CreateAlias: call it with (input.NormalizedAlias, fansubID)
    BEFORE the existing INSERT; if it returns a non-nil owner, return
    `&ConflictOwnerError{OwnerGroupID: owner.ID, OwnerGroupName: owner.Name}` immediately. Leave
    the existing INSERT/isUniqueViolation/ErrConflict alias-vs-alias path completely unchanged
    below that.

    Wire findFansubKuerzelOrAliasOwner into UpdateGroup: add a new `if input.Kuerzel.Set { ... }`
    block (same position/style as the existing Country block). When input.Kuerzel.Value is
    non-nil, compute `normalized := normalizeAliasKey(*input.Kuerzel.Value)`; when normalized is
    non-empty, call findFansubKuerzelOrAliasOwner(ctx, normalized, id) and return
    `&ConflictOwnerError{...}` immediately on a hit -- BEFORE appending anything to
    assignments/args, so a conflicting request writes nothing. On no conflict (or a nil/empty
    Kürzel, i.e. clearing the field), append two SET clauses in sequence: `kuerzel = $N` bound to
    input.Kuerzel.Value, then `normalized_kuerzel = $N+1` bound to the computed normalized
    *string (nil when clearing). The existing post-Scan `isUniqueViolation(err) -> ErrConflict`
    fallback stays as the last-resort DB-level race guard, unchanged.

    In backend/internal/handlers/fansub_group_patch_validation.go, add Kürzel handling to
    validateFansubGroupPatchRequest: `if req.Kuerzel.Set { req.Kuerzel.Value =
    normalizeNullableString(req.Kuerzel.Value); if req.Kuerzel.Value != nil &&
    len([]rune(*req.Kuerzel.Value)) > 32 { return models.FansubGroupPatchInput{}, "ungültiger
    kuerzel parameter" } }` (same style as the adjacent Country block). Extend
    hasAnyFansubGroupPatchField's OR-chain with `|| req.Kuerzel.Set`.

    In backend/internal/handlers/fansub_groups.go: extend requiredFansubGroupPatchActions'
    existing Name/Country line to also include `|| input.Kuerzel.Set` (same
    ActionFansubGroupPageGeneralEdit tier). Add "fmt" to imports. In UpdateFansub's error
    handling (after the h.fansubRepo.UpdateGroup call), add a new branch BEFORE the existing
    `errors.Is(err, repository.ErrConflict)` branch: declare `var ownerErr
    *repository.ConflictOwnerError`; if `errors.As(err, &ownerErr)` respond HTTP 409 with
    message `fmt.Sprintf("Kürzel gehört bereits zu %s.", ownerErr.OwnerGroupName)` and return.

    In backend/internal/handlers/fansub_group_aliases.go: add "fmt" to imports. In
    CreateFansubAlias's error handling, add the same `errors.As(err, &ownerErr)` branch BEFORE
    the existing generic ErrConflict branch, with message `fmt.Sprintf("Alias entspricht bereits
    dem Kürzel von %s.", ownerErr.OwnerGroupName)`. Do NOT change ReassignFansubAlias or
    DeleteFansubAlias -- reassigning an existing alias never changes its text, so it cannot newly
    collide with a Kürzel.

    In backend/internal/handlers/fansub_test.go, add one new test case near the existing
    TestValidateFansubGroupPatchRequest_* tests proving a 33-rune Kürzel is rejected with
    "ungültiger kuerzel parameter" and a whitespace-padded, <=32-rune Kürzel is accepted trimmed
    (call validateFansubGroupPatchRequest directly, no DB).

    Create backend/internal/repository/phase167_fansub_kuerzel_conflict_test.go (package
    repository, reusing testsupport.OpenPhase167Postgres and insertPhase167Group from
    phase167_fansub_match_test.go in the same package) with five real-Postgres cases: (a)
    UpdateGroup sets a fresh, unique Kürzel successfully and GetGroupByID reflects it; (b)
    UpdateGroup(groupB, Kürzel equal to groupA's already-set Kürzel in a DIFFERENT casing)
    returns a *repository.ConflictOwnerError naming groupA; (c) UpdateGroup(groupB, Kürzel equal
    to groupA's existing alias text) returns a *ConflictOwnerError naming groupA; (d)
    CreateAlias(groupB, alias equal to groupA's existing Kürzel) returns a *ConflictOwnerError
    naming groupA; (e) UpdateGroup(groupA, Kürzel equal to groupA's OWN existing alias text)
    succeeds without conflict (proves the "another group's" exclusion is not a blanket
    same-value ban). Use `errors.As` to assert the concrete error type and its
    OwnerGroupID/OwnerGroupName fields in cases (b)-(d), not just error presence.
  </action>
  <verify>
    <automated>docker run --rm -v /home/d1sk/team4s/backend:/app -w /app -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache --network team4s_default -e TEAM4S_PHASE167_TEST_DSN='postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase167_test_1?sslmode=disable' golang:1.25-alpine sh -c "go build ./... && go vet ./... && go test ./internal/handlers/... ./internal/repository/... -run 'TestValidateFansubGroupPatchRequest|FansubGroupKuerzelUniqueness' -v"</automated>
  </verify>
  <done>go build/go vet clean; validation rejects >32-rune Kürzel; all five real-DB conflict
  cases pass (kuerzel-vs-kuerzel, kuerzel-vs-alias, alias-vs-kuerzel each naming the correct
  owning group, plus the same-group non-conflict case); CreateFansubAlias/UpdateFansub return
  HTTP 409 with a group-naming message on the new conflict paths, unchanged generic message on
  the pre-existing alias-vs-alias path.</done>
</task>

<task type="auto">
  <name>Task 3: Detection order extension (Kürzel tier) + Herkunftshinweis label (GAP-05)</name>
  <files>backend/internal/repository/fansub_group_match.go, backend/internal/models/fansub_group_match.go, backend/internal/models/episode_import.go, backend/internal/repository/phase167_fansub_kuerzel_detection_test.go, frontend/src/types/episodeImport.ts, frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.tsx, frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.test.tsx</files>
  <action>
    In backend/internal/repository/fansub_group_match.go, rewrite buildFansubGroupBatchMatchQuery
    to the target shape in the interfaces block: add a `kuerzel_hits`/`kuerzel_resolved` pair as
    the new TOP tier (joining fansub_groups.normalized_kuerzel against the same SQL-side
    normalization expression the other tiers already use, no exclusion of its own since it is
    now first); give the existing `alias_hits` a new `WHERE candidates.row_ord NOT IN (SELECT
    row_ord FROM kuerzel_resolved)` clause (it had none before -- it was the top tier); extend
    `name_hits`'s existing NOT IN clause with a second `AND ... NOT IN (SELECT row_ord FROM
    kuerzel_resolved)`; extend `slug_hits`'s existing two NOT IN clauses with a third against
    kuerzel_resolved; add a new `SELECT ..., 'kuerzel' AS matched_via, NULL::bigint, NULL::text
    FROM kuerzel_resolved` branch to the final UNION ALL. Update the function's doc comment's
    precedence sentence to "kuerzel > alias > name > slug". Do not touch
    buildFansubGroupSuggestionQuery, resolveFansubGroupMatches, or suggestSimilarFansubGroups --
    only the query TEXT this one function returns changes; the query remains exactly ONE
    statement per call (D-08/D-20 constant-query-budget is unaffected -- the existing
    TestResolveFansubGroupMatches_ConstantQueryBudget test stays green unmodified).

    In backend/internal/models/fansub_group_match.go, update FansubGroupMatch.MatchedVia's doc
    comment per the interfaces block. In backend/internal/models/episode_import.go, update
    EpisodeImportFansubGroupMatchOrigin's doc comment the same way (comment-only in both files).

    Create backend/internal/repository/phase167_fansub_kuerzel_detection_test.go (package
    repository, reusing testsupport.OpenPhase167Postgres + insertPhase167Group): (a)
    TestResolveFansubGroupMatches_KuerzelTierPrecedence -- seed groupA with Name "BDnP" and
    groupB with Kürzel "BDnP" (two DIFFERENT groups, deliberately colliding text across tiers);
    resolving candidate "BDnP" through resolveFansubGroupMatches must return exactly one match
    for groupB with MatchedVia "kuerzel" (kuerzel beats name); (b)
    TestResolveFansubGroupMatches_KuerzelCoexistsWithOtherTiers -- seed one group resolvable only
    via Kürzel, a second only via an alias, a third only via Name, a fourth only via Slug, then
    resolve all four candidates in a SINGLE resolveFansubGroupMatches call and assert each
    reports its own correct MatchedVia ("kuerzel"/"alias"/"name"/"slug") and correct GroupID --
    the regression proof that the new top tier did not disturb the other three.

    In frontend/src/types/episodeImport.ts, extend the `matched_via` union with `| 'kuerzel'`.

    In FansubGroupOriginHint.tsx, extend MATCHED_VIA_LABELS' key union and object with
    `kuerzel: 'Kürzel'` -- the only code change needed in this file (existing render logic
    already looks up MATCHED_VIA_LABELS[origin.matched_via] generically and already renders
    origin.raw/origin.group_name verbatim with no case transformation).

    In FansubGroupOriginHint.test.tsx, read the file first to match its existing origin-row
    fixture shape exactly, then add one new test case: a row whose fansub_group_match_origin has
    matched_via: 'kuerzel' renders the origin hint text containing "(Kürzel)" -- mirror whichever
    existing alias/name/slug-labeled test case in this file is structurally closest.
  </action>
  <verify>
    <automated>docker run --rm -v /home/d1sk/team4s/backend:/app -w /app -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache --network team4s_default -e TEAM4S_PHASE167_TEST_DSN='postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase167_test_1?sslmode=disable' golang:1.25-alpine go test ./internal/repository/... -run TestResolveFansubGroupMatches -v && docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.test.tsx'"</automated>
  </verify>
  <done>go build/go vet clean; TestResolveFansubGroupMatches_KuerzelTierPrecedence proves kuerzel
  beats name; TestResolveFansubGroupMatches_KuerzelCoexistsWithOtherTiers proves all four tiers
  resolve correctly in one call; FansubGroupOriginHint.test.tsx's new 'kuerzel' case passes
  alongside all pre-existing alias/name/slug cases unchanged.</done>
</task>

<task type="auto">
  <name>Task 4: Kürzel field on the fansub group edit page (GAP-05)</name>
  <files>frontend/src/types/fansub.ts, frontend/src/app/admin/fansubs/[id]/edit/fansubEditTypes.ts, frontend/src/app/admin/fansubs/[id]/edit/fansubEditFormMapping.ts, frontend/src/app/admin/fansubs/[id]/edit/FansubGroupKuerzelField.tsx, frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx, frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.test.tsx</files>
  <action>
    Apply the four small edits from the interfaces block: frontend/src/types/fansub.ts
    (FansubGroup.kuerzel, FansubGroupPatchRequest.kuerzel), fansubEditTypes.ts
    (FormState.kuerzel), fansubEditFormMapping.ts (mapGroupToForm, emptyForm, formToPayload's
    includeGeneral block).

    Create frontend/src/app/admin/fansubs/[id]/edit/FansubGroupKuerzelField.tsx: a small "use
    client" presentational component taking `{ value: string; disabled: boolean; onChange:
    (value: string) => void }`, rendering `@/components/ui`'s FormField (label "Kürzel", htmlFor
    "fansub-group-kuerzel", hint "Muss systemweit eindeutig sein (auch gegenüber Aliasen anderer
    Gruppen).") wrapping an Input (id "fansub-group-kuerzel", value, maxLength 32, disabled,
    placeholder "z. B. BDnP", onChange calling onChange(event.target.value)). Real umlauts
    throughout ("Kürzel", "Muss").

    In FansubBasicInfoTab.tsx: import FansubGroupKuerzelField; insert directly after the Name
    field's closing `</div>` and before the Slug conditional block a single wrapping
    `<div className={`${styles.field} ${styles.fansubEditBasicField}`}>` containing one compact
    `<FansubGroupKuerzelField value={form.kuerzel} disabled={!canEditGeneral} onChange={(value)
    => setForm((current) => ({ ...current, kuerzel: value }))} />` call, formatted on as few
    lines as fit cleanly (single-line prop list is acceptable here). After this edit, run `wc -l`
    on this file and confirm it is still <= 450 lines; if it lands over, tighten the JSX
    formatting further rather than removing content -- the Kürzel field, per the locked decision,
    must render directly next to the Name field, not be dropped or deferred.

    In FansubBasicInfoTab.test.tsx: add `kuerzel: ''` to the existing `details.form` fixture
    object. Add one new test case asserting the Kürzel input is gated by the SAME
    can_edit_group_general capability as the Name field (disabled without it, enabled with it) --
    mirror the existing "enables only general fields for can_edit_group_general" test's
    structure. Add a second case passing `details.form.kuerzel: 'BDnP'` (mixed case) and
    asserting the rendered input's value is exactly "BDnP" with no case transformation (GAP-07
    proof for this field).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.test.tsx' && npm run typecheck" && wc -l "/home/d1sk/team4s/frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx"</automated>
  </verify>
  <done>FansubBasicInfoTab.tsx renders the Kürzel field directly next to Name, gated by
  can_edit_group_general, still <= 450 lines; the new mixed-case rendering test proves no case
  transformation; typecheck and the file's test suite pass.</done>
</task>

<task type="auto">
  <name>Task 5: Sortable Kürzel column in /admin/fansubs (GAP-05)</name>
  <files>frontend/src/app/admin/fansubs/fansubListSort.ts, frontend/src/app/admin/fansubs/fansubListSort.test.ts, frontend/src/app/admin/fansubs/FansubSortHeaderCell.tsx, frontend/src/app/admin/fansubs/page.tsx, frontend/src/app/admin/fansubs/page.test.tsx</files>
  <action>
    Create frontend/src/app/admin/fansubs/fansubListSort.ts: export `type FansubSortKey = "name" |
    "status" | "period" | "kuerzel"`, `type FansubSortDirection = "asc" | "desc"`. Move
    statusRank and periodValue (verbatim, from page.tsx ~66-76) into this file as private
    functions; add a private `kuerzelValue(group: FansubGroup): string` returning
    `(group.kuerzel ?? "").trim()`. Export `compareFansubListItems(sortKey: FansubSortKey,
    sortDirection: FansubSortDirection, left: FansubGroup, right: FansubGroup): number`
    reproducing the exact comparator logic currently inline in page.tsx's sortedItems useMemo
    (~177-193: name via localeCompare 'de'/sensitivity base, status via statusRank, period via
    periodValue, kuerzel via kuerzelValue+localeCompare 'de'/sensitivity base, tie-break falls
    back to name localeCompare, then applies sortDirection).

    Create frontend/src/app/admin/fansubs/fansubListSort.test.ts: unit tests (no DOM) covering
    each of the four sort keys ascending/descending, the name tie-break when two groups share a
    sort key, and that a null/missing kuerzel sorts before any group with a set kuerzel in
    ascending order.

    Create frontend/src/app/admin/fansubs/FansubSortHeaderCell.tsx: a small generic "use client"
    component `FansubSortHeaderCell<K extends string>({ label, sortKeyValue, activeSortKey,
    sortDirection, onSort, styles }: { label: string; sortKeyValue: K; activeSortKey: K;
    sortDirection: "asc" | "desc"; onSort: (key: K) => void; styles: Record<string, string> })`
    rendering `@/components/ui`'s TableHeaderCell wrapping a `<button type="button"
    className={styles.fansubSortButton} onClick={() => onSort(sortKeyValue)}>{label}{" "}
    {activeSortKey === sortKeyValue ? (sortDirection === "asc" ? "^" : "v") : ""}</button>` --
    byte-identical visual output to the four existing inline header-cell blocks it replaces.

    In page.tsx: remove the local `type SortKey = "name" | "status" | "period"` line and the
    statusRank/periodValue function definitions; import `FansubSortKey`, `FansubSortDirection`,
    `compareFansubListItems` from "./fansubListSort" and `FansubSortHeaderCell` from
    "./FansubSortHeaderCell"; alias `type SortKey = FansubSortKey` (keeps every existing
    `SortKey`-typed usage in the file compiling unchanged) and `type SortDirection =
    FansubSortDirection`. Replace the sortedItems useMemo's sort callback body with a single call
    to `compareFansubListItems(sortKey, sortDirection, left, right)`. Add `<option
    value="kuerzel">Kürzel</option>` to the existing mobile sort `<select id="fansub-sort">`
    (~482-484) -- this is a pre-existing native select outside this plan's UI-primitive scope,
    only add the option, do not migrate the select itself. Replace the three existing sortable
    `<TableHeaderCell>` blocks (name/status/period, ~579-621) with three one-line
    `<FansubSortHeaderCell label="..." sortKeyValue="..." activeSortKey={sortKey}
    sortDirection={sortDirection} onSort={toggleSort} styles={styles} />` calls, and insert a
    fourth call for "Kürzel"/"kuerzel" immediately after the existing plain
    `<TableHeaderCell>Slug</TableHeaderCell>` (~593). Add one `<TableCell>{item.kuerzel ??
    "–"}</TableCell>` to the desktop row mapping immediately after the existing slug TableCell
    block (~653-667), matching the new header's column position. Do NOT add a Kürzel line to the
    mobile card list (`fansubCardData`, ~780-797) -- out of scope, the locked decision only
    requires a sortable column in the table. After all edits, run `wc -l` on page.tsx and confirm
    it did NOT increase versus its pre-task line count (845) -- the extraction in this task must
    net-shrink or hold the file steady even after adding the new column/header/option.

    In page.test.tsx: extend the existing "renders the fansub list as a table with existing
    actions" test's single mocked group with `kuerzel: "BDnP"`, and add assertions that
    `within(table).getByRole("columnheader", { name: /Kürzel/i })` exists and
    `within(table).getByText("BDnP")` renders in the row (real render, not source-grepping).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/fansubs/fansubListSort.test.ts' 'src/app/admin/fansubs/page.test.tsx' && npm run typecheck" && LINES=$(wc -l < "/home/d1sk/team4s/frontend/src/app/admin/fansubs/page.tsx"); test "$LINES" -le 845 && echo "page.tsx line count OK: $LINES"</automated>
  </verify>
  <done>fansubListSort.test.ts and page.test.tsx pass including the new Kürzel-column/sort
  assertions; typecheck clean; page.tsx line count did not increase past its pre-task baseline
  (845) despite the new column, header cell, and sort option.</done>
</task>

<task type="auto">
  <name>Task 6: Calm down the alias row -- collapsed Umhängen (GAP-06)</name>
  <files>frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx, frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.test.tsx</files>
  <action>
    Read FansubAliasSection.tsx first (it is already fully in context from planning -- current
    row Actions cell at ~241-279 always renders a Select + "Umhängen" button + delete button
    inline). Add one new state: `const [reassigningAliasID, setReassigningAliasID] =
    useState<number | null>(null);`. Replace the row's Actions `<TableCell>` body with a
    conditional: when `row.id === reassigningAliasID`, render the existing Select (same
    aria-label, same `reassignTargetByAliasID`/`setReassignTargetByAliasID` wiring, unchanged)
    plus a primary "Übernehmen" button (same disabled guard as the current "Umhängen" button:
    `!canManage || !selectedTarget || selectedTarget === row.fansub_group_id`, calls
    handleReassign(row) unchanged) plus a secondary "Abbrechen" button that calls
    `setReassigningAliasID(null)` (and clears that row's pending selection via
    `setReassignTargetByAliasID((current) => { const next = { ...current }; delete next[row.id];
    return next; })` so re-opening starts from the placeholder again). When NOT expanded, render
    exactly two elements: a secondary "Umhängen…" button that calls
    `setReassigningAliasID(row.id)`, and the existing delete icon button unchanged (same
    aria-label, same disabled/onClick). Inside handleReassign's try block, after the existing
    `await loadAliases()` on success, add `setReassigningAliasID(null)` so a successful apply
    collapses the row back to its calm state (leave the catch block's onToast error handling
    completely unchanged -- errors stay visible with the row still expanded so the admin can
    retry, per "error message behavior stays exactly as today"). Do not touch handleDelete, the
    confirm dialog, permission gating, or any styling/CSS module -- only the Actions cell's
    conditional structure and the new collapse-on-success/cancel behavior change.

    In FansubAliasSection.test.tsx: update the existing "Umhängen" describe block's two tests to
    first `fireEvent.click(screen.getByRole("button", { name: "Umhängen…" }))` before finding the
    Select/"Übernehmen" controls (the Select and "Übernehmen" button no longer exist in the DOM
    until that click). Add a new test proving the collapsed default: with one alias row loaded,
    `screen.queryByLabelText(/Neue Gruppe für Alias/)` and
    `screen.queryByRole("button", { name: "Übernehmen" })` are both null before any click; only
    "Umhängen…" and the delete button are visible. Add a test proving "Abbrechen" collapses the
    row back (Select/Übernehmen disappear again, "Umhängen…" reappears) without calling
    reassignFansubAlias. Add a test proving a successful "Übernehmen" also collapses the row back
    after `getFansubAliases` reloads (same success-path fixture pattern as the existing
    "...und hängt um" test, plus an assertion that the Select is gone afterward).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/fansubs/[id]/edit/FansubAliasSection.test.tsx'"
</automated>
  </verify>
  <done>Alias row shows exactly Alias/Erstellt am/Aktionen with two actions by default; Select +
  Übernehmen + Abbrechen appear only after "Umhängen…"; both a successful Übernehmen and an
  Abbrechen collapse the row back; confirm dialog, permission checks, and error handling remain
  byte-identical to before.</done>
</task>

<task type="auto">
  <name>Task 7: Full verification, UAT gap closure, migration deploy, container rebuild/restart</name>
  <files>.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md</files>
  <action>
    Backend full suite (scratch container, both with and without TEAM4S_PHASE167_TEST_DSN set,
    per the critical_gotcha's live-sync caveat): `go build ./... && go vet ./... && go test
    ./...` -- with the DSN set, every phase167_fansub_kuerzel_*_test.go case plus every
    pre-existing phase167 test must pass; without it, the new tests must SKIP cleanly (never
    FAIL), matching the project's established DSN-gated pattern. Treat any NEW failure in a file
    this plan touched as a blocker; a pre-existing, independently-documented failure unrelated to
    any file this plan touched is not a blocker but must be named explicitly.

    Frontend full suite + typecheck + lint inside the frontend container: `npm run test`, `npm
    run typecheck`, `npm run lint`. Same blocker rule as backend.

    Confirm the TEAM4S_PHASE167_TEST_DSN target database (`team4s_phase167_test_1`) still exists
    on team4sv30-db (reused from 167-02/167-06, per-test schemas are created/dropped, the
    database itself persists) -- if it no longer exists, `CREATE DATABASE
    team4s_phase167_test_1;` against team4sv30-db before the test run above.

    Record CURRENT container start times before rebuilding: `docker inspect -f
    '{{.State.StartedAt}}' team4sv30-backend team4sv30-frontend`. Apply migration 0171 against
    team4s_v2 using the project's migrate tool: `docker exec team4sv30-backend sh -c "cd /app &&
    go run ./cmd/migrate up"` (DATABASE_URL and the mounted database/migrations dir are already
    configured in the container's environment -- see interfaces/critical_gotcha). Confirm via
    `docker exec team4sv30-backend sh -c "cd /app && go run ./cmd/migrate status"` that 0171 is
    now applied, and spot-check with a read-only query
    (`docker exec team4sv30-db psql -U team4s -d team4s_v2 -c "SELECT COUNT(*) FROM fansub_groups
    WHERE kuerzel IS NOT NULL"`) that it returns 0 (no backfill, confirming the migration touched
    zero existing rows' data).

    Rebuild backend: `docker compose up -d --build team4sv30-backend`, then `curl -sf
    http://192.168.235.196:8092/health -o /dev/null -w '%{http_code}\n'` (expect 200). Restart
    frontend: `docker restart team4sv30-frontend`, then `docker compose ps team4sv30-frontend`
    (expect "Up"). Record NEW container start times with the same docker inspect command and
    confirm both are strictly later than the pre-rebuild timestamps.

    Do not touch any other table or row in team4s_v2. Do not run git push. Stay on main. Never
    use git stash, per CLAUDE.md.

    Finally, edit .planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md: append
    three new entries to the existing `## Gaps` list (same shape as the existing GAP-04 entry --
    truth/status/reason/severity/root_cause/artifacts/missing/resolution, real German umlauts
    throughout), one each for GAP-05 (Kürzel als Stammdatum, Eindeutigkeit, Erkennungsreihenfolge,
    sortierbare Spalte), GAP-06 (beruhigte Alias-Zeile), and GAP-07 (Original-Schreibweise
    überall). Each `status: resolved`, `reason:` referencing "Auftraggeber-Review von fansub.de,
    2026-09-24" and this plan's identifier (quick-260924-dso), `root_cause:` framed as "keine
    Regression, sondern eine neue verbindliche Anforderung aus dem fansub.de-Referenz-Review" (not
    a bug), and `resolution:` naming the concrete files/functions this plan added per GAP (mirror
    the existing entries' level of detail). Do not alter the existing GAP-01..GAP-04 entries or
    the `## Tests`/`## Summary` sections above them.
  </action>
  <verify>
    <automated>docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./..." && docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run typecheck" && curl -sf http://192.168.235.196:8092/health -o /dev/null -w '%{http_code}\n' && grep -c "status: resolved" /home/d1sk/team4s/.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md</automated>
  </verify>
  <done>Backend go build/go vet/go test and frontend npm run test/typecheck/lint all reported
  (pass, or named pre-existing unrelated failures only); migration 0171 applied to team4s_v2 with
  zero existing rows touched; both containers rebuilt/restarted with strictly newer start times;
  /health returns 200; team4s_v2 otherwise untouched; no git push; no git stash used; 167-UAT.md
  has new GAP-05/GAP-06/GAP-07 entries all status: resolved, referencing this plan.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Admin browser -> fansub group/alias write endpoints | Existing, capability-gated boundary (ActionFansubGroupPageGeneralEdit / requireFansubAliasWriteAccess), reused unchanged -- this plan adds fields/checks inside that boundary, not a new one. |
| Backend -> team4s_v2 Postgres | Existing boundary; the new Kürzel columns and the two new owner-lookup queries stay within it, fully parameterized. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-QUICK260924-DSO-01 | Tampering | FansubRepository.UpdateGroup / CreateAlias Kürzel writes | mitigate | Owner-named pre-check (findFansubKuerzelOwner / findFansubKuerzelOrAliasOwner) runs BEFORE any INSERT/UPDATE and aborts the write on a hit -- never a silent overwrite, matching the D-02 pattern Phase 167 already established for aliases. |
| T-QUICK260924-DSO-02 | Tampering (TOCTOU race between the app-level pre-check and the actual write) | UpdateGroup / CreateAlias Kürzel paths | accept | V1 is admin-only, single/low-concurrency operator workflow (CLAUDE.md Audience constraint) -- a genuinely concurrent conflicting write to the same Kürzel is practically improbable. The Kürzel-vs-Kürzel and Alias-vs-Alias races specifically still have a hard DB-level backstop (partial UNIQUE(normalized_kuerzel), existing UNIQUE(normalized_alias), both caught via isUniqueViolation -> ErrConflict fallback); only the cross-table Kürzel-vs-Alias race window is formally accepted, not mitigated. |
| T-QUICK260924-DSO-03 | Information Disclosure | 409 response naming the conflicting group | accept | Fansub group names are already public data (public profile pages) -- naming them in an admin-only 409 response discloses nothing not already public. |
| T-QUICK260924-DSO-04 | Injection | New SQL in findFansubKuerzelOwner / findFansubKuerzelOrAliasOwner and the new kuerzel_hits CTE | mitigate | All new queries use parameterized placeholders ($1/$2) exclusively, same pattern as every existing query in this file; no string concatenation of user input anywhere. |

No package-manager installs are part of this plan; the Package Legitimacy Gate does not apply.
</threat_model>

<verification>
1. Task 1's build/vet + additive-migration grep proves the foundation compiles and the migration
   touches no existing data.
2. Task 2's real-DB conflict tests prove owner-named 409s in all three new cross-check
   directions, plus the intentional same-group exclusion.
3. Task 3's real-DB detection-order tests prove Kürzel beats Name/Slug/Alias and that all four
   tiers coexist correctly in one query; the frontend test proves the Herkunftshinweis label.
4. Task 4's frontend test proves the Kürzel field is gated like Name and preserves casing, and
   that FansubBasicInfoTab.tsx stays within the 450-line ceiling.
5. Task 5's tests prove the Kürzel column renders and sorts, and that page.tsx did not grow.
6. Task 6's tests prove the alias row's collapsed default and correct expand/collapse behavior.
7. Task 7's full-suite run, migration application, container rebuild, and 167-UAT.md update close
   out the plan.
</verification>

<success_criteria>
- [ ] Fansub groups have an optional, systemwide-unique Kürzel field, editable next to Name on
      the edit page, visible and sortable as a column in /admin/fansubs.
- [ ] Saving a Kürzel that collides with another group's Kürzel or Alias (or an Alias that
      collides with another group's Kürzel) returns HTTP 409 naming the owning group; never a
      silent overwrite.
- [ ] Import detection resolves Kürzel -> Name -> Slug -> Alias in that precedence, in one
      bundled query, with a Herkunftshinweis that names "Kürzel" when that tier wins.
- [ ] The alias row in the group edit page shows only alias/date/two actions by default; the
      target-group selector appears only after "Umhängen…" and collapses after apply/cancel.
- [ ] Aliases and Kürzel render in their original casing everywhere; normalization is
      comparison-only, never display.
- [ ] All new/edited frontend UI uses only @/components/ui primitives; all new German strings use
      real umlauts.
- [ ] No production file this plan touches exceeds 450 lines; FansubBasicInfoTab.tsx and
      page.tsx specifically did not grow past their pre-task line counts.
- [ ] All new tests execute real behavior (real handler calls against a real/fake repository,
      real component renders) -- never source-grepping.
- [ ] Migration 0171 applied to team4s_v2, additive only, zero existing rows touched; both
      containers rebuilt/restarted with confirmed newer start times.
- [ ] 167-UAT.md's GAP-05, GAP-06, GAP-07 are all status: resolved, referencing this plan.
- [ ] No git push; no git stash used.
</success_criteria>

<output>
Create `.planning/quick/260924-dso-gap-05-gap-07-gruppen-kuerzel-als-stammd/260924-dso-SUMMARY.md` when done
</output>
