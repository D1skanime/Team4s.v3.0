# Quick Task 261102-cb2: Team4S Storybook-Grundlage für ganze Seiten + Pilot Anime-Seiten - Context

**Gathered:** 2026-11-02
**Status:** Ready for planning

**Hinweis zur Methode:** Dieser Quick-Task läuft autonom (ki-run-Auftrag, kein Mensch live
anwesend während der Umsetzung). Die unten dokumentierten Entscheidungen wurden daher nicht per
interaktivem AskUserQuestion erfragt, sondern aus der Recherche (261102-cb2-RESEARCH.md) und
eigener Code-Prüfung abgeleitet und hier als verbindliche Entscheidung festgehalten. Die im
Auftragstext selbst verlangte RÜCKFRAGE (Einordnungs-Tabelle Grundbaustein/zusammengesetzter
Baustein/Eigenbau für /anime und /anime/[id]) bleibt eine echte, am Ende dieses Auftrags an den
Menschen zu stellende Rückfrage -- Schritt 3 (neue Bausteine bauen) ist NICHT Teil dieses Auftrags.

<domain>
## Task Boundary

Technische Grundlage für "ganze Seiten im Storybook" (MSW, Fixtures, Server/Ansicht-Split-Muster,
Rollen-/Viewport-Decorators, automatische Render-Prüfung) plus Pilot-Umsetzung für die öffentliche
Animeseite (/anime, /anime/[id]) als "Im Einsatz"-Stories. Dazu: Pagination-Fix für drei kaputte
Server-Seiten (/anime, /archiv, /members/ranking), eine Reihe kleiner, im Auftrag benannter
Mitnehmen-Punkte, und Dokumentationspflege. KEINE neuen UI-Bausteine werden gebaut -- die
Einordnungs-Tabelle für /anime und /anime/[id] ist das Ergebnis, das dem Menschen als Rückfrage
vorgelegt wird.

</domain>

<decisions>
## Implementation Decisions

### Pagination-Fix: additiv, nicht ersetzend
Vollständige Grep-Prüfung (`grep -rn hrefForPage frontend/src`) ergab FÜNF Aufrufer, nicht drei:
- `frontend/src/app/anime/page.tsx:126` -- Server-Komponente (kein `'use client'`) -- MUSS gefixt werden
- `frontend/src/app/archiv/page.tsx:221` -- Server-Komponente -- MUSS gefixt werden
- `frontend/src/app/members/ranking/page.tsx:91` -- Server-Komponente -- MUSS gefixt werden
- `frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx:409` -- Datei beginnt mit `'use client'` (Zeile 1) -- KEIN RSC-Problem, Callback bleibt gültig
- `frontend/src/components/watchlist/WatchlistList.tsx:90` -- Datei beginnt mit `'use client'` (Zeile 1) -- KEIN RSC-Problem, Callback bleibt gültig

**Entscheidung:** `Pagination.tsx` bekommt einen NEUEN, zusätzlichen Prop `hrefPattern?: string`
(URL-Muster mit `{page}`-Platzhalter, reiner Datenwert, über die Server/Client-Grenze
serialisierbar) NEBEN dem bestehenden `hrefForPage?: (page: number) => string`. `hrefForPage`
bleibt erhalten (für die beiden echten Client-Komponenten-Aufrufer oben) und ist ausschließlich für
Client-Komponenten weiter zulässig -- nicht komplett entfernen, das wäre unnötiger Bruch
bestehender, funktionierender Aufrufer. Nur die drei Server-Seiten wechseln auf `hrefPattern`.
`navProps` in `PagesPagination` prüft `hrefPattern` vor `hrefForPage` vor `onPageChange`.

### Seite-1-URL nach dem Pattern-Wechsel: kosmetischer Unterschied akzeptiert
`buildArchivUrl` und die Inline-Closure in `members/ranking/page.tsx` ließen `page=1` bisher aus der
URL weg. Das feste `hrefPattern` mit `{page}`-Platzhalter schreibt `page=1` künftig explizit in die
URL (z. B. `/archiv?page=1` statt `/archiv`). Funktional gleichwertig (Backend/Frontend
interpretieren fehlenden und expliziten `page=1`-Parameter identisch). Akzeptiert als kosmetischer
Nebeneffekt, kein SEO-kritischer Pfad (interne Paginierung, keine kanonischen Landingpages).

