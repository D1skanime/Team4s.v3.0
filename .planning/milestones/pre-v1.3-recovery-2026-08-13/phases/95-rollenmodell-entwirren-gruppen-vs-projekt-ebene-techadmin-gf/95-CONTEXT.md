# Phase 95: Rollenmodell entwirren — Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Das Rollenmodell wird fachlich entwirrt und vereinheitlicht: zwei klare Ebenen mit gemeinsamem `role_code`-Vokabular (Gruppen-Ebene vs. Projekt-/Anime-Ebene), die Code-Dubletten werden zusammengeführt, zwei neue Gruppenrollen (Techadmin, GFXler) kommen hinzu, Rollen werden voll data-driven gemacht, und die aus Phase 94 verschobenen Review-Schulden werden behoben.

**Nicht in dieser Phase:** Member-/Public-facing Anzeige historischer Rollen (bewusst Admin-/Leitungs-intern, siehe D-11); Querverlinkung role-capabilities ↔ users (Backlog 999.1).
</domain>

<decisions>
## Implementation Decisions

### Taxonomie (gelockt aus der Phase-94-Session)
- **D-01:** Zwei-Ebenen-Rollenmodell mit gemeinsamem `role_code`-Vokabular. Gruppen-Ebene (gruppenweit): `founder`, `fansub_lead` (= Gruppenleitung/Fansub-Lead), `co_leader`, `project_lead` (= Fansub-Projektleitung), NEU `techadmin`, NEU `gfxler`. Projekt-/Anime-Ebene (Contribution): `translator`, `editor`, `timer`, `typesetter`, `encoder`, `raw_provider`, `quality_checker`, `designer`.
- **D-02:** GFXler (Gruppen-Grafik) und Designer (Projekt-Grafik) sind dasselbe Skill in zwei Scopes — **getrennte Codes**, kein Merge.
- **D-03:** Gruppen-Rollen sind permission-bearing/assignable und erscheinen in der Capability-Matrix.

### Code-Vereinheitlichung / Migration
- **D-04:** Aktive Codes bleiben kanonisch: `leader` → `fansub_lead`, `project_manager` → `project_lead`. Bestehende historische Einträge (`hist_group_member_roles`) migrieren auf die aktiven Codes; die redundanten Codes `leader`/`project_manager` entfallen. (Live-`fansub_group_member_roles` nutzt bereits `fansub_lead`; kein `leader`/`project_manager` in aktiven Mitgliedsrollen.)
- **D-05:** Labels: `fansub_lead` → „Gruppenleitung", `project_lead` → „Fansub-Projektleitung".
- **D-06:** Die group_history-Dialog-Whitelist (94-03 `groupHistoryDialogRoleWhitelist`) zieht auf die kanonischen Codes mit (`founder`, `fansub_lead`, `co_leader`, `project_lead`) + die neuen Gruppen-Positions-Rollen, wo fachlich passend.

### Neue Rollen
- **D-07:** `techadmin` (Fansub-Page/Technik) und `gfxler` (Gruppen-Grafik) als neue `role_definitions` (Gruppen-Ebene).
- **D-08:** Beide starten **ohne** Default-Capabilities (leer). Sie müssen assignable sein (in der Matrix mit allen Switches aus); der Admin vergibt Rechte über `/admin/role-capabilities`.

### Lifecycle / Historie
- **D-09:** Koexistieren — aktive Rolle = jetzt (`fansub_group_member_roles`, keine Datumsspalten); historische Rolle = Jahres-Zeitraum (`hist_group_member_roles`). Keine Verdrängung.
- **D-10:** Auto-Archivierung: Der Entzug **jeder** aktiven Gruppenrolle erzeugt **automatisch ohne Nachfrage** einen historischen „ended"-Eintrag in `hist_group_member_roles` (`started_year` aus dem `created_at`-Jahr der aktiven Rolle, `ended_year` = aktuelles Jahr, `status='ended'`). Lückenlose Gruppen-Historie.
- **D-11:** Sichtbarkeit: historische Rollen bleiben **Admin-/Leitungs-intern**. Der Member sieht seine eigene Historie NICHT auf seinem Profil; kein Member-/Public-Surface in dieser Phase. `visibility`-Default = intern.

