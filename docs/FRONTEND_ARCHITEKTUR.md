# Frontend-Architektur

Technischer Überblick über das Team4s-Frontend (Next.js App Router) — Build, Datenfluss, Routing, API-Anbindung, Komponenten-System und Konventionen.

## Inhaltsverzeichnis

1. [Überblick](#1-überblick)
2. [Gesamtarchitektur und Datenfluss](#2-gesamtarchitektur-und-datenfluss)
3. [Verzeichnisstruktur](#3-verzeichnisstruktur)
4. [Anwendungs-Lebenszyklus](#4-anwendungs-lebenszyklus)
5. [Routing & Navigation](#5-routing--navigation)
6. [Zustandsverwaltung](#6-zustandsverwaltung)
7. [API- und Datenschicht](#7-api--und-datenschicht)
8. [Komponenten-Architektur](#8-komponenten-architektur)
9. [Seiten nach Fachbereich](#9-seiten-nach-fachbereich)
10. [Theming & Styling](#10-theming--styling)
11. [Bilder](#11-bilder)
12. [Hilfsfunktionen und Hooks](#12-hilfsfunktionen-und-hooks)
13. [Build & Tooling](#13-build--tooling)
14. [Typsystem](#14-typsystem)
15. [Anhang: zentrale Entwurfsmuster](#anhang-zentrale-entwurfsmuster)

## 1. Überblick

Das Team4s-Frontend ist eine Next.js-Anwendung im App Router, die als eigener Container im Docker-Compose-Stack läuft und ausschließlich über eine zentrale API-Schicht mit dem Go-Backend spricht. Die Oberfläche ist komplett deutschsprachig (kein i18n-/Locale-System), es gibt keinen globalen State-Container, keine Server-Komponenten-Emulation und keinen Konsolenmodus — die Anwendung ist eine klassische Browser-/SSR-Hybrid-App für den produktiven Admin- und Mitgliederbetrieb.

| Bereich | Aktuelle Umsetzung |
|---|---|
| Build | Next.js 16 (App Router), TypeScript, ESLint 9 |
| UI-Runtime | React 18.3.1 / react-dom 18.3.1 |
| State | Kein globaler Store; Component-State + fetch, wenige schmale React-Contexts |
| Routing | Next.js App Router, Dateisystem-Routen unter `src/app/` |
| HTTP-Client | Zentraler Client in `src/lib/api/client.ts`, Barrel-Export über `src/lib/api.ts` |
| Auth | Cookie-basierte Browser-Session, Keycloak-Refresh-Orchestrierung zentral im API-Client |
| Styling | CSS-Module pro Komponente + globale Design-Tokens in `src/styles/globals.css` |
| Komponenten-System | Verbindliche globale Primitives unter `src/components/ui` |
| Bilder | `next/image` mit expliziter Pattern-Allowlist, Fallback über `ResponsiveImage` |
| Tests | Vitest 3, Tests laufen im Docker-Container |
| Dev-Port | `3000` (Docker-Compose-Mapping `3000:3000`) |

## 2. Gesamtarchitektur und Datenfluss

```
┌─────────────┐        HTTPS/HTTP        ┌──────────────────────────────┐
│   Browser   │ ───────────────────────▶ │  Next.js App Router (SSR +   │
│  (Client)   │ ◀─────────────────────── │  Client-Komponenten)         │
└─────────────┘                          └──────────────────────────────┘
       │  fetch über src/lib/api.ts                      │
       │  (Cookie-Session, kein Bearer in Komponenten)    │  Proxy-/Stream-Routen
       ▼                                                  │  unter src/app/api/*,
┌──────────────────────────────┐                          │  src/app/covers/*,
│  src/lib/api/client.ts       │                          │  src/app/media/*
│  getApiBaseUrl():            │ ◀────────────────────────┘
│  - Browser → NEXT_PUBLIC_    │
│    API_URL (127.0.0.1:8092)  │
│  - SSR     → API_INTERNAL_   │
│    URL (team4sv30-backend:   │
│    8092)                     │
└──────────────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Go-Backend (Gin)             │
│  /api/v1/*, /health, /media   │
└──────────────────────────────┘
```

Typischer Datenfluss für eine Admin-Seite:

1. Der Browser ruft eine App-Router-Route auf (z. B. `/admin/anime/[id]/edit`).
2. Next.js rendert die Server-Komponente zuerst; falls die Seite SSR-Daten benötigt (z. B. `/anime/[id]`, `/watchlist`), liest sie Cookies serverseitig und ruft das Backend über `API_INTERNAL_URL` auf.
3. Im Browser übernehmen Client-Komponenten (`'use client'`) die interaktive Logik und rufen Hilfsfunktionen aus `src/lib/api.ts` auf.
4. `src/lib/api/client.ts` bestimmt die Basis-URL kontextabhängig (`getApiBaseUrl()`), hängt die Session-Cookies/Bearer-Header zentral an und sendet den Request.
5. Für normale JSON-Requests geht der Call entweder direkt an das Backend (Browser → `NEXT_PUBLIC_API_URL`) oder über eine Next.js-Proxy-/Stream-Route (z. B. Episoden-Playback, Segment-Streaming, Cover-Varianten), wenn serverseitige Umformung, Byte-Range-Handling oder Dateisystemzugriff nötig ist.
6. Das Backend antwortet mit JSON oder Binärdaten; der zentrale Client parst Fehlerantworten einheitlich (`parseApiErrorPayload`, `ApiError`) und löst bei Bedarf einen einmaligen Token-Refresh plus Retry aus.
7. UI-Komponenten erhalten nur fertige Daten oder typisierte Fehler und aktualisieren ausschließlich lokalen Komponenten-State oder die wenigen schmalen Contexts.

## 3. Verzeichnisstruktur

```
frontend/src/
├── app/                     # App-Router-Routen (Dateisystem-Routing)
│   ├── admin/               # Admin-Bereich (anime, fansubs, groups, roles, …)
│   ├── anime/                # öffentliche Anime-Detail-/Übersichtsseiten
│   ├── api/                  # Route-Handler: Proxy, Auth, Streaming
│   ├── archiv/                # Archiv-Ansichten
│   ├── claim-invitations/     # Einladungs-Claim-Flow
│   ├── covers/                 # Cover-Datei-/Display-Varianten-Routen
│   ├── dev/                    # UI-System-Showcase (/dev/ui-system)
│   ├── episodes/               # öffentliche Episodenansichten
│   ├── fansubs/                 # öffentliche Fansub-/Gruppenseiten
│   ├── invitations/             # Einladungsverwaltung
│   ├── login/                   # Login-Einstieg (Keycloak)
│   ├── media/                    # direkter Dateisystem-Mediaserver
│   ├── me/                        # Mitgliederbereich (Dashboard, Profil, Projekte)
│   ├── members/                    # öffentliche Mitgliederlisten
│   ├── suche/                       # Suche
│   ├── watchlist/                    # Watchlist (SSR-Grenze)
│   └── layout.tsx                    # Root-Layout
├── components/              # Fach- und UI-Komponenten
│   ├── ui/                   # globale, fachlogikfreie Primitives
│   ├── auth/                  # Gates/Guards (PlatformAdminGate, …)
│   ├── layout/                 # App-Shell, Navigation-Wrapper
│   └── admin/ anime/ fansubs/ … # domänenspezifische Komponenten
├── lib/                      # API-Client, Hilfsmodule, Bild-Pattern
│   └── api/                   # modulare API-Helfer (admin, fansubs, episodes, …)
├── types/                     # Domain-Typen (anime.ts, fansub.ts, …)
├── hooks/                      # zentrale, feature-übergreifende Hooks (nur 4 Dateien)
├── providers/                    # schmale React-Contexts (RoleCatalogProvider)
├── styles/                        # globals.css mit Design-Tokens
└── test/                           # Test-Setup (axeSetup.ts)
```

## 4. Anwendungs-Lebenszyklus

**Start:** `src/app/layout.tsx` ist eine asynchrone Server-Komponente. Sie setzt `lang="de"`, importiert `@/styles/globals.css` genau einmal, lädt serverseitig den Rollenkatalog (`listRoleDefinitions()` für die Kontexte `fansub_group`, `anime_contribution`, `group_history`) und reicht das Ergebnis an `RoleCatalogProvider` weiter. Zusätzlich werden `LocalhostCanonicalRedirect` (Canonical-Host-Redirect) und `AuthSessionSwitchGuard` (Erkennung von Session-/Nutzerwechsel) vor dem eigentlichen Inhalt gerendert, bevor `AppShellClientWrapper` die Client-Navigation und Seiteninhalte übernimmt.

**Request-Ablauf (SSR vs. Browser):** Jede Route entscheidet implizit über `getApiBaseUrl()` in `src/lib/api/client.ts`, welche Backend-Adresse verwendet wird:

- Serverseitig (SSR-Seiten wie `/watchlist`, `/anime/[id]`, Root-Layout) wird `API_INTERNAL_URL` verwendet und über `normalizeInternalApiBaseUrl()` normalisiert — ein veralteter Hostname `backend` wird dabei auf `team4sv30-backend` umgeschrieben, damit Container-interne Aufrufe im Compose-Netzwerk zuverlässig auflösen.
- Im Browser wird `NEXT_PUBLIC_API_URL` (`http://127.0.0.1:8092`) über `getBrowserApiBaseUrl()` aus `src/lib/publicApiUrl.ts` verwendet.

Diese Trennung verhindert, dass Server- und Client-Code denselben internen Docker-Hostnamen verwenden müssen, der im Browser nicht aufgelöst werden könnte.

## 5. Routing & Navigation

Routing folgt vollständig dem Next.js-App-Router-Dateisystem unter `src/app/`. `src/app/admin/layout.tsx` ist bewusst **kein** Permission-Gate — es ergänzt nur die Admin-Hauptnavigation (`AdminMainNav`). Jede Admin-Seite bindet ihr eigenes `PlatformAdminGate` individuell ein.

**Wichtige Hauptrouten:**

| Route | Zweck |
|---|---|
| `/` | Startseite |
| `/anime`, `/anime/[id]` | öffentliche Anime-Übersicht/-Detail |
| `/episodes` | öffentliche Episodenansicht |
| `/fansubs`, `/fansubs/[id]` | öffentliche Fansub-/Gruppenseiten |
| `/members` | öffentliche Mitgliederliste |
| `/suche` | Suche |
| `/watchlist` | Watchlist (SSR-Seitenrenderung mit Cookie-Lesung) |
| `/login` | Keycloak-Login-Einstieg |
| `/invitations`, `/claim-invitations` | Einladungs-Workflow |
| `/me/dashboard` | Mitglieder-Dashboard |
| `/me/profile` | eigenes Profil |
| `/me/contributions` | eigene Beiträge |
| `/me/projects/[animeId]/group/[fansubGroupId]` | Projektarbeitsfläche je Anime/Gruppe |
| `/admin/anime`, `/admin/anime/create`, `/admin/anime/[id]/edit` | Anime-Verwaltung (manuell + Jellyfin-Import) |
| `/admin/anime/[id]/episodes/[episodeId]/edit`, `.../versions`, `.../import` | Episodenverwaltung je Anime |
| `/admin/episode-versions/[versionId]/edit` | zentraler Release-/Episoden-Versions-Editor |
| `/admin/episodes` | Episodenübersicht |
| `/admin/fansubs`, `/admin/fansubs/create`, `/admin/fansubs/[id]/edit`, `/admin/fansubs/[id]/reviews/[reviewId]`, `/admin/fansubs/merge` | Fansub-Verwaltung |
| `/admin/groups` | Gruppenverwaltung |
| `/admin/changes`, `/admin/claims` | Änderungs-/Claim-Verwaltung |
| `/admin/users/[id]` | Nutzerverwaltung |
| `/admin/roles`, `/admin/role-capabilities` | Rollen-/Rechte-Verwaltung |
| `/admin/tags-genres` | Taxonomie-Verwaltung |
| `/admin/profile` | Admin-Eigenprofil |
| `/dev/ui-system`, `/admin/dev/ui-system` | UI-System-Showcase (öffentlich bzw. admin-gescoped) |

**Guards/Rechte:** `PlatformAdminGate` (`src/components/auth/PlatformAdminGate.tsx`) ist eine Client-Komponente. Sie liest `useAuthSession()` (`hasAccessToken`, `hasRefreshToken`, `isClientInitialized`) aus `src/lib/useAuthSession.ts`, ruft bei vorhandener Session `getCurrentUser()` auf und zeigt inline einen "Anmeldung erforderlich"- oder Fehlerzustand, solange kein berechtigter Nutzer ermittelt ist. Da jede Admin-Seite ihr eigenes Gate einbindet, gibt es keinen zentralen Middleware-Schutz auf Routenebene — die Autorisierung entsteht konsequent pro Seite plus serverseitiger Backend-Durchsetzung.

**Retired Route:** `/me/releases/[versionId]/workspace` existiert nicht mehr als eigene Arbeitsfläche. `frontend/next.config.mjs` baut über `buildReleaseEditorRedirects()` aus `src/lib/releaseEditorRedirects.mjs` einen permanenten Redirect auf `/admin/episode-versions/:versionId/edit`. Der restliche Mitgliederbereich (`/me/dashboard`, `/me/profile`, `/me/contributions`, `/me/projects/[animeId]/group/[fansubGroupId]`) bleibt vollständig bestehen.

## 6. Zustandsverwaltung

Es gibt keinen globalen Store (kein Redux, kein Zustand, keine vergleichbare Bibliothek). Der Normalfall ist lokaler Komponenten-State kombiniert mit direkten Aufrufen der API-Helfer aus `src/lib/api.ts`. Darüber hinaus existieren einige wenige, bewusst schmal gehaltene React-Contexts:

- `src/providers/RoleCatalogProvider.tsx` — app-weiter Context, wird im Root-Layout um den gesamten Baum gelegt. Er wird serverseitig durch `listRoleDefinitions()` für die Kontexte `fansub_group`, `anime_contribution`, `group_history` vorbefüllt und stellt zusammengeführte Rollenoptionen bereit, ohne dass jede Seite den Katalog erneut laden muss.
- `src/app/admin/anime/hooks/useAnimeContext.ts` plus `components/AnimeContext/` — ein Context, der ausschließlich auf das Anime-Edit-Studio begrenzt ist.
- `src/lib/animeGridContext.ts`, `src/lib/useMemberViewer.ts` — seitengebundene Helfer-Hooks, keine Provider im React-Sinn.

Diese Zurückhaltung ist bewusst: generische UI-States (Lade-/Fehlerzustände) bleiben lokal in der jeweiligen Komponente, fachlicher Cross-Cutting-State bleibt auf die wenigen Fälle begrenzt, in denen mehrere Geschwisterkomponenten denselben Katalog brauchen.

## 7. API- und Datenschicht

`src/lib/api.ts` ist ein schlanker Barrel (34 Zeilen), der ausschließlich re-exportiert — aus `./api/client` sowie aus feature-spezifischen Modulen wie `./api/admin/anime-core`, `./api/admin/anime-jellyfin`, `./api/fansubs-core`, `./api/episodes`, `./api/members`, `./api/releases`, `./api/media`, `./api/auth`, `./api/permissions`, `./api/reviews`, `./api/history`, `./api/search`, `./api/watchlist`, `./api/comments` usw. Die eigentliche Logik liegt in `src/lib/api/client.ts`.

**Zentrale Verantwortung des Clients:** Seit Phase 49 ist `src/lib/api.ts`/`client.ts` der alleinige Eigentümer der normalen Browser-API-Authentifizierung. Fach-Code (Seiten, Komponenten, Hooks) konsumiert ausschließlich tokenfreien Auth-State und zentrale Helfer — er liest, speichert, übergibt oder konstruiert keine Bearer-Token selbst. Konkret verantwortet der Client:

- Auth-Cookies und Laufzeit-Metadaten (Zugriffstoken, Refresh-Token, Anzeigename) über den einzigen Schreib-/Löschpfad `writeBrowserCookie`, der die `Secure`-Eigenschaft protokollabhängig setzt (`https:` → `Secure` auch bei Löschung, lokales `http:` → ohne `Secure`, damit lokale Entwicklung unter `127.0.0.1` funktioniert).
- Keycloak-Refresh-Orchestrierung über `refreshKeycloakToken`, mit genau einem In-Flight-Refresh-Promise, das parallele Requests teilen.
- proaktive Prüfung der Token-Frische vor geschützten Requests sowie zentrale Bearer-Header-Anheftung.
- genau einen Retry für auth-bezogene `401`-Antworten, wenn Retry aktiviert ist.
- Upload-Preflight-Refresh und Bearer-Anheftung für XHR-Uploads (für Fortschritts-Events), z. B. `uploadFansubMedia`, `uploadAdminAnimeMedia`, `uploadAdminReleaseThemeAsset(ForRelease)`, `uploadReleaseVersionMedia`, `uploadSegmentAsset`, `uploadOwnProfileAvatar` — diese nutzen aktuell nur Preflight-Refresh ohne automatischen Replay nach einem Upload-`401`.
- Auth-State-Broadcasts und lokale Session-Bereinigung bei Logout.

UI-Code gated stattdessen nur über `useAuthSession()` (`hasAccessToken`, `hasRefreshToken`, `isClientInitialized`) und behandelt lokale Lade-/Fehler-/Disabled-Zustände selbst. Ein gültiger Refresh-Token allein gilt bereits als aktive Session, da Keycloak-Zugriffstoken kurzlebig sind — der zentrale Client refresht transparent vor dem eigentlichen Request. Verbotene Muster in normalem App-Code sind unter anderem `getRuntimeAuthToken`/`getRuntimeRefreshToken`, direkte Cookie-Namen-Konstanten, `document.cookie`-Zugriffe, `localStorage`/`sessionStorage`-Token-Reads, manuelle `Authorization: Bearer`-Konstruktion und doppelte XHR-Header-Logik; `src/lib/api.no-token-boundary.test.ts` setzt diese Grenze automatisiert durch, mit separaten Allowlists für den zentralen Client selbst, Keycloak-PKCE-Helfer, `/login`, SSR-Seiten und Streaming-Routen.

Keycloak ist ausschließlich für Identität und Token-Lifecycle verantwortlich (Login, OIDC-Token, Session-Ende). Team4s-eigene Domänen-Autorisierung (App-User, globale Rollen, Fansub-Mitgliedschaft, Release-/Medien-Capabilities) kommt ausschließlich vom Backend; das Frontend darf Domänen-Rechte nicht aus Keycloak-Rollen oder JWT-Claims ableiten.

**Basis-URL-Auflösung:** `getApiBaseUrl()` unterscheidet Browser (`NEXT_PUBLIC_API_URL` → `http://127.0.0.1:8092`) und Server (`API_INTERNAL_URL` → `http://team4sv30-backend:8092`, normalisiert über `normalizeInternalApiBaseUrl()`, die den veralteten Hostnamen `backend` korrigiert).

**Proxy- und Stream-Routen unter `src/app/api/`, `src/app/covers/`, `src/app/media/`:**

| Route | Zweck |
|---|---|
| `src/app/api/v1/[...path]/route.ts` | generischer Catch-All-Proxy (`proxyBackendApiRequest`), mit Sonderzweig für `media/files/:filename`-Anzeigevarianten via `serveImageDisplay` |
| `src/app/api/admin/asset-proxy/route.ts` | Admin-Asset-Proxy |
| `src/app/api/admin/upload-cover/route.ts` | Cover-Upload-Proxy |
| `src/app/api/auth/keycloak/logout/route.ts`, `.../token/route.ts` | Keycloak-Auth-Grenzen |
| `src/app/api/episodes/[id]/play/route.ts` | Episoden-Playback-Relay |
| `src/app/api/releases/[id]/stream/route.ts` | Release-Streaming-Relay |
| `src/app/api/segments/[id]/stream/route.ts` | Segment-Streaming-Relay |
| `src/app/covers/[file]/route.ts` | Rohe Cover-Datei (`resolveCoverFilePath`) |
| `src/app/covers/display/[file]/route.ts` | größenangepasste Anzeigevariante über `serveImageDisplay` |
| `src/app/media/[...path]/route.ts` | direkter Dateisystem-Mediaserver (`MEDIA_BASE_PATH`), mit Byte-Range-Unterstützung für Video-Streaming |

Jellyfin- und andere Streaming-Routen gelten explizit als serverseitige Stream-Relay-Grenzen und als öffentliche, auth-freie Fetches klassifiziert, wenn sie keine Auth-Informationen senden — beides bewusst getrennt von der zentralen Browser-Session-Logik.

## 8. Komponenten-Architektur

Die globale UI-Schicht liegt vollständig unter `src/components/ui` und ist laut Projektregel verbindlich: Jede neutextliche, fachlogikfreie UI muss diese Primitives verwenden — ein handgebautes natives `<select>`, `<input>`, `<textarea>` oder `<button>` für einen Fall, den `@/components/ui` bereits abdeckt, ist verboten. Die Primitiv-Definitionen selbst dürfen native Elemente kapseln; das ist die einzige Ausnahme. ESLint (`frontend/eslint.config.mjs`, Regel `no-restricted-syntax`) warnt aktuell bei nativen Ersatzformen und wird nach Migration der Altfälle auf `error` angehoben.

**Grundregel des UI-Systems:** Generische UI wird zentral gebaut, Fachlogik bleibt in Domain-Komponenten. Globale Komponenten dürfen keine Anime-/Fansub-/Release-spezifischen Regeln, keine API-Aufrufe, keine Permission-Checks, keine Keycloak-Logik und keine domänenspezifische Query-/Routing-Logik enthalten. Vor jedem neuen generischen Style gilt die verbindliche Prüfreihenfolge: (1) Gibt es bereits eine globale Komponente? (2) Gibt es eine passende Variante? (3) Reicht eine kleine Erweiterung? (4) Ist der Fall wirklich domänenspezifisch? Nur wenn 1–3 "nein" und 4 "ja" ergeben, darf neuer lokaler Stil für generische Darstellung entstehen.

**Verfügbare Primitives** (`src/components/ui/index.ts`): `Accordion`, `AvatarStack`, `ActionBar`, `AccentRule`, `AdjacentNavigation`, `ActivationStatusIndicator`, `Badge`, `Button`, `Card`, `ConfirmDialog`, `DatePicker`, `Drawer`, `DisclosureIndicator`, `EmptyState`, `ErrorState`, `FormField`, `FocalCarousel`, `HeroMetrics`, `ArtworkHero`, `Input`, `LoadingState`, `MediaSlot`, `Modal`, `NavArrow`, `PageHeader`, `Pagination`, `SectionHeader`, `Select`, `Switch`, `Table`, `Tabs`, `Textarea`, `ThumbnailStrip`, `Toolbar`, `UploadDropzone`, `UploadFileRow`, `YearPicker`, `SortableList`, ergänzt um `ResponsiveImage` (direkt importiert, nicht im Barrel) und das gemeinsame Hilfsmodul `classNames.ts`.

Wichtige Varianten-Entscheidungen: `Button` kennt `primary` (Cobalt-Farbfamilie), `secondary` (Slate), `danger` (Wine), `success` (Petrol), zusätzlich `ghost`/`subtle`, Größen `sm`/`md`/`lg`, `loading` und `iconOnly`. `Card` kennt `default`, `elevated`, `interactive`, `compact`, `section`, `flat`, `nested`, `nestedFlat`. `Table` kennt `default`, `compact`, `selectable`, `withActions` plus `TableEmptyState`. `Badge` kennt `neutral`, `success`, `warning`, `danger`, `info`, `muted`. `PageHeader` ist bewusst stärker als `SectionHeader`. `AdjacentNavigation` ist der globale Standard für fachliche Vorher/Nachher-Navigation (Projekt-, Release-, Sequenznavigation), nicht für Seitennummern. `DisclosureIndicator` ist das globale Öffner-Symbol für aufklappbare Zeilen/Listen/Karten. `AvatarStack` zeigt überlappende Identitäten mit `+N`-Overflow, optional als zugänglicher Button. `HeroMetrics` vereinheitlicht Kennzahlen in Hero-Flächen (Bezeichnung oben dunkel, Wert darunter blau), inklusive einer kompakten `inline`-Variante.

Globale Komponenten bleiben varianten-begrenzt: Ist ein neuer Fall mit einer vorhandenen Variante lösbar, wird keine neue Variante ergänzt; ergibt ein Fall nur für ein einzelnes Fachfeature Sinn, gehört er nicht unter `src/components/ui`. Lokale Styles bleiben erlaubt für fachliche Speziallayouts, komplexe Domain-Grids, einmalige Sonderfälle und hochspezifische Editor-/Media-/Story-Kompositionen — sie sind aber nicht mehr die erste Wahl für Standard-Buttons, -Cards, -Badges, -FormFields, -Header oder -EmptyStates.

**Showcase/Referenz:** `src/app/dev/ui-system/page.tsx` (öffentliche Referenzseite) und `src/app/admin/dev/ui-system/` (admin-gescopte zweite Showcase) dienen ausschließlich der visuellen Prüfung, Design-Iteration, Komponenten- und Kompositions-Review sowie späteren Referenzmigrationen — sie sind explizit kein Produktfeature und nicht API-, auth- oder permission-gebunden.

## 9. Seiten nach Fachbereich

**Öffentlich:** Startseite, Anime-Übersicht/-Detail (`/anime`, `/anime/[id]`), Episoden (`/episodes`), Fansub-/Gruppenseiten (`/fansubs`), Mitgliederlisten (`/members`), Suche (`/suche`), Watchlist (`/watchlist`, SSR-Seitenrenderung mit Cookie-Lesung), Login-Einstieg (`/login`), Einladungs-Flow (`/invitations`, `/claim-invitations`).

**Mitgliederbereich (`/me`):** Der Mitgliederbereich existiert weiterhin vollständig und umfasst `/me/dashboard` (persönliches Dashboard), `/me/profile` (eigenes Profil inkl. Avatar/Hintergrund über `MediaSlot`), `/me/contributions` (eigene Beiträge) und `/me/projects/[animeId]/group/[fansubGroupId]` (Projektarbeitsfläche für ein Anime-Gruppen-Paar). Zurückgezogen wurde ausschließlich die engere Unterroute `/me/releases/[versionId]/workspace`: Sie leitet per permanentem Redirect (definiert in `frontend/next.config.mjs`, Kommentar "Phase 181-02 (D-03)", umgesetzt in `src/lib/releaseEditorRedirects.mjs`) auf den fortbestehenden Admin-Editor `/admin/episode-versions/[versionId]/edit` weiter. Query-Strings werden von Next.js automatisch an das Redirect-Ziel weitergereicht.

**Admin — Anime-Verwaltung:** `/admin/anime` mit Übersicht (`AnimeBrowser`-Komponenten), `/admin/anime/create` für die manuelle Neuanlage (`CreatePageStepper.tsx`, AniSearch-Intake- und Duplicate-Decision-Komponenten, `createStagedAssets.ts`, `createAssetUploadPlan.ts`) sowie `/admin/anime/[id]/edit` für die Bearbeitung bestehender Einträge (`AnimeEditPage`, `StudioLayout`, `AnimeContext`). Episodenverwaltung je Anime liegt unter `/admin/anime/[id]/episodes/[episodeId]/edit`, `.../versions` und `.../import` (`EpisodeManager`-Komponenten).

**Admin — Jellyfin-Import:** Die Jellyfin-Intake-UI liegt verteilt über `components/JellyfinIntake/` (Importfluss), `components/JellyfinSync/JellyfinSyncPanel.tsx` (Sync-Steuerung), `create/CreateJellyfinCard.tsx` und `CreateJellyfinResultsPanel.tsx` (Ergebnisdarstellung im Erstellungsfluss) sowie `create/library/` (Bibliotheks-Discovery). Der Import mündet immer in das editierbare Anime-Formular, nie in eine automatische, ungeprüfte Übernahme.

**Admin — Episoden-Versions-Editor:** `/admin/episode-versions/[versionId]/edit` ist der zentrale Release-/Episoden-Versions-Editor (Routenparameter heißt `versionId`, nicht `id`). Er ist in viele kleine, feature-colokierte Dateien aufgeteilt (`EpisodeVersionEditorPage.tsx`, `SegmenteTab.tsx`, `ReleaseVersionMediaSection.tsx`, `ReleaseVersionNotesTab.tsx`, `EpisodeClassificationSection.tsx`, `JellyfinEnrichmentNotice.tsx` u. a.) mit eigenen Hooks wie `useEpisodeVersionEditor.ts`, `useReleaseVersionMedia.ts`, `useSegmentPreviewImageHandlers.ts` — ein Beispiel für die projektweite 450-Zeilen-Modularitätsregel.

**Admin — AniSearch-Import:** In den manuellen Create-Flow integriert (`create/internal`, Duplicate-Decision-Komponenten), kein eigener Top-Level-Pfad.

**Admin — Fansubs/Groups/Rollen:** `/admin/fansubs` (+ `create`, `[id]/edit`, `[id]/reviews/[reviewId]`, `merge`) für Fansub-Verwaltung, `/admin/groups` für Gruppenverwaltung, `/admin/roles` und `/admin/role-capabilities` für Rollen-/Rechteverwaltung, `/admin/tags-genres` für Taxonomie, `/admin/users/[id]` für Nutzerverwaltung, `/admin/changes` und `/admin/claims` für Änderungs- bzw. Claim-Workflows, `/admin/profile` für das Admin-Eigenprofil.

## 10. Theming & Styling

Design-Tokens sind als CSS Custom Properties in `src/styles/globals.css` definiert (`--color-primary`, `--bg-*`, `--text-*`, `--accent-*`, `--avatar-N-bg`/`-fg` u. a.) und werden genau einmal im Root-Layout importiert. `src/lib/cssCustomProperties.ts` (mit begleitendem `.guard.test.ts`) bindet JavaScript-Zugriffe an dieselben CSS-Variablen, um Drift zwischen Token-Quelle und Code zu verhindern.

Komponentenspezifisches Styling liegt pervasiv in colokierten `*.module.css`-Dateien neben der jeweiligen Komponente — dies ist der Normalfall für fachliche Speziallayouts, während Standardelemente (Buttons, Cards, Badges, FormFields, Header, EmptyStates) über die globalen Primitives aus Abschnitt 8 abgedeckt werden, statt erneut lokal gebaut zu werden.

Responsive Layout folgt einem Container-first-Ansatz: Wiederverwendbare/eingebettete Komponenten (Cards, Stages, Carousels) reagieren über `container-type: inline-size` auf ihren verfügbaren Inline-Raum statt auf Viewport-Breakpoints; nur ganze Seiten/App-Shells nutzen Viewport-Media-Queries. Breakpoints werden nach Layoutzweck benannt, nicht nach Geräteklassen (`phone`/`tablet`/`desktop` sind zu vermeiden).

## 11. Bilder

`next.config.mjs` konfiguriert `images.formats: ['image/webp']` sowie explizite `deviceSizes`/`imageSizes`/`qualities: [75, 85]`. Die erlaubten `localPatterns`/`remotePatterns` stammen aus dem gemeinsamen Datenmodul `src/lib/images/publicImagePatterns.mjs` — der Single Source of Truth für erlaubte Bild-Pfade (u. a. `/covers/**`, `/media/anime/**`, `/media/profile/**`, `/media/release-version/**`, `/media/fansub/**`; bewusst **kein** blanker `/media/**`-Wildcard, damit z. B. `/media/admin/**` niemals über den öffentlichen Bild-Endpunkt optimiert/ausgeliefert werden kann). Das Modul ist deliberately framework-/runtime-neutral (keine Node-Builtins), damit es sowohl von `next.config.mjs` (direkt durch Node geladen) als auch von Client-Komponenten importiert werden kann.

`src/components/ui/ResponsiveImage.tsx` kapselt `next/image` und validiert `src` vorab gegen dasselbe Pattern-Modul (`isConfiguredForImageOptimization`), um den SSR-Crash von Next bei nicht migrierten Pfaden zu vermeiden — bei Nichtübereinstimmung fällt die Komponente auf unoptimiertes Rendering zurück, statt die ganze Seite abstürzen zu lassen.

**Upload:** `src/components/ui/MediaSlot.tsx` ist der gemeinsame Upload-Slot für ein einzelnes Bild/Video, gesteuert über Seitenverhältnis und Form, aufgebaut auf `UploadDropzone.tsx`. Er wird für Fansub-Logo/-Banner, das Anime-Asset-Board und Profil-Avatar/-Hintergrund wiederverwendet. `src/hooks/useUploadQueue.ts` kapselt die Warteschlangen-Logik für Multi-File-Upload-Flows, etwa in Media-Review-/Upload-Panels.

**Galerie-/Viewer-Hilfslogik** liegt als reine Helfer-Module vor (keine eigenständigen Komponenten): `src/lib/mediaViewerZoom.ts`, `mediaViewerNavigation.ts`, `mediaViewerMetadata.ts`, `mediaViewerCaptionPanel.ts`.

## 12. Hilfsfunktionen und Hooks

Sechs Dateien liegen im zentralen `src/hooks/`: `useCancellableSlugState.ts`, `useClampedOverflow.ts`, `useDebouncedValue.ts`, `useFansubGroupSearch.ts`, `useNearViewportActivation.ts`, `useUploadQueue.ts` — bewusst begrenzt auf Hooks, die wirklich feature-übergreifend gebraucht werden. `useFansubGroupSearch.ts` kapselt die debounced Fansub-Gruppensuche über Name/Alias (`getFansubList`, 180ms Debounce, Aufrufer-gesteuerter `excludeIds`-Filter); er ist zentral statt feature-colokiert, weil er von zwei unabhängigen Features konsumiert wird — der Release-Editor-Partnergruppen-Auswahl (`useEpisodeVersionEditor.ts`) und ab Phase 191 Plan 07 der Zielgruppen-Auswahl im Mitglieder-Hinweis-Formular. Die große Mehrheit der Hooks ist stattdessen feature-colokiert, zum Beispiel unter `src/app/admin/anime/hooks/` (Anime-Studio) oder direkt im Episoden-Versions-Editor (`src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts`, `useSegmentPreviewImageHandlers.ts`, `useReleaseVersionMedia.ts`, `useEpisodeNeighborNavigation.ts`, `useSegmentContributors.ts`). Diese Aufteilung spiegelt die generelle Konvention: generischer, wiederverwendbarer Code zentralisiert, fachlich gebundener Code bleibt nah an seinem Verwendungsort.

**Wiederverwendbare Bausteine fuer Beitrags-Hinweise (Phase 191, D-02/D-08/D-12):** `src/lib/contributionsEligibility.ts` (`isEligibleForContributions`) ist die EINZIGE Quelle der Berechtigungsregel "Mitgliedsprofil UND echte Projekt-Zuordnung" fuer den gesamten Hinweis-Flow — vor Plan 191-17 lokal in `src/app/me/contributions/page.tsx` definiert, seitdem dort importiert statt dupliziert. `src/components/contributions/ReportHintEntryPoint.tsx` ist der zweite, kontextuelle Einstiegspunkt in dasselbe `ProposalForm` (D-12): ein eligibility-gated, auf `null` fallender dezenter "Fehler melden"-Textlink, gemountet an genau zwei oeffentlichen Stellen — der Projektseiten-Hero (`src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx`) und der Release-Hero (`.../releases/[releaseVersionId]/ReleaseDetailHero.tsx`, dort nur bei genau einer Zielgruppe gemountet — eine Coop-Release mit mehreren Gruppen hat keine eindeutige Zielgruppe fuer einen Hinweis, bewusste Scope-Grenze). Ein kuenftiger dritter Einstiegspunkt sollte diese Komponente wiederverwenden statt eine weitere, dritte Kopie der Eligibility-Pruefung zu bauen. Beide "Hinweis senden"-Einstiegspunkte (`MyProposalsSection.tsx` auf `/me/contributions` und `ReportHintEntryPoint.tsx` auf den oeffentlichen Seiten) teilen seit Plan 191-20 (D-17) dieselbe Regel: `ProposalForm` zeigt seine Erfolgsansicht ("Hinweis gesendet") selbst ueber internen `submittedSummary`-State, deshalb bleibt sie sichtbar, bis der Nutzer aktiv schliesst — beide Aufrufer uebergeben `onSuccess` als No-op und loesen Reload/Unmount ausschliesslich ueber `onClose` aus, niemals als Nebenwirkung eines erfolgreichen Submits. `src/lib/fansubGroupHintStatus.ts` (`hintStatusLabel`/`hintStatusVariant`, Plan 191-23/D-18) ist seit dieser Extraktion die EINZIGE Quelle der fansub_group_hints-Status-zu-Copy/Badge-Variante-Zuordnung — vorher lokal in `FansubGroupHintsAdminClient.tsx` definiert (jetzt dort re-exportiert statt dupliziert), seitdem auch von `MyProposalsSection.tsx`s neuer "An andere Gruppen"-Liste genutzt; verhindert eine zweite, potenziell abweichende Status-Label-Zuordnung fuer dieselbe Datenquelle. `src/components/contributions/ProposalForm.useReleaseOptions.ts` (`useProposalFormReleaseOptions`/`buildReleaseOptionLabel`, Plan 191-33, D-29/D-31/D-34) ist die EINZIGE Datenlade-Stelle fuer "welche Releases hat dieses Projekt bei dieser Gruppe" im Hinweis-Formular — ruft ausschliesslich den oeffentlichen, mitgliedschaftsfreien `getGroupReleaseListCursor`-Endpunkt auf (bei D-29/D-31 bewusst OHNE einen zweiten, admin-gescopten Pfad, anders als D-10s Projektliste, weil der Release-Endpunkt fuer eigene UND fremde Gruppe identisch oeffentlich ist), verwaltet Lade-/Fehlerzustand nach demselben Cancel-Guard-Stil wie `ProposalForm.tsx`s `loadGroupAnime`-Effekt und haelt die aktuell ausgewaehlte Release-Version (Default `null` = "Ganzes Projekt"). Gebaut als geteilte Grundlage fuer die Wizard-Auswahl (Plan 191-34/191-35) UND den vorausgefuellten Kontext-Einstieg, damit keiner der beiden denselben Cursor-Aufruf ein zweites Mal implementiert.

**Pro-Komponente-CSS-Module statt eines geteilten Moduls (Phase 191, D-27):** Die Beitrags-Hinweis-Komponentenfamilie unter `src/components/contributions/` und `src/app/me/contributions/` nutzte bis Plan 191-27 ein einziges, gemeinsames `contributions.module.css` (902 Zeilen, 119 Klassen) — ein Verstoss gegen CLAUDE.md's 450-Zeilen-Limit ohne Ausnahme. Plan 191-27 hat die Datei in 11 komponentenbezogene CSS-Module aufgeteilt (jedes ≤450 Zeilen, max. 225), Plan 191-31 hat alle 12 ehemals importierenden `.tsx`-Dateien auf ihr(e) jeweiliges neues Modul umgestellt. Die meisten Dateien importieren genau EIN eigenes Modul als `styles` (z. B. `AnimeGroupCard.tsx` -> `AnimeGroupCard.module.css`). Zwei Klassenfamilien sind bewusst geteilt und werden per zusätzlichem, aliasiertem Import eingebunden statt ueber einen Cross-Modul-Re-Export: `ContributionCard.module.css` fasst die gemeinsamen "Contribution-Row"-Primitives (`contributionCard`, `contributionCardHeader`, `contributionTitle`, `metaText`, `roleList`, `actionsRow`, `inboxContainer`, ...) zusammen, die neben `ContributionCard.tsx`/`ContributionInbox.tsx` auch `MyProposalsSection.tsx`, `ContributionSummary.tsx` und `AnimeGroupCard.tsx` unter dem Alias `cardStyles` mitverwenden; `RolePicker.module.css` fasst die vom Rollen-Radiogroup-Muster geteilten Klassen (`rolePicker`, `roleChoice`, `roleChoiceActive`) zusammen, die `ProposalForm.toggles.tsx` als `styles` und `ProposalForm.steps.tsx` unter dem Alias `rolePickerStyles` nutzt. Kuenftige Erweiterungen dieser Komponentenfamilie sollten die jeweils passende bestehende Datei fortschreiben statt erneut ein gemeinsames Sammel-CSS-Modul anzulegen.

**`ProposalReleaseSelect.tsx` -- die einzige Markup-Stelle fuer die optionale Release-Auswahl (Phase 191, D-29/D-34):** Plan 191-34 verdrahtet `useProposalFormReleaseOptions` (s. o.) erstmals sichtbar in den Wizard: `ProposalReleaseSelect.tsx` ist eine kleine, rein praesentationelle Komponente (globales `Select`+`FormField`), die "Ganzes Projekt" (Wert `''` -> `onChange(null)`) immer als erste Option zeigt, waehrend eines Ladevorgangs ausschliesslich einen "Wird geladen…"-Platzhalter rendert (nie eine evtl. veraltete Liste des vorherigen Projekts), und fuer BEIDE Gruppen-Szenarien (eigene/fremde Gruppe) identisch verwendet wird -- `Step1GroupProject` (`ProposalForm.steps.tsx`) rendert sie zwischen dem Projekt-Feld und der Kontext-Breadcrumb. Ein kuenftiger Konsument (Plan 191-35s vorausgefuellter Kontext-Einstieg) soll exakt diese Komponente mounten statt die Options-/Lade-Markup ein zweites Mal zu bauen. `ProposalForm.useReleaseSelection.ts` ist ein duenner Wrapper um `useProposalFormReleaseOptions`, der zusaetzlich erzwingt, dass ein Projektwechsel die Release-Auswahl IMMER auf `null` ("Ganzes Projekt") zuruecksetzt (der Basis-Hook selbst tut das bei einem reinen `animeId`-Wechsel nicht automatisch). `ProposalForm.useGroupAnime.ts` wurde im selben Plan rein als Zeilenlimit-Vorbereitung aus `ProposalForm.tsx` extrahiert (unveraenderte Anime/Projekt-Ladelogik je nach `groupScope`, D-10) -- beide neuen Hook-Dateien halten `ProposalForm.tsx`/`.steps.tsx` unter 450 Zeilen, obwohl die Datei bereits bei 447 Zeilen stand, bevor die Release-Auswahl hinzukam.

## 13. Build & Tooling

`frontend/package.json` definiert die Kern-Skripte:

```
dev:       next dev -p 3000
build:     next build
start:     next start -p 3000
lint:      eslint .
test:      vitest run
typecheck: tsc --noEmit
```

Der Entwicklungsserver läuft im Docker-Container; `docker-compose.yml` mappt den Frontend-Container auf Host-Port `3000` (`"3000:3000"`). Tests laufen ebenfalls containerisiert mit Vitest 3; `frontend/vitest.config.ts` setzt den Pfad-Alias `@` auf `src`, schließt Testdateien über das Glob `src/**/*.test.{ts,tsx}` ein und lädt `src/test/axeSetup.ts` als Setup-Datei für Accessibility-Tests (axe).

## 14. Typsystem

Domänentypen liegen zentral unter `src/types/`: `admin.ts`, `admin-capability.ts`, `admin-review-delegation.ts`, `admin-users.ts`, `anime.ts`, `auth.ts`, `comment.ts`, `contributions.ts`, `dashboard.ts`, `domain-projection.ts`, `episodeClassification.ts`, `episodeImport.ts`, `episodeVersion.ts`, `fansub.ts`, `fansubNotes.ts`, `groupAsset.ts`, `groupContributors.ts`, `group.ts`, `mediaAsset.ts`, `media-ownership.ts`, `profile.ts`, `projectMember.ts`, `releaseDetail.ts`, `releaseReviews.ts`, `releaseVersionMedia.ts`, `releaseVersionNotes.ts`, `search.ts`, `watchlist.ts`. Der Pfad-Alias `@` (konfiguriert u. a. in `frontend/vitest.config.ts` und der TypeScript-Konfiguration) erlaubt absolute Importe wie `@/types/anime` oder `@/lib/api` statt relativer Pfadketten.

## Anhang: zentrale Entwurfsmuster

1. **Kein globaler Store:** Fachlicher State lebt in Komponenten oder in wenigen schmalen Contexts (`RoleCatalogProvider`, `useAnimeContext`); es gibt bewusst kein Redux/Zustand-Äquivalent.
2. **Zentraler API-Client als Auth-Grenze:** Nur `src/lib/api/client.ts` darf Token lesen, refreshen oder anhängen; UI-Code gated ausschließlich über `useAuthSession()`.
3. **Kontextabhängige Basis-URL:** `getApiBaseUrl()` unterscheidet SSR (`API_INTERNAL_URL`) und Browser (`NEXT_PUBLIC_API_URL`), inklusive Hostnamen-Normalisierung für das Docker-Compose-Netzwerk.
4. **Manuelle Kontrolle vor Automatik:** Jeder Jellyfin-Import mündet in ein editierbares Formular, nie in eine automatische, ungeprüfte Übernahme in die Datenbank.
5. **Globales UI-System vor lokalem Stil:** Neue generische UI muss zuerst gegen vorhandene `@/components/ui`-Primitives und deren Varianten geprüft werden, bevor lokaler Stil entsteht.
6. **Fachlogikfreie Primitives:** Komponenten unter `src/components/ui` kennen keine Anime-/Fansub-/Release-Regeln, keine API-Calls und keine Permission-Checks — diese Verantwortung bleibt in Domain-Komponenten.
7. **Pro-Seite-Gates statt zentraler Middleware:** `PlatformAdminGate` wird individuell in jede Admin-Seite eingebettet; `admin/layout.tsx` liefert nur Navigation, keinen Schutz.
8. **Single Source of Truth für Bild-Pfade:** `publicImagePatterns.mjs` wird sowohl von `next.config.mjs` als auch von `ResponsiveImage` konsumiert, damit Konfiguration und Laufzeitprüfung nie auseinanderlaufen.
9. **Modularität durch Colocation:** Komplexe Editor-Flächen (z. B. der Episoden-Versions-Editor) werden in viele kleine, eng benannte Dateien mit colokierten Hooks/Tests/Styles aufgeteilt, statt in einer monolithischen Datei zu wachsen.
10. **Permanente Redirects statt Codeverzweigung bei Routen-Rückzug:** Der Rückzug von `/me/releases/[versionId]/workspace` erfolgt als deklarativer `next.config.mjs`-Redirect in einem eigenen, framework-neutralen Modul — nicht als bedingte Logik in der Zielseite.
