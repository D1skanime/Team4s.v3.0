---
phase: quick-260923-amz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/internal/services/anisearch_episode_import.go
  - backend/internal/services/anisearch_episode_import_test.go
  - backend/internal/repository/episode_import_repository_apply.go
  - backend/internal/repository/episode_import_repository_test.go
  - backend/internal/repository/public_release_name.go
  - backend/internal/repository/release_detail_public_repository_test.go
  - "frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts"
  - "frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts"
  - .planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md
autonomous: true
requirements: [GAP-22, GAP-23]

must_haves:
  truths:
    - "Ein neu angelegter/importierter Film (anime.type=film, episode.episode_type=movie) erhält als kanonischen Episodentitel den Anime-/Filmtitel, niemals den literalen Fallback „Episode 1"/„Folge 1" (GAP-22)"
    - "Von Hand gesetzte Episodentitel werden beim Import nie überschrieben; Serien-Episodentitel und ihr bestehendes „Episode N"-Fallback-Verhalten bleiben unverändert"
    - "Der öffentliche Standard-Release-Name eines Films ohne Gruppentitel beginnt mit dem Anime-/Filmtitel, z. B. „.hack//G.U. Trilogy · (AnimeOwnage) · v1" (GAP-23)"
    - "Ein von der Gruppe eingetragener Release-Titel hat für Filme weiterhin uneingeschränkt Vorrang vor dem berechneten Standard-Namen"
    - "Der Admin-Editor-Platzhalter für den Release-Namen (episodeVersionEditorUtils.ts defaultReleaseTitle) zeigt bei einer als episode_type=movie eingestuften Episode denselben Filmtitel wie die Backend-SQL-Regel, nicht „Episode NNN" — eine Regel, nicht zwei"
    - "165-UAT.md dokumentiert GAP-22 und GAP-23 als status: resolved mit Datum und Begründung"
  artifacts:
    - path: "backend/internal/repository/episode_import_repository_apply.go"
      provides: "episodeImportDisplayTitle(canonical, isFilm, animeTitle) — einziger Ort, der beim Schreiben den Film-Fallback synthetisiert"
      contains: "isFilm"
    - path: "backend/internal/repository/public_release_name.go"
      provides: "filmEpisodeSQL/filmTitleSQL, in publicReleaseNameSQL als erster Namensbestandteil verdrahtet"
      contains: "filmEpisodeSQL"
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts"
      provides: "defaultReleaseTitle nutzt context.anime_title als ersten Bestandteil bei episode_type=movie"
      contains: "episode_type === 'movie'"
    - path: ".planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md"
      provides: "GAP-22/GAP-23 resolved-Einträge"
      contains: "GAP-23"
  key_links:
    - from: "backend/internal/repository/public_release_name.go publicReleaseNameSQL"
      to: "backend/internal/repository/public_release_name.go filmEpisodeSQL/filmTitleSQL"
      via: "CASE WHEN filmEpisodeSQL(...) THEN filmTitleSQL(...) ELSE <Folge-N-Fallback> END als erster Namensbestandteil"
      pattern: "filmEpisodeSQL\\("
    - from: "backend/internal/repository/episode_import_repository_apply.go applyReleaseNative"
      to: "backend/internal/repository/episode_import_repository_apply.go episodeImportDisplayTitle"
      via: "isFilm := mapAnimeTypeToEpisodeType(animeType) == \"movie\", weitergereicht an upsertImportEpisode"
      pattern: "isFilm :="
    - from: "frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts defaultReleaseTitle"
      to: "EpisodeVersionEditorContext.episode.episode_type (frontend/src/types/episodeClassification.ts)"
      via: "context.episode?.episode_type === 'movie' steuert den ersten Namensbestandteil"
      pattern: "episode_type === 'movie'"
---

