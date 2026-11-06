# Team4S: Storybook-Grundlage für ganze Seiten + Pilot Anime-Seiten - Research

**Researched:** 2026-11-02
**Domain:** Storybook 10 / Next.js 16 App Router Testing-Infrastruktur (MSW, Portable-Stories-Render-Test, RSC-Serialisierungsgrenze)
**Confidence:** HIGH für Bestand/Fehlerursache (alles per Code-Fundstelle oder `npm view` verifiziert), MEDIUM für die MSW/Test-Runner-Versionsempfehlung (Registry-/Docs-verifiziert, aber `slopcheck` zur Paket-Legitimitätsprüfung war in dieser Umgebung nicht installierbar — siehe Package Legitimacy Audit)

## Summary

Der Bestand ist deutlich weiter als der Auftragstext annimmt: `frontend/.storybook/main.ts` nutzt bereits **`@storybook/nextjs` 10.6.5** (nicht ein generisches React-Framework) mit dem **Webpack-Builder** (explizit kommentiert, bewusste Entscheidung gegen Vite). Das bedeutet: `next/navigation`-Mocking (`useRouter`/`usePathname`/`useSearchParams`) existiert bereits eingebaut, es fehlt nur die Aktivierung über `parameters.nextjs.appDirectory`. Die heute abstürzende Story "AppShell mit Slide-over-Drawer" crasht zur Laufzeit (nicht beim Build — `npm run build-storybook` lief in dieser Recherche fehlerfrei durch, siehe unten), weil `AppShell.tsx:22` `useRouter()` aufruft, ohne dass die Story `appDirectory: true` setzt.

Die zweite Baustelle — `Pagination` reißt drei Server-Seiten mit "Functions cannot be passed directly to Client Components" ab — hat eine klare Ursache und einen klaren generischen Fix: `Pagination.tsx:24` (`hrefForPage?: (page: number) => string`) verlangt eine Inline-Closure als Prop; alle drei Aufrufer (`anime/page.tsx:126`, `archiv/page.tsx:221`, `members/ranking/page.tsx:91`) übergeben genau das. `linkComponent={Link}` (Zeile 127/222/92) ist dagegen **nicht** das Problem — eine Referenz auf eine `'use client'`-exportierte Komponente ist über die RSC-Grenze serialisierbar, eine rohe Closure nie. Der generische Fix ist der im Fokus vorgeschlagene: `hrefForPage` durch einen reinen Daten-Wert ersetzen (URL-Muster-String mit `{page}`-Platzhalter), den `Pagination` selbst einsetzt — damit wird die ungültige Kombination (Funktion über Server→Client-Grenze) typsystemisch unmöglich statt nur zur Laufzeit geprüft.

Wichtigster, nicht-offensichtlicher Befund: **Storybook (Webpack-Builder, kein `experimentalRSC`) führt nie Next.js' echte RSC-Serialisierung aus.** Ein Render-Test (`@storybook/test-runner`) kann daher den fehlenden Router-Kontext zuverlässig fangen (echter Browser-Rendering-Fehler), aber **nicht** eine künftige Regression von "Funktion über die Server/Client-Grenze" — dieser Fehler entsteht ausschließlich in Next.js' echtem SSR/Flight-Serialisierungspfad, den Storybook nicht nachbildet. Die im Auftrag geforderte Regressionssicherung für genau diesen Fehlertyp muss daher über den Pagination-Vertrag selbst laufen (TypeScript lässt nach dem Fix gar keine Funktion mehr als Prop zu) plus den ohnehin geforderten Live-`curl`-Nachweis auf Port 3000 — nicht über die Storybook-Story allein.

Für die Vitest-Addon-Variante (offiziell von Storybook für Render-Tests empfohlen) gilt: sie verlangt `@storybook/nextjs-vite` (Vite-Builder) — ein Wechsel, der dem expliziten, kommentierten Webpack-Entscheid in `main.ts` widerspricht. **`@storybook/test-runner`** (Playwright-basiert, Framework-agnostisch, offiziell weiter unterstützt für Webpack-Setups) ist daher die zum Bestand passende Wahl — und Playwright/Chromium ist im `frontend/Dockerfile` (Zeile 39, `runner`-Stage) bereits mit System-Dependencies installiert, exakt das Image, das `team4sv30-storybook` nutzt.

**Primary recommendation:** `@storybook/test-runner` (nicht die Vitest-Addon-Variante) gegen den laufenden `team4sv30-storybook`-Dienst fahren; `msw` + `msw-storybook-addon` nur für echte Client-Fetches einsetzen; für die beiden Pilotseiten echtes Daten/Ansicht-Split statt MSW (React 18 kann `async function`-Serverkomponenten im Browser gar nicht rendern); Pagination-Fix durch Entfernen der Funktions-Prop (URL-Muster-String), nicht durch Zusatzvalidierung.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Anime-Liste/-Detail Datenladen (`getAnimeList`, `getAnimeRelations`, `getAnimeFansubs`, `getGroupedEpisodes`) | API / Backend (liefert Daten) | Frontend Server (SSR) | `anime/page.tsx`/`anime/[id]/page.tsx` sind `async`-Serverkomponenten, die zur Request-Zeit gegen das Go-Backend fetchen — in Storybook gibt es diese Server-Laufzeit nicht, daher Props-Split statt Nachbau |
| Anime-Liste/-Detail Darstellung (Grid, Hero, Badges, Pagination) | Browser / Client (innerhalb von Storybook) | Frontend Server (SSR, in der echten App) | Eine neue reine Props-Komponente (`AnimeListView`/`AnimeDetailView`) macht denselben JSX-Baum sowohl in Next.js SSR als auch in Storybook lauffähig |
| Client-seitige Mini-Fetches in Pilot-Unterkomponenten (`WatchlistAddButton`, `AppShellClientWrapper`) | Browser / Client | API / Backend (via MSW-Mock) | Diese Komponenten fetchen selbst im Browser (`useEffect` + `lib/api`) — brauchen echten Netzwerk-Mock, kein Props-Durchreichen möglich, da sie eigenständig gerendert werden |
| Next.js-Navigation (`useRouter`, `usePathname`) in `AppShell`/`AnimeEdgeNavigation` | Frontend Server (SSR) / Browser-Runtime von Next.js | — | `@storybook/nextjs` stellt den App-Router-Kontext bereits bereit — Aktivierung über `parameters.nextjs.appDirectory`, kein Eigenbau nötig |
| Rollen-Simulation (anonym/Mitglied/Fansub-Lead/Admin) | Browser / Client | API / Backend (via MSW für `getOwnProfile`) | `useAuthSession` liest einen globalen, Browser-seitigen Token-Snapshot (kein React-Context) — Decorator muss echten Session-Store seeden, nicht einen erfundenen `AuthProvider` |
| Render-Smoke-Test aller Stories | Browser / Client (Playwright gegen Storybook-iframe) | — | Kann nur Fehler fangen, die im Browser tatsächlich auftreten — RSC-Serialisierungsfehler (Server→Client-Funktionsprop) gehören NICHT dazu, siehe Pitfall 3 |

