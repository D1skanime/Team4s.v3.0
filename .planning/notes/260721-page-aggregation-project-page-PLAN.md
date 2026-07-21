---
phase: page-aggregation-project-page
plan: 02
type: execute
wave: 1
depends_on: []
revision: "v2 — überarbeitet nach Nutzer-Review (siehe <review_response>). Ersetzt v1."
files_modified:
  - backend/internal/handlers/group_project_page_dto.go
  - backend/internal/handlers/group_project_page_handler.go
  - backend/internal/handlers/group_project_page_handler_test.go
  - backend/cmd/server/main.go
  - shared/contracts/openapi.yaml
  - frontend/src/types/projectPageBundle.ts
  - frontend/src/lib/api.ts
  - frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts
  - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/projectPageData.composition.test.ts

# Gesperrte Nutzer-Entscheidungen (NICHT neu verhandeln):
# LD-1: Bundle-Scope = "Kern-Shell" (leichte Sektionen). NACH REVIEW PRÄZISIERT:
#       assets und public_profile sind KEINE leichten Sektionen und gehören NICHT
#       ins Bundle (Begründung im <review_response>). Release-Vorschau-Kette und
#       Media-Bild-Proxy bleiben ebenfalls ausserhalb.
# LD-2: Kein Caching in diesem Schritt — nur strukturelle Aggregation.

user_setup: []

must_haves:
  truths:
    - "LD-1: Ein einziger GET /api/v1/anime/:id/group/:groupId/project-page liefert die LEICHTE Shell (group, anime, contributors, themes, release_media, project_note, anime_fansubs) in EINEM HTTP-Round-Trip."
    - "LD-1: assets (500 Releases + Jellyfin), public_profile, die Release-Vorschau-Kette und der Media-Bild-Proxy sind NICHT im Bundle und laden weiterhin separat/parallel."
    - "LD-2: Der neue Endpunkt fuehrt KEINE Redis-/Cache-Schicht ein."
    - "PERF-GATE: Die 5 optionalen Sektionen werden nach den 2 Gates NEBENLAEUFIG und fehlerisoliert geladen (nicht sequenziell); seq-vs-parallel wird am Checkpoint gemessen, bevor die Ausfuehrungsart endgueltig festgeschrieben wird."
    - "Kein zweiter Profil-Fetch auf dem KANONISCHEN Nutzerpfad: die pretty-Route uebergibt das bereits geladene Profil an den Loader; das Bundle enthaelt kein public_profile."
    - "Feste Bundle-Felder sind Pointer OHNE omitempty (json:\"themes\" etc.), damit eine fehlende Sektion als null serialisiert wird statt zu verschwinden."
    - "Partielle Degradation: schlaegt eine der 5 optionalen Sektionen fehl, liefert das Bundle diese als null statt den Request zu failen."
    - "Harte Gates: group ODER anime not-found -> 404; harter Fehler in group/anime -> 500 (wie loadPublicFansubProjectPageData Phase A heute)."
    - "Bestehende Einzel-Endpunkte bleiben additiv erhalten (kein Breaking Change)."
    - "loadPublicFansubProjectPageData: alle abgeleiteten Flags (hasTeamContent, storyAvailable, hasReleases, hasThemes, hasMedia) und die Rueckgabestruktur bleiben unveraendert."
  artifacts:
    - path: "backend/internal/handlers/group_project_page_dto.go"
      provides: "Bundle-DTO (Pointer-Felder ohne omitempty) + schmale Source-Interfaces"
      contains: "ProjectPageBundle"
    - path: "backend/internal/handlers/group_project_page_handler.go"
      provides: "Aggregierender Handler; Gates seriell zuerst, 5 optionale Sektionen nebenlaeufig+fehlerisoliert"
      contains: "GetProjectPage"
    - path: "backend/internal/handlers/group_project_page_handler_test.go"
      provides: "Test: Komposition + 5 Degradations-Isolationen + beide 404-Gates + 500-Gate"
    - path: "shared/contracts/openapi.yaml"
      provides: "Neuer Pfad + Bundle-Schema (200/400/404/500), referenziert bestehende Komponenten"
      contains: "project-page"
    - path: "frontend/src/types/projectPageBundle.ts"
      provides: "Bundle-Response-Typ aus bestehenden Domaenentypen (nullable Sektionen)"
      contains: "ProjectPageBundle"
    - path: "frontend/src/lib/api.ts"
      provides: "getPublicFansubProjectPage Fetch-Funktion"
      contains: "getPublicFansubProjectPage"
    - path: "frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts"
      provides: "Shell ueber Bundle; Loader akzeptiert optional vorab geladenes Profil"
    - path: "frontend/src/app/anime/[id]/group/[groupId]/projectPageData.composition.test.ts"
      provides: "Neuer Loader-Kompositions-/Degradations-Test (API-gemockt)"
  key_links:
    - from: "frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts"
      to: "/api/v1/anime/:id/group/:groupId/project-page"
      via: "getPublicFansubProjectPage in api.ts"
      pattern: "getPublicFansubProjectPage"
    - from: "backend/internal/handlers/group_project_page_handler.go"
      to: "bestehende Repo-Methoden (GetGroupDetail, GetByID, GetProjectContributors, GetPublicGroupThemes, GetPublicReleaseMedia, GetPublicAnimeFansubProjectNote, ListAnimeFansubs)"
      via: "schmale Source-Interfaces, Repo-Methoden wiederverwendet (NICHT umgeschrieben)"
      pattern: "GetGroupDetail|GetByID|GetProjectContributors"
