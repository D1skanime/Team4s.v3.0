# Phase 69: Fansub Contributions Contract- und Permission-Haertung - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning
**Source:** Code-Review (verifiziert gegen Live-Code) + Discuss-Entscheidungen (3 AskUserQuestion)

<domain>
## Phase Boundary

Diese Phase macht die in den Phasen 62 (Admin-API) und 63 (Leader-Frontend) gelieferte
Fansub-Contributions-Funktionalitaet release-/live-tauglich. Phase 61 (DB-Fundament) ist
sauber und wird nicht angefasst. In Scope sind ausschliesslich die Admin-Surfaces fuer
Gruppenmitglieder, Member-Rollen und Anime-Contributions sowie deren Contracts.

**In Scope:**
- Contract-Angleichung Backend <-> Frontend fuer die 6 neuen Admin-Endpunkte
- Fachlich funktionierender Member-Create-Flow (display_name -> members-Zeile)
- Gruppenberechtigungs-Pruefung in den neuen Handlern
- Cross-Group- und Duplikat-Schutz (Handler-Guards + DB-Constraints)
- Status-Durchreichung beim Contribution-Create
- Seed-konforme role_codes im Frontend
- OpenAPI-Contracts fuer die neuen Endpunkte

**Out of Scope:**
- Public-/Me-Routen und Badges (Phase 64, bereits geshippt)
- Post-MVP-Features (Phasen 65-68: Vorschlaege, Claiming, Release-Credits, Badge-Engine)
- Neugestaltung der Admin-UX ueber die Fehlerbehebung hinaus
</domain>

<locked_decisions>
## Locked Decisions (aus Discuss-Phase — NICHT erneut aufrollen)

**D1 — Member-Create-Flow: members automatisch anlegen.**
Bei `display_name`-Eingabe legt das Backend automatisch eine `members`-Zeile an
(`nickname = display_name`, optional `user_id` aus der App-User-Verknuepfung), danach den
historischen Mitgliedschaftseintrag in `hist_fansub_group_members`. KEIN Umbau auf einen
reinen Member-Picker. Die bestehende Admin-UX (freies Anzeigename-Feld) bleibt erhalten.

**D2 — DB-Durchsetzung per neuer Migration 0088** (append-only; 0087 ist bereits vergeben).
Cross-Group-Konsistenz via Composite-FK und Duplikat-Schutz via Unique-Key werden auf
DB-Ebene durchgesetzt, ZUSAETZLICH zu Handler-Guards (Defense-in-Depth).

**D3 — Envelope-Richtung folgt der Projektkonvention `{"data": ...}`.**
Das Backend behaelt das projektweite `{"data": ...}`-Envelope (jeder andere Endpunkt nutzt
es) und ruft die bereits vorhandenen `*WithDisplay`-Repo-Methoden auf. Das Frontend
(api.ts + fansub.ts + Tabs) wird angepasst, um `.data` zu konsumieren. NICHT das Backend auf
benannte Keys (`members`/`roles`/`contributions`) umbauen.
</locked_decisions>

<verified_findings>
## Verifizierte Findings (mit Datei:Zeile-Belegen)

### Critical

**F1 — Envelope-Bruch (alle 6 Endpunkte).**
Backend liefert `gin.H{"data": items}` in jedem List/Create/Update der drei Handler:
- `backend/internal/handlers/fansub_hist_group_members_handler.go:55,110,156`
- `backend/internal/handlers/fansub_hist_group_member_roles_handler.go:69,136,183`
- `backend/internal/handlers/fansub_anime_contributions_handler.go:84,155,229`
Frontend-Typen erwarten benannte Keys:
- `frontend/src/types/fansub.ts:502` (`members`), `:541` (`roles`), `:583` (`contributions`),
  `:506` (`member`), `:545` (`role`), `:587` (`contribution`)
Komponenten greifen direkt auf diese zu, z. B. `GroupMembersTab.tsx:91` (`response.members`).
=> Tabs bleiben leer / brechen bei Zugriff auf undefined.

