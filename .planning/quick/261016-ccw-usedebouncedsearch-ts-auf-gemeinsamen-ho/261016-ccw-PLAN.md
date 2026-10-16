---
phase: quick-261016-ccw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/suche/useDebouncedSearch.ts
  - frontend/src/app/suche/useDebouncedSearch.test.tsx
autonomous: true
requirements: [261016-ccw-debounce-migration]

must_haves:
  truths:
    - "Tippen/Wertänderungen im Suchfeld lösen weiterhin genau einen Request nach 250ms Stille aus — das 250ms-Debounce-Verhalten ist unverändert, exakt an der 249ms/250ms-Grenze bewiesen."
    - "Die allererste Ausführung nach dem Mount darf jetzt sofort statt nach 250ms erfolgen (per Nutzerentscheidung ausdrücklich akzeptiert) — dieser Unterschied ist im Test dokumentiert, nicht versehentlich verdeckt."
    - "useDebouncedSearch.ts enthält keinen eigenen setTimeout/clearTimeout-Debounce-Code mehr, sondern ruft ausschließlich den gemeinsamen Hook useDebouncedValue auf."
    - "Ein projektweiter Grep-Sweep nach verbleibenden eigenständigen Debounce-Implementierungen außerhalb des Hooks ist durchgeführt und sein vollständiges Ergebnis (inkl. jeder verbleibenden Fundstelle) ist im Abschlussbericht benannt — keine stille Behauptung voller Erledigung, falls Reste existieren."
    - "vitest, tsc und eslint laufen grün im Frontend-Docker-Container (nicht auf dem Host); danach ist team4sv30-frontend neu gestartet und wieder Up."
  artifacts:
    - path: frontend/src/app/suche/useDebouncedSearch.ts
      provides: "Debounce via gemeinsamem useDebouncedValue(state, SEARCH_DEBOUNCE_MS) statt eigener setTimeout/clearTimeout-Logik; öffentliche API (SearchState-Felder, Setter, reset) unverändert für alle Konsumenten"
    - path: frontend/src/app/suche/useDebouncedSearch.test.tsx
      provides: "Fake-Timer-Test (vi.useFakeTimers), der das 250ms-Debounce-Verhalten exakt an der Zeitgrenze beweist und die akzeptierte Mount-Timing-Abweichung dokumentiert"
  key_links:
    - from: frontend/src/app/suche/useDebouncedSearch.ts
      to: frontend/src/hooks/useDebouncedValue.ts
      via: "import { useDebouncedValue } from '@/hooks/useDebouncedValue'; useDebouncedValue(state, SEARCH_DEBOUNCE_MS)"
      pattern: "useDebouncedValue\\(state"
---

<objective>
Die vierte, bislang bewusst ausgeklammerte Debounce-Kopie (`useDebouncedSearch.ts`, 250ms) auf
den gemeinsamen Hook `useDebouncedValue` (Phase 184 Review-Fix, Befund 3) umstellen und damit
den Kreis der 184-Review-Fix-Konsolidierung schließen.

Purpose: Letzte verbleibende eigenständige Debounce-Implementierung im Suchfeld-Pfad entfernen,
ohne das beobachtbare Debounce-Verhalten (250ms) zu verändern — mit Ausnahme der vom Nutzer
ausdrücklich akzeptierten Mount-Timing-Abweichung.
Output: Migrierte Implementierung, angepasster/erweiterter Fake-Timer-Test, dokumentierter
Grep-Beweis für die Abwesenheit weiterer eigener Debounce-Logik außerhalb des Hooks (inkl.
ehrlicher Benennung etwaiger Restfunde), grüne QS im Frontend-Container, neu gestarteter
Frontend-Container.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
<read_first>
@.planning/STATE.md
@CLAUDE.md
@.planning/phases/184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-/184-REVIEW-FIX.md
@frontend/src/hooks/useDebouncedValue.ts
@frontend/src/hooks/useDebouncedValue.test.ts
@frontend/src/app/suche/useDebouncedSearch.ts
@frontend/src/app/suche/useDebouncedSearch.test.tsx
@frontend/src/app/admin/fansubs/useAdminFansubsList.ts
</read_first>

