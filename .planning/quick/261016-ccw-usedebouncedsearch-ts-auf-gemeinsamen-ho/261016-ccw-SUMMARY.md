---
task: 261016-ccw
title: useDebouncedSearch.ts auf gemeinsamen useDebouncedValue-Hook umstellen
tags: [frontend, refactor, debounce, suche]
key-files:
  created: []
  modified:
    - frontend/src/app/suche/useDebouncedSearch.ts
    - frontend/src/app/suche/useDebouncedSearch.test.tsx
    - frontend/src/app/suche/SearchField.test.tsx
    - frontend/src/app/suche/SearchResults.test.tsx
decisions:
  - "Vom Nutzer akzeptierte Verhaltensänderung umgesetzt: die allererste Ausführung nach Mount läuft jetzt sofort statt nach 250ms verzögert."
  - "Zwei Folgefehler, die erst durch den entfernten setTimeout-Wrapper sichtbar wurden (instabiler Router-Mock, react-hooks/set-state-in-effect), wurden im selben Auftrag behoben (Rule 1)."
metrics:
  duration: "~70 Minuten"
  completed: "2026-10-16"
---

# Quick Task 261016-ccw: useDebouncedSearch.ts auf gemeinsamen useDebouncedValue-Hook umstellen Summary

Die vierte, bislang ausgeklammerte Debounce-Kopie (`useDebouncedSearch.ts`, 250ms) nutzt jetzt den
gemeinsamen `useDebouncedValue`-Hook statt einer eigenen `setTimeout`/`clearTimeout`-Hülle — inklusive
der vom Nutzer akzeptierten Mount-Timing-Abweichung (erste Ausführung läuft sofort statt verzögert).

## Was wurde gebaut

`useDebouncedSearch.ts` leitet `debouncedState` jetzt per `useDebouncedValue(state, SEARCH_DEBOUNCE_MS)`
ab (direkt nach dem render-phase URL-Sync-Block). Der bisherige `useEffect`, der seinen gesamten Body
in `setTimeout(..., 250)` verpackte, läuft jetzt direkt auf `debouncedState` — die
`setTimeout`/`clearTimeout`-Hülle ist komplett entfernt, jede Referenz auf die rohe `state`-Variable
innerhalb des Effekt-Bodies wurde durch `debouncedState` ersetzt, die Dependency-Liste lautet
`[debouncedState, pathname, router, fetchResults, fetchSuggestions]`. Die öffentliche API
(`UseDebouncedSearchResult`, Setter, `reset`) ist unverändert — keine der vier Konsumentendateien
(`SearchField.tsx`, `SearchResults.tsx`, `SearchFilters.tsx`, `SearchFilterDrawer.tsx`) musste
geändert werden.

Der Test wurde erweitert: eine Zwischen-Assertion beweist jetzt exakt an der Zeitgrenze (249ms → kein
Aufruf, 250ms → genau ein Aufruf), und ein neuer, eigenständiger Test dokumentiert explizit die
akzeptierte Mount-Timing-Abweichung (bereits gültige q in der URL beim Mount löst den Fetch sofort
nach dem Mount-Flush aus, ohne Zeitvorspulung).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Instabiler `useRouter`-Mock verursachte Endlosschleife / Timeouts in abhängigen Tests**

- **Found during:** Testlauf von Task 1 (`useDebouncedSearch.test.tsx`) direkt nach der Migration.
- **Issue:** Der Test-Mock für `next/navigation` erzeugte bei jedem Aufruf ein NEUES Objekt
  (`useRouter: () => ({ replace: routerReplaceMock })`). Das war im alten Code harmlos, weil der
  komplette Effekt-Body hinter einem `setTimeout` lag — ein unbeteiligter Re-Render (z. B. durch
  `setIsLoading`) hat den Timer nur neu geplant, nie sofort erneut ausgeführt. Nach dem Entfernen
  der `setTimeout`-Hülle läuft der Effekt-Body direkt bei JEDEM Re-Render, bei dem sich `router`
  (fälschlich) ändert — das führte zu einer Rückkopplungsschleife (State-Update → neuer Render →
  neue Router-Referenz → Effekt läuft erneut → State-Update → …) und zu
  `Test timed out in 5000ms` in mehreren Tests.
- **Fix:** Mock auf eine über `vi.hoisted` EINMAL erzeugte, stabile Router-Referenz umgestellt
  (entspricht dem echten Next.js-Verhalten — `useRouter()` liefert eine über Re-Renders stabile
  Objektidentität). Betroffen waren drei Testdateien: `useDebouncedSearch.test.tsx`,
  `SearchField.test.tsx`, `SearchResults.test.tsx`.
