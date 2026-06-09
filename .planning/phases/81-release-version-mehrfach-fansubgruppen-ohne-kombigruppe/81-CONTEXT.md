# Phase 81: Release-Version Mehrfach-Fansubgruppen ohne Kombigruppe - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Eine Release-Version (`release_versions`) kann mehrere bestehende Fansub-Gruppen als **gleichwertige** Mitwirkende referenzieren. Eine Kooperation existiert ausschließlich als N Zeilen in der Junction-Tabelle `release_version_groups` (eine Zeile pro echter Gruppe). Es entsteht **niemals** ein neuer `fansub_groups`-Datensatz mit zusammengesetztem Namen („Gruppe A & Gruppe B"). Eine zusammengesetzte Darstellung ist reine UI-Anzeige.

**In Scope:**
- Backend-Schreibpfad (Editor-PATCH **und** Jellyfin-Import) auf direkte N-fach-Junction-Upserts umstellen; Kombigruppen-Erzeugung entfernen.
- Backend-Lesepfade: `LIMIT 1` entfernen, mehrere Gruppen pro Version aggregieren; DTO `FansubGroup` (Singular) → `FansubGroups` (Liste) in allen betroffenen Repos/Models/Contracts/Frontend-Typen.
- Entfernung der Kollaborations-Entität (`group_type='collaboration'`, `fansub_collaboration_members`) inkl. der erzeugenden Code-Pfade.
- Frontend-Anzeige: Release-Version-Ansicht (mehrere gleichwertige Chips) + Gruppen-Profilseite(n) („Kooperation mit …", aktuelle Gruppe hervorgehoben).
- Bestandsdaten-Migration: Kombigruppen auf echte Mitglieds-IDs mappen, in `release_version_groups` + `anime_fansub_groups` materialisieren, Kombigruppen anschließend deaktivieren/löschen.
- Tests Backend + Frontend.

**Out of Scope (Deferred / spätere Phasen):**
- `role` / `contribution_type` / `note` Felder pro Zuordnung (z. B. „Gruppe A: Übersetzung").
- `is_primary` / Hauptgruppen-Hierarchie / manuelle Reihenfolge — fachlich abgelehnt (siehe D-03).
- Andere Anime-/Media-Upload-Surfaces, die nicht `release_version_groups` betreffen.

</domain>

<decisions>
## Implementation Decisions

### Datenmodell der Kooperation
- **D-01:** Eine Kooperation wird **ausschließlich** über mehrere Zeilen in `release_version_groups` abgebildet (eine Zeile je echter Gruppe). Die Junction-Tabelle existiert bereits (`database/migrations/0035_add_release_tables.up.sql`, konsolidiert auf `fansub_group_id` durch `0057`). Kein neues Kombigruppen-Modell.
- **D-02:** Das Kollaborations-Konzept wird **komplett abgeschafft**: Spalte `fansub_groups.group_type` (Wert `'collaboration'`) und Tabelle `fansub_collaboration_members` werden entfernt/stillgelegt. Die erzeugenden Funktionen `upsertImportCollaborationGroup` und `buildImportCollaborationName` (`backend/internal/repository/episode_import_repository_release_helpers.go`) entfallen. Grund: User-Entscheidung „komplett abschaffen".
- **D-03:** **Keine Hierarchie-Felder.** Kein `is_primary`, keine manuelle Reihenfolge. Alle beteiligten Gruppen sind gleichwertig. Begründung des Users wörtlich: bei gemeinsamer Arbeit an einem Projekt/einer Release-Version gibt es keine Hauptgruppe — beide haben denselben Stellenwert; `is_primary` wäre fachlich falsch/unklar.
- **D-04:** Sortierung der Gruppen ist **neutral und stabil: alphabetisch nach Anzeigename** (deterministisch, impliziert keinen Rang). Falls technisch ein Tiebreaker nötig ist, sekundär nach `fansub_group_id`.

### Backend-Schreiben
- **D-05:** Schreibpfad löst die übergebene ID-Liste auf und schreibt für **jede** echte Gruppe genau eine Junction-Zeile (Upsert). Nicht mehr übergebene Zuordnungen werden entfernt. Betrifft beide Aufrufer: Editor-PATCH (`syncEpisodeVersionSelectedGroups`, `episode_version_repository.go`) und Jellyfin-Import (`resolveImportFansubSelectionFromInputs`).
- **D-06:** Alle übergebenen IDs werden gegen `fansub_groups` validiert; nicht existierende IDs führen zu einem Fehler (kein stilles Anlegen). Freitext-Gruppennamen (Import ohne ID) dürfen weiterhin **einzelne echte** Gruppen anlegen/zuordnen, aber niemals eine zusammengesetzte Gruppe.
- **D-07:** `anime_fansub_groups` wird konsistent mit den echten Mitglieds-IDs gepflegt (nicht mit einer Kombigruppen-ID). `buildAnimeFansubLinkGroupIDs` darf keine synthetische Effective-Group mehr beitragen.

### Backend-Lesen
- **D-08:** `LIMIT 1` in den Release-Version-Reads entfällt; pro Version werden alle Gruppen aggregiert (z. B. `json_agg` / Array-Aggregation, sortiert nach D-04). DTO-Feld `FansubGroup *FansubGroupSummary` → `FansubGroups []FansubGroupSummary` über alle betroffenen Repos/Models/OpenAPI/TS-Typen. Singular-Feld wird abgelöst, nicht parallel weitergeführt (kein „erste Gruppe gewinnt").

### Frontend-Anzeige
- **D-09:** Release-Version-Ansicht zeigt **mehrere gleichwertige Chips** (Variante 2 aus der Anforderung), gerendert mit den globalen `@/components/ui`-Primitives (Pflicht laut CLAUDE.md — kein Eigen-Markup). Keine Darstellung, die „A & B" als eigene Gruppe suggeriert.
- **D-10:** Gruppen-Profilseite(n): Eine Release-Version erscheint bei **jeder** beteiligten Gruppe. Kooperation ist erkennbar als „Kooperation mit …" / „Mitwirkende Gruppen"; die aktuell geöffnete Gruppe wird hervorgehoben, die übrigen als Partner gelistet — **ohne** Hauptgruppen-Hierarchie. Finale UI-Detaillierung kann `/gsd:ui-phase` übernehmen.

### Migration der Altdaten
- **D-11:** Forward-only Migration (append-only Konvention, `database/migrations/`): bestehende `group_type='collaboration'`-Gruppen über `fansub_collaboration_members` auf ihre echten Mitglieds-IDs auflösen; diese IDs in `release_version_groups` **und** `anime_fansub_groups` materialisieren (idempotent, ON CONFLICT DO NOTHING); danach die Kombigruppen-Referenzen aus beiden Tabellen entfernen.
- **D-12:** Kombigruppen werden bevorzugt **deaktiviert** (Status statt Hard-Delete), und nur gelöscht, wenn keinerlei Fremdreferenzen mehr bestehen — defensiv/reversibel, passend zur append-only- und Audit-Disziplin. Researcher/Planner ermittelt alle FK-Quellen, die auf `fansub_groups` zeigen, bevor gelöscht wird.

### Claude's Discretion
- Konkrete SQL-Aggregationsform (`json_agg` vs. Array vs. zweiter Query), Aufteilung in Migrationsdateien, exakte DTO-Benennung und Test-Struktur überlässt der User dem Planner/Researcher — solange D-01..D-12 gewahrt bleiben.
- Exakte visuelle Ausgestaltung der Chips/Kooperations-Hinweise (innerhalb D-09/D-10) kann `/gsd:ui-phase` finalisieren.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projektregeln (Pflicht-Constraints)
- `CLAUDE.md` — 450-Zeilen-Limit für Produktcode; deutsche UI-Strings mit korrekten Umlauten (keine ASCII-Ersatzformen); globales UI-System `@/components/ui` ist Pflicht (kein Eigen-Markup für Primitive); append-only SQL-Migrationen.

### Backend-Schreibpfad (Root Cause)
- `backend/internal/repository/episode_import_repository_release_helpers.go` — `resolveImportFansubSelectionFromInputs` (~Z. 254), `upsertImportCollaborationGroup` (~Z. 290), `buildImportCollaborationName` (~Z. 488, `strings.Join(parts, " & ")` Z. 501), `upsertReleaseVersionGroup` (~Z. 181), `buildAnimeFansubLinkGroupIDs` (~Z. 504). Gemeinsam genutzter Resolver für Import UND Editor.
- `backend/internal/repository/episode_version_repository.go` — `syncEpisodeVersionSelectedGroups` (~Z. 1178, Editor-Schreibpfad), `Update` (~Z. 448), Lesefunktion `scanReleaseVariantAsEpisodeVersion` (Z. 902-945, liest nur EINE Gruppe), `GetByID` mit `LIMIT 1` (~Z. 365).
- `backend/internal/handlers/episode_version_update.go` — `UpdateEpisodeVersion` (PATCH-Handler), `episode_version_validation.go` (`validateEpisodeVersionPatchRequest`).
- `backend/internal/handlers/admin_content_episode_version_editor_helpers.go` §~170 — `resolveEpisodeVersionSelectedGroups` / `ListCollaborationMembers` (Editor entfaltet Kombigruppe zurück — entfällt nach Umbau).

### Weitere Lesepfade (auf Mehrfachgruppen umstellen)
- `backend/internal/repository/admin_content_fansub_releases.go`
- `backend/internal/repository/fansub_repository.go`
- `backend/internal/repository/group_release_media_repository.go`
- `backend/internal/repository/contributor_dashboard_repository.go`
- Public-Projektionen, die `release_version_groups` konsumieren: `backend/internal/repository/anime_contributions_public_versions_repository.go`, `anime_contributions_public_repository.go` (Phase 73/75-Surfaces).

### Datenmodell / Migrationen
- `database/migrations/0035_add_release_tables.up.sql` — definiert `release_version_groups` (Composite-PK, kann Mehrfachzuordnung bereits).
- `database/migrations/0057_drop_release_version_groups_fansubgroup_id.up.sql` — Junction konsolidiert auf `fansub_group_id` als „only source of truth".
- `database/migrations/0015_fansub_collaborations.up.sql` — führt `group_type` + `fansub_collaboration_members` ein (das in dieser Phase zu entfernende Konzept).
- `backend/internal/models/fansub.go` — `FansubGroupTypeGroup`/`FansubGroupTypeCollaboration` Konstanten, `FansubGroupSummary`.
- `backend/internal/models/episode_import.go` / `episode_version.go` — `SelectedFansubGroupInput`, `EpisodeImportMappingRow`, `EpisodeVersionCreateInput`/`PatchInput`.

### Frontend
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` (~Z. 232 `fansub_groups: selectedGroups.map(g => ({id:g.id}))`), `EpisodeVersionEditorPage.tsx`.
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` (~Z. 92 Collaboration-Filter).
- `frontend/src/components/anime/ReleaseVersionBreakdown.tsx`, `frontend/src/components/anime/GroupContributionBlock.tsx` — Anzeige der Release-Version/Gruppen.
- `frontend/src/app/admin/my-groups/[id]/page.tsx`, `frontend/src/app/fansubs/` — Gruppen-Profilseiten.
- `frontend/src/types/fansub.ts`, `frontend/src/types/episodeVersion.ts`, `frontend/src/types/episodeImport.ts` — DTO-Typen.
- `frontend/src/lib/api.ts` (~Z. 2025 `updateEpisodeVersion`).

### Contracts
- `shared/contracts/episode-versions.yaml`, `shared/contracts/fansubs.yaml`, `shared/contracts/admin-content.yaml`, `shared/contracts/openapi.yaml`.

### Vorgeschichte / Prior Decisions
- `.planning/ROADMAP.md` §„Phase 21" — P21-SC3 baute das Kombigruppen-Verhalten absichtlich; diese Phase kehrt es bewusst um.
- `.planning/STATE.md` Decisions [Phase 21-*] — „backend owns collaboration identity", „mirrors persisted release-version group truth into anime_fansub_groups", „excludes collaboration groups from manual choice". Diese Annahmen werden hier ersetzt.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `release_version_groups` Junction-Tabelle ist bereits N:M-fähig (Composite-PK) — kein Schema-Neubau nötig, nur korrekte Befüllung.
- Frontend sendet bereits eine ID-Liste (`fansub_groups: [{id}]`) — der Payload ist NICHT die Ursache und muss nicht umgestellt werden (Anforderungspunkt 3/4 sind bereits erfüllt).
- `@/components/ui`-Primitives (Chips/Badge, Card) für die Mehrfach-Gruppen-Anzeige.

### Established Patterns
- 450-Zeilen-Limit: betroffene Repos (`episode_version_repository.go`) sind groß — Umbau ggf. mit Helper-Auslagerung (Muster: viele `*_helpers.go`/`*_repository_*.go`-Splits im Bestand).
- Append-only Migrationen mit `.up.sql`/`.down.sql`; defensives `DO $$ … RAISE EXCEPTION`-Muster bei riskanten Spaltendrops (siehe `0057`).
- Idempotente Junction-Writes via `ON CONFLICT … DO NOTHING/UPDATE` (Bestandmuster in `episode_import_repository_release_helpers.go`).

### Integration Points
- Gemeinsamer Resolver `resolveImportFansubSelectionFromInputs` wird von Import UND Editor aufgerufen — eine Änderung wirkt auf beide Schreibpfade (Vorsicht: Tests beider Pfade nötig).
- `anime_fansub_groups` wird als Spiegel der Release-Gruppen gepflegt — Migration und Laufzeit müssen konsistent bleiben.
- Public Pages (Phase 73/75) lesen `release_version_groups` → DTO-Listen-Umstellung rippelt dorthin; deren Tests/Anzeigen mitprüfen.

</code_context>

<specifics>
## Specific Ideas

- Anzeigevarianten aus der Anforderung: (1) „Gruppe A + Gruppe B", (2) Chips `[Gruppe A] [Gruppe B]`, (3) „Kooperation: Gruppe A, Gruppe B". Gewählt: **Variante 2 (Chips)** für die Release-Ansicht; Gruppen-Profilseite nutzt „Kooperation mit …" (Variante-3-nah). Wichtig: nie als eigene Gruppe „A & B" darstellen.
- Gruppen-Profil-Beispiel (Soll): auf Seite von Gruppe A → „Beteiligung: Gruppe A / Kooperation mit: Gruppe B"; symmetrisch auf Seite von Gruppe B.

</specifics>

<deferred>
## Deferred Ideas

- `role` / `contribution_type` pro Gruppe (z. B. „Gruppe A: Übersetzung", „Gruppe B: Typesetting") — eigene spätere Phase, falls fachlich gewünscht.
- Freitext-`note` pro Zuordnung — später.
- `is_primary` / Hauptgruppen-Markierung — bewusst **verworfen** (fachlich falsch laut User, D-03), nicht nur verschoben.

None weiterer — Diskussion blieb im Phasen-Scope.

</deferred>

---

*Phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe*
*Context gathered: 2026-06-09*
