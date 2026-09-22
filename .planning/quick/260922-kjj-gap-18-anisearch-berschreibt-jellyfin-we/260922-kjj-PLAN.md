---
phase: quick-260922-kjj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [frontend/src/app/admin/anime/create/aniSearchJellyfinPrecedence.ts, frontend/src/app/admin/anime/create/aniSearchJellyfinPrecedence.test.ts, frontend/src/app/admin/anime/create/createPageHelpers.ts, frontend/src/app/admin/anime/create/createAniSearchControllerHelpers.ts, frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts, frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts, frontend/src/app/admin/anime/create/CreateAssetSearchDialog.tsx, frontend/src/app/admin/anime/create/CreateJellyfinResultsPanel.tsx, frontend/src/app/admin/anime/create/createAniSearchSummary.ts, frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx, frontend/src/app/admin/anime/create/page.test.tsx, .planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md]
autonomous: true
requirements: [GAP-18]

must_haves:
  truths:
    - "Jellyfin zuerst, AniSearch danach: AniSearch-Jahr und -Beschreibung landen im Entwurf, nicht die von Jellyfin gelieferten Werte (165-USER-REQUEST.md §14)"
    - "Ändert der Admin ein Feld (z. B. Jahr) von Hand NACH der Jellyfin-Übernahme, bleibt diese Handänderung auch nach einem späteren AniSearch-Laden erhalten"
    - "AniSearch zuerst, Jellyfin danach: die AniSearch-Werte bleiben maßgeblich, Jellyfin füllt nur leere Felder (unverändertes Verhalten)"
    - "Ein aus Jellyfin übernommenes oder per Online-Suche gewähltes Cover-Bild wird durch ein späteres AniSearch-Laden nicht ersetzt"
    - "Die Fehlermeldungen/Hilfetexte im Anlege-/Asset-Dialog verwenden echte Umlaute (u. a. „Größe unbekannt“ statt „Groesse unbekannt“)"
    - "GAP-18 ist in 165-UAT.md mit status: resolved dokumentiert"
  artifacts:
    - path: "frontend/src/app/admin/anime/create/aniSearchJellyfinPrecedence.ts"
      provides: "isolierte Präzedenz-Logik: welche Felder gelten als echte Handänderung nach einer Jellyfin-Übernahme und werden deshalb vor AniSearch geschützt"
      contains: "export function resolveAniSearchProtectedFields"
    - path: "frontend/src/app/admin/anime/create/createPageHelpers.ts"
      provides: "resolveCreateAniSearchDraftMergeInputs delegiert protectedFields-Berechnung an aniSearchJellyfinPrecedence statt an die alte Pre-Hydration-Baseline"
      contains: "jellyfinHydratedSnapshot"
    - path: "frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts"
      provides: "neuer Snapshot-State (Draft-Stand direkt NACH Jellyfin-Übernahme) wird bei Adopt gesetzt und beim Discard zurückgesetzt"
      contains: "jellyfinHydratedDraftSnapshot"
  key_links:
    - from: "frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts"
      to: "frontend/src/app/admin/anime/create/aniSearchJellyfinPrecedence.ts"
      via: "handleJellyfinCandidateAdopt setzt jellyfinHydratedDraftSnapshot; loadAniSearchDraftByID reicht ihn über resolveCreateAniSearchDraftMergeInputs/applyCreateAniSearchControllerResult an resolveAniSearchProtectedFields weiter"
      pattern: "jellyfinHydratedSnapshot"
    - from: "frontend/src/app/admin/anime/create/createAniSearchControllerHelpers.ts"
      to: "frontend/src/app/admin/anime/create/createPageHelpers.ts"
      via: "applyCreateAniSearchControllerResult ruft resolveCreateAniSearchDraftMergeInputs mit currentDraft/jellyfinSnapshot/jellyfinHydratedSnapshot auf"
      pattern: "resolveCreateAniSearchDraftMergeInputs\\("
---