---

<review_response>
Diese v2 adressiert die Nutzer-Review von v1. Zuordnung Kritikpunkt -> Korrektur:

1. [HOCH] "Sequenziell festgeschrieben, Frontend ist parallel -> Risiko langsamer."
   -> KORRIGIERT. Die 5 optionalen Sektionen laufen jetzt NEBENLAEUFIG (goroutines +
   sync.WaitGroup, per-Sektion Fehlerisolation — bewusst NICHT errgroup, dessen
   Cancel-on-first-error die Isolation braeche). Gates (group, anime) laufen zuerst
   (fail-fast 404). Kritischer Pfad ~ max(gates) + max(optionale) statt Summe.
   Der Checkpoint MISST seq vs. parallel und dokumentiert, bevor etwas final
   festgeschrieben wird. Kein "sequenziell = empfohlen" mehr.

2. [HOCH] "public_profile wird auf der kanonischen Route doppelt geladen; 'kein
   zweiter Fetch' stimmt nicht (page.tsx:24 laedt Profil vor dem Loader)."
   -> KORRIGIERT & im Code verifiziert (page.tsx:24 laedt Profil, uebergibt dem
   Loader nur {animeID, groupID}). public_profile ist NICHT mehr im Bundle. Der
   Loader bekommt ein OPTIONALES vorab geladenes Profil: die pretty-Route reicht
   das bereits geladene Profil durch (kein zweiter Fetch auf dem Primaerpfad); die
   ID-kompatible Route holt das Profil einmalig selbst (separat, parallel zum
   Bundle). Alternative "slugbasierter Bundle-Endpunkt" wurde erwogen und
   zugunsten des weniger invasiven Pass-in verworfen (Begruendung: ein einziger
   ID-basierter Endpunkt, beide Routen bleiben ohne neue Resolver-Logik korrekt).

3. [HOCH] "assets ist schwer (Jellyfin + bis zu 500 Releases, group_assets_handler.go:100)."
   -> KORRIGIERT & verifiziert (buildGroupAssetsPayload ruft GetGroupReleases{PerPage:500}
   + resolveGroupAssets/Jellyfin). assets ist NICHT im Bundle und bleibt wie heute
   ein SEPARATER, parallel laufender Fetch. Ein spaeteres Aufteilen in
   Hero-Asset-Payload + nachladbare Episoden-Assets ist als Folgeschritt notiert,
   nicht Teil dieses Plans.

4. [HOCH] "omitempty entfernt das Feld statt null zu serialisieren."
   -> KORRIGIERT. Bundle-Sektionen sind Pointer OHNE omitempty (json:"themes"),
   sodass nil als null serialisiert wird. Explizit als done-Kriterium in Task 1.

5. [MITTEL] "Geplante Frontendtests passen nicht zu page.test.tsx (kein API-Mock-Loadertest)."
   -> KORRIGIERT. Neue Datei projectPageData.composition.test.ts nach dem
   Release-Detail-Loadertest-Vorbild; page.test.tsx wird nur so weit angefasst,
   wie durch die neue Loader-Signatur noetig.