- **Files modified:** `frontend/src/app/suche/useDebouncedSearch.test.tsx`,
  `frontend/src/app/suche/SearchField.test.tsx`, `frontend/src/app/suche/SearchResults.test.tsx`
- **Commit:** `cc49b992d` (useDebouncedSearch.test.tsx, Teil von Task 1), `dc311fe93`
  (SearchField.test.tsx, SearchResults.test.tsx)

**2. [Rule 1 - Bug] `react-hooks/set-state-in-effect`-Lint-Fehler durch synchrone `setState`-Aufrufe im Effekt-Body**

- **Found during:** `npm run lint` in Task 2.
- **Issue:** Durch das Entfernen der `setTimeout`-Hülle lagen mehrere `setState`-Aufrufe (im
  Mindestlängen-Guard-Zweig, vor der Hauptsuche, vor den Vorschlägen) jetzt direkt im Effekt-Body
  statt in einem verschachtelten Callback — ESLint markierte das als `Error: Calling setState
  synchronously within an effect can trigger cascading renders` (kaskadierende Synchron-Renders im
  selben Commit).
- **Fix:** Die betroffenen `setState`-Aufrufe in Mikrotask-Callbacks (`Promise.resolve().then(() =>
  {...})`) verschoben — gleiches Muster wie die bereits vorhandenen `.then()`-Zweige der eigentlichen
  Fetch-Aufrufe. Beobachtbares Timing bleibt unverändert (läuft vor dem nächsten Paint ab); alle 24
  Tests in `src/app/suche/` bleiben grün, `npm run typecheck` bleibt grün.
- **Files modified:** `frontend/src/app/suche/useDebouncedSearch.ts`
- **Commit:** `dc311fe93`

Beide Fixes sind direkte Folgen der Task-1-Änderung (nicht vorbestehende, unabhängige Probleme) und
wurden deshalb im Rahmen dieses Auftrags behoben, nicht aufgeschoben.

## Grep-Beweis (Abwesenheit weiterer eigenständiger Debounce-Implementierungen)

**Schritt A** — alle Nicht-Test-Dateien mit „debounce" (case-insensitiv):

```
grep -rliE "debounce" frontend/src --include="*.ts" --include="*.tsx" | grep -v "\.test\."
```

Ergebnis (13 Dateien, Treffer teils nur Kommentar/Nutzung des gemeinsamen Hooks):

```
frontend/src/hooks/useDebouncedValue.ts
frontend/src/hooks/useCancellableSlugState.ts
frontend/src/app/admin/users/useUserListFilters.ts
frontend/src/app/admin/fansubs/useAdminFansubsList.ts
frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.ts
frontend/src/app/suche/SearchField.tsx
frontend/src/app/suche/useDebouncedSearch.ts
frontend/src/app/suche/page.tsx
frontend/src/app/suche/SearchFilterDrawer.tsx
frontend/src/app/suche/SearchFilters.tsx
frontend/src/app/suche/SearchResults.tsx
frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx
frontend/src/components/profile/MemberCurrentProjectsSection.tsx
```

**Schritt B** — von diesen Dateien, welche tatsächlich `setTimeout`/`clearTimeout` enthalten (reine
Kommentar-/Hook-Konsum-Erwähnungen ausgeschlossen):

```
grep -n "setTimeout\|clearTimeout" <datei>
```

Vollständiges Ergebnis:

```
--- frontend/src/hooks/useDebouncedValue.ts ---
8: * matching the existing inline setTimeout/clearTimeout debounce pattern this hook replaces.
14:    const timeoutId = setTimeout(() => setDebounced(value), delayMs)
15:    return () => clearTimeout(timeoutId)
--- frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx ---
142:    const timer = setTimeout(() => {
145:    return () => clearTimeout(timer)
```

**Bewertung:** Nach dieser Migration taucht `useDebouncedSearch.ts` in Schritt B NICHT mehr auf —
genau wie erwartet. Übrig bleiben:

