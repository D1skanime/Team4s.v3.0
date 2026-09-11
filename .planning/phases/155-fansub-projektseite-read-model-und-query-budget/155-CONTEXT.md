# Phase 155: Public-Fansub-Projektseite: Read-Model, Drill-down-Navigation und Query-Budget — Context

**Gathered:** 2026-09-11
**Status:** Ready for planning
**Source:** `155-USER-REQUEST.md` (verbindliche Auftragsquelle, vom Nutzer als Ersatz für eine interaktive discuss-phase-Sitzung bereitgestellt)

<domain>
## Phase Boundary

Phase 152 hat die öffentliche **Gruppenseite** (`/fansubs/[slug]`) konsolidiert, Phasen 153/154 das
öffentliche **Member-Profil**. Phase 155 nimmt sich die dritte öffentliche Fläche vor: die
**Fansub-Projektseite** `/fansubs/[slug]/fansubprojekt/[animeSlug]` und ihre beiden Drill-downs
(Projekt-Member, Release-Detail).

Phase 155 ist eine **Read-Model-, Datenfluss-, API- und Performance-Phase**. Kein UI-Redesign.
Die sichtbaren Informationen und die Informationsarchitektur (Hero, Projektgeschichte, Mitwirkende,
neuestes Release, Release-Historie, Projekt-Navigation/Backlinks) bleiben erhalten; auch der Block
„Neuestes Fansub-Release" bleibt ausdrücklich bestehen.

Sechs Workstreams:

- **A — Project Resolver (P1):** `groupSlug + animeSlug` auflösen, ohne das vollständige Public
  Fansub Profile zu laden, und ohne es im Loader ein zweites Mal zu ziehen.
- **B — Contributor Summary (P1):** die Projektseite lädt pro Mitwirkendem nur sichtbare
  Übersichtsfelder; Texte, Medien, Beteiligungen bleiben der Projekt-Member-Seite vorbehalten.
- **C — Drill-down-Navigation:** jeder Member-Klick im Projektkontext führt kanonisch auf
  `/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]`, nie direkt auf
  `/members/[memberSlug]`.
- **D — Release-Datenpfade (P1/P2):** überlappende Release-Projections entflechten; Latest-Preview,
  Historie (Cursor) und Counts sauber trennen; `per_page: 100` als Vollinventar-Abfrage entfernen.
- **E — Nicht gerenderte Daten (P2):** Themes-, Release-Media- und Flag-Fetches ohne sichtbaren
  Consumer nicht mehr initial laden.
- **F — Messung, Tests, Abgrenzung:** Vorher/Nachher-Messung des Request-/Query-Budgets, Backend-
  und Frontend-Tests, Edge-Cases, Security-/Visibility-Grenzen unverändert.

**Explizit KEIN Umsetzungsziel:** visuelles Redesign der Projektseite, Neubau der Projekt-Member-
Seite, großer Umbau der Release-Detailseite, neue Rollen, Duplizierung von Member-Texten/Medien,
neue Content-Tabellen nur für Anzeigezwecke, Entfernen der globalen Member-Profile, RCA-04 aus
Phase 154.
</domain>

<decisions>
## Implementation Decisions

### Workstream A — Project Resolver (P155-01, P155-02)

- **Belegter Ist-Zustand:** `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx`
  ruft `getPublicFansubProfileBySlug(fansubSlug)` auf und sucht in `profile.projects` das Projekt
  mit passendem `anime_slug`, nur um `animeID` zu bekommen. Anschließend startet
  `loadPublicFansubProjectPageData()` in
  `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` über `profilePromise` einen
  **zweiten** Vollabruf desselben Profils (für `canonicalProjectPath` und
  `buildFansubProjectNavigation`). Das ist der doppelte Profil-Load aus dem Auftrag.
- Ein **gezielter Resolver** liefert aus `groupSlug + animeSlug` mindestens `groupID`, `animeID`,
  Projekt-Identität und kanonische Slugs/Pfad. Previous/Next-Projekt dürfen mitkommen, wenn sie
  ohne nennenswerte Zusatzlast aus derselben Abfrage fallen — sonst getrennt.
- Bevorzugt wird eine **bestehende Repository-/Handler-Grenze erweitert** statt eine parallele
  Struktur zu bauen. Der existierende Slug-Einstieg ist
  `GET /api/v1/fansub-slugs/:slug/public-profile` (`fansubHandler.GetFansubPublicProfileBySlug`);
  ein Resolver gehört fachlich in dieselbe Nachbarschaft.
- Nicht akzeptabel: Vollprofil nur zur ID-Auflösung, komplettes Gruppenprofil als Resolver,
  Doppelabfrage derselben Profile-Projection.
- Backend-Änderungen halten **Go-DTO, `shared/contracts/openapi.yaml`, `frontend/src/types/` und
  `frontend/src/lib/api.ts` in Parität** (bestehende Projektkonvention).

