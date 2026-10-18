---
phase: quick-261018-l5r
plan: 01
subsystem: ui
tags: [anisearch, admin-anime-edit, go, gin, nextjs, react, pgx]

requires: []
provides:
  - "POST /api/v1/admin/anime/:id/anisearch/link — additiver, konflikt-sicherer AniSearch-Verknüpfungs-Endpunkt"
  - "AnimeEditWorkspace.tsx unter 450 Zeilen aufgeteilt (useAnimeEditAssetSearch, useAnimeEditAssetRemoval, AnimeEditSourceSection, AnimeEditDetailsSection, AnimeEditHeaderBanner)"
  - "Neue \"AniSearch verknüpfen\"-Karte in der Anime-Bearbeitung (Titel-Suche + ID/URL-Eingabe)"
affects: [anime-edit, episode-import, admin-content-handler]

tech-stack:
  added: []
  patterns:
    - "Additiver, konflikt-sicherer Source-Link-Insert (anime_source_links + eigene ID-Spalte, anime.source nie überschrieben) — gespiegelt von linkAdditionalJellyfinSource (165-07)"
    - "Pure-Umbau-Commit vor inhaltlicher Änderung bei Überschreitung der CLAUDE.md-450-Zeilen-Grenze"

key-files:
  created:
    - backend/internal/repository/admin_content_anisearch_link.go
    - backend/internal/handlers/admin_content_anime_anisearch_link.go
    - frontend/src/app/admin/anime/hooks/useAnimeEditAssetSearch.ts
    - frontend/src/app/admin/anime/hooks/useAnimeEditAssetRemoval.ts
    - frontend/src/app/admin/anime/hooks/useAnimeEditAniSearchLink.ts
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditSourceSection.tsx
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditDetailsSection.tsx
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditHeaderBanner.tsx
  modified:
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/models/admin_content.go
    - backend/cmd/server/admin_routes.go
    - frontend/src/types/admin.ts
    - frontend/src/lib/api/admin/anime-core.ts
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx
    - frontend/src/app/admin/anime/components/AnimeEditPage/SharedAnimeEditorWorkspace.tsx
    - frontend/eslint.config.mjs

key-decisions:
  - "Task 1 reuses the package-internal linkAdditionalJellyfinSource insert helper directly for the anisearch: source tag instead of duplicating its ON CONFLICT/ownership-check logic."
  - "Task 2 split AnimeEditWorkspace.tsx into 5 files (2 more than the plan's own estimate of 2-3) to get under 450 lines; all new files stay well under the limit."
  - "Task 3 keeps all new AniSearch-link UI state local to AnimeEditSourceSection.tsx (via a dedicated hook) rather than threading an override back up through AnimeEditWorkspace.tsx — the plan explicitly allows the displayed ID to be a local override until the next full anime reload."
  - "admin.ts (frontend/src/types/admin.ts) was already 1173 lines before this plan and is now 1190 — the CLAUDE.md 450-line-split rule technically triggers on any content change to this file, but a full module split of a repo-wide-imported type barrel is an architectural change (Rule 4) out of scope for this bug fix; logged to deferred-items.md instead of silently skipped or silently performed."

requirements-completed: []

duration: ~2h (Tasks 1-3 only; plan execution paused at Task 4 checkpoint)
completed: 2026-10-18
---

# Quick Task 261018-l5r: AniSearch-Verknüpfung nachträglich in der Anime-Bearbeitung

**Additiver `POST /api/v1/admin/anime/:id/anisearch/link`-Endpunkt plus neue "AniSearch
verknüpfen"-Karte im Admin-Anime-Edit-Flow, die den fehlenden Nachtrags-Pfad für Anime 12/13
schließt — PLAN NOCH NICHT VOLLSTÄNDIG, siehe Status unten.**

## Status: Tasks 1-3 COMPLETE, Task 4 ist ein offener Checkpoint, Task 5 NICHT ausgeführt

Dieser Lauf hat ausschließlich die drei sicheren, entscheidungsunabhängigen Tasks 1-3 ausgeführt
(sie beheben den vom Nutzer gemeldeten Bug bereits vollständig für sich). Task 4
(`type="checkpoint:decision" gate="blocking"`) wartet auf eine explizite Nutzer-Entscheidung, ob
die zusätzliche, seit 2026-04-24 nicht mehr eingebundene "AniSearch-Daten übernehmen"-Logik in
diesem Plan reaktiviert werden soll. Task 5 (Backend-Rebuild, Frontend-Neustart,
Live-Test-Anleitung) folgt erst NACH dieser Entscheidung, unabhängig von ihrem Ausgang — er wurde
in diesem Lauf bewusst NICHT ausgeführt.