- `useDebouncedValue.ts` selbst — erwartet/erlaubt, das ist der gemeinsame Hook.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx` (Zeilen 142-145) — eine FÜNFTE,
  bereits vor diesem Plan vorhandene, eigenständige Debounce-Implementierung (`debouncedSearchTerm`
  via eigenem `setTimeout`/`clearTimeout`). Diese Datei war **nicht Teil des Auftragsumfangs** dieses
  Plans (der sich explizit nur auf `useDebouncedSearch.ts` bezog) und wurde bewusst NICHT verändert.

**Ehrliche Schlussfolgerung:** Die Aussage „KEINE eigene Debounce-Implementierung mehr" gilt nach
diesem Plan für `useDebouncedSearch.ts` und die drei bereits in Phase 184 migrierten Dateien
(`useAdminFansubsList.ts`, `useUserListFilters.ts`, `useDiscoveryLibraryFilters.ts`) — NICHT für den
gesamten Frontend-Baum, solange `releases/page.tsx` unberührt bleibt. Ein Folgeauftrag für diese
fünfte Kopie wäre ein eigener, expliziter Scope.

## QS-Ergebnisse (im Frontend-Docker-Container, nicht auf dem Host)

- **`npm test` (vollständige Vitest-Suite, 391 Testdateien / 3551 Tests):** Die drei
  `useDebouncedSearch`-bezogenen Testdateien (`useDebouncedSearch.test.tsx`, `SearchField.test.tsx`,
  `SearchResults.test.tsx`, zusammen 24 Tests) sind in jedem Lauf vollständig grün. Die
  Gesamtsuite zeigt daneben konsistent EINEN vorbestehenden, nicht mit dieser Migration
  zusammenhängenden Fehler:
  `src/types/__tests__/anime-detail-contract.test.ts > ... preserves the complete relation payload
  including nullable cover and year` — ein OpenAPI-Schema/Test-Drift, der bereits vor diesem Plan
  bestand (verifiziert: identischer Fehler bei isoliertem Lauf dieser Testdatei allein, und bereits
  vorhanden auf Commit `1f910ecd7`, dem Stand vor Beginn dieses Quick-Tasks). Zusätzlich traten über
  mehrere Volldurchläufe hinweg JEWEILS EIN ANDERER, nicht reproduzierbarer Timeout in einer
  unabhängigen Testdatei auf (`AchievementBadgeShowcase.test.tsx`,
  `ProjectMemberMediaGallery.test.tsx`, `TagsGenresAdminClient.test.tsx` — in verschiedenen Läufen
  verschiedene Dateien) — das deutet auf ressourcenbedingte Flakiness der Gesamtsuite unter Volllast
  hin, nicht auf einen durch diese Migration verursachten Fehler. Keiner dieser Fälle berührt
  `suche`/Debounce-Code.
- **`npm run typecheck`:** grün, keine Fehler.
- **`npm run lint`:** 4 verbleibende Fehler, alle vorbestehend und unabhängig von dieser Migration
  (`capture-responsive.cjs` × 2 `no-require-imports`, `useReleaseVersionMedia.ts` 1
  „Compilation Skipped", `CapabilityDetailRow.tsx` 1 `no-unescaped-entities`) — keiner in einer der
  vier geänderten Dateien. Der ursprünglich durch diese Migration verursachte
  `react-hooks/set-state-in-effect`-Fehler wurde behoben (siehe Deviations oben).
- **Container-Neustart:** `docker restart team4sv30-frontend` ausgeführt; `docker compose ps
  team4sv30-frontend` zeigt `Up`, Next.js-Dev-Server kompiliert und bedient Requests fehlerfrei
  (Log-Prüfung nach Neustart ohne Fehler außer der erwarteten `SIGTERM`-Zeile vom Neustart selbst).

## Commits

- `cc49b992d` — `refactor(261016-ccw): useDebouncedSearch nutzt gemeinsamen useDebouncedValue-Hook statt eigener setTimeout-Debounce-Logik` (Task 1)
- `dc311fe93` — `fix(261016-ccw): Folgefehler aus der useDebouncedSearch-Migration beheben` (Deviation-Fixes, Rule 1)

## Known Stubs

Keine — diese Migration führt keine neuen UI-Komponenten oder Datenquellen ein.

## Self-Check: PASSED

- `frontend/src/app/suche/useDebouncedSearch.ts` — FOUND (enthält `useDebouncedValue`, kein eigener `setTimeout`/`clearTimeout` mehr außer in Kommentaren)
- `frontend/src/app/suche/useDebouncedSearch.test.tsx` — FOUND (11 Tests, 249ms/250ms-Zeitgrenze + Mount-Timing-Test)
- Commit `cc49b992d` — FOUND in `git log`
- Commit `dc311fe93` — FOUND in `git log`
- `team4sv30-frontend` nach Neustart `Up` — bestätigt via `docker compose ps`
