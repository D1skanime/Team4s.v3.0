# Phase 167: Fansub-Gruppenerkennung beim Episoden-Import - Research

**Researched:** 2026-09-23
**Domain:** Go backend parser/regex hardening + Postgres alias matching (trigram/normalization) + Next.js admin import UI, inside an existing brownfield episode-import pipeline
**Confidence:** HIGH (all claims below are `[VERIFIED: code read]` or `[VERIFIED: live read-only DB query]` unless explicitly marked `[ASSUMED]`)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Unbekannte Kürzel werden beim manuellen Zuordnen **automatisch** als zusätzlicher Alias der gewählten Gruppe gespeichert. Mehrere Aliase pro Gruppe sind erlaubt; ein Alias gehört systemweit genau einer Gruppe (bestehende `UNIQUE(normalized_alias)`).
- **D-02:** Gehört das Kürzel bereits einer anderen Gruppe, passiert nichts automatisch: sichtbarer Hinweis „Kürzel gehört bereits zu <Gruppe>", Umhängen nur auf ausdrückliche Aktion. Kein stiller Wechsel.
- **D-03:** Passt kein Kürzel, werden ähnliche Gruppen über den vorhandenen Trigram-Index nur **vorgeschlagen**, nie automatisch übernommen. Neue Gruppen entstehen ausschließlich durch ausdrückliches Anlegen – der bestehende Auto-Upsert aus Dateinamen (`episode_import_repository_fansub_helpers.go`) entfällt bzw. wird auf eine ausdrückliche Aktion beschränkt.
- **D-04:** Eine Versionskennung am Dateinamen-Ende (`v2`, `v3`, `v4`, auch nach Prüfsumme/Klammern) wird als Release-Version vorgeschlagen statt `v1`; der Admin kann sie ändern.
- **D-05:** Der Parser wertet den **Dateinamen** aus; der Pfad nur als Rückfallebene, wenn der Dateiname leer ist (heute wird der ganze Pfad mitdurchsucht, was falsche Treffer erlaubt).
- **D-06:** Prüfsummen (8-stellige Hex), Auflösungen, Codecs, Container, Sprach-/Quellkennungen und reine Zahlen gelten nie als Gruppenname. Ist nichts sicher erkennbar, liefert der Parser leer statt zu raten (Beleg: `Serie_01_[AEC71BC3].mkv` liefert heute „AEC71BC3").
- **D-07:** Das Szene-Schema `gruppe-titel.sXXeYY.…` muss erkannt werden (Beleg: `dmpd-mashle…s01e17…` liefert heute leer). Die vier bereits funktionierenden Schemata dürfen nicht regressieren.
- **D-08:** Die Zuordnung für eine Import-Vorschau wird gebündelt aufgelöst (kein N+1, konstante Abfragezahl unabhängig von der Dateianzahl) und ist in der Oberfläche als Herkunft sichtbar („erkannt aus Dateiname: BDnP → Bloody-Shadow (Alias)").
- **D-09:** Alias-Pflege (anlegen, umhängen, löschen) ist in der Gruppenverwaltung sichtbar und wird mit Audit-Attribution per user_id protokolliert.
- **D-10:** Der Parser bekommt echte Tabellentests mit den realen Dateinamen des Auftraggebers (heute existiert kein einziger Test für diese Datei); Alias-Schreibpfad und Eindeutigkeitsregel werden gegen eine echte Test-Datenbank geprüft, nicht nur mit Fakes.
- **D-11:** Globale UI-Primitives aus `@/components/ui` und globale Design-Tokens sind Pflicht; deutsche Texte mit echten Umlauten; Produktionsdateien ≤ 450 Zeilen; bereits übergroße Dateien nicht weiter vergrößern.

### Claude's Discretion
- Konkrete Regex-/Tokenizer-Struktur des Parsers, solange die Messtabelle erfüllt ist und Nicht-Treffer ehrlich leer bleiben.
- Ort der Alias-Verwaltung in der Gruppen-Bearbeitung und genaue Darstellung des Herkunftshinweises.
- Ob die Alias-Normalisierung im Go-Code oder in SQL erfolgt, solange sie zu `normalized_alias` passt.

### Deferred Ideas (OUT OF SCOPE)
- Doppelfolgen in einer Datei (`Naruto_026-027`) – in dieser Phase nur prüfen und dokumentieren.
- Rückwirkende Zuordnung/Bereinigung bereits importierter Releases.
- Erkennung weiterer Metadaten aus Dateinamen (Auflösung, Codec) als Vorbelegung.

**Scopegrenze (Phase description):** keine Änderung der Episodenzuordnung (Doppelfolgen nur prüfen/dokumentieren), kein Umbenennen von Dateien, keine rückwirkende Zuordnung bereits importierter Releases, keine Fuzzy-Automatik.
</user_constraints>

## Project Constraints (from CLAUDE.md)

- `backend/internal/handlers/admin_episode_import.go` is **775 lines** `[VERIFIED: wc -l]` — already far over the 450-line limit. Do NOT add code here; new logic (batch alias resolution, version parsing) must live in a new file, e.g. `backend/internal/handlers/admin_episode_import_fansub_match.go`, called from the existing entry points.
- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` is **597 lines** `[VERIFIED: wc -l]` — same rule: no growth, new UI logic goes in a new component file (e.g. a new `FansubGroupOriginHint.tsx` or extending `EpisodeImportMappingRow.tsx`, which is 326 lines and has more headroom, but still budget carefully).
- Global UI primitives (`@/components/ui`) are mandatory for any *new* input/select/button. **Pre-existing violation found:** `EpisodeImportMappingRow.tsx` already uses hand-rolled native `<input>` and `<button>` elements for the entire group-chip/search UI (lines ~181–268) — this is legacy debt, not a pattern to copy. New elements this phase adds (e.g. an "Alias übernehmen" confirm button, an "ähnliche Gruppe?" suggestion chip) must use `Button`/`Input`/`FormField` primitives even though they sit next to non-compliant siblings. Flagged as an open question below on how much surrounding refactor is in-scope.
- Deutsche Umlaute: all new Go response strings and JSX text must use ä/ö/ü/ß (existing handler code already does this correctly, e.g. `"ungültige fansub id"`, `"alias bereits vorhanden"` — follow this precedent).
- Handler test style: CLAUDE.md forbids `os.ReadFile` + `strings.Contains` source-inspection tests for handler behavior. **A real, non-compliant precedent exists in this exact domain** (`backend/internal/handlers/fansub_group_history_handler_test.go` — reads its own source and asserts substrings) — this is explicitly legacy Altlast per CLAUDE.md's own text and must NOT be copied. The compliant precedent to copy instead is `backend/internal/handlers/fansub_project_resolver_handler_test.go` (see Section 4 below).

<phase_requirements>
## Phase Requirements

No REQ-IDs exist yet for Phase 167 in `.planning/REQUIREMENTS.md` `[VERIFIED: grep "Phase 167" REQUIREMENTS.md — zero hits; highest existing phase block is Phase 165]`. The planner must add a new "Phase 167 — Additive scope" section following the exact pattern of the Phase 165 section (`.planning/REQUIREMENTS.md:546`). See `## Candidate Requirement IDs` at the end of this document for a full draft mapping to assign IDs from.
</phase_requirements>

## Summary

The phase touches one already-existing but functionally disconnected pipeline: a **pure-text parser** (`DeriveFansubGroupName`, zero tests) that only ever populates a cosmetic `fansub_group_name` preview string, and a **completely separate apply-time resolution path** that — critically — silently **creates new `fansub_groups` rows** from that same derived text whenever the admin does not explicitly pick/type a group for a mapping row. This second behavior is the actual bug D-03 targets, and it happens **once per media file per apply()**, confirmed as a real N+1 (see Section 1). The alias infrastructure (`fansub_group_aliases`, trigram index, `f_unaccent`, and a full alias CRUD handler with audit logging) already exists nearly end-to-end and is under-used (1 alias row in the live dev DB, 10 groups). A closest-analog single-query matching pattern (`buildSearchFansubQuery` in `search_fansub.go`) already implements exactly the normalized-name/slug/alias OR-chain this phase needs to batch — it only needs to be adapted from "one search term" to "N filenames, single query, `= ANY($1::text[])`".

I traced `DeriveFansubGroupName` by hand against all 13 filenames in the client's measurement table and **confirm every one of the client's claims is accurate** — no discrepancies found (Section 2). The two "falsch" cases are real and reproducible: the scene-schema case fails because the regex requires the suffix after `sXXeYY` to run, dot-free, all the way to end-of-string (impossible once there are more dot-separated tokens after the group name), and the checksum case is a straightforward false-positive of "first bracket wins" bracket-matching.

**Primary recommendation:** Rewrite `DeriveFansubGroupName` as a filename-only, ordered-pattern matcher with an explicit technical-token denylist (new file, table-driven tests against the real filenames); replace the apply-time silent-upsert fallback in `episode_import_repository_fansub_helpers.go`/`_release_helpers.go` with a single bundled matching query (adapted from `buildSearchFansubQuery`) called once at preview-build time in a **new** handler-adjacent file (not growing `admin_episode_import.go`); extend `EpisodeImportMappingRow`/`SelectedFansubGroupInput` with an explicit alias-learn action and an origin-hint field wired through the existing narrow-interface handler-testing pattern (`fansubProjectResolverRepo` precedent) instead of the monolithic `*repository.FansubRepository` field.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Filename group/version parsing | API / Backend (`internal/importutil`) | — | Pure string logic, must be identical for preview and apply; belongs in the existing `importutil` package, not duplicated in handlers/repository |
| Batch alias/name/slug matching | API / Backend (`internal/repository`) | Database (Postgres, trigram+functional indexes) | Matching needs a single SQL query per preview; the functional indexes already exist and only work when the WHERE-clause mirrors their expression exactly |
| Alias learn/reassign/delete | API / Backend (`internal/handlers` + `internal/repository`) | Database | Mutates `fansub_group_aliases`; must reuse the existing `CanForFansubGroup` permission check + `auditLogRepo.Write` pattern already present in `fansub_group_aliases.go` |
| Import preview UI (origin hint, alias-learn confirm) | Frontend Server (Next.js client component) | — | `EpisodeImportMappingRow.tsx` already owns per-row fansub group UI state; extend there, not in the oversized `page.tsx` |
| Group management alias UI (D-09) | Frontend Server (Next.js client component under `/admin/fansubs/[id]/edit/`) | — | `frontend/src/app/admin/fansubs/[id]/edit/` already hosts group-scoped admin tabs (e.g. `FansubBasicInfoTab.tsx`, `GroupMediaReviewSection.tsx`); alias management belongs as a sibling tab/section there, consuming the existing `ListFansubAliases`/`CreateFansubAlias`/`DeleteFansubAlias` handlers |
| Version detection (v2/v3/v4) | API / Backend (`internal/importutil`), consumed at preview build | — | Same tier as filename parsing; purely textual, no DB dependency |

## Section 1 — Today's Import-Mapping Path (as read, in full)

### 1.1 `backend/internal/importutil/fansub_group.go` (verbatim, no tests exist)

```go
// Source: backend/internal/importutil/fansub_group.go (read in full)
var (
	bracketedFansubGroupPattern = regexp.MustCompile(`\[(?P<group>[^\[\]]+)\]`)
	suffixedFansubGroupPattern  = regexp.MustCompile(`(?i)(?:^|[._\-\s])s\d{1,2}e\d{1,4}(?:-\d{1,4})?[-._\s]+(?P<group>[^.]+)$`)
)

func DeriveFansubGroupName(fileName string, fullPath string) string {
	evidence := strings.TrimSpace(fileName + " " + fullPath)
	if match := bracketedFansubGroupPattern.FindStringSubmatch(evidence); len(match) >= 2 {
		return strings.TrimSpace(match[1])
	}
	baseName := strings.TrimSpace(fileName)
	if baseName == "" {
		normalizedPath := strings.ReplaceAll(strings.TrimSpace(fullPath), "\\", "/")
		if normalizedPath != "" { baseName = path.Base(normalizedPath) }
	}
	if baseName == "" { return "" }
	baseName = strings.TrimSpace(strings.TrimSuffix(baseName, filepath.Ext(baseName)))
	if baseName == "" { return "" }
	if match := suffixedFansubGroupPattern.FindStringSubmatch(baseName); len(match) >= 2 {
		return strings.TrimSpace(strings.Trim(match[1], "-._ "))
	}
	return ""
}
```

**Branch 1 ("first bracket anywhere"):** `evidence = fileName + " " + fullPath` — the **path is always concatenated and searched**, not just used as a fallback (this is exactly the D-05 bug: "heute wird der ganze Pfad mitdurchsucht"). The regex `\[(?P<group>[^\[\]]+)\]` finds the leftmost `[...]` in that concatenated string and returns it immediately, with no validation of content (a CRC checksum bracket, a resolution bracket, or a bracket that happens to live in a parent directory name would all match if they appear before any legitimate group bracket).

**Branch 2 ("S01E01-suffix", `.mkv`/ext stripped first):** only reached if branch 1 found no bracket at all. Requires a literal `s\d{1,2}e\d{1,4}` token preceded by a boundary character, followed by one-or-more separator chars, then captures **everything to the true end of the (extension-stripped) string, excluding literal dots**. Because the capture group `[^.]+` cannot cross a `.`, and the regex is anchored with `$` (true end, no multiline flag), this branch **only matches if there are zero dots between the separator and the end of the string** — i.e., it only works for exactly the Jellyfin-rename shape `Title.SxxEyy-GroupName` where `GroupName` is the very last dot-free token. Any additional dot-separated tokens after the group name (as in scene releases) make the whole regex fail to match at all, not partially match.

**Test coverage:** `find backend -iname "*fansub_group_test*"` returns **zero results** `[VERIFIED: find]`. No test file for this package exists at all — confirmed exactly as the client and CONTEXT.md state.

### 1.2 Call sites of `DeriveFansubGroupName` (`[VERIFIED: grep -rn]`)

Exactly two call sites, both consuming it as a **fallback default**, never as the sole source of truth:

1. `backend/internal/handlers/admin_episode_import.go:438`, inside `buildEpisodeImportPreview` (lines 401–476): for every media candidate, `strings.TrimSpace(importutil.DeriveFansubGroupName(media.FileName, media.Path))` is computed and, if non-empty, stored as `row.FansubGroupName` on the `EpisodeImportMappingRow`. **This is purely a display string in the preview response — it is never looked up against `fansub_groups`/`fansub_group_aliases` at preview time.** No DB query happens here at all for group resolution.
2. `backend/internal/repository/episode_import_repository_release_helpers.go:427`, in the tiny wrapper `deriveFansubGroupName(media models.EpisodeImportMediaCandidate) string`, which is called from `resolveImportFansubSelection` (line 285) **at apply time, per mapping row**, only as a last-resort fallback when the frontend submitted neither `mapping.FansubGroups` nor `mapping.FansubGroupID` for that row.

### 1.3 `episode_import_repository_fansub_helpers.go` — the actual auto-create-on-apply path (`[VERIFIED: full file read]`)

This file does **not** contain a literal "`INSERT ... ON CONFLICT` triggered directly from a filename" one-liner as the phase description's summary paraphrase might suggest; the real mechanism is one layer removed and more subtle:

- `resolveImportFansubMemberGroups(ctx, tx, inputs []models.SelectedFansubGroupInput)` loops over `inputs` and calls `resolveImportSelectedFansubGroup` once per input.
- `resolveImportSelectedFansubGroup`: if `input.ID` is set, does a single `SELECT id, slug, name FROM fansub_groups WHERE id = $1` lookup (`lookupImportFansubGroupByID`, ErrNotFound if missing). **Otherwise** it calls `upsertImportFansubGroup(ctx, tx, name, slug, ...)`.
- `upsertImportFansubGroup` runs:
  ```sql
  INSERT INTO fansub_groups (slug, name, status)
  VALUES ($1, $2, 'active')
  ON CONFLICT (slug) DO UPDATE
  SET name = COALESCE(NULLIF(BTRIM(fansub_groups.name), ''), EXCLUDED.name), updated_at = NOW()
  RETURNING id, slug, COALESCE(NULLIF(BTRIM(name), ''), $2)
  ```
  i.e. it **creates a brand-new active `fansub_groups` row** whenever the slug doesn't already exist, with no confirmation step. This is the exact "Auto-Upsert aus Dateinamen" D-03 says must be removed/restricted to an explicit action.

**The trigger path that actually reaches this from a filename** (confirmed by tracing the real call chain, not the docstring): `episode_import_repository_release_helpers.go:265–298`, function `resolveImportFansubSelection(ctx, tx, mapping, media)`:
```go
// Source: backend/internal/repository/episode_import_repository_release_helpers.go:265-298
if mapping.FansubGroups != nil {
    return resolveImportFansubSelectionFromInputs(ctx, tx, mapping.FansubGroups)
}
if mapping.FansubGroupID != nil && *mapping.FansubGroupID > 0 {
    group, err := lookupImportFansubGroupByID(ctx, tx, *mapping.FansubGroupID)
    ...
}
name := strings.TrimSpace(derefString(mapping.FansubGroupName))
if name == "" {
    name = deriveFansubGroupName(media)   // <-- filename re-parsed AT APPLY TIME
}
parsedNames := parseImportFansubGroupNames(name) // splits on "&"/"+"/" und "
// each parsedName -> SelectedFansubGroupInput{Name: &parsedName} (no ID!)
return resolveImportFansubSelectionFromInputs(ctx, tx, selectedGroups)
```
So: **if the frontend submits a mapping row with no explicit `fansub_groups`/`fansub_group_id`** (e.g., the admin left the group chip empty and just clicked "Übernehmen"), the backend independently re-derives the name from the filename and feeds it into `upsertImportFansubGroup` with `Name` only — **creating a new group** rather than resolving to an existing one. This is a real, exploitable-by-accident auto-create path, exactly matching D-03's target.

**Transaction/query-count behavior:** `resolveImportFansubSelection` → `upsertReleaseVersionGroup` (`episode_import_repository_release_helpers.go:209`) is called once per mapping row from inside the apply loop in `episode_import_repository_apply.go` (confirmed: `upsertImportReleaseGraph`, which calls `upsertReleaseVersionGroup` at line 109, is invoked once per confirmed mapping in the apply transaction). Each call to `resolveImportFansubSelection` issues **1 query per group name being resolved** (either a `SELECT ... WHERE id = $1` or an `INSERT ... ON CONFLICT`) — **this is a genuine N+1: N media files with unresolved/fallback group names ⇒ N (or more, for multi-group rows) extra queries in a single apply() transaction.** This confirms and refines D-08/the phase's "Performance"-test requirement: the current N+1 is real and happens at **apply**, not preview (preview issues zero group-resolution queries today).

### 1.4 `admin_episode_import.go` (775 lines, already over the 450-line budget)

Structure relevant to this phase: `PreviewEpisodeImport` (line 42) → `loadEpisodeImportMediaCandidates` → `buildEpisodeImportPreview` (line 401, builds `row.FansubGroupName` via `DeriveFansubGroupName`) → returned as `EpisodeImportPreviewResult.Mappings`. `ApplyEpisodeImport` (line 114) forwards the operator-edited mappings (including `FansubGroups`/`FansubGroupID`/`FansubGroupName`/`ReleaseVersion`) into `EpisodeImportApplyInput`, consumed by `applyReleaseNative` in `episode_import_repository_apply.go`. **New logic for this phase (batch alias resolution at preview time, version detection, origin-hint population) must be added as functions in a new file** (e.g. `admin_episode_import_fansub_match.go`) and called from `buildEpisodeImportPreview`/`PreviewEpisodeImport`, not inlined into the existing 775-line file. `SelectedFansubGroups` itself (the frontend-facing name used in the phase description) corresponds to the Go field `EpisodeImportMappingRow.FansubGroups []SelectedFansubGroupInput` (`backend/internal/models/episode_import.go:81`) and the contract type `EpisodeImportSelectedFansubGroup` (frontend `frontend/src/types/episodeImport.ts`).

## Section 2 — Parser Verification Against the Real Filename Table

I traced the regex engine by hand (not by re-running the client's claims) against all 13 filenames. **Every one of the client's claims is confirmed correct; zero discrepancies found.**

| # | Filename | Traced actual result | Client's claim | Match? | Why |
|---|---|---|---|---|---|
| 1 | `[SHFS]07-Ghost_01_[H.264][1280x720][3390FBD1].mkv` | `SHFS` | `SHFS`, richtig | ✅ | First (leftmost) `[...]` in filename is `[SHFS]`; branch 1 returns immediately, never reaches the other three brackets |
| 2 | `[GFE]Hand_Maid_May_01_[97D9369A].ogm` | `GFE` | `GFE`, richtig | ✅ | Same — first bracket wins |
| 3 | `[FH-Subs]Needless EP01 720p (ger.sub).mp4` | `FH-Subs` | `FH-Subs`, richtig | ✅ | First bracket; parenthesis `(ger.sub)` is not `[...]` so never competes |
| 4 | `[BDnP]NIGHT.HEAD.2041.S01E01[Web.1080p.AAC].mkv` | `BDnP` | `BDnP`, richtig | ✅ | First bracket wins over the later `[Web.1080p.AAC]` and over the `S01E01` suffix branch (never reached, branch 1 already returned) |
| 5 | `[BnP]NIGHT.HEAD.2041.S01E09[Web.1080p.AAC].mkv` | `BnP` | `BnP`, richtig (gleiche Gruppe wie #4, zweites Kürzel) | ✅ | Same logic as #4 |
| 6 | `[GK]No Game, No Life - 01(720p 10bit)[C281B950]v4.mkv` | `GK` | `GK`, richtig | ✅ | First bracket wins over `[C281B950]` |
| 7 | `[Pure-Ani-me] Macross Delta 01 Ger Sub.mkv` | `Pure-Ani-me` | `Pure-Ani-me`, richtig | ✅ | Only bracket in filename |
| 8 | `[L-S] Natsume Yuujinchou S1 - 02.x264 (1280x720 h264 AAC)[C4B217BC].1080P.mkv` | `L-S` | `L-S`, richtig | ✅ | First bracket wins over `[C4B217BC]` |
| 9 | `Naruto Ger Sub 012.avi` | `""` (empty) | leer, richtig | ✅ | No brackets; `suffixedFansubGroupPattern` requires a literal `s\d{1,2}e\d{1,4}` token, which "Sub" is not — no match |
| 10 | `Naruto_026-027_ger_Sub_Uncut(1920).mkv` | `""` (empty) | leer, richtig (Doppelfolge) | ✅ | No brackets, no `sXXeYY` token |
| 11 | `Naruto.S01E01-AnimeOwnage.avi` | `AnimeOwnage` | `AnimeOwnage`, richtig | ✅ | No brackets; branch 2: `.` before `S01E01` matches boundary class, `S01E01` matches, `-` matches `[-._\s]+`, `AnimeOwnage` is the dot-free remainder to end-of-string — matches exactly |
| 12 | `dmpd-mashle.magic.and.muscles.s01e17.german.dl.anime.1080p.web.h264.mkv` | `""` (empty) | leer, **falsch laut Auftraggeber** (soll `dmpd` liefern) | ✅ confirmed as reported | No brackets. Branch 2 finds `s01e17` (preceded by `.`), but the capture group `[^.]+` cannot span the subsequent `.german.dl.anime.1080p.web.h264` (which contains dots) all the way to the anchored `$` — **the regex fails to match at all** (not a partial/wrong match — no match). This confirms the client's diagnosis: the current parser has **no scene-schema-prefix pattern** (`gruppe-titel...`) at all; branch 2 only ever recognizes the Jellyfin-rename suffix shape, never a prefix-before-hyphen shape. D-07's new pattern is a genuinely new code path, not a bug fix to an existing one. |
| 13 | `Serie_01_[AEC71BC3].mkv` | `AEC71BC3` | `AEC71BC3`, **falsch laut Auftraggeber** (ist CRC-Checksumme) | ✅ confirmed as reported | Only bracket in filename is the CRC checksum; branch 1 has no content-validation at all, so any 8-hex-char bracket is indistinguishable from a real group tag today |

**Conclusion:** the client's measurement table is accurate; the planner can treat it as ground truth for the table-driven test D-10 mandates, with no corrections needed. The two failing cases have distinct root causes worth keeping separate in the parser design: #12 needs a **new pattern** (scene-prefix-before-hyphen), #13 needs a **denylist check** (8-hex-char token is never a group name) applied to the *existing* bracket-match branch, not a new pattern.

**Additional design-relevant risk found (not in the client's table):** the "first bracket wins" logic on branch 1 has no denylist either — a checksum accidentally appearing as the *first* bracket in a filename that also contains a real group bracket later (e.g., hypothetically `[3390FBD1]Title[SHFS].mkv`) would return the checksum, not the group. None of the 13 sample files exercise this ordering, but the new parser's denylist must apply uniformly regardless of bracket position, not just to the fallback branch.

## Section 3 — Alias Table, Normalization, Trigram Index

### 3.1 Migrations (`[VERIFIED: full file reads]`)

`database/migrations/0009_fansub_groups.up.sql`:
```sql
CREATE TABLE IF NOT EXISTS fansub_groups (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(120) NOT NULL,
    name VARCHAR(120) NOT NULL,
    ... status VARCHAR(20) NOT NULL CHECK (status IN ('active','inactive','dissolved')) ...
);
CREATE UNIQUE INDEX idx_fansub_groups_slug ON fansub_groups (slug);
CREATE UNIQUE INDEX idx_fansub_groups_name ON fansub_groups (name);
```

`database/migrations/0014_fansub_group_aliases.up.sql`:
```sql
CREATE TABLE fansub_group_aliases (
    id BIGSERIAL PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    alias VARCHAR(120) NOT NULL,
    normalized_alias VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fansub_group_aliases_normalized_alias UNIQUE (normalized_alias),
    CONSTRAINT uq_fansub_group_aliases_group_normalized UNIQUE (fansub_group_id, normalized_alias)
);
CREATE INDEX idx_fansub_group_aliases_group_id ON fansub_group_aliases (fansub_group_id);
```
`normalized_alias` is a **plain column, NOT a generated column** — it is computed application-side and written explicitly on every insert (confirmed: `CreateAlias` passes `input.NormalizedAlias` straight into the INSERT; there is no trigger or `GENERATED ALWAYS AS`).

`database/migrations/0140_search_foundation.up.sql` (Phase 115) adds, on top of the two tables above:
- `CREATE EXTENSION unaccent;` and an `IMMUTABLE` wrapper `f_unaccent(text)` (fixed for restore-safety in `0152_f_unaccent_search_path_fix.up.sql` — schema-qualified `public.unaccent('public.unaccent'::regdictionary, $1)`).
- GIN trigram indexes on `f_unaccent(name)`, `f_unaccent(slug)` (both on `fansub_groups`), and `f_unaccent(normalized_alias)` (on `fansub_group_aliases`) — these back the `%` similarity operator used for "did you mean" suggestions (D-03).
- Functional btree normalization indexes: `regexp_replace(lower(f_unaccent(name)), '[^a-z0-9]+', '', 'g')` on both `fansub_groups.name` and `.slug` — **this exact expression is the canonical normalization form for exact/prefix matching** and must be mirrored byte-for-byte in any new batch-matching query, per the migration's own comment (`0140_search_foundation.up.sql:49-55`).
- Generated `search_tsv` tsvector columns (not directly relevant to alias matching, used for full-text search ranking).

### 3.2 Normalization is computed in Go, in **two separate, duplicated implementations**

- `backend/internal/repository/fansub_repository.go:1728`, `normalizeAliasKey(raw string) string` — lowercase, keep only `a-z0-9` (strips everything else, including separators, entirely rather than unifying them).
- `backend/internal/handlers/fansub_aliases.go:130`, `normalizeFansubAliasKey(raw string) string` — **functionally identical** implementation, duplicated in the handlers package.

Both functions **do not call `f_unaccent`/`unaccent`** — they simply drop any non-`[a-z0-9]` rune, including accented letters (an `é` is dropped, not converted to `e`). The SQL-side functional indexes, by contrast, explicitly apply `f_unaccent()` before the `regexp_replace`. This is an existing asymmetry: `normalizeAliasKey`/`normalizeFansubAliasKey` (Go) and `regexp_replace(lower(f_unaccent(col)),'[^a-z0-9]+','','g')` (SQL) are only equivalent for ASCII input. **This is a pre-existing minor inconsistency, not introduced by this phase** — flagged as an Open Question below since accented fansub group aliases are plausible (e.g. a hypothetical `Café-Subs`).

No SQL trigger or generated column computes `normalized_alias` — every write path funnels through one of the two Go functions above.

### 3.3 Live read-only DB check (`[VERIFIED: docker exec psql, read-only SELECT only, no writes/DDL]`)

```
fansub_groups:        10 rows (New-Subs, Bloody-Shadow, FlameHaze-subs, Strawhat Subs,
                                AnimeOwnage, Project Messiah, Generation: Anime Xtreme,
                                Shayo-Subs, Dragon-Subs, Red-Panda Fansubs)
fansub_group_aliases:  1 row  (alias='NS', normalized_alias='ns', fansub_group_id=1 → New-Subs)
```
Confirms CONTEXT.md's "Bestand: 10 Gruppen … ein Eintrag" exactly.

### 3.4 Existing repository methods (closest analogs for new alias-matching queries)

- `backend/internal/repository/fansub_repository.go`: `ListAliases`, `CreateAlias`, `DeleteAlias` (lines 952–1040+) — simple per-group CRUD, single-row queries, already wired to the handler layer described in Section 4. **No `ReassignAlias`/move-alias method exists** — D-02/D-09's "Umhängen" (reassign to a different group) has no existing code path; the planner must decide whether to compose it as delete+create (two audit events) or add a dedicated `ReassignAlias` repository method (one atomic UPDATE + one audit event) — flagged as an Open Question below.
- `backend/internal/repository/search_fansub.go`, `buildSearchFansubQuery` (lines 23–68) — **the closest analog for batched matching**. It already builds, for a *single* search term, a WHERE-clause OR-chain across: trigram similarity on `f_unaccent(name)`, slug prefix, exact normalized-name match, exact normalized-slug match, and an `EXISTS` subquery against `fansub_group_aliases.normalized_alias`. `buildSearchFansubOrder` ranks results: alias/name-normalized exact match first, then exact name, then exact slug, then alias trigram, then name trigram. **To adapt this for D-08's batch requirement:** replace the single `$1`/`$2` scalar bind with `= ANY($1::text[])` over an array of normalized filename-derived candidate strings, `JOIN`/correlate the result back to each input string (e.g., via `unnest($1::text[]) WITH ORDINALITY` or a lateral join), and keep exactly one query for the whole preview instead of one call per row.

## Section 4 — Design-Relevant Technical Findings

### 4.1 Batch resolution pattern (avoiding N+1, satisfying D-08)

Recommended shape (adapting `buildSearchFansubQuery`'s WHERE-expression, not reinventing it):
```sql
-- Illustrative sketch, NOT copy-paste-ready — planner/executor to finalize exact columns.
WITH candidates AS (
  SELECT * FROM unnest($1::text[]) WITH ORDINALITY AS c(raw_group, row_ord)
)
SELECT c.row_ord, fg.id, fg.name, fg.slug, fga.alias AS matched_alias
FROM candidates c
LEFT JOIN fansub_group_aliases fga
  ON fga.normalized_alias = regexp_replace(lower(f_unaccent(c.raw_group)), '[^a-z0-9]+', '', 'g')
LEFT JOIN fansub_groups fg
  ON fg.id = fga.fansub_group_id
  OR regexp_replace(lower(f_unaccent(fg.name)), '[^a-z0-9]+', '', 'g')
     = regexp_replace(lower(f_unaccent(c.raw_group)), '[^a-z0-9]+', '', 'g')
  OR regexp_replace(lower(f_unaccent(fg.slug)), '[^a-z0-9]+', '', 'g')
     = regexp_replace(lower(f_unaccent(c.raw_group)), '[^a-z0-9]+', '', 'g');
```
This is **one query for the entire preview**, regardless of file count — satisfying D-08's "konstante Abfragezahl". Trigram "meinten Sie...?" suggestions (D-03, "no match" case) are a **second**, still-bounded query (one `SELECT ... ORDER BY similarity() DESC LIMIT N` per unresolved candidate, or similarly batched via the same `unnest` + lateral-join technique) — keep this as an explicitly separate, smaller query rather than folding fuzzy suggestions into the exact-match query, to keep the exact-match path index-friendly (equality, not `%` similarity, drives the primary lookup).

**Query budget test infrastructure already exists and should be reused directly:** `backend/internal/repository/query_counter.go` defines `queryCounter`, a `pgx.QueryTracer` that counts queries issued through a traced pool — exactly the tool needed to assert "N files ⇒ constant query count" (see the existing `phase156SegmentOriginConstantQueryBudget` test in `segment_origin_query_budget_test.go` for the wiring pattern: open a second traced pool on the same DSN/schema as the fixture pool, `reset()` before the measured call, assert `count()` afterward).

### 4.2 UI primitives already used in the import preview page

`EpisodeImportMappingRow.tsx` currently renders the entire fansub-group chip/search UI with **hand-rolled native `<input>`/`<button>` elements**, not `@/components/ui` primitives — this is pre-existing non-compliant code (see Project Constraints above), not a pattern to copy for new elements. For the origin-hint text itself ("erkannt aus Dateiname: BDnP → Bloody-Shadow (Alias)"), the closest compliant analog for a small inline status/hint element used in group-scoped admin UI is the existing filler/status badge pattern already in `page.tsx` (`styles.existingBadge`, `styles.fillerBadge` — plain styled `<span>`, no interactive control, so no primitive violation) — a similarly non-interactive `<span>`/text hint for the origin note would not trigger the native-control restriction (ESLint's `no-restricted-syntax` targets `<select>/<input>/<textarea>` and native `<button>` for interactive controls, not static text). Any **new interactive element** this phase adds (an explicit "Alias speichern"/"Gruppe wechseln" confirm action, a "meinten Sie ...?" suggestion chip that is clickable) must use `Button`/`FormField` from `@/components/ui` per CLAUDE.md, even though it will sit beside legacy native buttons in the same row component.

For the group-management alias UI (D-09), `frontend/src/app/admin/fansubs/[id]/edit/` already hosts multiple `<Select>`-based tab sections (`FansubBasicInfoTab.tsx`, `AnimeProjectNoteForm.tsx`, `GroupMemberFormModals.tsx`) that correctly import `Select` from `@/components/ui` — these are the compliant analogs to follow for a new alias-management tab/section in the same directory, not the import-page's legacy inputs.

### 4.3 Audit-attribution pattern (D-09) — already fully implemented, reuse directly

`backend/internal/handlers/fansub_group_aliases.go` (`CreateFansubAlias`, `DeleteFansubAlias`) already implements the exact pattern D-09 requires:
```go
// Source: backend/internal/handlers/fansub_group_aliases.go:99-109 (CreateFansubAlias)
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "fansub_group_alias.created",
    ScopeType:      permissions.ScopeTypeGroup,
    ScopeID:        &fansubID,
    TargetType:     "fansub_group_alias",
    TargetID:       &item.ID,
    Action:         string(permissions.ActionFansubGroupEdit),
    Outcome:        "allowed",
    Payload:        map[string]any{"alias": item.Alias},
})
```
Access control is gated via `requireFansubAliasWriteAccess` → `h.permissionSvc.CanForFansubGroup(ctx, actor, permissions.ActionFansubGroupEdit, fansubID)`, with `auditPermissionDenied` logging denials too. **This exact helper and event-naming convention (`fansub_group_alias.created`/`.deleted`) should be extended, not reinvented**, for: (a) the new "alias auto-learned from import mapping" event (likely `fansub_group_alias.learned` or reusing `.created` with a `Payload` field noting `source: "episode_import"`), and (b) a new reassign action (`fansub_group_alias.reassigned`, if a dedicated `ReassignAlias` method is added per the Section 3.4 open question).

### 4.4 Test style analogs

**Table-driven parser tests:** no existing test exists in `importutil` itself, but the repo has many compliant table-driven examples elsewhere (e.g. `backend/internal/handlers/jellyfin_media_source_test.go`, `backend/internal/repository/anime_test.go` `TestBuildAnimeListWhere_FansubFilter`) using the standard `tests := []struct{ name string; ... }{ ... }` + `t.Run(tt.name, ...)` shape — follow this idiom for the parser's real-filename table (D-10).

**Postgres integration test pattern (for the alias write-path/uniqueness proof, D-10):** the repo has an established per-phase isolated-schema convention:
- `backend/internal/testsupport/phase165_postgres.go` (and sibling `phase106_postgres.go`, `phase117_postgres.go`, etc.) — each exposes `OpenPhaseNNNPostgres(t *testing.T) *pgxpool.Pool`, gated by a `TEAM4S_PHASENNN_TEST_DSN` env var, validating both the **database name** (`team4s_phaseNNN_test_[a-z0-9]+`) and the **schema name** (`phaseNNN_[a-z0-9_]+`) via regex before ever touching it — this is the fail-closed guard against accidentally running against `team4s_v2` that CLAUDE.md's "no writes to team4s_v2" constraint requires. A new `backend/internal/testsupport/phase167_postgres.go` should be added following this exact template (own DSN env `TEAM4S_PHASE167_TEST_DSN`, own schema pattern `phase167_...`), with prerequisite tables limited to `fansub_groups`/`fansub_group_aliases` (mirroring `fansub_story_preview_postgres_test.go`'s minimal-fixture style: seed exactly the tables/columns exercised, not a full migration chain).
- `backend/internal/repository/fansub_story_preview_postgres_test.go` is the closest same-domain example: DSN env constant, database-name regex guard, `seedFixture`/`t.Cleanup` pair, real `pgxpool.Pool` against real Postgres.
- `backend/internal/repository/query_counter.go` + `segment_origin_query_budget_test.go` — reuse directly for the D-08 constant-query-budget assertion (see 4.1).

**Handler behavior test pattern (httptest + fake repo, per CLAUDE.md's Teststil rule):** `backend/internal/handlers/fansub_project_resolver_handler_test.go` is the exact compliant precedent — explicitly written specifically because sibling tests in the same file/package (`fansub_group_history_handler_test.go`) still use the forbidden source-inspection pattern. It defines a narrow interface (`fansubProjectResolverRepo`), a hand-rolled fake implementing it, `httptest.NewRecorder()` + `gin.CreateTestContext()`, and asserts on `recorder.Code`/`recorder.Body`. **`FansubHandler.fansubRepo` is a concrete `*repository.FansubRepository` field, not an interface** — the existing `ListFansubAliases`/`CreateFansubAlias`/`DeleteFansubAlias` handlers cannot be tested this way without a seam. Recommendation: follow the `projectResolverRepo`/`fansubProjectResolverRepo` precedent exactly — add a new narrow interface field (e.g. `fansubMatchRepo fansubGroupMatchRepo`) to `FansubHandler` for whatever new endpoint(s) this phase adds (batch match, learn-alias, reassign-alias), rather than trying to retrofit the existing concrete-repo alias handlers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Normalizing a group/alias string for comparison | A third normalization function | Consolidate around the existing `normalizeAliasKey`/`normalizeFansubAliasKey` logic (they are byte-identical duplicates — pick one, ideally move to a shared internal package both `handlers` and `repository` can import) | Two independent copies already exist; a third would make the drift risk worse, and the SQL-side functional indexes are pinned to this exact `regexp_replace(lower(f_unaccent(...)),'[^a-z0-9]+','','g')` expression |
| Batched fuzzy/exact group matching | A new bespoke matching query from scratch | Adapt `buildSearchFansubQuery`/`buildSearchFansubOrder` (`search_fansub.go`) to array input | Already implements the exact rank order (alias/name exact → name exact → slug exact → alias trigram → name trigram) this phase's D-08 origin-hint needs to describe ("erkannt aus Dateiname: X → Y (Alias)") |
| Query-count regression guard | A hand-rolled query logger | `queryCounter` (`repository/query_counter.go`), already a `pgx.QueryTracer` | Established, reused pattern (Phase 131, Phase 156); wiring is a few lines via a second traced pool on the same schema |
| Isolated Postgres test fixture | A new ad-hoc test-DB bootstrap | `testsupport.OpenPhaseNNNPostgres` template (copy `phase165_postgres.go`/`phase106_postgres.go` shape into a new `phase167_postgres.go`) | Enforces the fail-closed DB/schema name regex guard that keeps tests off `team4s_v2`; reinventing it risks a real accidental-write incident |
| Audit logging for alias mutations | A new audit call shape | `auditLogRepo.Write(..., repository.AuditLogEntry{...})` exactly as used in `fansub_group_aliases.go`'s `CreateFansubAlias`/`DeleteFansubAlias` | Established `EventType`/`ScopeType`/`Action`/`Outcome`/`Payload` shape already wired to the existing audit log viewer; a different shape would create a second audit dialect |

**Key insight:** almost everything D-01/D-02/D-03/D-09 need (alias CRUD, permission gating, audit logging, trigram suggestion query shape) **already exists in this codebase**, just not wired to the import flow. The actual net-new work is narrower than the phase description implies: (1) hardening the parser (genuinely new regex/denylist logic), (2) a batched matching query adapted from an existing single-term query, (3) wiring "learn as alias" into the existing `CreateFansubAlias` path from the import-apply flow instead of `upsertImportFansubGroup`, and (4) a reassign action that has no precedent yet.

## Common Pitfalls

### Pitfall 1: Copying `fansub_group_history_handler_test.go`'s test style
**What goes wrong:** A new alias-handler test reads its own handler's `.go` source and asserts a substring is present, satisfying CLAUDE.md's letter (a test exists, it's green) but not its intent (the guard is never actually executed).
**Why it happens:** It's the closest same-package precedent by file proximity, and CLAUDE.md itself documents this as a large (49-file, 236-assertion) existing pattern in the repo — "closest analog" instinct points at it.
**How to avoid:** Use `fansub_project_resolver_handler_test.go` instead — it was written specifically to demonstrate the compliant alternative in this exact package.
**Warning signs:** A test file that imports `os` and `regexp` to parse its own package's source, or asserts `strings.Contains(body, "someIdentifier")` instead of a real HTTP status/JSON body assertion.

### Pitfall 2: Growing `admin_episode_import.go` or `page.tsx` past their current size
**What goes wrong:** The natural place to add "resolve fansub groups for this preview" is right next to `buildEpisodeImportPreview` in `admin_episode_import.go` (already 775 lines) or the group-chip UI in `page.tsx` (597 lines) — both already far over the 450-line CLAUDE.md limit.
**Why it happens:** Least-friction edit location.
**How to avoid:** New Go logic goes in a new file in the same package (Go has no per-file import cost); new significant UI logic goes in `EpisodeImportMappingRow.tsx` (326 lines, real headroom) or an entirely new component file, called from the existing entry points with minimal glue left in the oversized files.
**Warning signs:** `wc -l` creeping upward on either file during implementation.

### Pitfall 3: Matching the normalized SQL expression inexactly
**What goes wrong:** A new batch query writes its own ad-hoc `lower(regexp_replace(...))` variant that differs subtly (e.g., different regex character class, or omitting `f_unaccent`) from the existing functional indexes' expression (`regexp_replace(lower(f_unaccent(col)), '[^a-z0-9]+', '', 'g')`), causing the planner to silently fall back to a sequential scan instead of using `idx_fansub_groups_name_norm`/`idx_fansub_groups_slug_norm`.
**Why it happens:** Postgres only uses a functional index when the query expression is byte-identical to the indexed expression.
**How to avoid:** Copy the expression verbatim from `0140_search_foundation.up.sql`/`search_fansub.go` rather than re-deriving it.
**Warning signs:** `EXPLAIN (ANALYZE)` on the new batch query showing `Seq Scan on fansub_groups` instead of `Index Scan`/`Bitmap Index Scan`.

### Pitfall 4: Treating branch-1 bracket matching as "the parser," ignoring bracket ordering
**What goes wrong:** A denylist (D-06) applied only to the fallback/suffix branch, leaving the "first bracket wins" branch free to still return a checksum if it happens to be the first bracket (see Section 2's additional risk note — not in the client's table, but a real edge the new design must not reintroduce).
**Why it happens:** The client's table happens to have the checksum bracket in a position (`Serie_01_[AEC71BC3].mkv`) where it's the *only* bracket, masking the ordering issue.
**How to avoid:** Apply the technical-token denylist uniformly across every candidate bracket (and every candidate scene-schema/suffix match), scanning left-to-right for the first bracket that does NOT match a denylisted pattern, rather than unconditionally trusting the first bracket found.
**Warning signs:** A hypothetical test case with checksum-before-group bracket ordering failing.

### Pitfall 5: Go-side normalization not unaccenting, SQL-side normalization does
**What goes wrong:** An alias like `Café-Subs` normalizes to `cafsubs` in Go (`é` silently dropped) but the SQL-side functional index computes `regexp_replace(lower(f_unaccent('Café-Subs')),...)` → `cafesubs` (é→e via unaccent, then kept). If the new batch-matching query relies on the Go-computed `normalized_alias` column value (written at alias-create time) rather than re-deriving via SQL `f_unaccent`, an accented alias could permanently mismatch its own SQL-side functional-index computation on `fansub_groups.name`/`.slug`.
**Why it happens:** Two independent normalization implementations (Go ASCII-only, SQL unaccent-then-strip) were never reconciled — pre-existing, not introduced by this phase.
**How to avoid:** Either update `normalizeAliasKey`/`normalizeFansubAliasKey` to call an unaccent step before stripping non-alphanumerics (bringing Go in line with SQL), or ensure all exact-match comparisons for names/slugs go through the SQL-side `f_unaccent` expression rather than comparing against a Go-normalized alias string. Flagged as an Open Question below since it's outside this phase's explicit decisions but directly affects matching correctness for non-ASCII group names.

## Runtime State Inventory

Not applicable — this is a code-hardening/feature phase, not a rename/refactor/migration phase. No trigger condition per the research protocol.

## Candidate Requirement IDs

No REQ-IDs exist for Phase 167 yet. Proposed candidates (planner to finalize numbering/wording and add to `.planning/REQUIREMENTS.md` following the exact Phase-165-style block):

| Candidate ID | Description | Source |
|---|---|---|
| REQ-167-01 | Parser wertet ausschließlich den Dateinamen aus; Pfad nur als Rückfallebene bei leerem Dateinamen | D-05, USER-REQUEST §A |
| REQ-167-02 | Hex-Prüfsummen (8-stellig), Auflösungen, Codecs/Container, Sprachkennungen, Jahreszahlen, reine Zahlen gelten nie als Gruppenname (Denylist gilt für JEDE Kandidaten-Klammer, nicht nur den Fallback-Zweig) | D-06, USER-REQUEST §A |
| REQ-167-03 | Szene-Schema `gruppe-titel.sXXeYY…` wird als neues Muster erkannt (heute nicht vorhanden, kein Bugfix sondern Neubau) | D-07, USER-REQUEST §A |
| REQ-167-04 | Die vier bereits funktionierenden Muster (Klammer-Präfix mit/ohne Leerzeichen, Jellyfin-S01E01-Suffix, Klammer am Ende) regressieren nicht | D-07, USER-REQUEST §A |
| REQ-167-05 | Kein sicher erkennbares Kürzel ⇒ Parser liefert leer statt zu raten | D-06, USER-REQUEST §A |
| REQ-167-06 | Tabellentests mit allen 13 realen Dateinamen (inkl. beider Fehlerfälle) in `importutil` | D-10, USER-REQUEST §A |
| REQ-167-07 | Erkanntes Kürzel wird gebündelt (1 Query/Vorschau) gegen `fansub_groups.name`/`.slug`/`fansub_group_aliases.normalized_alias`, normalisiert, abgeglichen | D-08, USER-REQUEST §B |
| REQ-167-08 | Eindeutiger Treffer ⇒ Gruppe im Mapping vorausgewählt, mit sichtbarem Herkunftshinweis („erkannt aus Dateiname: X → Y (Alias)") | D-08, USER-REQUEST §B |
| REQ-167-09 | Admin kann Vorauswahl jederzeit ändern; nichts wird ohne sichtbaren Hinweis automatisch gesetzt | USER-REQUEST §B |
| REQ-167-10 | Der bestehende Auto-Upsert aus Dateinamen (`upsertImportFansubGroup` über den Namens-Fallback in `resolveImportFansubSelection`) entfällt bzw. ist auf eine ausdrückliche Admin-Aktion beschränkt; kein Anlegen neuer `fansub_groups` mehr aus reiner Fallback-Namensableitung | D-03, USER-REQUEST §C |
| REQ-167-11 | Ähnliche Gruppen werden bei fehlendem Treffer über den Trigram-Index vorgeschlagen, nie automatisch übernommen | D-03, USER-REQUEST §C |
| REQ-167-12 | Kein Treffer ⇒ Gruppenauswahl bleibt leer, Admin wählt manuell | USER-REQUEST §C |
| REQ-167-13 | Ordnet der Admin ein unbekanntes Kürzel einer Gruppe zu, wird es automatisch als weiterer Alias dieser Gruppe gespeichert | D-01, USER-REQUEST §D |
| REQ-167-14 | Mehrere Aliase pro Gruppe erlaubt; ein Alias gehört systemweit genau einer Gruppe (bestehende `UNIQUE(normalized_alias)` bleibt die Durchsetzungsquelle) | D-01, USER-REQUEST §D |
| REQ-167-15 | Kürzel gehört bereits einer anderen Gruppe ⇒ sichtbarer Hinweis „Kürzel gehört bereits zu <Gruppe>", kein stiller Wechsel, Umhängen nur auf ausdrückliche Aktion | D-02, USER-REQUEST §D |
| REQ-167-16 | Alias-Pflege (anlegen, umhängen, löschen) ist in der Gruppenverwaltung sichtbar und bedienbar | D-09, USER-REQUEST §D |
| REQ-167-17 | Alle Alias-Mutationen sind mit Audit-Attribution per user_id protokolliert (bestehendes `auditLogRepo.Write`-Muster, erweitert um Lern-/Umhäng-Events) | D-09, USER-REQUEST §D |
| REQ-167-18 | Versionskennung `v2`/`v3`/`v4` am Dateinamen-Ende (auch nach Prüfsumme/Klammern) wird als Release-Version statt `v1` vorgeschlagen, änderbar | D-04, USER-REQUEST §E |
| REQ-167-19 | Integrationstests gegen echte isolierte Test-Datenbank (neues `testsupport.OpenPhase167Postgres`) für Alias-Schreibpfad und Eindeutigkeitsregel | D-10 |
| REQ-167-20 | Query-Budget-Test belegt konstante Abfragezahl unabhängig von der Dateianzahl in der Vorschau (mit `queryCounter`) | D-08 |
| REQ-167-21 | Doppelfolgen (`Naruto_026-027`) werden im bestehenden Import-Verhalten geprüft und dokumentiert, keine Änderung der Episodenzuordnung | Scopegrenze |
| REQ-167-22 | Neue/angefasste UI-Elemente nutzen `@/components/ui`-Primitives, deutsche Texte mit echten Umlauten; keine der beiden bereits übergroßen Dateien (`admin_episode_import.go`, `page.tsx`) wächst weiter | D-11 |
| REQ-167-23 | Handler-Verhalten für neue/erweiterte Endpunkte (Batch-Match, Alias-Lernen, Umhängen) ist mit `httptest` + Fake-Repository über eine neue schmale Interface-Abstraktion getestet (kein Source-Inspection-Test) | CLAUDE.md Teststil |

## Package Legitimacy Audit

Not applicable — this phase introduces no new external dependencies (no new npm or Go module). All work uses existing stdlib (`regexp`, `strings`), existing `pgx`/`gin`/`testify` (already in `go.mod`), and existing Postgres extensions (`unaccent`, `pg_trgm`, already enabled via prior migrations). No `slopcheck`/registry verification needed.

## Open Questions / Risks

1. **Reassign-alias ("umhängen") has no existing repository method.**
   - What we know: `CreateAlias`/`DeleteAlias`/`ListAliases` exist; no `ReassignAlias`/`MoveAlias`.
   - What's unclear: whether D-02/D-09's "Umhängen nur auf ausdrückliche Aktion" should be implemented as a single atomic `UPDATE fansub_group_aliases SET fansub_group_id = $1 WHERE id = $2` (one audit event `fansub_group_alias.reassigned`) or composed from existing Delete+Create (two audit events, and a moment where the alias briefly doesn't exist).
   - Recommendation: add a dedicated `ReassignAlias` method + `fansub_group_alias.reassigned` audit event for atomicity and clean audit history; this is Claude's Discretion per CONTEXT.md ("Ort der Alias-Verwaltung... genaue Darstellung"), not a locked decision, so the planner should decide and the discuss-phase/plan-check can confirm.

2. **Go-side alias normalization does not unaccent; SQL-side functional indexes do (Pitfall 5).**
   - What we know: both are pre-existing, both used for different comparisons (Go for `normalized_alias` storage, SQL for `fansub_groups.name`/`.slug` functional-index matching).
   - What's unclear: whether this phase should fix the Go-side asymmetry (touches shared, already-live normalization used elsewhere, e.g. `search_fansub.go`) or work around it locally in the new batch-matching query by always comparing through the SQL `f_unaccent` expression instead of trusting stored `normalized_alias` values for cross-checks against `fansub_groups`.
   - Recommendation: scope the fix narrowly — new batch-matching SQL should always apply `f_unaccent` server-side to the raw parsed candidate string rather than relying on a Go-normalized value for the `fansub_groups.name`/`.slug` comparisons (it already must, for `fansub_group_aliases.normalized_alias` equality, since that column is genuinely ASCII-stripped-only). Flag the general Go/SQL normalization asymmetry as a separate cleanup, out of this phase's explicit scope, unless a real accented-alias case surfaces during D-10's testing.

3. **Extent of frontend UI-primitive migration inside `EpisodeImportMappingRow.tsx`.**
   - What we know: the whole existing group-chip/search UI in this file uses native `<input>`/`<button>`, violating the current (not-yet-error-level) CLAUDE.md UI rule.
   - What's unclear: whether adding the origin-hint + alias-learn-confirm UI should also migrate the pre-existing native controls in the same row to `@/components/ui` primitives, or whether that's out-of-scope scope creep for this phase (CLAUDE.md's own enforcement note says ESLint is currently `warn`, escalating to `error` "nach Migration der Altfälle" — implying a deliberate phased migration, not required all-at-once).
   - Recommendation: new interactive elements this phase adds must use primitives; leave the pre-existing native controls as-is unless the discuss-phase/user explicitly wants the migration bundled in. Flag as a discuss-phase question rather than deciding unilaterally.

4. **`EpisodeImportMappingRow`/`SelectedFansubGroupInput` contract needs new field(s) for the origin hint.**
   - What we know: neither the Go model (`backend/internal/models/episode_import.go`) nor the contract (`shared/contracts/admin-content.yaml:1772-1783`) currently has any field to carry "this selection came from an alias match, here's which alias" — only `fansub_group_name` (raw derived text) and `fansub_groups`/`fansub_group_id` (operator selection) exist today.
   - What's unclear: exact shape (a new `fansub_group_match_origin: string | null` field on `EpisodeImportMappingRow`? A richer object replacing the plain `EpisodeImportSelectedFansubGroup`?).
   - Recommendation: planner should design this as an additive field on `EpisodeImportMappingRow` (Go DTO + OpenAPI/admin-content.yaml + TS type + `frontend/src/lib/api.ts`, per the repo's QUAL-01-style convention of keeping all four in sync), populated once during batch matching, never persisted (display-only, consistent with `episodeImportReleaseTitle`'s established "preview-only, never written back" precedent at `episode_import_repository_release_helpers.go:417-424`).

5. **Version-detection regex edge case: `[GK]No Game, No Life - 01(720p 10bit)[C281B950]v4.mkv`.**
   - What we know: `v4` sits directly after the checksum bracket with no separator, immediately before the extension.
   - What's unclear: whether the version pattern should be a strict `v[2-4]$` (post extension-strip) suffix check, or needs to tolerate being glued directly onto a preceding `]` with zero whitespace/punctuation (as in this real sample) versus other samples where it might follow a `.`/`-`/space.
   - Recommendation: the table test (D-10) already includes this exact filename in the parser fixtures; design the version regex against it directly (e.g., `(?i)v([2-9])$` applied to the extension-stripped filename, checked independently of and after the group-name extraction) rather than trying to derive a rule abstractly.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Postgres 16 (`team4sv30-db`) | Alias/group tables, trigram/unaccent extensions | ✓ `[VERIFIED: docker compose ps]` | 16 (postgres:16 image) | — |
| `unaccent` extension + `f_unaccent` wrapper | Normalized matching, trigram suggestions | ✓ `[VERIFIED: migration 0140/0152 applied, live query against fansub_groups succeeded]` | — | — |
| Go 1.25 / `pgx/v5` / `testify` | Parser, repository, tests | ✓ `[VERIFIED: go.mod, existing test files]` | per `backend/go.mod` | — |
| Next.js 16 / Vitest 3 | Frontend UI changes and tests | ✓ `[VERIFIED: package.json, existing *.test.tsx files]` | per `frontend/package.json` | — |
| Docker Compose stack (`team4sv30-*`) | Live read-only verification, future integration test runs | ✓ `[VERIFIED: docker compose ps, all healthy]` | — | — |

No missing dependencies; no fallback needed.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | Go native `testing` + `github.com/stretchr/testify` (require/assert) `[VERIFIED: go.mod, many _test.go files]` |
| Backend config file | none — `go test ./...` (no framework config needed) |
| Frontend framework | Vitest 3, config `frontend/vitest.config.ts` `[VERIFIED: package.json, vitest.config.ts referenced in CLAUDE.md tech stack]` |
| Quick run command (parser) | `cd backend && go test ./internal/importutil/... -run TestDeriveFansubGroupName -v` |
| Quick run command (repository, fake-only) | `cd backend && go test ./internal/repository/... -run TestResolveImportFansub -v` |
| Quick run command (frontend) | `cd frontend && npx vitest run src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.test.tsx` |
| Full backend suite | `cd backend && go test ./...` |
| Full frontend suite | `cd frontend && npm test` |
| Real-DB integration suite | `TEAM4S_PHASE167_TEST_DSN=postgres://... go test ./internal/repository/... -run Phase167 -v` (skips cleanly if env var unset, per existing convention) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-167-01..06 | Parser correctness against all 13 real filenames + new denylist/scene-schema cases | unit (table-driven) | `go test ./internal/importutil/... -run TestDeriveFansubGroupName -v` | ❌ Wave 0 — new file `fansub_group_test.go` |
| REQ-167-07..09 | Batch matching resolves exact name/slug/alias, sets origin hint, leaves ambiguous/no-match unresolved | unit (fake pool or table-driven SQL builder test, mirroring `anime_test.go`'s `TestBuildAnimeListWhere_*` style) + integration | `go test ./internal/repository/... -run TestResolveFansubGroupMatches -v` | ❌ Wave 0 |
| REQ-167-10..12 | No new group created from filename fallback; trigram suggestion returned but not applied | unit (fake repo) + integration (real DB proves no `INSERT INTO fansub_groups` fires) | `go test ./internal/repository/... -run TestApplyDoesNotAutoCreateGroup -v` | ❌ Wave 0 |
| REQ-167-13..15 | Alias auto-learned on manual assignment; conflict hint when alias belongs elsewhere; no silent reassignment | unit (httptest+fake, per `fansub_project_resolver_handler_test.go` pattern) + integration (real UNIQUE constraint proof) | `go test ./internal/handlers/... -run TestLearnFansubAlias -v` | ❌ Wave 0 |
| REQ-167-16..17 | Alias CRUD + reassign visible in group admin UI, audited | unit (existing `fansub_group_aliases.go` handlers already partially covered — check for existing tests) + frontend component test | `go test ./internal/handlers/... -run TestFansubAlias -v` ; `npx vitest run <new alias tab test>` | ⚠️ partial — check for existing `fansub_group_aliases_test.go` (not found in this research; likely ❌ Wave 0) |
| REQ-167-18 | Version v2/v3/v4 detected and pre-filled, admin-editable | unit (table-driven, same file/pattern as parser) | `go test ./internal/importutil/... -run TestDeriveReleaseVersion -v` | ❌ Wave 0 |
| REQ-167-19 | Real-DB alias uniqueness + write-path proof | integration | `TEAM4S_PHASE167_TEST_DSN=... go test ./internal/repository/... -run Phase167Alias -v` | ❌ Wave 0 — new `phase167_postgres.go` testsupport file |
| REQ-167-20 | Constant query budget for N-file preview | integration (query_counter) | `TEAM4S_PHASE167_TEST_DSN=... go test ./internal/repository/... -run Phase167QueryBudget -v` | ❌ Wave 0 |
| REQ-167-21 | Double-episode filenames documented, no assignment regression | unit (existing `episode_import_repository_autoassign_test.go` likely already covers double-episode targeting; add documentation-only assertion if needed) | `go test ./internal/repository/... -run TestEpisodeImportAutoassign -v` | ⚠️ likely partial — verify existing coverage during planning |
| REQ-167-22 | UI primitives, umlauts, file-size budget | manual/lint (no automated line-count gate exists today) | `wc -l backend/internal/handlers/admin_episode_import.go frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` (must stay ≤ current values) | ❌ no automated gate — recommend a Wave 0 script/CI check if the planner wants it enforced, else manual verification step |
| REQ-167-23 | Handler tests use httptest+fake, not source-inspection | unit | covered by the same test files as REQ-167-13..17 | — |

### Sampling Rate
- **Per task commit:** targeted `go test ./internal/importutil/... ./internal/repository/... ./internal/handlers/... -run <relevant>` plus targeted `npx vitest run <changed files>`
- **Per wave merge:** full `go test ./...` (backend) + `npm test` (frontend) + integration suite if `TEAM4S_PHASE167_TEST_DSN` is exported
- **Phase gate:** full suite green (including the real-DB integration tests, D-10 explicitly requires these not be skipped) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/internal/importutil/fansub_group_test.go` — new file, table-driven, covers REQ-167-01..06 and REQ-167-18 (version detection can live in the same file/package or a sibling `fansub_release_version.go`+`_test.go`)
- [ ] `backend/internal/testsupport/phase167_postgres.go` — new file, `OpenPhase167Postgres`, covers REQ-167-19/20 prerequisite
- [ ] `backend/internal/repository/phase167_fansub_match_test.go` (or similar) — covers REQ-167-07..12, 19, 20
- [ ] `backend/internal/handlers/phase167_fansub_learn_test.go` (or similar, httptest+fake per Section 4.4) — covers REQ-167-13..17, 23
- [ ] Verify existing coverage for REQ-167-16 (`fansub_group_aliases.go` may already have handler tests not surfaced by this research's targeted greps — planner should re-grep `fansub_group_aliases_test.go`/`fansub_aliases_test.go` at plan time) and REQ-167-21 (`episode_import_repository_autoassign_test.go` double-episode coverage) before assuming Wave 0 gaps for these two.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Unchanged — Keycloak-backed auth, not touched by this phase |
| V3 Session Management | no | Unchanged |
| V4 Access Control | yes | Reuse existing `permissionSvc.CanForFansubGroup(ctx, actor, permissions.ActionFansubGroupEdit, fansubID)` gate for every alias mutation (create/reassign/delete/learn-from-import), exactly as `fansub_group_aliases.go` already does — no new authorization model needed |
| V5 Input Validation | yes | Alias text length/charset validation already exists (`validateFansubAliasCreateRequest`, 120-char cap); new batch-match endpoint must validate/bound the array size of filenames per request (avoid unbounded `= ANY($1::text[])` arrays from a malformed/huge payload) |
| V6 Cryptography | no | Not applicable |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via filename-derived strings fed into batch matching query | Tampering | Already mitigated by pgx parameterized queries throughout the codebase (`$1`, `= ANY($1::text[])`) — new code must keep every filename-derived value as a bound parameter, never string-concatenated into SQL, matching every existing query in this codebase |
| IDOR / cross-group alias mutation (e.g., reassigning an alias belonging to a group the actor doesn't manage) | Elevation of Privilege | `CanForFansubGroup` check is per-target-group already; a new `ReassignAlias` action must check permission against **both** the source and destination `fansub_group_id` before moving an alias, not just the destination (not yet needed since no reassign endpoint exists — must be added correctly from the start) |
| ReDoS via pathological filenames in parser regexes | Denial of Service | Filenames are short (bounded by filesystem limits, effectively <260 chars); existing and new regexes here are simple bounded-quantifier patterns (no nested unbounded quantifiers over shared prefixes) — low risk, but the new scene-schema/denylist patterns should avoid catastrophic-backtracking shapes (e.g., avoid `(.*)+` style constructs) |
| Denial of service via oversized batch-match request | Denial of Service | New "resolve N filenames" endpoint/query should reuse the existing preview's natural bound (one Jellyfin folder's file count — already implicitly bounded by real-world folder sizes) but should not blindly trust an unbounded array length from the request body without a sanity cap |

## Sources

### Primary (HIGH confidence — direct code/schema/live-DB reads this session)
- `backend/internal/importutil/fansub_group.go` — full file read
- `backend/internal/handlers/admin_episode_import.go` — targeted reads (lines 1-100, 380-480), `func` inventory via grep
- `backend/internal/repository/episode_import_repository_fansub_helpers.go` — full file read
- `backend/internal/repository/episode_import_repository_release_helpers.go` — full read of relevant sections (1-140, 209-300, 380-428)
- `backend/internal/repository/episode_import_repository_apply.go` — targeted read (1-80)
- `backend/internal/handlers/fansub_group_aliases.go` — full file read
- `backend/internal/repository/fansub_repository.go` — targeted reads (940-1040, 1690-1740)
- `backend/internal/handlers/fansub_aliases.go` — targeted read (100-145)
- `backend/internal/handlers/fansub_alias_validation.go` — full file read
- `backend/internal/repository/search_fansub.go` — full file read
- `backend/internal/repository/query_counter.go` — full file read
- `backend/internal/testsupport/phase165_postgres.go` — full file read
- `backend/internal/repository/segment_origin_query_budget_test.go` — targeted read
- `backend/internal/repository/fansub_story_preview_postgres_test.go` — targeted read (1-110)
- `backend/internal/handlers/fansub_project_resolver_handler_test.go` — targeted read (1-90)
- `backend/internal/handlers/fansub_group_history_handler_test.go` — targeted read (anti-pattern confirmation)
- `database/migrations/0009_fansub_groups.up.sql`, `0014_fansub_group_aliases.up.sql`, `0140_search_foundation.up.sql`, `0152_f_unaccent_search_path_fix.up.sql` — full reads
- `backend/internal/models/episode_import.go` — targeted read (50-90)
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` — full file read
- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx`, `EpisodeImportFolderSelector.tsx` — grep/wc-l inventory
- `shared/contracts/admin-content.yaml` — grep for `EpisodeImportMappingRow` schema (lines 1772-1783)
- Live read-only query against `team4sv30-db` (`team4s_v2`): `SELECT count(*) FROM fansub_groups/fansub_group_aliases`, full row dumps of both tables (no writes/DDL issued)
- `.planning/phases/167-fansub-gruppenerkennung-beim-import/167-CONTEXT.md`, `167-USER-REQUEST.md`
- `.planning/REQUIREMENTS.md` — grep for `Phase 165/166/167` (confirms no Phase 167 REQ-IDs exist yet)
- `.planning/STATE.md` — grep for fansub/import-related keywords (no additional Phase 167 history found beyond CONTEXT.md/USER-REQUEST.md)
- `CLAUDE.md` — project instructions (UI primitives, umlauts, file-size limit, test style)

### Secondary / Tertiary
None — every claim in this document traces to a direct file read, grep, or live read-only query performed in this session. No WebSearch/Context7 lookups were needed since this is entirely an internal-codebase research task (no new external libraries).

## Metadata

**Confidence breakdown:**
- Current parser/apply-path behavior: HIGH — verified by full-file reads and hand-traced regex execution against all 13 real filenames, cross-checked against the client's claims with zero discrepancies
- Alias/DB infrastructure: HIGH — verified by migration file reads plus a live read-only query confirming row counts match CONTEXT.md's claim exactly
- Test-pattern analogs: HIGH — verified by reading actual existing test files in this exact domain (fansub/episode-import), including both a compliant and a non-compliant precedent
- New-feature design recommendations (batch query shape, new contract fields, reassign method): MEDIUM — these are informed extrapolations from verified existing patterns, not yet-written code; flagged explicitly as sketches/recommendations, not verified implementations
- Security domain: MEDIUM — ASVS mapping is standard reasoning applied to a verified existing permission/audit pattern, not independently penetration-tested

**Research date:** 2026-09-23
**Valid until:** 30 days (stable brownfield codebase; re-verify migration/row-count facts if execution starts significantly later, since `fansub_groups`/`fansub_group_aliases` content is live operator data that can change)

## RESEARCH COMPLETE