<objective>
GAP-22 + GAP-23 (Phase 165, Auftraggeber-Entscheidung 2026-09-23 nach Live-Test mit Anime #6
„.hack//G.U. Trilogy", type=film, 1 Episode mit episode_type=movie, Episodentitel „Episode 1").
Hintergrund: 165-USER-REQUEST §23 — „Für Filme dürfen Fallbacks nicht Folge 1/Episode 1 anzeigen,
wenn ein Filmtitel vorhanden ist".

**GAP-22 (Episodentitel der Film-Einheit):** Beim Anlegen/Import einer Film-Anime
(anime.type=film bzw. episode.episode_type=movie) erhält die kanonische Episode den
Anime-/Filmtitel statt des literalen Fallback-Strings „Episode N"/„Folge N". Root Cause: ZWEI
Stellen synthetisieren unabhängig voneinander diesen literalen Fallback —
`episodeDisplayTitle` in `anisearch_episode_import.go` (AniSearch-HTML-Parser-Ebene, kennt
weder Anime-Typ noch Anime-Titel) und `episodeImportDisplayTitle` in
`episode_import_repository_apply.go` (DB-Schreib-Ebene, kennt bereits `anime.type` — dort wird
`episodeTypeID` über `mapAnimeTypeToEpisodeType` abgeleitet). Der Fix zentralisiert die
Fallback-Entscheidung auf die einzige Stelle, die Anime-Typ UND -Titel kennt: die Parser-Ebene
gibt bei fehlendem Titel künftig `""`/`nil` zurück statt selbst „Episode N" zu erfinden; die
DB-Schreib-Ebene entscheidet als einzige Instanz zwischen echtem gescraptem Titel, Filmtitel
(bei isFilm) und „Episode N" (Serien, unverändert). Von Hand gesetzte Episodentitel werden
weiterhin nie überschrieben (bestehende `COALESCE(NULLIF(BTRIM(title),''), $1)`-Update-Logik,
unverändert). Bestandsdaten werden NICHT migriert (Auftraggeber legt betroffene Filme bei
Bedarf neu an).

**GAP-23 (Standard-Release-Name bei Filmen):** `public_release_name.go`s
`publicReleaseNameSQL` baut den öffentlichen Standard-Release-Namen als
„<erster Bestandteil> · (<Gruppen>) · <Version>". Für Filme (anime.type=film bzw.
episode.episode_type=movie) wird der erste Bestandteil ab jetzt IMMER der Anime-/Filmtitel
(nicht der Episodentitel oder „Folge N") — Beispiel: „.hack//G.U. Trilogy · (AnimeOwnage) · v1".
Serien sind unverändert. Ein von der Gruppe eingetragener Release-Titel
(`titleEnteredByGroupSQL`) hat weiterhin uneingeschränkt Vorrang, unverändert. Dieselbe Regel
gilt für den Admin-Platzhalter des Release-Namens
(`episodeVersionEditorUtils.ts` `defaultReleaseTitle`) — eine Regel, nicht zwei.

Verbindliche, bereits entschiedene Vorgaben (nicht neu verhandeln):
- Beide GAPs werden in `165-UAT.md` als `status: resolved` dokumentiert (Datum, kurze
  Begründung, LF-Zeilenenden beibehalten).
- Kein Datenänderung an `team4s_v2` (Produktivdatenbank); Bestandsdaten werden NICHT migriert.
- Direkt auf `main`, kein `git stash`, kein Push, keine Datei über 450 Zeilen.

Purpose: Filme zeigen ihren echten Titel statt eines bedeutungslosen „Episode 1"/„Folge 1" —
sowohl beim gespeicherten Episodentitel (GAP-22) als auch im öffentlichen und
admin-seitigen Standard-Release-Namen (GAP-23).
Output: Zentralisierte Film-Fallback-Logik in `episode_import_repository_apply.go` samt
vereinfachtem `episodeDisplayTitle` in `anisearch_episode_import.go`; `filmEpisodeSQL`/
`filmTitleSQL` in `public_release_name.go`, verdrahtet in `publicReleaseNameSQL`; angepasster
Admin-Platzhalter in `episodeVersionEditorUtils.ts`; Postgres-Integrationstest, Go-Unit-Tests
und ein Frontend-Test-Set für alle drei Oberflächen; GAP-22/GAP-23 als `status: resolved` in
`165-UAT.md`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@backend/internal/services/anisearch_episode_import.go
@backend/internal/repository/episode_import_repository_apply.go
@backend/internal/repository/public_release_name.go
@backend/internal/repository/release_detail_public_repository_test.go
@frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts
@.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md

<interfaces>
models.EpisodeImportCanonicalEpisode (backend/internal/models/episode_import.go, unverändert):
  type EpisodeImportCanonicalEpisode struct {
    EpisodeNumber      int32
    Title              *string
    TitlesByLanguage   map[string]string
    FillerType, FillerSource, FillerNote *string
    AniSearchEpisodeID *string
    ExistingEpisodeID  *int64
    ExistingTitle      *string
  }

mapAnimeTypeToEpisodeType (episode_import_repository_apply.go, unverändert, bereits GAP-12):
  func mapAnimeTypeToEpisodeType(animeType string) string {
    switch animeType { case "ova": return "ova"; case "ona": return "ona";
    case "film": return "movie"; case "special": return "special"; default: return "episode" }
  }
  anime_type-Enum seedet u.a. 'tv','film','ova','ona','special','bonus' (0001_init_anime.up.sql,
  0030_add_anime_types_table.up.sql). episode_types-Tabelle seedet u.a. 'episode','movie'
  (0031_add_episode_types_table.up.sql).

applyReleaseNative (episode_import_repository_apply.go, VOR diesem Plan, Zeile ~50-57):
  var animeType string
  if err := tx.QueryRow(ctx, "SELECT type FROM anime WHERE id = $1", input.AnimeID).Scan(&animeType); err != nil { ... }
  episodeTypeID, err := lookupIDByName(ctx, tx, "episode_types", mapAnimeTypeToEpisodeType(animeType))
  Aufrufschleife (Zeile ~73-87): upsertImportEpisode(ctx, tx, input.AnimeID, episodeTypeID, plan.canonicalByNumber[number])

upsertImportEpisode / episodeImportDisplayTitle (episode_import_repository_apply.go, VOR diesem Plan):
  func upsertImportEpisode(ctx context.Context, tx pgx.Tx, animeID int64, episodeTypeID int64,
    canonical models.EpisodeImportCanonicalEpisode) (int64, bool, error) { ...
    displayTitle := episodeImportDisplayTitle(canonical) ... }
  func episodeImportDisplayTitle(canonical models.EpisodeImportCanonicalEpisode) string {
    for _, lang := range []string{"de","en","ja"} { if t := strings.TrimSpace(canonical.TitlesByLanguage[lang]); t != "" { return t } }
    if canonical.Title != nil && strings.TrimSpace(*canonical.Title) != "" { return strings.TrimSpace(*canonical.Title) }
    return fmt.Sprintf("Episode %d", canonical.EpisodeNumber)
  }
  UPDATE-Zweig setzt title = COALESCE(NULLIF(BTRIM(title), ''), $1) — überschreibt NIE einen
  bereits vorhandenen (auch handgesetzten) Titel; nur dieser $1-Wert (displayTitle) ändert sich
  in diesem Plan.

episodeDisplayTitle (anisearch_episode_import.go, VOR diesem Plan, Zeile ~153, ~240-250):
  Aufruf: title := normalizeStringPtr(episodeDisplayTitle(number, titlesByLanguage, firstNonEmpty(titleFallback, cells[len(cells)-1])))
  func episodeDisplayTitle(number int32, titlesByLanguage map[string]string, fallback string) string {
    for _, lang := range []string{"de","en","ja"} { if t := strings.TrimSpace(titlesByLanguage[lang]); t != "" { return t } }
    if trimmed := strings.TrimSpace(fallback); trimmed != "" { return trimmed }
    return fmt.Sprintf("Episode %d", number)  // <- wird in diesem Plan entfernt
  }
  normalizeStringPtr("") gibt nil zurück (anisearch_client.go:1048) — eine leere Rückgabe aus
  episodeDisplayTitle propagiert also sauber als AniSearchEpisode.Title == nil, dann
  canonical.Title == nil.

publicReleaseNameSQL / titleEnteredByGroupSQL (public_release_name.go, VOR diesem Plan,
vollständig, 55 Zeilen): siehe @backend/internal/repository/public_release_name.go — beide
Aufrufer (release_detail_public_repository.go Zeile ~279, episode_version_public_query.go
Zeile ~132) übergeben ausschließlich (releaseVersionAlias, episodeAlias, groupNamesExpr) und
bleiben in diesem Plan UNVERÄNDERT — die neue Film-Logik ist vollständig innerhalb
publicReleaseNameSQL über selbstständige Scalar-Subqueries gekapselt (kein neuer JOIN im
FROM-Clause der beiden Aufrufer nötig, `episodeAlias` referenziert bereits `anime_id` und
`episode_type_id` der `episodes`-Tabelle direkt).

EpisodeVersionEditorContext / EpisodeClassification (frontend/src/types/episodeVersion.ts,
frontend/src/types/episodeClassification.ts, unverändert):
  interface EpisodeVersionEditorContext { ... version: EpisodeVersion; anime_title: string;
    episode?: EpisodeClassification | null; ... }
  interface EpisodeClassification { episode_id: number; episode_number: string;
    filler_type: EpisodeFillerType | null; filler_type_source: string | null;
    episode_type: EpisodeType | null; episode_type_source: string | null }
  type EpisodeType = 'episode' | 'special' | 'ova' | 'ona' | 'movie' | 'recap' | 'preview' |
    'prologue' | 'epilogue' | 'bonus'
  Backend füllt `Episode` bereits über GetEpisodeClassificationByReleaseVersion
  (admin_content_episode_version_editor_helpers.go:41-50) — kein Backend-Änderung nötig, das
  Feld existiert und ist bereits befüllt.

defaultReleaseTitle (episodeVersionEditorUtils.ts, VOR diesem Plan, Zeile 157-162):
  export function defaultReleaseTitle(context: EpisodeVersionEditorContext): string {
    const groups = [...context.selected_groups].sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id)
    const groupNames = groups.length > 0 ? groups.map((group) => group.name).join(' × ') : 'Fansub'
    const version = context.version.release_version || 'v1'
    return 'Episode ' + padEpisodeNumber(context.version.episode_number) + ' ' + String.fromCharCode(0x00B7) + ' (' + groupNames + ') ' + String.fromCharCode(0x00B7) + ' ' + version
  }
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: GAP-22 — Film-Episodentitel beim Import zentralisieren</name>
  <files>backend/internal/services/anisearch_episode_import.go, backend/internal/services/anisearch_episode_import_test.go, backend/internal/repository/episode_import_repository_apply.go, backend/internal/repository/episode_import_repository_test.go</files>
  <behavior>
    - Go-Test 1 (services, NEU, `TestParseAniSearchEpisodeListHTML_TitlelessRowYieldsNilTitleNotSyntheticFallback`):
      eine Episodenzeile ohne jeglichen Titelinhalt (`<tr><td>1</td><td></td></tr>` innerhalb
      des bestehenden `#episoden`-Fixture-Musters) liefert `episodes[0].Title == nil` — NICHT
      den String "Episode 1". Bestehende vier Tests in dieser Datei bleiben unverändert grün —
      sie prüfen ausschließlich Zeilen mit echtem Titelinhalt und sind vom Verhalten dieser
      Änderung nicht betroffen.
    - Go-Test 2 (repository, ANGEPASST, `TestEpisodeImportDisplayTitle_PrefersGermanEnglishJapaneseGenerated`
      in episode_import_repository_test.go Zeile 74-98): die vier bestehenden
      `episodeImportDisplayTitle(...)`-Aufrufe bekommen je zwei neue Argumente `false, ""`
      angehängt (isFilm=false, animeTitle="") — Erwartungswerte ("Deutsch"/"English"/
      "日本語"/"Episode 4") bleiben UNVERÄNDERT, das beweist: für eine Nicht-Film-Anime ändert
      sich am bestehenden Verhalten nichts.
    - Go-Test 3 (repository, NEU, `TestEpisodeImportDisplayTitle_UsesFilmTitleFallback`):
      (a) `episodeImportDisplayTitle({EpisodeNumber:1}, true, ".hack//G.U. Trilogy")` ==
      ".hack//G.U. Trilogy" (kein echter Titel gescraped, isFilm=true → Filmtitel statt
      "Episode 1"); (b) `episodeImportDisplayTitle({EpisodeNumber:1,
      TitlesByLanguage:{"de":"Ein echter Episodentitel"}}, true, ".hack//G.U. Trilogy")` ==
      "Ein echter Episodentitel" (ein echter gescrapter Titel gewinnt weiterhin, auch bei
      isFilm=true — der Filmtitel ersetzt NUR den literalen Nummern-Fallback, nie einen echten
      Titel); (c) `episodeImportDisplayTitle({EpisodeNumber:4}, true, "   ")` == "Episode 4"
      (isFilm=true, aber animeTitle ist leer/nur Whitespace → defensiver Rückfall auf den
      bisherigen Nummern-Fallback); (d) `episodeImportDisplayTitle({EpisodeNumber:4}, false,
      "Should Be Ignored")` == "Episode 4" (isFilm=false → animeTitle wird komplett ignoriert,
      Serien-Verhalten exakt wie vorher).
  </behavior>
  <action>