6. [MITTEL] "Perf-Pruefung nutzt Min von 8 -> verschleiert Ausreisser."
   -> KORRIGIERT. Checkpoint-Methodik: Warm-up + mind. 20 Messungen; Median UND p95
   dokumentiert, getrennt fuer (a) Backend-Bundle-Endpunkt und (b) SSR-TTFB.

Zusaetzliche Planfehler:
- "neun Degradations-Isolationen" -> jetzt korrekt 5 optionale Sektionen (nach
  Ausschluss von assets + public_profile); 2 Gates.
- OpenAPI dokumentierte nur 200/400/404 -> jetzt zusaetzlich 500 (Handler liefert 500).
- YAML-Fallback-Pfad nach 'cd frontend' war falsch -> jetzt ../shared/contracts/openapi.yaml.
- 450-Zeilen-Constraint war global unerfuellbar (main.go 569, api.ts >8700) ->
  praezisiert: NEUE Dateien < 450; bestehende ueberlange Dateien werden nur um das
  minimal Noetige ergaenzt (Route-Registrierung in main.go, eine Fetch-Funktion in
  api.ts) und NICHT weiter aufgeblaeht/als in-diesem-Task-zu-fixen deklariert.
- "separater Backdrop-Request" existiert auf der Projektseite nicht -> Backdrop-Daten
  kommen aus den Anime-/Group-Assets; die Scope-/Netzwerkbeschreibung wurde bereinigt.
  Der einzige client-seitige Bild-Request (/api/v1/media/image?...banner) ist ein
  Bild-Load, kein SSR-Datenfetch, und bleibt unveraendert.
- Mojibake (â€” usw.) -> Datei sauber in UTF-8 neu geschrieben.
</review_response>

<objective>
Die oeffentliche Fansub-Projektseite feuert pro SSR-Render mehrere separate
HTTP-Requests ans Backend (nach Commit 73a0e2f4 parallelisiert, aber weiterhin
viele Round-Trips). Handler sind warm ~8-33 ms einzeln, dominiert von
pgx-Round-Trips; das gesamte SQL liegt bei ~1,3 ms. Der Kostenanteil sind die
Round-Trips, nicht die DB-Rechenzeit.

Dieser Plan fuehrt einen aggregierenden Backend-Endpunkt ein, der die LEICHTE
Shell (group, anime, contributors, themes, release_media, project_note,
anime_fansubs) in EINEM Request buendelt. Ausdruecklich AUSSERHALB des Bundles:
assets (Jellyfin + bis zu 500 Releases), public_profile (auf dem kanonischen Pfad
bereits vorab geladen), die Release-Vorschau-Kette und der Media-Bild-Proxy.

Kernrisiko (aus der Review): Ein Bundle mit sequenzieller Backend-Ausfuehrung
koennte die heute parallele Frontend-Struktur unterbieten. Daher: optionale
Sektionen nebenlaeufig laden UND seq-vs-parallel messen, bevor etwas endgueltig
festgeschrieben wird.

Output:
- Aggregierender Handler + Bundle-DTO (Pointer ohne omitempty) im Backend
- Additive Route GET /api/v1/anime/:id/group/:groupId/project-page
- OpenAPI-Contract (200/400/404/500)
- Frontend-Fetch-Funktion + Loader-Umverdrahtung (optionales Pass-in-Profil)
- Backend-Handler-Test + neuer Frontend-Loader-Kompositions-Test
- Messgestuetzter Nachweis (Median + p95, >=20 Laeufe) als blocking Checkpoint
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@backend/cmd/server/main.go
@backend/internal/handlers/group_assets_handler.go
@frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts
@frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx

<interfaces>
<!-- Bestehende Repo-Methoden, die der Aggregator WIEDERVERWENDET (nicht umschreibt). -->

Im Bundle (leichte Sektionen):
  (r *GroupRepository) GetGroupDetail(ctx, animeID, groupID int64) (*models.GroupDetail, error)   // GATE; ErrNotFound; enthaelt 3 Count-Queries
  (r *AnimeRepository) GetByID(ctx, id int64, includeDisabled bool) (*models.AnimeDetail, error)   // GATE; ErrNotFound; includeDisabled=false
  (r *GroupContributorsRepository) GetProjectContributors(ctx, animeID, groupID int64) (*GroupContributorsResponse, error)
  (r *GroupThemesRepository) GetPublicGroupThemes(ctx, animeID, groupID int64) (*GroupThemesResponse, error)
  (r *GroupReleaseMediaRepository) GetPublicReleaseMedia(ctx, animeID, groupID int64) (*GroupReleaseMediaResponse, error)
  (r *FansubNotesRepository) GetPublicAnimeFansubProjectNote(ctx, animeID, groupID int64) (..., error)  // ErrInvalidAnimeFansubContext/ErrNotFound -> Data:nil, KEIN Fehler
  (r *FansubRepository) ListAnimeFansubs(ctx, animeID int64) ([]..., error)