## Standard Stack

### Core (bereits vorhanden, keine Änderung nötig)
| Library | Version (package.json) | Purpose | Provenance |
|---------|---------|---------|--------------|
| `storybook` | `^10.6.5` | Storybook-Kern | `[VERIFIED: frontend/package.json]` |
| `@storybook/nextjs` | `^10.6.5` | Next.js-Framework-Adapter, Webpack-Builder | `[VERIFIED: frontend/package.json + frontend/.storybook/main.ts:1,26-29]` |
| `@storybook/addon-themes` / `addon-a11y` / `addon-docs` | `^10.6.5` | Theme-Umschalter, A11y-Panel, Autodocs | `[VERIFIED: frontend/.storybook/main.ts:30]` |
| `playwright` / `@playwright/test` | `1.55.0` | Bereits für E2E genutzt; identische Version reduziert Browser-Binary-Duplikate | `[VERIFIED: frontend/package.json]` |

### Supporting (neu zu installieren)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@storybook/test-runner` | `^0.26.0` (peer: `storybook ^10.0.0`, bestätigt per `npm view`) | Playwright-gestützter Render-/Smoke-Test jeder Story, läuft gegen Webpack-Builder | Quality-Gate-Schritt, der jede Story öffnet und auf Render-Fehler/Konsolen-Fehler prüft |
| `msw` | `^2.15.0` (nicht `3.x` — siehe Begründung unten) | Service-Worker-basierte Netzwerk-Mocks im Browser | Für Client-Komponenten, die selbst `fetch`/`lib/api` aufrufen (nicht für die Server-Seiten-Props-Split-Fälle) |
| `msw-storybook-addon` | `^3.0.3` (peer: `msw >=2`, `storybook ^9\|^10\|^11`, bestätigt per `npm view`) | Verdrahtet MSW-Handler mit Storybooks `parameters`/`loaders` | Zentrale Initialisierung in `preview.tsx`, Handler global + pro Story überschreibbar |

**msw 2.x vs. 3.x:** `npm view msw versions` zeigt `3.0.0`–`3.0.3` als aktuellste Zeile, parallel zu einer weiterhin aktiven `2.x`-Linie (`2.15.0`, 2026-Datum). `msw-storybook-addon`s Peer-Dependency (`msw >=2`) lässt beides zu. `msw@3` ist zum Rechercheszeitpunkt sehr frisch veröffentlicht (keine mehrjährige Praxiserfahrung in diesem Projektkontext verifizierbar) — **`[ASSUMED]`**: Empfehlung ist `msw ^2.x` als die seit Jahren breit genutzte, stabile Linie zu nehmen, bis `msw@3` sich etabliert hat. Dies ist eine Risikoabwägung, keine Registry-Tatsache, und sollte vom Nutzer/Planer bestätigt werden.

### Alternativen, die NICHT passen
| Statt | Könnte man nehmen | Warum hier (noch) nicht |
|------------|-----------|----------|
| `@storybook/test-runner` | `@storybook/experimental-addon-test` / `addon-vitest` (offiziell empfohlener Nachfolger) | Erfordert laut offizieller Doku **`@storybook/nextjs-vite`** (Vite-Builder) für Next.js-Projekte — widerspricht dem in `main.ts` explizit begründeten Webpack-Entscheid (`.mjs`-Alias-Patch, `TsconfigPathsPlugin`). Ein Builder-Wechsel wäre ein eigenständiges, viel größeres Vorhaben, nicht Teil dieses Auftrags. |
| Eigener `next/navigation`-Mock-Decorator | `jest.mock`/manuelles `vi.mock('next/navigation')` | `@storybook/nextjs` liefert dies bereits eingebaut (`parameters.nextjs.appDirectory`, `@storybook/nextjs/navigation.mock`) — Eigenbau wäre Code-Duplikat zu etwas, das schon da ist. |
| Props-Split für Server-Seiten | MSW auch für die Pilotseiten selbst | React 18 kann eine `async function`-Serverkomponente nicht client-seitig rendern (keine RSC-Laufzeit im Storybook-iframe) — MSW würde den `fetch`-Aufruf abfangen können, aber die Komponente käme nie zur Ausführung. Bestätigt durch `@storybook/nextjs`s offiziell dokumentiertes `experimentalRSC`-Feature, das genau dieses Problem adressiert, aber laut Doku bei serverseitigen Ressourcen (Dateisystem, Node-spezifische Libraries) nicht hilft und als experimentell markiert ist. |

**Installation:**
```bash
npm install --save-dev @storybook/test-runner msw msw-storybook-addon
npx msw init public --save   # erzeugt frontend/public/mockServiceWorker.js für den Browser-Worker
```

**Versionsverifikation (durchgeführt):**
```
npm view @storybook/test-runner@latest version peerDependencies   # 0.26.0, storybook ^10.0.0 u.a.
npm view msw-storybook-addon@latest version peerDependencies      # 3.0.3, msw >=2, storybook ^9||^10||^11
npm view msw versions                                             # 2.15.0 (stabile Linie) und 3.0.3 (sehr neu)
```

## Package Legitimacy Audit

`slopcheck` konnte in dieser Umgebung nicht installiert werden (`pip`/`pip3`/`pipx` sind auf dem Rechercheziel nicht vorhanden — `/usr/bin/python3` hat kein `pip`-Modul). Gemäß Protokoll werden alle drei neuen Pakete als `[ASSUMED]` markiert; der Planer muss jeden Install-Schritt hinter `checkpoint:human-verify` setzen. Ersatzweise wurden Registry-Metadaten und Postinstall-Skripte geprüft:

