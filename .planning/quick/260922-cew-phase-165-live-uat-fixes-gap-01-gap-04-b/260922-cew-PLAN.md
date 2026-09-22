---
phase: quick-260922-cew
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts, frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts, backend/internal/repository/jellyfin_discovery_cursor.go, backend/internal/handlers/jellyfin_discovery.go, backend/internal/handlers/jellyfin_discovery_test.go, frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.test.ts, backend/internal/models/jellyfin_discovery.go, frontend/src/types/admin.ts, frontend/src/app/admin/anime/create/library/discoveryPageHelpers.ts, frontend/src/app/admin/anime/create/library/discoveryPageHelpers.test.ts, frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.tsx, frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.test.tsx]
autonomous: true
requirements: [GAP-01, GAP-02, GAP-03, GAP-04]

must_haves:
  truths:
    - "Nach Anime anlegen aus /admin/anime/create/library für einen Film-Kandidaten landet der Admin auf /admin/anime/create mit vollständig übernommenem Jellyfin-Entwurf (Cover, Ordnerpfad, Typ=Film, AniSearch-Titelfeld vorbelegt) — ohne erneutes manuelles Suchen"
    - "Schlägt die Jellyfin-Vorschau während dieser Übergabe fehl, sieht der Admin eine sichtbare Fehlermeldung statt eines leeren, unerklärt bleibenden Formulars"
    - "Auf /admin/anime/create/library ist 'Weiter' nur aktiv, wenn wirklich weitere Treffer existieren, und ein Klick zeigt immer andere Einträge und erhöht die Seitenzahl"
    - "Das Suchfeld auf /admin/anime/create/library zeigt beim Laden den aktuellen q-URL-Parameter an"
    - "Die zweite Metazeile jeder Bibliothekskarte zeigt dieselbe Typ/Unterordner/Bibliothek-Segmentstruktur wie die bestehende Jellyfin-Suchkarte auf /admin/anime/create, statt 'media' als einzigen Kontext zu zeigen"
    - "Die Aktionsschaltflächen jeder Bibliothekskarte stehen kompakt nebeneinander unten rechts (Ignorieren sekundär, Anime anlegen primär), nicht mehr als volle Breite gestapelt"
  artifacts:
    - path: "frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts"
      provides: "loadPreview lädt eine Jellyfin-Vorschau auch ohne vorherige candidates-Liste"
      contains: "previewAdminAnimeFromJellyfinIntake"
    - path: "backend/internal/handlers/jellyfin_discovery.go"
      provides: "filterbewusste Pagination: has_more/next_cursor spiegeln echte verbleibende gefilterte Treffer"
      contains: "buildJellyfinDiscoveryFilteredPage"
    - path: "backend/internal/models/jellyfin_discovery.go"
      provides: "ParentContext-Feld auf AdminJellyfinDiscoveryItem"
      contains: "ParentContext"
    - path: "frontend/src/app/admin/anime/create/library/discoveryPageHelpers.ts"
      provides: "buildDiscoveryCardMetaLine mit Typ | Unterordner | Bibliothek analog JellyfinCandidateCard"
      contains: "parentContext"
    - path: "frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.tsx"
      provides: "kompakte, rechtsbündige Aktionsreihe statt gestapelter voller-Breite-Buttons"
      contains: "justifyContent"
  key_links:
    - from: "frontend/src/app/admin/anime/create/useCreatePageDiscoveryHandoff.ts"
      to: "frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts"
      via: "adoptCandidate(jellyfinID) -> handleJellyfinCandidateAdopt -> jellyfinIntake.loadPreview(candidateID) feuert previewAdminAnimeFromJellyfinIntake auch ohne passenden Eintrag in candidates"
      pattern: "previewAdminAnimeFromJellyfinIntake\\("
    - from: "frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.tsx"
      to: "backend/internal/handlers/jellyfin_discovery.go"
      via: "Weiter-Klick -> handleCursorChange -> listAdminJellyfinDiscovery(cursor) -> ListJellyfinDiscovery -> buildJellyfinDiscoveryFilteredPage liefert has_more nur bei echten weiteren Treffern"
      pattern: "buildJellyfinDiscoveryFilteredPage\\("
    - from: "backend/internal/handlers/jellyfin_discovery.go"
      to: "backend/internal/models/jellyfin_discovery.go"
      via: "buildAdminJellyfinDiscoveryItem setzt result.ParentContext aus deriveJellyfinPathContexts"
      pattern: "ParentContext"
---

<objective>
Vier live-diagnostizierte UAT-Bugs aus Phase 165 (Library Discovery/Assisted Anime Creation) beheben.
Die Root-Cause-Diagnose für GAP-01, GAP-03 und GAP-04 ist vom Auftraggeber vorgegeben und wurde in
dieser Planungssession gegen den tatsächlichen Code-Stand verifiziert (Zeilennummern/Funktionsnamen
unten stimmen mit dem aktuellen HEAD überein). GAP-02 wurde in dieser Session zusätzlich per Code-Lesen
tatsächlich diagnostiziert (siehe Task 2 Begründung) — nicht neu erfunden, sondern am realen Code
nachvollzogen.

GAP-01 (BLOCKER): Anime-anlegen-Übergabe aus der Bibliothek übernimmt nichts (kein Cover, kein
Ordnerpfad, falscher Typ, leeres AniSearch-Titelfeld), weil `useJellyfinIntakeImpl.ts`'s `loadPreview`
den übergebenen `jellyfin_series_id` nur in der lokalen `candidates`-Liste sucht (befüllt ausschließlich
durch eine vorherige Direktsuche) und bei leerer Liste sofort `null` zurückgibt, ohne jemals eine
Anfrage zu stellen.

GAP-02: Auf /admin/anime/create/library zeigt "Weiter" bei wenigen Treffern trotzdem einen aktiven
Zustand, obwohl keine weiteren zum Filter passenden Einträge existieren. Ursache (in dieser Session
verifiziert): `ListJellyfinDiscovery` berechnet `has_more`/`next_cursor` aus der roh nach Suchtext
gefilterten, aber NOCH NICHT statusgefilterten Seite (`SeekDiscoverySnapshot` vor dem D-17-Statusfilter),
sodass eine Seite unter einem engen Suchbegriff + "Offen"-Filter weniger sichtbare Treffer liefert als
`limit`, während `has_more` weiterhin nur die rohe Restmenge widerspiegelt statt der tatsächlich noch
passenden Treffer. Ergebnis: "Weiter" bleibt aktiv/klickbar, obwohl kein weiterer *anzeigbarer* Treffer
mehr existiert.

GAP-03: Die Bibliothekskarte zeigt "Serie | media" — "media" ist das ERSTE Pfadsegment
(`deriveJellyfinPathContexts` liefert `library` = `filtered[0]`, bei Linux-Absolutpfaden wie
`/media/Anime/Serie/Anime.TV.Sub/Naruto` also immer "media"). Die bestehende Jellyfin-Suchkarte
(`JellyfinCandidateCard.tsx`) zeigt zusätzlich den `parent_context` ("Anime.TV.Sub", das zweitletzte,
tatsächlich aussagekräftige Segment) VOR "media" — genau dieses Feld fehlt auf
`AdminJellyfinDiscoveryItem` komplett (wird im Discovery-Item-Builder mit `_` verworfen).

