---
quick_id: 261102-cb2
status: complete
---

# Summary: Team4S Storybook-Grundlage für ganze Seiten + Pilot Anime-Seiten

Alle 8 Tasks aus `261102-cb2-PLAN.md` sind umgesetzt und committed (Branch `ki/team4s-261102-226d`).

## Task-Tabelle

| Task | Status | Commit | Inhalt |
|---|---|---|---|
| 1 — Pagination-Fix | done | `2186570de` | `Pagination.tsx` bekommt `hrefPattern?: string` (URL-Muster-String, additiv neben `hrefForPage`); `buildAnimeListPageHref`/`buildArchivUrl` akzeptieren `page: number \| string`; `anime/page.tsx`/`archiv/page.tsx`/`members/ranking/page.tsx` nutzen `hrefPattern`; `scripts/smoke-pagination.sh` neu |
| 2 — Testinfrastruktur installieren | done | `a6b1b15fc` | `msw@2.15.0`, `msw-storybook-addon@3.0.3`, `@storybook/test-runner@0.26.0` in beiden Containern installiert; `mockServiceWorker.js` erzeugt; `test-storybook`-Skript ergänzt |
| 3 — Storybook-Infrastruktur | done | `e0d541e4a` | `parameters.nextjs.appDirectory: true`, MSW-Loader (`msw-storybook-addon/csf3`), `handlers.ts`/`profileFixtures.ts`/`roleSimulation.ts` neu |
| 4 — Server/Ansicht-Split Anime-Liste | done | `e881ca79a` | `AnimeListView.tsx`/`.fixtures.ts`/`.stories.tsx` neu, `anime/page.tsx` auf reinen Daten-Lader reduziert, neues Stories-Glob in `main.ts` |
| 5 — Server/Ansicht-Split Anime-Detail | done | `fe6b1bdb4` | `AnimeDetailView.tsx`/`.fixtures.ts`/`.stories.tsx` neu, `anime/[id]/page.tsx` auf reinen Daten-Lader reduziert, zwei bestehende Testdateien an den Split angepasst |
| 6 — Showcase-Migration | done | `985c00093` | Sechs Einzel-Showcases in `Switch`/`UploadDropzone`/`Drawer`/`Accordion`/`Modal`/`FormField`-Stories migriert, `CompositionShowcase`-Familie + 5 CSS-Module gelöscht |
| 7 — Dokumentation | done | `0c46204a2` | `FRONTEND_ARCHITEKTUR.md`-Absatz + `catalogTaxonomy.test.ts`-Kommentarblock mit neuer Taxonomie-Regel und echten Story-Zahlen |
| 8 — Einordnungs-Tabelle | done | `537dc5982` | `261102-cb2-EINORDNUNG.md` mit vollständiger Baustein/Eigenbau-Klassifikation beider Pilotseiten |

## Verify-Ergebnisse (tatsächlich ausgeführt, nicht nur behauptet)

- **`npm run typecheck`** (voller Lauf, `team4sv30-frontend`-Container): grün. *(Hinweis: `.next/dev/types/app/archiv/page.ts` ist ein ephemeres, vom laufenden Dev-Server bei JEDEM Besuch von `/archiv` neu generiertes Artefakt, das einen vorbestehenden, unabhängigen Typfehler sichtbar macht -- siehe `deferred-items.md`. Für den finalen Check wurde dieses Artefakt vor dem letzten `typecheck`-Lauf entfernt; der Fehler kehrt beim nächsten `/archiv`-Besuch im selben Dev-Server zurück und ist NICHT durch diesen Auftrag verursacht.)*
- **`npm run lint`** (voller Lauf): 4 Fehler, 217 Warnungen -- alle 4 Fehler pre-existing und unverändert seit Phase 189 (`capture-responsive.cjs` zwei `require()`-Importe, `useReleaseVersionMedia.ts` ein Memoization-Hinweis, `ReleasesFilterBar.tsx` ein natives `<input>`), keiner in einer von diesem Auftrag geänderten Datei.
- **`npx vitest run`** (voller Lauf, isoliert ohne Konkurrenz-Last): **452/453 Testdateien grün, 1 übersprungen, 5354/5357 Tests grün, 3 todo, 0 Fehlschläge.**
- **`npx test-storybook --ci`** (voller Katalog, isoliert ohne Konkurrenz-Last): **58/58 Suiten grün, 289/289 Tests grün** (inkl. `AppShellDrawerDemoSection`, `AnimeListView.stories.tsx`, `AnimeDetailView.stories.tsx`). *(Ein einzelner Zwischenlauf während einer gleichzeitig laufenden vollen `vitest`-Hintergrundausführung zeigte einen Timeout bei `AchievementBadgeShowcase` (113 echte Bild-Loads, CPU-Konkurrenz) -- isoliert wiederholt reproduzierbar grün in 94s Gesamtlaufzeit.)*
- **`npm run build-storybook`**: grün, keine Fehler (nur bekannte, unveränderte Asset-Size-Warnungen).
- **`scripts/smoke-pagination.sh http://192.168.235.196:3000`**:
  ```
  OK: http://192.168.235.196:3000/anime -> 200
  OK: http://192.168.235.196:3000/archiv -> 200
  OK: http://192.168.235.196:3000/members/ranking -> 200
  ```
  Zusätzlich live `curl` gegen `/anime/8` (Detailseite) → `200`, inhaltlich geprüft (enthält "Watchlist"/"Episodes").