In `backend/internal/services/anisearch_episode_import.go`:
1. Aufruf in `parseAniSearchEpisodeTableRow` (Zeile ~153) von
   `episodeDisplayTitle(number, titlesByLanguage, firstNonEmpty(titleFallback, cells[len(cells)-1]))`
   auf `episodeDisplayTitle(titlesByLanguage, firstNonEmpty(titleFallback, cells[len(cells)-1]))`
   ändern (Parameter `number` entfällt).
2. Funktion `episodeDisplayTitle` (Zeile ~240-250) auf zwei Parameter reduzieren und die letzte
   `return fmt.Sprintf("Episode %d", number)`-Zeile durch `return strings.TrimSpace(fallback)`
   ersetzen (die vorletzte Zeile mit demselben `strings.TrimSpace(fallback)`-Check entfällt
   dadurch, ersetzt durch einen einzigen frühen `return`): Endergebnis: `func
   episodeDisplayTitle(titlesByLanguage map[string]string, fallback string) string { for _, lang
   := range []string{"de","en","ja"} { if title := strings.TrimSpace(titlesByLanguage[lang]);
   title != "" { return title } }; return strings.TrimSpace(fallback) }`. Kurzer Kommentar direkt
   darüber: GAP-22 (165-UAT.md) — diese Ebene kennt weder Anime-Typ noch -Titel und erfindet
   deshalb keinen "Episode N"-Fallback mehr; `normalizeStringPtr("")` am Aufrufer macht daraus
   sauber `nil`, die einzige Stelle mit Film-Kontext (`episodeImportDisplayTitle`,
   episode_import_repository_apply.go) entscheidet über den finalen Fallback.
3. Prüfen, dass `fmt` weiterhin importiert bleibt (wird an anderer Stelle der Datei noch
   verwendet, z. B. in den `fmt.Errorf`-Aufrufen) — kein Import-Cleanup nötig.