GAP-04: Karten-Aktionsreihe ist aktuell `flexDirection: column` ohne `alignItems`, wodurch beide
Buttons per Flex-Default (`stretch`) auf volle Breite gezogen werden ("volle-Breite-Button"-Optik).
Auftraggeber-Entscheidung D-24 (2026-09-22, verbindlich): Kartenstil der bestehenden Jellyfin-Suche
wiederverwenden/extrahieren statt neu zu bauen — hier umgesetzt als Layout-Angleichung (kompakte,
rechtsbündige, nebeneinanderliegende Buttons) unter Beibehaltung der bereits korrekten
`@/components/ui`-Primitive (kein natives `<button>`, keine neue CSS-Datei nötig).

Purpose: Live-UAT-Blocker und drei UX-Bugs aus Phase 165 schließen, ohne die Phase-165-Kernarchitektur
(D-06/D-07/D-17/D-19/D-24/D-25/D-28) zu verändern.
Output: Funktionierende Anime-anlegen-Übergabe aus der Bibliothek inkl. Fehleranzeige bei Fehlschlag;
korrekte has_more/next_cursor-Semantik in der Discovery-Paginierung; konsistente Typ/Bibliothek-Metazeile;
kompakte, kartenkonsistente Aktionsreihe. Alle vier Punkte mit automatisierten Tests belegt.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/phases/165-library-discovery-assisted-anime-creation/165-CONTEXT.md
@frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts
@frontend/src/app/admin/anime/create/useCreatePageDiscoveryHandoff.ts
@frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
@backend/internal/handlers/jellyfin_discovery.go
@backend/internal/repository/jellyfin_discovery_cursor.go
@backend/internal/handlers/jellyfin_intake_helpers.go
@frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.tsx
@frontend/src/app/admin/anime/create/library/discoveryPageHelpers.ts
@frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.tsx

<interfaces>
<!-- GAP-01: aktueller Stand loadPreview (useJellyfinIntakeImpl.ts, Zeilen 117-134) -->
Aktuell:
  const loadPreview = useCallback(async (candidateID: string) => {
    const target = candidates.find((candidate) => candidate.jellyfin_series_id === candidateID)
    if (!target) return null
    setIsLoadingPreview(true)
    try {
      const response = await previewAdminAnimeFromJellyfinIntake({ jellyfin_series_id: target.jellyfin_series_id })
      setPreviewResult(response.data)
      setReviewState(completeJellyfinCandidateTakeover(candidates, candidateID))
      return response.data
    } finally { setIsLoadingPreview(false) }
  }, [candidates])

`target` ist bei leerer `candidates`-Liste (Discovery-Übergabe, kein vorheriger Direktsuche-Aufruf)
immer `undefined` -> sofortiger `null`-Return, KEINE Anfrage. `handleJellyfinCandidateAdopt`
(useAdminAnimeCreateController.ts, Zeile 975-1012) ruft `jellyfinIntake.reviewCandidate(candidateID)`
dann `jellyfinIntake.loadPreview(candidateID)`; bei `preview === null` setzt es bereits
`setErrorMessage("Jellyfin-Vorschau konnte nicht geladen werden.")` und bricht ab — dieser Fehlerpfad
existiert bereits und bleibt unverändert; er wird nur nie erreicht, weil `loadPreview` VORHER schon
mit `null` abbricht, ohne die echte Anfrage überhaupt zu versuchen.

`hydrateManualDraftFromJellyfinPreview` (useManualAnimeDraft.ts, Zeile 69ff.) leitet Titel/Typ/Jahr/
Beschreibung/Cover ausschließlich aus dem `preview`-Objekt ab (`preview.type_hint.suggested_type`,
`preview.folder_name_title_seed`, `preview.asset_slots...`) — NICHT aus `candidates`. Sobald
`loadPreview` echte Serverdaten liefert, füllt sich der Entwurf automatisch korrekt (Typ "film" kommt
serverseitig aus dem Pfadkontext, D-28 — unabhängig von diesem Fix).

<!-- GAP-02: aktuelle Pagination (jellyfin_discovery.go, Zeilen 99-107 + 151-191) -->
Aktuell:
  entries := buildSortedJellyfinDiscoveryEntries(snapshot, query)
  page, nextCursor, hasMore := repository.SeekDiscoverySnapshot(entries, afterName, afterItemID, limit)
  items, err := h.buildJellyfinDiscoveryPageItems(c.Request.Context(), page, filter)

`SeekDiscoverySnapshot` bestimmt `hasMore`/`nextCursor` aus `entries` (nur suchtext-gefiltert), BEVOR
`buildJellyfinDiscoveryPageItems` den D-17-Statusfilter auf `page` anwendet. Ein Statusfilter kann
`page` (Größe `limit`) auf 0..n Treffer reduzieren, während `hasMore` weiterhin nur die rohe Restmenge
hinter `page` widerspiegelt — nicht ob dort tatsächlich noch etwas zum Filter Passendes existiert.

`repository.SeekDiscoverySnapshot` (jellyfin_discovery_cursor.go, Zeilen 67-85) kombiniert intern
Binärsuche (`seekDiscoveryStartIndex`, unexported) und `trimCursorPage` (Limit+Overfetch-Regel,
release_cursor_pagination.go Zeile 50-61). `MaxCursorPageLimit = 100` (release_cursor_pagination.go
Zeile 22), `DefaultDiscoveryPageLimit = 50`.

<!-- GAP-03: deriveJellyfinPathContexts (jellyfin_intake_helpers.go, Zeilen 277-315) -->
Für Pfad `/media/Anime/Serie/Anime.TV.Sub/Naruto`: nach Split/Filter ist `filtered[0] = "media"`
(immer das ERSTE Pfadsegment, bei Linux-Absolutpfaden = Mount-Punkt, kein echter Jellyfin-
"Bibliotheksname"). `library := filtered[0]` wird als zweiter Rückgabewert (`library_context`)
zurückgegeben. `parent := filtered[len(filtered)-2]` ("Anime.TV.Sub", das eigentlich aussagekräftige
Segment) ist der ERSTE Rückgabewert (`parent_context`).

`buildAdminJellyfinDiscoveryItem` (jellyfin_discovery.go, Zeile 205) ruft bereits
`_, libraryContext := deriveJellyfinPathContexts(pathPtr)` — der erste Rückgabewert (parent) wird mit
`_` verworfen und landet nie in `AdminJellyfinDiscoveryItem`.

`JellyfinCandidateCard.tsx` (Zeile 71-74) baut die Metazeile als:
  {candidate.type_hint.suggested_type?.toUpperCase() || "OFFEN"}
  {candidate.parent_context ? ` | ${candidate.parent_context}` : ""}
  {candidate.library_context ? ` | ${candidate.library_context}` : ""}