- **`ls frontend/src/components/showcases/`**: enthält nur noch `AchievementBadge*` (+ zwei Helfer-/Fixture-Dateien derselben Familie, `AchievementBadgeNonRoleCases.tsx`/`achievementBadgeGalleryFixtures.ts`), `PublicFansubSurfacesShowcase*`, `PublicReleaseSurfacesShowcase*`, `AppShellDrawerDemoSection*`, `DesignTokensShowcase*` sowie `showcases.shared.module.css`/`showcases.tokenPreviews.module.css`/`showcases.comparisonGalleries.module.css`. *(Der im Plan-Verify-Schritt vorgegebene Regex-Check meldet dabei einen falschen Positiv-Treffer für `achievementBadgeGalleryFixtures.ts`, da der Dateiname klein beginnt und das case-sensitive `AchievementBadge`-Muster nicht matcht -- diese Datei ist per `git log` als vorbestehend bestätigt und Teil der nicht angefassten `AchievementBadgeShowcase`-Familie, kein echter Verstoß.)*
- **`261102-cb2-EINORDNUNG.md`**: existiert, vollständig, mit Datei:Zeile-Belegen aus den finalen `AnimeListView.tsx`/`AnimeDetailView.tsx`.
- **450-Zeilen-Limit**: alle inhaltlich geänderten Produktionsdateien geprüft -- größte Datei `AnimeDetailView.tsx` mit 240 Zeilen, alle anderen deutlich darunter (`*.stories.tsx`/`*.fixtures.ts` ohnehin als Dev-Artefakte ausgenommen).

## Entscheidungen/Abweichungen vom Plan

### Auto-fixed Issues (Rule 1 — Bug)

**1. [Rule 1 — Bug] `URLSearchParams` kodiert den `{page}`-Platzhalter zu `%7Bpage%7D`**
- **Gefunden während:** Task 1
- **Problem:** `buildAnimeListPageHref('{page}', ...)`/`buildArchivUrl(..., '{page}')` bauten die URL über `URLSearchParams`, das `{`/`}` automatisch URL-encodiert -- `Pagination`s `.replace('{page}', ...)` hätte den literalen Platzhalter nie gefunden.
- **Fix:** Beide Builder erkennen den Platzhalter-Aufruf explizit und entkodieren `%7Bpage%7D` zurück zu `{page}` vor der Rückgabe.
- **Dateien:** `frontend/src/app/anime/animeListPageHref.ts`, `frontend/src/app/archiv/page.tsx`
- **Verifiziert:** neuer Testfall in `animeListPageHref.test.ts`; live `curl`-Beleg.
- **Committed in:** `2186570de`

**2. [Rule 1 — Bug] `linkComponent={Link}` selbst war über die Server/Client-Grenze nicht sicher serialisierbar**
- **Gefunden während:** Task 1, beim Live-Smoke-Test (nach dem `hrefPattern`-Fix zeigte `/members/ranking` weiterhin HTTP 500)
- **Problem:** CONTEXT.md/RESEARCH.md gingen davon aus, `linkComponent={Link}` (next/link) sei als Referenz auf eine `'use client'`-Komponente sicher über die RSC-Grenze serialisierbar. Live-Reproduktion widerlegte das für den Next.js-16.1.6-Dev-Server: Entfernen von `linkComponent` behob den 500er reproduzierbar (3/3 Versuche), Wiedereinfügen reproduzierte ihn zuverlässig. Auf Seiten mit `<Suspense>` (z. B. `/anime`) wird der Fehler nur in den Server-Log geschrieben, ohne den HTTP-Status zu ändern (Streaming-SSR hat bereits einen 200-Shell gesendet) -- das erklärt, warum er dort unbemerkt blieb.
- **Fix:** `linkComponent={Link}` für alle drei Server-Seiten entfernt; `Pagination` fällt ohne `as`-Prop auf natives `<a>` zurück (funktional gleichwertig für diese `force-dynamic`-Seiten).
- **Dateien:** `frontend/src/app/anime/page.tsx`, `frontend/src/app/archiv/page.tsx`, `frontend/src/app/members/ranking/page.tsx`
- **Verifiziert:** live `curl` gegen alle drei Routen, mehrfach reproduziert inkl. Container-Neustart zur Cache-Ausschluss-Kontrolle.
- **Committed in:** `2186570de`

