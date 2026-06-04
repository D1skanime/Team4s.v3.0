---
phase: 73-public-fansub-page-fansubs-slug-erweitern
plan: 01b
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/types/domain-projection.ts
  - frontend/src/types/media-ownership.ts
  - frontend/src/lib/api.ts
autonomous: true
requirements: [K]
must_haves:
  truths:
    - "frontend/src/types/domain-projection.ts existiert mit exportierten Interfaces, die drop-in-kompatibel zu den finalen Phase-72-Shapes sind"
    - "frontend/src/types/media-ownership.ts existiert mit exportiertem Interface, das drop-in-kompatibel zu Phase-72 ist"
    - "api.ts enthält getFansubGroupDomainProjection und getMediaOwnershipProjection als vollständige Funktionen nach dem getFansubContributions-Muster"
    - "npm run typecheck schlägt nicht wegen fehlender Module '@/types/domain-projection' oder '@/types/media-ownership' fehl"
  artifacts:
    - path: "frontend/src/types/domain-projection.ts"
      provides: "Stub-Typen: DomainProjectionResponse, DomainMemberRow, DomainHistoricalRow, DomainContributorRow"
      min_lines: 20
    - path: "frontend/src/types/media-ownership.ts"
      provides: "Stub-Typ: MediaOwnershipRow"
      min_lines: 8
    - path: "frontend/src/lib/api.ts"
      provides: "getFansubGroupDomainProjection(groupID) + getMediaOwnershipProjection(ownerType, ownerID)"
      exports: ["getFansubGroupDomainProjection", "getMediaOwnershipProjection"]
  key_links:
    - from: "frontend/src/types/domain-projection.ts"
      to: "Plans 73-02 / 73-03 / 73-04 (Komponenten-Imports)"
      via: "import type { DomainProjectionResponse, DomainMemberRow, ... } from '@/types/domain-projection'"
      pattern: "from '@/types/domain-projection'"
    - from: "frontend/src/lib/api.ts"
      to: "page.tsx Promise.allSettled (Plan 73-05)"
      via: "import { getFansubGroupDomainProjection, getMediaOwnershipProjection } from '@/lib/api'"
      pattern: "getFansubGroupDomainProjection|getMediaOwnershipProjection"
---

<objective>
Plan 01b legt die Typ-Stubs und api.ts-Funktionen an, die Plans 02/03/04/05 zur Compile-Zeit
benötigen — unabhängig davon ob Phase 72 bereits ausgeführt wurde.

Ohne diese Dateien schlägt `npm run typecheck` in Wave 2+ mit "Cannot find module" fehl.
Die Stubs sind drop-in-kompatibel zu den finalen Phase-72-Shapes: Wenn Phase 72 danach ausgeführt
wird, überschreibt sie dieselben Dateien mit identischer Struktur (kein Konflikt).

Purpose: Entkoppelt Phase 73 von der Phase-72-Ausführungsreihenfolge für TypeScript-Compile-Korrektheit.
Output: Zwei Typdateien (< 50 Zeilen je) und zwei api.ts-Funktionen nach dem `getFansubContributions`-Muster.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/73-public-fansub-page-fansubs-slug-erweitern/73-CONTEXT.md
@.planning/phases/73-public-fansub-page-fansubs-slug-erweitern/73-RESEARCH.md

<interfaces>
<!-- Phase-72-Contract-Shapes (aus 73-RESEARCH.md §Phase-72-Contract, bindend): -->

<!-- DomainProjectionResponse-Shape (finale Phase-72-Form): -->
<!-- interface DomainProjectionResponse {                                         -->
<!--   members: DomainMemberRow[]                                                 -->
<!--   historical: DomainHistoricalRow[]                                          -->
<!--   contributors: DomainContributorRow[]                                       -->
<!-- }                                                                            -->
<!--                                                                              -->
<!-- interface DomainMemberRow {                                                  -->
<!--   member_display_name: string                                                -->
<!--   member_slug: string | null                                                 -->
<!--   roles: string[]                                                            -->
<!--   role_labels: string[]                                                      -->
<!--   profile_status: 'active' | 'historical' | 'memorial'                      -->
<!--   claimed: boolean                                                           -->
<!-- }                                                                            -->
<!--                                                                              -->
<!-- interface DomainHistoricalRow {                                              -->
<!--   member_display_name: string                                                -->
<!--   member_slug: string | null                                                 -->
<!--   roles: string[]                                                            -->
<!--   role_labels: string[]                                                      -->
<!--   profile_status: 'active' | 'historical' | 'memorial'                      -->
<!--   claimed: boolean                                                           -->
<!-- }                                                                            -->
<!--                                                                              -->
<!-- interface DomainContributorRow {                                             -->
<!--   member_display_name: string                                                -->
<!--   member_slug: string | null                                                 -->
<!--   roles: string[]                                                            -->
<!--   role_labels: string[]                                                      -->
<!--   dispute_state: 'none' | 'open' | 'resolved'                               -->
<!--   visibility: string                                                         -->
<!--   review_status: string                                                      -->
<!-- }                                                                            -->