NICHT im Bundle (bleiben separate Fetches):
  - assets: buildGroupAssetsPayload (group_assets_handler.go:90) -> resolveGroupAssets(Jellyfin) + GetGroupReleases{PerPage:500}. SCHWER.
  - public_profile: GetPublicProfileBySlug (fansub_repository.go:244) laedt Gruppe+Storys+ALLE Projekte+Historie+Medien+Links. Auf dem pretty-Pfad bereits vorab geladen (page.tsx:24).
  - Release-Vorschau: getGroupReleaseListCursor -> GetPublicReleaseDetail (~13 Sub-Queries).
  - Media-Bild-Proxy: /api/v1/media/image (client-seitiger Bild-Load, kein SSR-Fetch).

Backdrop: KEIN eigener Request auf der Projektseite — Backdrop-Daten stammen aus den
Anime-/Group-Assets. In Scope-/Netzwerk-Aussagen NICHT als separater Fetch fuehren.

Response-Envelope-Konventionen (fuer DTO-Feldbelegung):
  GetGroupDetail -> {"data": *models.GroupDetail}; GetByID -> {"data": *models.AnimeDetail};
  ListAnimeFansubs -> {"data": items}; Contributors/Themes/ReleaseMedia -> nackter Response-Struct;
  ProjectNote -> repository.PublicAnimeFansubProjectNoteResponse{Data: ...}.

Handler-Konstruktion (main.go ~282-293): groupRepo, groupContributorsRepo, groupThemesRepo,
groupReleaseMediaRepo, FansubNotesRepository, fansubRepo, animeRepo bereits als Instanzen vorhanden.

Route-Konvention (main.go ~353-363): oeffentliche group-Endpunkte unter
/api/v1/anime/:id/group/:groupId/... — neuer Endpunkt folgt dieser Konvention.