### Weitere Abweichungen (keine Bugs, aber Plan-Annahmen korrigiert)

**3. `msw-storybook-addon@3.0.3`s API ist nicht die in RESEARCH.md dokumentierte v2-API**
- **Gefunden während:** Task 3, beim ersten `build-storybook`-Lauf (`export 'initialize' ... was not found`)
- **Grund:** RESEARCH.md zitierte die v2-API (`initialize()`, `mswLoader` als Root-Export) -- v3.0.3 (erst kürzlich veröffentlicht, laut RESEARCH.md selbst als "sehr frisch, MEDIUM confidence" markiert) hat eine komplett neue Addon-API (`addonMsw()` für CSF Next, `mswLoader` nur noch unter `msw-storybook-addon/csf3` für klassisches CSF 3.0 wie in diesem Projekt) mit eigenem Default-Setup (bereits bekanntes Storybook-/Asset-Rauschen wird automatisch ignoriert).
- **Fix:** `import { mswLoader } from 'msw-storybook-addon/csf3'`, kein `initialize()`-Aufruf mehr nötig, `loaders: [mswLoader()]`.
- **Committed in:** `e0d541e4a`

**4. `getGroupedEpisodes`-Rückgabetyp per `Awaited<ReturnType<...>>` ist für den `projection: 'public'`-Zweig falsch**
- **Gefunden während:** Task 5, beim ersten `typecheck`-Lauf
- **Grund:** `getGroupedEpisodes` ist überladen; `ReturnType<typeof getGroupedEpisodes>` löst sich auf die zuletzt deklarierte (generische, nicht-öffentliche) Überladung auf, nicht auf den hier tatsächlich genutzten `PublicGroupedEpisodesResponse`-Zweig.
- **Fix:** `groupedEpisodesResponse` in `AnimeDetailViewProps` explizit als `PublicGroupedEpisodesResponse | null` typisiert statt über `Awaited<ReturnType<...>>` erraten.
- **Committed in:** `fe6b1bdb4`

**5. Neue, in `components/ui/*.module.css` kopierte Literal-Werte aus der migrierten `DrawerShowcase` verletzen `foreignVariableOverrides.regression.test.ts`**
- **Gefunden während:** Task 6, beim vollen `npx vitest run` (eine von zwei Test-Failures im ersten Vollauf)
- **Grund:** Der Plan erlaubte explizit "CSS-Modul-Datei kopieren ODER Inline-Styles" für die migrierten Drawer-Demo-Styles. Eine eigene `Drawer.storiesDemo.module.css` mit den 1:1 aus der alten Showcase kopierten rohen Pixel-/Hex-/rgba-Werten verletzte den bestehenden, strengen Design-Token-Wächter für `components/ui/*.module.css` (der zuvor nie griff, weil die alte Datei unter `components/showcases/` lag, außerhalb des geprüften Verzeichnisses).
- **Fix:** CSS-Modul-Datei verworfen, Inline-Styles verwendet (reine Demo-Pixelwerte rechtfertigen keine erfundene Token-Zuordnung).
- **Committed in:** `985c00093`

**6. Zwei bestehende Tests (`page.test.tsx`, `page.performance.test.ts`) liefen über eine flache `elements()`-Baumwanderung des direkten JSX-Rückgabewerts von `AnimeDetailContent`**
- **Gefunden während:** Task 5, beim vollen `npx vitest run`
- **Grund:** Nach dem Split liefert `AnimeDetailContent` nur noch EIN `<AnimeDetailView .../>`-Element; `elements()` rekursiert nur über bereits materialisierte `.props.children`, nicht über Komponentenfunktionen, und fand die vormals direkt zurückgegebenen verschachtelten Elemente (`WatchlistAddButton`, `AnimeBackdropRotator`, `Image` usw.) nicht mehr.
- **Fix:** Betroffene Testhelfer rufen `AnimeDetailView` jetzt einmal synchron auf (`contentElement.type(contentElement.props)`), um denselben verschachtelten Baum wie vor dem Split bereitzustellen. Die Quelldatei-Regex-Prüfung für `AnimeMediaProvider`/`AnimeBackdropRotator` wurde von `page.tsx` auf `AnimeDetailView.tsx` umgestellt (lebt jetzt dort).
- **Committed in:** `fe6b1bdb4`

