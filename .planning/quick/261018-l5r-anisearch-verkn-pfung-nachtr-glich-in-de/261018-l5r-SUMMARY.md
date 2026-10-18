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