Frontend:
  - Fetch-Muster (api.ts): authorizedFetch + {cache:"no-store"} + ApiError bei !ok (404 -> status=404).
  - Ableitungs-Helfer bleiben unveraendert: buildPublicFansubProjectPath (@/lib/fansubProjectRoutes),
    buildFansubProjectNavigation (@/lib/fansubProjectNavigation), buildGroupNavigationGroups (@/lib/groupNavigation).
  - pretty-Route (page.tsx:24) laedt profileResponse bereits; uebergibt dem Loader heute nur {animeID, groupID}.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Bundle-DTO (Pointer ohne omitempty) + schmale Source-Interfaces</name>
  <files>backend/internal/handlers/group_project_page_dto.go</files>
  <behavior>
    - ProjectPageBundle komponiert AUSSCHLIESSLICH aus bestehenden Response-Typen — keine Duplikate.
    - Felder: group (*models.GroupDetail), anime (*models.AnimeDetail) = Gate-Sektionen (im Erfolgsfall gesetzt);
      contributors, themes, release_media, project_note, anime_fansubs = 5 optionale Sektionen.
    - KRITISCH (Review Pkt 4): optionale Sektionen sind Pointer OHNE omitempty, JSON-Tag z.B. json:"themes",
      damit nil als `null` serialisiert (NICHT verschwindet). KEIN public_profile-, KEIN assets-Feld.
    - Schmale Source-Interfaces (eine Methode je Quelle) mit exakt den bestehenden Repo-Signaturen,
      sodass die konkreten Repos sie ohne Adapter erfuellen (Stub-Injection im Test).
  </behavior>
  <action>
    group_project_page_dto.go im Package handlers anlegen. ProjectPageBundle mit obigen Feldern,
    Pointer ohne omitempty. Pro Quelle ein Interface (groupDetailSource, animeSource, contributorsSource,
    themesSource, releaseMediaSource, projectNoteSource, animeFansubsSource) mit der Signatur der
    bestehenden Methode. Keine Geschaeftslogik hier. Datei < 450 Zeilen.
  </action>
  <verify>
    <automated>cd backend && go build ./internal/handlers/ && go vet ./internal/handlers/</automated>
  </verify>
  <done>ProjectPageBundle + 7 Source-Interfaces kompilieren; optionale Felder sind Pointer OHNE omitempty (nil -> null); kein assets/public_profile-Feld; keine Duplikat-Typen.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Handler — Gates seriell, 5 optionale Sektionen nebenlaeufig + fehlerisoliert</name>
  <files>backend/internal/handlers/group_project_page_handler.go, backend/cmd/server/main.go</files>
  <behavior>
    - GetProjectPage parst anime-/group-id (parseAnimeID/parseGroupID), badRequest (400) bei ungueltig.
    - GATES ZUERST: GetGroupDetail und GetByID. ErrNotFound bei einem -> 404. Anderer harter Fehler -> 500.
      (Spiegelt Phase A: 404 -> not-found, sonst -> error.) Gates duerfen vor den optionalen Sektionen
      abbrechen (fail-fast, spart die optionale Arbeit bei 404).
    - OPTIONALE SEKTIONEN NEBENLAEUFIG (Review Pkt 1): contributors, themes, release_media, project_note,
      anime_fansubs via goroutines + sync.WaitGroup, jede in eigener Closure mit eigenem err-Check.
      Ein Fehler einer Sektion -> Sektion nil + log.Printf, KEIN Request-Fail, KEINE Beeinflussung der
      anderen. BEWUSST NICHT errgroup (dessen Cancel-on-first-error wuerde die Isolation brechen).
      Jede Sektion schreibt in ihr eigenes Ergebnisfeld (keine geteilte Map ohne Sync).
    - project_note: ErrInvalidAnimeFansubContext/ErrNotFound -> Data:nil (kein Fehler).
    - Antwort: c.JSON(200, gin.H{"data": bundle}).
  </behavior>
  <action>
    group_project_page_handler.go anlegen: ProjectPageHandler mit den Source-Interfaces aus Task 1.
    Konstruktor NewProjectPageHandler(...) nimmt die vorhandenen Repo-Instanzen aus main.go. GetProjectPage
    wie oben: Gates seriell, danach WaitGroup ueber die 5 optionalen Sektionen. In main.go: Handler nahe der
    bestehenden group-Handler (~283-293) instanziieren, Route
    v1.GET("/anime/:id/group/:groupId/project-page", projectPageHandler.GetProjectPage) neben den
    Geschwister-Routen (~363) registrieren (additiv, bestehende Routen unveraendert). Neue user-facing
    Fehlerstrings mit korrekten Umlauten.
    Zeilen-Constraint (Review Pkt 450): group_project_page_handler.go MUSS < 450 bleiben; falls die
    Orchestrierung zu gross wird, Sektions-Loader in eine Nachbardatei auslagern. main.go (bereits 569 Z.)
    wird nur um Konstruktion + Route-Zeile ergaenzt — kein Refactor/Split von main.go in diesem Task.
  </action>
  <verify>
    <automated>cd backend && go build ./... && go vet ./internal/handlers/ ./cmd/server/</automated>
  </verify>
  <done>Route kompiliert und registriert; Gates 404/500; 5 optionale Sektionen nebenlaeufig+isoliert; kein errgroup-Cancel; bestehende Routen unveraendert; neue Datei < 450 Zeilen.</done>
</task>

<task type="auto">
  <name>Task 3: Handler-Test — Komposition, 5 Degradations-Isolationen, Gates</name>
  <files>backend/internal/handlers/group_project_page_handler_test.go</files>
  <action>
    Go-Test (Package handlers), GetProjectPage via httptest mit gestubbten Source-Interfaces. Faelle:
    (a) Happy-Path — alle 7 Sektionen gesetzt, Response enthaelt group+anime+5 optionale unter "data";
    (b) je optionale Sektion EIN Test: genau diese Quelle wirft -> Sektion ist im JSON `null`, alle
    anderen gefuellt, Status 200 (Isolationsnachweis; 5 Tests);
    (c) group ErrNotFound -> 404; (d) anime ErrNotFound -> 404; (e) group harter Fehler -> 500.
    Zusaetzlich Race-Sicherheit: Test mit -race lauffaehig (nebenlaeufige Sektionen). Keine echte DB.
  </action>
  <verify>
    <automated>cd backend && go test ./internal/handlers/ -run ProjectPage -race -count=1</automated>
  </verify>
  <done>Alle Faelle gruen inkl. -race: Komposition, 5 Degradations-Isolationen (null im JSON), beide 404-Gates, 500-Gate.</done>