<objective>
GAP-18 (Phase-165-Live-UAT, 2026-09-22, Anime #5 „.hack//G.U. Trilogy", angelegt über die Bibliothek):
gespeichert wurden Jahr 2002 und die Beschreibung aus Jellyfin (Jellyfin erkannte den Ordner fälschlich
als Serie „.hack" 2002), obwohl AniSearch 4491 Erstausstrahlung 22.12.2007 und eine eigene Beschreibung
liefert. Titel, Genres, Tags kamen korrekt von AniSearch. Verstößt gegen 165-USER-REQUEST.md §14
("AniSearch bleibt fachliche Wahrheit") und den nie umgesetzten Pflichttest I (Jellyfin zuerst, AniSearch
danach → AniSearch maßgeblich).

Diagnostizierte Ursache: `resolveCreateAniSearchDraftMergeInputs` in
`frontend/src/app/admin/anime/create/createPageHelpers.ts` (aktuell Zeile 298ff, per
`grep -n "^export function resolveCreateAniSearchDraftMergeInputs"` neu verifizieren) markiert ein Feld
als `protectedFields`, wenn der aktuelle Entwurf vom Vergleichswert `baseline` abweicht. `baseline` ist
aktuell der `jellyfinSnapshot`-Parameter — das ist der Entwurfs-Stand, den
`resolveJellyfinPreviewBaseDraft(manualDraftValues, jellyfinDraftSnapshot)` in
`useAdminAnimeCreateController.ts` `handleJellyfinCandidateAdopt` VOR der Jellyfin-Hydrierung einfriert
(also der leere/manuelle Stand). Dadurch gelten alle von Jellyfin eingetragenen Werte (year, description,
type, status, max_episodes, genre, tags, title_de/en) als Handänderungen und werden vor AniSearch
geschützt, obwohl es reine Jellyfin-Automatik war. `cover_image` ist von diesem Mechanismus nicht
betroffen — `hydrateManualDraftFromAniSearchDraft` in `../hooks/useManualAnimeDraft.ts` übernimmt
`coverImage` ohnehin nur, wenn `incoming.cover_image` gesetzt ist, und der Backend-AniSearch-Crawl
(`buildAniSearchDraftPayload` in `backend/internal/services/anime_create_enrichment.go`) setzt
`CoverImage` nie — Bilder bleiben also bereits heute unangetastet; Testfall 4 unten sichert das als
Regression ab, ohne dass dafür Produktionscode geändert werden muss.

Verbindliche Auftraggeber-Entscheidungen (nicht neu verhandeln):
- AniSearch ist fachlich maßgeblich für Titel, Typ, Jahr, Episoden, Beschreibung, Genres, Tags,
  Relationen (165-USER-REQUEST.md §14). Jellyfin bleibt Quelle für Ordnerpfad, Bilder, technische Daten.
- Geschützt werden nur ECHTE Handänderungen des Admins — Werte, die Jellyfin automatisch eingetragen hat,
  dürfen von AniSearch überschrieben werden.
- Vergleichsbasis für "was ist eine Handänderung" wird der Entwurfs-Stand DIREKT NACH der
  Jellyfin-Hydrierung (nicht mehr davor).
- Reihenfolge AniSearch zuerst, dann Jellyfin bleibt unverändert (Jellyfin füllt nur Lücken, "fill"-Modus
  in `hydrateManualDraftFromJellyfinPreview` bleibt unangetastet).
- Cover-Bild (`cover_image`) wird NIE über diesen Präzedenz-Mechanismus geschützt oder überschrieben —
  es gehört fachlich nicht zur AniSearch-Präzedenzliste.
- Neue Logik in einer eigenen kleinen Datei (`aniSearchJellyfinPrecedence.ts`), NICHT in
  `createPageHelpers.ts` (341 Zeilen), `useAdminAnimeCreateController.ts` (1493 Zeilen) oder
  `create/page.tsx` (540 Zeilen) einfügen — diese Dateien werden nur minimal verdrahtet, nicht
  inhaltlich erweitert.
- Direkt auf `main`, kein `git stash`, kein Push, keine `.env`- oder `team4s_v2`-Datenänderung (Anime #5
  wird separat behandelt).

Purpose: Der Admin kann sich darauf verlassen, dass AniSearch nach der Auswahl tatsächlich die fachliche
Wahrheit für Titel, Jahr, Beschreibung, Typ, Episoden, Genres und Tags liefert — Jellyfin-Automatik
überlebt keinen nachfolgenden AniSearch-Import mehr, echte Handänderungen bleiben aber geschützt.
Output: `aniSearchJellyfinPrecedence.ts` mit `resolveAniSearchProtectedFields`; verdrahtet über
`createPageHelpers.ts`, `createAniSearchControllerHelpers.ts`, `useAdminAnimeCreateController.ts`;
Controller-Level-Tests für alle vier geforderten Szenarien; korrigierte Umlaute im Anlege-/Asset-Dialog;
GAP-18-Eintrag in 165-UAT.md; grüner Frontend-Test-/Typecheck-/Lint-Lauf im Container;
`docker restart team4sv30-frontend`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@frontend/src/app/admin/anime/create/createPageHelpers.ts
@frontend/src/app/admin/anime/create/createAniSearchControllerHelpers.ts
@frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
@frontend/src/app/admin/anime/hooks/useManualAnimeDraft.ts
@.planning/phases/165-library-discovery-assisted-anime-creation/165-USER-REQUEST.md
@.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md

<interfaces>
<!-- Aktueller Stand (vor diesem Plan). Zeilennummern per grep neu verifizieren, bevor editiert wird —
Task 1 verändert Zeilennummern in useAdminAnimeCreateController.ts für alle nachfolgenden Blöcke. -->

resolveCreateAniSearchDraftMergeInputs (createPageHelpers.ts, aktuell Zeile 289-326):
  function fieldDiffers(left: string, right: string): boolean
  function arrayDiffers(left: string[], right: string[]): boolean
  export function resolveCreateAniSearchDraftMergeInputs(params: {
    currentDraft: ManualAnimeDraftValues
    jellyfinSnapshot: ManualAnimeDraftValues | null
  }): { requestDraft: AdminAnimeCreateDraftPayload; protectedFields: string[] }
  — baseline wird IMMER aus jellyfinSnapshot (falls vorhanden) gebaut; requestDraft UND protectedFields
  nutzen aktuell dieselbe Baseline. Nach diesem Plan bleibt requestDraft bei dieser Baseline (Backend
  füllt darüber korrekt aus AniSearch auf, siehe unten), NUR protectedFields bekommt eine neue,
  zusätzliche Baseline (jellyfinHydratedSnapshot).

applyCreateAniSearchControllerResult (createAniSearchControllerHelpers.ts, aktuell Zeile 94-132):
  export function applyCreateAniSearchControllerResult(params: {
    currentDraft: ManualAnimeDraftValues;
    jellyfinSnapshot: ManualAnimeDraftValues | null;
    result: AdminAnimeAniSearchCreateResult;
  }): { nextDraft: ManualAnimeDraftValues; draftResult: CreateAniSearchDraftState | null; redirect: ... }
  — ruft intern resolveCreateAniSearchDraftMergeInputs auf und danach
  hydrateManualDraftFromAniSearchDraft(currentDraft, result.draft, mergeInputs.protectedFields).

useAdminAnimeCreateController.ts — relevante Stellen (aktuelle Zeilennummern, VOR diesem Plan):
  Zeile 69-75: Import-Block aus "../hooks/useManualAnimeDraft" (hydrateManualDraftFromJellyfinPreview,
  removeJellyfinDraftAsset, resolveManualCreateState, JellyfinDraftAssetTarget, ManualAnimeDraftValues) —
  buildManualCreateDraftSnapshot fehlt hier noch.
  Zeile 277-278: const [jellyfinDraftSnapshot, setJellyfinDraftSnapshot] = useState<ManualAnimeDraftValues
  | null>(null); — das ist der PRE-Hydration-Snapshot (unverändert lassen).
  Zeile 943-980: async function handleJellyfinCandidateAdopt(candidateID) — ruft
  hydrateManualDraftFromJellyfinPreview, dann applyManualDraftValues(hydrated.draft). Dies ist der EINZIGE
  Adopt-Pfad, der von page.tsx tatsächlich aufgerufen wird (handleJellyfinAdopt bei Zeile 995 ist nicht
  verdrahtet, aber exportiert — aus Konsistenzgründen ebenfalls anpassen).
  Zeile 1009-1020: function handleDiscardJellyfinPreview() — setzt jellyfinDraftSnapshot auf null zurück.
  Zeile 1022-1082: async function loadAniSearchDraftByID(anisearchID) — ruft
  resolveCreateAniSearchDraftMergeInputs (~Zeile 1042-1045, für requestPayload.draft) UND
  applyCreateAniSearchControllerResult (~Zeile 1053-1056, für die Merge-Anwendung) jeweils mit
  { currentDraft: manualDraftValues, jellyfinSnapshot: jellyfinDraftSnapshot }.

hydrateManualDraftFromAniSearchDraft (../hooks/useManualAnimeDraft.ts, aktuell Zeile 132-166):
  coverImage: incoming.cover_image?.trim() || draft.coverImage — UNGEGATED durch protectedFields (absichtlich
  so lassen; siehe Objective-Begründung zu Testfall 4).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Präzedenz-Fix — neue Datei aniSearchJellyfinPrecedence.ts + Verdrahtung</name>
  <files>frontend/src/app/admin/anime/create/aniSearchJellyfinPrecedence.ts, frontend/src/app/admin/anime/create/aniSearchJellyfinPrecedence.test.ts, frontend/src/app/admin/anime/create/createPageHelpers.ts, frontend/src/app/admin/anime/create/createAniSearchControllerHelpers.ts, frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts, frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts</files>
  <behavior>
    - Test 1 (aniSearchJellyfinPrecedence.test.ts, neu): resolveAniSearchProtectedFields({ currentDraft:
      &lt;beliebiger Draft&gt;, jellyfinHydratedSnapshot: null }) liefert [] — ohne Jellyfin-Adopt gibt es
      keine Präzedenz-Prüfung.
    - Test 2: currentDraft ist inhaltlich gleich zum jellyfinHydratedSnapshot (simuliert: Jellyfin hat
      year, description, genreTokens, tagTokens, titleDE, type, status, contentType, maxEpisodes gesetzt,
      der Admin hat seitdem nichts von Hand geändert) → liefert []. Das ist der GAP-18-Kernfall: rein
      Jellyfin-befüllte Felder sind NICHT geschützt.
    - Test 3: currentDraft.year unterscheidet sich vom jellyfinHydratedSnapshot.year (Admin hat nach der
      Jellyfin-Übernahme von Hand auf einen anderen Wert geändert) → Ergebnis enthält "year". Analog je
      ein Fall für description, genreTokens-Diff (→ "genre"), tagTokens-Diff (→ "tags").
    - Test 4: unabhängig davon, wie stark sich currentDraft.coverImage vom
      jellyfinHydratedSnapshot.coverImage unterscheidet, enthält das Ergebnis NIE "cover_image" — Bilder
      sind bewusst außerhalb dieser Präzedenzliste (siehe Objective).
  </behavior>
  <action>
Neue Datei frontend/src/app/admin/anime/create/aniSearchJellyfinPrecedence.ts anlegen. Kopfkommentar:
diese Datei entscheidet für GAP-18, welche Felder eines Create-Entwurfs als echte Handänderung des Admins
nach einer Jellyfin-Übernahme gelten und deshalb vor einem nachfolgenden AniSearch-Laden geschützt
werden — Felder, die nur von Jellyfin automatisch befüllt wurden, sind NICHT geschützt und dürfen von
AniSearch überschrieben werden (165-USER-REQUEST.md §14: AniSearch bleibt fachliche Wahrheit für Titel,
Typ, Jahr, Episoden, Beschreibung, Genres, Tags; Jellyfin bleibt Quelle für Bilder/Pfad/technische Daten).
Importiert type ManualAnimeDraftValues und buildManualCreateDraftSnapshot aus
"../hooks/useManualAnimeDraft". Lokale, nicht exportierte Hilfsfunktionen fieldDiffers(left: string,
right: string): boolean (Vergleich nach .trim()) und arrayDiffers(left: string[], right: string[]):
boolean (Längenvergleich + elementweiser .trim()-Vergleich) — inhaltlich identisch zur Logik, die aktuell
in createPageHelpers.ts bei fieldDiffers/arrayDiffers steht (dorthin per
grep -n "^function fieldDiffers\|^function arrayDiffers" verifizieren). Exportierte Hauptfunktion:
resolveAniSearchProtectedFields(params: { currentDraft: ManualAnimeDraftValues; jellyfinHydratedSnapshot:
ManualAnimeDraftValues | null }): string[].

Verhalten: wenn params.jellyfinHydratedSnapshot null ist, sofort [] zurückgeben (keine
Jellyfin-Übernahme stattgefunden, also nichts zu schützen). Sonst baseline =
buildManualCreateDraftSnapshot(params.jellyfinHydratedSnapshot) bilden und current = params.currentDraft
— für jedes der folgenden Felder, bei Abweichung von current gegenüber baseline, den jeweiligen String in
das Ergebnis-Array pushen (Feldname → Draft-Property, exakt wie aktuell in createPageHelpers.ts
resolveCreateAniSearchDraftMergeInputs, per grep -n "protectedFields.push"
frontend/src/app/admin/anime/create/createPageHelpers.ts als Referenz lesen, BEVOR diese Zeilen dort
entfernt werden): title_de↔titleDE (fieldDiffers), title_en↔titleEN (fieldDiffers), year↔year
(fieldDiffers), max_episodes↔maxEpisodes (fieldDiffers), genre↔genreTokens (arrayDiffers),
tags↔tagTokens (arrayDiffers), description↔description (fieldDiffers), type↔type (strikter
!==-Vergleich), content_type↔contentType (strikter !==-Vergleich), status↔status (strikter
!==-Vergleich). WICHTIG (GAP-18-Fix): cover_image wird absichtlich NICHT in diese Liste aufgenommen — mit
einem Kommentar direkt an dieser Stelle begründen, warum (Bilder gehören fachlich zu Jellyfin/manueller
Wahl/Online-Suche, nicht zu AniSearch, siehe Objective).

frontend/src/app/admin/anime/create/aniSearchJellyfinPrecedence.test.ts anlegen mit Test 1-4 aus dem
Behavior-Block oben. Für Test 2/3 einen kompletten, plausiblen ManualAnimeDraftValues-Fixture-Wert wiederverwenden
(title, type: "tv", contentType: "anime", status: "ongoing", year, maxEpisodes, titleDE, titleEN,
genreTokens, tagTokens, description, coverImage, source, folderName — alle Pflichtfelder befüllen, damit
der Typ ohne "as any" durchgeht).

In frontend/src/app/admin/anime/create/createPageHelpers.ts: die lokalen Funktionen fieldDiffers und
arrayDiffers (aktuell Zeile 289-296) vollständig ENTFERNEN — sie werden nach aniSearchJellyfinPrecedence.ts
verschoben und sind hier nach dem Umbau ungenutzt. resolveCreateAniSearchDraftMergeInputs (aktuell Zeile
298-326) umbauen: Signatur um ein optionales drittes Feld erweitern, jellyfinHydratedSnapshot?:
ManualAnimeDraftValues | null. Die requestDraft-Berechnung (baseline aus params.jellyfinSnapshot bzw.
params.currentDraft, dann mapManualDraftToCreateDraft(baseline)) BLEIBT UNVERÄNDERT — nur die bisherige
inline "if (params.jellyfinSnapshot) { ... protectedFields.push(...) }"-Schleife wird ERSETZT durch einen
Aufruf resolveAniSearchProtectedFields({ currentDraft: params.currentDraft, jellyfinHydratedSnapshot:
params.jellyfinHydratedSnapshot ?? null }), dessen Ergebnis als protectedFields zurückgegeben wird. Import
resolveAniSearchProtectedFields aus "./aniSearchJellyfinPrecedence" ergänzen.

In frontend/src/app/admin/anime/create/createAniSearchControllerHelpers.ts: applyCreateAniSearchControllerResult
(aktuell Zeile 94-132) bekommt im Params-Objekt ein zusätzliches optionales Feld jellyfinHydratedSnapshot?:
ManualAnimeDraftValues | null, das 1:1 an den bestehenden resolveCreateAniSearchDraftMergeInputs(...)-Aufruf
durchgereicht wird (als jellyfinHydratedSnapshot: params.jellyfinHydratedSnapshot ?? null). Sonst keine
Änderungen an dieser Datei.

In frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts: im Import-Block aus
"../hooks/useManualAnimeDraft" (aktuell Zeile 69-75) buildManualCreateDraftSnapshot ergänzen. Direkt neben
der bestehenden State-Deklaration jellyfinDraftSnapshot/setJellyfinDraftSnapshot (aktuell Zeile 277-278)
einen neuen State const [jellyfinHydratedDraftSnapshot, setJellyfinHydratedDraftSnapshot] =
useState&lt;ManualAnimeDraftValues | null&gt;(null); ergänzen — mit einem kurzen Kommentar, dass dies
(anders als jellyfinDraftSnapshot, der PRE-Hydration-Stand für "Verwerfen") der Entwurfs-Stand DIREKT
NACH der Jellyfin-Übernahme ist, verwendet ausschließlich zur GAP-18-Präzedenzprüfung. In
handleJellyfinCandidateAdopt (aktuell Zeile 943-980) UND in handleJellyfinAdopt (aktuell Zeile 995-1007)
jeweils direkt NACH dem bestehenden applyManualDraftValues(hydrated.draft);-Aufruf eine neue Zeile
setJellyfinHydratedDraftSnapshot(buildManualCreateDraftSnapshot(hydrated.draft)); einfügen. In
handleDiscardJellyfinPreview (aktuell Zeile 1009-1020) direkt neben dem bestehenden
setJellyfinDraftSnapshot(null); eine Zeile setJellyfinHydratedDraftSnapshot(null); ergänzen. In
loadAniSearchDraftByID (aktuell Zeile 1022-1082) BEIDE bestehenden Aufrufstellen —
resolveCreateAniSearchDraftMergeInputs({ currentDraft: manualDraftValues, jellyfinSnapshot:
jellyfinDraftSnapshot }) (~Zeile 1042-1045) UND applyCreateAniSearchControllerResult({ currentDraft:
manualDraftValues, jellyfinSnapshot: jellyfinDraftSnapshot, result: response.data }) (~Zeile 1053-1056) —
um jellyfinHydratedSnapshot: jellyfinHydratedDraftSnapshot ergänzen.

In frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts GENAU ZWEI bestehende Tests
reparieren, die durch den Signaturwechsel semantisch betroffen sind (per grep -n "uses the pre-Jellyfin
snapshot\|preserves real manual edits when AniSearch is loaded after Jellyfin" lokalisieren): (1) im Test
'uses the pre-Jellyfin snapshot so AniSearch can beat Jellyfin when loaded second' den bestehenden
resolveCreateAniSearchDraftMergeInputs({ currentDraft: jellyfinHydrated.draft, jellyfinSnapshot: snapshot
})-Aufruf um jellyfinHydratedSnapshot: jellyfinHydrated.draft ergänzen und zwei neue Assertions
hinzufügen: expect(mergeInputs.protectedFields).not.toContain('year') und
expect(mergeInputs.protectedFields).not.toContain('description') — das ist die unmittelbare
GAP-18-Regressionssicherung auf Unit-Ebene. (2) im Test 'preserves real manual edits when AniSearch is
loaded after Jellyfin' den bestehenden applyCreateAniSearchControllerResult({ currentDraft,
jellyfinSnapshot: manualLookupDraft, result: {...} })-Aufruf um jellyfinHydratedSnapshot:
jellyfinHydrated.draft ergänzen (jellyfinHydrated ist bereits im selben Test definiert, VOR den manuellen
titleDE/description-Overrides auf currentDraft) — die bestehenden Assertions (titleDE/description bleiben
die manuellen Werte) müssen unverändert grün bleiben, da es sich um eine echte Handänderung NACH der
Jellyfin-Übernahme handelt.
  </action>
  <verify>
    <automated>docker exec team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/anime/create/aniSearchJellyfinPrecedence.test.ts src/app/admin/anime/create/createPageHelpers.test.ts src/app/admin/anime/create/useAdminAnimeCreateController.test.ts" 2>&1 | tail -150</automated>
  </verify>
  <done>
aniSearchJellyfinPrecedence.ts existiert mit resolveAniSearchProtectedFields, alle vier neuen Tests grün.
createPageHelpers.ts enthält kein fieldDiffers/arrayDiffers mehr (verschoben). resolveCreateAniSearchDraftMergeInputs
und applyCreateAniSearchControllerResult akzeptieren jellyfinHydratedSnapshot. useAdminAnimeCreateController.ts
setzt/resettet jellyfinHydratedDraftSnapshot an den vier genannten Stellen. Beide reparierten Bestandstests
sowie alle übrigen, bisher grünen Tests in useAdminAnimeCreateController.test.ts und createPageHelpers.test.ts
bleiben grün.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Controller-Level-Tests für alle vier GAP-18-Szenarien + UAT-Eintrag</name>
  <files>frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts, .planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md</files>
  <behavior>
    - Szenario 1 (Jellyfin zuerst, AniSearch danach → AniSearch gewinnt bei Jahr/Beschreibung): echter
      renderHook(() =&gt; useAdminAnimeCreateController())-Aufbau wie die bestehenden Tests im Block
      describe('useAdminAnimeCreateController (hook execution)', ...). Ablauf: setJellyfinQuery('Naruto')
      → handleJellyfinSearch() → handleJellyfinCandidateAdopt('series-42') (nutzt die bereits im Datei-Kopf
      definierten Fixtures jellyfinSearchCandidate/jellyfinPreviewResult mit year: 1998, description:
      'Imported from Jellyfin'). Danach Sanity-Check: manualDraft.values.year === '1998' UND description
      === 'Imported from Jellyfin'. Dann intakeMocks.loadAdminAnimeCreateAniSearchDraft.mockResolvedValueOnce
      mit einem Draft-Ergebnis mode: 'draft', anisearch_id: '4491', source: 'anisearch:4491', draft: {
      title: '.hack//G.U. Trilogy', type: 'tv', content_type: 'anime', status: 'ongoing', year: 2007,
      description: 'AniSearch-Beschreibung fuer .hack//G.U. Trilogy' }, filled_fields: ['year',
      'description'], manual_fields_kept: [], provider: { anisearch_id: '4491', jellysync_applied: false,
      relation_candidates: 0, relation_matches: 0 } — dann setAniSearchID('4491') →
      handleAniSearchDraftLoad(). Assertion: manualDraft.values.year === '2007' UND
      manualDraft.values.description === 'AniSearch-Beschreibung fuer .hack//G.U. Trilogy' (VOR dem
      GAP-18-Fix wären das noch '1998'/'Imported from Jellyfin' gewesen — das ist die zentrale Regression,
      die dieser Plan behebt).
    - Szenario 2 (Handänderung nach Jellyfin-Übernahme bleibt geschützt): identischer Ablauf bis nach dem
      Adopt, dann zusätzlich act(() =&gt; result.current.handlers.setYear('2010')) VOR dem AniSearch-Laden
      (simuliert eine echte Admin-Korrektur). Gleicher AniSearch-Mock wie Szenario 1 (year: 2007). Nach
      handleAniSearchDraftLoad(): manualDraft.values.year === '2010' (bleibt die Handänderung, NICHT 2007).
    - Szenario 3 (AniSearch zuerst, Jellyfin danach → AniSearch bleibt maßgeblich, unverändertes
      Verhalten): frischer renderHook. intakeMocks.loadAdminAnimeCreateAniSearchDraft.mockResolvedValueOnce
      mit draft: { title: 'Serial Experiments Lain', type: 'tv', content_type: 'anime', status: 'ongoing',
      year: 2007, description: 'AniSearch-Text' } (kein cover_image-Feld) → setAniSearchID + handleAniSearchDraftLoad.
      Sanity-Check: manualDraft.values.year === '2007', description === 'AniSearch-Text'. Danach
      setJellyfinQuery('Naruto') → handleJellyfinSearch() → handleJellyfinCandidateAdopt('series-42')
      (jellyfinPreviewResult liefert year: 1998, description: 'Imported from Jellyfin'; da bereits ein
      aniSearchDraftResult existiert, hydriert handleJellyfinCandidateAdopt im "fill"-Modus, der nur leere
      Felder befüllt). Assertion NACH dem Jellyfin-Adopt: manualDraft.values.year bleibt '2007',
      description bleibt 'AniSearch-Text' (unverändert von Jellyfin überschrieben).
    - Szenario 4 (Cover aus Jellyfin bleibt nach AniSearch erhalten): frischer renderHook.
      intakeMocks.previewAdminAnimeFromJellyfinIntake.mockReset().mockResolvedValueOnce({ data:
      filmJellyfinPreviewResult }) (bereits im Datei-Kopf definierte Fixture mit
      asset_slots.cover.url: 'https://jellyfin.example/cover.jpg') → handleJellyfinCandidateAdopt('series-99')
      direkt (ohne vorherige Suche, wie im bestehenden GAP-01-Test-Muster). Sanity-Check:
      manualDraft.values.coverImage === 'https://jellyfin.example/cover.jpg'. Dann
      intakeMocks.loadAdminAnimeCreateAniSearchDraft.mockResolvedValueOnce mit einem draft OHNE
      cover_image-Feld (title/type/content_type/status/year/description, wie bei echten
      AniSearch-Antworten — das Backend liefert nie ein cover_image aus dem AniSearch-Crawl) →
      setAniSearchID + handleAniSearchDraftLoad. Assertion: manualDraft.values.coverImage bleibt
      unverändert 'https://jellyfin.example/cover.jpg'.
  </behavior>
  <action>
In frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts im bestehenden Block
describe('useAdminAnimeCreateController (hook execution)', ...) (nutzt bereits renderHook, act, waitFor,
apiMocks, intakeMocks mit beforeEach-Resets sowie die Fixtures jellyfinSearchCandidate,
jellyfinPreviewResult, filmJellyfinPreviewResult) vier neue it(...)-Tests ergänzen, benannt 'GAP-18:
&lt;Szenariobeschreibung&gt;', die exakt die vier oben beschriebenen Szenarien umsetzen. Jeden AniSearch-Draft-Mock
über intakeMocks.loadAdminAnimeCreateAniSearchDraft.mockResolvedValueOnce({ data: { mode: 'draft', ... }
}) setzen (Antwortform wie die bestehende Fixture aniSearchDraftResponseFixture weiter oben in der
Datei). Jeden Handler-Aufruf, der eine Promise zurückgibt (handleJellyfinSearch, handleJellyfinCandidateAdopt,
handleAniSearchDraftLoad), in await act(async () =&gt; { await result.current.handlers.X(...) })
einbetten (bestehendes Muster in der Datei, siehe z. B. den Test 'D-23 fix: ...'). setYear-Aufrufe
(Szenario 2) synchron in act(() =&gt; result.current.handlers.setYear('2010')) einbetten. Nach jedem
Handler-Aufruf über result.current.manualDraft.values.&lt;feld&gt; assertieren (gleiche Zugriffsweise wie
bestehende Tests, z. B. result.current.manualDraft.values.title).

In .planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md: vor dem Bearbeiten mit
file 165-UAT.md und cat -A 165-UAT.md | tail -5 bestätigen, dass die Datei reine LF-Zeilenenden verwendet
(kein ^M). Am Ende der ## Gaps-Liste (nach dem bestehenden GAP-17-Eintrag) einen neuen Eintrag im exakt
gleichen Format wie die bestehenden status: resolved-Einträge anhängen (Write/Edit-Tool verwenden, kein
Bash-Heredoc):

  - truth: "GAP-18 (Live-UAT, 2026-09-22, Anime #5 „.hack//G.U. Trilogy"): AniSearch überschreibt
    Jellyfin-Werte nicht — Jahr und Beschreibung blieben nach Jellyfin-zuerst/AniSearch-danach auf den
    (fehlerhaften) Jellyfin-Werten stehen, obwohl AniSearch eigene, korrekte Werte liefert. Verstößt gegen
    165-USER-REQUEST.md §14 (AniSearch bleibt fachliche Wahrheit)"
    status: resolved
    reason: "Quick-Task 260922-kjj: resolveCreateAniSearchDraftMergeInputs verglich Handänderungen bisher
    gegen den Draft-Stand VOR der Jellyfin-Hydrierung, wodurch jedes von Jellyfin automatisch befüllte
    Feld fälschlich als geschützte Handänderung galt und AniSearch blockierte. Neue Datei
    aniSearchJellyfinPrecedence.ts (resolveAniSearchProtectedFields) vergleicht jetzt gegen den
    Draft-Stand DIREKT NACH der Jellyfin-Übernahme — nur echte, nachträgliche Handänderungen bleiben
    geschützt. cover_image bleibt bewusst außerhalb dieser Präzedenzliste. Vier Controller-Level-Tests
    (echter Hook-Pfad, nur API gemockt) decken Jellyfin-dann-AniSearch, Handänderung-übersteht-AniSearch,
    AniSearch-dann-Jellyfin und Cover-Erhalt ab."
    severity: major
    test: 1
    root_cause: "siehe .planning/quick/260922-kjj-gap-18-anisearch-berschreibt-jellyfin-we/260922-kjj-SUMMARY.md"
    artifacts: []
    missing: []

