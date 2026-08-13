---
phase: 94-rollen-capability-ux-fachlich-entwirren-und-mobil-nutzbar-ma
verified: 2026-06-30T15:25:00Z
status: human_needed
score: 11/12
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Historischer Rollen-Dialog zeigt Gründer/in, Gruppenleitung, Co-Leitung, Projektmanagement an :3000"
    expected: "Die vier Rollennamen aus der DB erscheinen im Select des Dialogs; kein translator/encoder o.ä."
    why_human: "Labels kommen dynamisch von GET /api/v1/admin/fansubs/:id/role-definitions; statische Tests mocken den API-Call, aber der Live-Dialog muss bestätigt werden, dass der Backend-Rebuild durchgeführt wurde und die Route antwortet."
  - test: "Historische Rollen-UI zeigt 'Frühere Funktion in der Gruppe' als Feldlabel bei :3000"
    expected: "Der Dialog-Kontext ist als historisch formuliert; kein Begriff, der aktive App-Rechte suggeriert"
    why_human: "Deferred human-verify checkpoint aus Plan 08 Task 4 (checkpoint:human-verify gate); UAT ausstehend laut 94-08-SUMMARY.md"
  - test: "Aktiver Mitglieder-Dialog zeigt 'Aktive Rechte · N' als Tab-Label bei :3000"
    expected: "Das Tab-Label ist umbenannt; kein 'Rollen · N' mehr sichtbar; historische Rollen (founder, co_leader) erscheinen nicht in der Auswahlliste"
    why_human: "Deferred human-verify checkpoint aus Plan 08 Task 4; UAT ausstehend"
  - test: "Capability-UI bei 390 px zeigt kein horizontales Scrollen, Detail als Bottom-Sheet"
    expected: "Rollenliste bleibt vertikal; beim Klick auf eine Rolle öffnet sich das Detail als Bottom-Sheet; Labels nicht abgeschnitten; Touch-Ziele >= 44 px; Speichern/Schließen erreichbar"
    why_human: "Deferred human-verify checkpoint aus Plan 06 Task 3; Layout-Verhalten und Touch-Targets sind nur im echten Browser bei 390 px verifizierbar"
  - test: "Kontext-Badges in der Capability-UI korrekt dargestellt"
    expected: "App-Rollen tragen Badge 'Aktive App-Rolle' (blau/info); historische Rollen tragen Badge 'Historische Rolle' (gedämpft/muted); Umlaute korrekt"
    why_human: "Visueller Badge-Kontrast und Farbe nur im Browser prüfbar"
---

# Phase 94: Rollen-/Capability-UX fachlich entwirren und mobil nutzbar machen — Verification Report

**Phase Goal:** Aktive App-Gruppenrollen, historische Gruppenrollen und Anime-Beitragsrollen werden fachlich klar getrennt: die historische Rollen-UI nutzt eine eigene group_history-Rollenliste (Gründer/in, Gruppenleitung, Co-Leitung, Projektmanagement), die aktive Mitglieder-UI zeigt nur aktive App-Rechte mit verständlicheren Begriffen, die Capability-Verwaltung bearbeitet/zeigt nur permission-bearing Rollen (Backend-Guard blockiert Grant/Revoke an rein historische Rollen), und die Capability-Pflege wird von einer breiten Vollmatrix auf eine rollenbasierte, kategorisierte, bei 390 px ohne horizontales Scrollen bedienbare Oberfläche umgebaut.
**Verified:** 2026-06-30T15:25:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Hinweis: Bekannte Debt-Punkte aus 94-REVIEW.md

Der Code-Review (94-REVIEW.md) identifizierte zwei Punkte, die explizit in Phase 95 geschlossen werden:

- **CR-01** (critical): Der historische Rollen-WRITE-Pfad (`CreateHistGroupMemberRole`) validiert `role_code` nur gegen den breiten `group_history`-Kontext via `RoleCodeExistsForContext`, nicht gegen die 4-Rollen-Whitelist. Ein handgefertigter POST kann `translator`/`encoder` in `hist_group_member_roles` persistieren. READ-seitige Kuration ist korrekt implementiert. Wurde für Phase 95 geroutet.
- **WR-02** (warning): `ListHistGroupMemberRoles` prüft `CanForFansubGroup` auf fansubID, ruft aber `ListByMember(memberID)` ohne Querprüfung ob `memberID` zu `fansubID` gehört (Cross-Group-Scope-Leak). Ebenfalls Phase-95-Debt.