## Performance

- **Tasks completed:** 3 von 5 (Task 4 offener Checkpoint, Task 5 ausstehend)
- **Files created:** 8
- **Files modified:** 8
- **Commits:** 3 (ein Commit pro Task)

## Accomplishments

- Neuer additiver, konflikt-sicherer Backend-Endpunkt `POST /api/v1/admin/anime/:id/anisearch/link`:
  schreibt nie `anime.source`, liefert 409 mit dem Namen des anderen Anime bei Fremdbesitz
  (sowohl im Pre-Check als auch im Race-Fallback), nie 500.
- `AnimeEditWorkspace.tsx` von 811 auf 424 Zeilen reduziert (reiner Umbau-Commit, keine
  Verhaltensänderung, bestehende Tests bleiben grün).
- Neue "AniSearch verknüpfen"-Karte in der Anime-Bearbeitung: Titel-Suche (wiederverwendet den
  Create-Flow-Suchendpunkt) + direkte ID/URL-Eingabe, beide persistieren sofort über den neuen
  Endpunkt, zeigen 409-Konflikte in korrektem Deutsch mit Umlauten, nutzen ausschließlich
  `@/components/ui`-Primitives für den neuen Code.
- Backend- und Frontend-Tests (Handler-httptest+Fake-Repo, Postgres-DSN-gated Repo-Test,
  zusätzlich manuell gegen einen echten `team4s_v2`-Schema-Klon verifiziert; React-Component-Test
  mit echten Klick-/Eingabe-Interaktionen) decken alle im Plan genannten Verhaltens-Fälle ab.

## Task Commits

1. **Task 1: Backend — additiver AniSearch-Link-Endpunkt** - `61e2b42b4` (feat)
2. **Task 2: Frontend — reiner Umbau-Commit, AnimeEditWorkspace.tsx unter 450 Zeilen** - `26a1d9b1d` (refactor)
3. **Task 3: Frontend — AniSearch-Verknüpfungs-Karte in der Anime-Bearbeitung** - `c103f672f` (feat)

Kein Plan-Abschluss-Commit (`docs(...): complete ... plan`) in diesem Lauf, da der Plan NICHT
abgeschlossen ist — Task 4/5 folgen erst nach der Nutzer-Entscheidung.

## Files Created/Modified

**Backend (Task 1):**
- `backend/internal/repository/admin_content_anisearch_link.go` - `LinkAniSearchSource`: additiver, konflikt-sicherer Insert + schema-bewusstes `anime.anisearch_id`-Update, nie `anime.source`
- `backend/internal/repository/admin_content_anisearch_link_test.go` - Postgres-DSN-gated Repo-Tests (Harness aus `anime_source_links_test.go` wiederverwendet)
- `backend/internal/handlers/admin_content_anime_anisearch_link.go` - `LinkAnimeAniSearchSource` Handler, Pre-Check + Race-Fallback-409
- `backend/internal/handlers/admin_content_anime_anisearch_link_test.go` - httptest + Fake-Repo Handler-Tests (400/409/409-Fallback/200)
- `backend/internal/handlers/admin_content_handler.go` - neues `adminAniSearchLinkRepository`-Interface + Feld + Verdrahtung
- `backend/internal/models/admin_content.go` - `AdminAnimeAniSearchLinkResult`
- `backend/cmd/server/admin_routes.go` - neue Route

**Frontend Split (Task 2):**
- `frontend/src/app/admin/anime/hooks/useAnimeEditAssetSearch.ts`/`.test.ts` - Asset-Kandidaten-Suchstate + Handler
- `frontend/src/app/admin/anime/hooks/useAnimeEditAssetRemoval.ts` - die beiden Asset-Entfernen-Handler
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditSourceSection.tsx` - Identität-Karte + Jellyfin-Karte (+ `hasProviderSource`)
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditDetailsSection.tsx` - Basisdaten + Genre/Tags/Beschreibung
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditHeaderBanner.tsx` - Seitenkopf
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx` - 811 → 424 Zeilen
- `frontend/eslint.config.mjs` - Ratchet-Liste um `AnimeEditDetailsSection.tsx` ergänzt (relokierte Altlast, keine neuen Verstöße)

