---
phase: quick-260920-sad
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [frontend/src/components/fansubs/windowedPageWindow.ts, frontend/src/components/fansubs/useWindowedEpisodePages.ts, frontend/src/components/fansubs/useWindowedEpisodePages.test.ts]
autonomous: true
requirements: [SAD-FWD-RESTORE-01]

must_haves:
  truths:
    - "Nach Forward→Backward→Forward-Navigation (p0..p6 laden, mehrfach hochscrollen, dann wieder runter) werden p3, p4, p5, p6 in korrekter Reihenfolge restauriert -- keine Scroll-Sackgasse am unteren Sentinel"
    - "Eine bereits im pageCache befindliche, bekannte nächste Page wird ohne zusätzlichen API-Request restauriert"
    - "Eine bekannte, aber aus dem pageCache verdrängte nächste Page wird über ihren in pageMeta gespeicherten cursorUsedToFetch exakt einmal neu geladen -- nicht über next_cursor der globalen letzten Page"
    - "Eine has_more=false-Pagination auf der global letzten bekannten Page blockiert nicht das Wiederherstellen bekannter Zwischenpages vor ihr"
    - "next_cursor der Pagination-Frontier wird nur konsultiert, wenn direkt hinter dem aktuellen DOM-Fenster keine bekannte Page mehr existiert"
    - "Das DOM-Fenster bleibt nach jedem Vorwärts-Restore auf maximal DOM_WINDOW_SIZE Pages begrenzt, älteste Page wird zum Spacer"
    - "Schneller Richtungswechsel (unten/oben/unten) während laufender Requests erzeugt keine doppelten Pages, keine falsche Reihenfolge, keine stale Response im State und keinen dauerhaft aktiven Ladezustand"
  artifacts:
    - path: "frontend/src/components/fansubs/windowedPageWindow.ts"
      provides: "Reine, richtungsneutrale Fenster-Helfer (applyWindowSlide, findAdjacentKnownPageId), von loadNext UND loadPrevious gemeinsam genutzt"
      contains: "export function applyWindowSlide"
    - path: "frontend/src/components/fansubs/useWindowedEpisodePages.ts"
      provides: "Symmetrische Vorwärts-/Rückwärts-Restore-Logik über drei Page-Zustände (Cache-Hit, Cache-Miss-aber-bekannt, echt unbekannt)"
      contains: "findAdjacentKnownPageId"
    - path: "frontend/src/components/fansubs/useWindowedEpisodePages.test.ts"
      provides: "7 Pflicht-Regressionstests aus dem Auftrag (Forward→Backward→Forward, Cache-Hit, Cache-Miss-Refetch, has_more=false-Regression, korrekter next_cursor an der echten Frontier, Listenende, schneller Richtungswechsel)"
      contains: "Forward"
  key_links:
    - from: "frontend/src/components/fansubs/useWindowedEpisodePages.ts"
      to: "frontend/src/components/fansubs/windowedPageWindow.ts"
      via: "import { applyWindowSlide, findAdjacentKnownPageId } from './windowedPageWindow'"
      pattern: "from '\\./windowedPageWindow'"
    - from: "frontend/src/components/fansubs/useWindowedEpisodePages.ts loadNext"
      to: "restoreIntoWindow / refetchAndRestore"
      via: "State-A (Cache-Hit) und State-B (Cache-Miss, bekannt) rufen dieselbe direction='after'-Restaurierung wie loadPrevious mit direction='before'"
      pattern: "restoreIntoWindow\\("
    - from: "frontend/src/components/fansubs/FansubVersionBrowser.tsx (unverändert)"
      to: "useWindowedEpisodePages"
      via: "bestehende öffentliche Hook-Rückgabe (pages, domWindowPageIds, spacers, bottomSentinelRef, topSentinelRef) bleibt formgleich -- kein Konsumenten-Umbau nötig"
      pattern: "useWindowedEpisodePages\\("
---

<objective>
Behebe den Vorwärts-Restore-Defekt im bidirektionalen Infinite-Scroll-Windowing der Anime-Episodenliste
(`useWindowedEpisodePages.ts`): Nach Forward→Backward-Navigation muss das erneute Herunterscrollen
zuerst alle bereits bekannten, aber nicht gemounteten Pages wiederherstellen (aus dem Cache oder per
erneutem Request über ihren eigenen gespeicherten Cursor), bevor `next_cursor` der Pagination-Frontier
für eine echte neue Page konsultiert wird. Aktuell bricht `loadNext()` fälschlich anhand der Pagination
der global letzten bekannten Page ab, auch wenn zwischen DOM-Fenster und dieser letzten Page noch
bekannte, wiederherstellbare Pages liegen -- das erzeugt eine Scroll-Sackgasse.

