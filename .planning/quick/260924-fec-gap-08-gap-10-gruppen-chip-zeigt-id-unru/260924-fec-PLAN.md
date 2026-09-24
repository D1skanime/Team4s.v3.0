---
phase: quick-260924-fec
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts
  - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts
  - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
  - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.test.tsx
  - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRowGroupField.tsx
  - frontend/src/app/admin/anime/[id]/episodes/import/page.module.css
  - frontend/src/app/admin/anime/[id]/episodes/import/page.layout.test.ts
  - frontend/src/types/episodeImport.ts
  - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportEinteilerTitle.ts
  - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportEinteilerTitle.test.ts
  - frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
  - backend/internal/models/episode_import.go
  - backend/internal/handlers/admin_episode_import_einteiler.go
  - backend/internal/handlers/admin_episode_import_einteiler_test.go
  - .planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md
autonomous: true
requirements: [GAP-08, GAP-09, GAP-10]
user_setup: []

must_haves:
  truths:
    - "GAP-08: Für automatisch anhand des Dateinamens erkannte Fansub-Gruppen zeigt der Gruppen-Chip in der Mapping-Zeile den aufgelösten Gruppennamen (z. B. „Generation: Anime Xtreme\"), nicht die rohe numerische Gruppen-ID (z. B. „#32\"); die ID ist höchstens als Tooltip (title-Attribut) sichtbar. Manuell ausgewählte Gruppen lösen ihren Namen weiterhin über denselben Anzeige-Mechanismus auf."
    - "GAP-09: Die Mapping-Zeile im Episoden-Import gliedert sich sichtbar in drei Bereiche -- links Dateiname/Pfad/Hinweise, mittig gestapelte beschriftete Felder (Gruppe/Episode/Version), rechts Status/Aktionen -- und stapelt diese drei Bereiche auf schmalen Bildschirmen (<=980px) vertikal ohne horizontales Überlaufen."
    - "GAP-09: Jede in diesem Zuge berührte Eingabe/Aktion in der Mapping-Zeile nutzt ausschließlich @/components/ui-Primitives (FormField/Input/Button); keine handgebauten nativen <input>/<button>-Elemente bleiben in EpisodeImportMappingRow.tsx oder der neuen EpisodeImportMappingRowGroupField.tsx zurück."
    - "GAP-10: Bei einem Einteiler (Film immer; OVA/ONA/Special/Bonus nur bei genau einer kanonischen Episode) mit einem Platzhalter-Episodentitel (z. B. „Episode 1\", „Folge 01\", „Ep. 1\", bloßes „Episode\") in der Import-Vorschau wird das Titel-Eingabefeld mit dem Anime-Titel vorbefüllt, bleibt aber frei editierbar. Bei Serien und bei bereits vorhandenem echtem (nicht-Platzhalter) Titel bleibt der angezeigte Wert unverändert."
    - "Die Vorbefüllung aus GAP-10 geschieht ausschließlich im Vorschau-Zustand des Formularfelds (einmalig beim Laden der Vorschau); es findet dadurch kein zusätzlicher, stiller Datenbank-Schreibzugriff statt -- Apply verhält sich unverändert, der Admin kann den vorbefüllten Wert vor „Mapping anwenden\" jederzeit überschreiben."
    - "167-UAT.md dokumentiert GAP-08, GAP-09 und GAP-10 als eigene Einträge mit status: resolved, referenziert den Live-UAT vom 2026-09-24 (Datei „[GAX]dot_hack-G.U._Returner_-_OVA(ger.sub)(XviD)[16007E41].avi\"), und bleibt LF-only."
  artifacts:
    - path: "frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts"
      provides: "resolveFansubGroupChipDisplay(group, row) -- löst Chip-Label + optionale ID-Tooltip-Beschriftung auf, inkl. Fallback über row.fansub_group_match_origin.group_name für auto-erkannte Gruppen ohne eigenes name/slug"
      contains: "resolveFansubGroupChipDisplay"
    - path: "frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRowGroupField.tsx"
      provides: "extrahiertes Gruppe-Feld (Chips, Suche, Vorschläge, Scope-Aktionen) ausschließlich mit @/components/ui-Primitives, hält EpisodeImportMappingRow.tsx klein"
      contains: "FormField"
    - path: "frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx"
      provides: "drei-spaltiges Zeilenlayout (Info/Fields/Actions) statt der bisherigen unruhigen Ein-Container-Struktur"
      contains: "mappingRowInfo"
    - path: "frontend/src/app/admin/anime/[id]/episodes/import/page.module.css"
      provides: "responsive 3-Spalten-Grid für .mappingRow plus Stacking-Breakpoint auf <=980px"
      contains: "mappingRowFields"
    - path: "frontend/src/app/admin/anime/[id]/episodes/import/episodeImportEinteilerTitle.ts"
      provides: "isPlaceholderEpisodeTitle + applyEinteilerTitlePrefill (reiner, testbarer Vorschau-Vorbefüllungs-Baustein für GAP-10)"
      contains: "applyEinteilerTitlePrefill"
    - path: "backend/internal/models/episode_import.go"
      provides: "EpisodeImportPreviewResult.IsEinteiler -- einziges neues Datenfeld, das der Frontend-Vorbefüllung Anime-Typ-Kenntnis verschafft"
      contains: "IsEinteiler"
    - path: "backend/internal/handlers/admin_episode_import_einteiler.go"
      provides: "applyEinteilerSuggestion setzt preview.IsEinteiler jetzt IMMER (nicht mehr nur im 1-Episode-Sonderfall)"
      contains: "preview.IsEinteiler ="
    - path: ".planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md"
      provides: "GAP-08/GAP-09/GAP-10 als neue status: resolved Einträge"
      contains: "GAP-10"
  key_links:
    - from: "frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRowGroupField.tsx (Chip-Rendering)"
      to: "frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts resolveFansubGroupChipDisplay"
      via: "ein Aufruf pro selektierter Gruppe beim Rendern der Chip-Liste"
      pattern: "resolveFansubGroupChipDisplay\\("
    - from: "frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts normalizePreviewResult"
      to: "frontend/src/app/admin/anime/[id]/episodes/import/episodeImportEinteilerTitle.ts applyEinteilerTitlePrefill"
      via: "Aufruf beim Normalisieren der frisch geladenen Vorschau, VOR dem Setzen des preview-States"
      pattern: "applyEinteilerTitlePrefill\\("
    - from: "backend/internal/handlers/admin_episode_import_einteiler.go applyEinteilerSuggestion"
      to: "backend/internal/models/episode_import.go EpisodeImportPreviewResult.IsEinteiler"
      via: "repository.IsEinteilerAnimeType(animeType, len(preview.CanonicalEpisodes)) vor den bestehenden early-return-Bedingungen"
      pattern: "IsEinteilerAnimeType\\(animeType, len\\("