— zeigt also IMMER beide Segmente, wenn vorhanden (Ergebnis z. B. "TV | Anime.TV.Sub | media").
`buildDiscoveryCardMetaLine` (discoveryPageHelpers.ts, Zeile 66-69) kennt aktuell nur `library_context`
und baut nur `"{typeLabel} | {libraryContext}"` — daher "Serie | media" ohne das aussagekräftige
Mittelsegment.

<!-- GAP-04: aktuelle Aktionsreihe (DiscoveryLibraryCard.tsx, Zeilen 90-94 + 146-171) -->
  const actionsStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-1)" }
  ...
  <div style={actionsStyle}>
    {item.status === "existing" ? <Button variant="secondary" ...>Anime öffnen</Button>
    : item.status === "ignored" ? <Button variant="secondary" ...>Nicht mehr ignorieren</Button>
    : (<><Button variant="primary" ...>Anime anlegen</Button><Button variant="ghost" ...>Ignorieren</Button></>)}
  </div>

`flexDirection: "column"` ohne `alignItems` = Default `stretch` -> jeder Button füllt die volle
Breite von `actionsStyle` (= volle Breite der Content-Spalte). Die `Button`-Primitive selbst ist NICHT
`fullWidth` per Default (Button.tsx Zeile 36: `fullWidth = false`) — die volle Breite kommt
ausschließlich vom Flex-Stretch des Elternteils, nicht von der Komponente selbst. CSS-Modul-Klassen
(z. B. `styles.buttonSecondary`) bleiben im Jest/Vitest-DOM als lesbarer String erhalten (bestätigt
per Grep auf `page.test.tsx` unter `frontend/src/app/me/projects/...`), Varianten sind also per
`button.className.toContain("buttonSecondary")` testbar.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1 (BLOCKER): GAP-01 — Jellyfin-Vorschau ohne vorherige candidates-Liste laden</name>
  <files>frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts, frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts</files>
  <behavior>
    - Test 1 (neu, in useAdminAnimeCreateController.test.ts, echter Controller + echter
      useCreatePageDiscoveryHandoff-Hook zusammen gerendert, NUR `@/lib/api/admin-anime-intake`
      gemockt): mit `isDiscoveryFlow: true` und einer jellyfinID, für die NIE `handleJellyfinSearch()`
      aufgerufen wurde (leere `candidates`), muss `previewAdminAnimeFromJellyfinIntake` mit
      `{ jellyfin_series_id: <id> }` aufgerufen werden, `jellyfin.hasAdoptedPreview` wird `true`,
      `manualDraft.values.type` wird `"film"` (Fixture mit `type_hint.suggested_type: "film"`),
      `manualDraft.values.title`/`year`/`description`/`coverImage` und `jellyfin.folderPath` werden
      aus der Preview-Antwort befüllt, `anisearch.searchQuery` wird auf den Jellyfin-Seriennamen
      vorbelegt, UND `searchAdminAnimeCreateAniSearchCandidates` (die echte AniSearch-Suchanfrage)
      wird dabei NIE aufgerufen (kein automatisches Suchen).
    - Test 2 (neu, gleiche Datei/gleicher Aufbau): schlägt `previewAdminAnimeFromJellyfinIntake` fehl
      (rejected Promise), zeigt der Controller `errorMessage` sichtbar gesetzt (nicht `null`) und
      `jellyfin.hasAdoptedPreview` bleibt `false`.
    - Test 3 (bestehend, Zeile ~504 "D-23 fix..."): MUSS unverändert grün bleiben — Direktsuche
      (`handleJellyfinSearch` befüllt `candidates`) gefolgt von `handleJellyfinCandidateAdopt` liefert
      exakt dasselbe Ergebnis wie vorher (keine Verhaltensänderung für den candidates-Pfad).
  </behavior>
  <action>
In `frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts`, Funktion `loadPreview`
(Zeile 117-134): die Guard-Klausel `const target = candidates.find(...); if (!target) return null`
entfernen. Stattdessen den übergebenen `candidateID` direkt (nach `.trim()`) als
`jellyfin_series_id` an `previewAdminAnimeFromJellyfinIntake` übergeben — unabhängig davon, ob ein
Eintrag mit dieser ID in `candidates` existiert. Ist `candidateID.trim()` leer, weiterhin sofort
`null` zurückgeben ohne Anfrage (Schutz vor leeren IDs, keine Verhaltensänderung für diesen
Randfall). Nach erfolgreicher Antwort: prüfen, ob ein Eintrag mit `candidateID` in `candidates`
existiert (`candidates.some(...)`); wenn ja, `setReviewState(completeJellyfinCandidateTakeover(candidates, candidateID))`
wie bisher aufrufen (exakt unverändertes Verhalten für den Direktsuche-Pfad, da dort
`target.jellyfin_series_id === candidateID` ohnehin identisch war); wenn nein (Discovery-Übergabe
ohne passenden Kandidaten), `setReviewState({ mode: "hydrated", selectedCandidate: null,
shouldHydrateDraft: true })` setzen — `mode: "hydrated"` ist sicher, weil `page.tsx` `selectedCandidate`
nur für die (bei leerer `candidates`-Liste ohnehin nicht gerenderte) Ergebnisliste verwendet. Die
`try/finally`-Struktur um `setIsLoadingPreview` bleibt erhalten; ein Fehler beim API-Aufruf wird wie
bisher NICHT hier abgefangen, sondern propagiert zum Aufrufer (`handleJellyfinCandidateAdopt` /
`handleJellyfinCandidateReview` / `handleEditJellyfinAdopt`), deren bestehende `catch`-Blöcke
`setErrorMessage(...)` bereits korrekt aufrufen — dort ist KEINE Änderung nötig.

In `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts`: am Dateikopf einen
zusätzlichen Import `import { useCreatePageDiscoveryHandoff } from "./useCreatePageDiscoveryHandoff"`
ergänzen (echtes Modul, NICHT mocken). Im `describe("useAdminAnimeCreateController (hook execution)", ...)`-
Block (ab Zeile 469, nutzt bereits alle nötigen Mocks aus `apiMocks`/`intakeMocks` samt `beforeEach`)
eine neue Fixture-Konstante nahe `jellyfinPreviewResult` (Zeile 407) ergänzen, z. B.
`filmJellyfinPreviewResult`, mit `jellyfin_series_id: "series-99"`, `jellyfin_series_name: "Redline"`,
`jellyfin_series_path: "/media/Anime/Film/Anime.Film.Sub/Redline"`,
`folder_name_title_seed: "Redline"`, `year: 2009`, `description`, `type_hint.suggested_type: "film"`,
und `asset_slots.cover: { present: true, kind: "cover", source: "jellyfin", url: "https://jellyfin.example/cover.jpg" }`
(restliche Asset-Slots wie beim bestehenden Fixture `present: false`). Eine kleine lokale Test-Hilfsfunktion
definieren, die BEIDE echten Hooks zusammen rendert (spiegelt exakt die Verdrahtung aus `page.tsx`
Zeile 88-95): `useAdminAnimeCreateController({ isDiscoveryFlow: true, returnURL: "/admin/anime/create/library" })`
aufrufen, danach `useCreatePageDiscoveryHandoff({ jellyfinID, hasAdoptedPreview: controller.jellyfin.hasAdoptedPreview,
adoptCandidate: controller.handlers.handleJellyfinCandidateAdopt, jellyfinPreviewSeriesName:
controller.jellyfin.preview?.jellyfin_series_name, searchQuery: controller.anisearch.searchQuery,
setSearchQuery: controller.handlers.setAniSearchSearchQuery })` aufrufen und `controller`
zurückgeben. Test 1: `intakeMocks.previewAdminAnimeFromJellyfinIntake.mockResolvedValueOnce({ data:
filmJellyfinPreviewResult })`, `renderHook(() => useHarness("series-99"))`, in `await waitFor(...)`
die im `<behavior>`-Block genannten Assertions prüfen (inkl. `expect(intakeMocks.previewAdminAnimeFromJellyfinIntake)
.toHaveBeenCalledWith({ jellyfin_series_id: "series-99" })` und
`expect(intakeMocks.searchAdminAnimeCreateAniSearchCandidates).not.toHaveBeenCalled()`). Test 2:
`intakeMocks.previewAdminAnimeFromJellyfinIntake.mockRejectedValueOnce(new Error("upstream down"))`,
gleicher Harness-Aufbau, `await waitFor(() => expect(result.current.errorMessage).not.toBeNull())`.
Bestehende Tests in dieser Datei NICHT anfassen.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/anime/create/useAdminAnimeCreateController.test.ts" 2>&1 | tail -60</automated>
  </verify>
  <done>