Die bestehende Architektur (API-Pagegröße 24, DOM-Fenster, `orderedPageIds`, `pageCache`, `pageMeta`,
Spacer, Scroll-Anchor-Korrektur, einzelner `AbortController`) bleibt erhalten. Kein Rewrite --
Erweiterung der bereits funktionierenden Rückwärtslogik um eine symmetrische Vorwärtsvariante, mit
gemeinsamen, richtungsneutralen Hilfsfunktionen statt Duplikation.

Purpose: Der Auftraggeber hat live bestätigt, dass die Rückwärts-Wiederherstellung bereits funktioniert
(Phase 164), die symmetrische Vorwärtsrichtung nach mehrfachem Richtungswechsel aber noch nicht
abgesichert ist -- dieser Quick-Task schließt genau diese Lücke.
Output: `windowedPageWindow.ts` (neue reine Helfer), überarbeitetes `useWindowedEpisodePages.ts`,
7 neue/erweiterte Regressionstests, grüne Frontend-Testsuite, dokumentiertes SUMMARY.md.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@frontend/src/components/fansubs/useWindowedEpisodePages.ts
@frontend/src/components/fansubs/useWindowedEpisodePages.test.ts
@frontend/src/components/fansubs/FansubVersionBrowser.windowing.test.tsx
@frontend/src/types/episodeVersion.ts

<interfaces>
<!-- Aktueller Stand loadNext (useWindowedEpisodePages.ts, Zeilen 134-184) -- die Wurzel des Defekts -->
Aktuell orientiert sich `loadNext()` ausschließlich an
`current.orderedPageIds[current.orderedPageIds.length - 1]` ("tailId") und dessen `pagination`, um zu
entscheiden, ob überhaupt ein neuer Request nötig ist. Das ist falsch, sobald `domWindowPageIds` nicht
mehr am globalen Ende steht (z.B. nach mehrfachem `loadPrevious()`): dann liegt zwischen dem Ende des
DOM-Fensters und `tailId` bereits mindestens eine bekannte, aber nicht gemountete Page, die übersprungen
wird, obwohl sie weder neu geladen noch verworfen werden dürfte.

<!-- Aktueller Stand restoreIntoWindow (Zeilen 186-203) -- bereits funktionierende Rückwärtslogik,
     die als Vorlage für die symmetrische Vorwärtsvariante dient -->
`restoreIntoWindow(targetId, page)` prependt `targetId` vor `domWindowPageIds`, evictet bei
Überschreiten von `DOM_WINDOW_SIZE` das äußerste Element vom ANDEREN Ende (`length - 1`), setzt für die
evictete Id einen Spacer aus `lastKnownHeightsRef`, markiert `targetId` in `pendingRestoreIds` (für die
Scroll-Anchor-Korrektur in `reportPageHeight`) und ruft `evictCacheIfNeeded`. Diese Eviction-/
Spacer-/Anchor-Mechanik ist korrekt und MUSS für die Vorwärtsrichtung identisch wiederverwendet werden
(nur mit vertauschter Prepend/Append- bzw. Evict-Seite) -- keine zweite, abweichende Implementierung.

<!-- Aktueller Stand loadPrevious (Zeilen 205-244) -- Cache-Miss-Refetch-Vorlage -->
`loadPrevious()` ermittelt `firstIndex = orderedPageIds.indexOf(domWindowPageIds[0])`, bricht bei
`firstIndex <= 0` ab (keine frühere Page existiert), liest sonst `targetId =
orderedPageIds[firstIndex - 1]`. Bei Cache-Hit ruft es direkt `restoreIntoWindow`. Bei Cache-Miss liest
es `pageMeta.get(targetId)?.cursorUsedToFetch` und fragt GENAU diesen Cursor erneut ab (niemals einen
neu erfundenen) -- dieses Muster ist exakt das, was die Vorwärtsrichtung für "State B" (bekannt, aber
aus dem Cache verdrängt) ebenfalls braucht, nur mit `direction='after'`.