Nach dem Edit erneut cat -A 165-UAT.md | tail -20 prüfen — keine ^M-Zeichen, LF bleibt erhalten.
  </action>
  <verify>
    <automated>docker exec team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/anime/create/useAdminAnimeCreateController.test.ts" 2>&1 | tail -150 && grep -c "GAP-18" /home/d1sk/team4s/.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md && file /home/d1sk/team4s/.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md</automated>
  </verify>
  <done>
Alle vier neuen GAP-18-Controller-Tests grün, inklusive Szenario 1 (Jahr/Beschreibung wechseln von
Jellyfin zu AniSearch). Alle übrigen, bisher grünen Tests in useAdminAnimeCreateController.test.ts bleiben
grün. 165-UAT.md enthält den neuen GAP-18-Eintrag mit status: resolved, Datei bleibt LF-only.
  </done>
</task>

<task type="auto">
  <name>Task 3: Umlaut-Sweep im Anlege-/Asset-Dialog, Gesamtverifikation, Container-Restart</name>
  <files>frontend/src/app/admin/anime/create/CreateAssetSearchDialog.tsx, frontend/src/app/admin/anime/create/CreateJellyfinResultsPanel.tsx, frontend/src/app/admin/anime/create/createAniSearchSummary.ts, frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts, frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts, frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx, frontend/src/app/admin/anime/create/page.test.tsx</files>
  <action>