In `backend/internal/repository/episode_import_repository_apply.go`:
4. In `applyReleaseNative` (Zeile ~50-53) die bestehende `SELECT type FROM anime`-Abfrage um
   `title` erweitern und direkt danach `isFilm` ableiten: `var animeType, animeTitle string; if
   err := tx.QueryRow(ctx, "SELECT type, title FROM anime WHERE id = $1", input.AnimeID).Scan(
   &animeType, &animeTitle); err != nil { return nil, fmt.Errorf("lookup anime type anime=%d: %w",
   input.AnimeID, err) }; isFilm := mapAnimeTypeToEpisodeType(animeType) == "movie"` (Kommentar:
   GAP-22, 165-UAT.md — wiederverwendet dieselbe "film"->"movie"-Zuordnung wie `episodeTypeID`
   direkt darunter, bleibt dadurch automatisch konsistent).
5. Aufruf in der Episoden-Schleife (Zeile ~74): `upsertImportEpisode(ctx, tx, input.AnimeID,
   episodeTypeID, plan.canonicalByNumber[number])` → `upsertImportEpisode(ctx, tx, input.AnimeID,
   episodeTypeID, isFilm, animeTitle, plan.canonicalByNumber[number])`.
6. Signatur `upsertImportEpisode` (Zeile ~191-197): zwei neue Parameter `isFilm bool, animeTitle
   string` nach `episodeTypeID int64` einfügen.
7. Innerhalb `upsertImportEpisode` (Zeile ~199): `displayTitle := episodeImportDisplayTitle(
   canonical)` → `displayTitle := episodeImportDisplayTitle(canonical, isFilm, animeTitle)`.
8. Funktion `episodeImportDisplayTitle` (Zeile ~297-307): Signatur auf `(canonical
   models.EpisodeImportCanonicalEpisode, isFilm bool, animeTitle string) string` erweitern; nach
   dem bestehenden `if canonical.Title != nil ...`-Block (der echte Titel gewinnt weiterhin) einen
   neuen Block einfügen, BEVOR der finale `fmt.Sprintf("Episode %d", ...)`-Fallback greift: `if
   isFilm { if trimmed := strings.TrimSpace(animeTitle); trimmed != "" { return trimmed } }`.
   Docstring darüber ergänzen (GAP-22, 165-UAT.md, Auftraggeber-Entscheidung 2026-09-23):
   erklärt, dass dies die EINZIGE Stelle ist, die den finalen Fallback synthetisiert, und dass ein
   echter gescrapter Titel immer Vorrang vor dem Filmtitel-Fallback hat.

In `backend/internal/services/anisearch_episode_import_test.go`: neuen Test aus `<behavior>`
Go-Test 1 ergänzen (Muster der vier bestehenden Tests in dieser Datei übernehmen — `t.Parallel()`,
`parseAniSearchEpisodeListHTML(fixture)`, `#episoden`-Section-Fixture).

In `backend/internal/repository/episode_import_repository_test.go`: die vier bestehenden
`episodeImportDisplayTitle(...)`-Aufrufe (Zeile 77-97) um `, false, ""` erweitern (Signatur folgen,
Erwartungswerte unverändert lassen); neuen Test `TestEpisodeImportDisplayTitle_UsesFilmTitleFallback`
aus `<behavior>` Go-Test 3 direkt darunter ergänzen (`t.Parallel()`, gleiches Testdateimuster).
  </action>
  <verify>
    <automated>docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./... && go test ./internal/services/... -run TestParseAniSearchEpisodeListHTML -v -count=1 && go test ./internal/repository/... -run TestEpisodeImportDisplayTitle -v -count=1"</automated>
  </verify>
  <done>
`go build`/`go vet` fehlerfrei. Alle `TestParseAniSearchEpisodeListHTML*`-Tests grün, inklusive des
neuen Titellosigkeits-Tests. Alle `TestEpisodeImportDisplayTitle*`-Tests grün, inklusive des neuen
Film-Fallback-Tests. `episodeDisplayTitle` in `anisearch_episode_import.go` synthetisiert keinen
"Episode N"-String mehr (nur noch `episodeImportDisplayTitle` in
`episode_import_repository_apply.go` tut das, film-bewusst).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: GAP-23 — Standard-Release-Name-SQL für Filme</name>
  <files>backend/internal/repository/public_release_name.go, backend/internal/repository/release_detail_public_repository_test.go</files>
  <behavior>
    Neuer Postgres-Integrationstest (echte Ausführung gegen `testsupport.OpenPhase117Postgres`,
    kein Source-String-Assert, CLAUDE.md-Teststil) via `loadReleaseHeader` — dieselbe Funktion,
    die der bestehende `TestLoadReleaseHeaderTitleUsesGapTwoDefaultFormat`-Test bereits gegen
    `publicReleaseNameSQL` prüft (die Funktion ist die EINZIGE Implementierung, von
    `episode_version_public_query.go` und `release_detail_public_repository.go` beide
    wiederverwendet — ein Aufrufer reicht als Testoberfläche):
    - Fall 1 — Film ohne Gruppentitel: `loadReleaseHeader(ctx, 920, 9201, 9201)`.Title ==
      ".hack//G.U. Trilogy · (AnimeOwnage) · v1" (episode.title ist absichtlich "Episode 1" in der
      Fixture, um zu beweisen: bei Filmen gewinnt IMMER der Anime-Titel, nicht der Episodentitel).
    - Fall 2 — Film MIT Gruppentitel: `loadReleaseHeader(ctx, 920, 9201, 9202)`.Title ==
      "Special Group Title" (ein echter Gruppentitel hat weiterhin uneingeschränkt Vorrang, auch
      bei Filmen — unverändert).
    - Fall 3 — Serie mit Episodentitel (Regressionsschutz): `loadReleaseHeader(ctx, 921, 9201,
      9211)`.Title == "Der Test-Titel · (AnimeOwnage) · v1" (unverändert, kein Film-Effekt leakt
      in Serien).
    - Fall 4 — Serie ohne Episodentitel (Regressionsschutz): `loadReleaseHeader(ctx, 922, 9201,
      9221)`.Title == "Folge 7 · (AnimeOwnage) · v1" (bestehendes GAP-02-"Folge N"-Fallback bleibt
      für Serien exakt erhalten).
    - Fall 5 — Film Coop-Form: `loadReleaseHeader(ctx, 923, 9202, 9231)`.Title == "Trilogy Coop
      Film · (Coop Group A × Coop Group B) · v1" (Filmtitel als erster Bestandteil bleibt
      coop-fähig, dieselbe ' × '-Sortierkonvention wie bei Serien).
  </behavior>
  <action>