### Render-Prüfung kann den eigentlichen RSC-Fehler NICHT fangen -- zusätzlicher Live-Check nötig
Laut Recherche (Pitfall 2) führt Storybook (Webpack-Builder, kein `experimentalRSC`) nie Next.js'
echte Server/Client-Serialisierung aus -- ein `@storybook/test-runner`-Render-Test kann daher den
fehlenden Router-Kontext (AppShell-Crash) fangen, aber NICHT eine künftige Regression von "Funktion
über die Server/Client-Grenze". Entscheidung: Regressionssicherung läuft über zwei Ebenen --
(1) TypeScript lässt nach dem Fix keine Funktion mehr für die drei Server-Seiten-Konsumenten zu
(reiner String-Typ für `hrefPattern`), (2) ein automatisiertes Smoke-Skript/Test ruft
`/anime`, `/archiv`, `/members/ranking` gegen den laufenden Next.js-Dev-Server ab und prüft auf
HTTP 200 statt 500 -- dieser Check wird Teil des Auftrags (nicht nur einmaliger manueller
curl-Beleg), da er die einzige Ebene ist, die den tatsächlichen Originalfehler reproduzieren kann.

### Werkzeugwahl Render-Test-Runner: `@storybook/test-runner`, nicht die Vitest-Addon-Linie
`@storybook/experimental-addon-test`/Vitest-Addon verlangt laut offizieller Doku
`@storybook/nextjs-vite` (Vite-Builder) -- widerspricht dem in `frontend/.storybook/main.ts`
explizit begründeten Webpack-Entscheid. `@storybook/test-runner` (Playwright-basiert,
Framework-agnostisch) passt zum Bestand, Playwright/Chromium sind im `frontend/Dockerfile`
(Runner-Stage) bereits vorinstalliert.

### Neue Dev-Dependencies: freigegeben
`msw` (`^2.x`-Linie, nicht `3.x` -- stabilere, seit Jahren etablierte Linie), `msw-storybook-addon`
(`^3.0.3`), `@storybook/test-runner` (`^0.26.0`) -- alle drei unter etablierten GitHub-Orgs
(`mswjs`, `storybookjs`), die bereits Kernabhängigkeiten dieses Projekts pflegen. Freigegeben ohne
weitere Rückfrage; Versionsangaben vor dem tatsächlichen `npm install` per `npm view` erneut prüfen
(Ökosystem bewegt sich schnell), falls sich die Umsetzung verzögert.

### Server/Ansicht-Split: nur für die beiden Pilotseiten, Muster dokumentieren
`AnimeListContent` (`frontend/src/app/anime/page.tsx`) und `AnimeDetailContent`
(`frontend/src/app/anime/[id]/page.tsx`) bekommen je eine neue, reine Props-Komponente
(`AnimeListView`/`AnimeDetailView`), die den bisherigen JSX-Rückgabewert unverändert übernimmt. Die
Server-Funktion bleibt für das Datenladen zuständig und rendert nur noch die View-Komponente. Bei
`AnimeDetailView`: falls die gesplittete Datei das 450-Zeilen-Limit überschreitet, in fachlich
sinnvolle Unterkomponenten teilen (keine neuen, katalogisierten Bausteine -- rein seiteneigene
Struktur). `WatchlistAddButton` (eigener Client-Fetch `getWatchlistEntry`) bleibt Kind der View und
braucht zusätzlich MSW (Props-Split allein reicht für die Detailseite nicht aus).

### MSW nur für echte Client-Fetches, nicht für die Pilotseiten-Serverdaten selbst
Zentrale Handler-Datei (`frontend/.storybook/mocks/handlers.ts`), initialisiert in `preview.tsx`.
Deckt im Pilot-Scope ab: `GET /api/v1/watchlist/:animeID` (`WatchlistAddButton`), `GET /api/v1/me`
(`AppShellClientWrapper`, Rollen-Umschalter). Pfade exakt aus den jeweiligen `lib/api/*.ts`-Dateien
übernehmen, nicht neu raten.

### Rollen-Simulation über echten Session-Store
Kein neuer `AuthProvider`/React-Context. Decorator ruft `persistAuthSession(...)`/
`clearAuthSession()` aus `@/lib/api` auf (bereits bestehender Test-Helfer-Mechanismus, siehe
`useAuthSession.test.tsx`), passend zum gewählten Storybook-Toolbar-Global (anonym/Mitglied/
Fansub-Lead/Plattform-Admin). MSW-Handler für `GET /api/v1/me` liefert dazu passende
`account_global_roles`.

### next/navigation: vorhandenes Framework-Feature aktivieren, kein Eigenbau
`parameters.nextjs.appDirectory: true` global in `preview.tsx` setzen (`@storybook/nextjs` 10.6.5
ist bereits das genutzte Framework). Kein eigener Router-Mock-Decorator.

### "Im Einsatz"-Bereinigung: nur die im Auftrag explizit benannten Showcases
Explizit benannt und zu bearbeiten:
- `SwitchShowcase` ("Switch-Beispiele") → Inhalt nach `Switch.stories.tsx` (Grundbausteine/Switch)
  übernehmen; Komponente/Story-Datei danach entfernen.
- `UploadPrimitivesShowcase` ("Upload-Dropzone mit Warteschlange") → Inhalt nach
  `UploadDropzone.stories.tsx` (Zusammengesetzte Bausteine) übernehmen.
- `DrawerShowcase` ("Drawer mit Größen-Umschalter") → Inhalt nach `Drawer.stories.tsx`
  (Zusammengesetzte Bausteine) übernehmen.