### Workstream B — Contributor Summary (P155-03, P155-04)

- **Belegter Ist-Zustand:** `getGroupContributors(animeID, groupID)` liefert laut
  `frontend/src/types/groupContributors.ts` bereits eine schlanke Projection
  (`member_id`, `member_display_name`, `member_slug`, `member_avatar_url`, `role_labels`,
  `is_verified`). Die Verschlankung ist damit auf der Contract-Ebene möglicherweise **schon
  erfüllt** — zu prüfen ist die SQL-Seite in
  `backend/internal/repository/group_contributors_repository.go` (Joins, N+1, Rollenauflösung) und
  ob irgendwo pro Member nachgeladen wird.
- Ein **Negativbefund ist ein zulässiges Ergebnis**: wenn die Projection bereits bounded und
  join-arm ist, wird das gemessen und dokumentiert, statt eine neue `ProjectContributorSummary`-
  Struktur nur deshalb einzuführen, weil der Auftrag sie beispielhaft nennt.
- Verbindlich bleibt die **Regel**: auf der Projektseite keine Member-Texte/Notes, keine
  Media-Galerie, keine Media-Assets, keine vollständige Release-Beteiligungsliste, keine
  Contribution-Historie, keine globale Member-Historie/Memberships, keine Profil-Badges, keine
  Stories, kein vollständiges Public Member Profile — weder heute noch als Folge dieser Phase.
- Kein Request-Fan-out pro Member. Der Contributor-Block wächst höchstens linear in der
  **Payload**, nie in der **Request-Anzahl**.

### Workstream C — Drill-down-Navigation (P155-05, P155-06)