<!-- PublicGroupedEpisodesResponse / Pagination-Form (frontend/src/types/episodeVersion.ts) -->
`pagination: { has_more: boolean; next_cursor: string | null; row_limit: number }`. `WindowedPage` hat
`{ id, cursorUsedToFetch, episodes, pagination }`. `PageMeta` hat nur `{ cursorUsedToFetch }` und wird
NIE gelöscht (auch nicht bei Cache-Eviction) -- das ist bereits die Grundlage, die Cache-Miss-Refetches
in beide Richtungen ermöglicht.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Symmetrische Vorwärts-Restore-Logik -- neue Fenster-Helfer + Refactor von loadNext/loadPrevious</name>
  <files>frontend/src/components/fansubs/windowedPageWindow.ts, frontend/src/components/fansubs/useWindowedEpisodePages.ts</files>
  <behavior>
    - Behavior 1 (State A, Vorwärts-Cache-Hit): Ist die Page direkt hinter dem aktuellen DOM-Fenster-Ende
      in `orderedPageIds` bekannt UND noch in `pageCache`, restauriert `loadNext()` sie ohne jeden
      Netzwerk-Request, evictet die älteste Fenster-Page in einen Spacer, Fenstergröße bleibt
      `DOM_WINDOW_SIZE`.
    - Behavior 2 (State B, Vorwärts-Cache-Miss-aber-bekannt): Ist diese nächste Page bekannt (Eintrag in
      `pageMeta` existiert), aber aus `pageCache` verdrängt, lädt `loadNext()` sie über GENAU ihren in
      `pageMeta` gespeicherten `cursorUsedToFetch` neu (nicht über den `next_cursor` irgendeiner anderen
      Page), genau ein Request, danach identische Restaurierung wie bei State A.
    - Behavior 3 (Regression -- globale Tail-Page mit `has_more=false`): Ist die global letzte bekannte
      Page (`orderedPageIds[length-1]`) NICHT identisch mit der letzten Fenster-Page und hat sie
      `has_more=false`, wird trotzdem die nächste bekannte Zwischen-Page restauriert (State A oder B) --
      `has_more` der globalen Tail-Page wird für diese Entscheidung gar nicht befragt.
    - Behavior 4 (State C, echte neue Page): Existiert KEINE bekannte Page hinter dem Fenster-Ende (das
      Fenster-Ende ist selbst die globale Tail-Page), wird ausschließlich dann `pagination.has_more`/
      `next_cursor` DIESER Page konsultiert und bei `has_more=true` ein echter neuer Request mit neuer
      Page-Id ausgelöst; bei `has_more=false` passiert nichts (Listenende).
    - Behavior 5 (Symmetrie/Regression, Rückwärtsrichtung unverändert im Ergebnis): `loadPrevious()`
      liefert nach dem Refactor bei Cache-Hit, Cache-Miss-Refetch und "keine frühere Page" exakt dieselben
      Resultate wie vor dem Refactor -- nur intern über dieselben richtungsneutralen Helfer wie `loadNext`.
  </behavior>
  <action>
Lege eine neue Datei `frontend/src/components/fansubs/windowedPageWindow.ts` an mit zwei reinen,
React-freien, exportierten Funktionen (keine Hooks, kein State, testbar ohne renderHook):

1. `export type WindowDirection = 'before' | 'after'`.
2. `export function applyWindowSlide(windowPageIds: string[], targetId: string, direction: WindowDirection, maxSize: number): { windowPageIds: string[]; evictedId: string | null }`.
   Für `direction === 'before'`: `targetId` wird vorne angefügt (`[targetId, ...windowPageIds]`); wird
   `maxSize` überschritten, wird vom HINTEREN Ende evictet (`slice(0, maxSize)`, `evictedId` ist das
   letzte Element vor dem Slice). Für `direction === 'after'`: `targetId` wird hinten angefügt
   (`[...windowPageIds, targetId]`); wird `maxSize` überschritten, wird vom VORDEREN Ende evictet
   (`slice(length - maxSize)`, `evictedId` ist das erste Element vor dem Slice). Wird `maxSize` nicht
   überschritten, ist `evictedId` null. Dies ist exakt die bereits in `restoreIntoWindow` (Prepend-Fall)
   und in der bisherigen `loadNext`-Inline-Logik (Append-Fall) vorhandene Eviction-Mechanik, nur jetzt an
   einer Stelle vereinheitlicht -- keine Verhaltensänderung der Eviction selbst.
3. `export function findAdjacentKnownPageId(orderedPageIds: string[], windowPageIds: string[], direction: WindowDirection): string | undefined`.
   Für `direction === 'before'`: nimm `windowPageIds[0]`, finde dessen Index in `orderedPageIds`; ist der
   Index `<= 0` oder das Fenster leer, gib `undefined` zurück (keine frühere Page existiert), sonst gib
   `orderedPageIds[index - 1]` zurück. Für `direction === 'after'`: nimm das letzte Element von
   `windowPageIds`, finde dessen Index in `orderedPageIds`; existiert danach kein weiteres Element (Index
   ist der letzte in `orderedPageIds`, oder das Fenster ist leer, oder das letzte Fenster-Element ist aus
   irgendeinem Grund nicht in `orderedPageIds` auffindbar), gib `undefined` zurück, sonst gib
   `orderedPageIds[index + 1]` zurück. Diese Funktion ist die zentrale Fehlerkorrektur: sie fragt NIE
   nach der global letzten `orderedPageIds`-Page, sondern immer nach der Page direkt neben dem
   tatsächlichen DOM-Fenster-Rand.