---

<objective>
GAP-08..GAP-10 (Phase 167, Live-UAT durch den Auftraggeber im Browser, 2026-09-24,
`/admin/anime/7/episodes/import`, Anime #7 „.hack//G.U. Returner", Datei
„[GAX]dot_hack-G.U._Returner_-_OVA(ger.sub)(XviD)[16007E41].avi"):

- **GAP-08 (Gruppen-Chip zeigt ID statt Name):** Für automatisch aus dem Dateinamen erkannte
  Fansub-Gruppen setzt `enrichEpisodeImportPreviewFansubData`
  (`backend/internal/handlers/admin_episode_import_fansub_match.go:109`) den Chip nur mit
  `{ID: &groupID}` -- ohne Name/Slug. Der Chip fällt dadurch im Frontend
  (`EpisodeImportMappingRow.tsx:192`, `group.name ?? group.slug ?? \`#${group.id}\``) auf die
  rohe ID zurück. Der Name ist tatsächlich schon im selben Response-Objekt vorhanden
  (`row.fansub_group_match_origin.group_name`) -- der Fix ist rein anzeigeseitig im Frontend: eine
  Resolver-Funktion löst den Namen konsistent für beide Pfade (auto-erkannt UND manuell gewählt)
  auf, die ID wandert höchstens ins `title`-Tooltip.
- **GAP-09 (unruhige Mapping-Zeile):** Die Mapping-Zeile
  (`EpisodeImportMappingRow.tsx`) rendert Dateiname/Pfad/Hinweise, das komplette
  Gruppe-Feld (Chips + Suche + Vorschläge + Scope-Aktionen), Version, Status, Ziel-Episode und
  Skip/Übernehmen-Aktionen alle in einer einzigen, visuell unstrukturierten Zeile mit
  handgebauten nativen `<input>`/`<button>`-Elementen. Wird in ein klares Drei-Spalten-Layout
  (Info | Felder | Aktionen) mit `@/components/ui`-Primitives umgebaut, das auf schmalen
  Bildschirmen vertikal stapelt.
- **GAP-10 (Platzhalter-Titel im Einteiler-Feld):** Die GAP-24-Platzhaltererkennung
  (`isPlaceholderEpisodeTitle`, `backend/internal/repository/episode_placeholder_title.go`) greift
  bislang nur zur Apply-Zeit (`episodeImportDisplayTitle`,
  `episode_import_repository_apply.go`) -- die Vorschau zeigt im Titel-Textfeld weiterhin den
  rohen AniSearch-Platzhalter „Episode 1"/„Folge 1", obwohl beim tatsächlichen Anwenden längst der
  Anime-Titel greifen würde. Ein früherer Quick-Task (`260923-amz`) hat genau diese
  Vorschau-Vorbefüllung bewusst zurückgestellt, weil der Seite damals weder Anime-Typ noch
  Einteiler-Status bekannt waren ("fehlende Information im Sinne der Planungs-Leitplanken").
  Dieser Plan schließt genau diese Lücke: ein neues, minimal-invasives `IsEinteiler`-Feld auf dem
  Vorschau-Response (aus dem bereits zur Preview-Zeit geladenen `animeType` abgeleitet, keine
  zusätzliche Query) plus eine reine Frontend-Vorbefüllungsfunktion, die den Titel im
  Vorschau-Zustand -- nicht in der Datenbank -- ersetzt, wenn er wie ein Platzhalter aussieht.

Verbindliche Vorgaben (nicht neu verhandeln):
- Alle drei GAPs werden in `167-UAT.md` als `status: resolved` dokumentiert (LF-Zeilenenden
  beibehalten).
- Keine Datenänderung an `team4s_v2`; keine Migration von Bestandsdaten.
- Direkt auf `main`, kein `git stash`, kein `git push`, keine Datei über 450 Zeilen.
- GAP-09 nutzt ausschließlich `@/components/ui`-Primitives (CLAUDE.md
  Frontend-UI-Design-System-Regel schlägt lokale Datei-Konsistenz).

Purpose: Der Admin sieht bei jeder Gruppen-Zuordnung sofort den echten Namen statt einer
bedeutungslosen ID, kann die Mapping-Zeile auf jeder Bildschirmgröße ruhig überblicken, und sieht
bei Einteilern schon in der Vorschau den korrekten Titel-Vorschlag statt eines irreführenden
AniSearch-Platzhalters.

Output: Frontend-seitige Namensauflösung für Gruppen-Chips (GAP-08); umgebaute,
Design-System-konforme Drei-Spalten-Mapping-Zeile samt neuer
`EpisodeImportMappingRowGroupField.tsx` (GAP-09); neues `EpisodeImportPreviewResult.IsEinteiler`
plus Frontend-Vorbefüllung `episodeImportEinteilerTitle.ts` (GAP-10); `167-UAT.md` mit drei neuen
`status: resolved`-Einträgen; beide Container neu gebaut/neu gestartet.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md
@frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
@frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts
@frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
@frontend/src/types/episodeImport.ts

<critical_gotcha>
Der Dev-Backend-Container (`team4sv30-backend`) läuft über `air` mit `docker compose watch`
live-sync von `./backend` nach `/app`. Läuft `docker compose watch` gerade NICHT im Hintergrund,
liefert `docker exec team4sv30-backend ... go test` stillschweigend Ergebnisse gegen eine veraltete,
zur Build-Zeit eingebackene Quellcode-Kopie. Für Go-Build/Vet/Test-Verifikation in diesem Plan
IMMER das Scratch-Container-Muster verwenden (mountet den Host-Ordner direkt, keine
Live-Sync-Unsicherheit):
`docker run --rm -v /home/d1sk/team4s/backend:/app -w /app -v gomodcache:/tmp/gomodcache -v
gocache:/tmp/gocache -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache --network
team4s_default golang:1.25-alpine sh -c "go build ./... && go vet ./... && go test ./..."`.
`docker exec team4sv30-backend` ist ausschließlich für den finalen, bereits neu gebauten Container
(Task 3, Health-Check) reserviert.

Der Frontend-Container (`team4sv30-frontend`) bind-mountet `./frontend:/app` und läuft mit
`npm run dev -- --webpack` (Fast Refresh) -- Host-Dateiänderungen sind sofort sichtbar,
`docker compose exec -T team4sv30-frontend sh -c "cd /app && ..."` liest also immer den aktuellen
Stand.
</critical_gotcha>

<interfaces>
Aktuelle Chip-Erzeugung für automatisch erkannte Gruppen (Root Cause GAP-08),
backend/internal/handlers/admin_episode_import_fansub_match.go, Zeile ~106-117:
  if match, ok := matchByCandidate[name]; ok {
    groupID := match.GroupID
    row.FansubGroupID = &groupID
    row.FansubGroups = []models.SelectedFansubGroupInput{{ID: &groupID}}
    row.FansubGroupMatchOrigin = &models.EpisodeImportFansubGroupMatchOrigin{
      Raw: name, MatchedVia: match.MatchedVia, GroupID: match.GroupID,
      GroupName: match.GroupName, AliasID: match.MatchedAliasID,
    }
    continue
  }
match.GroupName ist bereits vorhanden und landet unverändert in
row.fansub_group_match_origin.group_name -- GAP-08 braucht dafür KEINE Backend-Änderung, nur eine
Frontend-Auflösung, die group.id gegen origin.group_id abgleicht.

Aktuelle Chip-Rendering-Stelle (wird durch Task 1 in EpisodeImportMappingRowGroupField.tsx
verschoben), EpisodeImportMappingRow.tsx Zeile ~183-195:
  selectedFansubGroups.map((group) => (
    <button key={...} type="button" className={styles.groupChip} disabled={isSkipped}
      onClick={() => onRemoveSelectedFansubGroup(sourceKey, group)}>
      <span>{group.name ?? group.slug ?? `#${group.id}`}</span>
      <span className={styles.groupChipRemove}>x</span>
    </button>
  ))

EpisodeImportMappingRow row type (frontend/src/types/episodeImport.ts, unverändert für GAP-08):
  fansub_group_match_origin?: { raw: string; matched_via: 'alias'|'name'|'slug'|'kuerzel';
    group_id: number; group_name: string; alias_id?: number | null } | null

Aktuelle GAP-03-Stelle, die animeType bereits zur Preview-Zeit lädt (Task 2 nutzt denselben Wert
weiter, KEINE neue Query), backend/internal/handlers/admin_episode_import.go Zeile ~111-116:
  if h.episodeImportRepo != nil {
    if animeType, typeErr := h.episodeImportRepo.GetAnimeType(c.Request.Context(), animeID); typeErr == nil {
      preview = applyEinteilerSuggestion(preview, animeType)
    }
  }
Diese Aufrufstelle in admin_episode_import.go bleibt UNVERÄNDERT (Datei ist bereits bei 783
Zeilen, keine Zeile hinzufügen) -- die gesamte GAP-10-Logik lebt in
admin_episode_import_einteiler.go.

Aktuelle applyEinteilerSuggestion (backend/internal/handlers/admin_episode_import_einteiler.go,
vollständig, 62 Zeilen): siehe @backend/internal/handlers/admin_episode_import_einteiler.go.
IsEinteilerAnimeType(animeType string, totalEpisodeCount int) bool
(backend/internal/repository/episode_placeholder_title.go) ist bereits exportiert: "film" ->
immer true; "ova"/"ona"/"special"/"bonus" -> nur bei totalEpisodeCount==1; alles andere -> false.

Go-Platzhalter-Regex, die episodeImportEinteilerTitle.ts spiegeln muss (NICHT verändern, nur
lesen), backend/internal/repository/episode_placeholder_title.go Zeile ~22:
  var placeholderEpisodeTitlePattern = regexp.MustCompile(`(?i)^(?:episode|folge|ep\.?)\s*0*([0-9]*)$`)
isPlaceholderEpisodeTitle(title string, episodeNumber int32) bool: trimmt, matched gegen obiges
Pattern; leere Nummerngruppe -> true; sonst muss die Nummer exakt episodeNumber entsprechen.

useEpisodeImportBuilder.ts normalizePreviewResult (aktuell, Zeile ~371-395): setzt
canonical_episodes/media_candidates/mappings/unmapped_* auf sichere Defaults. Task 2 fügt VOR dem
bestehenden `canonical_episodes: preview.canonical_episodes ?? []`-Eintrag den
applyEinteilerTitlePrefill-Aufruf ein (ersetzt diesen einen Eintrag, alles andere in der Funktion
bleibt unverändert).

resolveEpisodeDisplayTitle (episodeImportMapping.ts, unverändert, wiederverwendet von Task 2):
  export function resolveEpisodeDisplayTitle(ep: EpisodeImportCanonicalEpisode): string | null {
    if (ep.titles_by_language) { const german = ep.titles_by_language['de']; if (german) return german }
    return ep.title ?? ep.existing_title ?? null
  }
Bewusst nur Deutsch-first (Import-UI zeigt laut eigenem Docstring absichtlich nur den deutschen
Titel) -- Task 2 übernimmt diese bestehende Konvention unverändert, keine de/en/ja-Kaskade nötig.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: GAP-08 + GAP-09 -- Gruppen-Chip-Namensauflösung + Drei-Spalten-Zeilenlayout</name>
  <files>frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts, frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts, frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRowGroupField.tsx, frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx, frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.test.tsx, frontend/src/app/admin/anime/[id]/episodes/import/page.module.css, frontend/src/app/admin/anime/[id]/episodes/import/page.layout.test.ts</files>
  <behavior>
    - Test 1 (episodeImportMapping.test.ts, NEU): `resolveFansubGroupChipDisplay({id: 32}, row)`
      mit `row.fansub_group_match_origin = {raw: 'GAX', matched_via: 'alias', group_id: 32,
      group_name: 'Generation: Anime Xtreme', alias_id: 7}` liefert
      `{label: 'Generation: Anime Xtreme', idTooltip: 'Gruppen-ID: 32'}` -- NICHT `#32` als label.
    - Test 2 (episodeImportMapping.test.ts, NEU): `resolveFansubGroupChipDisplay({id: 5, name:
      'Manuell'}, row)` (manuell gewählt, kein passender origin) liefert `{label: 'Manuell',
      idTooltip: 'Gruppen-ID: 5'}` -- der bereits vorhandene name gewinnt immer vor der
      origin-Auflösung.
    - Test 3 (episodeImportMapping.test.ts, NEU): `resolveFansubGroupChipDisplay({name: 'Neu
      getippt'}, row)` (freitext-Chip ohne id) liefert `{label: 'Neu getippt', idTooltip: null}`.
    - Test 4 (EpisodeImportMappingRow.test.tsx, NEU, GAP-08): Zeile mit
      `fansub_groups: [{id: 32}]` und `fansub_group_match_origin: {raw: 'GAX', matched_via:
      'alias', group_id: 32, group_name: 'Generation: Anime Xtreme', alias_id: 7}` rendert den
      sichtbaren Text „Generation: Anime Xtreme" im Chip; `screen.queryByText('#32')` ist `null`.
    - Test 5 (EpisodeImportMappingRow.test.tsx, NEU, GAP-09): der gerenderte Zeilen-Container
      enthält drei Kind-Elemente mit den Klassen `mappingRowInfo`, `mappingRowFields`,
      `mappingRowActions` (Selektor über `container.querySelector` auf Teilstring-Klassenmatch,
      da CSS-Module die Klassennamen hashen); alle bereits bestehenden Tests in dieser Datei
      bleiben unverändert grün (gleiche aria-labels/Button-Namen wie vorher).
    - Test 6 (page.layout.test.ts, NEU, reine Node-Umgebung, liest page.module.css als Text --
      Ausnahme "Datei, die selbst der geprüfte Gegenstand ist", da jsdom keine echten
      @media-Breakpoints auswertet): die Datei enthält `.mappingRowInfo {`, `.mappingRowFields {`
      und `.mappingRowActions {`; innerhalb des `@media (max-width: 980px)`-Blocks enthält die
      `.mappingRow {...}`-Regel `grid-template-columns: 1fr`.
  </behavior>
  <action>
In `episodeImportMapping.ts` (aktuell 394 Zeilen, Budget beachten -- nur diese eine neue Funktion
hier ergänzen, GAP-10-Logik kommt in Task 2 in eine eigene Datei):

Exportiere `resolveFansubGroupChipDisplay(group: EpisodeImportSelectedFansubGroup, row:
EpisodeImportMappingRow): { label: string; idTooltip: string | null }`. Reihenfolge: (1)
`group.name?.trim()`, (2) `group.slug?.trim()`, (3) falls `group.id` eine endliche Zahl ist UND
`row.fansub_group_match_origin?.group_id === group.id`, dann
`row.fansub_group_match_origin.group_name` (das ist der GAP-08-Fix: automatisch erkannte Gruppen
tragen nur eine id, ihr Name steht bereits im selben Response-Objekt im match-origin), (4) sonst
`` `#${group.id}` `` nur wenn eine id existiert, sonst `'Unbenannte Gruppe'` als letzter Notfall.
`idTooltip` ist `` `Gruppen-ID: ${id}` `` wenn eine numerische id vorhanden ist, sonst `null` --
die ID wird NIE mehr als sichtbares Label verwendet, höchstens als Tooltip. Kurzer Kommentar
darüber, der auf GAP-08 (167-UAT.md) verweist und erklärt, dass
`enrichEpisodeImportPreviewFansubData` (admin_episode_import_fansub_match.go) für auto-erkannte
Gruppen bewusst nur `{ID: &groupID}` ohne Name sendet -- der match-origin trägt den Namen bereits,
daher genügt eine reine Anzeige-Auflösung ohne Backend-Änderung.

In `episodeImportMapping.test.ts`: die drei Fälle aus `<behavior>` als neue `it(...)`-Blöcke
ergänzen, importiere `resolveFansubGroupChipDisplay` in den bestehenden Import-Block aus
`./episodeImportMapping`.

Erstelle `EpisodeImportMappingRowGroupField.tsx` (neue Datei, "use client"): verschiebe aus
`EpisodeImportMappingRow.tsx` die komplette Gruppe-Feld-Logik dorthin -- States (`query`,
`results`, `isSearching`, `searchMessage`), beide `useEffect`s (Reset bei
sourceKey/row.status-Wechsel; debounced `getFansubList`-Suche), Handler
(`handleAddFreeTextChips`, `handleSelectExistingGroup`, `handleGroupInputKeyDown`,
`handleClearGroups`) 1:1 unverändert übernehmen. Props: `{ row: EpisodeImportMappingRow;
sourceKey: string; label: string; episodeNumber: number; isSkipped: boolean;
selectedFansubGroups: EpisodeImportSelectedFansubGroup[]; onSetSelectedFansubGroups,
onAddSelectedFansubGroup, onRemoveSelectedFansubGroup, onApplyFansubGroupToEpisode,
onApplyFansubGroupFromEpisode }` (gleiche Signaturen wie die bisherigen Props auf
EpisodeImportMappingRowCard). JSX-Umbau innerhalb dieser Datei: wrappe alles in
`<FormField label="Gruppe">` (aus `@/components/ui`); Chip-Buttons werden zu `<Button
variant="subtle" size="sm" className={styles.groupChip} disabled={isSkipped} title={idTooltip ??
undefined} onClick={...}>` mit `{label}` aus `resolveFansubGroupChipDisplay(group, row)` gefolgt
von einem "x"-Suffix (aus `episodeImportMapping.ts` importieren); das Such-Eingabefeld wird zu
`<Input>` (behalte `aria-label={\`Fansub-Gruppen für ${label}\`}` exakt bei -- bestehende Tests
verlassen sich darauf); "Als Chip"/"Leeren" werden zu `<Button variant="secondary" size="sm">`
bzw. `<Button variant="ghost" size="sm">`; Suchergebnis-Zeilen werden zu `<Button variant="ghost"
size="sm" fullWidth onMouseDown={...}>` mit Name + `#id`-Badge; `<FansubGroupOriginHint .../>`
unverändert weiterreichen (gleiche Props wie heute); "Episode"/"Ab hier"/"Ab hier entfernen"
werden zu `<Button variant="subtle" size="sm">` mit identischer disabled-Logik wie heute. Behalte
die bestehenden CSS-Klassen `groupChipWrap`, `groupSelector`, `groupInputRow`,
`groupSearchResults`, `groupSearchOption`, `groupSearchState`, `groupPlaceholder`,
`groupSearchMeta` als zusätzliche `className`s auf den neuen Primitives bei (sie steuern nur
Spacing/Farbe, keine Struktur) -- NICHT umbenennen, page.module.css braucht dafür keine Änderung
an diesen Klassen.

Baue `EpisodeImportMappingRow.tsx` um: entferne die komplette Gruppe-Feld-Logik (jetzt in
`EpisodeImportMappingRowGroupField.tsx`), reduziere die Datei auf drei sichtbare Bereiche:
1. `<div className={styles.mappingRowInfo}>` -- Dateiname (`<strong>`), `displayPath`,
   `multiEpisodeHint`, `suggestion_reason` -- unverändert aus der aktuellen Datei übernommen.
2. `<div className={styles.mappingRowFields}>` -- `<EpisodeImportMappingRowGroupField .../>`
   gefolgt von `<FormField label="Episode"><Input className={styles.targetInput}
   defaultValue={...} disabled={isSkipped} onBlur={...} aria-label={\`Ziel-Episoden für
   ${label}\`} placeholder="z.B. 1" /></FormField>` gefolgt von `<FormField label="Version"
   hint={row.release_version_source === 'detected' ? 'Aus Dateiname übernommen' :
   undefined}><Input value={row.release_version ?? ''} disabled={isSkipped} placeholder="z.B. v2"
   aria-label={\`Release-Version für ${label}\`} onChange={...} /></FormField>` -- exakt dieselben
   aria-labels/Werte/Handler wie in der aktuellen Datei, nur als Input/FormField statt nativem
   `<input>`/`<label>`.
3. `<div className={styles.mappingRowActions}>` -- `<span className={\`${styles.statusPill}
   ${styles[row.status]}\`}>{statusLabel(row.status)}</span>` unverändert, dann `<Button
   variant={isSkipped ? 'secondary' : 'ghost'} size="sm" onClick={() => onSkip(sourceKey)}>{isSkipped
   ? 'Reaktivieren' : 'Überspringen'}</Button>`, dann (nur wenn `row.status === 'confirmed' &&
   onApplyRow`) `<Button variant="primary" size="sm" disabled={isApplyingRow}
   onClick={() => onApplyRow(sourceKey)}>{isApplyingRow ? 'Wird angewendet...' :
   'Übernehmen'}</Button>` -- behalte den exakten Text-Swap bei (nicht durch Button's `loading`
   ersetzen, sonst ändert sich der sichtbare Text).
`statusLabel` bleibt unverändert am Dateiende. `EpisodeImportMappingRow.tsx` sollte danach auf
grob 140-190 Zeilen schrumpfen; `EpisodeImportMappingRowGroupField.tsx` grob 220-280 Zeilen --
beide deutlich unter 450.

In `page.module.css`: ändere `.mappingRow`'s `grid-template-columns` auf drei benannte Spalten
(`minmax(0, 1.3fr) minmax(260px, 1fr) auto`, `column-gap` ~20px, `align-items: start`). Füge
`.mappingRowInfo` (flex column, gap 2px, min-width 0 -- wie das bisherige `.mappingRowFile`),
`.mappingRowFields` (grid, gap ~10px, jede FormField volle Breite) und `.mappingRowActions` (flex
column, align-items flex-end, gap ~8px) hinzu. Entferne die jetzt toten Klassen
`.mappingRowFile`, `.releaseMetaRow`, `.releaseMeta`, `.releaseMetaGroup`, `.releaseMetaActions`,
`.releaseMetaLabel`, `.releaseMetaInput` (+ `:disabled`/`:focus`), `.releaseMetaHint`,
`.releaseScopeButton` (+ `:disabled`) sowie ihre Referenzen in beiden bestehenden
`@media`-Blöcken (Zeile ~839-846, ~942-963) -- ersetze sie durch äquivalente Regeln für die drei
neuen Klassennamen. Vereinfache den 980px-Breakpoint für `.mappingRow` auf einen vollständigen
Stack: `grid-template-columns: 1fr` (keine Zwei-Spalten-Zwischenstufe mehr nötig) und
`.mappingRowActions { flex-direction: row; flex-wrap: wrap; justify-content: flex-start; }`
(verhindert horizontales Überlaufen durch rechtsbündige Buttons auf schmalen Screens). Behalte
`.groupChip*`, `.groupSelector`, `.groupInputRow`, `.groupSearchResults`, `.groupSearchOption`,
`.groupSearchState`, `.groupPlaceholder`, `.groupSearchMeta`, `.statusPill` + Status-Farbklassen,
`.fileName`, `.displayPath`, `.multiEpisodeHint`, `.targetInput` unverändert bei (werden weiterhin
von der neuen Struktur referenziert). Am Ende sicherstellen: keine verwaiste
CSS-Klassen-Referenz mehr auf eine der entfernten Klassen (`grep -n "releaseMeta\|mappingRowFile\b\|releaseScopeButton"`
in beiden `.tsx`-Dateien liefert 0 Treffer).

Erstelle `page.layout.test.ts` (Kommentarzeile `// @vitest-environment node` an erster Stelle):
liest `page.module.css` per `node:fs` `readFileSync` als reinen Text. Test A prüft per Regex, dass
`.mappingRowInfo {`, `.mappingRowFields {` und `.mappingRowActions {` im Text vorkommen. Test B
extrahiert das `@media (max-width: 980px)`-Segment NICHT per Klammern-Matching (da CSS mehrere
`}` enthält), sondern per Substring-Slicing: `const start = css.indexOf('@media (max-width:
980px)'); const rest = css.slice(start); const end = rest.indexOf('@media', 10); const block =
end === -1 ? rest : rest.slice(0, end);` -- danach `const rowRule =
block.match(/\.mappingRow\s*\{([^}]*)\}/)` und assert, dass die erste Capture-Group
`grid-template-columns:\s*1fr` enthält (ein einzelnes `}` schließt hier zuverlässig die Regel, da
CSS-Regeln in dieser Datei nicht verschachtelt sind).

In `EpisodeImportMappingRow.test.tsx`: ergänze die zwei neuen Tests aus `<behavior>` (Test 4/5);
lasse alle bestehenden Tests unverändert -- sie prüfen aria-labels/Button-Namen, die nach dem
Umbau identisch bleiben.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts' 'src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.test.tsx' 'src/app/admin/anime/[id]/episodes/import/page.layout.test.ts' && npm run typecheck" 2>&1 | tail -150 && grep -rEc "releaseMeta|mappingRowFile\b|releaseScopeButton" /home/d1sk/team4s/frontend/src/app/admin/anime/\[id\]/episodes/import/EpisodeImportMappingRow.tsx /home/d1sk/team4s/frontend/src/app/admin/anime/\[id\]/episodes/import/EpisodeImportMappingRowGroupField.tsx | grep -v ':0$' | wc -l</automated>
  </verify>
  <done>resolveFansubGroupChipDisplay resolves the auto-detected group's name via
  fansub_group_match_origin (never showing a bare `#id` label when a name is resolvable); the
  mapping row renders as three semantically-named regions (mappingRowInfo/mappingRowFields/
  mappingRowActions) built exclusively from @/components/ui primitives; page.module.css defines a
  narrow-viewport single-column stack for .mappingRow; all pre-existing
  EpisodeImportMappingRow.test.tsx assertions (aria-labels, button names) still pass unchanged;
  neither EpisodeImportMappingRow.tsx nor EpisodeImportMappingRowGroupField.tsx exceeds 450 lines;
  typecheck is clean; zero remaining references to the removed releaseMeta*/releaseScopeButton/
  mappingRowFile CSS classes in either .tsx file.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: GAP-10 -- Einteiler-Platzhaltertitel-Vorbefüllung in der Vorschau</name>
  <files>backend/internal/models/episode_import.go, backend/internal/handlers/admin_episode_import_einteiler.go, backend/internal/handlers/admin_episode_import_einteiler_test.go, frontend/src/types/episodeImport.ts, frontend/src/app/admin/anime/[id]/episodes/import/episodeImportEinteilerTitle.ts, frontend/src/app/admin/anime/[id]/episodes/import/episodeImportEinteilerTitle.test.ts, frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts</files>
  <behavior>
    - Go-Test 1 (NEU, admin_episode_import_einteiler_test.go):
      `applyEinteilerSuggestion({CanonicalEpisodes: [{EpisodeNumber: 1}]}, "ova").IsEinteiler ==
      true`.
    - Go-Test 2 (NEU): `applyEinteilerSuggestion({CanonicalEpisodes: [{EpisodeNumber: 1}]},
      "tv").IsEinteiler == false`.
    - Go-Test 3 (NEU): `applyEinteilerSuggestion({CanonicalEpisodes: [ep1, ep2]},
      "film").IsEinteiler == true` (Film ist immer Einteiler, unabhängig von der Episodenzahl --
      IsEinteilerAnimeType-Vertrag bleibt hier unangetastet).
    - Go-Test 4 (NEU): `applyEinteilerSuggestion({CanonicalEpisodes: [ep1, ep2]},
      "ova").IsEinteiler == false` (OVA mit zwei kanonischen Episoden ist kein Einteiler).
    - Alle vier bestehenden `TestApplyEinteilerSuggestion_*`-Tests bleiben unverändert grün --
      IsEinteiler ist ein rein additives Feld, das die bestehende Vorschlags-Logik nicht
      beeinflusst.
    - TS-Test 1 (episodeImportEinteilerTitle.test.ts, NEU):
      `isPlaceholderEpisodeTitle('Episode 1', 1) === true`,
      `isPlaceholderEpisodeTitle('Folge 01', 1) === true`,
      `isPlaceholderEpisodeTitle('Ep. 1', 1) === true`, `isPlaceholderEpisodeTitle('Episode', 1)
      === true` (bloße Form ohne Nummer), `isPlaceholderEpisodeTitle('Episode 2', 1) === false`
      (falsche Nummer), `isPlaceholderEpisodeTitle('Parody Mode', 1) === false` (echter Titel).
    - TS-Test 2 (NEU): `applyEinteilerTitlePrefill([{episode_number: 1, title: 'Episode 1'}],
      true, '.hack//G.U. Returner')` liefert ein Array, dessen einziges Element `title:
      '.hack//G.U. Returner'` UND `titles_by_language: {de: '.hack//G.U. Returner'}` trägt (GAP-10
      Kernfall: Einteiler + Platzhalter -> Vorbefüllung mit Animetitel).
    - TS-Test 3 (NEU): dieselbe Eingabe mit `isEinteiler = false` liefert das Element unverändert
      (`title: 'Episode 1'`) -- Serien bleiben unangetastet.
    - TS-Test 4 (NEU): `applyEinteilerTitlePrefill([{episode_number: 1, title: 'Parody Mode'}],
      true, '.hack//G.U. Returner')` liefert das Element unverändert (`title: 'Parody Mode'`) --
      ein bereits vorhandener echter Titel wird nie überschrieben.
    - TS-Test 5 (NEU): `applyEinteilerTitlePrefill([{episode_number: 1, title: 'Episode 1'}],
      true, '   ')` (nur Whitespace als Animetitel) liefert das Element unverändert -- kein leerer
      Ersatzwert.
  </behavior>
  <action>
In `backend/internal/models/episode_import.go`: füge dem `EpisodeImportPreviewResult`-Struct
(Zeile ~123-134) ein neues Feld `IsEinteiler bool \`json:"is_einteiler"\`` hinzu (kein
`omitempty` -- `false` ist ein bedeutungsvoller, immer zu sendender Wert). Kurzer Feldkommentar:
GAP-10 (167-UAT.md) -- ermöglicht der Vorschau-Vorbefüllung im Frontend die Kenntnis, ob der
Anime ein Einteiler ist, ohne dass die Seite selbst anime.type kennen muss.

In `backend/internal/handlers/admin_episode_import_einteiler.go`: ändere `applyEinteilerSuggestion`
so, dass `preview.IsEinteiler = repository.IsEinteilerAnimeType(animeType,
len(preview.CanonicalEpisodes))` als ALLERERSTE Zeile im Funktionskörper steht -- VOR dem
bestehenden `if len(preview.CanonicalEpisodes) != 1 { return preview }`-Guard, damit das Feld auch
für Filme mit mehreren kanonischen Episoden und für den generellen (nicht nur den
1-Episode-Sonderfall) korrekt gesetzt wird. Die beiden bestehenden early-return-Bedingungen
darunter bleiben unverändert (sie betreffen nur die GAP-03-Vorschlagslogik, nicht das neue Feld).
Docstring-Ergänzung: diese Funktion setzt jetzt zusätzlich preview.IsEinteiler (GAP-10,
167-UAT.md) -- unabhängig davon, ob die GAP-03-Vorschlagslogik danach noch greift oder früh
zurückkehrt. `admin_episode_import.go`s Aufrufstelle (Zeile ~111-116) bleibt komplett
unverändert -- keine Zeile dort hinzufügen (Datei ist bereits bei 783 Zeilen).

In `admin_episode_import_einteiler_test.go`: ergänze die vier neuen Tests aus `<behavior>`
(Go-Test 1-4) nach dem bestehenden Testmuster in dieser Datei (`skippedRow`-Helper
wiederverwenden wo sinnvoll, sonst ein `models.EpisodeImportPreviewResult{CanonicalEpisodes:
...}` direkt konstruieren -- `Mappings` kann für diese vier neuen Tests leer bleiben, da sie
ausschließlich `got.IsEinteiler` prüfen, nicht die Mapping-Status-Übergänge).

In `frontend/src/types/episodeImport.ts`: füge `EpisodeImportPreviewResult` ein neues optionales
Feld `is_einteiler?: boolean` hinzu (direkt nach `anime_title: string` oder an passender Stelle
im Interface), mit Kommentar-Verweis auf GAP-10/backend `IsEinteiler`.

Erstelle `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportEinteilerTitle.ts` (neue,
eigenständige Datei -- NICHT in episodeImportMapping.ts, die bereits bei 394 Zeilen Budget-nah
ist):
1. Exportiere `isPlaceholderEpisodeTitle(title: string, episodeNumber: number): boolean`, die
   exakt das Go-Pattern aus dem `<interfaces>`-Block spiegelt: `const PATTERN =
   /^(?:episode|folge|ep\.?)\s*0*([0-9]*)$/i`; trimmt `title`; leerer String -> `false`; kein
   Match -> `false`; leere Nummerngruppe -> `true`; sonst muss die geparste Zahl exakt
   `episodeNumber` entsprechen. Kommentar direkt darüber: dies ist eine bewusste, dritte
   Spiegelung derselben Erkennungsregel (Go: `episode_placeholder_title.go`
   `placeholderEpisodeTitlePattern`; Postgres: `public_release_name.go`
   `episodeTitlePlaceholderSQL`) -- diesmal für eine rein anzeigeseitige Vorschau-Vorbefüllung im
   Frontend (kein Persistenz-Entscheid); bei einer künftigen Änderung der Regel müssen alle drei
   Stellen synchron gehalten werden.
2. Exportiere `applyEinteilerTitlePrefill(episodes: EpisodeImportCanonicalEpisode[], isEinteiler:
   boolean, animeTitle: string): EpisodeImportCanonicalEpisode[]`: wenn `!isEinteiler` oder
   `animeTitle.trim()` leer ist, gib `episodes` unverändert zurück (keine Kopie nötig). Sonst
   `.map` über jede Episode: berechne `resolveEpisodeDisplayTitle(episode)` (aus
   `./episodeImportMapping` importieren, dort bereits exportiert); ist das Ergebnis `null`/leer
   ODER matcht `isPlaceholderEpisodeTitle(currentTitle, episode.episode_number)` NICHT, gib die
   Episode unverändert zurück; sonst gib eine Kopie mit `title: trimmedAnimeTitle` und
   `titles_by_language: { ...(episode.titles_by_language ?? {}), de: trimmedAnimeTitle }` zurück.
   Kommentar: GAP-10 (167-UAT.md) -- reine Vorschau-Zustandstransformation, kein
   Datenbank-Schreibzugriff; der Admin kann den vorbefüllten Wert vor "Mapping anwenden" jederzeit
   überschreiben (identisch zum bestehenden `setEpisodeTitle`-Bearbeitungspfad in
   useEpisodeImportBuilder.ts).

Erstelle `episodeImportEinteilerTitle.test.ts` mit den fünf Fällen aus `<behavior>` (TS-Test 1-5),
importiere `isPlaceholderEpisodeTitle`/`applyEinteilerTitlePrefill` aus
`./episodeImportEinteilerTitle`.

In `useEpisodeImportBuilder.ts`: importiere `applyEinteilerTitlePrefill` aus
`./episodeImportEinteilerTitle`. In `normalizePreviewResult` ersetze den bestehenden Eintrag
`canonical_episodes: preview.canonical_episodes ?? [],` durch `canonical_episodes:
applyEinteilerTitlePrefill(preview.canonical_episodes ?? [], preview.is_einteiler ?? false,
preview.anime_title),` -- alle anderen Zeilen dieser Funktion (media_candidates, mappings,
unmapped_episodes, unmapped_media_item_ids) bleiben unverändert.
  </action>
  <verify>
    <automated>docker run --rm -v /home/d1sk/team4s/backend:/app -w /app -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache --network team4s_default golang:1.25-alpine sh -c "go build ./... && go vet ./... && go test ./internal/handlers/... -run TestApplyEinteilerSuggestion -v" && docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/anime/[id]/episodes/import/episodeImportEinteilerTitle.test.ts' && npm run typecheck" 2>&1 | tail -150</automated>
  </verify>
  <done>EpisodeImportPreviewResult.IsEinteiler is always set by applyEinteilerSuggestion (not only
  in the 1-episode suggestion special case); all four new Go tests plus all pre-existing
  TestApplyEinteilerSuggestion_* tests pass; the frontend's isPlaceholderEpisodeTitle mirrors the
  Go regex exactly; applyEinteilerTitlePrefill prefills the title with the anime title only for
  Einteiler + placeholder-matching titles, leaves series and already-real titles untouched; go
  build/go vet and frontend typecheck are clean.</done>
</task>

<task type="auto">
  <name>Task 3: Vollverifikation, 167-UAT.md-Einträge, Container-Rebuild/Restart, Commit</name>
  <files>.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md</files>
  <action>
1. Vollständige Backend-Verifikation im Scratch-Container (siehe `critical_gotcha`): `go build
   ./... && go vet ./... && go test ./...` -- alle Pakete grün, nicht nur die in Task 2
   betroffenen. Notiere die Laufzeit dieses Befehls für die SUMMARY.

2. Vollständige Frontend-Verifikation im laufenden Dev-Container: `docker compose exec -T
   team4sv30-frontend sh -c "cd /app && npm run test"` (voller Testlauf, nicht nur die neuen
   Dateien), danach `npm run typecheck`, danach `npm run lint` -- jeweils als eigener `docker
   compose exec`-Aufruf, jeweils Laufzeit notieren.

3. Vor dem Bearbeiten mit `file 167-UAT.md` und `cat -A
   .planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md | tail -5` bestätigen,
   dass die Datei reine LF-Zeilenenden verwendet (kein `^M`). Am Ende der bestehenden `## Gaps`-
   Liste (nach dem GAP-07-Eintrag) DREI neue Einträge im exakt gleichen Format wie die
   bestehenden `status: resolved`-Einträge anhängen (truth/status/reason/severity/root_cause/
   artifacts/missing/resolution, reale Umlaute, `reason:` referenziert "Live-UAT Auftraggeber,
   Anime #7, 2026-09-24" und die Datei
   „[GAX]dot_hack-G.U._Returner_-_OVA(ger.sub)(XviD)[16007E41].avi"):
   - GAP-08: truth beschreibt, dass automatisch erkannte Gruppen-Chips den aufgelösten Namen
     zeigen, nicht die rohe ID; root_cause verweist auf
     `admin_episode_import_fansub_match.go:109` (`row.FansubGroups = []models.
     SelectedFansubGroupInput{{ID: &groupID}}` ohne Name) und die frühere Rendering-Stelle in
     `EpisodeImportMappingRow.tsx`; resolution nennt `resolveFansubGroupChipDisplay`
     (episodeImportMapping.ts) und dass dies eine reine Frontend-Auflösung ist (kein
     Backend-Change nötig, da `fansub_group_match_origin.group_name` bereits im Response steht).
   - GAP-09: truth beschreibt das neue Drei-Spalten-Layout (Info/Felder/Aktionen) mit
     Stapel-Verhalten auf schmalen Bildschirmen; resolution nennt
     `EpisodeImportMappingRowGroupField.tsx` (neue Datei), die umgebaute
     `EpisodeImportMappingRow.tsx` und die neuen `mappingRowInfo`/`mappingRowFields`/
     `mappingRowActions`-Klassen in `page.module.css`.
   - GAP-10: truth beschreibt die Vorschau-Vorbefüllung des Titelfelds mit dem Animetitel bei
     Einteilern mit Platzhaltertitel; root_cause verweist auf den früheren Quick-Task
     `260923-amz`, der dies wegen fehlender Anime-Typ-Kenntnis auf Seitenebene bewusst
     zurückgestellt hatte; resolution nennt `EpisodeImportPreviewResult.IsEinteiler` (neues Feld,
     backend/internal/models/episode_import.go), die angepasste `applyEinteilerSuggestion`
     (admin_episode_import_einteiler.go) und `episodeImportEinteilerTitle.ts`
     (isPlaceholderEpisodeTitle + applyEinteilerTitlePrefill), verdrahtet in
     `useEpisodeImportBuilder.ts` `normalizePreviewResult`.
   Nach dem Edit erneut `cat -A .../167-UAT.md | tail -60` prüfen -- keine `^M`-Zeichen. Write/Edit-Tool
   verwenden, kein Bash-Heredoc. Bestehende GAP-01..GAP-07-Einträge und die `## Tests`/
   `## Summary`-Abschnitte darüber NICHT verändern.

4. Backend-Rebuild (Fixes im laufenden Container wirksam machen, da Go-Code in Task 2 geändert
   wurde): `docker compose up -d --build team4sv30-backend`. Danach Health-Check: `docker compose
   ps team4sv30-backend` zeigt "Up", `curl -sf http://192.168.235.196:8092/health -o /dev/null -w
   '%{http_code}\n'` liefert `200`.

5. Frontend-Container neu starten: `docker restart team4sv30-frontend`. Danach `docker compose ps
   team4sv30-frontend` zeigt "Up". Vor und nach Schritt 4/5 jeweils `docker inspect -f
   '{{.State.StartedAt}}' team4sv30-backend team4sv30-frontend` notieren und in der SUMMARY
   auflisten (Startzeitpunkte + Laufzeit der Rebuild/Restart-Befehle selbst).

6. Gezielt committen (kein `git add -A`/`.`): alle in `files_modified` (Frontmatter dieses Plans)
   gelisteten Pfade explizit per Pfad zu `git add` hinzufügen, dann `git commit` mit einer
   Commit-Message, die auf GAP-08, GAP-09 und GAP-10 (Phase 167) verweist. Kein `git push`, kein
   `git stash`.
  </action>
  <verify>
    <automated>grep -c "GAP-08\|GAP-09\|GAP-10" /home/d1sk/team4s/.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md; file /home/d1sk/team4s/.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md; docker compose ps team4sv30-backend team4sv30-frontend; curl -sf http://192.168.235.196:8092/health -o /dev/null -w '%{http_code}\n'</automated>
  </verify>
  <done>Backend go build/go vet/go test ./... and frontend npm run test/typecheck/lint all pass
  (or name pre-existing, unrelated failures only, with their commands' durations recorded);
  167-UAT.md has three new GAP-08/GAP-09/GAP-10 entries, all status: resolved, file remains
  LF-only; backend container rebuilt via docker compose up -d --build with confirmed newer start
  time and a 200 from /health; frontend container restarted with confirmed newer start time;
  changes committed with explicit file paths (no git add -A), no git push, no git stash; no
  team4s_v2 data changed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Admin-Browser -> Episode-Import-Vorschau/Apply-Endpoints (bereits admin-only geschützt) | Dieser Plan ändert keine Eingabevalidierung und keine neue Schreib-Berechtigung; GAP-10 fügt ein rein lesendes, bereits abgeleitetes Response-Feld hinzu, GAP-08/GAP-09 sind reine Anzeige-/Layout-Änderungen im bereits vertrauenswürdigen Admin-Client. |
| Backend -> team4s_v2 Postgres (Preview-Pfad) | Unverändert; `GetAnimeType` wird weiterhin genauso aufgerufen wie vorher, nur das bereits geladene Ergebnis wird jetzt zusätzlich in einem neuen Response-Feld gespiegelt -- keine neue Query, keine neue Nutzereingabe im SQL-Pfad. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-QUICK260924-FEC-01 | Information Disclosure | `EpisodeImportPreviewResult.IsEinteiler` (neues Feld) | accept | Leitet sich ausschließlich aus bereits admin-sichtbarem `anime.type` und der bereits im selben Response enthaltenen `canonical_episodes`-Länge ab; kein neues sensibles Datum, nur eine Ableitung bereits vorhandener Felder. |
| T-QUICK260924-FEC-02 | Tampering | `applyEinteilerTitlePrefill` (Frontend, rein clientseitiger Vorschau-Zustand) | accept | Wirkt ausschließlich auf den lokalen React-State der Vorschau; der Apply-Request sendet weiterhin genau das, was im editierbaren Titelfeld steht -- keine neue, ungeprüfte Schreib-Eingabe entsteht, die bestehende Apply-Validierung ist unverändert. |
| T-QUICK260924-FEC-03 | Tampering | `resolveFansubGroupChipDisplay` (Frontend, reine Anzeige) | accept | Verändert nur das gerenderte Label, nie den tatsächlich ausgewählten `fansub_groups`-Payload, der beim Apply gesendet wird -- keine neue Datenintegritätsfläche. |

Keine Package-Manager-Installationen sind Teil dieses Plans; das Package Legitimacy Gate ist nicht
anwendbar.
</threat_model>

<verification>
1. Task 1's neue Vitest-Fälle beweisen die GAP-08-Namensauflösung (auto-erkannt UND manuell) und
   das GAP-09-Drei-Spalten-Layout inklusive Stacking-Breakpoint; alle bestehenden Tests in
   EpisodeImportMappingRow.test.tsx bleiben grün.
2. Task 2's Go- und TS-Tests beweisen, dass IsEinteiler immer korrekt gesetzt wird und dass die
   Frontend-Vorbefüllung exakt auf Einteiler+Platzhalter beschränkt ist (Serien und echte Titel
   bleiben unangetastet).
3. Task 3's Vollverifikation, Migration-freie 167-UAT.md-Aktualisierung und Container-
   Rebuild/Restart schließen den Plan ab.
</verification>

<success_criteria>
- [ ] Automatisch erkannte Fansub-Gruppen-Chips zeigen den aufgelösten Namen, nie die rohe ID;
      die ID ist höchstens ein Tooltip.
- [ ] Die Mapping-Zeile gliedert sich sichtbar in Info/Felder/Aktionen, stapelt auf schmalen
      Bildschirmen vertikal, und nutzt ausschließlich @/components/ui-Primitives.
- [ ] Einteiler mit Platzhaltertitel zeigen in der Vorschau den Anime-Titel vorbefüllt, editierbar,
      ohne stillen Datenbank-Schreibzugriff; Serien und echte Titel bleiben unverändert.
- [ ] Kein von diesem Plan berührtes Produktionsfile überschreitet 450 Zeilen.
- [ ] 167-UAT.md dokumentiert GAP-08/GAP-09/GAP-10 als status: resolved, Datei bleibt LF-only.
- [ ] Backend (`go build`/`go vet`/`go test ./...`) und Frontend (`npm run test`/`typecheck`/
      `lint`) sind vollständig grün oder nennen nur vorbestehende, unabhängige Fehler.
- [ ] Backend-Container per `docker compose up -d --build` neu gebaut, Frontend-Container per
      `docker restart` neu gestartet, beide mit bestätigt neueren Startzeitpunkten.
- [ ] Keine Datenänderung an `team4s_v2`; kein `git push`; kein `git stash`.
</success_criteria>

<output>
Create `.planning/quick/260924-fec-gap-08-gap-10-gruppen-chip-zeigt-id-unru/260924-fec-SUMMARY.md` when done
</output>
