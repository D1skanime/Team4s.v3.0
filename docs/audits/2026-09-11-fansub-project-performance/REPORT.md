# Fansub-Projektseite: Vorher/Nachher-Messung (Phase 155)

11. September 2026 · /home/d1sk/team4s · Ausgangsstand `b68d4c61` (vor 155-01), Endstand `f3faa618`
(nach 155-07/Task 1) · team4s-linux, Docker Compose. Route `/fansubs/new-subs/fansubprojekt/buddy-complex`
(einzige real vorhandene Gruppe/Projekt-Kombination im Dev-Datenbestand, siehe `155-RESEARCH.md`
„Environment Availability").

**Die Projektseite lädt heute pro Aufruf statt zwei vollständiger Public-Fansub-Profile nur noch
einen schmalen Resolver-Aufruf, statt einer `per_page:100`-Release-Vollliste nur noch eine
COUNT-Abfrage, und lädt zwei nicht gerenderte Themes-/Release-Media-Requests überhaupt nicht mehr.**
Serverseitige Backend-HTTP-Aufrufe pro SSR-Request sinken von 13 auf 10 (−23 %); die drei am klarsten
zuordenbaren SQL-Kostenblöcke (Slug-Auflösung, Release-Zähler, tote Fetches) sinken von mindestens
20 auf 4 Abfragen (−80 %, konservativ, siehe Methodik unten).

## Methodik und Grenzen

- **Nachher (nach 155-07 Task 1) ist live gegen den laufenden Dev-Stack gemessen** — ein echter
  Playwright/CDP-Lauf des bestehenden `frontend/scripts/audit-public-member-performance.mjs` gegen
  `AUDIT_ROUTES=fansubs/new-subs/fansubprojekt/buddy-complex`, siehe `REPRODUCE.md` für den exakten
  Befehl und die Rohdaten.
- **Vorher wird NICHT durch Zurücksetzen/Neubauen des Codes nachgemessen** (per Auftrag §11/§12
  dieses Plans und `155-RESEARCH.md`'s bereits verifizierten Codebeleg direkt zitiert) — die
  Vorher-Zahlen stammen aus (a) dem tatsächlichen Vorher-Quelltext bei Commit `b68d4c61` (der letzte
  Commit vor 155-01, per `git show b68d4c61:...` direkt gelesen, siehe unten) und (b) den bereits
  in 155-01/155-02/155-03-SUMMARY.md real gegen Postgres gemessenen und angehefteten
  Query-Budget-Konstanten.
- **CDP-Netzwerk erfasst nur browserseitige Requests.** Die serverseitigen Backend-Aufrufe des
  Next.js-SSR-Loaders (`loadPublicFansubProjectPageData`, aufgerufen im Node-Prozess des
  Frontend-Containers gegen den Go-Backend-Container) sind für den Browser unsichtbar und
  erscheinen NICHT in der CDP-Requestliste. Die Backend-HTTP-Aufrufzahlen unten sind daher aus dem
  tatsächlichen Quelltext beider Zustände abgezählt, nicht aus dem CDP-Trace abgeleitet — siehe
  TABLES.md für die vollständige Aufrufliste beider Zustände.
- **SQL-Query-Zahlen werden nur dort angegeben, wo eine bereits gemessene, gepinnte Konstante
  existiert** (Resolver = 2, Contributors = 2, Release-Count = 1, aus 155-01/02/03-SUMMARY.md; die
  „8 SQL"-Zahl für einen vollen Public-Fansub-Profil-Load ist aus dem bereits bestehenden
  `docs/audits/2026-09-09-public-member-performance/REPORT.md`-Tabelleneintrag „Profile-SQL
  inklusive Zugriff … new-subs … 8 + 2 Teamprojektion" zitiert, nicht in dieser Phase neu
  gemessen). Für Endpunkte, die diese Phase nicht verändert hat (`getGroupDetail`, `getAnimeByID`,
  `getGroupAssets`, `getGroupReleaseListCursor`, `getGroupReleaseDetail`, `getGroupProjectNote`,
  `getAnimeFansubs`), wird KEINE SQL-Zahl behauptet — das wäre eine Beschleunigungsbehauptung ohne
  Messbeleg (Scope Fence).

## Vorher (Commit `b68d4c61`, letzter Stand vor 155-01)

Serverseitige Backend-HTTP-Aufrufe für einen erfolgreichen initialen Aufruf der Pretty-Route
(`page.tsx` + `loadPublicFansubProjectPageData`), abgezählt direkt am damaligen Quelltext
(`git show b68d4c61:frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx` und
`git show b68d4c61:frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts`):

1. `page.tsx`: `getPublicFansubProfileBySlug(fansubSlug)` — **Profil-Load #1**, nur zur
   `animeID`-Auflösung verwendet.
2. `loadPublicFansubProjectPageData`: `getGroupDetail`
3. `loadPublicFansubProjectPageData`: `getAnimeByID`
4. `loadPublicFansubProjectPageData`: `getGroupAssets`
5. `loadPublicFansubProjectPageData`: `getGroupReleases(animeID, groupID, { per_page: 100 })`
   — Vollisten-Abruf, nur für `episodes.length`-Gate und `releaseCount` gebraucht
6. `loadPublicFansubProjectPageData`: `getAnimeFansubs` (im selben `Promise.all` wie #5)
7. `loadPublicFansubProjectPageData`: `profilePromise = getPublicFansubProfileBySlug(canonicalFansubSlug)`
   — **Profil-Load #2**, identisches Profil wie #1, nur für `canonicalProjectPath`/Navigation
8. `loadPublicFansubProjectPageData`: `getGroupReleaseListCursor(limit:1)` — Latest-Preview
9. `loadPublicFansubProjectPageData`: `getGroupReleaseDetail` — Latest-Preview-Detail (seriell nach #8)
10. `loadPublicFansubProjectPageData`: `getGroupContributors`
11. `loadPublicFansubProjectPageData`: `getGroupThemes` — **toter Fetch, kein Render-Consumer**
12. `loadPublicFansubProjectPageData`: `getGroupReleaseMedia` — **toter Fetch, kein Render-Consumer**
13. `loadPublicFansubProjectPageData`: `getGroupProjectNote`

**13 Backend-HTTP-Aufrufe** im Erfolgspfad. Bei einem fehlschlagenden `getGroupReleases`-Aufruf
(#5/#6) verdoppelt ein verschachteltes `catch` den Vollisten-Aufruf zusätzlich (bis zu 15 Aufrufe
im Fehlerpfad) — dieser Duplikat-Retry ist in der Nachher-Spalte ersatzlos entfernt.

Bekannte, bereits gemessene SQL-Kosten für die drei diese Phase betreffenden Blöcke:
- Zwei volle Public-Fansub-Profil-Loads (#1 + #7) à ca. 8 SQL (Zahl aus dem 2026-09-09-Audit für
  genau diese Gruppe `new-subs`, siehe Zitat oben) = **~16 SQL** nur zur Slug-Auflösung/Navigation.
- `getGroupReleases`-Vollliste (#5): 1 Listen- plus 1 interne `COUNT(DISTINCT rev.id)`-Abfrage
  (155-02-SUMMARY.md, `group_repository.go`-Zeilen 165-178) = **2 SQL**, bei Retry **4 SQL**.
- Tote Fetches (#11/#12): mindestens 1 SQL je Endpunkt = **~2 SQL**, ohne jeden Render-Consumer.
- `getGroupContributors` (#10): bereits vor dieser Phase konstant **2 SQL** (155-03-SUMMARY.md
  Negativbefund — unverändert, siehe unten).

## Nachher (Endstand dieser Phase, live gemessen)

Serverseitige Backend-HTTP-Aufrufe für denselben erfolgreichen initialen Aufruf, abgezählt am
aktuellen Quelltext (`frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx` +
`frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts`):

1. `page.tsx`: `resolveFansubProject(fansubSlug, animeSlug)` — ersetzt Profil-Load #1, **1 HTTP-Call,
   pinned 2 SQL** (155-01-SUMMARY.md, `phase155ProjectResolverConstantQueryBudget = 2`)
2. `loadPublicFansubProjectPageData`: `getGroupDetail` (unverändert)
3. `loadPublicFansubProjectPageData`: `getAnimeByID` (unverändert)
4. `loadPublicFansubProjectPageData`: `getGroupAssets` (unverändert)
5. `loadPublicFansubProjectPageData`: `getAnimeFansubs` (eigener Branch, nicht mehr an die
   entfernte Vollliste gekoppelt)
6. `loadPublicFansubProjectPageData`: `getGroupReleaseCount(animeID, groupID)` — ersetzt die
   `per_page:100`-Vollliste, **1 HTTP-Call, pinned 1 SQL** (155-02-SUMMARY.md,
   `GetGroupReleaseVersionCount`, byte-identisch zur alten Zahl bei Mehrversions-Episoden getestet)
7. Profil-Load #2 entfällt vollständig — `loadPublicFansubProjectPageData` erhält
   `precomputed.canonicalProjectPath`/`precomputed.fansubProjectNavigation` direkt vom Resolver
   (155-04/155-06), kein zweiter `getPublicFansubProfileBySlug`-Aufruf, kein zusätzlicher HTTP-Call
8. `loadPublicFansubProjectPageData`: `getGroupReleaseListCursor(limit:1)` — Latest-Preview (unverändert)
9. `loadPublicFansubProjectPageData`: `getGroupReleaseDetail` — Latest-Preview-Detail (unverändert)
10. `loadPublicFansubProjectPageData`: `getGroupContributors` — unverändert, **weiterhin pinned 2 SQL**
    auch bei 30-50 Mitwirkenden (155-03-SUMMARY.md, `TestGetProjectContributorsQueryBudgetIsConstantAt30To50Contributors`)
11. `loadPublicFansubProjectPageData`: `getGroupProjectNote` (unverändert)

`getGroupThemes`/`getGroupReleaseMedia` (vorher #11/#12) sind vollständig entfernt — kein
Ersatzaufruf, kein Ersatzfeld im Loader-Vertrag (155-04-SUMMARY.md).

**10 Backend-HTTP-Aufrufe** im Erfolgspfad — **13 → 10, −3 Aufrufe / −23 %**. Kein Duplikat-Retry
mehr im Fehlerpfad (der verschachtelte `catch` ist ersatzlos entfernt, nicht nur seltener gemacht).

Live gemessene browserseitige Werte für dieselbe Route (Playwright/CDP, `AUDIT_LABEL=phase155-after`,
siehe REPRODUCE.md und TABLES.md für die vollständige Requestliste):

| Metrik | Cold | Warm |
| --- | ---: | ---: |
| TTFB | 248,5 ms | 237,3 ms |
| DOMContentLoaded | 412,7 ms | 457,7 ms |
| Load | 1.315,6 ms | 746,9 ms |
| Browserseitige Requests gesamt | 11 | 11 |
| Bytes transferiert gesamt | 4.393.417 | 3.849.942 |
| Document-Payload (SSR-HTML) | 40.192 Bytes | — |
| Längster Long Task | 195 ms | 170 ms |
| Console-Fehler | 2 | 2 |

Die 11 browserseitigen Requests sind zu 9/11 statische Next.js-Assets (JS/CSS-Chunks, unverändert
durch diese Phase) plus 1 Bild (Banner) plus genau 1 clientseitiger API-Aufruf
(`getGroupReleaseListCursor` über `OlderReleasesList.tsx`, unverändert durch diese Phase — die
History-Sektion holt ihre eigene Seite client-seitig nach der Hydration, das war vor und nach
dieser Phase so). Die serverseitigen SSR-Backend-Aufrufe (#1-#11 oben) sind für CDP unsichtbar, weil
sie im Node-Prozess des Frontend-Containers laufen, nicht im Browser.

Die beiden Konsolenfehler sind vorbestehend und nicht durch diese Phase verursacht (identisches
Verhalten bereits vor 155-01, nicht Teil dieses Plans' Scope — siehe VALIDATION.md für die
Einordnung als vorbestehend/unbestätigt).

## Themes-/Media-Requests: Vorher/Nachher

| | Vorher | Nachher |
| --- | ---: | ---: |
| `getGroupThemes`-Aufrufe pro SSR-Request | 1 | 0 |
| `getGroupReleaseMedia`-Aufrufe pro SSR-Request | 1 | 0 |
| Render-Consumer für `hasThemes`/`hasMedia` | 0 (bereits vor 155-04 unbenutzt) | entfernt aus dem Vertrag |

`ThemesSection.tsx`/`MediaSection.tsx` selbst sind **nicht** gelöscht — siehe „Bewusste
Nicht-Behebungen" unten.

## Release-bezogene Requests: Vorher/Nachher

| | Vorher | Nachher |
| --- | ---: | ---: |
| `getGroupReleases(per_page:100)`-Aufrufe (Erfolgspfad) | 1 | 0 (entfernt) |
| Duplikat-Retry bei Fehler | ja, bis zu 1 weiterer Aufruf | entfernt (kein Retry mehr) |
| `getGroupReleaseCount`-Aufrufe | 0 (existierte nicht) | 1 |
| `getGroupReleaseListCursor`(latest, limit:1)-Aufrufe | 1 | 1 (unverändert) |
| `getGroupReleaseDetail`(latest)-Aufrufe | 1 | 1 (unverändert) |
| Angezeigte „Releases"-Zahl exakt gleich? | Referenz | ja, byte-identisch getestet (155-02-SUMMARY.md) |

## Bewusste Nicht-Behebungen (nicht Auslassungen)

Diese drei Punkte wurden während der Phase bewusst nicht angefasst — dokumentiert, nicht stillschweigend übergangen:

1. **`GetGroupReleases`s eigener interner redundanter `GetGroupDetail`-Aufruf bleibt bestehen.**
   Der Offset-Endpunkt `GetGroupReleases` (`backend/internal/repository/group_repository.go`) ruft
   intern selbst noch einmal `GetGroupDetail` auf, obwohl der SSR-Loader `GetGroupDetail` bereits am
   Anfang von `loadPublicFansubProjectPageData` einmal geladen hat. Dieser Endpunkt selbst wird von
   der Projektseite nach dieser Phase nicht mehr für die Vollliste aufgerufen (ersetzt durch
   `GetGroupReleaseVersionCount`), aber `GetGroupReleases` bleibt als Funktion unverändert und wird
   von anderen, nicht-öffentlichen Consumern weiterhin genutzt (155-02-SUMMARY.md, Task 1 action
   note) — außerhalb des Scopes dieser Phase, nicht behoben.
2. **`ThemesSection.tsx`/`MediaSection.tsx` bleiben als unangetastete, ungerenderte Komponenten
   bestehen.** `155-CONTEXT.md`s Workstream E verlangt explizit „kein stiller
   Komponenten-Löschzug in einer Read-Model-Phase" — die Fetches, die sie mit Daten versorgt hätten,
   sind entfernt (siehe oben), die Komponenten selbst existieren weiterhin unverändert im Repo für
   eine mögliche spätere Reaktivierung.
3. **`PublicReleaseBlock`s Mitwirkenden-Zeile und `OlderReleasesList.rows.tsx`s Release-Zeilen
   verlinken Mitwirkende nicht.** Beide rendern Mitwirkende als nicht-interaktive Avatar-Initialen,
   nicht als Links — P155-05s kanonische Verlinkungsregel („jeder Member-Klick im Projektkontext
   führt kanonisch auf die Projekt-Member-Route") greift dort schlicht nicht, weil es dort heute
   keinen klickbaren Member-Link gibt, der auf `/members/[slug]` fallen könnte. Nichts umzuleiten,
   nichts zu regressieren — bestätigt bereits in `155-VALIDATION.md`s „Wave 0 Requirements"-Fußnote.

## Referenzen

- Vollständige Zahlen: [TABLES.md](TABLES.md)
- Reproduktionsbefehle: [REPRODUCE.md](REPRODUCE.md)
- Test-/Validierungsnachweis: [VALIDATION.md](VALIDATION.md)
- Vorlage/Struktur: `docs/audits/2026-09-09-public-member-performance/`