Überarbeite anschließend `frontend/src/components/fansubs/useWindowedEpisodePages.ts`:

1. Importiere `applyWindowSlide`, `findAdjacentKnownPageId`, `type WindowDirection` aus
   `./windowedPageWindow`.
2. Erweitere `restoreIntoWindow(targetId, page)` um einen dritten Parameter `direction: WindowDirection`.
   Ersetze die bisherige Inline-Prepend-und-Evict-vom-Ende-Logik durch einen Aufruf von
   `applyWindowSlide(prev.domWindowPageIds, targetId, direction, DOM_WINDOW_SIZE)`; setze bei
   vorhandenem `evictedId` den Spacer aus `lastKnownHeightsRef.current.get(evictedId) ?? 0` wie bisher.
   `pendingRestoreIds.add(targetId)` und `evictCacheIfNeeded` bleiben unverändert erhalten.
3. Führe eine neue private, hook-interne async Funktion `refetchAndRestore(targetId: string, direction: WindowDirection, setLoading: (v: boolean) => void, setError: (v: string | null) => void, errorMessage: string): Promise<void>` ein, die den bisherigen Cache-Miss-Refetch-Codepfad aus `loadPrevious` kapselt: liest `pageMeta.get(targetId)?.cursorUsedToFetch` aus `coreRef.current`, erzeugt einen `AbortController`, setzt ihn auf `requestRef.current`, ruft `setLoading(true)`/`setError(null)`, ruft `getGroupedEpisodes` mit `projection: 'public'`, `limit: 24`, optionalem `fansub` aus `activeFansubSlugRef.current`, optionalem `cursor` aus dem gelesenen `cursorUsedToFetch` (niemals einen neu erfundenen Cursor), und dem `signal`. Bei Erfolg (nach demselben `aborted`/`requestRef.current !== controller`-Stale-Guard wie im Bestandscode): `restoreIntoWindow(targetId, { id: targetId, cursorUsedToFetch: cursorUsedToFetch ?? null, episodes: response.data.episodes, pagination: response.data.pagination }, direction)`, danach `requestRef.current = null`, `setLoading(false)`. Im `catch` (nach demselben Stale-Guard): `requestRef.current = null`, `setLoading(false)`, `setError(errorMessage)`.
4. Baue `loadNext` neu auf: Guard `if (requestRef.current) return` bleibt am Anfang. Danach
   `const nextKnownId = findAdjacentKnownPageId(current.orderedPageIds, current.domWindowPageIds, 'after')`.
   Ist `nextKnownId` gesetzt: prüfe `pageCache.get(nextKnownId)` -- bei Treffer direkt
   `restoreIntoWindow(nextKnownId, cached, 'after')` und return (State A, keine Anfrage); bei Fehltreffer
   `await refetchAndRestore(nextKnownId, 'after', setForwardLoading, setForwardError, 'Weitere Episoden konnten nicht geladen werden.')` und return (State B). Ist `nextKnownId` `undefined` (das
   Fenster-Ende IST die globale Tail-Page): lies `pagination` aus
   `pageCache.get(domWindowPageIds[length-1])`, bei fehlendem `has_more`/`next_cursor` return (Listenende,
   State C nicht anwendbar), sonst führe den bisherigen "echte neue Page laden"-Codepfad unverändert
   fort (Request mit `cursor: pagination.next_cursor`, neue Id `p${seqRef.current++}`, `pageCache`/
   `pageMeta`/`orderedPageIds` erweitern), ersetze aber die bisherige Inline-Fenster-Logik
   (`domWindowPageIds`-Push-und-Slice) durch `applyWindowSlide(prev.domWindowPageIds, id, 'after', DOM_WINDOW_SIZE)`
   und setze bei vorhandenem `evictedId` den Spacer wie zuvor -- dies ist der einzige verbliebene Ort, an
   dem `next_cursor` der Pagination-Frontier konsultiert wird (State C).
5. Baue `loadPrevious` symmetrisch analog um: Guard bleibt, dann
   `const targetId = findAdjacentKnownPageId(current.orderedPageIds, current.domWindowPageIds, 'before')`;
   ist `targetId` `undefined`, return (keine frühere Page); bei Cache-Hit `restoreIntoWindow(targetId, cached, 'before')`
   und return; bei Cache-Miss `await refetchAndRestore(targetId, 'before', setBackwardLoading, setBackwardError, 'Frühere Episoden konnten nicht geladen werden.')`.