Zuerst per grep -rn "Groesse\|pruefe\|ueber[a-z]" frontend/src/app/admin/anime/create den aktuellen Stand
bestätigen (Zeilennummern können sich seit der Diagnose leicht verschoben haben). NUR echte user-facing
Zeichenketten korrigieren (JSX-Textknoten, Button-/Label-Texte, Fehlermeldungen, Hilfetexte,
Toast-/Erfolgsmeldungen) — Kommentare und Bezeichner (Variablen-, Funktionsnamen) sind laut CLAUDE.md vom
Scope ausgenommen und bleiben unangetastet (z. B. der Kommentar "ueberholt" in
useAdminAnimeCreateController.ts bei "Navigation ueberholt zu werden" NICHT anfassen).

In frontend/src/app/admin/anime/create/CreateAssetSearchDialog.tsx (Funktion getAssetCopy): die vier
helper-Zeichenketten "Wähle ein Cover aus und uebernimm es in den Entwurf.", "Wähle ein Banner aus und
uebernimm es in den Entwurf.", "Wähle ein Logo aus und uebernimm es in den Entwurf." und "Suche nach
passenden Assets und uebernimm sie in den Entwurf." auf "übernimm" korrigieren. Weiter unten im
Kandidaten-Rendering die Zeichenkette "Groesse unbekannt" (Fallback-Text, wenn candidate.width/height
fehlen) zu "Größe unbekannt" korrigieren.