### Data-driven-Umbau
- **D-12:** Rollen voll data-driven: `fansubGroupRoleCatalog` aus `role_definitions` laden (Assignable-Markierung daten-getrieben), Frontend-Rollenoptionen (`FANSUB_GROUP_ROLE_OPTIONS`, `contributionRoles.ts` ×2) per API holen statt hardcodiert. Ziel: künftige Rolle = nur Migration, kein Code mehr.

### Review-Schuld aus Phase 94 (gelockt: in dieser Phase mitfixen — Quelle `94-REVIEW.md`)
- **D-13:** CR-01 — `CreateHistGroupMemberRole` serverseitig gegen die kanonische group_history-Whitelist härten (Write-Pfad-Umgehung schließen; heute nur breiter `group_history`-Kontext geprüft).
- **D-14:** WR-02 — Cross-Group-Scope-Check in `ListHistGroupMemberRoles` (kein Lesen per rohem `member_id` über Gruppengrenzen).
- **D-15:** WR-01 — Capability-Tests gegen den Produktions-Handler führen statt gegen die Stub-Kopie `adminCapabilityHandlerWithStubs`.
- **D-16:** WR-03/04 — Line-Limits: `ProposalForm.tsx` (541 Z.) und `dev/ui-system/page.tsx` (1251 Z.) unter 450 splitten.
- **D-17:** WR-05 — deterministische Kategorie-Reihenfolge in `RoleCapabilityDetail`.

### Claude's Discretion
- Auto-Archivierung (D-10) gilt für ALLE Gruppenrollen (vom Nutzer delegiert) — lückenlose Historie.
- Migrationsmechanik der alten Codes (Hard-Remove vs. deprecated Alias), genaue `started_year`-Ableitung, konkrete Datei-Splits für D-16, exakte assignable-Markierung in `role_definitions` (z. B. neue Spalte vs. abgeleitet aus Kontext).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-Design & verschobene Schuld
- `.planning/phases/95-rollenmodell-entwirren-gruppen-vs-projekt-ebene-techadmin-gf/95-SEED.md` — vollständiges abgestimmtes Modell + offene Fragen
- `.planning/phases/94-rollen-capability-ux-fachlich-entwirren-und-mobil-nutzbar-ma/94-REVIEW.md` — Review-Schuld CR-01/WR-01/02/03/04/05 (Details + file:line)

### Backend Permissions / Capability-Registry
- `backend/internal/permissions/permissions.go` — `fansubGroupRoleCatalog` (~Z.200-211), `IsKnownFansubGroupRole`, `FansubGroupRoles`, `CanForFansubGroup`, `allKnownActions`, `ReloadCache` (Data-driven-Ziel D-12)
- `backend/internal/repository/authz_permissions.go` — `LoadRoleCapabilities` (Cache-Quelle)
- `backend/internal/repository/authz_capability_mutations.go` — `CapabilityMatrixRoleEntry` (assignable/contexts), Grant/Revoke
- `backend/internal/repository/hist_group_member_roles_repository.go` — `groupHistoryDialogRoleWhitelist`, `ListGroupHistoryRoleDefinitions` (D-06), `RoleDefinitionOption`
- `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` — `CreateHistGroupMemberRole` (D-13/CR-01), `ListHistGroupMemberRoles` (D-14/WR-02)
- `backend/internal/handlers/admin_capability_handler.go` — Assignable-Guard, Matrix-Anreicherung (Tests D-15/WR-01)

### Migrationen
- `database/migrations/0085_role_definitions_seed.up.sql` — role_definitions Seed
- `database/migrations/0103*` — group_history-Kontext-Tagging (Pitfall: taggt auch App-Rollen)
- `database/migrations/0108_capability_registry.up.sql` — action_definitions / role_capabilities