| Package | Registry | Downloads/Woche (npmjs API) | Source Repo | Postinstall | slopcheck | Disposition |
|---------|----------|------------------------------|--------------|--------------|-----------|-------------|
| `msw` | npm, Version `2.15.0` empfohlen | 32.040.948 | `github.com/mswjs/msw` | `node -e "import('./config/scripts/postinstall.js').catch(...)"` — lokaler Pfad, kein Netzwerkzugriff erkennbar | nicht verfügbar → `[ASSUMED]` | Approved (mit Nutzer-Bestätigung vor Install) |
| `msw-storybook-addon` | npm, Version `3.0.3` | 4.318.272 | `github.com/mswjs/msw-storybook-addon` | keiner gefunden | nicht verfügbar → `[ASSUMED]` | Approved (mit Nutzer-Bestätigung vor Install) |
| `@storybook/test-runner` | npm, Version `0.26.0` | 2.790.446 | `github.com/storybookjs/test-runner` | keiner gefunden | nicht verfügbar → `[ASSUMED]` | Approved (mit Nutzer-Bestätigung vor Install) |

**Packages removed due to slopcheck [SLOP] verdict:** keine (Prüfung konnte nicht laufen)
**Packages flagged as suspicious [SUS]:** keine über die verfügbaren Ersatzprüfungen gefunden — alle drei liegen unter etablierten, bekannten GitHub-Organisationen (`mswjs`, `storybookjs`), die bereits Kernabhängigkeiten dieses Projekts pflegen (`storybook`, `@storybook/nextjs` selbst). Trotzdem gilt wegen fehlendem `slopcheck`-Lauf: **alle drei bleiben `[ASSUMED]`**, der Planer muss vor jedem `npm install` einen `checkpoint:human-verify` einfügen.

## Architecture Patterns

### Bestand: bereits vorhandene Storybook-Infrastruktur (verifiziert)

- **Framework:** `@storybook/nextjs` 10.6.5, Webpack-Builder (`frontend/.storybook/main.ts:1,26-29` — bewusste Entscheidung, siehe Kommentar Zeile 8-10: "nutzt den Webpack-Builder (nicht Vite), damit die Build-Pipeline zu den bestehenden Next.js-Konventionen des Projekts passt").
- **Globale Decorators:** aktuell nur `withThemeByClassName` für Hell/Dunkel-Bühnenhintergrund (`frontend/.storybook/preview.tsx:39-52`) — **kein** `parameters.nextjs.appDirectory`, **kein** Router-Mock, **kein** MSW.
- **Viewports:** `TEAM4S_VIEWPORTS` bereits mit `mobile390`/`tablet768`/`desktop1440` definiert (`preview.tsx:11-28`) — für Desktop/Tablet/Mobil-Stories direkt wiederverwendbar, kein Neubau nötig.
- **Taxonomie-Mechanismus:** `catalogTaxonomy.test.ts` (liest nur `Grundbausteine/*`) prüft NICHT `Im Einsatz/*` — eine neue Unterkategorie `Im Einsatz/Öffentlich/Anime-Liste` bzw. `Im Einsatz/Öffentlich/Anime-Detail` verstößt gegen keinen bestehenden automatisierten Test, ist aber als Namenskonvention gegen `docs/FRONTEND_ARCHITEKTUR.md:219` nachzuziehen (dort wird "Im Einsatz/*" aktuell mit 13 Stories unter `components/showcases/` und `FansubHeroSection` beschrieben — Zahl/Liste muss im selben Auftrag aktualisiert werden, siehe Dokumentationspflicht in `CLAUDE.md`).
- **Vorbild für "Im Einsatz"-Komposition:** `frontend/src/components/fansubs/FansubHeroSection.stories.tsx` — Story-Datei liegt NEBEN der Komponente (nicht unter `components/showcases/`), Titel `'Im Einsatz/...'`, Fixtures sind typisierte Literal-Objekte gegen den echten Domain-Typ (`FansubGroup`), keine Fetch-Mocks, weil die Komponente reine Props entgegennimmt.
- **Bereits erfolgreicher Build-Smoke-Test:** `npx storybook build` (webpack) lief in dieser Recherche fehlerfrei durch (`Storybook build completed successfully`) — bestätigt, dass der heutige Fehler der AppShell-Story ein **Laufzeit**-Fehler ist, kein Compile-Fehler, und `npm run build-storybook` im Quality-Gate ihn deshalb bisher nicht fängt.

### Pattern 1: `next/navigation`-Mocking aktivieren (kein Eigenbau)
**What:** `@storybook/nextjs` stubt `next/navigation` automatisch; `parameters.nextjs.appDirectory: true` schaltet den App-Router-Modus ein (statt Pages-Router-Default).
**When to use:** Global in `preview.tsx` für alle Stories, die irgendeine Komponente mit `useRouter`/`usePathname`/`useSearchParams` rendern — das betrifft laut Grep bereits mehrere bestehende Komponenten im Pilot-Scope (`AppShell.tsx:5,46`, `AppShellClientWrapper.tsx:5,80`, `AnimeEdgeNavigation.tsx:5,46`).
**Example:**
```typescript
// Source: https://storybook.js.org/docs/get-started/frameworks/nextjs
// frontend/.storybook/preview.tsx — global statt pro Story, da mehrere
// Pilot-Komponenten (AppShell, AnimeEdgeNavigation) next/navigation nutzen
const preview: Preview = {
  parameters: {
    nextjs: { appDirectory: true },
    viewport: { options: TEAM4S_VIEWPORTS },
  },
  // ...
}
```
Für Stories, die konkrete Pfade/Query-Parameter brauchen (z. B. Anime-Detail mit `?letter=A`), pro Story überschreibbar über `parameters.nextjs.navigation.pathname`/`.query` — `[CITED: storybook.js.org/docs/get-started/frameworks/nextjs]`.

