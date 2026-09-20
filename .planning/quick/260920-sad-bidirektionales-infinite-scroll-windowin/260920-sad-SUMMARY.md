---
phase: quick-260920-sad
plan: 01
subsystem: ui
tags: [react, infinite-scroll, windowing, vitest, fansubs]

requires:
  - phase: 164
    provides: Bidirektionales Infinite-Scroll-Windowing (useWindowedEpisodePages) mit funktionierender Rückwärts-Restore-Logik, DOM-Fenster, pageCache/pageMeta-Trennung
provides:
  - Symmetrische Vorwärts-Restore-Logik in loadNext() -- behebt die Scroll-Sackgasse nach Forward→Backward→Forward-Navigation
  - windowedPageWindow.ts: richtungsneutrale, React-freie Fenster-Helfer (applyWindowSlide, findAdjacentKnownPageId)
  - 7 neue Regressionstests, die die Cache-Hit/Cache-Miss/Frontier/Race-Bedingungen für beide Richtungen belegen
affects: [fansubs, episode-list, admin-anime-episodes]

tech-stack:
  added: []
  patterns:
    - "Direction-neutral pure helper functions (windowedPageWindow.ts) shared by both loadNext and loadPrevious instead of per-direction duplication"
    - "findAdjacentKnownPageId as the single source of truth for 'is there a known page next to the DOM window edge' -- never consult a page's own pagination/next_cursor until this returns undefined"

key-files:
  created:
    - frontend/src/components/fansubs/windowedPageWindow.ts
  modified:
    - frontend/src/components/fansubs/useWindowedEpisodePages.ts
    - frontend/src/components/fansubs/useWindowedEpisodePages.test.ts

key-decisions:
  - "loadNext() konsultiert next_cursor nur noch, wenn findAdjacentKnownPageId(...,'after') undefined liefert (State C) -- niemals mehr anhand der global letzten orderedPageIds-Page"
  - "restoreIntoWindow und der Cache-Miss-Refetch-Codepfad wurden in eine gemeinsame, direction-parametrisierte Implementierung (restoreIntoWindow + refetchAndRestore) zusammengeführt, von loadNext UND loadPrevious genutzt"
  - "Live-Browser-Beweis mit vielen Pages an der Naruto-Live-DB ist mit echten Daten nicht möglich (nur 5 Episoden mit Releases) -- Nachweis-Träger ist bewusst ausschließlich die grüne Vitest-Suite, keine Dev-Harness-Route wurde dafür angelegt"

requirements-completed: [SAD-FWD-RESTORE-01]

duration: ~55min
completed: 2026-09-20
---

# Quick-Task 260920-sad: Vorwärts-Restore-Fix im bidirektionalen Episoden-Windowing Summary

**loadNext() konsultiert jetzt zuerst die Fenster-benachbarte bekannte Page statt der Pagination der global letzten Page -- behebt die Scroll-Sackgasse nach Forward→Backward→Forward-Navigation, per 7 neuen Regressionstests bewiesen.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3
- **Files modified:** 3 (1 neu, 2 geändert)

## Ursache

`loadNext()` entschied bisher ausschließlich anhand von `current.orderedPageIds[orderedPageIds.length - 1]`
("tailId", die *global letzte jemals geladene* Page) und deren `pagination.has_more`/`next_cursor`, ob
überhaupt ein neuer Request nötig ist. Das ist korrekt, solange das DOM-Fenster am globalen Ende steht --
bricht aber sobald `domWindowPageIds` nach mehrfachem `loadPrevious()` nicht mehr am Ende steht: zwischen
dem Ende des DOM-Fensters und der globalen Tail-Page liegt dann mindestens eine bekannte, aber nicht
gemountete Page, die `loadNext()` schlicht überging. War die globale Tail-Page zusätzlich `has_more: false`
(z. B. weil das Anime-Ende schon einmal erreicht wurde), brach `loadNext()` sofort ab -- eine echte
Scroll-Sackgasse, obwohl mehrere bekannte Zwischenpages jederzeit wiederherstellbar gewesen wären.

Die bereits funktionierende Rückwärtslogik (`loadPrevious`/`restoreIntoWindow`) hatte dieses Problem nicht,
weil sie korrekt anhand der Fenster-benachbarten Page in `orderedPageIds` (relativ zu `domWindowPageIds[0]`)
entschied -- nur die Vorwärtsrichtung nutzte diese Symmetrie nicht.

## Änderung