<!-- MediaOwnershipRow-Shape (finale Phase-72-Form):                             -->
<!-- interface MediaOwnershipRow {                                                -->
<!--   owner_type: string     // 'group', 'member', 'release_version'            -->
<!--   owner_id: number                                                           -->
<!--   media_category: string                                                     -->
<!--   visibility: string                                                         -->
<!--   review_status: string                                                      -->
<!-- }                                                                            -->

<!-- getFansubContributions-Muster aus frontend/src/lib/api.ts (Zeilen 7680–7704): -->
<!-- export async function getFansubContributions(fansubID: number): Promise<T> { -->
<!--   const API_BASE_URL = getApiBaseUrl();                                       -->
<!--   const response = await fetch(                                               -->
<!--     `${API_BASE_URL}/api/v1/fansubs/${fansubID}/contributions`,               -->
<!--     { next: { revalidate: 60 } },                                             -->
<!--   );                                                                          -->
<!--   if (!response.ok) {                                                         -->
<!--     const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`); -->
<!--     throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details); -->
<!--   }                                                                           -->
<!--   return response.json() as Promise<T>;                                       -->
<!-- }                                                                             -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Typ-Stubs domain-projection.ts und media-ownership.ts anlegen</name>
  <files>
    frontend/src/types/domain-projection.ts,
    frontend/src/types/media-ownership.ts
  </files>
  <read_first>
    - .planning/phases/73-public-fansub-page-fansubs-slug-erweitern/73-RESEARCH.md (Abschnitt §Phase-72-Contract — bindende Interface-Shapes für Stub-Kompatibilität)
    - frontend/src/types/contributions.ts (Referenz für Datei-Format und Export-Konventionen im types/-Verzeichnis)
  </read_first>
  <action>
    Erstelle `frontend/src/types/domain-projection.ts`.

    Inhalt: Die vier Interfaces exakt nach den Phase-72-Contract-Shapes aus 73-RESEARCH.md
    (§Phase-72-Contract Endpunkt 1). Die Stubs müssen strukturell identisch zu den finalen
    Phase-72-Implementierungen sein, damit Phase-72-Ausführung diese Dateien konfliktfrei
    überschreiben kann.

    Datei-Inhalt (< 50 Zeilen):
    Exportiere `DomainMemberRow`, `DomainHistoricalRow`, `DomainContributorRow` als Interfaces
    mit exakt den Feldern aus dem Phase-72-Contract. Exportiere `DomainProjectionResponse` als
    Interface mit `members: DomainMemberRow[]`, `historical: DomainHistoricalRow[]`,
    `contributors: DomainContributorRow[]`.

    Kommentar am Dateianfang:
    `// Phase-72-Typ-Stubs — werden durch Phase-72-Ausführung (frontend/Phase-72-Plan-04) drop-in überschrieben.`
    `// Shapes sind identisch zu den finalen Phase-72-Definitionen (73-RESEARCH.md §Phase-72-Contract).`

    Erstelle `frontend/src/types/media-ownership.ts`.

    Inhalt: Exportiere `MediaOwnershipRow` als Interface mit den Feldern aus dem Phase-72-Contract
    (Endpunkt 2 in 73-RESEARCH.md): `owner_type: string`, `owner_id: number`,
    `media_category: string`, `visibility: string`, `review_status: string`.

    Kommentar am Dateianfang:
    `// Phase-72-Typ-Stub — wird durch Phase-72-Ausführung drop-in überschrieben.`
    `// Shape identisch zu finaler Phase-72-Definition (73-RESEARCH.md §Phase-72-Contract Endpunkt 2).`

    Keine weiteren Felder als im Contract definiert — Stubs müssen mindestens-kompatibel sein,
    nicht maximal. Phase 72 kann weitere Felder hinzufügen ohne Breaking Change.
  </action>
  <verify>
    <automated>cd frontend && npm run typecheck 2>&1 | grep -E "domain-projection|media-ownership" || echo "module-resolution-ok"</automated>
  </verify>
  <acceptance_criteria>
    - Quell-Assertion: `frontend/src/types/domain-projection.ts` existiert; enthält `export interface DomainProjectionResponse`, `export interface DomainMemberRow`, `export interface DomainHistoricalRow`, `export interface DomainContributorRow`.
    - Quell-Assertion: `DomainMemberRow` enthält `profile_status: 'active' | 'historical' | 'memorial'` und `claimed: boolean` (Pflichtfelder für Plans 03/04-Filterlogik).
    - Quell-Assertion: `DomainContributorRow` enthält `visibility: string` und `review_status: string` (Pflichtfelder für D-12-Filter).
    - Quell-Assertion: `frontend/src/types/media-ownership.ts` existiert; enthält `export interface MediaOwnershipRow` mit `owner_type`, `owner_id`, `media_category`, `visibility`, `review_status`.
    - Quell-Assertion: Beide Dateien haben je einen Stub-Kommentar mit Hinweis auf Phase-72-Überschreibung.
    - Quell-Assertion: Beide Dateien haben weniger als 50 Zeilen.
    - Behavior-Assertion: `npm run typecheck` zeigt keinen "Cannot find module '@/types/domain-projection'" oder "'@/types/media-ownership'" Fehler.
  </acceptance_criteria>
  <done>Beide Typdateien existieren, compilieren fehlerfrei, sind strukturell identisch zu den finalen Phase-72-Shapes.</done>
</task>

<task type="auto">
  <name>Task 2: api.ts — getFansubGroupDomainProjection und getMediaOwnershipProjection definitiv ergänzen</name>
  <files>
    frontend/src/lib/api.ts
  </files>
  <read_first>
    - frontend/src/lib/api.ts (Zeilen 7678–7704 — getFansubContributions als exaktes Muster für neue Funktionen)
    - frontend/src/lib/api.ts (letzte 10 Zeilen der Datei — Einfügestelle am Dateiende nach `getAnimeContributions`)
    - .planning/phases/73-public-fansub-page-fansubs-slug-erweitern/73-RESEARCH.md (§Phase-72-Contract: Route-Pfade `/api/v1/fansubs/:id/domain-projection` und `/api/v1/media-ownership/:ownerType/:ownerId`)
  </read_first>
  <action>
    Prüfe zunächst ob `getFansubGroupDomainProjection` und `getMediaOwnershipProjection` bereits
    in `frontend/src/lib/api.ts` vorhanden sind (Phase-72-Plan-04 könnte diese bereits angelegt haben).

    Wenn BEIDE Funktionen bereits existieren: keine Änderung vornehmen — Aufgabe erfüllt.

    Wenn eine oder beide Funktionen FEHLEN: Ergänze die fehlenden Funktionen am Ende von `api.ts`
    (nach der letzten bestehenden Export-Funktion), exakt nach dem `getFansubContributions`-Muster:

    Funktion 1 — `getFansubGroupDomainProjection`:
    Import-Voraussetzung: `DomainProjectionResponse` aus `./types/domain-projection` importieren
    (oder relativ: das types-Verzeichnis ist i.d.R. `../types/...` relativ zu api.ts — Executor prüft
    den bestehenden Import-Stil in api.ts für types-Importe und folgt demselben Muster).
    Signatur: `export async function getFansubGroupDomainProjection(groupID: number): Promise<DomainProjectionResponse>`
    Fetch-URL: `${API_BASE_URL}/api/v1/fansubs/${groupID}/domain-projection`
    Options: `{ next: { revalidate: 60 } }`
    Error-Handling: `parseApiErrorPayload` + `ApiError` (identisch zu `getFansubContributions`).
    Return: `response.json() as Promise<DomainProjectionResponse>`
    Kein `{"data"}`-Unwrap (Contract: direktes DTO, kein Wrapper).

    Funktion 2 — `getMediaOwnershipProjection`:
    Import-Voraussetzung: `MediaOwnershipRow` aus dem types-Verzeichnis importieren.
    Signatur: `export async function getMediaOwnershipProjection(ownerType: string, ownerID: number): Promise<MediaOwnershipRow[]>`
    Fetch-URL: `${API_BASE_URL}/api/v1/media-ownership/${encodeURIComponent(ownerType)}/${ownerID}`
    Options: `{ next: { revalidate: 60 } }`
    Error-Handling: `parseApiErrorPayload` + `ApiError`.
    Return: `response.json() as Promise<MediaOwnershipRow[]>`
    Kein `{"data"}`-Unwrap.

    Idempotenz-Hinweis: Wenn Phase 72 danach ausgeführt wird und dieselben Funktionen
    in api.ts anlegt, entsteht ein Duplikat-Export. Um das zu verhindern: Vor dem Schreiben
    prüfen ob die Funktionen schon vorhanden sind (Grep-Check). Falls Phase-72-Plan-04
    diese Funktionen mit identischen Signaturen anlegt, muss einer der Doppelten entfernt
    werden — dieser Stub ist der Kandidat zum Entfernen (Phase-72-Implementierung ist kanonisch).
    Notiere im SUMMARY: "getFansubGroupDomainProjection + getMediaOwnershipProjection als
    Phase-73-Stub in api.ts angelegt — bei Phase-72-Ausführung Duplikat entfernen."
  </action>
  <verify>
    <automated>cd frontend && grep -c "getFansubGroupDomainProjection\|getMediaOwnershipProjection" src/lib/api.ts</automated>
  </verify>
  <acceptance_criteria>
    - Quell-Assertion: `grep -c "export async function getFansubGroupDomainProjection" frontend/src/lib/api.ts` gibt `1` zurück.
    - Quell-Assertion: `grep -c "export async function getMediaOwnershipProjection" frontend/src/lib/api.ts` gibt `1` zurück.
    - Quell-Assertion: Beide Funktionen nutzen `getApiBaseUrl()`, `parseApiErrorPayload` und `ApiError` — kein ad-hoc-Fetch ohne Error-Handling (Lock K).
    - Quell-Assertion: `getFansubGroupDomainProjection` verwendet Route `/api/v1/fansubs/${groupID}/domain-projection` (exakter Pfad per 73-RESEARCH.md §Phase-72-Contract).
    - Quell-Assertion: `getMediaOwnershipProjection` verwendet `encodeURIComponent(ownerType)` im URL-Pfad.
    - Quell-Assertion: Keine `{"data"}`-Unwrap-Logik in den neuen Funktionen (direktes DTO laut Contract).
    - Behavior-Assertion: `npm run typecheck` zeigt keine Fehler durch die neuen api.ts-Zeilen.
  </acceptance_criteria>
  <done>Beide api.ts-Funktionen existieren mit korrekten Routen, Error-Handling per getFansubContributions-Muster, korrekten Return-Typen und ohne data-Wrapper.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Phase-72-Stub-Typen → Phase-72-finale Implementierung | Stubs werden durch Phase-72-Ausführung überschrieben; Inkompatibilität beim Überschreiben wäre ein stiller Breaking Change |
| api.ts-Stub-Funktionen → Phase-72-Plan-04 | Duplikat-Export wenn beide Versionen gleichzeitig in api.ts landen |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-73-01b-01 | Tampering | Typ-Stub-Inkompatibilität mit Phase-72-finalen Shapes | mitigate | Stub-Shapes sind strukturell identisch zu Phase-72-Contract-Shapes aus 73-RESEARCH.md; Kommentar in Stub-Dateien weist auf Überschreib-Erwartung hin; Executor prüft Kompatibilität beim Überschreiben |
| T-73-01b-02 | Tampering | Duplikat-Export in api.ts nach Phase-72-Ausführung | mitigate | Stub-Funktionen werden NACH Phase-72-Ausführung aus api.ts entfernt; SUMMARY enthält expliziten Cleanup-Hinweis; Phase-72-Plan-04 ist kanonische Implementierung |
| T-73-01b-03 | Information Disclosure | api.ts neue Funktionen ohne Fehlerbehandlung | mitigate | Error-Handling identisch zu `getFansubContributions` (parseApiErrorPayload + ApiError); kein Swallowing von Backend-Fehlern |
| T-73-01b-SC | Tampering | npm/pip/cargo installs | mitigate | Keine neuen Pakete; slopcheck nicht erforderlich |
</threat_model>

<verification>
- `npm run typecheck` zeigt keinen "Cannot find module" Fehler für domain-projection oder media-ownership.
- `grep -c "getFansubGroupDomainProjection" frontend/src/lib/api.ts` gibt 1 zurück.
- `grep -c "getMediaOwnershipProjection" frontend/src/lib/api.ts` gibt 1 zurück.
- `domain-projection.ts`: enthält alle vier Interfaces; unter 50 Zeilen.
- `media-ownership.ts`: enthält MediaOwnershipRow; unter 50 Zeilen.
- Beide Stub-Dateien enthalten Kommentar mit Überschreib-Hinweis.
</verification>

<success_criteria>
- Alle Plans 02/03/04/05 können `import type { ... } from '@/types/domain-projection'` und `from '@/types/media-ownership'` ohne Compile-Fehler verwenden.
- `getFansubGroupDomainProjection` und `getMediaOwnershipProjection` in api.ts vorhanden und exportiert.
- Stub-Typen sind strukturell drop-in-kompatibel zu Phase-72-finalen Shapes.
- Duplikat-Cleanup-Hinweis für Phase-72-Ausführung in SUMMARY dokumentiert.
</success_criteria>

<output>
Create `.planning/phases/73-public-fansub-page-fansubs-slug-erweitern/73-01b-SUMMARY.md` when done
</output>