**Vorbestehender Kontext (184-REVIEW-FIX.md, Befund 3):** `useAdminFansubsList.ts`,
`useUserListFilters.ts` und `useDiscoveryLibraryFilters.ts` wurden bereits auf
`useDebouncedValue` umgestellt. `useDebouncedSearch.ts` (250ms, „4. Kopie") blieb dort bewusst
unangetastet, weil das Original auch die ALLERERSTE Ausführung nach Mount (URL-Schreiben +
Fetch) um 250ms verzögert — ein naiver Ersatz hätte diese sofort bei Mount feuern lassen. Genau
dieser Unterschied ist jetzt per Nutzerentscheidung ausdrücklich als akzeptabel freigegeben;
alles andere (250ms-Debounce bei Tastatur-/Wertänderungen) MUSS exakt erhalten bleiben.

**Referenzmuster für die Umstellung** (aus `useAdminFansubsList.ts`, Zeile 14+57): dort wird
`const debouncedQueryInput = useDebouncedValue(queryInput, SEARCH_DEBOUNCE_MS)` direkt aus dem
rohen State abgeleitet und ein nachgeschalteter `useMemo`/`useEffect` reagiert auf den
debounceten Wert statt auf einen eigenen `setTimeout`. `useDebouncedSearch.ts` debounced aktuell
nicht nur einen Wert, sondern einen kompletten Seiteneffekt (Router-Schreiben + zwei Fetches) —
die Umstellung muss denselben `state`-Dependency-Umbau vornehmen, aber auf die bestehende
`useEffect`-Struktur in `useDebouncedSearch.ts` angewendet werden (siehe `<interfaces>` unten
für die exakten Stellen).

**Datei-Längen-Check (Projektregel „Übergroße Dateien beim Anfassen aufteilen", CLAUDE.md):**
`useDebouncedSearch.ts` hat aktuell 297 Zeilen, `useDebouncedSearch.test.tsx` 218 Zeilen — beide
bleiben nach dieser kleinen Umstellung (Import + ein Hook-Aufruf, keine Zeilen-Mehrung von
Bedeutung) deutlich unter der 450-Zeilen-Grenze. **Kein Split-Commit nötig** — das ist hier
geprüft und ausgeschlossen, nicht übersehen.

**Entdeckter, bewusst NICHT in diesem Plan behandelter Fund:** Eine Grep-Voranalyse hat eine
FÜNFTE, bislang namenlose eigenständige Debounce-Implementierung gefunden, die weder in der
Aufgabenbeschreibung noch im 184-Review-Fix als „4. Kopie" mitgezählt war:
`frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx` (Zeilen ~142-145, eigener
`setTimeout`/`clearTimeout` für `debouncedSearchTerm`). Diese Datei ist NICHT Teil des
beschriebenen Auftragsumfangs (der sich explizit auf `useDebouncedSearch.ts` bezieht) und wird
in diesem Plan NICHT verändert. Task 2 muss diesen Fund im Grep-Ergebnis ausdrücklich benennen,
statt ihn zu verschweigen oder fälschlich als „vollständig erledigt" zu berichten — die
Nutzeraussage „KEINE eigene Debounce-Implementierung mehr ... oder sonstwo" kann nach diesem
Plan für `useDebouncedSearch.ts` und die drei bereits migrierten Dateien bewiesen werden, aber
NICHT global für den gesamten Frontend-Baum, solange `releases/page.tsx` unberührt bleibt.

**Commit-Regeln für beide Tasks:** Nur die explizit genannten Dateien je Commit stagen (`git add
<exact-path> <exact-path>`, niemals `git add -A`/`git add .`). Niemals `git stash` verwenden.
Niemals `git push`. Keine `Co-Authored-By`-Zeile in der Commit-Message (Repo-Konvention: reine
Fließtext-Commits ohne Trailer, siehe `git log`). Niemals Secrets/`.env` committen.

<interfaces>
Aus `frontend/src/hooks/useDebouncedValue.ts` (unverändert, nur Konsument):

`export function useDebouncedValue<T>(value: T, delayMs: number): T`

Gibt den Anfangswert sofort/unverzögert zurück; jede nachfolgende Wertänderung wird erst nach
`delayMs` ohne weitere Änderung übernommen (Timer wird bei jeder Zwischenänderung neu gestartet).

Aus `frontend/src/app/suche/useDebouncedSearch.ts` (zu ändernde Stellen, Zeilennummern Stand
dieser Planung):
- Zeile 164: `const [state, setState] = useState<SearchState>(...)`
- Zeilen 171-177: render-phase URL-Sync-Block, der `state` ggf. per `setState` aktualisiert
  (React „adjust state while rendering"-Muster) — die neue `useDebouncedValue(state, ...)`-Zeile
  muss NACH diesem Block stehen, damit sie immer den für diesen Render final aufgelösten
  `state`-Wert debounced.
- Zeilen 204-274: `useEffect(() =&gt; { const timer = setTimeout(() =&gt; { ... },
  SEARCH_DEBOUNCE_MS); return () =&gt; clearTimeout(timer) }, [state, pathname, router,
  fetchResults, fetchSuggestions])` — dieser Block wird umgebaut: die
  `setTimeout`/`clearTimeout`-Hülle entfällt komplett, der Effekt-Body (Router-Replace +
  Haupt-/Vorschlagssuche) läuft direkt im Effekt, die Dependency-Liste wird auf
  `[debouncedState, pathname, router, fetchResults, fetchSuggestions]` umgestellt, und jede
  `state`-Referenz INNERHALB dieses Effekt-Bodies (`buildStateQuery(state)`, `state.q.trim()`,
  `state.filters`, `stateToSearchParams(state)`) wird durch `debouncedState` ersetzt.
- `SEARCH_DEBOUNCE_MS` (Zeile 16, Export, Wert `250`) bleibt die einzige Quelle der Verzögerung
  und wird als zweites Argument an `useDebouncedValue` übergeben — keine zweite Konstante.

Öffentliche API (`UseDebouncedSearchResult`, `setQuery`/`setType`/`setFilters`/`setPage`/`reset`,
Rückgabefelder) bleibt exakt unverändert — keine Anpassung in `SearchField.tsx`,
`SearchResults.tsx`, `SearchFilters.tsx` oder `SearchFilterDrawer.tsx` nötig, da sich nur die
interne Debounce-Mechanik ändert, nicht die Signatur.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: useDebouncedSearch.ts auf useDebouncedValue umstellen</name>
  <files>frontend/src/app/suche/useDebouncedSearch.ts, frontend/src/app/suche/useDebouncedSearch.test.tsx</files>
  <behavior>
    - Schnelle, aufeinanderfolgende `setQuery`-Aufrufe innerhalb eines Event-Loop-Ticks lösen
      weiterhin genau einen `getSearch`/`getSearchSuggestions`-Aufruf 250ms nach der letzten
      Änderung aus. Pin das exakt an der Zeitgrenze: bei 249ms seit der letzten Änderung null
      Aufrufe, bei 250ms genau ein Aufruf (schärfer als der bisherige Test, der nur „vor jeder
      Zeitvorspulung" prüft).
    - Die allererste Ausführung nach dem Mount (Router-Replace + Fetch-Prüfung) darf jetzt ohne
      die vormals impliziten ~250ms Verzögerung laufen — ein neuer, explizit benannter Test
      dokumentiert diesen akzeptierten Unterschied, statt ihn stillschweigend ungetestet zu
      lassen oder fälschlich die alte Verzögerung weiter zu behaupten.
    - Alle übrigen bestehenden Assertions (Abbruch des vorherigen Requests via AbortController,
      URL-Spiegelung, Zustandswiederherstellung aus der URL beim Reload, Mindestlängen-Guard,
      die fünf Filter-ohne-q-Szenarien in „Filterbasierte Suche ohne Titel") bleiben inhaltlich
      unverändert grün.
  </behavior>
  <action>
    Importiere `useDebouncedValue` aus `@/hooks/useDebouncedValue` in `useDebouncedSearch.ts`.
    Füge direkt nach dem render-phase URL-Sync-Block (nach der Zeile, die `state` ggf. per
    `setState` auf `urlState` abgleicht) eine neue Zeile ein: `const debouncedState =
    useDebouncedValue(state, SEARCH_DEBOUNCE_MS)`. Baue den bestehenden `useEffect`, der aktuell
    seinen gesamten Body in ein `setTimeout(..., SEARCH_DEBOUNCE_MS)` mit passendem
    `clearTimeout`-Cleanup verpackt, so um, dass die `setTimeout`/`clearTimeout`-Hülle komplett
    entfällt und der bisherige Callback-Körper (Router-Replace, Mindestlängen-Guard,
    Haupt-Suche, Vorschlags-Suche) direkt und synchron im Effekt läuft. Ersetze dabei jede
    Referenz auf die rohe `state`-Variable innerhalb dieses Effekt-Bodies
    (`buildStateQuery(state)`, `state.q.trim()`, `Object.values(state.filters)`,
    `stateToSearchParams(state)`) durch `debouncedState`, und ändere die
    Effekt-Dependency-Liste von `[state, pathname, router, fetchResults, fetchSuggestions]` auf
    `[debouncedState, pathname, router, fetchResults, fetchSuggestions]`. Lasse den zweiten,
    unabhängigen Cleanup-`useEffect` (Abort beim Unmount) unverändert. Rühre keine der vier
    Konsumentendateien (`SearchField.tsx`, `SearchResults.tsx`, `SearchFilters.tsx`,
    `SearchFilterDrawer.tsx`) an — die öffentliche Hook-Signatur ändert sich nicht.

    Passe anschließend `useDebouncedSearch.test.tsx` an: ergänze im ersten Test
    („fasst schnelle Tastendrücke zu genau einem Request nach 250ms zusammen") eine
    Zwischen-Assertion mit `vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1)` (erwartet:
    weiterhin kein Aufruf), bevor die bestehende `advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)`-
    Assertion den tatsächlichen Aufruf prüft. Füge einen neuen, eigenständigen Test hinzu (z. B.
    „verzögert die allererste Ausführung nach dem Mount nicht mehr künstlich um 250ms —
    akzeptierte Verhaltensänderung"), der mit einer bereits in der URL vorhandenen, gültigen
    Suchanfrage (`searchParamsRef.current = new URLSearchParams('q=naruto')`) mountet und ohne
    jegliches `vi.advanceTimersByTimeAsync` sofort (nach einem `act`-Flush) prüft, dass
    `getSearchMock` bereits aufgerufen wurde — das beweist und dokumentiert exakt die vom Nutzer
    freigegebene Abweichung, statt sie unbemerkt im Verhalten schlummern zu lassen.
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run src/app/suche/useDebouncedSearch.test.tsx</automated>
  </verify>
  <done>
    `useDebouncedSearch.ts` enthält keinen eigenen `setTimeout`/`clearTimeout`-Aufruf mehr
    (einziger Debounce-Mechanismus ist der Aufruf von `useDebouncedValue`); die öffentliche API
    ist unverändert; der erweiterte Test beweist sowohl das unverändert exakte 250ms-Verhalten
    bei Wertänderungen als auch die bewusst akzeptierte, sofortige erste Ausführung nach Mount;
    `docker compose exec -T team4sv30-frontend npm test -- --run src/app/suche/useDebouncedSearch.test.tsx`
    läuft grün. Danach `git add frontend/src/app/suche/useDebouncedSearch.ts
    frontend/src/app/suche/useDebouncedSearch.test.tsx` (exakt diese zwei Pfade, kein `git add
    -A`) und committen mit
    `refactor(261016-ccw): useDebouncedSearch nutzt gemeinsamen useDebouncedValue-Hook statt
    eigener setTimeout-Debounce-Logik` (keine `Co-Authored-By`-Zeile).
  </done>
</task>

<task type="auto">
  <name>Task 2: Grep-Beweis, volle QS im Container, Frontend-Neustart</name>
  <files>none (Verifikation, keine Produktionsdateien geändert)</files>
  <action>
    Führe den zweistufigen Grep-Sweep über `frontend/src` aus, um jede verbleibende
    eigenständige Debounce-Implementierung außerhalb von
    `frontend/src/hooks/useDebouncedValue.ts` zu finden: Schritt A listet alle
    Nicht-Test-Dateien mit dem Wort „debounce" (case-insensitiv) via
    `grep -rliE "debounce" frontend/src --include="*.ts" --include="*.tsx" | grep -v
    "\.test\."`. Schritt B prüft für jede so gefundene Datei, ob sie tatsächlich
    `setTimeout`/`clearTimeout` enthält (`grep -n "setTimeout\|clearTimeout" &lt;datei&gt;`), um
    reine Kommentar-Erwähnungen (z. B. in `useCancellableSlugState.ts`) von echten
    Debounce-Implementierungen zu trennen. Erwartetes Ergebnis nach Task 1: NUR
    `frontend/src/hooks/useDebouncedValue.ts` selbst (erwartet/erlaubt — das ist der gemeinsame
    Hook) und `frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx` (bereits vor
    diesem Plan vorhanden, nicht Teil des Auftragsumfangs, siehe `<context>`) tauchen in Schritt
    B auf; `useDebouncedSearch.ts` darf in Schritt B NICHT mehr auftauchen. Dokumentiere den
    exakten Befehl und das vollständige Ergebnis (inkl. der `releases/page.tsx`-Fundstelle als
    benannte, bewusst offene Ausnahme — keine Behauptung vollständiger Erledigung für den
    gesamten Frontend-Baum) im Abschlussbericht.

    Führe danach die komplette QS-Trias im Frontend-Container aus (nicht auf dem Host):
    `docker compose exec -T team4sv30-frontend npm test` (vollständige Vitest-Suite, nicht nur
    die eine Testdatei, als Regressionsnachweis für die vier Konsumenten),
    `docker compose exec -T team4sv30-frontend npm run typecheck`,
    `docker compose exec -T team4sv30-frontend npm run lint`. Erst wenn alle drei grün sind,
    `docker restart team4sv30-frontend` ausführen und mit `docker compose ps team4sv30-frontend`
    bestätigen, dass der Container wieder `Up` ist.

    Schreibe anschließend `.planning/quick/261016-ccw-usedebouncedsearch-ts-auf-gemeinsamen-ho/261016-ccw-SUMMARY.md`
    mit dem exakten Grep-Befehl + vollständigem Ergebnis (inkl. der benannten `releases/page.tsx`-
    Ausnahme), den drei QS-Ergebnissen und dem Commit-Hash aus Task 1. Committe NUR diese eine
    Datei (`git add .planning/quick/261016-ccw-usedebouncedsearch-ts-auf-gemeinsamen-ho/261016-ccw-SUMMARY.md`,
    kein `git add -A`) mit
    `docs(261016-ccw): Abschlussbericht useDebouncedSearch-Migration` (keine `Co-Authored-By`-
    Zeile, kein `git push`, kein `git stash`).
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test &amp;&amp; docker compose exec -T team4sv30-frontend npm run typecheck &amp;&amp; docker compose exec -T team4sv30-frontend npm run lint &amp;&amp; docker restart team4sv30-frontend &amp;&amp; docker compose ps team4sv30-frontend</automated>
  </verify>
  <done>
    Grep-Sweep ausgeführt und sein vollständiges Ergebnis (inkl. der `releases/page.tsx`-
    Ausnahme) dokumentiert; `useDebouncedSearch.ts` taucht in Schritt B nicht mehr auf; vitest,
    tsc und eslint sind im Frontend-Container grün; `team4sv30-frontend` ist neu gestartet und
    laut `docker compose ps` wieder `Up`; `261016-ccw-SUMMARY.md` ist geschrieben und als einzige
    Datei committet.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser-Tastatureingabe → `useDebouncedSearch`-State → `getSearch`/`getSearchSuggestions` | Unveränderte Vertrauensgrenze; dieser Plan ändert nur den internen Timing-Mechanismus, keine Eingabevalidierung oder Datenflüsse. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-261016-01 | D | `useDebouncedSearch` Request-Timing | accept | Kein neuer Trust-Boundary-Übergang; reine interne Refactoring-Maßnahme (eigener setTimeout → gemeinsamer Hook), bestehende Abort-/Mindestlängen-Guards bleiben unverändert in Kraft. |
| T-261016-02 | I | Dokumentations-Integrität des Abschlussberichts | mitigate | Task 2 verlangt explizit die ehrliche Benennung der `releases/page.tsx`-Restfundstelle statt einer stillen Vollständigkeitsbehauptung — verhindert eine irreführende Erfolgsmeldung. |
| T-261016-SC | Tampering | npm-Installationen | accept | Dieser Plan installiert keine neuen Pakete; kein Package-Legitimacy-Gate erforderlich. |
</threat_model>

<verification>
- `docker compose exec -T team4sv30-frontend npm test -- --run src/app/suche/useDebouncedSearch.test.tsx` grün nach Task 1.
- Zweistufiger Grep-Sweep (Schritt A + B) dokumentiert mit vollständigem Ergebnis inkl. der benannten `releases/page.tsx`-Ausnahme.
- `docker compose exec -T team4sv30-frontend npm test`, `npm run typecheck`, `npm run lint` alle grün.
- `docker restart team4sv30-frontend` ausgeführt, `docker compose ps team4sv30-frontend` zeigt `Up`.
- Beide Commits (Code + SUMMARY.md) jeweils mit exaktem Datei-Scope, ohne `git add -A`, ohne `Co-Authored-By`, ohne Push.
</verification>

<success_criteria>
- `useDebouncedSearch.ts` nutzt ausschließlich `useDebouncedValue` für sein Debounce-Verhalten; kein eigener `setTimeout`/`clearTimeout` mehr in dieser Datei.
- Das 250ms-Debounce-Verhalten bei Tastatur-/Wertänderungen ist exakt an der Zeitgrenze per Fake-Timer-Test bewiesen; die akzeptierte Mount-Timing-Abweichung ist bewusst dokumentiert, nicht versehentlich verdeckt.
- Grep-Beweis für die Abwesenheit weiterer eigenständiger Debounce-Implementierungen ist erbracht und sein vollständiges Ergebnis (inkl. der `releases/page.tsx`-Ausnahme) ist ehrlich im Abschlussbericht benannt.
- vitest, tsc, eslint laufen grün im Frontend-Docker-Container; `team4sv30-frontend` ist danach neu gestartet.
- Keine Konsumentendatei (`SearchField.tsx`, `SearchResults.tsx`, `SearchFilters.tsx`, `SearchFilterDrawer.tsx`) musste geändert werden.
</success_criteria>

<output>
Create `.planning/quick/261016-ccw-usedebouncedsearch-ts-auf-gemeinsamen-ho/261016-ccw-SUMMARY.md` when done
</output>