1. **Neue Datei `windowedPageWindow.ts`** (React-frei, pure Funktionen, ohne Hooks/State):
   - `applyWindowSlide(windowPageIds, targetId, direction, maxSize)`: vereinheitlicht die Fenster-Slide-
     und Eviction-Mechanik (bisher als zwei leicht unterschiedliche Inline-Implementierungen in
     `restoreIntoWindow` und `loadNext` dupliziert) für beide Richtungen (`'before'`/`'after'`).
   - `findAdjacentKnownPageId(orderedPageIds, windowPageIds, direction)`: ermittelt die Page direkt neben
     dem tatsächlichen DOM-Fenster-Rand in `orderedPageIds` -- **nie** die global erste/letzte Page. Das ist
     die zentrale Fehlerkorrektur.

2. **`useWindowedEpisodePages.ts` umgebaut:**
   - `restoreIntoWindow(targetId, page, direction)` nutzt jetzt `applyWindowSlide` statt Inline-Logik
     (Verhalten identisch, nur direction-parametrisiert statt Prepend-only).
   - Neue private Funktion `refetchAndRestore(targetId, direction, setLoading, setError, errorMessage)`
     kapselt den Cache-Miss-Refetch-Codepfad (liest `pageMeta.get(targetId)?.cursorUsedToFetch`, fragt
     GENAU diesen Cursor erneut ab, nie einen neu erfundenen) -- wird jetzt von `loadNext` UND
     `loadPrevious` gemeinsam genutzt statt nur von `loadPrevious`.
   - `loadNext()` fragt zuerst `findAdjacentKnownPageId(..., 'after')`: bei Treffer + Cache-Hit
     Sofort-Restore ohne Request (State A); bei Treffer + Cache-Miss genau ein Refetch über den eigenen
     gespeicherten Cursor (State B); nur wenn KEINE bekannte Page mehr existiert (das Fenster-Ende ist
     selbst die globale Tail-Page) wird `pagination.has_more`/`next_cursor` dieser Page konsultiert (State C
     -- echte neue Page).
   - `loadPrevious()` auf dieselben Helfer umgebaut, Ergebnis für Cache-Hit/Cache-Miss/"keine frühere
     Page" unverändert.
   - Beide Dateien bleiben unter der CLAUDE.md-450-Zeilen-Grenze (`windowedPageWindow.ts`: 69 Zeilen,
     `useWindowedEpisodePages.ts`: 399 Zeilen) -- keine zusätzliche Extraktion nötig.

## Task Commits

1. **Task 1: Symmetrische Vorwärts-Restore-Logik** - `b03af0fa` (fix)
2. **Task 2: Pflicht-Regressionstests (7 Fälle)** - `916f48d4` (test)
3. **Task 3: Vollständige Verifikation, Container-Neustart, SUMMARY.md** - dieser Commit (docs, separat vom Orchestrator committet)

## Tests

7 neue/erweiterte Testfälle in `useWindowedEpisodePages.test.ts` (Datei jetzt 15 Tests total, plus 4
unveränderte in `FansubVersionBrowser.windowing.test.tsx` -- 19/19 grün):

1. **"Forward -> Backward -> Forward stellt bekannte Pages in korrekter Reihenfolge wieder her, keine
   Sackgasse"** -- lädt p0..p6, scrollt zurück auf `['p0','p1','p2']` (3 Cache-Hits + 1 Cache-Miss-Refetch
   für p0), scrollt danach viermal wieder runter bis `['p4','p5','p6']`. Deckt dabei eine reale, durch
   `CACHE_MAX_PAGES=6`-Reinsertion ausgelöste Zwei-Refetch-Kaskade auf (p3 UND p4 werden beide einmal
   neu geladen, weil das Wiedereinfügen von p3 ans Map-Ende die Eviction-Reihenfolge verschiebt und p4
   dabei aus dem Cache fällt) -- das Fenster bleibt trotzdem jederzeit korrekt und schreitet ohne
   Sackgasse voran. Exakte Aufrufzahl (9 Requests total: 6 initial + 1 Rückwärts-Refetch + 2
   Vorwärts-Refetches) hergeleitet und assertiert, keine doppelten Page-Ids.
2. **"kein unnötiger neuer API-Request, wenn die nächste Page noch im Cache ist"** -- p0-p2 im Fenster,
   p3 noch im Cache -- Bottom-Sentinel feuert, 0 zusätzliche Requests, Fenster wird `['p1','p2','p3']`.
3. **"bekannte Page nicht mehr im Cache -- exakt ein Refetch mit dem korrekten eigenen Cursor"** -- p3 aus
   dem Cache verdrängt, Bottom-Sentinel feuert -- genau ein Request mit `cursor: 'c3'` (p3s eigener
   ursprünglicher Cursor, nicht der einer anderen Page).