`loadPreview` feuert `previewAdminAnimeFromJellyfinIntake` auch ohne passenden Eintrag in `candidates`.
Beide neuen Tests grün; der bestehende Direktsuche-Regressionstest ("D-23 fix...") bleibt unverändert
grün. Kein anderer Aufrufer von `loadPreview` (`handleJellyfinCandidateReview`,
`handleEditJellyfinAdopt` in AnimeEditWorkspace.tsx) zeigt eine Verhaltensänderung für den
candidates-Pfad.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: GAP-02 — Discovery-Pagination: has_more/next_cursor an echte gefilterte Treffer koppeln</name>
  <files>backend/internal/repository/jellyfin_discovery_cursor.go, backend/internal/handlers/jellyfin_discovery.go, backend/internal/handlers/jellyfin_discovery_test.go, frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.test.ts</files>
  <behavior>
    - Test A (neu, jellyfin_discovery_test.go): 4 Roheinträge (alphabetisch sortierbare Namen), davon
      1 Eintrag mit Status "existing" (per `fakeDiscoveryExistingMatchRepo.matches`) und 3 mit Status
      "offen". Anfrage mit Default-Filter "offen", Default-`limit`: erwartet genau 3 Items,
      `HasMore == false`, `NextCursor == nil` — obwohl die rohe (nur suchtext-gefilterte) Liste ein
      viertes Element enthält, das aber zum Filter nicht passt.
    - Test B (neu, jellyfin_discovery_test.go): 5 Roheinträge alphabetisch A(offen) B(existing)
      C(offen) D(existing) E(offen), `limit=2`, Filter "offen": Seite 1 liefert genau [A, C],
      `HasMore == true`, `NextCursor` gesetzt (das Fenster musste über den B-Eintrag hinweg
      erweitert werden, um 2 passende Treffer zu sammeln). Seite 2 (mit dem gelieferten Cursor)
      liefert genau [E], `HasMore == false`. Kein Item erscheint auf beiden Seiten.
    - Bestehende Tests `TestJellyfinDiscovery_PaginationNoFanOut` und
      `TestJellyfinDiscovery_ScalePaginationAndBudget_D29` bleiben unverändert grün (beide ohne
      Statusfilter-Ausschlüsse in ihren Fixtures — Fensterausweitung wird dort nie ausgelöst,
      Ergebnis bitidentisch zum bisherigen Verhalten).
    - Test C (neu, useDiscoveryLibraryFilters.test.ts): `mockUseSearchParams` liefert
      `new URLSearchParams("q=Accel World")`; `renderHook(() => useDiscoveryLibraryFilters())`;
      `result.current.searchValue === "Accel World"` UND `result.current.params.q === "Accel World"`
      direkt nach dem ersten Render (deckt die im Auftrag genannte Unsicherheit "Suchfeld zeigt
      q evtl. nicht an" ab — nach Code-Lesen bereits korrekt implementiert über den
      `useState(q)`-Initialwert; dieser Test macht das dauerhaft nachweisbar statt nur vermutet).
  </behavior>
  <action>
In `backend/internal/repository/jellyfin_discovery_cursor.go`: eine neue exportierte Funktion
`SeekDiscoveryStartIndex[T DiscoverySortKeyed](items []T, afterName, afterItemID string) int`
ergänzen, die exakt die bisherige Seek-Logik aus `SeekDiscoverySnapshot` (Zeilen 74-78) kapselt: bei
leerem `afterName` UND leerem `afterItemID` `0` zurückgeben, sonst `seekDiscoveryStartIndex(items,
strings.ToLower(afterName), afterItemID)` aufrufen. `SeekDiscoverySnapshot` danach so umbauen, dass
es `SeekDiscoveryStartIndex` intern wiederverwendet (kein dupliziertes Seek), Rückgabewert/Verhalten
bleibt 100% identisch (bestehender `jellyfin_discovery_cursor_test.go` bleibt unverändert grün).

In `backend/internal/handlers/jellyfin_discovery.go`: in `ListJellyfinDiscovery` nach dem
`limit`-Parsing (nach Zeile 86) eine Deckelung `if limit > repository.MaxCursorPageLimit { limit =
repository.MaxCursorPageLimit }` ergänzen (bisher implizit durch `SeekDiscoverySnapshot`'s internes
`clampCursorLimit` erledigt, das jetzt für den Haupt-Pfad entfällt). Die Zeilen 99-102 (Aufruf von
`repository.SeekDiscoverySnapshot` + `buildJellyfinDiscoveryPageItems`) ersetzen durch: `startIdx :=
repository.SeekDiscoveryStartIndex(entries, afterName, afterItemID)`, `remaining :=
entries[startIdx:]`, dann `items, nextCursor, hasMore, err :=
h.buildJellyfinDiscoveryFilteredPage(c.Request.Context(), remaining, filter, limit)`.