6. `evictCacheIfNeeded`, `buildInitialCoreState`, `resetForFilter`, `reportPageHeight`,
   `bottomSentinelRef`/`topSentinelRef`, die öffentliche Rückgabeform des Hooks und alle Kommentare, die
   NICHT direkt die geänderte Logik betreffen, bleiben unangetastet -- kein Rewrite, keine
   Umbenennung öffentlicher Felder, keine Änderung an `FansubVersionBrowser.tsx` nötig (dessen Nutzung
   von `pages`, `domWindowPageIds`, `spacers`, `bottomSentinelRef`, `topSentinelRef` bleibt formgleich).
7. Nach Abschluss: `wc -l` auf beide Dateien prüfen. Bleibt `useWindowedEpisodePages.ts` bei oder unter
   450 Zeilen (CLAUDE.md-Vorgabe), ist nichts weiter zu tun. Würde die Datei die Grenze überschreiten,
   verschiebe zusätzlich `refetchAndRestore` (und ggf. `restoreIntoWindow`) als parametrisierte,
   nicht-Hook-Funktionen in `windowedPageWindow.ts` (sie benötigen dann `pageCache`/`pageMeta`/
   `lastKnownHeights` als Parameter statt Closure-Zugriff) -- kein Rewrite der übrigen Datei, nur
   zusätzliche Extraktion.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && wc -l src/components/fansubs/windowedPageWindow.ts src/components/fansubs/useWindowedEpisodePages.ts" 2>&1 | tail -40</automated>
  </verify>
  <done>
`windowedPageWindow.ts` existiert mit `applyWindowSlide` und `findAdjacentKnownPageId`, beide ohne
React-Import. `loadNext` konsultiert `next_cursor` ausschließlich, wenn `findAdjacentKnownPageId(...,
'after')` `undefined` liefert. `loadPrevious` nutzt dieselben Helfer mit `'before'`. `tsc --noEmit`
liefert 0 Fehler. Beide geänderten/neuen Dateien bleiben bei bzw. unter 450 Zeilen (oder die
Zusatz-Extraktion aus Schritt 7 wurde durchgeführt).
  </done>
</task>

<task type="auto">
  <name>Task 2: Pflicht-Regressionstests (7 Fälle aus dem Auftrag) ergänzen und gegen den Fix verifizieren</name>
  <files>frontend/src/components/fansubs/useWindowedEpisodePages.test.ts</files>
  <action>
Erweitere `useWindowedEpisodePages.test.ts` (bestehende Mock-Infrastruktur -- `MockIntersectionObserver`,
`ep()`, `page()`, `deferred()`, `groupedMock` -- unverändert weiterverwenden, keine zweite Test-Datei
anlegen) um die folgenden 7 Testfälle aus dem Auftrag. Falls ein Test während der Implementierung fehlschlägt,
ist die Ursache in `useWindowedEpisodePages.ts`/`windowedPageWindow.ts` aus Task 1 zu beheben -- NICHT der
Test an ein fehlerhaftes Verhalten anzupassen, außer der Test widerspricht nachweislich dem oben
spezifizierten Soll-Verhalten.

1. "Forward → Backward → Forward stellt bekannte Pages in korrekter Reihenfolge wieder her, keine
   Sackgasse": lade p0..p6 sequenziell über `retryNext()` (analog zum bestehenden Test
   "re-fetches a page using its originally-stored cursor..."), Fenster landet bei `['p4','p5','p6']`.
   Über `topSentinelRef`/`MockIntersectionObserver.fire` mehrfach hochscrollen bis Fenster
   `['p0','p1','p2']` erreicht (mit `reportPageHeight` nach jedem Restore wie im Bestandstest). Danach
   über `bottomSentinelRef`/`MockIntersectionObserver.fire` viermal herunterscrollen (mit
   `reportPageHeight` nach jedem Restore) -- erwarte nach jedem Schritt das korrekte, um genau eine Page
   verschobene Fenster (`['p1','p2','p3']`, `['p2','p3','p4']`, `['p3','p4','p5']`, `['p4','p5','p6']`)
   und am Ende `getGroupedEpisodes` NICHT häufiger aufgerufen als für die ursprünglichen 6
   Vorwärts-Requests plus etwaige Cache-Miss-Refetches nötig (exakte Zahl anhand von `CACHE_MAX_PAGES=6`
   herleiten und assertieren, nicht raten).