**AniSearch-Link-Karte (Task 3):**
- `frontend/src/app/admin/anime/hooks/useAnimeEditAniSearchLink.ts` - State/Handler für Suche, ID/URL-Extraktion, Verknüpfen, Konflikt
- `frontend/src/lib/api/admin/anime-core.ts` - `linkAdminAnimeAniSearchSource`
- `frontend/src/types/admin.ts` - `AdminAnimeAniSearchLinkRequest`/`-Result`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditSourceSection.tsx` - neue Karte
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditSourceSection.test.tsx` - 5 Verhaltens-Tests
- `frontend/src/app/admin/anime/components/AnimeEditPage/SharedAnimeEditorWorkspace.tsx` - präzisierender Kommentar, keine Textänderung

## Decisions Made

- `linkAdditionalJellyfinSource` (anime_source_links.go, trotz des Jellyfin-spezifischen Namens
  generisch) direkt für den AniSearch-Insert wiederverwendet, statt eine zweite, fast identische
  Insert-Funktion zu schreiben — Datei bleibt laut Plan-Vorgabe unverändert.
- `AnimeEditWorkspace.tsx` brauchte 3 zusätzliche Extraktionsdateien (nicht nur die im Plan
  skizzierten 2), um unter 450 Zeilen zu kommen — reine Umbau-Entscheidung, keine
  Verhaltensänderung, siehe Deviations unten.
- Die neue AniSearch-Link-Karte hält ihren gesamten State (Suche, Eingabe, Konflikt, lokale
  ID-Überschreibung) lokal in `AnimeEditSourceSection.tsx` via eigenem Hook, statt ihn durch
  `AnimeEditWorkspace.tsx` zu reichen — kleinere Diff-Fläche, passt zur Plan-Vorgabe ("lokaler
  State, der die Response überschreibt").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Zusätzliche Datei-Extraktion nötig, um AnimeEditWorkspace.tsx unter 450 Zeilen zu bringen**
- **Found during:** Task 2
- **Issue:** Nach der im Plan skizzierten Extraktion (Asset-Such-Hook + `AnimeEditSourceSection`) war `AnimeEditWorkspace.tsx` noch bei 641 Zeilen (Plan ging von einer Zwei-Datei-Extraktion aus, die im Plan-Text als wahrscheinlich ausreichend beschrieben wird, aber nicht zwingend reichen muss — der Plan selbst sah diesen Fall vor: "bleibt AnimeEditWorkspace.tsx dennoch über 450 Zeilen, extrahiere zusätzlich detailsSection").
- **Fix:** Zusätzlich `AnimeEditDetailsSection.tsx` (wie vom Plan als Fallback vorgesehen), `AnimeEditHeaderBanner.tsx` und `useAnimeEditAssetRemoval.ts` extrahiert (zwei Extraktionen über den im Plan explizit genannten Fallback hinaus), um konsequent unter 450 Zeilen zu kommen. Reiner Umbau, keine Verhaltensänderung.
- **Files modified:** `AnimeEditWorkspace.tsx`, neu: `AnimeEditDetailsSection.tsx`, `AnimeEditHeaderBanner.tsx`, `useAnimeEditAssetRemoval.ts`
- **Verification:** `wc -l` aller Dateien ≤ 450, `npm run typecheck`/Testsuite grün (527/527)
- **Committed in:** `26a1d9b1d` (Task-2-Commit)

**2. [Rule 2 - Missing Critical / CLAUDE.md-Konformität] ESLint-Ratchet-Liste um relozierte Altlast ergänzt**
- **Found during:** Task 2
- **Issue:** Die rein verschobenen nativen `<input>`/`<select>`-Basisdaten-Felder landeten in der neuen Datei `AnimeEditDetailsSection.tsx`, die (anders als die bereits gelistete `AnimeEditWorkspace.tsx`) NICHT auf der `LEGACY_NO_RESTRICTED_SYNTAX_FILES`-Ratchet-Liste stand — die native-Element-Regel hätte dadurch 8 ERROR-Lint-Treffer auf reinem Alt-Code erzeugt.
- **Fix:** `AnimeEditDetailsSection.tsx` nach demselben bereits etablierten Muster (180-04/184-05) zur Ratchet-Liste ergänzt, mit Begründungskommentar.
- **Files modified:** `frontend/eslint.config.mjs`
- **Verification:** `npm run lint` liefert für diese Datei nur noch `warning`, keine neuen Verstöße in anderen Dateien
- **Committed in:** `26a1d9b1d` (Task-2-Commit)

### Flagged, NOT auto-fixed (Rule 4 — architectural)

**3. CLAUDE.md 450-Zeilen-Regel vs. `frontend/src/types/admin.ts`**
- **Found during:** Task 3
- **Issue:** Task 3 ergänzt `admin.ts` (bereits 1173 Zeilen) um zwei kleine Interfaces (+17 Zeilen). CLAUDE.md verlangt wörtlich einen Split JEDER inhaltlich geänderten Datei über 450 Zeilen.
- **Why not auto-fixed:** Ein vollständiger Modul-Split dieser repo-weit importierten Typdatei ist eine Architektur-Entscheidung mit breiter Fehler-Oberfläche (Rule 4), nicht Teil dieses engen Bugfixes.
- **Status:** Dokumentiert in `.planning/quick/261018-l5r-anisearch-verkn-pfung-nachtr-glich-in-de/deferred-items.md`, wartet auf Nutzer-Entscheidung.

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 CLAUDE.md-Konformität) + 1 architectural flag (nicht auto-gefixt)
**Impact on plan:** Beide Auto-Fixes waren notwendig, um die bestehenden CLAUDE.md-Regeln einzuhalten, ohne den Umfang des Plans zu sprengen. Der dritte Punkt (admin.ts) ist bewusst NICHT automatisch behoben, sondern eskaliert.