### Frontend (Data-driven-Targets D-12 + Splits D-16)
- `frontend/src/types/fansub.ts` — `FANSUB_GROUP_ROLE_OPTIONS`, `FansubGroupRoleCode`
- `frontend/src/app/admin/fansubs/[id]/edit/contributionRoles.ts` + `frontend/src/components/contributions/contributionRoles.ts` — `ANIME_CONTRIBUTION_ROLES`
- `frontend/src/lib/api.ts` — `listGroupHistoryRoleDefinitions`-Helper
- `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx` — Kategorie-Reihenfolge (D-17)
- `frontend/src/components/contributions/ProposalForm.tsx`, `frontend/src/app/dev/ui-system/page.tsx` — Line-Limit-Splits (D-16)

### Verwandte Planung
- `.planning/notes/capability-registry-design.md` — Capability-Registry-Design (Verhältnis zu D-12 klären)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `role_definitions` (Spalten `code, label_de, contexts[], sort_order`) — trägt das gemeinsame Vokabular; `contexts[]` ist bereits Array (mehrkontextig).
- `hist_group_member_roles` (`role_code, started_year, ended_year, status, visibility, confirmed_by/at`) — trägt Tenure + Übergabe OHNE neue Migration (D-09/D-10).
- Capability-Matrix-UI (`/admin/role-capabilities`) rendert vollständig daten-getrieben aus der API — neue Rollen/Actions erscheinen automatisch.
- Switch/Accordion-Primitives (`@/components/ui`, aus Phase 94) für etwaige UI.

### Established Patterns
- Enforcement zentral generisch: `CanForFansubGroup(actor, action, group)` liest `loadedCache` aus `role_capabilities`; `ReloadCache` nach Mutation → ohne Deploy wirksam.
- `CanForFansubGroup` liest Rollen NUR aus `fansub_group_member_roles` (aktive Mitgliedsrollen), NICHT aus `anime_contributions`.
- Kein verstreutes Per-Page-Role-Hardcoding im Backend — nur zentrale Listen.

### Integration Points (die 4 data-driven Touch-Points, D-12 entfernt sie)
1. `permissions.go` `fansubGroupRoleCatalog` (Go-Slice) → aus `role_definitions` laden.
2. `frontend/src/types/fansub.ts` `FANSUB_GROUP_ROLE_OPTIONS` → per API.
3. + 4. `contributionRoles.ts` (×2) → per API.
</code_context>

<specifics>
## Specific Ideas

- Nutzer-Beispiel als Akzeptanz-Anker für D-10: „Fansub-Leader 2014–2018, danach Encoder 2019–" + Übergabe an Nachfolger ab 2019 muss als mehrere `hist_group_member_roles`-Zeilen abbildbar sein.
- GFXler-Beispiel als Beleg für die Zwei-Ebenen-Logik (D-02): Grafik für die Gruppe (kein Anime) = `gfxler`; Grafik an einem konkreten Anime = `designer`.
</specifics>

<deferred>
## Deferred Ideas

- **Backlog 999.1** — Querverlinkung `/admin/role-capabilities` ↔ `/admin/users` (Impact-Count + Rollen-Detail-Link). Eigenes UX-Anliegen, eigene Phase.
- **Member-/Public-Anzeige historischer Rollen** — bewusst ausgeschlossen (D-11 = Admin-intern); ggf. spätere Phase, wenn gewünscht.

### Reviewed Todos (not folded)
- `2026-05-28-profile-hub-content-activity-redesign`, `2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen`, `2026-06-03-credits-ui-konsolidierung-und-permission-bruecke` — generische UI-Treffer, nicht zum Rollenmodell; nicht eingefaltet.
</deferred>

---

*Phase: 95-rollenmodell-entwirren-gruppen-vs-projekt-ebene-techadmin-gf*
*Context gathered: 2026-06-30*