2. "Kein unnötiger neuer API-Request, wenn die nächste Page noch im Cache ist": p0 p1 p2 im DOM-Fenster
   (z.B. nach einmaligem Vorwärtsladen von p3 und einmaligem Zurückscrollen), p3 noch in `pageCache` --
   Bottom-Sentinel feuern, `getGroupedEpisodes`-Aufrufzahl bleibt exakt gleich (0 zusätzliche Requests),
   Fenster wird `['p1','p2','p3']`.
3. "Bekannte Page nicht mehr im Cache -- exakt ein Refetch mit dem korrekten eigenen Cursor": Pages so
   weit vorwärtsladen, dass p3 aus `pageCache` verdrängt wird (analog zum Bestandstest für die
   Rückwärtsrichtung, aber für die Vorwärtsrichtung: Fenster muss so positioniert werden, dass p3 die
   nächste FENSTER-benachbarte bekannte Page ist, aber `pageCache.has('p3')` bereits `false`).
   Bottom-Sentinel feuern -- erwarte genau einen zusätzlichen `getGroupedEpisodes`-Aufruf mit dem
   `cursor`, der ursprünglich p3 erzeugt hat (nicht dem `next_cursor` irgendeiner anderen Page), Fenster
   enthält danach p3 an korrekter Position, keine neue unbekannte Page wurde erzeugt.
4. "Regressionstest: globale Tail-Page mit has_more=false blockiert nicht das Restaurieren einer
   bekannten Zwischen-Page": bekannt p0..p6, p6 antwortet mit `has_more=false`, Fenster ist auf
   `['p0','p1','p2']` zurückgescrollt -- Bottom-Sentinel feuern MUSS p3 restaurieren (Fenster wird
   `['p1','p2','p3']`), nicht abbrechen.
5. "Erst an der echten Frontier wird next_cursor konsultiert": bekannt p0..p3, Fenster
   `['p1','p2','p3']`, p3 hat `has_more=true`/`next_cursor='c4'` -- Bottom-Sentinel feuern löst genau
   einen Request mit `cursor: 'c4'` aus (per `expect(getGroupedEpisodes).toHaveBeenCalledWith(4,
   expect.objectContaining({ cursor: 'c4' }))`), danach Fenster `['p2','p3','p4']` (neue, echte Page p4).
6. "Ende der Liste -- kein Request, kein Loop, kein dauerhafter Ladezustand": Fenster ist selbst die
   globale Tail-Page und deren `pagination.has_more === false` -- Bottom-Sentinel mehrfach feuern löst
   keinen Request aus, `forwardLoading` bleibt `false` nach jedem Aufruf, Fenster unverändert.
7. "Schneller Richtungswechsel während laufender Requests": mit `deferred()` (bestehendes Muster aus
   diesem File) einen State-B-Vorwärts-Refetch anstoßen (Promise noch offen), währenddessen den
   Top-Sentinel feuern (löst laut Single-Flight-Guard `if (requestRef.current) return` keinen zweiten
   Request aus, solange der erste noch offen ist) -- danach den ersten Request auflösen und erwarten,
   dass genau eine Page hinzugefügt wurde, keine doppelte Page-Id in `orderedPageIds` existiert
   (`new Set(orderedPageIds).size === orderedPageIds.length`), und `forwardLoading`/`backwardLoading`
   beide wieder `false` sind.

Führe danach den gezielten Vitest-Lauf für diese Datei sowie für die bestehende
`FansubVersionBrowser.windowing.test.tsx` (unverändert, reiner Regressionsschutz für den bereits
funktionierenden Rückwärts-/Spacer-/Ausklapp-Fluss) im Frontend-Container aus.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/useWindowedEpisodePages.test.ts src/components/fansubs/FansubVersionBrowser.windowing.test.tsx" 2>&1 | tail -60</automated>
  </verify>
  <done>
Alle 7 neuen/erweiterten Testfälle sowie alle bestehenden Tests in beiden Dateien sind grün. Test 1
belegt Forward→Backward→Forward ohne Sackgasse. Test 4 belegt die konkrete Regression aus dem Auftrag
(globale Tail-Page mit has_more=false). Test 7 belegt Robustheit bei schnellem Richtungswechsel ohne
doppelte Pages oder hängenden Ladezustand.
  </done>
</task>

<task type="auto">
  <name>Task 3: Vollständige Verifikation, Container-Neustart, SUMMARY.md, gezielter Commit</name>
  <files>frontend/src/components/fansubs/windowedPageWindow.ts, frontend/src/components/fansubs/useWindowedEpisodePages.ts, frontend/src/components/fansubs/useWindowedEpisodePages.test.ts</files>
  <action>