4. **"Regressionstest: globale Tail-Page mit has_more=false blockiert nicht das Restaurieren einer
   bekannten Zwischen-Page"** -- die konkrete im Auftrag beschriebene Regression: p6 hat `has_more=false`,
   trotzdem wird p3 restauriert statt abzubrechen (`showEndMarker===true` beweist die has_more=false-Lage
   der Tail-Page).
5. **"Erst an der echten Frontier wird next_cursor konsultiert"** -- p1-p3 im Fenster, p3 IST die globale
   Tail-Page mit `has_more:true`/`next_cursor:'c4'` -- genau ein Request mit `cursor:'c4'`, danach echte
   neue Page p4 im Fenster.
6. **"Ende der Liste -- kein Request, kein Loop, kein dauerhafter Ladezustand"** -- einzige Page mit
   `has_more:false`, mehrfaches Bottom-Sentinel-Feuern löst nie einen Request aus, `forwardLoading` bleibt
   `false`.
7. **"Schneller Richtungswechsel während laufender Requests erzeugt keine doppelten Pages, keinen
   hängenden Ladezustand"** -- State-B-Vorwärts-Refetch mit offener Promise, währenddessen Top-Sentinel
   gefeuert (Single-Flight-Guard verhindert zweiten Request), danach Auflösung -- genau eine Page
   hinzugefügt, keine doppelte Id, beide Ladezustände am Ende `false`.

## Nachweis

- **Forward→Backward→Forward grün:** Test 1 belegt die Kernbehebung ohne Scroll-Sackgasse.
- **Kein unnötiger Request:** Test 2 belegt State A (Cache-Hit, 0 Requests).
- **Kein N+1 / keine Backend-Auswirkung:** reine Frontend-Logikänderung in genau drei Dateien, kein
  Backend-Code, keine neuen Endpunkte, keine DB-Migration berührt.
- **DOM-Fenster bleibt begrenzt:** alle 7 Tests assertieren `domWindowPageIds` explizit nach jeder
  Restaurierung -- niemals mehr als `DOM_WINDOW_SIZE=3` Einträge.
- **Kein Scroll-Lock am Listenende:** Test 6 belegt explizit, dass am echten Listenende kein Request/kein
  Loop/kein dauerhafter Ladezustand entsteht.
- **Vollständige relevante Frontend-Suite:** `npx vitest run --run` -- 328 von 330 Dateien grün, **0 neue
  Fehlschläge**. Die einzigen 2 fehlschlagenden Tests (`cssCustomProperties.guard.test.ts`) sind laut
  `.planning/STATE.md` (mehrfach dokumentiert, u. a. Zeile 49/77/253/292/416) ein bereits vor diesem
  Quick-Task bestehender, phasenfremder Fehlschlag außerhalb des Scopes dieses Tasks. Ein einzelner
  initialer Lauf zeigte zusätzlich zwei transiente, unzusammenhängende Timing-Flakes
  (`DefaultCrewManager.test.tsx`, `src/app/admin/fansubs/[id]/edit/page.test.tsx`) unter erhöhter
  Parallel-Last -- ein zweiter, isolierter Lauf zeigte diese nicht mehr; beide Dateien haben keinen Bezug
  zum geänderten Windowing-Code und wurden von diesem Quick-Task nicht berührt.
- **`tsc --noEmit`:** 0 Fehler (projektweit).
- **ESLint** auf `windowedPageWindow.ts` und `useWindowedEpisodePages.ts`: 0 Findings.
- **Zeilenlimit (CLAUDE.md ≤450 Zeilen Produktionscode):** `windowedPageWindow.ts` 69 Zeilen,
  `useWindowedEpisodePages.ts` 399 Zeilen -- beide eingehalten.
- **Container-Neustart:** `docker restart team4sv30-frontend`, danach `curl -sf
  http://127.0.0.1:3000/anime/4` liefert `200`.
- **Keine Dev-Harness-Route:** `find frontend/src/app/dev -maxdepth 1 -iname
  "episode-windowing-preview*"` liefert keine Treffer -- Phase 164 hat diese Route final gelöscht, sie
  wurde für diesen Quick-Task nicht wieder angelegt. Es wurde auch keine temporäre lokale Test-Harness
  benötigt oder angelegt.
- **Bewusste Einschränkung (auftragskonform dokumentiert):** Ein realer Browser-Beweis mit vielen Pages
  an der Naruto-Live-DB ist nicht möglich, da Naruto in der aktuellen Live-Datenbank nur 5 Episoden mit
  Releases hat (eine Seite reicht dort niemals über die API-Seitengröße von 24 hinaus). Der
  Nachweis-Träger für diesen Quick-Task ist daher ausschließlich die grüne Vitest-Suite aus Task 2 --
  dies ist eine bewusste, im Auftrag selbst benannte Einschränkung, kein verschwiegener Kompromiss.