- `AccordionShowcase` → Inhalt nach `Accordion.stories.tsx` übernehmen.
- `ModalInContextShowcase` → Inhalt nach `Modal.stories.tsx` übernehmen.
- `FormWithErrorsShowcase` → Inhalt nach `FormField.stories.tsx` übernehmen.
- `CompositionShowcase` ("Admin-Layer-Kompositionen", vier Kompositionen + drei verschachtelte
  Unterkomponenten `MediaManagementCompositionShowcase`/`ProjectNoteShowcase`/
  `ReleaseCompositionShowcase`): zeigt KEINEN einzelnen Baustein, sondern vier verschiedene
  Admin-Nutzungsmuster über mehrere Bausteine hinweg -- lässt sich nicht 1:1 in eine einzelne
  Baustein-Story überführen, ohne die einzelnen Kompositionen willkürlich künstlich aufzuspalten.
  **Claude's Discretion:** diese Datei als Ganzes entfernen (keine der vier Admin-Kompositionen
  zeigt eine komplette Seite/einen kompletten Ablauf -- sie sind Fragmente, die unter der neuen
  Regel "Im Einsatz = nur komplette Seiten und Abläufe" ohnehin nicht bleiben dürften, und ein
  künstliches 1:1-Mapping auf einen einzelnen Baustein wäre erfundener Mehraufwand ohne Vorbild im
  Auftrag). Im Bericht als bewusste Einzelfall-Entscheidung kennzeichnen.

NICHT angefasst (nicht explizit benannt, Auftrag verbietet Nebenbei-Umbauten):
`AchievementBadgeShowcase`, `PublicFansubSurfacesShowcase`, `PublicReleaseSurfacesShowcase`,
`AppShellDrawerDemoSection` (letztere bleibt bestehen, muss aber nach dem `appDirectory`-Fix
fehlerfrei rendern -- das ist eine ausdrückliche Anforderung im Auftragstext) und
`FansubHeroSection` (ist das im Auftragstext referenzierte Vorbild für funktionierende "Im
Einsatz"-Komposition, nicht Teil der Bereinigungsliste).

Beim Verschieben: aria-label des Switch darf laut Auftrag NICHT abweichend vom sichtbaren Label
sein (WCAG 2.5.3) -- beim Übernehmen der drei Switch-Beispiele in `Switch.stories.tsx` prüfen, ob
die Beispiele überhaupt ein abweichendes `aria-label` hatten; falls ja, auf das sichtbare
`label`-Prop vereinheitlichen.

### Dokumentation der neuen Taxonomie-Regel
`docs/FRONTEND_ARCHITEKTUR.md` (Storybook-Absatz, aktuell Zeile 219) und
`catalogTaxonomy.test.ts` bekommen die Regel "Im Einsatz = nur komplette Seiten und Abläufe"
ergänzt; die Story-Zahl/-Liste wird auf den neuen Stand aktualisiert (FansubHeroSection,
AppShellDrawerDemoSection, AchievementBadgeShowcase, PublicFansubSurfacesShowcase,
PublicReleaseSurfacesShowcase bleiben, plus die neuen Anime-Liste/-Detail-Pilot-Stories).

</decisions>

<specifics>
## Specific Ideas

- Storybook-Pfade für den Bericht: Tunnel `127.0.0.1:6007` (siehe Auftragstext) -- tatsächlicher
  Service-Port laut `docker-compose.yml`/Override ist 6006 im Container, SSH-Tunnel-Mapping liegt
  außerhalb der Code-Zuständigkeit dieses Auftrags, im Bericht beide Angaben (Storybook-internen
  Pfad + erwarteten Tunnel-Port) nennen.
- `AnimeDetailView`-Props exakt aus den bereits lokal berechneten `const`s in
  `frontend/src/app/anime/[id]/page.tsx` (Zeilen 86-113 laut Recherche) ableiten, nicht neu
  erfinden.
- Fixtures: deutsch, realistische Anime-Titel/Beschreibungen (keine `Lorem ipsum`-Platzhalter),
  Fälle normal/leer/Fehler/viele Daten (Blättern)/lange Titel/fehlende Bilder -- nach den Typen in
  `shared/contracts/openapi.yaml` und `frontend/src/types/anime.ts`.

</specifics>

<canonical_refs>
## Canonical References

- `.planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/261102-cb2-RESEARCH.md`
  (vollständige technische Recherche: Bestand, Standard-Stack, Architecture Patterns, Pitfalls,
  Code-Beispiele, Assumptions Log)
- `docs/FRONTEND_ARCHITEKTUR.md` Zeile 219 (aktueller "Im Einsatz"-Beschreibungstext)
- `CLAUDE.md` (Frontend-UI-Design-System-Regeln, 450-Zeilen-Limit, Dokumentationspflicht,
  Sprachqualität)

</canonical_refs>