## Issues Encountered

- Erster Testdurchlauf von `useAnimeEditAssetSearch.test.ts` schlug fehl (`toggleAssetCandidateSelection`-Test rief `setActiveAssetSearchKind` und `toggleAssetCandidateSelection` im selben `act()`-Block auf, wodurch der Toggle-Handler noch den alten `activeAssetSearchKind`-Wert aus dem Closure sah) — behoben durch Aufteilen in separate `act()`-Blöcke, damit zwischen den State-Änderungen ein Re-Render stattfindet. Reiner Testfehler, keine Produktionscode-Änderung nötig.
- Die ersten beiden Backend-Testläufe (`-run AniSearchLink`) liefen mit "no tests to run", da meine ursprünglichen Testfunktionsnamen (`TestLinkAniSearchSource_...`, `TestLinkAnimeAniSearchSource_...`) nicht den String "AniSearchLink" enthielten, den der Plan-Verify-Befehl als `-run`-Muster vorgibt — alle betroffenen Testfunktionen umbenannt (z. B. zu `TestAniSearchLink_...`), keine Verhaltensänderung.
- Die Postgres-DSN-gated Repo-Tests aus Task 1 laufen standardmäßig übersprungen (kein `TEAM4S_ANIME_SOURCE_LINKS_TEST_DSN` gesetzt, wie im restlichen Repo üblich) — zusätzlich manuell gegen eine frisch erzeugte Wegwerf-Datenbank mit echtem `team4s_v2`-Schema-Klon (`pg_dump --schema-only`) verifiziert, alle 4 Tests grün, Datenbank danach wieder entfernt.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness

**Checkpoint erforderlich, bevor dieser Plan fortgesetzt werden kann:** Task 4
(`type="checkpoint:decision" gate="blocking"`) fragt, ob die zusätzliche "AniSearch-Daten
übernehmen"-Logik (`AniSearchEnrichmentSection.tsx`/`useAniSearchEditEnrichment.ts`) in diesem
Plan reaktiviert werden soll oder als separater, späterer Quick-Task folgt. Siehe
`261018-l5r-PLAN.md` Task 4 und den Abschnitt "OFFENE PRODUKTENTSCHEIDUNG" für die vollständige
Begründung.

Nach dieser Entscheidung folgt Task 5 (Backend-Rebuild, Frontend-Neustart, Live-Test-Anleitung
für Anime 13 „Freezing“, AniSearch-ID 6465) — unabhängig vom Ausgang der Entscheidung. Anime
12/13 wurden in diesem Lauf nicht verändert.

---
*Quick Task: 261018-l5r*
*Tasks 1-3 completed: 2026-10-18*
*Plan status: PAUSED at Task 4 checkpoint*

## Self-Check: PASSED

All 10 created files confirmed present on disk; all 3 task commit hashes
(`61e2b42b4`, `26a1d9b1d`, `c103f672f`) confirmed present in `git log --oneline --all`.

---

## Addendum (2026-10-18): Dedupe-Nachtrag zu Tasks 1-3, Items 1-4

User-angeforderter De-Duplizierungs-Nachtrag auf die bereits committeten Tasks 1-3 — **kein
neues Feature**, Task 4 (Checkpoint) und Task 5 des Original-Plans bleiben unverändert
unausgeführt.

### Status: Items 1-4 COMPLETE, Task 4/5 des Original-Plans weiterhin offen