</task>

<task type="auto">
  <name>Task 4: OpenAPI — Pfad + Bundle-Schema (200/400/404/500)</name>
  <files>shared/contracts/openapi.yaml</files>
  <action>
    Pfad /api/v1/anime/{animeId}/group/{groupId}/project-page (GET) neben den Geschwister-group-Pfaden
    ergaenzen. Parameter animeId/groupId wie bei Nachbarpfaden. ProjectPageBundle-Response-Schema, das die
    BESTEHENDEN Komponenten-Schemas (group, anime, contributors, themes, release_media, project_note,
    anime_fansubs) per $ref wiederverwendet — keine Duplikate. Optionale Sektionen als nullable. Responses:
    200 (data-Envelope), 400 (ungueltige IDs), 404 (group/anime not-found), 500 (harter Fehler in Gate)
    — 500 explizit dokumentieren (Review Pkt 8). Bestehende Pfade unberuehrt.
  </action>
  <verify>
    <automated>cd frontend && (npx --no-install @redocly/cli lint ../shared/contracts/openapi.yaml 2>/dev/null || node -e "const y=require('js-yaml');const fs=require('fs');y.load(fs.readFileSync('../shared/contracts/openapi.yaml','utf8'));console.log('yaml ok')")</automated>
  </verify>
  <done>Neuer Pfad + nullable-Bundle-Schema, referenziert bestehende Komponenten, Responses 200/400/404/500, YAML valide (korrekter ../shared-Pfad).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: Frontend — Bundle-Typ, Fetch, Loader mit optionalem Pass-in-Profil</name>
  <files>frontend/src/types/projectPageBundle.ts, frontend/src/lib/api.ts, frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts, frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx</files>
  <behavior>
    - getPublicFansubProjectPage(animeID, groupID) -> GET .../project-page, 404 -> ApiError(status=404),
      Muster wie getGroupDetail (authorizedFetch, cache:"no-store").
    - loadPublicFansubProjectPageData: Signatur erweitert um ein OPTIONALES vorab geladenes Profil, z.B.
      loadPublicFansubProjectPageData({ animeID, groupID, preloadedProfile? }).
      * Shell = EIN getPublicFansubProjectPage-Call (group, anime, contributors, themes, release_media,
        project_note, anime_fansubs).
      * Profil: wenn preloadedProfile gesetzt (pretty-Route) -> dieses fuer canonicalProjectPath UND
        fansubProjectNavigation nutzen, KEIN Fetch. Wenn nicht gesetzt (ID-Route) -> genau EINMAL
        getPublicFansubProfileBySlug (separat, darf parallel zum Bundle laufen).
      * assets bleibt ein SEPARATER Fetch (wie heute, parallel).
      * Release-Vorschau-Kette (cursor -> detail) bleibt separat/parallel.
    - Phase-A-Gates: Bundle-404 -> {status:"not-found"}; Bundle-Fehler -> {status:"error",...}. Da anime/group
      jetzt aus dem Bundle kommen, gilt das Gate auf den Bundle-Call.
    - page.tsx (pretty-Route, Z. ~34): profileResponse.data als preloadedProfile an den Loader uebergeben
      (Review Pkt 2 — kein zweiter Profil-Fetch auf dem Primaerpfad).
    - Alle abgeleiteten Flags/navigationGroups/breadcrumbItems/Styles + Rueckgabestruktur unveraendert.
  </behavior>
  <action>
    projectPageBundle.ts: ProjectPageBundle-Typ aus bestehenden Domaenentypen (GroupDetail, AnimeDetail,
    und die 5 optionalen als `... | null`) — keine Duplikate. api.ts: getPublicFansubProjectPage analog
    getGroupDetail (nur additive Ergaenzung dieser einen Funktion; api.ts NICHT weiter aufblaehen/refactoren).
    projectPageData.ts: 7 Shell-Fetches durch den Bundle-Call ersetzen; preloadedProfile-Parameter + Fallback-
    Fetch fuer die ID-Route; assets/Release-Vorschau bleiben separat. page.tsx: preloadedProfile durchreichen.
    Deutsche Strings mit Umlauten; keine neuen englischen user-facing Strings. Datei-Limit 450 fuer NEUE
    Dateien (projectPageBundle.ts); projectPageData.ts nicht ueber ihren bisherigen Umfang hinaus aufblaehen.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit && npm run lint</automated>
  </verify>
  <done>Shell ueber einen Bundle-Call; pretty-Route ohne zweiten Profil-Fetch; ID-Route holt Profil einmalig; assets/Release-Vorschau separat; Phase-A-Gates + Rueckgabestruktur unveraendert; tsc + lint gruen.</done>