In `backend/internal/repository/public_release_name.go`:
1. Kopfkommentar um einen Absatz zur Auftraggeber-Entscheidung 2026-09-23 (GAP-23, 165-UAT.md)
   ergänzen: für Filme ist der erste Namensbestandteil immer der Anime-/Filmtitel, nicht der
   Episodentitel oder "Folge N"; `titleEnteredByGroupSQL` bleibt unverändert vorrangig; Serien
   unbetroffen.
2. Zwei neue kleine Hilfsfunktionen ergänzen (nach `titleEnteredByGroupSQL`, vor
   `publicReleaseNameSQL`): `filmEpisodeSQL(episodeAlias string) string` liefert einen
   Boolean-SQL-Ausdruck: `(EXISTS (SELECT 1 FROM anime fa WHERE fa.id = <episodeAlias>.anime_id
   AND fa.type = 'film') OR EXISTS (SELECT 1 FROM episode_types fet WHERE fet.id =
   <episodeAlias>.episode_type_id AND fet.name = 'movie'))` — beide Signale unabhängig
   ausreichend (episode_import_repository_apply.go macht sie für neue Importe künftig
   deckungsgleich, ältere/handgepflegte Zeilen tragen evtl. nur eines von beiden). `filmTitleSQL(
   episodeAlias string) string` liefert `(SELECT fa2.title FROM anime fa2 WHERE fa2.id =
   <episodeAlias>.anime_id)` — beide sind self-contained Scalar-Subqueries, kein neuer JOIN im
   FROM-Clause der Aufrufer nötig (der Alias hat bereits `anime_id`/`episode_type_id` als
   eigene Spalten).
3. `publicReleaseNameSQL` umbauen: der bisherige Ausdruck `COALESCE(NULLIF(BTRIM(episodeAlias.title),
   ''), CONCAT('Folge ', episodeAlias.episode_number))` (bisher `episodeTitleExpr`/
   `fallbackEpisodeTitleExpr`, per COALESCE kombiniert) bleibt als
   `seriesFirstComponentExpr` bestehen, wird aber nur noch im ELSE-Zweig eines neuen `CASE WHEN
   filmEpisodeSQL(episodeAlias) THEN filmTitleSQL(episodeAlias) ELSE seriesFirstComponentExpr
   END` (`firstComponentExpr`) verwendet. Das äußere `CASE WHEN <titleEnteredByGroupSQL> THEN
   <Gruppentitel> ELSE CONCAT(firstComponentExpr, ' · (', groupNamesExpr, ') · ', versionExpr)
   END` bleibt strukturell unverändert — nur der zweite CONCAT-Baustein wechselt von
   `COALESCE(episodeTitleExpr, fallbackEpisodeTitleExpr)` auf `firstComponentExpr`. Signatur von
   `publicReleaseNameSQL(releaseVersionAlias, episodeAlias, groupNamesExpr string) string` bleibt
   UNVERÄNDERT — beide bestehenden Aufrufer (`release_detail_public_repository.go`,
   `episode_version_public_query.go`) brauchen keine Änderung.
4. Datei bleibt weit unter 450 Zeilen (vorher 55, Zuwachs ca. 25-30 Zeilen).

In `backend/internal/repository/release_detail_public_repository_test.go`: neue Fixture-Funktion
`openReleaseDetailFilmHeaderFixture(t *testing.T) *pgxpool.Pool` nach dem Muster von
`openReleaseDetailHeaderFixture` (siehe `<context>`), eigene isolierte
`testsupport.OpenPhase117Postgres(t)`-Instanz, mit `ALTER TABLE fansub_groups ADD COLUMN slug TEXT
NOT NULL DEFAULT ''`, `ALTER TABLE release_variants ADD COLUMN filename TEXT`, `ALTER TABLE anime
ADD COLUMN title TEXT NOT NULL DEFAULT ''`, `ALTER TABLE anime ADD COLUMN type TEXT`, `ALTER TABLE
episodes ADD COLUMN episode_type_id BIGINT`, `CREATE TABLE episode_types (id BIGINT PRIMARY KEY,
name TEXT NOT NULL)`, `INSERT INTO episode_types (id, name) VALUES (1,'episode'),(2,'movie')`,
danach die Fixture-Zeilen für Fälle 1-5 aus `<behavior>`: anime 920 type='film' title='.hack//G.U.
Trilogy' mit episode 920 episode_type_id=2 title='Episode 1' (bewusst der irreführende alte Wert,
um zu beweisen dass er für Filme ignoriert wird); release_versions 9201 title=NULL, 9202
title='Special Group Title'; anime 921 type='tv' title='Naruto' mit episode 921 episode_type_id=1
title='Der Test-Titel', release_version 9211 title=NULL; anime 922 type='tv' title='No Title
Series' mit episode 922 episode_type_id=1 title=NULL, episode_number='7', release_version 9221
title=NULL; anime 923 type='film' title='Trilogy Coop Film' mit episode 923 episode_type_id=2
title=NULL, release_version 9231 title=NULL; fansub_groups 9201 'AnimeOwnage', 9202 'Coop Group A',
9203 'Coop Group B'; release_variants je mit eindeutigem `filename` ungleich dem jeweiligen
`release_versions.title`, damit `titleEnteredByGroupSQL`s Dateinamens-Ausschluss nicht ungewollt
greift; release_version_groups entsprechend den fünf Fällen aus `<behavior>` verknüpfen (9201->9201,
9202->9201, 9211->9201, 9221->9201, 9231->9202 und 9231->9203 für die Coop-Form). Neue
Testfunktion `TestLoadReleaseHeaderTitleUsesGap23FilmDefaultFormat(t *testing.T)` (Muster von
`TestLoadReleaseHeaderTitleUsesGapTwoDefaultFormat` übernehmen: `openReleaseDetailFilmHeaderFixture
(t)`, `NewReleaseDetailPublicRepository(pool, "")`, fünf `repo.loadReleaseHeader(ctx, animeID,
groupID, releaseVersionID)`-Aufrufe mit `require.NoError`/`require.Equal` je Fall aus
`<behavior>`).
  </action>
  <verify>
    <automated>docker exec team4sv30-backend sh -c 'cd /app && go build ./... && go vet ./... && TEAM4S_PHASE117_TEST_DSN="postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase117_test_164?sslmode=disable" go test ./internal/repository/... -run TestLoadReleaseHeaderTitleUsesGap -v -count=1'</automated>
  </verify>
  <done>