### Commits

1. `26c31bc73` (refactor) — gemeinsame `AniSearchSearchCard` extrahiert
2. `c4ff94d12` (refactor) — gemeinsamer `extractAniSearchIDFromLinkInput`, auch im Create-Flow
3. `a93eff6b8` (chore) — totes AniSearch-Enrichment entfernt (gelöschte Dateien)
4. `2c9ff9b7d` (chore) — Nachtrag zu Commit 3: die begleitenden Änderungen in bestehenden Dateien
   (Route-Entfernung, `buildAdminAnimeEditPath`-Verschiebung, Wrapper-Entfernung,
   Test-Entfernung), die durch einen Staging-Fehler (ungültiger Pathspec auf einer bereits per
   `git rm` entfernten Datei ließ `git add` mit mehreren Pfaden komplett abbrechen) aus Commit 3
   herausfielen

### Item 1 — Gemeinsame AniSearchSearchCard

Neue Komponente `frontend/src/app/admin/anime/components/shared/AniSearchSearchCard.tsx` (178
Zeilen) — platziert im bereits etablierten `components/shared/`-Konventionsordner (siehe
`AnimeEditorShell.tsx`/`AnimeOwnershipBadge.tsx` dort). Owns ausschließlich: Titel-Suche-Zeile,
ID/URL-Eingabe-Zeile, Kandidaten-Liste (`FormField`+`Input`+`Button` aus `@/components/ui`, keine
nativen Elemente). Labels/Platzhalter/Button-Texte sind pro Aufrufer konfigurierbar.

- `CreateAniSearchIntakeCard.tsx`: 166 → 104 Zeilen. Eigene `<section>`, Header und das
  `AniSearchDuplicateDecision`-Rendering bleiben unverändert — nur die beiden nativen
  Input-Zeilen + Kandidaten-Liste wurden durch die neue Komponente ersetzt. Alle nativen
  `<input>`/`<button>` sind daraus verschwunden.
- `AnimeEditSourceSection.tsx`: 245 → 202 Zeilen. Der inline `FormField`/`Input`/`Button`-Block
  aus Task 3 wurde durch dieselbe Komponente ersetzt; eigener Header und Konflikt-/Fehler-/
  Erfolgs-Block bleiben unverändert.
- Kandidaten-Liste jetzt bei beiden Flows im einheitlichen Card-Stil (vorher: Edit nutzte
  `<ul><li>`-Markup mit abweichendem Meta-Textformat) — `AnimeEditSourceSection.test.tsx`
  entsprechend auf das neue Rendering angepasst (1 Assertion geändert, keine neue Test-Lücke).
- Test: neue `AniSearchSearchCard.test.tsx` (9 Verhaltens-Tests: Tippen, Klicken, Disabled-State,
  Submitting-Label-Swap, Kandidaten-Auswahl, Existing-Hint, optionaler Dismiss-Button).
- Nebenbei behoben: ASCII-Tippfehler "Laedt..." → korrektes "Lädt..." beim Umzug (CLAUDE.md
  Sprachqualität, Rule 1/CLAUDE.md-Durchsetzung).

### Item 2 — Gemeinsamer AniSearch-ID/URL-Extractor

`extractAniSearchIDFromLinkInput` aus `useAnimeEditAniSearchLink.ts` nach
`frontend/src/app/admin/anime/utils/anime-helpers.ts` verschoben (einzige Definition jetzt,
Hook importiert sie). `loadAniSearchDraftByID` im Create-Flow
(`useAniSearchIntakeActions.ts`) wendet den Extractor jetzt auf die eingegebene ID an, bevor der
Request gebaut wird — eine komplette AniSearch-URL im Create-ID-Feld funktioniert jetzt genauso
wie in der Anime-Bearbeitung. Tests: 6 neue Fälle in `anime-helpers.test.ts` (plain ID, URL mit/
ohne Slug, Whitespace, leer, unbekanntes Muster) + 1 neuer Create-Flow-Test (`handleAniSearchDraftLoad`
mit eingefügter URL → identische submitted ID wie bei direkter Zahleneingabe).

### Item 3 — Totes AniSearch-Enrichment entfernt