- **Belegter Ist-Zustand:** `frontend/src/components/fansubs/ProjectMemberRows.tsx` baut
  `${projectPath}/mitwirkende/${member_slug}` und fällt **nur ohne `canonicalProjectPath`** auf
  `/members/[slug]` zurück (dort als „D-03" kommentiert). Da `canonicalProjectPath` heute aus dem
  doppelten Profil-Load stammt, muss Workstream A ihn weiterhin verlässlich liefern — sonst kippt
  die Verlinkung still auf das globale Profil.
- Zu prüfen sind zusätzlich: Contributor-Nennungen im Latest-Release-Block
  (`PublicReleaseBlock`/`LatestReleaseSection`), Release-Zeilen/-Karten (`OlderReleasesList`) und
  alle weiteren Member-Nennungen im Projektkontext.
- Das globale Profil `/members/[slug]` bleibt erreichbar — als **sekundäre** Navigation auf der
  Projekt-Member-Seite, nicht als primäres Klickziel aus dem Projekt.
- Ein Test sichert die Regel ab („Member-Klick führt auf die Project-Member-Route, nicht auf
  `/members/`").

### Workstream D — Release-Datenpfade (P155-07, P155-08, P155-09)

- **Belegter Ist-Zustand** in `projectPageData.ts`: `getGroupReleases(animeID, groupID,
  { per_page: 100 })` (inkl. eines zweiten Versuchs im `catch`), zusätzlich
  `getGroupReleaseListCursor(..., { limit: 1 })` für das neueste Release, dann
  `getGroupReleaseDetail(...)` für dessen Details, und clientseitig lädt `OlderReleasesList` die
  Historie noch einmal per Cursor.
- **Belegter Konsum der 100er-Liste:** `ReleasesSection` nutzt `episodes` ausschließlich als
  `episodes.length === 0`-Gate; `HeroSection` nutzt `releaseEpisodes.length` als `releaseCount` und
  reicht die Liste an die Episodenanzeige weiter (`groupAssetsResponse.data.episodes` +
  `releaseEpisodes`). Der tatsächliche Bedarf ist also **Count + Episoden-Zuordnung**, nicht die
  Vollliste — genau das ist vor dem Umbau festzustellen und zu belegen.
- Zielbild: **Latest Release Preview** (gezielte Projection), **Release History** (cursor-basiert,
  bounded), **Counts/Aggregate** (Count- bzw. Query-Metadaten statt Vollliste). Unterschiedliche
  Projections (`LatestReleasePreview`, `ReleaseHistoryItem`) sind erlaubt und erwünscht; kein
  Universal-DTO.
- `per_page: 100` wird entfernt **oder** — falls ein sichtbarer Consumer die Vollliste wirklich
  braucht — im Abschlussbericht zwingend begründet und auf ein bounded Verhalten gebracht.
- Das Request-/Query-Verhalten darf nicht proportional zur Gesamtzahl aller Releases wachsen.

### Workstream E — Nicht gerenderte Daten (P155-10)

- **Belegter Ist-Zustand:** `loadPublicFansubProjectPageData()` lädt `getGroupThemes()` und
  `getGroupReleaseMedia()` und berechnet `hasThemes`/`hasMedia`/`hasTeamContent`/`storyAvailable`.
  `ProjectPage.tsx` rendert weder `ThemesSection` noch `MediaSection` und konsumiert `hasThemes`,
  `hasMedia` und `hasTeamContent` nicht; eine repo-weite Suche findet als Consumer nur fremde
  Flächen (`admin/fansubs/[id]/edit/ReleaseRowDetails.tsx`, `fansubs/[slug]/page.tsx`) mit eigenen,
  gleichnamigen lokalen Variablen.
- Regel: «No render consumer → no initial fetch.» Entfernte Felder verschwinden auch aus
  `PublicFansubProjectPageData`, damit kein toter Vertrag zurückbleibt.
- `ThemesSection.tsx`/`MediaSection.tsx` bleiben als Komponenten unangetastet, solange sie nicht
  gerendert werden; ihr Verbleib wird im Bericht als bewusste Entscheidung festgehalten (kein
  stiller Komponenten-Löschzug in einer Read-Model-Phase).

### Workstream F — Messung, Tests, Grenzen (P155-11 bis P155-15)

- **Vorher/Nachher-Messung** ist Pflicht und wird als neues Auditdokument unter `docs/audits/`
  abgelegt (Muster: `docs/audits/2026-09-09-public-member-performance/`). Bestehende Messskripte
  unter `frontend/scripts/` sind zu **prüfen und wiederzuverwenden**, wo sie passen, statt neue
  Parallelskripte zu schreiben; ein projektspezifisches Skript ist zulässig, wenn kein passendes
  existiert.
- Zu dokumentieren: Backend-Requests beim initialen Project Load, Repository-/DB-Queries,
  Public-Profile-Requests, Contributor-Requests, Release-Requests, initiale JSON-Größe, TTFB
  (sofern reproduzierbar), Verhalten bei vielen Contributors und bei vielen Releases.
- **Contributor-Lasttest** mit 30–50 Mitwirkenden (viele Beteiligungen, mehrere Notes, viele
  Media-Uploads): die Projektseite darf dadurch keine Member-Detaildaten nachladen.
- **Backend-Tests:** Resolver, Slug-Auflösung, Not-found-Semantik, Contributor-Summary (keine
  Detaildaten im Contract), Release-Summary/Cursor, bounded-query-Test wo sinnvoll.
  Go-Tests laufen im `golang:1.25-alpine`-Container am `team4s_default`-Netz.
- **Frontend-Tests:** Projektseiten-Rendering, Contributor-Liste, Member-Klickziel, Latest-Release-
  Preview, Release-Historie, Empty States, Previous/Next-Navigation. Bestehende Project-Member-
  Tests müssen weiterlaufen. `vitest`/`tsc`/`eslint` laufen im Frontend-Container.
- **Security/Visibility:** Resolver und Summary liefern ausschließlich öffentliche Informationen;
  keine internen Rollen/Permissions, keine versteckten Member-Daten, keine privaten Texte/Medien,
  bestehende Visibility-Filter werden nicht umgangen, sauberes Not-found-Verhalten.
- **Schema-Disziplin:** keine neue Tabelle, keine Materialisierung nur für bequeme UI-Abfragen.
  Indizes nur mit Query-Plan-Beleg, nicht blind. Falls eine Migration doch nötig ist: neu,
  reversibel nummeriert, nach dem bestehenden append-only-Modell.
</decisions>

<canonical_refs>
## Canonical References

**Routen (Frontend)**
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx` — Pretty-Route, heutige
  Slug-Auflösung über das Vollprofil
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.tsx`
  (+ `page.test.tsx`) — bestehende Projekt-Member-Seite, **nicht neu bauen**
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.tsx`
  (+ `page.test.tsx`) — Release-Drill-down, muss funktionsfähig bleiben
- `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` — numerische Altroute auf denselben Loader

**Read-Model / Komposition**
- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` (487 Zeilen) — zentraler Loader
- `frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx` — was tatsächlich gerendert wird
- `frontend/src/app/anime/[id]/group/[groupId]/sections/` — `HeroSection`, `StorySection`,
  `TeamSection`, `ReleasesSection`, `OlderReleasesList*`, `BacklinksSection`, sowie die nicht
  gerenderten `ThemesSection`/`MediaSection`
- `frontend/src/components/fansubs/ProjectMemberRows.tsx` — Member-Verlinkung
- `frontend/src/components/fansubs/PublicReleaseBlock.tsx` — Latest-Release-Darstellung
- `frontend/src/lib/fansubProjectRoutes.ts`, `frontend/src/lib/fansubProjectNavigation.ts`,
  `frontend/src/lib/groupNavigation.ts`
- `frontend/src/lib/api.ts` — `getPublicFansubProfileBySlug`, `getGroupDetail`, `getGroupReleases`,
  `getGroupReleaseListCursor`, `getGroupReleaseDetail`, `getGroupContributors`, `getGroupThemes`,
  `getGroupReleaseMedia`, `getGroupProjectNote`, `getGroupAssets`
- `frontend/src/types/groupContributors.ts`, `frontend/src/types/group.ts`

**Backend**
- `backend/cmd/server/main.go` — Routenregistrierung (`/fansub-slugs/:slug/public-profile`,
  `/anime/:id/group/:groupId/contributors`, Release- und Theme-/Media-Routen)
- `backend/internal/handlers/` — Fansub-Public-Profile-, Group-Public- und Release-Handler
- `backend/internal/repository/` — Contributors-, Release- und Fansub-Profil-Repositories
- `shared/contracts/openapi.yaml` — Vertrag, muss mit neuen/geänderten Endpunkten mitwandern

**Referenzmuster aus Vorphasen**
- `docs/audits/2026-09-09-public-member-performance/REPORT.md` und `153-AFTER.md` — Aufbau und
  Detailgrad einer Vorher/Nachher-Messung
- Phase 152 (`.planning/phases/152-*/`) — Konsolidierung der öffentlichen Gruppenseite, gleiche
  Nachbarschaft
- `frontend/scripts/audit-public-member-*.mjs`, `frontend/scripts/shot.mjs` — vorhandene
  Messinfrastruktur
</canonical_refs>

<specifics>
## Specific Ideas

- Der Resolver muss den `canonicalProjectPath` weiterhin liefern — er ist Voraussetzung für die
  Member-Verlinkung (Workstream C) **und** für `buildFansubReleaseHref`. Wer ihn wegoptimiert,
  bricht still beide Drill-downs.
- Previous/Next-Projekt wird heute aus `profile.data.projects` gebaut. Wenn der Resolver das
  ersetzt, braucht er eine geordnete, bounded Projektliste bzw. Nachbar-Auflösung — der Fall
  „erstes/letztes Projekt der Liste" ist Teil der Edge-Case-Tests.
- `getGroupReleases` wird im Fehlerfall ein zweites Mal aufgerufen (verschachteltes `try/catch`);
  bei einem dauerhaft fehlschlagenden Backend verdoppelt das die Last. Der Umbau räumt das mit auf.
- `withFallback()` verschluckt heute jeden Fehler still. Wer Fetches entfernt, darf die
  Degradationssemantik der verbleibenden Zweige nicht verändern.
- Die numerische Altroute `/anime/[id]/group/[groupId]` teilt sich den Loader mit der Pretty-Route.
  Änderungen am Loader müssen beide Einstiege bedienen; sie hat keinen `groupSlug` im Pfad.
</specifics>

<deferred>
## Deferred Ideas

- Vollständige Untersuchung der **Release-Detailseite** (`/releases/[releaseVersionId]`) — eigene
  spätere Phase, hier nur Funktionserhalt.
- `/media`-Route ohne Range-Header (bekannter Backlog-Punkt aus Phase 154, bricht das Springen in
  Videos) — nicht Teil dieser Phase.
- Entfernen oder Reaktivieren von `ThemesSection`/`MediaSection` als Produktfunktion.
- RCA-04 aus Phase 154 (unreproduzierter Chrome-Tab-Absturz) bleibt offen.
</deferred>

<scope_fence>
## Scope Fence

**In scope**
- Project Resolver für `groupSlug + animeSlug` ohne Vollprofil-Load
- Beseitigung des doppelten Public-Profile-Loads im Project-Request
- Prüfung/Verschlankung der Contributor-Projection inkl. SQL-Seite
- Kanonische Member-Verlinkung auf die Projekt-Member-Route im gesamten Projektkontext
- Entflechtung der Release-Datenpfade (Latest / History / Counts), Entfernen von `per_page: 100`
- Entfernen initialer Fetches ohne sichtbaren Consumer (Themes, Release-Media, tote Flags)
- Vorher/Nachher-Messung, Backend-/Frontend-Tests, Edge-Cases, Contributor-Lasttest
- Vertragsparität Go-DTO ↔ OpenAPI ↔ TS-Typen ↔ `api.ts`

**Out of scope**
- Visuelles Redesign der Projektseite oder Entfernen des Blocks „Neuestes Fansub-Release"
- Neubau der Projekt-Member-Seite, großer Umbau der Release-Detailseite
- Neue Tabellen, Materialisierungen oder Duplikate von Member-Texten/Medien
- Neue Rollen, neue Rechte, Änderungen an Visibility-Regeln
- Entfernen des globalen Member-Profils `/members/[slug]`
- Blinde Index-Migrationen ohne Query-Plan-Beleg
- Beschleunigungsversprechen ohne Messbeleg
</scope_fence>