## Files Created/Modified
- `frontend/src/components/fansubs/windowedPageWindow.ts` - Neue Datei: richtungsneutrale, React-freie Fenster-Helfer (`applyWindowSlide`, `findAdjacentKnownPageId`)
- `frontend/src/components/fansubs/useWindowedEpisodePages.ts` - `loadNext`/`loadPrevious`/`restoreIntoWindow` auf gemeinsame Helfer umgebaut, neue `refetchAndRestore`-Funktion
- `frontend/src/components/fansubs/useWindowedEpisodePages.test.ts` - 7 neue Regressionstests für den Vorwärts-Restore-Fix

## Decisions Made
- `next_cursor` der Pagination-Frontier wird strikt erst konsultiert, wenn `findAdjacentKnownPageId(...,'after')` `undefined` liefert -- nie mehr anhand der global letzten `orderedPageIds`-Page.
- Gemeinsame, direction-parametrisierte Implementierung statt zwei parallelen (Vorwärts-/Rückwärts-)Codepfaden, um zukünftige Drift zwischen den Richtungen zu verhindern.
- Nachweis-Träger bewusst ausschließlich Vitest (kein Live-Browser-Beweis, kein Dev-Harness-Wiederaufbau) -- im Auftrag selbst so vorgegeben.

## Deviations from Plan

None - plan executed exactly as written. Die im Task-1-Verify-Schritt vorgesehene "Zusatz-Extraktion bei
Zeilenlimit-Überschreitung" (Schritt 7) war nicht nötig, da beide Dateien die 450-Zeilen-Grenze deutlich
unterschreiten.

## Issues Encountered

Beim Schreiben von Test 1 (Forward→Backward→Forward) zeigte eine erste Testversion eine
Zwischenannahme als falsch: die naive Erwartung "genau ein Refetch (p3) im gesamten Vorwärts-Rücklauf"
traf nicht zu. Die tatsächliche `Map`-Insertionsreihenfolge in `pageCache` verschiebt sich, wenn eine
zuvor gelöschte Page (z. B. p0 oder p3) per `pageCache.set()` wieder eingefügt wird -- sie landet am Ende
der Insertion-Order, nicht an ihrer "natürlichen" Position. Das führt dazu, dass `evictCacheIfNeeded`
beim nächsten Overflow eine andere, ältere-im-Sinn-von-am-längsten-nicht-neu-eingefügte Page evictet als
naiv erwartet (hier: p4 statt einer bereits erwarteten Page). Das ist **kein Bug** im neuen Code -- die
Eviction-Semantik ("älteste, nicht im Fenster befindliche Cache-Eintrag nach Map-Insertion-Order") war
bereits vor diesem Quick-Task exakt so spezifiziert und ist unverändert aus `restoreIntoWindow`/`loadNext`
übernommen. Der Test wurde entsprechend an das tatsächliche (korrekte) Verhalten angepasst: er erwartet
jetzt zwei Refetches (p3 und p4) statt einem, dokumentiert die Kaskade explizit im Kommentar, und beweist
weiterhin lückenlos, dass das Fenster trotzdem in der richtigen Reihenfolge und ohne Sackgasse voranschreitet.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness

- Der Vorwärts-Restore-Defekt aus dem Auftrag ist behoben und regressionsgetestet; `FansubVersionBrowser.tsx` benötigt keine Anpassung (öffentliche Hook-Rückgabeform unverändert).
- Ein echter Live-Browser-Beweis mit vielen Pages bleibt offen, bis ein Anime mit mehr als 24 Episoden-Releases in der Live-Datenbank verfügbar ist -- kein Blocker für diesen Quick-Task, aber eine sinnvolle künftige Ergänzung, falls ein Auftraggeber einen visuellen Sign-off wünscht.

---
*Quick-Task: 260920-sad*
*Completed: 2026-09-20*

## Self-Check: PASSED

- FOUND: frontend/src/components/fansubs/windowedPageWindow.ts
- FOUND: frontend/src/components/fansubs/useWindowedEpisodePages.ts
- FOUND: frontend/src/components/fansubs/useWindowedEpisodePages.test.ts
- FOUND: .planning/quick/260920-sad-bidirektionales-infinite-scroll-windowin/260920-sad-SUMMARY.md
- FOUND commit: b03af0fa (Task 1)
- FOUND commit: 916f48d4 (Task 2)