Gelöscht: `AniSearchEnrichmentSection.tsx`/`.test.tsx`, `useAniSearchEditEnrichment.ts`/`.test.ts`
(frontend, nirgends mehr importiert — verifiziert per `grep`, einziger verbleibender Treffer ist
eine Absence-Check-Assertion in `[id]/edit/page.test.tsx`, die weiterhin grün ist). Der
Backend-Endpunkt `LoadAnimeAniSearchEnrichment` (`POST /admin/anime/:id/enrichment/anisearch`)
plus seine Tests wurden ebenfalls entfernt, da der einzige Aufrufer
(`loadAdminAnimeEditAniSearchEnrichment` im Frontend-API-Wrapper) mitentfernt wurde — eigener
`grep -rn "LoadAnimeAniSearchEnrichment\|enrichment/anisearch"` über Front- und Backend bestätigte
keine weiteren Aufrufer. `buildAdminAnimeEditPath` (weiterhin von zwei anderen Handlern gebraucht)
wurde vor dem Löschen nach `admin_content_anime_anisearch_link.go` verschoben, nicht mitgelöscht.
Die Go-Modelltypen `AdminAnimeAniSearchEditRequest`/`-SuccessResult` sowie das Frontend-Pendant
`AdminAnimeEditDraftPayload`-Verwandte in `types/admin.ts` wurden bewusst NICHT entfernt (außerhalb
des explizit vom Auftrag benannten Lösch-Umfangs) — jetzt orphaned, als Altlast für eine
zukünftige Aufräumrunde notiert, kein Blocker.

**Wichtig für Task 4 des Original-Plans:** Diese Löschung schließt die Option "den toten Code
reaktivieren" literal aus — eine künftige Reaktivierung der "AniSearch-Daten übernehmen"-Logik
müsste neu gebaut werden, nicht wiederbelebt.

### Item 4 — Backend-Write-Pfad-Check für `anime.anisearch_id`: DISKREPANZ GEFUNDEN

Die Orchestrator-Vorab-Prüfung (siehe Task-4-Prompt) behauptete, `LinkAniSearchSource`
(`admin_content_anisearch_link.go`) sei "der EINZIGE existierende Write-Pfad für
`anime.anisearch_id` im gesamten Repo" basierend auf der Prüfung von `anime_v2.go` und
`admin_content_anime_update_v2.go` (beide tatsächlich nur SELECT — das wurde erneut mit
`grep -n "anisearch_id" backend/internal/repository/*.go` bestätigt).

**Das ist nicht vollständig richtig.** `backend/internal/repository/admin_content_anime_create_v2.go`
(Zeilen 186–194) enthält einen DRITTEN Schreibzugriff: Beim initialen `INSERT INTO anime (...)`
der Anime-Neuanlage (Create-Flow, `buildCreateAnimeV2InsertQuery`) wird `anisearch_id` als Spalte
mit aufgenommen, abgeleitet aus `input.Source`/`input.SourceLinks` via
`extractAnimeSourceIDByPrefix(..., "anisearch:")`.

Das ist jedoch ein strukturell anderer Fall als "ein zweiter Ort, der dasselbe tut wie
`LinkAniSearchSource`": `LinkAniSearchSource` ist ein UPDATE auf einen bereits existierenden
Anime (nachträgliches Verknüpfen); der Create-Insert setzt die Spalte einmalig beim Erstanlegen
einer komplett neuen Zeile, abgeleitet aus Feldern, die zu diesem Zeitpunkt bereits im
Create-Request stehen. Es gibt keinen Fall, in dem beide Pfade um dieselbe Zeile konkurrieren
könnten (INSERT vs. UPDATE auf unterschiedliche Lebenszyklus-Phasen). Es gibt daher nichts, das
hier "konsolidiert" werden müsste oder sollte — aber die Aussage "einziger Write-Pfad im gesamten
Repo" ist präzise gefasst falsch, und wird hiermit korrigiert statt stillschweigend übernommen.

**Keine Code-Änderung vorgenommen** (wie vom Auftrag für diesen Fall verlangt — Diskrepanz
melden, nichts anfassen).

---

## Addendum (2026-10-18): `frontend/src/types/admin.ts` CLAUDE.md-450-Zeilen-Split (löst Deferred Item 1)

Reiner Umbau-Nachtrag, der den in `deferred-items.md` Punkt 1 festgehaltenen Konflikt zwischen
der CLAUDE.md-450-Zeilen-Regel und `frontend/src/types/admin.ts` (zuletzt 1190 Zeilen) auflöst —
**kein Verhaltensunterschied**, keine Fortsetzung von Task 4/5 des Original-Plans.

### Status: Deferred Item 1 RESOLVED

### Item 5 — `admin.ts` in drei Thementeile gesplittet, `admin.ts` selbst wird reiner Re-Export-Barrel