1. `git status --short` und `git diff --stat` prüfen -- ausschließlich die drei Dateien aus
   `files_modified` dürfen geändert sein (kein `git stash`, laufende Arbeit anderer Agenten respektieren;
   bei unerwarteten Fremdänderungen im Working Tree abbrechen und den Nutzer informieren statt sie zu
   überschreiben).
2. Vollständige relevante Frontend-Testsuite im Container ausführen (nicht nur die beiden Zieldateien --
   auch angrenzende Episode-/Anime-Tests laut Auftrag):
   `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run --run" 2>&1 | tail -80`
   Ergebnis mit dem in `.planning/STATE.md` dokumentierten Vor-Zustand vergleichen (bekannte, bereits
   vorbestehende Fehlschläge z.B. in `cssCustomProperties.guard.test.ts` sind kein neuer Befund) -- 0
   NEUE Fehlschläge außerhalb der in diesem Plan geänderten Dateien sind das Ziel.
3. Projektweiten Typecheck: `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit"`
   -- 0 Fehler.
4. ESLint gezielt für die geänderten Produktionsdateien:
   `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint src/components/fansubs/windowedPageWindow.ts src/components/fansubs/useWindowedEpisodePages.ts"`
   -- 0 neue Findings.
5. Frontend-Container neu starten, damit der laufende Next.js-Dev-Prozess den neuen Code sicher lädt:
   `docker restart team4sv30-frontend`, danach in einer kurzen Retry-Schleife (max. ~10 Versuche, 2s
   Abstand, kein langes Vorab-Sleep) auf Erreichbarkeit prüfen:
   `curl -sf http://127.0.0.1:3000/anime/4 -o /dev/null -w "%{http_code}\n"` -- erwartet `200`.
6. Explizit bestätigen, dass KEINE Dev-Harness-Route wieder angelegt wurde: `find frontend/src/app/dev -maxdepth 1 2>/dev/null` darf `episode-windowing-preview` nicht enthalten (Phase 164 hat diese Route
   final gelöscht). Falls für lokale Diagnose während der Ausführung dieses Plans temporär eine
   Test-Harness angelegt wurde, MUSS sie vor Abschluss wieder entfernt und das im SUMMARY.md vermerkt
   werden.
7. Da der Auftraggeber-Ansprucht auf realen Browser-Beweis mit vielen Pages an der Naruto-Live-DB
   (nur 5 Episoden mit Releases) nicht einlösbar ist, ist der Nachweis-Träger für diesen Plan
   ausschließlich die grüne Vitest-Suite aus Task 2 -- dies im SUMMARY.md explizit als bewusste,
   auftragskonforme Einschränkung dokumentieren (nicht verschweigen).
8. SUMMARY.md nach `@$HOME/.claude/get-shit-done/templates/summary.md` schreiben, mit den im Auftrag
   verlangten Abschnitten: Ursache (warum konnte `loadNext()` anhand der globalen letzten Page statt der
   Fenster-benachbarten Page fälschlich abbrechen?), Änderung (welche Helfer/Funktionen wurden
   eingeführt/umgebaut?), Tests (welche 7 neuen Regressionstests, Testnamen), Nachweis
   (Forward→Backward→Forward grün, kein unnötiger Request grün, kein N+1/keine Backend-Auswirkung --
   reine Frontend-Logik, DOM-Fenster bleibt begrenzt, kein Scroll-Lock am Listenende).
9. Nur die drei geänderten/neuen Dateien gezielt committen (kein `git add -A`/`.`):
   `git add frontend/src/components/fansubs/windowedPageWindow.ts frontend/src/components/fansubs/useWindowedEpisodePages.ts frontend/src/components/fansubs/useWindowedEpisodePages.test.ts`
   dann `git commit` mit einer Commit-Message, die auf den Vorwärts-Restore-Fix verweist. Kein
   `git push`.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/useWindowedEpisodePages.test.ts src/components/fansubs/FansubVersionBrowser.windowing.test.tsx && npx tsc --noEmit" 2>&1 | tail -60</automated>
  </verify>
  <done>