Das Phasenziel "historische Rollen-UI nutzt eigene group_history-Rollenliste" ist auf **READ/UI-Ebene vollständig erfüllt** — die nachfolgende Write-Hardening-Lücke ist ein separates Sicherheitsproblem, das den primären Phasenzweck nicht aufhebt.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Backend-Guard blockiert Grant an historischer Rolle (founder) mit HTTP 422 role_not_assignable | VERIFIED | `admin_capability_handler.go:92-95`: `!permissions.IsKnownFansubGroupRole(roleCode)` → `role_not_assignable`; Test `TestGrantCapabilityAssignableGuardRejectsHistoricalRole` GRÜN |
| 2 | Backend-Guard blockiert Revoke an historischer Rolle (co_leader) mit HTTP 422 role_not_assignable | VERIFIED | `admin_capability_handler.go:148-151`: identischer Guard in RevokeCapability; Test `TestRevokeCapabilityAssignableGuardRejectsHistoricalRole` GRÜN |
| 3 | Matrix-Response trägt assignable=true für App-Rollen, assignable=false für historische Rollen | VERIFIED | `admin_capability_handler.go:66`: `matrix.Roles[i].Assignable = permissions.IsKnownFansubGroupRole(...)` vor c.JSON; `authz_capability_mutations.go:34-35`: Felder Assignable+Contexts; Test `TestListCapabilityMatrixAssignableEnrichment` GRÜN |
| 4 | GET /api/v1/admin/fansubs/:id/role-definitions liefert kuratierte group_history-Liste (Gründer/in, Gruppenleitung, Co-Leitung, Projektmanagement) — keine App-Rollen | VERIFIED | `hist_group_member_roles_repository.go:245-249`: `groupHistoryDialogRoleWhitelist = ["founder","leader","co_leader","project_manager"]`; SQL mit `code = ANY($1)`; Route in `admin_routes.go:198`; Auth-Gate-Test GRÜN; DB-Seed bestätigt deutsche Labels |
| 5 | Historischer Rollen-Dialog lädt Rollen aus group_history-Quelle (nicht FANSUB_GROUP_ROLE_OPTIONS) | VERIFIED | `GroupMembersTab.tsx:14,61`: `import listGroupHistoryRoleDefinitions`, lädt per `useEffect`; `GroupHistRoleDialog.tsx:41-42`: `historyRoleOptions: RoleDefinitionOption[]` als Prop; kein FANSUB_GROUP_ROLE_OPTIONS-Import im Dialog |
| 6 | Historischer Dialog verwendet historische Sprache ("Frühere Funktion in der Gruppe") | VERIFIED | `GroupHistRoleDialog.tsx:65,115,120,122`: Titel "Frühere Funktion bearbeiten/hinzufügen", Label "Frühere Funktion in der Gruppe", aria-label "Frühere Funktion auswählen" |
| 7 | Historischer Dialog nutzt Select-Primitiv aus @/components/ui (kein natives select) | VERIFIED | `GroupHistRoleDialog.tsx:8,99,116`: `import { Select, ...}` aus `@/components/ui`; `<Select>` an beiden Stellen; GroupHistRoleDialog-Tests (4/4) GRÜN |
| 8 | Aktiver Mitglieder-Dialog auf "Aktive Rechte" umbenannt, keine historischen Rollen | VERIFIED | `FansubAppMemberEditorPanel.tsx:117,135,136`: Tab-Label "Aktive Rechte · N", Section aria-label "Aktive Rechte", Hinweis "Aktive Rechte bestimmen..."; nur `FANSUB_GROUP_ROLE_OPTIONS` als Rollenquelle; FansubAppMemberEditorPanel-Tests (3/3) GRÜN |
| 9 | Historische Rolle (founder) wird am aktiven Schreibpfad SetRole serverseitig abgelehnt (AC-2) | VERIFIED | `fansub_group_app_members_repository.go:378`: `!permissions.IsKnownFansubGroupRole(role)` → Fehler; `fansub_group_app_members_repository_test.go:83-107`: `TestSetRoleRejectsHistoricalRoleCode` GRÜN |
| 10 | Capability-UI nutzt Master-Detail-Layout (Rollenliste + kategorisierte Detail-Ansicht) | VERIFIED | `RoleCapabilityClient.tsx:11-12,216,234,257`: importiert und rendert `RoleMasterList` und `RoleCapabilityDetail`; Alter RoleCapabilityTable nicht mehr als Hauptbedienung; capabilityCategories-Tests (4/4) + RoleMasterList-Tests (4/4) GRÜN |
| 11 | Capabilities sind als Accordion + Switch bedienbar; bei non-assignable Rollen Switches disabled | VERIFIED | `RoleCapabilityDetail.tsx:3-4,86,162`: importiert `Accordion`/`Switch` aus @/components/ui; Switch disabled wenn `role.assignable === false`; Detail-Tests (5/5) GRÜN |
| 12 | Mobile-Detail bei < 760 px im Drawer variant="responsiveSheet" ohne horizontale Vollmatrix | HUMAN NEEDED | `RoleCapabilityClient.tsx:20-31,247,255`: useIsMobile-Hook, bedingter Drawer; Code vorhanden und Tests (Desktop/Mobile-Exklusivität) GRÜN; UAT-Checkpoint (Plan 06 Task 3) noch nicht formal approved |