`frontend/src/types/admin.ts` (1190 Zeilen) wurde in drei neue Dateien unter `frontend/src/types/`
aufgeteilt, jede Typ-/Interface-Definition unverändert (byte-identischer Körper, nur verschoben):

- `admin-anime-core.ts` (410 Zeilen) — `AnimeType`, `AdminAnimeAssetKind` (aus der alten
  Zeilenmitte hierher vorgezogen, da es ausschließlich von Asset-Search-Typen in diesem Block
  gebraucht wird und so ein Rückwärts-Import in dieser Datei entfällt), `AdminAnimeItem`/
  `AdminEpisodeItem`, alle Create/Patch/Draft-Payload-Typen, sämtliche AniSearch-Edit/Link/
  Create-Request+Result+Conflict-Typen, Asset-Search-Typen, Episode-Create/Patch,
  Jellyfin-Sync-Request, Upsert/Delete-Responses, alle Relation-Typen.
- `admin-jellyfin.ts` (386 Zeilen) — `GenreToken`..`AdminUpsertNameResponse`,
  `AdminAnimeJellyfinSyncResult`..`AdminAnimeJellyfinMetadataApplyResponse` (Tags/Genres +
  Jellyfin-Sync/Discovery/Intake/Preview/Editor-Hydration). Importiert `AnimeType` aus
  `admin-anime-core.ts` (nur `AdminJellyfinIntakeTypeHint.suggested_type` braucht ihn).
- `admin-theme-segment.ts` (399 Zeilen) — `AdminMediaUploadResponse` bis Dateiende: alle
  OP/ED-Theme-, Release-Theme-Asset- und `AdminThemeSegment*`/`AdminSegmentLibrary*`-Typen.
  Importiert `AnimeType` (für `AdminFansubAnimeEntry.type`) aus `admin-anime-core.ts` und
  `AdminAnimePersistedBackgroundState` (für `AdminAnimeBackgroundAssetResponse.data`) aus
  `admin-jellyfin.ts`.
- `admin.ts` (7 Zeilen) — nur noch drei `export * from './admin-...'`-Zeilen plus ein
  Kommentar-Header, der auf die drei Zieldateien für künftige neue Typen verweist.

**Keine andere Datei im Repo musste geändert werden:** `grep -rn "from '@/types/admin'"
frontend/src` liefert vor und nach dem Split exakt dieselben 62 Zeilen (per `diff` auf
sortierten Listen bestätigt) — jede bestehende `import { X } from '@/types/admin'`-Stelle
kompiliert unverändert gegen den neuen Re-Export-Barrel.

**Verifikation:** `npm run typecheck` grün (keine Fehler). `npm run lint` zeigt 4 vorbestehende
Fehler in unveränderten Dateien (`capture-responsive.cjs` × 2 `no-require-imports`,
`useReleaseVersionMedia.ts` React-Compiler-Memoization-Warnung als Error konfiguriert,
`CapabilityDetailRow.tsx` `no-unescaped-entities`) — keiner davon in den vier
`types/admin*.ts`-Dateien, bestätigt als bereits vor diesem Commit bestehende Baseline-Last
(außerhalb des Auftragsumfangs, nicht angefasst). Volle Frontend-Testsuite: 391 bestandene
Testdateien + 1 übersprungen (392 gesamt), 3572 bestandene Tests, 0 Fehlschläge.

**Deferred Item 1 (`deferred-items.md`) ist damit erledigt** — Option (a) aus dem dort
dokumentierten Entscheidungsvorschlag wurde umgesetzt (eigene, dedizierte Aufteilung analog zu
den 180-04/184-05-Mustern), nicht Option (b) (dauerhafte Ausnahme).

### Commit

5. `<siehe git log, Commit dieses Nachtrags>` (refactor) — `admin.ts` Split in drei
   Thementeile + Barrel, keine Verhaltensänderung

---

## Addendum (2026-10-18): Teil B — Uebernahme-Feedback im Frontend verdrahtet

Frontend-only-Nachtrag: verdrahtet die bereits ausgelieferte `takeover`-Antwort des Backend-
Endpunkts `POST /api/v1/admin/anime/:id/anisearch/link` (separates Backend-Teil-B-Vorhaben, hier
nicht wiederholt) in die "AniSearch verknüpfen"-Karte, damit der Admin nach einer Verknüpfung
sieht, welche Felder übernommen/ersetzt wurden, welche wegen manueller Pflege behalten wurden,
und ob Jellyfin beim Vergleich unerreichbar war. **Kein neues Feature über den vom Nutzer
spezifizierten Umfang hinaus**, Task 4/5 des Original-Plans bleiben unverändert unausgeführt.