**F2 — Member-Create-Flow fachlich nicht implementiert.**
FE sendet `display_name`, `joined_year`, `left_year`, `app_user_id`, `status`
(`GroupMembersTab.tsx:155-162`; Request-Typ `fansub.ts:510`). Backend-Create akzeptiert nur
`member_id`, `joined_year`, `left_year`, `status`, `visibility`
(`fansub_hist_group_members_handler.go:24-30`, `:73`). Kein members-Anlegen, keine
App-User-Verknuepfung.
*Praezisierung (Aufwand-relevant):* Der GET-Pfad ist fast fertig — das Repo hat bereits
`ListByFansubGroupWithDisplay` mit exakt der FE-Shape (`display_name`, `app_user_id`,
`app_username`, `joined_year`, `left_year`, `status`):
`backend/internal/repository/hist_group_members_repository.go:54-80`. Der Handler ruft aber
die nicht angereicherte `ListByFansubGroup` auf. Nur der CREATE-Pfad (members-Zeile aus
display_name) fehlt komplett.

**F3 — Rollen-Tab ruft member-roles ohne `?member_id=` auf.**
Backend verlangt `member_id` als Query und antwortet sonst mit 400
(`fansub_hist_group_member_roles_handler.go:51-54`). FE ruft ohne Query auf
(`frontend/src/lib/api.ts:6643`). => garantiert 400.

**F4 — Keine Gruppenberechtigung in den neuen Handlern.**
Routen haengen nur an `auth` (Authentifizierung): `admin_routes.go:149-163`. Die drei neuen
Handler haben gar keinen `permissionSvc` injiziert und rufen `CanForFansubGroup` nicht auf.
Bestehendes Muster (zu replizieren): `fansub_group_links.go:38-58` mit
`permissionActorFromContext(c)` + `permissionSvc.CanForFansubGroup(...)` +
`auditPermissionDenied(...)`.
*Vorhandene Bausteine:* Permission-Actions existieren bereits —
`backend/internal/permissions/permissions.go:19` (`ActionFansubGroupMembersView`),
`:20` (`ActionFansubGroupMembersManage`).

**F5 — Cross-Group-/Member-Kontext moeglich.**
`anime_contributions` referenziert `fansub_group_id` und `fansub_group_member_id`
unabhaengig (`database/migrations/0086_anime_contributions.up.sql:6,8`), kein Composite-FK.
Handler prueft Zugehoerigkeit nicht (`fansub_anime_contributions_handler.go:130-140`).
*Praezisierung:* Die Guard-Methode `MemberBelongsToFansub(ctx, memberID, fansubGroupID)`
EXISTIERT bereits (`anime_contributions_repository.go:96-110`), wird aber nicht aufgerufen.
Analoges Problem im member-roles-Create (kein Bezug der hist-member-id zur Route-fansubID).

**F6 — upsertAnimeContribution ist kein Upsert.**
FE-Helper heisst `upsert`, macht aber immer POST (`api.ts:6790,6800`). Backend-Create
insertet immer neu (`anime_contributions_repository.go:296-337`). Kein Unique-Key in 0086.
=> Jedes erneute Speichern erzeugt Duplikate.

### Warning

**F7 — Status beim Create ignoriert.**
FE sendet `status` (Request-Typ `fansub.ts:591-600`, Modal sendet ihn). Der
Create-Request-Struct hat KEIN `status`-Feld (`fansub_anime_contributions_handler.go:32-40`),
das Repo hardcodet `'draft'` (`anime_contributions_repository.go:319`). Der PATCH-Pfad
unterstuetzt Status bereits (`:49`, `:374`).

**F8 — Role-Codes im Frontend falsch/uneindeutig.**
Modal schlaegt `qc` vor (`AnimeContributionModal.tsx:20`), die DB seedet aber
`quality_checker` (`database/migrations/0085_role_definitions_seed.up.sql:20`). Gueltige
anime_contribution-Codes laut Seed: translator, editor, timer, typesetter, encoder,
raw_provider, quality_checker, project_lead, designer, admin, other, project_manager.
Backend lehnt ungueltige Codes mit 422 ab (`fansub_anime_contributions_handler.go:113-127`).
Zusaetzlich: MemberRolesTab nutzt ein Freitextfeld "Rolle" (`MemberRolesTab.tsx:~300`),
obwohl die API group_history-Codes erwartet. Die korrekte FE-Konstante existiert bereits:
`FANSUB_GROUP_ROLE_OPTIONS` in `fansub.ts:344-355` (enthaelt `quality_checker` etc.).