Vollständige relevante Frontend-Suite zeigt 0 neue Fehlschläge gegenüber dem dokumentierten
Vor-Zustand, `tsc --noEmit` 0 Fehler, ESLint 0 neue Findings in den zwei geänderten Produktionsdateien.
Container neu gestartet, `/anime/4` liefert 200. Keine Dev-Harness-Route existiert. SUMMARY.md
dokumentiert Ursache/Änderung/Tests/Nachweis vollständig. Nur die drei Zieldateien sind committet, kein
Push.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser-Client (dieser Hook) → öffentlicher Backend-Read-Endpunkt `GET /api/v1/anime/{id}/episodes` (grouped, projection=public) | Reine Client-seitige State-/Caching-Logik über bereits vom Backend autorisierte, öffentliche Leseantworten. Kein neuer Endpunkt, kein neuer Eingabepfad, kein Backend-Code wird in diesem Plan verändert. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-260920-sad-01 | Denial of Service (Client) | `loadNext`/`refetchAndRestore` in `useWindowedEpisodePages.ts` | mitigate | Bestehender Single-Flight-Guard (`if (requestRef.current) return`) bleibt für beide Richtungen und alle drei Page-Zustände (A/B/C) erhalten -- verhindert doppelte/parallele Requests bei mehrfachem Sentinel-Feuern, verifiziert durch Test 7 (schneller Richtungswechsel). |
| T-260920-sad-02 | Tampering (Race Condition) | `AbortController`-Handhabung in `refetchAndRestore` und State-C-Fetch | mitigate | Derselbe Stale-Response-Guard (`controller.signal.aborted \|\| requestRef.current !== controller`) wie im Bestandscode wird für die neue Vorwärts-State-B-Anfrage identisch übernommen -- eine veraltete Antwort kann den State nie mehr überschreiben, verifiziert durch Test 7. |
| T-260920-sad-03 | Information Disclosure | n/a | accept | Keine neuen Daten, kein neuer Endpunkt, keine geänderte Autorisierung -- reine Umsortierung bereits abgerufener, bereits öffentlicher Episodendaten im Client-State. |
</threat_model>

<verification>
1. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/useWindowedEpisodePages.test.ts src/components/fansubs/FansubVersionBrowser.windowing.test.tsx"` -- alle Tests grün, inklusive der 7 neuen Pflicht-Regressionstests.
2. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run --run"` -- 0 neue Fehlschläge gegenüber dem in `.planning/STATE.md` dokumentierten Vor-Zustand.
3. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit"` -- 0 Fehler.
4. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint src/components/fansubs/windowedPageWindow.ts src/components/fansubs/useWindowedEpisodePages.ts"` -- 0 neue Findings.
5. `wc -l frontend/src/components/fansubs/windowedPageWindow.ts frontend/src/components/fansubs/useWindowedEpisodePages.ts` -- beide ≤ 450 Zeilen (CLAUDE.md).
6. `docker restart team4sv30-frontend` gefolgt von `curl -sf http://127.0.0.1:3000/anime/4 -o /dev/null -w "%{http_code}\n"` -- `200`.
7. `find frontend/src/app/dev -maxdepth 1 -iname "episode-windowing-preview*"` -- keine Treffer (keine wieder angelegte Dev-Harness).
8. `git status --short` -- nur die drei Zieldateien geändert, sauber committet, kein Push.
</verification>

<success_criteria>
- Forward → Backward → Forward funktioniert ohne Scroll-Sackgasse: bekannte Pages werden vor jedem neuen
  API-Request vollständig restauriert (State A: Cache-Hit ohne Request, State B: Cache-Miss mit exakt
  einem Request über den eigenen gespeicherten Cursor).
- `next_cursor` der Pagination-Frontier wird ausschließlich konsultiert, wenn hinter dem aktuellen
  DOM-Fenster wirklich keine bekannte Page mehr existiert (State C) -- eine has_more=false-Tail-Page
  blockiert nie das Restaurieren bekannter Zwischenpages.
- DOM-Fenster bleibt bei jedem Restore auf `DOM_WINDOW_SIZE` begrenzt, kein Verlust bekannter Pages,
  keine doppelten Requests, kein dauerhaft aktiver Ladezustand.
- Keine Backend-Auswirkung, kein N+1 -- reine Frontend-Logikänderung in genau drei Dateien.
- `useWindowedEpisodePages.ts` bleibt bei bzw. unter 450 Zeilen (CLAUDE.md-Konformität), Restore-Logik ist
  über `windowedPageWindow.ts` richtungsneutral und ohne Duplikation geteilt.
- Vollständige relevante Frontend-Suite grün (0 neue Fehlschläge), `tsc`/`eslint` sauber, Container läuft
  neu gestartet, keine Dev-Harness-Route wieder angelegt.
- SUMMARY.md dokumentiert Ursache, Änderung, Tests und Nachweis wie im Auftrag verlangt.
</success_criteria>

<output>
Create `.planning/quick/260920-sad-bidirektionales-infinite-scroll-windowin/260920-sad-SUMMARY.md` when done
</output>