### Status: COMPLETE

### Commit

6. `9697b8e65` (feat) — `AniSearch-Uebernahme-Feedback in der Anime-Bearbeitung`

### Umsetzung

- `frontend/src/types/admin-anime-core.ts`: `AdminAnimeAniSearchLinkResult` um optionales
  `takeover`-Feld erweitert, plus zwei neue Typen `AdminAnimeAniSearchFieldOutcome` und
  `AdminAnimeAniSearchTakeoverResult` — 1:1 gespiegelt aus den Go-Typen in
  `backend/internal/models/admin_content_anisearch.go` (frisch gelesen vor dem Schreiben).
- `frontend/src/app/admin/anime/hooks/useAnimeEditAniSearchLink.ts`: neuer `linkTakeover`-State,
  nach einem erfolgreichen `handleLink()` auf `response.data.takeover ?? null` gesetzt (fehlendes
  `takeover`-Feld wird wie "nichts anzuzeigen" behandelt, kein Fehler).
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditSourceSection.tsx`: lokale
  deutsche Beschriftungs-Map für die 8 Übernahme-Felder (`title_de`→"Titel (DE)" usw. — an keiner
  anderen Stelle im Code existiert eine wiederverwendbare Map für genau diese rohen
  Backend-Feldnamen, `createAniSearchSummary.ts` zeigt rohe Keys unverändert an). Drei neue
  Zeilen NACH der geteilten `AniSearchSearchCard` (bewusst nicht in der Shared-Komponente, da
  "Übernahme" ein reines Edit-Konzept ist, das der Create-Flow nicht kennt):
  - Jellyfin-nicht-erreichbar-Hinweis (`styles.warningBox`, exakter Wortlaut
    "Jellyfin nicht erreichbar – nur leere Felder gefüllt.")
  - "Übernommen: …" (`filled`+`replaced` zusammengefasst in EINER Zeile, wie vom Nutzer
    vorgegeben — "was sich geändert hat", nicht aufgeteilt nach gefüllt/ersetzt)
  - "Behalten (manuell geändert): …" (`kept`-Feldnamen, Begründungen der Felder als
    kombiniertes `title`-Tooltip-Attribut auf der Zeile, nicht als separate Textknoten, um die
    Tests einfach und robust zu halten)
  - Keine Zeile wird gerendert, wenn alle drei Listen leer sind (nur die normale
    Erfolgsmeldung bleibt stehen).
- Tests (`AnimeEditSourceSection.test.tsx`, Teststil-konform — echte Klick-Interaktion über die
  bestehende Harness, kein Quelltext-`strings.Contains`): 3 neue Fälle — Übernahme-Mix
  (gefüllt+ersetzt+behalten in korrekten deutschen Labels), `jellyfin_unreachable: true`
  (exakter Hinweistext), fehlender `takeover`-Key (kein Crash, keine Übernahme-Zeile).

### Verifikation

- `npm run typecheck`: grün, keine Fehler.
- `npm run lint`: dieselben 4 vorbestehenden Fehler wie in Addendum "Item 5" oben
  (`capture-responsive.cjs` × 2, `useReleaseVersionMedia.ts`/React-Compiler-Memoization,
  `CapabilityDetailRow.tsx`), keiner in den vier geänderten Dateien dieses Nachtrags.
- `npm test -- --run src/app/admin/anime`: 56 Testdateien, 547 Tests, alle grün (davon 8 in
  `AnimeEditSourceSection.test.tsx`, 3 davon neu).
- Backend neu gebaut (`docker compose build team4sv30-backend && docker compose up -d
  team4sv30-backend`) und neu gestartet, `/health` → `{"status":"ok"}` (HTTP 200). Frontend-
  Dev-Server neu gestartet (`docker restart team4sv30-frontend`, kein `npm run build` im laufenden
  Container, wie vom Auftrag vorgegeben) — läuft wieder fehlerfrei, `GET /` → 200.
- Anime 12/13 wurden in diesem Lauf nicht verändert — der Live-Test (Freezing → AniSearch-ID 6465
  verknüpfen) bleibt dem Nutzer selbst vorbehalten.

### Dateien (dieser Nachtrag)

- Geändert: `frontend/src/types/admin-anime-core.ts`,
  `frontend/src/app/admin/anime/hooks/useAnimeEditAniSearchLink.ts`,
  `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditSourceSection.tsx`,
  `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditSourceSection.test.tsx`