`go build`/`go vet` fehlerfrei. `TestLoadReleaseHeaderTitleUsesGapTwoDefaultFormat` (bestehend,
unverändert) UND `TestLoadReleaseHeaderTitleUsesGap23FilmDefaultFormat` (neu, alle fünf Fälle)
sind grün gegen die echte, isolierte Postgres-Instanz — kein Skip, `TEAM4S_PHASE117_TEST_DSN`
zeigt auf die bereits existierende, wiederverwendete Datenbank `team4s_phase117_test_164`.
`public_release_name.go` bleibt weit unter 450 Zeilen.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: GAP-23 — Admin-Platzhalter-Parität (episodeVersionEditorUtils.ts)</name>
  <files>frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts, frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts</files>
  <behavior>
    - Test 1 (NEU): `defaultReleaseTitle` mit `context.episode.episode_type === 'movie'` und
      `anime_title: 'Vipers Creed'`, einer Gruppe 'AnimeOwnage' → liefert exakt
      "Vipers Creed · (AnimeOwnage) · v1" (dieselbe Ausgabeform wie das GAP-23-Beispiel der
      Backend-SQL-Regel).
    - Test 2 (NEU): `defaultReleaseTitle` mit `context.episode.episode_type === 'episode'`
      (explizit NICHT movie) und derselben Gruppe → liefert weiterhin
      "Episode 001 · (AnimeOwnage) · v1" (unverändertes Verhalten für Nicht-Filme, auch wenn eine
      Einstufung vorliegt).
    - Test 3 (NEU): `defaultReleaseTitle` mit `context.episode.episode_type === 'movie'`, aber
      `anime_title: '   '` (nur Whitespace) → defensiver Rückfall auf
      "Episode 001 · (AnimeOwnage) · v1" (kein leerer erster Bestandteil).
    - Bestehende zwei Tests in `describe('defaultReleaseTitle', ...)` (Zeile 61-82, ohne
      `episode`-Feld im Kontext) bleiben UNVERÄNDERT grün — `context.episode` ist optional,
      `undefined?.episode_type` ist `undefined`, nie `'movie'`.
  </behavior>
  <action>
In `episodeVersionEditorUtils.ts`: Doc-Kommentar über `defaultReleaseTitle` (Zeile ~149-156) um
einen Satz zu GAP-23 (Auftraggeber-Entscheidung 2026-09-23) ergänzen: bei
`context.episode?.episode_type === 'movie'` ist der erste Bestandteil `context.anime_title`
statt der "Episode NNN"-Platzhalterposition — spiegelt dieselbe Regel wie
`filmEpisodeSQL`/`filmTitleSQL` in `public_release_name.go` (Backend), eine Regel, nicht zwei.
Funktion umbauen: `export function defaultReleaseTitle(context: EpisodeVersionEditorContext):
string { const groups = [...context.selected_groups].sort((a, b) => a.name.localeCompare(b.name)
|| a.id - b.id); const groupNames = groups.length > 0 ? groups.map((group) =>
group.name).join(' × ') : 'Fansub'; const version = context.version.release_version || 'v1';
const isFilmEpisode = context.episode?.episode_type === 'movie'; const animeTitle =
context.anime_title.trim(); const firstComponent = isFilmEpisode && animeTitle ? animeTitle :
'Episode ' + padEpisodeNumber(context.version.episode_number); return firstComponent + ' ' +
String.fromCharCode(0x00B7) + ' (' + groupNames + ') ' + String.fromCharCode(0x00B7) + ' ' +
version }`.

In `episodeVersionEditorUtils.test.ts`: innerhalb `describe('defaultReleaseTitle', ...)` (nach
den zwei bestehenden `it(...)`-Blöcken, Zeile ~82) drei neue `it(...)`-Blöcke aus `<behavior>`
ergänzen, jeweils mit `baseVersion` (bereits im `describe`-Block definiert) und einem
`episode: { episode_id: 1, episode_number: '1', filler_type: null, filler_type_source: null,
episode_type: 'movie', episode_type_source: 'import' }` (bzw. `episode_type: 'episode'` für Test
2) im Kontext-Objekt.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts'" 2>&1 | tail -60</automated>
  </verify>
  <done>
Alle Tests in `episodeVersionEditorUtils.test.ts` sind grün, inklusive der drei neuen GAP-23-Fälle
und der zwei bestehenden GAP-02-Fälle. `defaultReleaseTitle` nutzt `context.anime_title` als
ersten Bestandteil ausschließlich bei `episode_type === 'movie'` und nicht-leerem Anime-Titel.
  </done>
</task>

<task type="auto">
  <name>Task 4: Fallback-Audit, 165-UAT.md-Einträge, Gesamtverifikation, Rebuild, Restart, Commit</name>
  <files>.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md</files>
  <action>