Die Funktion `buildJellyfinDiscoveryPageItems` (Zeile 151-191) umbenennen/umbauen zu
`buildJellyfinDiscoveryFilteredPage(ctx context.Context, remaining []jellyfinDiscoverySnapshotEntry,
filter string, limit int) ([]models.AdminJellyfinDiscoveryItem, *string, bool, error)`. Algorithmus:
bei leerem `remaining` sofort `[]models.AdminJellyfinDiscoveryItem{}, nil, false, nil` zurückgeben.
Sonst wie bisher `seriesIDs`/`paths` aus dem GESAMTEN `remaining` sammeln (nicht mehr nur aus einer
`limit`-großen Seite) und GENAU EINEN `FindExistingAnimeByJellyfinIntakeRefs`-Aufruf sowie GENAU EINEN
`FindIgnoredLibraryDiscoveryItems`-Aufruf darüber ausführen (D-07-Budget bleibt: exakt 1 Query pro
Feld pro Seite, unabhängig von der Array-Größe der IN-Klausel). Danach über `remaining` in Reihenfolge
iterieren: pro Eintrag `buildAdminJellyfinDiscoveryItem` aufrufen, mit `discoveryItemMatchesFilter`
prüfen; passt der Eintrag NICHT zum Filter, überspringen (nicht zählen, nicht abbrechen). Passt er:
wenn bereits `limit` Einträge gesammelt sind, `hasMore = true` setzen und die Schleife sofort
verlassen (OHNE diesen Treffer selbst in `items` aufzunehmen — er beweist nur, dass mindestens ein
weiterer Treffer existiert); sonst den Eintrag an `items` anhängen und `nextCursor` auf
`repository.EncodeDiscoveryCursor(entry.DiscoverySortKey())` setzen (überschreibt bei jedem
zusätzlichen Treffer, sodass am Ende der Cursor des LETZTEN gesammelten Treffers steht). Endet die
Schleife, ohne dass der `hasMore`-Zweig je griff, bleibt `hasMore = false`; in diesem Fall
`nextCursor` explizit auf `nil` setzen (kein "toter" Cursor ohne echten weiteren Treffer). Die beiden
Doc-Kommentare oben in der Datei (Zeilen 10-16 Datei-Kopf-Kommentar und Zeilen 148-150 über der
umbenannten Funktion), die das alte "kann unter `limit` liefern, ist kein Bug"-Verhalten
rechtfertigen, durch eine kurze Erklärung des NEUEN, korrekten Verhaltens ersetzen: `has_more`/
`next_cursor` spiegeln jetzt echte verbleibende, zum Filter passende Treffer wider; das
Existenz-/Ignorier-Lookup bleibt bei exakt 1 Query pro Feld pro Seite (D-07), auch wenn das
Scan-Fenster zum Sammeln von `limit` passenden Treffern über mehr als `limit` Rohobjekte reichen muss.

In `backend/internal/handlers/jellyfin_discovery_test.go`: die beiden neuen Tests aus `<behavior>`
als `TestJellyfinDiscovery_HasMoreReflectsGenuineFilterMatches` (Test A) und
`TestJellyfinDiscovery_FilteredPaginationAdvancesAcrossRawWindow` (Test B) ergänzen, nach dem
bestehenden Muster (`newDiscoverySnapshotServer`, `fakeDiscoveryExistingMatchRepo{matches: [...]}`
mit `Source: testStringPtr("jellyfin:<id>")` für die "existing"-Fixtures, `newDiscoveryTestHandler`,
`newDiscoveryTestRouter`, `performDiscoveryListRequest`). Für Test B den zweiten Request-Aufruf mit
`?limit=2&cursor=` + urlencodeter `*page1.Data.NextCursor` bauen (analog
`TestJellyfinDiscovery_PaginationNoFanOut`, Zeile 376).

In `frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.test.ts`: Test C aus
`<behavior>` als neuen `it(...)`-Block im bestehenden `describe("useDiscoveryLibraryFilters", ...)`
ergänzen, nach dem Muster der bestehenden Tests (`mockUseSearchParams.mockReturnValue(new
URLSearchParams("q=Accel World"))` VOR `renderHook`).
  </action>
  <verify>
    <automated>docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./... && go test ./internal/handlers/... ./internal/repository/... -run 'TestJellyfinDiscovery|TestSeekDiscovery' -v" 2>&1 | tail -100</automated>
  </verify>
  <done>