**Score:** 11/12 truths programmatisch verifiziert; 1 truth HUMAN NEEDED (Mobile-UX)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/handlers/admin_capability_handler.go` | Assignable-Guard in Grant+Revoke + Matrix-Anreicherung | VERIFIED | `role_not_assignable` an Z.95/151; Matrix-Anreicherung Z.66 |
| `backend/internal/repository/authz_capability_mutations.go` | CapabilityMatrixRoleEntry um Assignable/Contexts erweitert | VERIFIED | Felder Z.34-35; `contexts` in Query Z.71 |
| `backend/internal/repository/hist_group_member_roles_repository.go` | ListGroupHistoryRoleDefinitions + kuratierte Whitelist | VERIFIED | Whitelist Z.245-249; Methode Z.255 |
| `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` | Read-Handler mit CanForFansubGroup-Gate | VERIFIED | ListGroupHistoryRoleDefinitions mit Auth-Gate |
| `backend/cmd/server/admin_routes.go` | Route GET /admin/fansubs/:id/role-definitions | VERIFIED | Z.198 |
| `backend/internal/handlers/fansub_hist_group_member_roles_handler_test.go` | Auth-Gate-Test (nicht-berechtigter Actor -> 403) | VERIFIED | TestListGroupHistoryRoleDefinitionsDeniesUnauthorizedActor GRÜN |
| `backend/internal/handlers/admin_capability_handler_test.go` | AssignableGuard-Tests (422) + Enrichment-Test | VERIFIED | 4 Tests GRÜN |
| `backend/internal/repository/role_definitions_context_test.go` | group_history-Whitelist-Invariante (Disjunktheit zu FansubGroupRoles) | VERIFIED | TestRoleDefinitionsContextWhitelistOnly GRÜN |
| `backend/internal/repository/fansub_group_app_members_repository_test.go` | AC-2-Test: SetRole lehnt historischen role_code ab | VERIFIED | TestSetRoleRejectsHistoricalRoleCode GRÜN |
| `shared/contracts/admin-capabilities.yaml` | assignable/contexts additiv + 422 role_not_assignable dokumentiert | VERIFIED | `assignable` Z.288; enum `role_not_assignable` Z.356 |
| `frontend/src/types/admin-capability.ts` | RoleEntry.assignable?/contexts? + RoleDefinitionOption | VERIFIED | Z.20-21,27 |
| `frontend/src/lib/api.ts` | listGroupHistoryRoleDefinitions-Helper | VERIFIED | Z.9288 |
| `frontend/src/components/ui/Switch.tsx` | role=switch, aria-checked, >= 44px Touch-Ziel | VERIFIED | Z.31-32; .switchRoot min-height/min-width 44px in ui.module.css Z.1149-1154 |
| `frontend/src/components/ui/Accordion.tsx` | aria-expanded Header-Toggle, >= 44px Touch-Ziel | VERIFIED | Z.69; .accordionHeader min-height 44px Z.1238 |
| `frontend/src/components/ui/index.ts` | Switch + Accordion exportiert | VERIFIED | Z.1,17 |
| `frontend/src/app/admin/role-capabilities/capabilityCategories.ts` | Display-Mapping gruppe/projekt/release (27 Z.) | VERIFIED | Z.11-13; 27 Zeilen |
| `frontend/src/app/admin/role-capabilities/RoleMasterList.tsx` | Rollenliste mit Kontext-Badges (87 Z.) | VERIFIED | assignable-Auswertung Z.32,78; Card+Badge Primitives |
| `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx` | Accordion+Switch-Detail, disabled bei non-assignable (171 Z.) | VERIFIED | Switch disabled Z.86; Accordion-Gruppen Z.162 |
| `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` | Master-Detail + 422-Inline-Fehler + Mobile-Sheet (269 Z.) | VERIFIED | 422-Handling Z.136,160; isMobile-Gate Z.227,247; RoleMasterList+Detail importiert |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx` | group_history-Quelle + historische Sprache (171 Z.) | VERIFIED | historyRoleOptions als Prop; "Frühere Funktion" Labels |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx` | <= 450 Z., lädt listGroupHistoryRoleDefinitions | VERIFIED | 201 Zeilen; Import + useEffect |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx` | "Aktive Rechte" Label, nur FANSUB_GROUP_ROLE_OPTIONS (194 Z.) | VERIFIED | Label Z.117,135-136; FANSUB_GROUP_ROLE_OPTIONS Z.10 |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx` | <= 450 Z. | VERIFIED | 432 Zeilen |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `admin_capability_handler.go GrantCapability` | `permissions.IsKnownFansubGroupRole` | Guard VOR DB-Mutation Z.92 | VERIFIED | Guard aktiv, Test GRÜN |
| `admin_capability_handler.go RevokeCapability` | `permissions.IsKnownFansubGroupRole` | Guard VOR DB-Mutation Z.148 | VERIFIED | Beide Pfade abgedeckt (Pitfall 4 korrekt) |
| `admin_capability_handler.go ListCapabilityMatrix` | `permissions.IsKnownFansubGroupRole` | Anreicherung Z.66 nach Repo-Aufruf | VERIFIED | Assignable korrekt gesetzt |
| `admin_routes.go` | `histGroupMemberRolesHandler.ListGroupHistoryRoleDefinitions` | `v1.GET` Z.198 | VERIFIED | Route registriert |
| `GroupMembersTab.tsx` | `api.ts listGroupHistoryRoleDefinitions` | `useEffect` + Prop-Drilling Z.14,61 | VERIFIED | Helper konsumiert, Options durchgereicht |
| `GroupHistRoleDialog.tsx` | `historyRoleOptions` Prop | Select-Options-Map Z.123 | VERIFIED | FANSUB_GROUP_ROLE_OPTIONS kein Import mehr |
| `RoleCapabilityDetail.tsx` | `@/components/ui Accordion + Switch` | Import Z.3-4, Render Z.86,162 | VERIFIED | Globale Primitives korrekt konsumiert |
| `RoleMasterList.tsx` | `role.assignable` | Badge-Ableitung Z.32,78 | VERIFIED | info/muted Badge korrekt |
| `RoleCapabilityClient.tsx` | `ApiError 422 role_not_assignable` | err.status===422 && err.code==='role_not_assignable' Z.136,160 | VERIFIED | Inline-Fehler korrekt |
| `frontend/src/components/ui/index.ts` | `Switch.tsx, Accordion.tsx` | `export * from` Z.1,17 | VERIFIED | Barrel-Export korrekt |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `RoleCapabilityClient.tsx` | `matrix` / `roles` | `listRoleCapabilities()` → GET /api/v1/admin/role-capabilities | DB via `ListCapabilityMatrix` mit `CROSS JOIN role_definitions` | FLOWING |
| `GroupMembersTab.tsx` | `historyRoleOptions` | `listGroupHistoryRoleDefinitions(fansubId)` → GET /admin/fansubs/:id/role-definitions | DB via `ListGroupHistoryRoleDefinitions` mit Whitelist-SQL | FLOWING |
| `GroupHistRoleDialog.tsx` | `historyRoleOptions` Prop | Durchgereicht von GroupMembersTab | Echte Daten aus API | FLOWING |
| `FansubAppMemberEditorPanel.tsx` | `FANSUB_GROUP_ROLE_OPTIONS` | Konstante (korrekt — statische Rollenoptionen für aktive Rollen) | Statische Konstante ist korrekt (nicht dynamisch erwünscht) | VERIFIED (intentional static) |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| AssignableGuard Tests (Grant+Revoke+Allow+Enrichment) | `go test ./internal/handlers/ -run "AssignableGuard\|AssignableEnrichment"` | ok (1.486s) | PASS |
| group_history Whitelist-Invariante | `go test ./internal/repository/ -run "RoleDefinitionsContext"` | ok (0.860s) | PASS |
| AC-2 SetRole-Ablehnung historischer Rollen | `go test ./internal/repository/ -run "SetRoleRejectsHistoricalRoleCode"` | ok | PASS |
| Auth-Gate 403 für role-definitions-Read | `go test ./internal/handlers/ -run "ListGroupHistoryRoleDefinitionsDeniesUnauthorizedActor"` | ok (1.475s) | PASS |
| GroupHistRoleDialog Tests (4/4) | `npx vitest run -t GroupHistRoleDialog` | 4 passed | PASS |
| FansubAppMemberEditorPanel Tests (3/3) | `npx vitest run -t FansubAppMemberEditorPanel` | 3 passed | PASS |
| Role-Capabilities Frontend Tests (21/21) | `npx vitest run src/app/admin/role-capabilities` | 21 passed | PASS |
| Switch + Accordion Primitive Tests (10/10) | `npx vitest run src/components/ui/Switch.test.tsx src/components/ui/Accordion.test.tsx` | 10 passed | PASS |
| Backend Build sauber | `go build ./...` | exit 0 | PASS |

---

### Requirements Coverage

Phase 94 deklariert keine Standard-REQUIREMENTS.md-IDs — die Anforderungen sind in 94-CONTEXT.md als AC-1..AC-11 und D-01..D-14 geführt. Alle PLAN-Frontmatter-Referenzen dieser IDs sind durch obige Truths abgedeckt.

| Anforderung | Plans | Status | Evidenz |
|-------------|-------|--------|---------|
| AC-1/3 (Hist. Rollen aus group_history-Quelle) | 03,04,07,08 | VERIFIED | ListGroupHistoryRoleDefinitions + GroupHistRoleDialog |
| AC-2 (historische Rolle nicht als aktive App-Rolle setzbar) | 08 | VERIFIED | SetRole-Whitelist Z.378 + Repo-Test |
| AC-4/5 (Aktive Mitglieder-UI ohne historische Rollen, "Aktive Rechte") | 07,08 | VERIFIED | FansubAppMemberEditorPanel "Aktive Rechte", nur FANSUB_GROUP_ROLE_OPTIONS |
| AC-6 (Capability-UI nur permission-bearing Rollen, kategorisiert) | 02,04,06 | VERIFIED | Master-Detail + Badges + assignable-Filter |
| AC-7 (Guard blockiert Grant/Revoke an historischen Rollen) | 01,02 | VERIFIED | 422 role_not_assignable Guard in beiden Pfaden |
| AC-8 (390 px ohne horizontales Scrollen) | 05,06 | HUMAN NEEDED | Code vorhanden; Live-UAT-Checkpoint ausstehend |
| AC-9 (historische Sprache im historischen Dialog) | 08 | VERIFIED | "Frühere Funktion in der Gruppe" |
| AC-10 (Pflicht-Testabdeckung) | 01..08 | VERIFIED | 50+ Tests grün (s. Spot-Checks) |
| AC-11 (Contract/Typen/api.ts synchron) | 04 | VERIFIED | YAML + admin-capability.ts + api.ts synchron |

---

### Anti-Patterns Found

| File | Issue | Severity | Impact |
|------|-------|----------|--------|
| `frontend/src/components/contributions/ProposalForm.tsx` | 541 Zeilen — überschreitet 450-Zeilen-Limit; wurde in Phase 94 (Plan 07 Drawer→Modal) berührt | WARNING (WR-03 aus REVIEW.md) | Modularität, kein Funktionsdefekt; Phase-95-Kandidat |
| `frontend/src/app/dev/ui-system/page.tsx` | 1251 Zeilen — weit über 450-Limit; durch Plan 05 (Showcase) verlängert | INFO (WR-04 aus REVIEW.md) | Dev-only Route, kein Produktionscode mit Laufzeitlogik |
| `backend/internal/handlers/admin_capability_handler_test.go` | Tests prüfen `adminCapabilityHandlerWithStubs` (Kopie der Handler-Logik), nicht den Produktions-Handler; Audit-Pfad in Stub-Copy fehlt | WARNING (WR-01 aus REVIEW.md) | Sicherheitsrelevante Guards nur im Spiegel getestet; Phase-95-Debt |

Keine TBD/FIXME/XXX-Marker in den von dieser Phase modifizierten Produktionsdateien gefunden.

---

### Human Verification Required

Die folgenden Prüfungen wurden als `checkpoint:human-verify`-Tasks in Plan 06 (Task 3) und Plan 08 (Task 4) deklariert und sind laut SUMMARY.md noch nicht formal approved:

#### 1. Historischer Rollen-Dialog Live-UX

**Test:** /admin/fansubs/[id]/edit öffnen; historischen Rollen-Dialog öffnen (Backend muss mit Plan-03-Route deployed sein: `docker compose up -d --build team4sv30-backend`)
**Expected:** Angezeigte Rollen: Gründer/in, Gruppenleitung, Co-Leitung, Projektmanagement — kein translator/encoder/fansub_lead; Dialogtitel und Feldlabel formulieren den Kontext als frühere/historische Funktion; Umlaute korrekt (ä/ö/ü/ß)
**Why human:** API-Antwort und Labels sind dynamisch aus DB; Backend-Rebuild-Status unbekannt; Mock-Tests decken nur gemockte Daten ab

#### 2. Aktiver Mitglieder-Dialog Live-UX

**Test:** /admin/fansubs/[id]/edit öffnen; aktives Mitglieder-Tab aufrufen; Mitglied editieren
**Expected:** Tab-Label "Aktive Rechte · N"; Rollen-Auswahl enthält nur App-Rollen (kein Gründer/in, Co-Leitung); Umlaute korrekt
**Why human:** Checkpoint aus Plan 08 Task 4; UAT laut SUMMARY ausstehend

#### 3. Capability-UI bei 390 px

**Test:** /admin/role-capabilities bei 390 px Viewport-Breite; eine Rolle anklicken
**Expected:** Kein horizontales Scrollen; Detail öffnet sich als Bottom-Sheet (Drawer); Labels vollständig lesbar; Touch-Ziele mindestens fingertauglich; Schließen-Button erreichbar; Kontext-Badges sichtbar
**Why human:** Checkpoint aus Plan 06 Task 3; drei Bug-Fixes (Desktop/Mobile-Exklusivität, Links-Clipping, Accordion-Zuklappen) wurden eingebaut, aber eine finale UAT-Freigabe fehlt

#### 4. 422 role_not_assignable Inline-Fehler bei historischer Rolle

**Test:** In /admin/role-capabilities eine historische Rolle wählen (Badge "Historische Rolle"); versuchen, einen Switch zu toggeln (falls die Switches nicht vollständig blockiert sind)
**Expected:** Inline-Fehlertext erscheint im Detail-Panel (nicht als generisches Modal); kein stiller Erfolg; Server antwortet mit 422
**Why human:** End-to-end-Fluss erfordert einen authentifizierten Admin-Browser mit Live-Backend

---

### Gaps Summary

Kein Blocker-Gap identifiziert. Das Phasenziel ist auf Code-Ebene vollständig implementiert:
- Backend-Guards (Assignable-Guard 422, SetRole-Whitelist) korrekt und getestet
- group_history-Read-Endpunkt kuratiert und Auth-gated
- Alle vier UI-Bereiche (historischer Dialog, aktiver Dialog, Capability-Matrix, neue Primitives) implementiert und unit-getestet
- Contract/Typen/api.ts synchron

Die einzige offene Anforderung ist das formale UAT-Sign-off für die drei deferred human-verify Checkpoints (Mobile-UX, Dialog Live-UX, 422-Inline-Fehler). Diese wurden als blocking `checkpoint:human-verify`-Tasks in Plan 06 und Plan 08 deklariert.

**Bekannte Phase-95-Debt (nicht phasenziel-blockend):**
- CR-01: Write-Pfad `CreateHistGroupMemberRole` validiert gegen breiten group_history-Kontext statt 4-Rollen-Whitelist (Umgehungsrisiko via manuellen POST, nicht per UI)
- WR-02: Cross-group Scope-Leak in `ListHistGroupMemberRoles` (member_id ohne fansubID-Querprüfung)
- WR-01: Capability-Handler-Tests testen einen Stub-Copy statt des Produktions-Handlers

---

_Verified: 2026-06-30T15:25:00Z_
_Verifier: Claude (gsd-verifier)_