</task>

<task type="auto">
  <name>Task 6: Neuer Loader-Kompositions-Test (API-gemockt)</name>
  <files>frontend/src/app/anime/[id]/group/[groupId]/projectPageData.composition.test.ts, frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx</files>
  <action>
    NEUE Datei projectPageData.composition.test.ts nach dem Vorbild des bestehenden Release-Detail-Loadertests
    (Review Pkt 5: page.test.tsx testet den Loader nicht mit API-Mocks — daher separate Datei statt Umbau).
    Mocke @/lib/api (getPublicFansubProjectPage + getPublicFansubProfileBySlug + assets/Release-Vorschau-Fetches).
    Faelle: (a) Happy-Path -> Rueckgabestruktur + Flags korrekt; (b) Bundle-404 -> {status:"not-found"};
    (c) Bundle-Fehler -> {status:"error"}; (d) partielle Degradation (z.B. themes=null, release_media=null)
    -> hasThemes/hasMedia false, kein Crash; (e) preloadedProfile gesetzt -> KEIN getPublicFansubProfileBySlug-
    Aufruf, canonicalProjectPath + Navigation korrekt; (f) preloadedProfile fehlt (ID-Route) -> genau EIN
    getPublicFansubProfileBySlug-Aufruf. page.test.tsx nur so weit anpassen, wie die geaenderte Loader-Signatur
    es erzwingt (Suite gruen halten).
  </action>
  <verify>
    <automated>cd frontend && npx vitest run "src/app/anime/[id]/group/[groupId]/projectPageData.composition.test.ts" "src/app/anime/[id]/group/[groupId]/page.test.tsx"</automated>
  </verify>
  <done>Neue Kompositions-Testsuite gruen (inkl. Degradations- + Pass-in-Profil-Faelle); page.test.tsx weiterhin gruen.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Aggregierter Leicht-Shell-Endpunkt project-page (7 Sektionen, optionale nebenlaeufig); Loader nutzt optionales Pass-in-Profil; assets/Release-Vorschau weiterhin separat.</what-built>
  <how-to-verify>
    Backend neu bauen (docker compose up -d --build team4sv30-backend — neue Route erst nach Rebuild) und
    Frontend live pruefen. MESSMETHODIK (Review Pkt 6 — Min-von-8 verworfen):

    A) Backend-Bundle-Endpunkt direkt (Backend :18092): Warm-up (>=5 Aufrufe), dann >=20 Messungen von
       GET /api/v1/anime/1/group/1/project-page. Dokumentiere MEDIAN und p95.
    B) Zusaetzlich: seq-vs-parallel-Vergleich der optionalen Sektionen. Kurz eine sequenzielle Variante
       gegen die nebenlaeufige messen (beide je >=20 Laeufe, Median + p95) und die schnellere begruenden.
       Erst DANN die Ausfuehrungsart endgueltig festschreiben (nicht vorab).
    C) SSR-TTFB der realen Projektseite (Dev :3000): Warm-up, dann >=20 Messungen; MEDIAN und p95 fuer
       TTFB und Volldokument. Vergleichsbasis (nach Parallelisierung, gleiche Methodik nachziehen):
       vorher grob TTFB ~221 ms / Volldokument ~371 ms (damals Min-von-8 — daher zur Fairness die neue
       >=20/Median/p95-Messung AUCH einmal auf dem alten Stand wiederholen, sonst Aepfel/Birnen).
       KEINE Prozent-Behauptung im Plan/Code — nur Messwerte dokumentieren.
    D) Netzwerk-Tab: Shell-Daten kommen in EINEM project-page-Request; assets + Release-Vorschau laufen
       weiterhin separat/parallel; auf der pretty-Route KEIN zweiter public-profile-Request.
    E) Funktional: Team, Themes, Media, Projektnotiz, Navigation (vor/naechstes Projekt), Breadcrumbs,
       Hero/Poster unveraendert. Degradations-Stichprobe: eine optionale Sektion serverseitig fehlschlagen
       lassen -> Rest rendert weiter. 404-Gate: ungueltige ID -> not-found.
  </how-to-verify>
  <resume-signal>Schreibe "approved" mit den notierten Median/p95-Messwerten (Backend-Bundle + SSR), oder beschreibe Abweichungen. Falls parallel NICHT schneller als der heutige Zustand ist, wird die Aggregation neu bewertet, bevor sie bleibt.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser/SSR -> neuer Public-Endpunkt | Unauthentifiziert; animeId/groupId sind untrusted Path-Parameter |