In frontend/src/app/admin/anime/create/CreateJellyfinResultsPanel.tsx: die Überschrift "Treffer pruefen"
zu "Treffer prüfen" korrigieren; im folgenden Absatz "Erst Details pruefen, dann die ausgewählte Serie
aktiv in den Entwurf laden. Beim Laden wird die bisherige Jellyfin-Vorschau vollstaendig ersetzt." sowohl
"pruefen" zu "prüfen" als auch "vollstaendig" zu "vollständig" korrigieren (beide ASCII-Ersetzungen stehen
im selben Absatz, der ohnehin bearbeitet wird).

In frontend/src/app/admin/anime/create/createAniSearchSummary.ts (Funktion buildCreateAniSearchDraftSummary):
die Zeichenkette "AniSearch hat bestehende Jellyfin-Werte für ${overwrittenJellyfinFields.join(", ")}
ueberschrieben." zu "...überschrieben." korrigieren (Template-Literal, NUR das Wort "ueberschrieben"
ändern, Interpolation unverändert lassen).

In frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts ZWEI weitere user-facing
Zeichenketten korrigieren (NICHT den Kommentar bei "ueberholt" anfassen): in
resolveAniSearchCandidateSearchFeedback die errorMessage "Keine AniSearch-Treffer gefunden. Bitte pruefe
den Titel oder nutze die ID direkt." zu "...Bitte prüfe..."; in handleJellyfinSearch die Erfolgsmeldung
"Jellyfin-Suche abgeschlossen. Falls keine Karten erscheinen, pruefe Titel oder Ordnernamen." zu
"...prüfe Titel oder Ordnernamen.".

In frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts die Assertion im Test
'still reports no hits found when the search returns zero candidates' (per grep -n "Bitte pruefe den
Titel oder nutze die ID direkt" lokalisieren) von "Keine AniSearch-Treffer gefunden. Bitte pruefe den
Titel oder nutze die ID direkt." auf "...Bitte prüfe..." anpassen, damit sie weiterhin mit dem
korrigierten Produktionswert übereinstimmt.

In frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx BEIDE Vorkommen (Prop-Wert UND
die zugehörige .not.toContain(...)-Assertion) von "AniSearch hat bestehende Jellyfin-Werte für Titel und
Beschreibung ueberschrieben." auf "...überschrieben." anpassen (Konsistenz mit der korrigierten
createAniSearchSummary.ts-Ausgabe).

In frontend/src/app/admin/anime/create/page.test.tsx BEIDE Vorkommen (Prop-Wert UND zugehörige
.not.toContain(...)-Assertion) von "AniSearch hat bestehende Jellyfin-Werte für Titel ueberschrieben." auf
"...überschrieben." anpassen.

Danach im laufenden Frontend-Container die volle Verifikation ausführen: docker exec team4sv30-frontend
sh -c "cd /app && npm run typecheck" — muss fehlerfrei sein; docker exec team4sv30-frontend sh -c "cd /app
&& npm run lint" — muss fehlerfrei sein (bestehende, von diesem Plan unabhängige Warnungen/Fehler, falls
vorhanden, im SUMMARY.md namentlich auflisten statt sie zu unterdrücken); docker exec team4sv30-frontend
sh -c "cd /app && npm test" — die GESAMTE Frontend-Testsuite muss grün sein (alle in Task 1/2 neuen und
reparierten Tests eingeschlossen; bestehende, von diesem Plan unabhängige Fehlschläge, falls vorhanden,
NICHT als Regression werten, aber im SUMMARY.md namentlich auflisten). Abschließend docker restart
team4sv30-frontend ausführen (der Frontend-Container läuft per docker-compose.override.yml als
Dev-Server mit Bind-Mount und Hot-Reload — ein Rebuild ist nicht nötig, der Neustart lädt den Dev-Server
mit dem aktuellen Codestand neu, wie im Auftrag verlangt).
  </action>
  <verify>
    <automated>grep -c "Größe unbekannt" frontend/src/app/admin/anime/create/CreateAssetSearchDialog.tsx && grep -c "prüfe\|übernimm" frontend/src/app/admin/anime/create/CreateAssetSearchDialog.tsx && grep -c "Treffer prüfen" frontend/src/app/admin/anime/create/CreateJellyfinResultsPanel.tsx && grep -c "überschrieben" frontend/src/app/admin/anime/create/createAniSearchSummary.ts && docker exec team4sv30-frontend sh -c "cd /app && npm run typecheck && npm run lint && npm test" 2>&1 | tail -200 && docker restart team4sv30-frontend && docker compose ps team4sv30-frontend</automated>
  </verify>
  <done>