### Deferred (dokumentiert, nicht behoben -- außerhalb des Scopes)

**7. Vorbestehender Next-16-`PageProps`-Typfehler in `archiv/page.tsx`**
- Siehe `.planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/deferred-items.md`. `ArchivePageProps.searchParams` erlaubt neben `Promise<...>` auch eine rohe (nicht-Promise) Objektform, die Next 16.1.6s generierter `PageProps`-Constraint nicht akzeptiert. Per `git diff` bestätigt: in diesem Auftrag nicht angefasst. Surfacet nur, sobald `.next/dev/types/app/archiv/page.ts` einmal generiert wurde (Besuch der Route im Dev-Server) -- unabhängig reproduzierbar, nicht durch diesen Auftrag verursacht.

---

**Gesamt:** 6 Abweichungen (2 Bug-Fixes, 2 Plan-Annahmen-Korrekturen, 1 Design-Regel-Konflikt gelöst, 1 Test-Anpassung), 1 dokumentierter, bewusst nicht behobener Fund.
**Einfluss auf den Plan:** Alle Fixes waren für Korrektheit (echter 500er-Fix) oder für ein grünes Quality-Gate notwendig. Kein Scope-Creep -- keine neuen UI-Bausteine gebaut, Scope-Grenze eingehalten.

## Geänderte/neue Dateien (Kernliste)

- `frontend/src/components/ui/Pagination.tsx` — `hrefPattern`-Prop
- `frontend/src/app/anime/animeListPageHref.ts`, `frontend/src/app/archiv/page.tsx`, `frontend/src/app/members/ranking/page.tsx` — Pagination-Fix
- `scripts/smoke-pagination.sh` — neuer Live-Smoke-Test
- `frontend/package.json` — `msw`/`msw-storybook-addon`/`@storybook/test-runner`, `test-storybook`-Skript
- `frontend/.storybook/preview.tsx`, `frontend/.storybook/main.ts` — appDirectory, MSW-Loader, Rollen-Decorator, neues Stories-Glob
- `frontend/.storybook/mocks/{handlers,profileFixtures,roleSimulation}.ts` — neu
- `frontend/src/app/anime/AnimeListView.{tsx,fixtures.ts,stories.tsx}` — neu, Server/Ansicht-Split Anime-Liste
- `frontend/src/app/anime/[id]/AnimeDetailView.{tsx,fixtures.ts,stories.tsx}` — neu, Server/Ansicht-Split Anime-Detail
- `frontend/src/app/anime/page.tsx`, `frontend/src/app/anime/[id]/page.tsx` — auf reine Daten-Lader reduziert
- `frontend/src/app/anime/[id]/page.test.tsx`, `frontend/src/app/anime/[id]/page.performance.test.ts` — an den Split angepasst
- `frontend/src/components/ui/{Switch,UploadDropzone,Drawer,Accordion,Modal,FormField}.stories.tsx` — migrierte Showcase-Stories
- `frontend/src/components/showcases/` — 17 Dateien gelöscht (6 Showcase-Paare + CompositionShowcase-Familie + 5 CSS-Module)
- `docs/FRONTEND_ARCHITEKTUR.md`, `frontend/src/components/ui/catalogTaxonomy.test.ts` — Dokumentation
- `.planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/261102-cb2-EINORDNUNG.md` — Rückfrage-Artefakt
- `.planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/deferred-items.md` — dokumentierter, nicht behobener Fund

## Known Stubs

Keine. Beide Pilot-Stories zeigen echte Fixture-Daten (keine leeren Platzhalter-Props), die Server-Seiten laden weiterhin echte Backend-Daten.

## Threat Flags

Keine neuen, nicht im Threat-Model (`261102-cb2-PLAN.md`) erfassten Bedrohungsflächen gefunden. Alle Fixtures (`profileFixtures.ts`, `AnimeListView.fixtures.ts`, `AnimeDetailView.fixtures.ts`) enthalten ausschließlich erfundene Demo-Daten (`demo@team4s.de` u. ä.), keine echten Produktionsdaten.

## Self-Check

Alle acht Task-Commits per `git log --oneline` verifiziert (vorhanden, in der richtigen Reihenfolge). Alle in dieser Zusammenfassung genannten Dateien per `test -f`/`ls` verifiziert vorhanden bzw. (bei Löschungen) verifiziert abwesend. Live-`curl`-Belege oben sind tatsächliche, in dieser Sitzung ausgeführte Befehle, keine Behauptungen.

**Self-Check: PASSED**