1. **GAP-22-Anzeige-Fallback-Audit** (Auftrag: "Zusätzlich Anzeige-Fallbacks prüfen: wo
   öffentlich/adminseitig 'Folge N'/'Episode N' als Fallback erscheint, bei episode_type=movie
   stattdessen den Filmtitel bzw. den Episodentitel verwenden"). Per `grep -rn "Folge \${\|'Folge
   '\|Folge \`" frontend/src --include="*.tsx" --include="*.ts"` und `grep -rn "Episode \${\|
   'Episode '\|Episode \`" frontend/src --include="*.tsx" --include="*.ts"` (beide ohne
   `.test.`-Dateien) alle Fundstellen erneut auflisten. Für jede Fundstelle prüfen: (a) folgt sie
   bereits dem Muster `episode.title ?? 'Folge N'`/`episode.title || Episode N` (title-first mit
   Fallback)? → KEINE Änderung nötig, da Task 1s Backend-Fix ab sofort für Filme immer den
   echten Filmtitel in `episode.title` liefert und diese Stellen automatisch korrekt werden; (b)
   ist es ein reiner Zeilen-/Row-Identifikator (aria-label für Expand/Collapse/Löschen, Toast-
   Bestätigungstext, Select-Options zur Segment-Origin-Zuordnung, Breadcrumb-Navigation) OHNE
   Titel-Anspruch? → KEINE Änderung nötig (identifiziert eine Nummer, keine Titel-Behauptung); (c)
   ist es unconditional (ignoriert `episode.title` komplett) UND stellt sich als "der" Titel dar
   UND hat die Komponente bereits Zugriff auf Anime-Typ/-Titel ohne neue Datenverdrahtung? → dann
   in DIESEM Task beheben. Erwartetes Ergebnis dieser Prüfung (bereits vorab verifiziert): alle
   Fundstellen fallen unter (a) oder (b); insbesondere `frontend/src/app/admin/anime/[id]/episodes/
   import/page.tsx` (Platzhalter-Texte `Episode ${group.episodeNumber}` in den Titel-Editier-
   Textareas der Import-Vorschau) fällt unter KEINEN der drei Fälle sauber — es ist ein reiner
   Platzhalter-Hinweistext (kein `value`, wirkt sich NICHT auf den tatsächlich gespeicherten Titel
   aus, der weiterhin korrekt über den Task-1-Fix bestimmt wird) UND die Seite kennt aktuell weder
   Anime-Typ noch Anime-Titel in ihrem Datenmodell (fehlende Information im Sinne der
   Planungs-Leitplanken — keine Datenverdrahtung in diesem Quick-Task ergänzen). Falls die erneute
   grep-Prüfung eine NEUE Fundstelle zutage fördert, die eindeutig unter (c) fällt, diese
   zusätzlich reparieren und in der SUMMARY dokumentieren; andernfalls keine weiteren
   Code-Änderungen in diesem Schritt.

2. Vor dem Bearbeiten mit `file 165-UAT.md` und `cat -A 165-UAT.md | tail -5` bestätigen, dass die
   Datei reine LF-Zeilenenden verwendet (kein `^M`). Am Ende der `## Gaps`-Liste (nach dem
   bestehenden GAP-21-Eintrag) ZWEI neue Einträge im exakt gleichen Format wie die bestehenden
   `status: resolved`-Einträge anhängen:

   - truth: "GAP-22 (Auftraggeber-Entscheidung 2026-09-23, Live-Test Anime #6 „.hack//G.U.
     Trilogy"): Filme (anime.type=film, episode.episode_type=movie) erhalten beim
     Anlegen/Import den literalen Fallback-Episodentitel „Episode 1"/„Folge 1" statt des
     Anime-/Filmtitels"
     status: resolved
     reason: "Quick-Task 260923-amz: die Fallback-Synthese wurde auf eine einzige Stelle
     zentralisiert. anisearch_episode_import.go's episodeDisplayTitle (kennt weder Anime-Typ noch
     -Titel) erfindet keinen 'Episode N'-String mehr, sondern liefert bei fehlendem gescraptem
     Titel nil. episode_import_repository_apply.go's episodeImportDisplayTitle (kennt anime.type
     UND anime.title bereits über die bestehende episodeTypeID-Ableitung) entscheidet jetzt als
     einzige Instanz: echter gescrapter Titel > Anime-/Filmtitel (bei isFilm) > 'Episode N'
     (Serien, unverändert). Von Hand gesetzte Episodentitel werden weiterhin nie überschrieben
     (bestehende COALESCE-Update-Logik unverändert). Bestandsdaten wurden NICHT migriert --
     betroffene Filme müssen bei Bedarf neu angelegt werden."
     severity: major
     test: 1
     root_cause: "siehe .planning/quick/260923-amz-filmtitel-statt-episode-1-bei-filmen-gap/260923-amz-SUMMARY.md"
     artifacts: []
     missing: []

   - truth: "GAP-23 (Auftraggeber-Entscheidung 2026-09-23, 165-USER-REQUEST §23): der
     berechnete Standard-Release-Name (public_release_name.go) und der Admin-Editor-Platzhalter
     zeigen für Filme fälschlich den Episodentitel/'Folge N' als ersten Namensbestandteil statt
     des Anime-/Filmtitels"
     status: resolved
     reason: "Quick-Task 260923-amz: public_release_name.go bekam filmEpisodeSQL (erkennt
     anime.type='film' ODER episode.episode_type='movie') und filmTitleSQL (liefert
     anime.title); publicReleaseNameSQL nutzt beide, um für Filme immer den Anime-/Filmtitel als
     ersten Namensbestandteil zu setzen, z. B. '.hack//G.U. Trilogy · (AnimeOwnage) · v1'. Ein
     von der Gruppe eingetragener Titel (titleEnteredByGroupSQL) hat unverändert Vorrang; Serien
     sind unbetroffen (Postgres-Integrationstest deckt beide Fälle plus Coop-Form ab).
     episodeVersionEditorUtils.ts's defaultReleaseTitle (Admin-Platzhalter) folgt derselben
     Regel über context.episode?.episode_type === 'movie' und context.anime_title -- eine Regel,
     nicht zwei."
     severity: major
     test: 1
     root_cause: "siehe .planning/quick/260923-amz-filmtitel-statt-episode-1-bei-filmen-gap/260923-amz-SUMMARY.md"
     artifacts: []
     missing: []

   Nach dem Edit erneut `cat -A 165-UAT.md | tail -40` prüfen — keine `^M`-Zeichen, LF bleibt
   erhalten (Write/Edit-Tool verwenden, kein Bash-Heredoc).

3. Vollständige Backend-Verifikation: `docker exec team4sv30-backend sh -c "cd /app && go build
   ./... && go vet ./... && go test ./..."` — alle Pakete fehlerfrei/grün (nicht nur die in Task
   1/2 betroffenen).

4. Vollständige Frontend-Verifikation: `docker compose exec -T team4sv30-frontend sh -c "cd /app
   && npm run test" 2>&1 | tail -200` — alle Tests grün. Danach `docker compose exec -T
   team4sv30-frontend sh -c "cd /app && npm run typecheck" 2>&1 | tail -100` — fehlerfrei. Danach
   `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run lint" 2>&1 | tail -150` —
   fehlerfrei.

5. Backend-Rebuild gemäß Auftrag (Fixes im laufenden Container wirksam machen): `docker compose up
   -d --build team4sv30-backend`. Danach Health-Check: `docker compose ps team4sv30-backend` zeigt
   "Up", sowie `curl -sf http://192.168.235.196:8092/health -o /dev/null -w "%{http_code}\n"`
   liefert `200`.

6. Frontend-Container gemäß Auftrag neu starten: `docker restart team4sv30-frontend`. Danach
   `docker compose ps team4sv30-frontend` zeigt "Up".