Alle im Action-Block genannten Zeichenketten verwenden echte Umlaute (grep-Belege siehe Verify-Block); keine
Code-Kommentare wurden dafür angefasst. npm run typecheck, npm run lint und npm test laufen im Container
fehlerfrei (neue/reparierte Tests eingeschlossen; vorbestehende, unabhängige Fehlschläge — falls
vorhanden — sind im SUMMARY.md namentlich dokumentiert, nicht stillschweigend ignoriert).
docker restart team4sv30-frontend wurde ausgeführt, der Container ist danach "Up".
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Admin-Browser → Frontend-Draft-State | Rein clientseitige Zusammenführung von Jellyfin- und AniSearch-Entwürfen vor dem Speichern; kein Request an eine neue Backend-Route, keine neue Eingabeklasse. Die betroffenen Funktionen (`resolveCreateAniSearchDraftMergeInputs`, `resolveAniSearchProtectedFields`, `hydrateManualDraftFromAniSearchDraft`) verarbeiten ausschließlich bereits im Browser vorhandene, vom selben authentifizierten Admin stammende Entwurfsdaten. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-260922-kjj-01 | Tampering | `aniSearchJellyfinPrecedence.ts` `resolveAniSearchProtectedFields` (Feld-Präzedenz-Entscheidung) | accept | Reine clientseitige String-/Array-Vergleichslogik ohne externe Eingabequelle jenseits des bereits vom selben Admin editierten Entwurfs; falsches Verhalten führt höchstens zu einem inhaltlich falschen, aber weiterhin admin-sichtbaren Entwurf VOR dem Speichern — kein Privilegien- oder Datenlecks-Risiko, da der Admin den Entwurf vor dem Absenden ohnehin sieht und die AniSearch-Antwort selbst bereits serverseitig durch die bestehende Admin-Auth geschützt ist. |
| T-quick-260922-kjj-02 | Information Disclosure | `useAdminAnimeCreateController.test.ts` / `165-UAT.md` (Testdaten mit fiktivem Anime „.hack//G.U. Trilogy", AniSearch-ID 4491) | accept | Ausschließlich fiktive/öffentlich bekannte Testdaten aus dem Live-UAT-Bug-Report, keine echten Zugangsdaten oder personenbezogenen Daten enthalten. |
</threat_model>

<verification>
1. `docker exec team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/anime/create/aniSearchJellyfinPrecedence.test.ts src/app/admin/anime/create/createPageHelpers.test.ts src/app/admin/anime/create/useAdminAnimeCreateController.test.ts src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx src/app/admin/anime/create/page.test.tsx"` — alle grün, inklusive der vier neuen GAP-18-Szenarien und der beiden reparierten Bestandstests.
2. `docker exec team4sv30-frontend sh -c "cd /app && npm run typecheck && npm run lint && npm test"` — vollständig grün (bzw. nur vorbestehende, dokumentierte Fehlschläge).
3. `grep -rn "Groesse\|pruefe\|ueber[a-z]" frontend/src/app/admin/anime/create` zeigt nach dem Fix nur noch Treffer in Code-Kommentaren, keine mehr in JSX-Text/Fehlermeldungen/Hilfetexten der bearbeiteten Dateien.
4. `.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md` enthält den neuen GAP-18-Eintrag (`status: resolved`), Datei bleibt LF-only.
5. `docker restart team4sv30-frontend` ausgeführt, Container danach "Up" (`docker compose ps team4sv30-frontend`).
6. `git diff --stat` zeigt ausschließlich die in `files_modified` gelisteten Pfade — kein `git add -A`, kein Push, keine `.env`- oder `team4s_v2`-Änderung.
</verification>

<success_criteria>
- Jellyfin-zuerst/AniSearch-danach: AniSearch-Jahr und -Beschreibung überschreiben die Jellyfin-Automatikwerte (165-USER-REQUEST.md §14 erfüllt).
- Echte Handänderungen nach einer Jellyfin-Übernahme überleben ein nachfolgendes AniSearch-Laden.
- AniSearch-zuerst/Jellyfin-danach bleibt unverändert (AniSearch maßgeblich, Jellyfin füllt nur Lücken).
- Cover-Bilder aus Jellyfin/Online-Suche werden durch AniSearch nicht ersetzt.
- Neue Präzedenz-Logik lebt in einer eigenen, kleinen Datei; keine der drei großen bestehenden Dateien (createPageHelpers.ts, useAdminAnimeCreateController.ts, create/page.tsx) wächst inhaltlich über die reine Verdrahtung hinaus.
- Vier Controller-Level-Tests (echter Hook-Pfad, nur API gemockt) decken alle vier geforderten Szenarien ab; alle bestehenden Tests bleiben grün.
- Umlaut-Verstöße im Anlege-/Asset-Dialog sind behoben, Code-Kommentare unangetastet.
- GAP-18 ist in 165-UAT.md als `status: resolved` dokumentiert.
- Frontend-Typecheck/Lint/Test-Suite laufen im Container grün; `docker restart team4sv30-frontend` wurde ausgeführt.
- Kein `git push`, kein `git stash`, keine `.env`- oder `team4s_v2`-Datenänderung.
</success_criteria>

<output>
Create `.planning/quick/260922-kjj-gap-18-anisearch-berschreibt-jellyfin-we/260922-kjj-SUMMARY.md` when done
</output>