**F9 — OpenAPI-Contracts fehlen.**
In `shared/contracts/openapi.yaml`, `fansubs.yaml`, `admin-content.yaml` gibt es keine
Definitionen fuer group-members, member-roles, anime/:animeId/contributions. Das erklaert
den Drift zwischen Backend, `fansub.ts` und `api.ts`.
</verified_findings>

<technical_facts>
## Technische Fakten fuer die Umsetzung

- **members-Tabelle** (`database/migrations/0044_add_db_schema_v2_target_tables.up.sql:128`):
  `id BIGSERIAL PK, user_id BIGINT REFERENCES users(id), nickname VARCHAR(120) NOT NULL, ...`.
  Auto-Create: `INSERT INTO members(nickname, user_id) VALUES($display_name, $app_user_id)`.
  *Offen zu klaeren beim Planen:* FE nennt das Feld `app_user_id`. `members.user_id`
  referenziert `users(id)` (Legacy), waehrend `anime_contributions.confirmed_by` auf
  `app_users(id)` zeigt. Der Planner muss festlegen, auf welche Tabelle die optionale
  App-User-Verknuepfung zielt (users vs app_users) und ob eine Mapping-/Lookup-Stufe noetig
  ist. Im Zweifel: app_user_id optional lassen und nur nickname setzen, Verknuepfung als
  separater, gut abgegrenzter Schritt.

- **Naechste freie Migration: 0088** (0087 = anime_contribution_roles_and_badges existiert).
  Migration 0088 (up + down): Unique-Constraint auf
  `(fansub_group_id, anime_id, fansub_group_member_id)` + Composite-FK, der sicherstellt,
  dass `(fansub_group_id, fansub_group_member_id)` konsistent zur Mitgliedschaft ist
  (erfordert ggf. einen Unique-Key auf `hist_fansub_group_members(id, fansub_group_id)` als
  Referenzziel).

- **Display-Repo-Methoden existieren bereits** und liefern die FE-Shape:
  `hist_group_members_repository.go` -> `ListByFansubGroupWithDisplay`;
  `anime_contributions_repository.go` -> `ListByFansubAndAnimeWithDisplay` (`:142`),
  `GetByIDWithDisplay` (`:173`). Handler auf diese umstellen.

- **Permission-Muster** (1:1 aus `fansub_group_links.go` uebernehmen): Actor aus Context,
  `CanForFansubGroup(ctx, actor, ActionFansubGroupMembersManage, fansubID)`, bei Denial
  auditieren + `writePermissionDenied`. Lesen ggf. mit `ActionFansubGroupMembersView`.
  Handler brauchen dafuer `permissionSvc` und `auditLogRepo` als neue Dependencies
  (Konstruktor + Verdrahtung in `backend/cmd/server/main.go`).

- **Modularitaet:** Produktionsdateien <= 450 Zeilen (CLAUDE.md). Falls Handler durch
  Permission-/Member-Create-Logik zu gross werden, vorher splitten.

- **Sprachqualitaet:** Alle neuen user-facing Strings (DE) mit korrekten Umlauten.

- **Contract-Disziplin:** `shared/contracts/` wird parallel zum Code gepflegt.
</technical_facts>

<success_criteria>
## Success Criteria (aus ROADMAP Phase 69)

Siehe ROADMAP.md Phase 69, P69-SC1 .. P69-SC9. Kurzform:
1. Einheitliches `{"data": ...}`-Envelope auf allen 6 Endpunkten; FE konsumiert `.data`; alle 3 Tabs laden fehlerfrei.
2. Member-Create per `display_name` (+ optional app-user) legt members-Zeile + Mitgliedschaft an; GET nutzt WithDisplay.
3. member-roles immer mit `?member_id=N`; Rolleneingabe per seed-konformer Auswahl statt Freitext.
4. Alle Phase-62/63-Admin-Handler pruefen `CanForFansubGroup` + auditieren Denials.
5. Cross-Group-Ablehnung via MemberBelongsToFansub + Composite-FK (Migration 0088).
6. Unique-Key (Migration 0088) verhindert Duplikate; Create-Verhalten definiert (Konflikt oder echtes Upsert).
7. Status wird beim Create uebernommen (kein hartcodiertes 'draft' bei gueltigem Status).
8. FE-role_codes seed-konform (quality_checker statt qc); ungueltige Codes nicht auswaehlbar.
9. OpenAPI-Contracts fuer die neuen Endpunkte, konsistent mit fansub.ts/api.ts.
</success_criteria>