| Handler -> bestehende Repos | Interne, bereits validierte Aufrufe; keine neue SQL-Oberflaeche |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-pp-01 | Tampering | animeId/groupId Path-Parameter | mitigate | parseAnimeID/parseGroupID wie bestehende Handler; 400 bei Ungueltig; parametrisierte Repo-Queries unveraendert |
| T-pp-02 | Information Disclosure | Bundle aggregiert mehrere Sektionen | mitigate | Nur bestehende Public-Repo-Methoden (fuer anonymen Zugriff freigegeben); kein Admin-/Auth-only-Feld; includeDisabled=false fuer anime |
| T-pp-03 | Denial of Service | Ein Request faechert in 7 Repo-Calls auf | accept | SQL gesamt ~1,3 ms/warm; SCHWERE Quellen (assets/500 Releases, Release-Detail/13 Queries) bleiben AUSSERHALB (Review); optionale Sektionen bounded, nebenlaeufig |
| T-pp-04 | DoS | Nebenlaeufige Sektionen | mitigate | Feste Anzahl goroutines (5), WaitGroup, keine unbounded Fan-outs; -race-Test verhindert Datenrennen |
| T-pp-05 | Availability | Partielle Degradation koennte Fehler verschlucken | mitigate | Nur Nicht-Gate-Sektionen degradieren (null + log.Printf); Gates failen hart -> keine stillen Totalausfaelle |
| T-pp-SC | Tampering | Dependency-Installs | accept | Kein neuer Paket-Install; nur stdlib sync + bestehende Deps |
</threat_model>

<verification>
- Backend: go build ./..., go vet ./internal/handlers/ ./cmd/server/, go test ./internal/handlers/ -run ProjectPage -race -count=1 gruen.
- Contract: openapi.yaml valide (korrekter ../shared-Pfad); neuer Pfad referenziert bestehende Komponenten; 200/400/404/500 dokumentiert.
- Frontend: tsc --noEmit, npm run lint, projectPageData.composition.test.ts + page.test.tsx gruen.
- Live (Checkpoint): EIN Shell-Request; assets/Release-Vorschau separat; pretty-Route ohne zweiten Profil-Fetch; funktional identisch; Degradations- + 404-Stichprobe; Median+p95 (>=20 Laeufe) fuer Backend-Bundle UND SSR-TTFB dokumentiert; seq-vs-parallel gemessen.
- Zeilenlimit: NEUE Dateien < 450; bestehende ueberlange Dateien (main.go 569, api.ts >8700) nur minimal additiv ergaenzt, nicht weiter aufgeblaeht.
- Keine ASCII-Umlaut-Ersetzungen in neuen user-facing Strings.
</verification>

<success_criteria>
- LD-1 (praezisiert): genau die 7 leichten Sektionen im Bundle; assets, public_profile, Release-Vorschau-Kette, Media-Bild-Proxy ausserhalb.
- LD-2: keine Cache-/Redis-Schicht.
- Optionale Sektionen nebenlaeufig + fehlerisoliert; seq-vs-parallel gemessen, bevor endgueltig festgeschrieben.
- Kein zweiter Profil-Fetch auf dem kanonischen Pfad (Pass-in-Profil).
- Optionale Bundle-Felder serialisieren nil als null (Pointer ohne omitempty).
- Bestehende Einzel-Endpunkte additiv erhalten; partielle Degradation + 404/500-Gates wie heute.
- Messgestuetzter Nachweis (Median + p95, >=20 Laeufe, Backend-Bundle + SSR) dokumentiert; keine Prozent-Behauptung.
</success_criteria>

<output>
Plan-only-Entwurf v2 zur Review (.planning/notes/260721-page-aggregation-project-page-PLAN.md). KEINE Ausfuehrung.
Bei Freigabe kann daraus eine GSD-Phase abgeleitet werden.
</output>