`go build ./...` und `go vet ./...` fehlerfrei. Alle `TestJellyfinDiscovery*`- und
`SeekDiscoverySnapshot`/`SeekDiscoveryStartIndex`-Tests grün, inklusive der 2 neuen Tests. Die
bestehenden `TestJellyfinDiscovery_PaginationNoFanOut`/`_ScalePaginationAndBudget_D29`-Tests liefern
weiterhin identische Ergebnisse. `useDiscoveryLibraryFilters.test.ts` grün inklusive des neuen
q-Hydration-Tests.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: GAP-03 — parent_context durchreichen, Metazeile an JellyfinCandidateCard angleichen</name>
  <files>backend/internal/models/jellyfin_discovery.go, backend/internal/handlers/jellyfin_discovery.go, backend/internal/handlers/jellyfin_discovery_test.go, frontend/src/types/admin.ts, frontend/src/app/admin/anime/create/library/discoveryPageHelpers.ts, frontend/src/app/admin/anime/create/library/discoveryPageHelpers.test.ts, frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.tsx, frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.test.tsx</files>
  <behavior>
    - Test D (neu, jellyfin_discovery_test.go, erweitert `TestJellyfinDiscovery_LibraryContext_D24`
      oder eigener Test mit demselben Fixture-Pfad `/media/Anime/Serie/Anime.TV.Sub/Naruto`):
      `withPathItem.ParentContext` ist gesetzt und entspricht dem ersten Rückgabewert von
      `deriveJellyfinPathContexts(&path)` ("Anime.TV.Sub"); `noPathItem.ParentContext` ist `nil`.
    - Test E (neu, discoveryPageHelpers.test.ts): `buildDiscoveryCardMetaLine("Serie", "Anime.TV.Sub",
      "media")` liefert `"Serie | Anime.TV.Sub | media"`; `buildDiscoveryCardMetaLine("Serie", undefined,
      "media")` liefert `"Serie | media"`; `buildDiscoveryCardMetaLine("Serie", undefined, undefined)`
      liefert `"Serie"`.
    - Test F (aktualisiert, DiscoveryLibraryCard.test.tsx, erster Test "renders the poster
      placeholder..."): mit `parent_context: "Anime.TV.Sub"` in der Fixture erscheint der Text
      `"Serie | Anime.TV.Sub | Anime"` (Fixture behält `library_context: "Anime"` bei).
  </behavior>
  <action>
In `backend/internal/models/jellyfin_discovery.go`: Feld `ParentContext *string
\`json:"parent_context,omitempty"\`` zu `AdminJellyfinDiscoveryItem` ergänzen (direkt vor oder nach
`LibraryContext`, Zeile 13), Struct-Kommentar (Zeile 3-7) um den Hinweis ergänzen, dass
`parent_context` jetzt zusätzlich zu `library_context` für die Karten-Metazeile "Typ | Unterordner |
Bibliothek" mitgeliefert wird (Konsistenz mit `AdminJellyfinIntakeSearchItem.parent_context`).

In `backend/internal/handlers/jellyfin_discovery.go`, Funktion `buildAdminJellyfinDiscoveryItem`
(Zeile 197-234): Zeile 205 `_, libraryContext := deriveJellyfinPathContexts(pathPtr)` zu
`parentContext, libraryContext := deriveJellyfinPathContexts(pathPtr)` ändern. Im
`models.AdminJellyfinDiscoveryItem{...}`-Literal (ab Zeile 217) `ParentContext: parentContext,`
ergänzen.

In `frontend/src/types/admin.ts`: Feld `parent_context?: string;` zu `AdminJellyfinDiscoveryItem`
(Zeile 516-528) ergänzen, direkt vor `library_context`.

In `frontend/src/app/admin/anime/create/library/discoveryPageHelpers.ts`, Funktion
`buildDiscoveryCardMetaLine` (Zeile 62-69): Signatur zu `buildDiscoveryCardMetaLine(typeLabel: string,
parentContext?: string | null, libraryContext?: string | null): string` erweitern. Neue Logik: mit
einem Array `[typeLabel]` beginnen, `parentContext` anhängen falls truthy, `libraryContext` anhängen
falls truthy, mit `" | "` verbinden — spiegelt exakt `JellyfinCandidateCard.tsx`'s Zeile 71-74
Segmentreihenfolge (Typ, dann parent, dann library). Den Doc-Kommentar der Funktion entsprechend
aktualisieren (nicht mehr nur "{Typ} | {Bibliothek}", sondern "{Typ} | {Unterordner} | {Bibliothek}",
Segmente einzeln optional).

In `frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.tsx`: Zeile 104 `const metaLine2
= buildDiscoveryCardMetaLine(typeLabel, item.library_context)` zu `const metaLine2 =
buildDiscoveryCardMetaLine(typeLabel, item.parent_context, item.library_context)` ändern.

In `frontend/src/app/admin/anime/create/library/discoveryPageHelpers.test.ts`: Test E aus
`<behavior>` als neue `it(...)`-Blöcke im bestehenden `buildDiscoveryCardMetaLine`-`describe`
ergänzen (Datei vorher lesen für exakten bestehenden Aufbau/Namenskonvention).

In `frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.test.tsx`: `buildItem()`-Fixture
(Zeile 22-34) um `parent_context: "Anime.TV.Sub"` ergänzen; ersten Test (Zeile 37-52) Assertion
`expect(screen.getByText("Serie | Anime")).toBeTruthy()` zu `expect(screen.getByText("Serie |
Anime.TV.Sub | Anime")).toBeTruthy()` ändern. Übrige Tests (Poster/Status/Aktionen) NICHT anfassen,
außer sie durch die Fixture-Änderung ebenfalls betroffen sind (kurz gegenprüfen — insbesondere den
Test "omits the library-context suffix when library_context is absent (D-24)", Zeile 70-83, der mit
`parent_context: "Anime.TV.Sub"` weiterhin nur `library_context: undefined` überschreibt: dort muss
die Assertion auf `expect(screen.getByText("Serie | Anime.TV.Sub")).toBeTruthy()` angepasst werden,
da mit gesetztem `parent_context` und fehlendem `library_context` jetzt "Serie | Anime.TV.Sub" statt
nur "Serie" erscheint).
  </action>
  <verify>
    <automated>docker exec team4sv30-backend sh -c "cd /app && go build ./... && go test ./internal/handlers/... -run TestJellyfinDiscovery -v" 2>&1 | tail -60; docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/anime/create/library/discoveryPageHelpers.test.ts src/app/admin/anime/create/library/DiscoveryLibraryCard.test.tsx" 2>&1 | tail -60</automated>
  </verify>
  <done>
`AdminJellyfinDiscoveryItem` (Backend + Frontend-Typ) führt `parent_context`. `buildDiscoveryCardMetaLine`
baut "{Typ} | {Unterordner} | {Bibliothek}" analog `JellyfinCandidateCard.tsx`. Discovery-Karte zeigt
für den Naruto-Testpfad "Serie | Anime.TV.Sub | media"-artige Ausgabe statt "Serie | media". Alle
betroffenen Backend- und Frontend-Tests grün.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: GAP-04 — Aktionsreihe kompakt/rechtsbündig, Statusblock "Bereits importiert" angleichen</name>
  <files>frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.tsx, frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.test.tsx</files>
  <behavior>
    - Test G (aktualisiert, ersetzt "status open renders stacked Anime-anlegen (primary) + Ignorieren
      (ghost) buttons", Zeile 85-99): Status "open" rendert genau zwei Buttons in dieser DOM-Reihenfolge:
      zuerst "Ignorieren" (className enthält "buttonSecondary", NICHT mehr "buttonGhost"), danach
      "Anime anlegen" (className enthält weiterhin "buttonPrimary").
    - Test H (aktualisiert, "status partial renders the same actions as open...", Zeile 138-155):
      dieselbe Reihenfolge/Variante wie Test G zusätzlich zur bestehenden Teilweise-Caption-Prüfung.
    - Test I (neu): Status "existing" rendert zusätzlich zur bestehenden `"{title} (#{id})"`-Zeile
      den Text "Bereits importiert" im Statusblock.
    - Bestehende Klick-Handler-Tests (Zeile 180-242, "clicking Anime anlegen/Ignorieren/Anime
      oeffnen/Nicht mehr ignorieren calls...") bleiben unverändert grün (Button-Labels/Callbacks
      ändern sich nicht, nur Reihenfolge/Variante/Layout).
    - Struktur-Test "renders zero native button/select/input/textarea elements" (Zeile 244-247)
      bleibt unverändert grün (keine neuen nativen Elemente, keine neue CSS-Datei).
  </behavior>
  <action>
In `frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.tsx`:

1. `actionsStyle` (Zeile 90-94) von `{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }`
   zu `{ display: "flex", flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap:
   "var(--space-2)" }` ändern (Zeilenumbruch bei sehr schmalen Karten über `flexWrap` statt
   Überlauf, Buttons bleiben dadurch immer rechtsbündig statt gestreckt).

2. `contentStyle` (Zeile 48-53) um `justifyContent: "space-between"` ergänzen. Die JSX-Struktur
   innerhalb von `<div style={contentStyle}>` (Zeile 124-172) so umbauen, dass genau zwei direkte
   Kind-Elemente entstehen: (a) ein neuer Wrapper `<div style={topBlockStyle}>` (neue Konstante,
   z. B. `{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }`), der `<h3>`, die
   Jahr/Pfad-`<p>`, die Typ/Bibliothek-`<p>` und den bestehenden `statusBlockStyle`-Div umschließt,
   und (b) der bestehende `<div style={actionsStyle}>`-Block direkt danach als Geschwisterelement
   (nicht mehr Kind von irgendeinem anderen Wrapper). `justifyContent: "space-between"` auf
   `contentStyle` drückt die Aktionsreihe dadurch an das untere Ende der Content-Spalte.

3. Im `actionsStyle`-Block, Zweig für den offenen/teilweisen Zustand (aktuell `<><Button
   variant="primary" size="sm" onClick={() => onCreate(item.jellyfin_item_id)}>Anime anlegen</Button>
   <Button variant="ghost" size="sm" onClick={() => onIgnore(item.jellyfin_item_id)}>Ignorieren
   </Button></>`, Zeile 162-169): Reihenfolge und Variante tauschen zu: zuerst `<Button
   variant="secondary" size="sm" onClick={() => onIgnore(item.jellyfin_item_id)}>Ignorieren</Button>`,
   danach `<Button variant="primary" size="sm" onClick={() => onCreate(item.jellyfin_item_id)}>Anime
   anlegen</Button>` (onClick-Handler bleiben an ihrem jeweiligen Label, nur Position/Variante ändern
   sich). Die Zweige für "existing" (Zeile 147-156) und "ignored" (Zeile 157-160) NICHT inhaltlich
   ändern (bleiben je ein einzelner `Button`, profitieren aber automatisch von der neuen
   `justifyContent: "flex-end"`-Ausrichtung).

4. Im Statusblock (Zeile 131-144), Zweig `item.status === "existing"`: VOR der bestehenden
   `<p style={bodyLineStyle}>{item.existing_title || item.name}...</p>`-Zeile eine neue Zeile
   `<p style={importedHeadingStyle}>Bereits importiert</p>` einfügen (neue Konstante
   `importedHeadingStyle: CSSProperties = { ...captionStyle, fontWeight: 700 }`, direkt unterhalb
   von `captionStyle` deklariert).

In `frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.test.tsx`: Test G (Zeile 85-99)
umbenennen zu z. B. "status open renders Ignorieren (secondary) then Anime anlegen (primary) side by
side" und Assertions ergänzen: `const buttons = screen.getAllByRole("button")`,
`expect(buttons.map((b) => b.textContent)).toEqual(["Ignorieren", "Anime anlegen"])`,
`expect(buttons[0].className).toContain("buttonSecondary")`,
`expect(buttons[0].className).not.toContain("buttonGhost")`,
`expect(buttons[1].className).toContain("buttonPrimary")`. Test H (Zeile 138-155) um dieselben
Reihenfolge-/Varianten-Assertions ergänzen (bestehende Caption-Assertion beibehalten). Test I als
neuen `it(...)`-Block im "status existing"-Testbereich ergänzen:
`expect(screen.getByText("Bereits importiert")).toBeTruthy()` zusätzlich zur bestehenden
`"Naruto (#42)"`-Assertion (Zeile 101-120). Bestehende Klick-Handler-Tests (Zeile 180-242) NICHT
anfassen — sie nutzen `getByRole("button", { name: ... })`, was unabhängig von DOM-Reihenfolge
funktioniert.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/anime/create/library/DiscoveryLibraryCard.test.tsx" 2>&1 | tail -60</automated>
  </verify>
  <done>
Die Aktionsreihe ist `flexDirection: row` mit `justifyContent: flex-end`; im offenen/teilweisen
Zustand erscheint "Ignorieren" (Variante secondary) vor "Anime anlegen" (Variante primary, unverändert)
in der DOM-Reihenfolge. Der Statusblock für "existing" zeigt zusätzlich "Bereits importiert". Alle
Tests in DiscoveryLibraryCard.test.tsx grün, inklusive des unveränderten Struktur-Tests (keine neuen
nativen Elemente).
  </done>
</task>

<task type="auto">
  <name>Task 5: Verifikation — Typecheck, Lint, Tests, Backend-Build, Container-Neustart, Commit</name>
  <files>frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts</files>
  <action>
1. Backend-Build/Vet/vollständiger betroffener Testlauf im laufenden Container (Quellcode ist per
   `docker-compose.override.yml`/`develop.watch` bereits synchron, siehe Diagnose-Session — kein
   Rebuild nötig, mit `go build ./... 2>&1 | tail` bestätigt):
   `docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./... && go test
   ./internal/handlers/... ./internal/repository/... ./internal/models/... -v 2>&1 | tail -150"`.
   Alle `TestJellyfinDiscovery*`-, `SeekDiscovery*`- und sonstigen in diesem Plan berührten Tests
   müssen grün sein; vorbestehende, unabhängige Fehlschläge (`TEAM4S_PHASE128_TEST_DSN`-gated,
   `TestPhase134Matrix*` Live-Keycloak-Netzwerk) NICHT als Regression werten, aber im SUMMARY.md
   namentlich auflisten, falls sie auftreten.

2. Projektweiter Frontend-Typecheck: `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm
   run typecheck"`. 0 Fehler erwartet (deckt u. a. den neuen `parent_context` in `types/admin.ts` und
   die geänderte `buildDiscoveryCardMetaLine`-Signatur ab).

3. ESLint gezielt für alle in diesem Plan geänderten Produktions-TS/TSX-Dateien:
   `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint
   src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts
   src/app/admin/anime/create/library/discoveryPageHelpers.ts
   src/app/admin/anime/create/library/DiscoveryLibraryCard.tsx src/types/admin.ts"`. 0 neue Findings
   erwartet.

4. Gezielter Frontend-Testlauf über ALLE in diesem Plan geänderten/neuen Testdateien:
   `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run
   src/app/admin/anime/create/useAdminAnimeCreateController.test.ts
   src/app/admin/anime/create/library/useDiscoveryLibraryFilters.test.ts
   src/app/admin/anime/create/library/discoveryPageHelpers.test.ts
   src/app/admin/anime/create/library/DiscoveryLibraryCard.test.tsx
   src/app/admin/anime/create/library/DiscoveryLibraryPanel.test.tsx
   src/app/admin/anime/create/page.test.tsx"`. Der letzte Lauf (`page.test.tsx`,
   `DiscoveryLibraryPanel.test.tsx`) prüft explizit auf Nebenwirkungen der GAP-01/02/03-Änderungen
   in Dateien, die dieser Plan nicht direkt anfasst. Alle Tests müssen grün sein.

5. Frontend-Container neu starten, damit der laufende Next.js-Dev-Server (webpack, HMR) den
   Endzustand sauber übernimmt: `docker restart team4sv30-frontend`, danach in einer kurzen
   Retry-Schleife (max. ~10 Versuche, 2s Abstand, kein langes Vorab-Sleep) auf Erreichbarkeit prüfen:
   `curl -sf http://127.0.0.1:3000/admin/anime/create -o /dev/null -w "%{http_code}\n"` und
   `curl -sf http://127.0.0.1:3000/admin/anime/create/library -o /dev/null -w "%{http_code}\n"`
   (beide Routen erfordern eine Admin-Session für den vollen Seiteninhalt — ein 200/302/401/403 ist
   je nach Auth-Redirect-Verhalten plausibel; ein 500 wäre ein echtes Regressionssignal und muss
   untersucht werden).

6. EXPLIZIT NICHT MÖGLICH in dieser Umgebung (im SUMMARY.md wörtlich vermerken): eine echte
   Browser-Live-Prüfung der 4 Bugs über den SSH-Tunnel `http://127.0.0.1:3300` als eingeloggter
   Admin — dafür fehlen in dieser Session Admin-Anmeldedaten/eine interaktive Playwright-Sitzung.
   Insbesondere NICHT live verifiziert: (a) dass die Anime-anlegen-Übergabe für einen ECHTEN
   Film-Kandidaten aus der echten Jellyfin-Bibliothek tatsächlich Cover/Banner/Logo lädt, (b) das
   tatsächliche visuelle Erscheinungsbild der kompakten Aktionsreihe (Pixel-Ausrichtung,
   Farbkontrast) im Browser, (c) das reale Pagination-Verhalten gegen den echten ~2111-Item-Jellyfin-
   Snapshot mit einem echten, nur wenige Treffer liefernden Suchbegriff wie "Accel World". Die
   Nachweise in diesem Plan stützen sich ausschließlich auf die oben gelisteten automatisierten
   Tests plus `go build`/`go vet`/`tsc`/`eslint`.

7. Gezielt committen (kein `git add -A`/`.`): alle in `files_modified` gelisteten Pfade explizit per
   Pfad zu `git add` hinzufügen, dann `git commit` mit einer Commit-Message, die auf GAP-01..GAP-04
   (Phase 165 Live-UAT) verweist. Kein `git push`.
  </action>
  <verify>
    <automated>docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./..." 2>&1 | tail -30 && docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run typecheck" 2>&1 | tail -30</automated>
  </verify>
  <done>
Backend baut/vettet fehlerfrei, alle betroffenen Go-Tests grün. Frontend-Typecheck 0 Fehler, ESLint
0 neue Findings, alle gelisteten Vitest-Dateien grün. Frontend-Container neu gestartet und erreichbar.
SUMMARY.md dokumentiert wörtlich, welche der 4 Gaps NICHT live im Browser verifiziert wurden. Änderungen
sind gezielt committet (kein `git add -A`), kein Push.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Admin-Browser -> Backend Admin-API | `GET /admin/jellyfin/discovery`, `POST /admin/jellyfin/intake/preview` erfordern bereits `requireAdmin` (unverändert). Eingabe: `filter`/`q`/`cursor`/`limit`-Query-Parameter, `jellyfin_series_id` im Preview-Request-Body — alle bereits vor diesem Plan vorhanden, keine neue Eingabeklasse. |
| Backend -> Jellyfin-Upstream | Unverändert durch diesen Plan; Discovery-Snapshot/Preview lesen weiterhin ausschließlich über die bestehende, konfigurierte `JELLYFIN_BASE_URL`. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-quick-260922-cew-01 | Tampering | `frontend/.../useJellyfinIntakeImpl.ts` `loadPreview` (GAP-01) | accept | `jellyfin_series_id` wird jetzt auch ohne Treffer in `candidates` direkt an den bestehenden, bereits admin-only geschützten `POST /admin/jellyfin/intake/preview`-Endpunkt übergeben. Kein neuer Endpunkt, keine neue Berechtigungsausweitung: ein Admin konnte den Preview-Endpunkt schon vorher mit einer beliebigen ID aus der Direktsuche aufrufen; der Backend-Endpunkt validiert die ID ohnehin serverseitig gegen die echte Jellyfin-API (unbekannte ID -> Fehler, kein SSRF, da die ID als Item-Kennung, nicht als URL, verwendet wird). |
| T-quick-260922-cew-02 | Denial of Service | `backend/internal/handlers/jellyfin_discovery.go` `buildJellyfinDiscoveryFilteredPage` (GAP-02) | accept | Das Scan-/Batch-Fenster für die Existenz-/Ignorier-Lookups kann sich im Worst Case über den gesamten (bereits suchtext-gefilterten) Rest-Snapshot erstrecken (~2111 Items laut D-29-Messung) statt nur über `limit` Items. Bleibt bei GENAU 1 SQL-Query pro Feld pro Seite (kein N+1); die Snapshot-Größenordnung ist bereits durch `TestJellyfinDiscovery_ScalePaginationAndBudget_D29` lastgetestet. Kein extern kontrollierbarer Multiplikator (Snapshot-Größe hängt nur von der konfigurierten Jellyfin-Bibliothek ab, nicht von Nutzereingaben). |
| T-quick-260922-cew-03 | Information Disclosure | `backend/internal/models/jellyfin_discovery.go` `ParentContext` (GAP-03) | accept | Zusätzliches Feld leitet sich aus demselben bereits öffentlich für Admins sichtbaren Jellyfin-Ordnerpfad ab wie das bestehende `library_context` — keine neue Datenquelle, keine neue Sichtbarkeit über den admin-only-Endpunkt hinaus. |
</threat_model>

<verification>
1. `docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./... && go test ./internal/handlers/... ./internal/repository/... -run 'TestJellyfinDiscovery|TestSeekDiscovery' -v"` — alle grün, inklusive 4 neuer Tests (A, B, D-Erweiterung sowie der SeekDiscoveryStartIndex-Wiederverwendung).
2. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run typecheck"` — 0 Fehler.
3. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts src/app/admin/anime/create/library/discoveryPageHelpers.ts src/app/admin/anime/create/library/DiscoveryLibraryCard.tsx src/types/admin.ts"` — 0 neue Findings.
4. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/anime/create/useAdminAnimeCreateController.test.ts src/app/admin/anime/create/library/useDiscoveryLibraryFilters.test.ts src/app/admin/anime/create/library/discoveryPageHelpers.test.ts src/app/admin/anime/create/library/DiscoveryLibraryCard.test.tsx src/app/admin/anime/create/library/DiscoveryLibraryPanel.test.tsx src/app/admin/anime/create/page.test.tsx"` — alle grün.
5. `docker restart team4sv30-frontend` gefolgt von `curl` gegen `/admin/anime/create` und `/admin/anime/create/library` — kein 500.
6. `git diff --stat` zeigt ausschließlich die in `files_modified` gelisteten Pfade — keine unbeabsichtigten Nebenänderungen, kein Push.
</verification>

<success_criteria>
- GAP-01 (Blocker): Anime-anlegen-Übergabe aus der Bibliothek befüllt Cover/Ordnerpfad/Typ/AniSearch-
  Titelfeld exakt wie der bestehende Direktsuche-Übernahmepfad, ohne dass vorher eine Direktsuche
  gelaufen sein muss; ein Fehlschlag zeigt eine sichtbare Fehlermeldung.
- GAP-02: "Weiter" auf der Bibliotheksliste ist nur aktiv, wenn wirklich weitere zum Filter passende
  Treffer existieren; ein Klick liefert immer neue Einträge und erhöht die Seitenzahl.
- GAP-03: Die Karten-Metazeile zeigt Typ/Unterordner/Bibliothek konsistent mit der bestehenden
  Jellyfin-Suchkarte statt "media" als einzigen, bedeutungslosen Kontext.
- GAP-04: Die Aktionsschaltflächen jeder Karte sind kompakt, rechtsbündig und nebeneinander
  (Ignorieren sekundär, Anime anlegen primär) statt gestapelter voller-Breite-Buttons.
- Bestehender Direktsuche-Regressionstest (candidates-Pfad) und alle sonstigen vorbestehenden Tests
  in den berührten Dateien bleiben grün. Kein Backend-Query-Budget-Regress (weiterhin exakt 1 Query
  pro Feld pro Seite).
- `go build`/`go vet`/`npm run typecheck`/`eslint` sauber. Kein `git add -A`, kein `git push`.
- SUMMARY.md dokumentiert explizit, welche Teile NICHT live im Browser verifiziert wurden (siehe
  Task 5, Schritt 6).
</success_criteria>

<output>
Create `.planning/quick/260922-cew-phase-165-live-uat-fixes-gap-01-gap-04-b/260922-cew-SUMMARY.md` when done
</output>