### Pattern 2: Daten/Ansicht-Split für Server-Seiten (Pilot-Pattern)
**What:** Die `async`-Datenlade-Funktion in `page.tsx` bleibt unverändert; eine neue, **synchrone**, reine Props-Komponente übernimmt den gesamten JSX-Rückgabewert.
**When to use:** Jede Seite, die Storybook ohne Server rendern soll — React 18 kann eine `async function`-Komponente nicht client-seitig rendern (Suspense hilft hier nicht, weil die Server-Funktion nie "thenable" an React zurückgegeben wird, sondern von Next.js' eigener RSC-Runtime aufgelöst wird, die im Storybook-iframe nicht existiert).
**Konkret für `frontend/src/app/anime/page.tsx`:**
- Aktuell: `async function AnimeListContent({ searchParams })` (Zeile 61) macht `await getAnimeList(listParams)` (Zeile 91) und rendert direkt JSX (Zeilen 109-130).
- Split-Vorschlag: neue Datei `AnimeListView.tsx` mit Signatur
  ```typescript
  interface AnimeListViewProps {
    response: PaginatedAnimeResponse   // bereits vorhandener Typ, frontend/src/types/anime.ts:21
    letter: string
    perPage: number
    contentType?: ContentType
    status?: AnimeStatus
    gridQuery: string
  }
  export function AnimeListView({ response, letter, perPage, contentType, status, gridQuery }: AnimeListViewProps) { /* Zeilen 109-130 unverändert übernehmen */ }
  ```
  `AnimeListContent` (Server) ruft nur noch `getAnimeList` + `buildAnimeGridQuery` auf und rendert `<AnimeListView ... />`. Die Story importiert `AnimeListView` direkt mit Fixture-`response`-Objekten — kein MSW nötig.
- Gleiches Muster für `frontend/src/app/anime/[id]/page.tsx`: `AnimeDetailContent` (Zeilen 65-289) lädt vier Datenquellen (`animeDetailData.ts` via `loadAnimeDetail`, dann `getAnimeFansubs`/`getGroupedEpisodes`/`getAnimeRelations` über `Promise.allSettled`, Zeilen 90-101) und rendert danach JSX (Zeilen 115-288 — **sehr groß**, bei diesem Split auch gleich auf ≤450 Zeilen achten, aktuelle Datei ist mit 289 Zeilen insgesamt noch unter dem Limit, eine neue `AnimeDetailView.tsx` bliebe wahrscheinlich auch darunter, aber real zählen beim Umsetzen).
  Props-Schnitt: `{ anime: AnimeDetail, embySeriesUrl, animeFansubsResponse, groupedEpisodesResponse, relationsResponse, fansubStoryGroups, episodeCount, coverUrl, gridQuery, rawFansubParam }` — im Wesentlichen die bereits lokal berechneten `const`s aus Zeilen 86-113 werden zu Props.
  **Wichtig:** `AnimeDetailView` enthält weiterhin echte Client-Kinder (`AnimeMediaProvider`, `AnimeBackdropRotator`, `FansubVersionBrowser`, `WatchlistAddButton`, `AnimeEdgeNavigation` — alle `'use client'`, siehe Grep unten). Diese rendern client-seitig problemlos in Storybook, aber `WatchlistAddButton` ruft intern `getWatchlistEntry(animeID)` (`WatchlistAddButton.tsx:51`) beim Mount auf — **das braucht MSW**, auch nachdem der Server/Ansicht-Split steht. Props-Split und MSW sind damit für die Detailseite **beide** nötig, nicht alternativ.

### Pattern 3: MSW nur für echte Client-Fetches
**What:** `msw-storybook-addon` initialisiert einen Service Worker im Browser, der `fetch`-Aufrufe abfängt, bevor sie das Netzwerk verlassen.
**When to use:** Für Komponenten, die selbst (nicht über Props) `lib/api`-Funktionen aufrufen — im Pilot-Scope konkret: `WatchlistAddButton.tsx:3,6,51` (`getWatchlistEntry`), `AppShellClientWrapper.tsx:6,101` (`getOwnProfile`, für den Rollen-Umschalter).
**Example:**
```typescript
// Source: https://storybook.js.org/addons/msw-storybook-addon (verifiziert per npm view, Peer-Deps korrekt für SB 10)
// frontend/.storybook/preview.tsx
import { initialize, mswLoader } from 'msw-storybook-addon'
initialize({ onUnhandledRequest: 'bypass' })   // bypass: unbekannte Requests laufen durch statt die Story stumm zu blockieren

const preview: Preview = {
  loaders: [mswLoader],
  parameters: { msw: { handlers: [/* zentrale Default-Handler */] } },
}
```
Zentrale Handler-Datei (z. B. `frontend/.storybook/mocks/handlers.ts`) analog zu den bereits in `lib/api/*` liegenden Endpunktpfaden (`/api/v1/anime`, `/api/v1/me`, `/api/v1/watchlist/:animeID` — exakte Pfade aus den jeweiligen `api/*.ts`-Dateien übernehmen, nicht neu raten).

### Pattern 4: Rollen-Simulation über echten Session-Store, nicht über erfundenen Context
**What:** `useAuthSession()` (`frontend/src/lib/useAuthSession.ts:38`) liest `getAuthSessionSnapshot()` aus `@/lib/api` — das ist ein **globaler, Browser-seitiger Token-Store** (localStorage-gestützt, `client.ts:291-319`), kein React Context. Es gibt keinen `AuthProvider`, den man im Storybook-Decorator mit einem Fake-Wert umhüllen könnte.
**When to use:** Jede Story, die zwischen anonym/Mitglied/Fansub-Lead/Plattform-Admin umschalten soll.
**Konkreter, bereits im Projekt existierender Mechanismus (aus Tests übernehmbar, kein Neubau):**
```typescript
// Source: frontend/src/lib/useAuthSession.test.tsx:5,8-14 — echte, im Projekt
// bereits genutzte Test-Helfer, kein Decorator-Eigenbau nötig
import { persistAuthSession, clearAuthSession } from '@/lib/api'

persistAuthSession({
  token_type: 'Bearer', access_token: 'storybook-access', access_token_expires_at: 9999999999,
  access_token_expires_in: 3600, refresh_token: 'storybook-refresh',
  refresh_token_expires_at: 9999999999, refresh_token_expires_in: 7200,
  user_id: 1, app_user_id: 1, display_name: 'Demo Mitglied', session_id: 'storybook-session',
})
```
Ein Decorator ruft `persistAuthSession(...)` (oder `clearAuthSession()` für "anonym") passend zum gewählten Storybook-Toolbar-Global auf, **und** der MSW-Handler für `GET /api/v1/me` liefert passend dazu `account_global_roles: ['platform_admin']` bzw. `['member']` usw. (`frontend/src/types/profile.ts:126` — Feldname verifiziert). Beide Teile (Token-Store + MSW-Antwort) müssen zur gewählten Rolle passen, sonst zeigt `AppShellClientWrapper` (Zeile 101-136) einen inkonsistenten Zustand.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| `next/navigation`-Mock für Stories | eigener `vi.mock`/Decorator um `useRouter` | `parameters.nextjs.appDirectory` + `@storybook/nextjs/navigation.mock` | Bereits im installierten Framework enthalten (`@storybook/nextjs` 10.6.5) — Eigenbau wäre Duplikat |
| Netzwerk-Mocking im Browser | eigener `fetch`-Monkey-Patch oder globaler `vi.stubGlobal('fetch', ...)` | `msw` + `msw-storybook-addon` | Service-Worker-Ebene fängt auch Fetches aus tief verschachtelten Client-Komponenten ab, ohne jede Komponente einzeln zu patchen |
| Rollen-/Session-Simulation | neuer `AuthProvider`/React-Context nur für Storybook | `persistAuthSession`/`clearAuthSession` aus `@/lib/api` (bereits für echte Tests genutzt, `useAuthSession.test.tsx:5`) | Zweite Quelle der Wahrheit für Auth-Zustand würde echtes von simuliertem Verhalten entkoppeln |
| Render-Smoke-Test | eigenes Playwright-Skript, das jede Story-URL abklappert | `@storybook/test-runner` | Löst dasselbe Problem bereits vollständig (Story-Discovery, Fehler-Erkennung, JUnit/CI-Ausgabe), inkl. Jest-Runner-Integration |
| Pagination-Fix | zusätzliche Laufzeit-Prüfung ("ist `hrefForPage` eine Funktion? dann werfen") | Funktion aus der Prop-Signatur entfernen (URL-Muster-String) | Macht den Fehlerzustand typsystemisch unmöglich statt ihn nur zur Laufzeit abzufangen — robuster und weniger Code |

**Key insight:** Die größte Fehlerquelle in diesem Auftrag wäre, Infrastruktur nachzubauen, die `@storybook/nextjs` schon mitbringt (Router-Mock) oder bestehende Test-Helfer zu duplizieren (Auth-Session), statt sie wiederzuverwenden.

## Common Pitfalls

### Pitfall 1: AppShell-Story crasht nicht beim Build, sondern beim Rendern
**What goes wrong:** `npm run build-storybook` (Teil des heutigen Quality-Gates, siehe `docs/FRONTEND_ARCHITEKTUR.md:219`) meldet Erfolg, obwohl die Story im Browser sofort abstürzt.
**Why it happens:** Webpack kompiliert `useRouter()`-Aufrufe problemlos; der Fehler ("invariant: AppRouterContext missing" o.ä.) tritt erst beim tatsächlichen React-Render im Browser auf, wenn kein Router-Kontext vorhanden ist.
**How to avoid:** `parameters.nextjs.appDirectory: true` setzen (Pattern 1) UND einen echten Render-Test (`@storybook/test-runner`) einführen, der genau diese Lücke zwischen "baut" und "rendert fehlerfrei" schließt.
**Warning signs:** Jede Story, deren Komponente (oder eine Kind-Komponente) `next/navigation`-Hooks importiert, ohne dass die Story-/Preview-Parameter das ausdrücklich adressieren.

### Pitfall 2: "Functions cannot be passed directly to Client Components" ist KEIN Fehler, den Storybook je selbst reproduziert
**What goes wrong:** Die Erwartung, der neue Render-Test würde diesen konkreten Next.js-RSC-Fehler als Regression fangen, wenn jemand `hrefForPage` versehentlich wieder einführt.
**Why it happens:** Dieser Fehler entsteht ausschließlich in Next.js' echter Server/Flight-Serialisierung beim SSR eines Requests — Storybook (Webpack-Builder, kein `experimentalRSC`) führt diese Serialisierung nie aus; Komponenten werden dort immer rein client-seitig gerendert. Ein `Pagination`-Story mit einer Inline-Funktion als Prop rendert in Storybook ohne jeden Fehler.
**How to avoid:** Die Regressionssicherung muss auf Typebene ansetzen (Funktion aus der Prop-Signatur entfernen, siehe Pagination-Fix unten) und/oder über einen echten Request gegen den laufenden Next.js-Server (der im Auftrag ohnehin per `curl` auf Port 3000 verlangte Nachweis — dieser sollte als automatisierter Check, nicht nur als einmaliger manueller Beleg, erhalten bleiben, z. B. ein kleiner Smoke-Check, der `/anime`, `/archiv`, `/members/ranking` gegen den laufenden Dev-Server abruft und auf Statuscode 200 statt 500 prüft).
**Warning signs:** Jede Prop, die als Typ eine Funktion (`(x) => y`) trägt und von einer `async`-Serverkomponente an eine `'use client'`-Komponente weitergegeben wird.

### Pitfall 3: `frontend_node_modules` ist ein geteiltes Docker-Named-Volume — `npm install` auf dem Host reicht nicht automatisch
**What goes wrong:** Neue Dev-Dependencies werden in `package.json`/`package-lock.json` eingetragen, aber der laufende `team4sv30-storybook`-Container sieht sie nicht.
**Why it happens:** `docker-compose.override.yml:72` mountet für `team4sv30-storybook` das Named Volume `frontend_node_modules:/app/node_modules` — dasselbe Volume wie für `team4sv30-frontend` (`override.yml:53`). Dieses Volume wird nur beim allerersten Anlegen aus dem Image befüllt; spätere `package.json`-Änderungen aktualisieren es nicht automatisch.
**How to avoid:** Nach dem Hinzufügen von `msw`/`msw-storybook-addon`/`@storybook/test-runner` entweder `docker compose exec team4sv30-storybook npm install` (installiert direkt ins laufende Volume) oder `docker compose build team4sv30-storybook team4sv30-frontend` + Neustart, je nachdem was der Planer als saubereren Weg vorsieht. Live-Nachweis (laut `CLAUDE.md`/`AGENTS.md` Pflicht für UI/Infra-Änderungen) sollte beide betroffenen Services (`frontend`, `storybook`) abdecken, da sie dasselbe Volume teilen.
**Warning signs:** `Cannot find module 'msw'`/`msw-storybook-addon` beim Starten von Storybook trotz korrekt committeter `package.json`.

### Pitfall 4: `npx msw init` muss den Service-Worker-Pfad zu `staticDirs` passend ablegen
**What goes wrong:** MSW fängt im Browser keine Requests ab, weil `mockServiceWorker.js` nicht unter der von Storybook servierten Static-Root liegt.
**Why it happens:** `main.ts:34` setzt `staticDirs: ['../public']` — das ist bereits `frontend/public`. `npx msw init public --save` (im Verzeichnis `frontend/` ausgeführt) legt die Datei exakt dorthin.
**How to avoid:** Init-Befehl im `frontend/`-Arbeitsverzeichnis ausführen (nicht Repo-Root), Ergebnis committen (`frontend/public/mockServiceWorker.js`).
**Warning signs:** Browser-Konsole zeigt `[MSW] Mocking enabled` nicht, oder 404 auf `/mockServiceWorker.js`.

## Code Examples

### Pagination-Fix: Funktion durch URL-Muster-String ersetzen
```typescript
// Vorher — frontend/src/components/ui/Pagination.tsx:14-29 (Ausschnitt)
interface PagesModeProps {
  mode?: 'pages'
  currentPage: number
  totalPages: number
  onPageChange?: (page: number) => void
  hrefForPage?: (page: number) => string   // <- nicht RSC-serialisierbar
  linkComponent?: ElementType              // <- serialisierbar (Referenz auf 'use client'-Export), NICHT die Fehlerursache
  className?: string
}

// Nachher — Vorschlag (Planer entscheidet endgültige Form)
interface PagesModeProps {
  mode?: 'pages'
  currentPage: number
  totalPages: number
  onPageChange?: (page: number) => void
  /** URL-Muster mit "{page}"-Platzhalter statt Callback — reiner Datenwert,
   *  über die Server/Client-Grenze serialisierbar. Beispiel: "/anime?letter=A&page={page}" */
  hrefPattern?: string
  linkComponent?: ElementType
  className?: string
}

// In PagesPagination: navProps baut die URL selbst
function navProps(page: number) {
  return hrefPattern
    ? { href: hrefPattern.replace('{page}', String(page)), as: linkComponent }
    : { onClick: () => onPageChange?.(page) }
}
```
Aufrufer-Anpassung Beispiel (`frontend/src/app/anime/page.tsx:123-128`):
```typescript
// Vorher (Zeile 126): hrefForPage={(page) => buildAnimeListPageHref(page, {...})}
// Nachher: Muster einmal bauen (reiner String, kein Callback)
const paginationHrefPattern = buildAnimeListPageHref('{page}', { letter, perPage, contentType, status })
// ...
<Pagination currentPage={...} totalPages={...} hrefPattern={paginationHrefPattern} linkComponent={Link} />
```
`buildAnimeListPageHref` (`frontend/src/app/anime/animeListPageHref.ts:5-15`) nimmt bereits `page: number`, akzeptiert aber auch `'{page}'` als String-Literal für `String(page)` — Signatur müsste ggf. auf `page: number | string` erweitert werden; identisches Vorgehen für `buildArchivUrl` (`archiv/page.tsx:232-241`) und die Inline-Funktion in `members/ranking/page.tsx:91`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `@storybook/test-runner` als einzige Render-Test-Option | `@storybook/addon-vitest`/Vitest-Addon als offiziell empfohlener Nachfolger | seit Storybook 9/10-Zyklus | Für dieses Projekt nicht direkt nutzbar ohne Wechsel auf `@storybook/nextjs-vite` — siehe Alternativen-Tabelle |
| MSW Node-Interceptor (für SSR/Jest) | MSW Browser-Service-Worker (`msw/browser`) | mit MSW v2 Architektur-Umbau | Für Storybook (reiner Browser-Kontext) ist der Service-Worker-Pfad der einzig relevante — `msw-storybook-addon` initialisiert genau diesen |
| `npm run build-storybook` als alleiniger CI-Gate | `build-storybook` + `test-storybook` (Render-Smoke-Test) | dieser Auftrag | Schließt die in Pitfall 1 beschriebene Lücke zwischen "baut" und "rendert fehlerfrei" |

**Deprecated/outdated:** `@storybook/test-runner` gilt laut Storybook-Team als "superseded" durch die Vitest-Addon-Linie — bleibt aber für Webpack-Setups wie dieses die einzige offiziell weiter unterstützte Option (`storybook ^10.0.0` Peer-Dep aktuell, 0.26.0 ist kein EOL-Release).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `msw ^2.x` ist die stabilere Wahl gegenüber dem sehr neuen `msw@3.x` | Standard Stack | Falls `msw@3` bereits ausgereift ist, verzichtet das Projekt unnötig auf Verbesserungen; umgekehrtes Risiko (Instabilität) ist bei falscher Einschätzung höher |
| A2 | Alle drei neuen Pakete (`msw`, `msw-storybook-addon`, `@storybook/test-runner`) sind legitim (kein Slopsquatting) | Package Legitimacy Audit | `slopcheck` konnte nicht laufen; Einschätzung stützt sich nur auf GitHub-Org-Reputation + Downloadzahlen, nicht auf eine dedizierte Anti-Hallucination-Prüfung |
| A3 | `@storybook/test-runner` kann containerfähig gegen den bereits laufenden `team4sv30-storybook`-Dienst (statt gegen einen separat gestarteten `storybook-static`-Server) gefahren werden | Standard Stack / Architecture Patterns | Falls der Quality-Gate-Lauf isoliert (ohne laufenden Compose-Stack) erfolgen soll, braucht es doch die `concurrently`/`http-server`/`wait-on`-CI-Variante aus der offiziellen Doku |
| A4 | Die vom Auftrag behauptete Zahl "ca. 16" Server-Seiten mit Datenabruf ist eine grobe Schätzung, keine exakte Zählung | Summary / Bestand | Die hier reproduzierte Heuristik (`grep` auf fehlendes `'use client'` + vorhandenes `await`) fand 23 Treffer bei 49 `page.tsx`-Dateien gesamt — beide Zahlen sind Heuristiken, keine manuell verifizierte Liste; der Planer sollte bei Bedarf die exakte Liste je Seite neu ziehen, bevor er die "49 Seiten"-Migration über diesen Auftrag hinaus plant |

**Risikohinweis zu A1/A2:** Diese beiden Annahmen betreffen direkt zu installierende Produktionsabhängigkeiten (auch wenn nur `devDependencies`) — der Planer sollte sie vor dem ersten `npm install` explizit vom Nutzer bestätigen lassen (`checkpoint:human-verify`), nicht nur als Forschungsnotiz stehen lassen.

## Open Questions

1. **Soll `hrefPattern` komplett ersetzen oder als zusätzliche, abwärtskompatible Option neben `hrefForPage` eingeführt werden?**
   - What we know: Alle drei aktuellen Aufrufer (`anime`, `archiv`, `members/ranking`) sind Server-Komponenten und müssten ohnehin umgestellt werden — es gibt aktuell **keinen** Aufrufer, der `hrefForPage` aus einer Client-Komponente heraus nutzt (kurze Prüfung: alle drei Fundstellen liegen in `page.tsx`-Dateien ohne `'use client'`).
   - What's unclear: Ob es weitere, von dieser Recherche nicht erfasste Aufrufer von `Pagination` mit `mode="pages"` gibt, die auf `hrefForPage` angewiesen sind (eine vollständige `grep -rn "hrefForPage" frontend/src` vor der Umsetzung ist Pflicht, diese Recherche hat nur die drei im Auftrag genannten Seiten geprüft).
   - Recommendation: Vor dem PLAN-Schritt eine vollständige Grep-Suche nach allen `Pagination`-Konsumenten mit `mode="pages"` fahren, um sicherzustellen, dass kein vierter Aufrufer übersehen wird.

2. **Seiten-1-URL-Verhalten nach dem Pattern-Wechsel:** `buildArchivUrl` (Zeile 238) lässt `page=1` bewusst weg, ein festes `hrefPattern` mit `{page}`-Platzhalter würde `page=1` explizit in die URL schreiben (kosmetischer Unterschied, keine Funktionsänderung).
   - What we know: Funktional äquivalent (Backend/Frontend interpretieren fehlenden und expliziten `page=1`-Parameter identisch, da `Math.max(1, ...)`/Default-Werte das auffangen).
   - What's unclear: Ob der Nutzer Wert auf die bisherige "saubere" URL ohne `page=1` legt (SEO/Lesbarkeit).
   - Recommendation: Im Discuss/Plan-Schritt kurz ansprechen; falls gewünscht, kann `Pagination` selbst `page=1` aus dem finalen Href wegtrimmen, ohne die Grundidee (Muster-String statt Funktion) aufzugeben.

3. **Soll der automatisierte Live-Nachweis für den Pagination-Fix (curl auf Port 3000) Teil der Quality-Gate-Pipeline werden oder bleibt er ein einmaliger manueller UAT-Schritt?**
   - What we know: Der Auftragstext verlangt sowohl einen Live-Nachweis per curl/Log als auch "Test bzw. Render-Prüfung, die das künftig fängt" — und Pitfall 2 zeigt, dass die Storybook-Render-Prüfung diesen spezifischen Fehlertyp nicht abdecken kann.
   - What's unclear: Ob der Planer einen zusätzlichen automatisierten Smoke-Test gegen den echten laufenden Next.js-Dev-Server (z. B. ein kleines Skript/E2E-Test, das `/anime`, `/archiv`, `/members/ranking` abruft und auf HTTP 200 statt 500 prüft) als Teil dieses Auftrags vorsieht.
   - Recommendation: Separat vom Storybook-Render-Test einplanen, da es ein eigenständiger Prüfmechanismus mit anderer Angriffsfläche ist (echter Next.js-Server, nicht Storybook-iframe).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Compose (`team4sv30-storybook`) | Storybook-Dev-Server, Port 6006 | ✓ | Service vorhanden (`docker-compose.yml:226`, Override `docker-compose.override.yml:61-72`) | — |
| Playwright + Chromium (System-Deps) | `@storybook/test-runner` | ✓ (im Image, nicht im Bind-Mount-Volume) | `playwright 1.55.0`, `npx playwright install --with-deps chromium` bereits in `frontend/Dockerfile:39` | Bei Bedarf erneut `npx playwright install --with-deps chromium` im laufenden Container ausführen, falls das Named Volume die Browser-Binaries nicht persistiert |
| `pip`/`pip3` (für `slopcheck`) | Package-Legitimitätsprüfung dieser Recherche | ✗ | — | Alle drei neuen Pakete bleiben `[ASSUMED]`, Planer muss `checkpoint:human-verify` vor jedem Install setzen |
| npm-Registry-Zugriff (`npm view`) | Versionsverifikation | ✓ | — | — |

**Missing dependencies with no fallback:** keine — `pip`/`slopcheck` hat einen dokumentierten Fallback (Assumed-Markierung + Checkpoint).

**Missing dependencies with fallback:** `pip`/`slopcheck` (siehe oben).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `^3.2.4` (`frontend/package.json`), Config `frontend/vitest.config.ts` (globals, jsdom via Setup, Alias `@`) |
| Config file | `frontend/vitest.config.ts` (bestehend); neu hinzu: `frontend/.storybook/test-runner` braucht **kein** eigenes Vitest-Config, da es Jest-basiert ist (`@storybook/test-runner` nutzt intern Jest, nicht Vitest — eigenständige Laufzeit, keine Kollision mit `vitest.config.ts`) |
| Quick run command | `npx vitest run src/app/anime/animeListPageHref.test.ts` (bestehender Test als Beispiel) |
| Full suite command | `npm test` (= `vitest run`, bereits in `package.json` Scripts) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| (kein REQUIREMENTS.md-Eintrag, Quick-Task) | `AppShell`-Story rendert ohne Router-Fehler | Render-Smoke-Test (Playwright via test-runner) | `npx test-storybook --url http://127.0.0.1:6006 -- -t "AppShell"` | ❌ Wave 0 (Package + Konfiguration fehlen) |
| — | Alle Stories rendern fehlerfrei (Regressions-Gate) | Render-Smoke-Test | `npx test-storybook --url http://127.0.0.1:6006 --ci` | ❌ Wave 0 |
| — | `/anime`, `/archiv`, `/members/ranking` liefern HTTP 200 statt 500 nach Pagination-Fix | Integration/Smoke gegen echten Next.js-Server | `curl -s -o /dev/null -w "%{http_code}" http://192.168.235.196:3000/anime` (manuell belegt) + ggf. automatisiertes Pendant (siehe Open Question 3) | ⚠️ nur manueller curl-Nachweis vorgesehen, kein automatisiertes Pendant im Bestand |
| — | `AnimeListView`/`AnimeDetailView` rendern mit Fixture-Props (normal/leer/Fehler/viele/lange Titel/fehlende Bilder) | Component/Story | Storybook-Stories selbst sind der Test (visuell + Render-Smoke) | ❌ Wave 0 (Komponenten existieren noch nicht gesplittet) |

### Sampling Rate
- **Per task commit:** `npm run typecheck && npm test -- --run <betroffene Testdateien>` (bestehendes Muster im Projekt)
- **Per wave merge:** `npm run build-storybook && npx test-storybook --url http://127.0.0.1:6006 --ci`
- **Phase gate:** Volle Suite grün (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build-storybook` + `test-storybook`) vor Abschluss

### Wave 0 Gaps
- [ ] `npm install --save-dev @storybook/test-runner msw msw-storybook-addon` + `npx msw init public --save` — Pakete fehlen komplett
- [ ] `frontend/.storybook/preview.tsx` — `parameters.nextjs.appDirectory`, MSW-`initialize()`/`mswLoader`, Rollen-Decorator fehlen
- [ ] `frontend/.storybook/mocks/handlers.ts` (oder ähnlich) — zentrale MSW-Handler-Datei existiert noch nicht
- [ ] `package.json` Script `"test-storybook": "test-storybook"` fehlt
- [ ] Docker-Volume-Refresh (`frontend_node_modules`) nach Paket-Installation — kein automatisierter Schritt im Bestand, muss im Plan als expliziter Befehl stehen (Pitfall 3)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | nein (Storybook-Rollen-Decorator simuliert nur UI-Zustände, keine echte Auth-Prüfung) | — |
| V3 Session Management | eingeschränkt ja | `persistAuthSession`/`clearAuthSession` nutzen den bereits gehärteten, bestehenden localStorage-Mechanismus — keine neue Session-Logik, nur Wiederverwendung in Decorators |
| V4 Access Control | nein | Storybook-Stories sind ein Dev-Werkzeug, keine produktive Autorisierungsgrenze |
| V5 Input Validation | nein (keine Nutzereingaben in diesem Auftrag) | — |
| V6 Cryptography | nein | — |

### Known Threat Patterns für diesen Stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| MSW-Handler/Fixtures mit echten Produktionsdaten versehentlich eingecheckt | Information Disclosure | Nur erfundene/anonymisierte Demo-Daten in Fixtures (analog `FansubHeroSection.stories.tsx`s `demo@team4s.de`-Mustern) — keine echten Nutzer-E-Mails/Namen/Tokens aus der Live-DB kopieren |
| Storybook-Container exponiert echte Backend-URLs/Tokens über Build-Args | Information Disclosure | `docker-compose.override.yml` setzt bereits `NEXT_PUBLIC_AUTH_ISSUE_DEV_MODE: "true"` für den Storybook-Dienst — unverändert lassen, keine echten Produktions-Secrets in Storybook-spezifische `.env`/Build-Args einfügen |

## Sources

### Primary (HIGH confidence)
- `frontend/.storybook/main.ts`, `preview.tsx` — direkt gelesen, Bestand verifiziert
- `frontend/package.json` — Versionen aller bestehenden Storybook-/Test-Pakete
- `frontend/src/components/ui/Pagination.tsx`, `frontend/src/app/anime/page.tsx`, `frontend/src/app/anime/[id]/page.tsx`, `frontend/src/app/archiv/page.tsx`, `frontend/src/app/members/ranking/page.tsx` — exakte Fundstellen für Fehlerursache
- `frontend/src/lib/useAuthSession.ts`, `frontend/src/lib/useAuthSession.test.tsx` — Session-Store-Mechanismus und bereits existierender Test-Helfer
- `frontend/Dockerfile`, `docker-compose.yml`, `docker-compose.override.yml` — Container-Setup, Playwright-Vorinstallation, Named-Volume-Mechanik
- `npm view @storybook/test-runner@latest`, `npm view msw-storybook-addon@latest`, `npm view msw versions` — Registry-Verifikation der empfohlenen Pakete
- Lokal ausgeführt: `npx storybook build` (bestätigt: heutiger Build läuft fehlerfrei durch)

### Secondary (MEDIUM confidence)
- [Storybook für Next.js — offizielle Doku](https://storybook.js.org/docs/get-started/frameworks/nextjs) — `appDirectory`, Navigation-Mocking, `experimentalRSC`-Limitierungen
- [Storybook Vitest-Addon-Doku](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index) — Next.js-Vite-Anforderung
- [Storybook Test-Runner-Doku/Repo](https://github.com/storybookjs/test-runner) — CI-Rezept, Jest/Playwright-Basis

### Tertiary (LOW confidence)
- WebSearch-Ergebnisse zu `msw-storybook-addon`-Release-Daten (Veröffentlichungsdatum 2026-09-15 für v3.0.1-3.0.3) — nicht durch eine zweite Quelle gegengeprüft, aber durch `npm view`-Peer-Dependency-Angaben plausibilisiert

## Metadata

**Confidence breakdown:**
- Bestand/Fehlerursache (Pagination, AppShell-Crash, Framework-Wahl): HIGH — jede Aussage per Datei:Zeile oder lokalem Befehl verifiziert
- Standard Stack (msw/msw-storybook-addon/test-runner Versionen): MEDIUM — Registry-verifiziert, aber `slopcheck` fehlte (siehe Package Legitimacy Audit)
- RSC-Serialisierungsgrenze (Pitfall 2, Kernargument gegen "Storybook fängt RSC-Fehler"): MEDIUM — aus verifizierten Fakten (Webpack-Builder, kein `experimentalRSC`, offizielle Doku zu dessen Limitierungen) abgeleitete Schlussfolgerung, nicht wörtlich so in einer einzelnen Quelle zitiert; Planer sollte diese Annahme vor Umsetzung kurz gegenprüfen (z. B. durch einen bewussten Testlauf mit absichtlich wiedereingeführtem Funktions-Prop)

**Research date:** 2026-11-02
**Valid until:** ~30 Tage (Storybook/MSW-Ökosystem bewegt sich schnell; Versionsangaben vor Umsetzung erneut per `npm view` prüfen, falls die Umsetzung sich verzögert)