7. Gezielt committen (kein `git add -A`/`.`): alle in `files_modified` (Frontmatter dieses Plans)
   gelisteten Pfade explizit per Pfad zu `git add` hinzufügen, dann `git commit` mit einer
   Commit-Message, die auf GAP-22 und GAP-23 (Phase 165) verweist. Kein `git push`, kein
   `git stash`.
  </action>
  <verify>
    <automated>grep -c "GAP-22\|GAP-23" /home/d1sk/team4s/.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md; file /home/d1sk/team4s/.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md; docker compose ps team4sv30-backend team4sv30-frontend; curl -sf http://192.168.235.196:8092/health -o /dev/null -w "%{http_code}\n"</automated>
  </verify>
  <done>
Das Fallback-Audit ist dokumentiert (SUMMARY nennt die geprüften Fundstellen und die
Kategorisierung (a)/(b)/(c), inklusive der bewussten Nicht-Änderung der Import-Vorschau-Platzhalter
mit Begründung). `165-UAT.md` enthält beide neuen Einträge (`status: resolved`), Datei bleibt
LF-only. Vollständige Backend- (`go build`/`go vet`/`go test ./...`) und Frontend-Verifikation
(Test/Typecheck/Lint) sind fehlerfrei. Backend-Container per `docker compose up -d --build` neu
gebaut und gesund (`/health` liefert 200). Frontend-Container per `docker restart` neu gestartet
und läuft. Änderungen gezielt committet (kein `git add -A`), kein Push.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Admin-Browser → Backend Episode-Import-Apply (bereits admin-only geschützt) | Dieser Plan ändert nur, WELCHER Titel-String beim Schreiben gewählt wird (Filmtitel statt literalem "Episode N"), keine neue Eingabeklasse, keine neue Schreib-Berechtigung. |
| Öffentliche Anime-/Release-Detailseite → publicReleaseNameSQL | Rein lesende, bereits bestehende SQL-Projektion; GAP-23 ändert nur die CASE-Verzweigung für den ersten Namensbestandteil bei Filmen, keine neue Nutzereingabe wird verarbeitet. |
| Admin-Browser → episodeVersionEditorUtils.ts defaultReleaseTitle (rein clientseitig, kein Netzwerk-I/O) | Reines Platzhalter-Rendering aus bereits vom Backend gelieferten, admin-auth-geschützten Kontextdaten (anime_title, episode.episode_type) — keine neue Vertrauensgrenze. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260923-amz-01 | Tampering | `public_release_name.go` `filmEpisodeSQL`/`filmTitleSQL` | accept | Reine lesende Scalar-Subqueries ohne Nutzereingabe-Interpolation; `anime_id`/`episode_type_id` stammen aus bereits validierten Joins/Parametern des jeweiligen Aufrufers, keine String-Konkatenation von Nutzerdaten. |
| T-260923-amz-02 | Information Disclosure | `episodeImportDisplayTitle` (GAP-22) / `filmTitleSQL` (GAP-23) | accept | `anime.title` ist bereits öffentlich auf der Anime-Detailseite sichtbar; kein neues sensibles Feld wird exponiert, nur wo es als Fallback statt eines nichtssagenden "Episode N" erscheint. |
| T-260923-amz-03 | Tampering | `episode_import_repository_apply.go` `applyReleaseNative` (erweiterte `SELECT type, title FROM anime`-Abfrage) | accept | Parametrisierte Query (`$1`), identisches Muster wie die bereits bestehende `type`-Abfrage; keine neue Eingabeklasse, keine Konkatenation. |
</threat_model>

<verification>
1. `docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./... && go test ./..."` — vollständige Backend-Suite grün.
2. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run test"` — komplette Frontend-Suite grün.
3. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run typecheck"` — fehlerfrei.
4. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run lint"` — fehlerfrei.
5. `TEAM4S_PHASE117_TEST_DSN=... go test ./internal/repository/... -run TestLoadReleaseHeaderTitleUsesGap -v -count=1` — GAP-02- UND GAP-23-Fälle grün gegen echtes Postgres.
6. `docker compose up -d --build team4sv30-backend` gefolgt von `curl` gegen `/health` — 200, Container gesund.
7. `docker restart team4sv30-frontend` — Container läuft danach wieder.
8. `.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md` enthält GAP-22 und GAP-23 als `status: resolved`, Datei bleibt LF-only.
9. `git diff --stat` zeigt ausschließlich die in `files_modified` gelisteten Pfade — kein `git add -A`, kein Push.
</verification>

<success_criteria>
- Ein neu importierter Film erhält den Anime-/Filmtitel als kanonischen Episodentitel, nie
  "Episode 1"/"Folge 1" — zentralisiert in `episodeImportDisplayTitle`
  (episode_import_repository_apply.go), das als einzige Stelle Anime-Typ UND -Titel kennt.
- Von Hand gesetzte Episodentitel werden nie überschrieben; Serien sind unverändert.
- Der öffentliche Standard-Release-Name eines Films beginnt mit dem Anime-/Filmtitel
  (`publicReleaseNameSQL`, `public_release_name.go`), ein Gruppentitel hat weiterhin Vorrang,
  Serien sind unverändert (Postgres-Integrationstest deckt beide Fälle plus Coop-Form ab).
- Der Admin-Editor-Platzhalter (`defaultReleaseTitle`) folgt derselben Regel wie die Backend-SQL
  — eine Regel, nicht zwei.
- Das GAP-22-Anzeige-Fallback-Audit ist durchgeführt und dokumentiert; keine weiteren
  Code-Änderungen waren nötig, da alle übrigen Fundstellen entweder bereits title-first
  fallbacken (profitieren automatisch vom Task-1-Backend-Fix) oder reine Zeilen-/
  Row-Identifikatoren ohne Titel-Anspruch sind.
- Kein Produktionsdatei-Zuwachs über die 450-Zeilen-Grenze.
- Vollständige Backend- (`go build`/`go vet`/`go test ./...`) und Frontend-Suite
  (Test/Typecheck/Lint) sind fehlerfrei.
- Backend-Container per `docker compose up -d --build` neu gebaut und gesund; Frontend-Container
  per `docker restart` neu gestartet.
- GAP-22 und GAP-23 sind in `165-UAT.md` als `status: resolved` dokumentiert. Kein `git push`,
  kein `git stash`, keine `.env`- oder `team4s_v2`-Datenänderung, keine Migration von
  Bestandsdaten.
</success_criteria>

<output>
Create `.planning/quick/260923-amz-filmtitel-statt-episode-1-bei-filmen-gap/260923-amz-SUMMARY.md` when done
</output>
