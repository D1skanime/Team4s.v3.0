# Phase 95: Rollenmodell entwirren — Research

**Recherchiert:** 2026-06-30
**Domäne:** Rollenmodell / Capability-Matrix / DB-Migration / Go-Permissions / Frontend-Typen
**Konfidenz:** HIGH

---

<user_constraints>
## User Constraints (aus CONTEXT.md)

### Gelockte Entscheidungen
- **D-01:** Zwei-Ebenen-Rollenmodell. Gruppen-Ebene: `founder`, `fansub_lead`, `co_leader`, `project_lead`, NEU `techadmin`, NEU `gfxler`. Projekt-/Anime-Ebene: `translator`, `editor`, `timer`, `typesetter`, `encoder`, `raw_provider`, `quality_checker`, `designer`.
- **D-02:** `gfxler` (Gruppe) und `designer` (Projekt) bleiben getrennte Codes — kein Merge.
- **D-03:** Gruppen-Rollen sind permission-bearing/assignable und erscheinen in der Capability-Matrix.
- **D-04:** Kanonische Codes: `leader` → `fansub_lead`, `project_manager` → `project_lead`. Historische hist_group_member_roles-Einträge mit den alten Codes migrieren; redundante Codes entfallen.
- **D-05:** Labels: `fansub_lead` → „Gruppenleitung", `project_lead` → „Fansub-Projektleitung".
- **D-06:** `groupHistoryDialogRoleWhitelist` aktualisiert auf kanonische Codes + neue Gruppen-Positions-Rollen.
- **D-07:** `techadmin` und `gfxler` als neue `role_definitions` (Gruppen-Ebene), assignable.
- **D-08:** Beide neuen Rollen starten ohne Default-Capabilities (leer).
- **D-09:** Koexistieren: aktive Rolle = jetzt (`fansub_group_member_roles`), historische Rolle = Jahres-Zeitraum (`hist_group_member_roles`).
- **D-10:** Auto-Archivierung: Entzug jeder aktiven Gruppenrolle → automatisch ein `hist_group_member_roles`-Eintrag (`started_year` aus `created_at`-Jahr der aktiven Rolle, `ended_year` = aktuelles Jahr, `status='ended'`).
- **D-11:** Historische Rollen bleiben Admin-/Leitungs-intern. Kein Member-/Public-Surface in dieser Phase.
- **D-12:** Rollen voll data-driven: `fansubGroupRoleCatalog` aus `role_definitions` laden; Frontend-Optionen (`FANSUB_GROUP_ROLE_OPTIONS`, `contributionRoles.ts` ×2) per API holen.
- **D-13:** CR-01 — `CreateHistGroupMemberRole` gegen Whitelist härten.
- **D-14:** WR-02 — Cross-Group-Scope-Check in `ListHistGroupMemberRoles`.
- **D-15:** WR-01 — Capability-Tests gegen Produktions-Handler, nicht Stub-Kopie.
- **D-16:** WR-03/04 — `ProposalForm.tsx` (541 Z.) und `dev/ui-system/page.tsx` (1251 Z.) splitten.
- **D-17:** WR-05 — Deterministische Kategorie-Reihenfolge in `RoleCapabilityDetail`.

### Claudes Ermessen
- Auto-Archivierung (D-10) gilt für ALLE Gruppenrollen (nicht nur Leitungsrollen).
- Migrationsmechanik der alten Codes (Hard-Remove vs. deprecated Alias).
- Exakte `started_year`-Ableitung beim Auto-Archive.
- Konkrete Datei-Splits für D-16.
- Exakte assignable-Markierung in `role_definitions` (neue Spalte vs. abgeleitet).

### Zurückgestellte Ideen (OUT OF SCOPE)
- Backlog 999.1: Querverlinkung `/admin/role-capabilities` ↔ `/admin/users`.
- Member-/Public-Anzeige historischer Rollen.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Beschreibung | Research-Support |
|----|-------------|-----------------|
| D-01 | Zwei-Ebenen-Taxonomie mit kanonischen Codes | Migrations-Strategie: neue role_definitions + fansub_group_member_roles CHECK-Anpassung |
| D-02 | gfxler ≠ designer — getrennte Codes | Keine Konflikte mit existierendem DB-Schema |
| D-03 | Gruppenrollen assignable | `fansubGroupRoleCatalog` ist die Quelle; `IsKnownFansubGroupRole` ist Guard |
| D-04 | leader→fansub_lead, project_manager→project_lead: hist-Migration | Alle Fundstellen der alten Codes identifiziert (Backend-SQL, Whitelist, Test-Fixtures) |
| D-05 | Labels aktualisieren | Betrifft role_definitions.label_de + Frontend-Konstanten |
| D-06 | Whitelist auf kanonische Codes umstellen | `groupHistoryDialogRoleWhitelist` in hist_group_member_roles_repository.go:245-250 |
| D-07 | techadmin + gfxler als neue role_definitions (Gruppen-Ebene) | Migrations-Nummer 0112 verfügbar |
| D-08 | Neue Rollen starten ohne Capabilities | role_capabilities enthält keine Einträge für sie; assignable=true via fansubGroupRoleCatalog |
| D-09 | Lifecycle koexistieren — kein Schema-Umbau nötig | Schema bereits vorhanden, bestätigt |
| D-10 | Auto-Archivierung bei Rollen-Entzug | Revoke-Pfad ist `SetMemberRole(Enable=false)` in fansub_group_app_members_repository.go:399-414 |
| D-11 | visibility=intern | Default bereits im Schema; kein Frontend-Surface nötig |
| D-12 | fansubGroupRoleCatalog aus role_definitions laden + Frontend-API | Neuer GET-Endpunkt nötig; bestehende Infra in authz_permissions.go wiederverwendbar |
| D-13 | CR-01: Whitelist-Härtung im Write-Pfad | Fundstelle: handler:237, repository:282; Fix-Vorlage aus 94-REVIEW.md |
| D-14 | WR-02: Cross-Group-Check in ListHistGroupMemberRoles | Fundstelle: handler:134-152; Fix = memberID-Lookup vor ListByMember |
| D-15 | WR-01: Tests gegen Produktions-Handler | `adminCapabilityHandlerWithStubs` (test:506-626) durch Interface-Injektion ersetzen |
| D-16 | WR-03/04: Dateisplits unter 450 Z. | ProposalForm.tsx=541Z, ui-system/page.tsx=1251Z — Splits definiert |
| D-17 | WR-05: Deterministische Kategorie-Reihenfolge | `byCategory`-Aufbau in RoleCapabilityDetail.tsx:41-46 mit useMemo + CATEGORY_ORDER-Sort |
</phase_requirements>

---

## Summary

Phase 95 bereinigt das Rollenmodell auf drei Ebenen gleichzeitig: (1) Schema/DB-Migration für neue Rollen (`techadmin`, `gfxler`) und Code-Vereinheitlichung (`leader`→`fansub_lead`, `project_manager`→`project_lead`), (2) Go-Backend-Umbau für data-driven `fansubGroupRoleCatalog` und Auto-Archivierung, (3) Frontend-Umbau auf API-getriebene Rollenoptionen. Parallel werden fünf Review-Schulden aus Phase 94 abgetragen (CR-01, WR-01–05).

Die technische Grundlage ist gut vorbereitet: Die Capability-Registry (Migration 0108) ist aktiv, `role_definitions` trägt bereits das gemeinsame Vokabular, und `fansub_group_member_roles` hat einen FK statt CHECK-Constraint (Migration 0106). Die neuen Rollen benötigen hauptsächlich `role_definitions`-Einträge und eine Erweiterung des `fansubGroupRoleCatalog`.

**Kritische Erkenntnis:** Die alten Codes `leader` und `project_manager` existieren **nicht** in `fansub_group_member_roles` (die aktive App-Mitgliedschaftstabelle hat seit Migration 0073/0074 nur `fansub_lead`/`project_lead`). Sie existieren ausschließlich in `hist_group_member_roles` (historische Einträge) und in der `groupHistoryDialogRoleWhitelist`. Die Migration ist daher rein auf die histor. Tabelle beschränkt — kein aktiver App-Rolleneintrag muss umgeschrieben werden.

**Primäre Empfehlung:** Auto-Archivierung (D-10) in `SetMemberRole(Enable=false)` im Repository `fansub_group_app_members_repository.go` verankern — dort findet der DELETE aus `fansub_group_member_roles` statt, und das `created_at`-Jahr der zu löschenden Zeile ist zugänglich.

## Architektonische Verantwortungskarte

| Fähigkeit | Primäre Schicht | Sekundäre Schicht | Begründung |
|-----------|----------------|-------------------|------------|
| Rollen-Katalog (data-driven) | DB (`role_definitions`) | Go In-Memory-Cache | Einzige Wahrheitsquelle; FK-Constraint erzwingt Konsistenz |
| `fansubGroupRoleCatalog` dynamisch laden | Go `permissions.go` (LoadCache) | authz_permissions.go | Cache-Architektur bereits vorhanden |
| Frontend-Rollenoptionen per API | Backend Handler (neuer Endpunkt) | Frontend `api.ts` | Trennung UI von hartkodierter Liste |
| Auto-Archivierung | Go Repository (`fansub_group_app_members_repository.go`) | — | Revoke-Pfad sitzt dort; atomarer DELETE + INSERT |
| Code-Vereinheitlichung (hist. Einträge) | DB-Migration | — | Einmalige Datenmigration; kein Go-Code-Pfad |
| Whitelist-Härtung CR-01 | Go Repository + Handler | — | Write-Pfad-Validierung |
| Capability-Tests WR-01 | Go Test-Datei | Go Handler-Interface | Interface-Injektion entkoppelt Test vom Stub |
| Datei-Splits WR-03/04 | Frontend TypeScript | — | Modulgrenze unter 450 Z. |
| Kategorie-Reihenfolge WR-05 | Frontend React-Komponente | — | `useMemo` + explizite Reihenfolge |

---

## Standard-Stack

### Backend (bereits vorhanden — keine neuen Bibliotheken)

| Bibliothek | Version | Zweck | Warum Standard |
|-----------|---------|-------|----------------|
| `github.com/jackc/pgx/v5` | v5 | DB-Queries für Migration + Repository | Projekt-Standard |
| Go `database/sql`-artige Pool-Abfragen via pgxpool | — | Auto-Archivierung (INSERT nach DELETE) | Bestehende Infra |
| `permissions` (internes Paket) | — | Cache-Reload nach Catalog-Änderung | Bestehende Infra |

### Frontend (bereits vorhanden — keine neuen Bibliotheken)

| Bibliothek | Version | Zweck |
|-----------|---------|-------|
| React `useMemo` | 18 | Deterministische Kategorie-Reihenfolge (D-17) |
| `@/components/ui` Primitives | — | Pflicht für alle neuen UI-Elemente |

**Keine neuen npm-Pakete installiert in dieser Phase.**

## Package Legitimacy Audit

Nicht anwendbar — Phase 95 installiert keine externen Pakete.

---

## Architekturmuster

### System-Datenfluss

```
Admin-UI (Browser)
     │
     ▼
GET /api/v1/admin/fansub-group-roles   ← NEUER Endpunkt (D-12)
     │ liefert role_definitions WHERE 'fansub_group' = ANY(contexts)
     ▼
Frontend: FANSUB_GROUP_ROLE_OPTIONS dynamisch (statt hartkodiert)
     │
     │  Rolle-Entzug (PUT /admin/fansubs/:id/app-members/:userId/role)
     ▼
Backend Handler → FansubGroupAppMemberRepository.SetMemberRole(Enable=false)
     │
     ├─ DELETE fansub_group_member_roles WHERE member_id=$1 AND role=$2
     │   (created_at aus Zeile vorher lesen → started_year)
     └─ INSERT hist_group_member_roles (started_year, ended_year=NOW().Year, status='ended')
                ↑ D-10 Auto-Archivierung

Admin-UI → POST /admin/fansubs/:id/member-roles
     │
     ▼ (CreateHistGroupMemberRole)
     ├─ IsGroupHistoryWhitelistRole(req.RoleCode) ?   ← CR-01 Fix
     └─ INSERT hist_group_member_roles
```

### Empfohlene Projektstruktur (neue/geänderte Dateien)

```
database/migrations/
├── 0112_role_model_cleanup.up.sql          # D-04: hist. Einträge migrieren
│                                            # D-05: label_de aktualisieren
│                                            # D-07: techadmin + gfxler anlegen
│                                            # D-06: group_history-context für neue Rollen

backend/internal/permissions/
└── permissions.go                           # D-12: fansubGroupRoleCatalog aus DB laden
                                             #       neue Const RoleTechadmin, RoleGfxler
                                             #       LoadFansubGroupRoles(ctx, loader)

backend/internal/repository/
├── authz_permissions.go                     # D-12: LoadFansubGroupRoles() Methode
├── fansub_group_app_members_repository.go   # D-10: Auto-Archivierung in SetMemberRole
└── hist_group_member_roles_repository.go    # D-06: Whitelist aktualisieren
                                             # D-13: IsGroupHistoryWhitelistRole() Methode

backend/internal/handlers/
├── fansub_hist_group_member_roles_handler.go  # D-13: RoleCodeExistsForContext → IsGroupHistoryWhitelistRole
│                                               # D-14: ListHistGroupMemberRoles Cross-Group-Fix
├── admin_capability_handler.go                # D-15: Interface-Felder statt *AuthzRepository
└── admin_group_roles_handler.go               # D-12: neuer Handler GET /admin/fansub-group-roles

backend/internal/handlers/
└── admin_capability_handler_test.go           # D-15: Prod-Handler testen statt Stub

frontend/src/types/
└── fansub.ts                                  # D-12: FansubGroupRoleCode Typ + API-Typ
                                               # D-05: label 'Gruppenleitung'

frontend/src/lib/
└── api.ts                                     # D-12: listFansubGroupRoles() Helper

frontend/src/app/admin/fansubs/[id]/edit/
└── FansubAppMemberAddModal.tsx                # D-12: API statt FANSUB_GROUP_ROLE_OPTIONS

frontend/src/components/contributions/
├── ProposalForm.tsx                           # D-16: Split auf ≤450 Z.
├── ProposalForm.steps.tsx                     # D-16: extrahierte Step-Panels
└── contributionRoles.ts                       # D-04: project_manager entfernen

frontend/src/app/admin/role-capabilities/
└── RoleCapabilityDetail.tsx                   # D-17: useMemo + CATEGORY_ORDER

frontend/src/app/dev/ui-system/
├── page.tsx                                   # D-16: importiert Showcase-Module
└── showcase/
    ├── AccordionShowcase.tsx                  # D-16: extrahiert
    └── SwitchShowcase.tsx                     # D-16: extrahiert
```

### Muster 1: fansubGroupRoleCatalog data-driven (D-12)

**Was:** `fansubGroupRoleCatalog` (Go-Slice in `permissions.go`) wird statt hartkodierter Slice aus `role_definitions` geladen.

**Kritische Einschränkung:** Die aktuelle `LoadCache`-Architektur lädt nur `role_capabilities`. Für den `fansubGroupRoleCatalog` braucht es einen separaten Ladeaufruf. Empfehlung: Eigene `CatalogLoader`-Interface-Methode `LoadFansubGroupRoles(ctx) ([]string, error)` in `authz_permissions.go`, die `role_definitions WHERE 'group_history' = ANY(contexts) AND is_assignable = true` abfragt — ODER, einfacher: feste Spalte `assignable BOOL DEFAULT false` in `role_definitions` und Query darauf.

**Assignable-Markierung:** Die einfachste tragfähige Variante ist eine neue Spalte `assignable BOOLEAN NOT NULL DEFAULT false` in `role_definitions`. Damit ist die Markierung explizit und ohne Kontextlogik abfragbar. Gruppen-Rollen bekommen `assignable=true`, historische Rollen und Projekt-/Anime-Rollen bleiben `false`.

```go
// permissions.go — neues Interface
type CatalogLoader interface {
    LoadFansubGroupRoles(ctx context.Context) ([]string, error)
}

// permissions.go — Startup-Aufruf (nach LoadCache)
func (s *Service) LoadFansubGroupCatalog(ctx context.Context, loader CatalogLoader) error {
    roles, err := loader.LoadFansubGroupRoles(ctx)
    if err != nil {
        return fmt.Errorf("fansub group catalog load: %w", err)
    }
    catalogMu.Lock()
    fansubGroupRoleCatalog = roles
    catalogMu.Unlock()
    return nil
}
```

[ASSUMED: Exakte Mutex-Architektur; Planner soll finale Form wählen]

### Muster 2: Auto-Archivierung (D-10)

**Was:** In `SetMemberRole` (fansub_group_app_members_repository.go) — direkt nach dem `DELETE FROM fansub_group_member_roles` wird ein `INSERT INTO hist_group_member_roles` eingefügt. `started_year` wird aus dem `created_at`-Feld der gelöschten Zeile abgeleitet.

**Sequenz:**
```
1. SELECT id, role, created_at FROM fansub_group_member_roles
   WHERE fansub_group_member_id=$1 AND role=$2
   → row mit created_at (für started_year)

2. DELETE FROM fansub_group_member_roles WHERE id=$row.id

3. Hole hist_fansub_group_member_id für (fansub_group_member_id):
   SELECT hist_fansub_group_member_id über fansub_group_member → hist_fansub_group_members Join

4. INSERT INTO hist_group_member_roles
   (hist_fansub_group_member_id, role_code, started_year, ended_year, status, visibility)
   VALUES ($histMemberID, $role, $year(created_at), $currentYear, 'ended', 'internal')
   ON CONFLICT DO NOTHING   ← Idempotenz (Doppel-Entzug)
```

**Problem: hist_fansub_group_member_id-Lookup.** Die Verbindung von einem App-Member (`fansub_group_members`) zu einem hist-Member (`hist_fansub_group_members`) ist nicht immer 1:1. Deshalb: Insert ONLY wenn ein `hist_fansub_group_member_id`-Lookup für diesen App-User existiert. Andernfalls wird kein hist-Eintrag erzeugt (fail-open für unverknüpfte App-User). [ASSUMED: Linkage-Logik; muss im Plan verifiziert werden ob member_id-Spalte in hist_fansub_group_members vorhanden]

**Idempotenz:** `ON CONFLICT (hist_fansub_group_member_id, role_code, started_year, ended_year) DO NOTHING` oder Prüfung ob Eintrag bereits existiert.

### Muster 3: CR-01-Fix — Write-Pfad Whitelist (D-13)

**Was:** `CreateHistGroupMemberRole` validiert heute gegen `RoleCodeExistsForContext(ctx, code, "group_history")` — das umfasst nach Migration 0103 auch App-Rollen. Fix: Zusätzlich gegen aktualisierte `groupHistoryDialogRoleWhitelist` validieren.

```go
// repository/hist_group_member_roles_repository.go
func (r *HistGroupMemberRolesRepository) IsGroupHistoryWhitelistRole(code string) bool {
    for _, c := range groupHistoryDialogRoleWhitelist {
        if c == code { return true }
    }
    return false
}

// handler/fansub_hist_group_member_roles_handler.go:237
// VORHER: RoleCodeExistsForContext(ctx, req.RoleCode, "group_history")
// NACHHER:
if !h.rolesRepo.IsGroupHistoryWhitelistRole(req.RoleCode) {
    c.JSON(http.StatusUnprocessableEntity, ...)
    return
}
// Redundante DB-Abfrage (RoleCodeExistsForContext) entfällt vollständig
```

[VERIFIED: aus 94-REVIEW.md CR-01]

### Muster 4: WR-02-Fix — Cross-Group-Scope in ListHistGroupMemberRoles (D-14)

```go
// handler/fansub_hist_group_member_roles_handler.go:134-152
// NACH Permission-Check, VOR ListByMember:
memberRow, err := h.histMembersRepo.GetByID(ctx, memberID)
if errors.Is(err, repository.ErrNotFound) {
    c.JSON(http.StatusNotFound, ...)
    return
}
if memberRow.FansubGroupID != fansubID {
    c.JSON(http.StatusUnprocessableEntity, ...)
    return
}
items, err := h.rolesRepo.ListByMember(ctx, memberID)
```

[VERIFIED: aus 94-REVIEW.md WR-02]

### Muster 5: WR-01-Fix — Interface-Injektion im AdminCapabilityHandler (D-15)

Der `AdminCapabilityHandler` hält heute `*repository.AuthzRepository` (konkreter Typ). Tests müssen einen doppelten Stub-Handler (`adminCapabilityHandlerWithStubs`) führen.

Fix-Ansatz: Interfaces, die der Handler bereits deklariert (`capabilityAuthzRepo`, `capabilityMutationRepo`) als Felder statt `*AuthzRepository` verwenden. Da `AuthzRepository` diese Interfaces bereits erfüllt (verifiziert durch vorhandene Stub-Implementierungen), ist das eine sichere Refaktorierung.

```go
// admin_capability_handler.go
type AdminCapabilityHandler struct {
    authzRepo     capabilityAuthzRepo     // statt *repository.AuthzRepository
    mutationRepo  capabilityMutationRepo  // statt *repository.AuthzRepository
    permissionSvc capabilityPermissionSvc // Interface statt *permissions.Service
    auditLogRepo  capabilityAuditRepo     // Interface statt *repository.AuditLogRepository
}
```

Der Stub-Handler in der Test-Datei (Zeilen 506–626) kann dann gelöscht werden; Tests konstruieren `NewAdminCapabilityHandler` direkt mit Stubs. [VERIFIED: Stub-Code in admin_capability_handler_test.go:506-626 bestätigt]

### Anti-Patterns vermeiden

- **Kein Hard-Remove der alten Go-Konstanten in Sprint 1:** `RoleFansubLead`, `RoleProjectLead` in `permissions.go` bleiben — sie sind bereits die kanonischen Codes. Nur die statische `fansubGroupRoleCatalog`-Slice wird dynamisiert.
- **Kein zweistufiges hist-Member-Lookup als Pflicht:** Auto-Archivierung (D-10) greift ONLY wenn ein hist_fansub_group_member für den App-Member existiert; ansonsten kein Fehler.
- **Keine race condition im Cache:** `sync.RWMutex` auf `fansubGroupRoleCatalog` analog zu `loadedCache`.

---

## Nicht selbst bauen

| Problem | Nicht bauen | Stattdessen | Warum |
|---------|-------------|-------------|-------|
| Assignable-Prüfung | Eigene Role-Taxonomie-Logik | `permissions.IsKnownFansubGroupRole` (erweitert nach D-12 dynamisiert) | Bereits zentral und getestet |
| Capability-Cache-Invalidierung | Eigener Mechanismus | `permissions.ReloadCache` | Bereits atomar mit D-10-Check |
| Frontend-Rollendropdown | Hardcodierte Konstante | GET /api/v1/admin/fansub-group-roles | Ziel D-12 |
| Datei-Split-Logik ProposalForm | Neue State-Architektur | Einfacher Component-Extract | Keine Logikänderung nötig |
| Histor. Eintrag nach Revoke | DB-Trigger | Go-Repository-Layer | Flexibler, testbarer, kontrollierter |

---

## Migration D-04: Detailanalyse (Forschungsschwerpunkt 1)

### Ist-Zustand der alten Codes (VERIFIED durch Codebase-Grep)

| Code | `fansub_group_member_roles` (aktiv) | `hist_group_member_roles` (historisch) | `role_definitions` | Whitelist |
|------|------------------------------------|-----------------------------------------|--------------------|-----------|
| `leader` | **NICHT vorhanden** — nie eingetragen (Migration 0073 startete mit `fansub_lead`) | Einträge möglich (0085-Seed) | Vorhanden (0085) | Ja (Zeile 247) |
| `project_manager` | **NICHT vorhanden** — nie eingetragen (0074 verwendet `project_lead`) | Einträge möglich (0085-Seed) | Vorhanden (0085) | Ja (Zeile 249) |
| `fansub_lead` | **VORHANDEN** — kanonischer Code | Einträge möglich (0100) | Vorhanden (0100) | Nein (noch nicht) |
| `co_leader` | NICHT vorhanden | Einträge möglich | Vorhanden (0085) | Ja |
| `founder` | NICHT vorhanden | Einträge möglich | Vorhanden (0085) | Ja |

**Schlussfolgerung (HIGH confidence):** Migration D-04 betrifft ausschließlich `hist_group_member_roles`-Zeilen. Für aktive App-Mitgliedschaftsrollen ist kein Daten-UPDATE nötig.

### Was die Migration 0112 enthalten muss

```sql
-- 1. label_de aktualisieren (D-05)
UPDATE role_definitions SET label_de = 'Gruppenleitung'       WHERE code = 'fansub_lead';
UPDATE role_definitions SET label_de = 'Fansub-Projektleitung' WHERE code = 'project_lead';

-- 2. Hist. Einträge migrieren (D-04)
UPDATE hist_group_member_roles SET role_code = 'fansub_lead'   WHERE role_code = 'leader';
UPDATE hist_group_member_roles SET role_code = 'project_lead'  WHERE role_code = 'project_manager';

-- 3. Alte Codes aus role_definitions entfernen (nur nach Schritt 2 möglich, wegen FK)
DELETE FROM role_definitions WHERE code IN ('leader', 'project_manager');

-- 4. Neue Rollen anlegen (D-07)
INSERT INTO role_definitions (code, label_de, contexts, sort_order, assignable) VALUES
    ('techadmin', 'Techadmin',     ARRAY['fansub_group'], 5,  true),
    ('gfxler',    'GFX / Grafik',  ARRAY['fansub_group'], 6,  true)
ON CONFLICT (code) DO NOTHING;

-- 5. fansub_lead, co_leader, founder, project_lead: assignable=true setzen
UPDATE role_definitions SET assignable = true
WHERE code IN ('fansub_lead', 'co_leader', 'founder', 'project_lead', 'techadmin', 'gfxler');

-- 6. fansub_group-Context für Gruppen-Rollen eintragen
UPDATE role_definitions
SET contexts = array_append(contexts, 'fansub_group')
WHERE code IN ('fansub_lead', 'co_leader', 'founder', 'project_lead')
  AND NOT 'fansub_group' = ANY(contexts);
```

**WICHTIG: assignable-Spalte.** Dafür muss zuerst die Spalte hinzugefügt werden:

```sql
ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS assignable BOOLEAN NOT NULL DEFAULT false;
```

**FK-Kette zu beachten:** `hist_group_member_roles.role_code` hat FK auf `role_definitions(code)` mit `ON DELETE RESTRICT`. Deshalb ZUERST hist-Einträge migrieren, DANN alte `role_definitions`-Zeilen löschen.

**`role_capabilities`-Einträge für `leader`/`project_manager`:** In Migration 0108 existieren keine `role_capabilities`-Einträge für `leader` oder `project_manager` (nur für `fansub_lead`, `project_lead`, `designer` etc.). Deshalb kein zusätzliches Cleanup nötig. [VERIFIED: 0108_capability_registry.up.sql gelesen]

### Backend-Fundstellen mit alten Codes (Hard-Blocker für Migration)

| Datei | Zeile | Code | Art | Aktion |
|-------|-------|------|-----|--------|
| `repository/admin_users_queries.go` | 68 | `role IN ('leader')` | SQL-Heuristik (leader_count) | Auf `fansub_lead` ändern |
| `repository/admin_users_queries.go` | 247 | `role = 'leader'` | SQL-Heuristik | Auf `fansub_lead` ändern |
| `repository/admin_users_tab_repository.go` | 118 | `role IN ('leader', ...)` | SQL (can_edit_content) | `fansub_lead` statt `leader` |
| `repository/anime_contributions_public_repository.go` | 243 | `role_code IN ('leader', 'founder')` | SQL | `fansub_lead` statt `leader` |
| `services/badge_service.go` | 93 | `role_code IN ('leader', 'founder')` | SQL | `fansub_lead` statt `leader` |
| `repository/hist_group_member_roles_repository.go` | 247 | `"leader"` in Whitelist | Go-Slice | → `"fansub_lead"` |
| `repository/hist_group_member_roles_repository.go` | 249 | `"project_manager"` in Whitelist | Go-Slice | → `"project_lead"` |
| `repository/role_definitions_context_test.go` | 30, 32, 115, 116 | `"leader"`, `"project_manager"` | Test-Fixtures | Aktualisieren |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx` | 15, 17, 68, 70 | `'leader'`, `'project_manager'` | Test-Fixtures | Aktualisieren |
| `frontend/src/components/contributions/contributionRoles.ts` | 12 | `'project_manager'` | Hardkodierte Liste | Entfernen (D-12) |

---

## Data-driven-Umbau D-12: Detailanalyse (Forschungsschwerpunkt 2)

### Touch-Points-Inventar (VERIFIED durch Codebase-Grep)

**Touch-Point 1: `fansubGroupRoleCatalog` in permissions.go (Z. 200-211)**
- Heute: Go-Slice mit 10 hardkodierten Codes
- Ziel: Aus `role_definitions WHERE assignable = true` laden
- Neues Interface `CatalogLoader.LoadFansubGroupRoles(ctx)` in `authz_permissions.go`
- Separate Mutex `catalogMu sync.RWMutex` für den Catalog-Slice
- `LoadFansubGroupCatalog` parallel zu `LoadCache` beim Start aufrufen

**Touch-Point 2: `FANSUB_GROUP_ROLE_OPTIONS` in frontend/src/types/fansub.ts (Z. 413-424)**
- Heute: 10 hardkodierte Einträge inkl. `project_lead` und `fansub_lead` ohne `techadmin`/`gfxler`
- Ziel: Aus API `GET /api/v1/admin/fansub-group-roles` laden (oder in Fansub-kontext-spezifischen Hook)
- Neuer API-Endpunkt: `GET /api/v1/admin/fansub-group-roles` → `{ data: RoleDefinitionOption[] }`
- Bestehender Handler-Typ: `ListGroupHistoryRoleDefinitions` als Vorbild (gleicher Response-Typ)
- API-Helper in `api.ts`: `listFansubGroupRoles()` analog zu `listGroupHistoryRoleDefinitions()`

**Touch-Point 3: `contributionRoles.ts` in `frontend/src/app/admin/fansubs/[id]/edit/`**
- Heute: 8 Codes (translator, timer, ..., designer) — KEINE Gruppenrollen
- Bezieht sich auf Projekt-/Anime-Ebene (Contributions)
- `project_manager` ist NICHT enthalten → kein Änderungsbedarf für die Contribution-Liste
- Ziel: weiterhin statisch ODER per API; D-04 entfernt `project_manager` aus `contributionRoles.ts` in `frontend/src/components/contributions/contributionRoles.ts` (Z. 12)

**Touch-Point 4: `contributionRoles.ts` in `frontend/src/components/contributions/`**
- Heute: 12 Codes inkl. `project_lead`, `project_manager`, `admin`, `other`
- `project_manager` (Z. 12) muss nach D-04 entfernt werden
- `project_lead` und `admin`/`other` bleiben für historische Contributions erhalten [ASSUMED: Scope unklar — prüfen ob ProposalForm nur Animes betrifft]

**Neuer API-Endpunkt:**
- Route: `GET /api/v1/admin/fansubs/:id/group-roles` (Gruppen-spezifisch, mit Permission-Check) ODER `GET /api/v1/admin/role-definitions?context=fansub_group` (generisch)
- Empfehlung: Kontext-spezifischer Endpunkt, der `assignable=true AND 'fansub_group' = ANY(contexts)` filtert

**Cache/ReloadCache-Implikationen:**
- Wenn `fansubGroupRoleCatalog` dynamisch geladen wird, muss nach jeder `role_definitions`-Änderung der Catalog neu geladen werden
- In dieser Phase gibt es keine Admin-UI für `role_definitions`-Mutationen → kein ReloadCatalog im Hot-Path nötig
- Beim Backend-Start: `LoadFansubGroupCatalog` nach `LoadCache` aufrufen

---

## Auto-Archivierung D-10: Detailanalyse (Forschungsschwerpunkt 3)

### Revoke-Pfad (VERIFIED)

Der aktive Rollen-Entzug sitzt in `fansub_group_app_members_repository.go`:

```go
// SetMemberRole(Enable=false) führt aus:
// 1. ensureMemberMutationAllowed (Guard-Check)
// 2. DELETE FROM fansub_group_member_roles WHERE fansub_group_member_id=$1 AND role=$2
// 3. UPDATE fansub_group_members SET updated_at=NOW()
```

Der DELETE (Z. 408-413) ist der Trigger-Punkt. Vor dem DELETE muss `created_at` der Rolle gelesen werden.

### Herausforderung: hist_fansub_group_member_id-Lookup

`fansub_group_members` (App-Mitglieder) und `hist_fansub_group_members` (historische Mitglieder) sind separate Tabellen. Die Verbindung erfolgt über `hist_fansub_group_members.app_user_id` oder über Member-Claims. 

[ASSUMED: `hist_fansub_group_members` hat eine Spalte `app_user_id` oder einen ähnlichen Link — muss beim Planen verifiziert werden]

**Empfehlung (Fail-safe-Ansatz):**
```go
// Vor DELETE: Lese created_at
var roleCreatedAt time.Time
var roleID int64
err := r.db.QueryRow(ctx,
    `SELECT id, created_at FROM fansub_group_member_roles
     WHERE fansub_group_member_id = $1 AND role = $2`,
    memberID, role).Scan(&roleID, &roleCreatedAt)
// ... DELETE ...
// Nach DELETE: Suche hist_member (fail-open wenn nicht gefunden)
var histMemberID int64
err = r.db.QueryRow(ctx,
    `SELECT hfgm.id FROM hist_fansub_group_members hfgm
     JOIN fansub_group_members fgm ON fgm.app_user_id = hfgm.app_user_id
     WHERE fgm.id = $1 AND hfgm.fansub_group_id = $2
     LIMIT 1`,
    memberID, fansubGroupID).Scan(&histMemberID)
if err == nil && histMemberID > 0 {
    // INSERT hist_group_member_roles mit ON CONFLICT DO NOTHING
    startedYear := roleCreatedAt.Year()
    endedYear := time.Now().Year()
    r.db.Exec(ctx, `INSERT INTO hist_group_member_roles 
        (hist_fansub_group_member_id, role_code, started_year, ended_year, status, visibility)
        VALUES ($1, $2, $3, $4, 'ended', 'internal')
        ON CONFLICT DO NOTHING`,
        histMemberID, role, startedYear, endedYear)
}
```

**DB-Trigger vs. Go-Handler:** Bewusst Go-Repository-Layer statt DB-Trigger, weil:
1. Testen einfacher (Unit-Tests mit Mocks)
2. Fehlerbehandlung kontrollierbar (fail-open)
3. Konsistent mit bestehenden Patterns (kein einziger DB-Trigger im Projekt)

---

## Review-Schulden: Fundstellen bestätigt (Forschungsschwerpunkt 4)

### CR-01 (D-13) — VERIFIED
- **Handler:** `fansub_hist_group_member_roles_handler.go:237` — `RoleCodeExistsForContext(ctx, req.RoleCode, "group_history")`
- **Repository:** `hist_group_member_roles_repository.go:282` — SQL-Query ohne Whitelist-Filter
- **Fix:** Neue Methode `IsGroupHistoryWhitelistRole(code string) bool` in Repository; ersetzt DB-Abfrage im Handler

### WR-02 (D-14) — VERIFIED
- **Handler:** `fansub_hist_group_member_roles_handler.go:134-152` — `ListHistGroupMemberRoles`
- `memberID` aus `c.Query("member_id")` → direkt an `h.rolesRepo.ListByMember(ctx, memberID)` ohne Cross-Group-Prüfung
- **Fix:** Analog zu `CreateHistGroupMemberRole` (Z. 213-235): `histMembersRepo.GetByID` + `memberRow.FansubGroupID != fansubID` Check

### WR-01 (D-15) — VERIFIED
- **Test-Datei:** `admin_capability_handler_test.go:506-626` — `adminCapabilityHandlerWithStubs` struct mit duplizierten Handler-Methoden
- `RevokeCapability`-Stub (Z. 620-625) schreibt keinen Audit-Eintrag (Divergenz vom Produktions-Code Z. 190-197)
- **Fix:** `AdminCapabilityHandler` braucht Interface-Felder; Stub-Struct kann nach Refaktorierung gelöscht werden

### WR-03/04 (D-16) — VERIFIED
- `ProposalForm.tsx`: **541 Zeilen** (bestätigt via `wc -l`)
- `ui-system/page.tsx`: **1251 Zeilen** (bestätigt via `wc -l`)
- **Split-Empfehlung ProposalForm:** Extrahiere die drei Step-Panels (`Step1GroupProject`, `Step2Role`, `Step3NoteRange`) in `ProposalForm.steps.tsx`; ggf. `ChoiceSelect` in eigene Datei. Ziel: Haupt-Datei ≤430 Z. (Puffer).
- **Split-Empfehlung ui-system:** Extrahiere `AccordionShowcase.tsx` und `SwitchShowcase.tsx` (aus Phase 94 hinzugefügt) in `frontend/src/app/dev/ui-system/showcase/`. Ziel: page.tsx ≤400 Z.

### WR-05 (D-17) — VERIFIED
- **Datei:** `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx:41-46`
- `byCategory`-Map wird bei jedem Render neu aufgebaut; Reihenfolge der Kategorien folgt Array-Reihenfolge der API-Antwort (nicht-deterministisch)
- **Fix:** `useMemo` + explizite Kategorie-Reihenfolge via `CATEGORY_ORDER = ['gruppe', 'projekt', 'release']`:

```typescript
// RoleCapabilityDetail.tsx
const CATEGORY_ORDER = ['gruppe', 'projekt', 'release']

const accordionItems = useMemo(() => {
  const byCategory = new Map<string, typeof role.actions>()
  for (const action of role.actions) {
    const existing = byCategory.get(action.category) ?? []
    existing.push(action)
    byCategory.set(action.category, existing)
  }
  // Deterministische Reihenfolge
  const sortedCats = [...byCategory.keys()].sort(
    (a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a)
      const bi = CATEGORY_ORDER.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    }
  )
  return sortedCats.map(cat => ({ id: cat, title: categoryDisplayLabel(cat), children: ... }))
}, [role])
```

---

## Capability-Registry-Verhältnis zu D-12 (Forschungsschwerpunkt 5)

**Bewertung:** `.planning/notes/capability-registry-design.md` beschreibt das Ziel, auch SQL-Bypass-Stellen (in `admin_users_queries.go`, `admin_users_tab_repository.go`, `badge_service.go`) auf die Registry umzustellen. **Diese Phase macht das NICHT** — die D-04-Fixes in diesen Dateien ersetzen nur `'leader'` durch `'fansub_lead'` (Literal-String-Update), ohne die Query-Architektur zu ändern. Die volle Registry-Phase bleibt ein separates Vorhaben.

Phase 95 und Capability-Registry-Design sind **komplementär, nicht kollidierend:**
- Phase 95: Catalog data-driven (`role_definitions` → `fansubGroupRoleCatalog` via Go-Cache), Labels und neue Rollen
- Registry-Phase (später): SQL-Bypass-Stellen auf `role_capabilities`-JOIN umstellen

---

## Häufige Fallstricke

### Fallstrick 1: FK-Verletzung beim role_definitions-Delete
**Was schiefgeht:** `DELETE FROM role_definitions WHERE code='leader'` scheitert mit FK-Violation wenn `hist_group_member_roles` noch Zeilen mit `role_code='leader'` enthält.
**Warum:** FK `fk_hist_group_member_roles_role_code` mit `ON DELETE RESTRICT` (Migration 0085).
**Vermeidung:** UPDATE `hist_group_member_roles` zwingend VOR DELETE aus `role_definitions` in der Migration.

### Fallstrick 2: leader_count-Heuristik in admin_users_queries.go
**Was schiefgeht:** Nach Migration bleibt `COUNT(*) FILTER (WHERE fgmr.role IN ('leader'))` im Code → zählt immer 0.
**Warum:** Fünf Backend-Fundstellen mit hartkodiertem `'leader'`-String werden nicht automatisch durch DB-Migration aktualisiert.
**Vermeidung:** Alle Fundstellen (Liste oben) synchron mit der DB-Migration updaten.

### Fallstrick 3: Auto-Archivierung bei Mitglied-Disable vs. Rollen-Entzug
**Was schiefgeht:** Wenn `UpdateStatus(disabled)` aufgerufen wird, werden keine Rollen einzeln entzogen → D-10-Trigger läuft nicht.
**Warum:** Status-Update und Rollen-Entzug sind separate Code-Pfade.
**Vermeidung:** D-10 bezieht sich explizit auf Rollen-Entzug (SetMemberRole), nicht auf Mitglied-Disable. Das ist die beschlossene Scope-Abgrenzung (D-10 aus CONTEXT.md). Kein Handlungsbedarf für Disable-Pfad in dieser Phase.

### Fallstrick 4: `fansub_group_member_roles` CHECK vs. FK — neue Rollen
**Was schiefgeht:** `techadmin` oder `gfxler` kann nicht als aktive Gruppenrolle gesetzt werden, wenn `role_definitions` noch keinen Eintrag hat (FK-Verletzung).
**Warum:** Migration 0106 hat CHECK-Constraint durch FK ersetzt — alle Rollen müssen in `role_definitions` existieren.
**Vermeidung:** Migration 0112 muss `techadmin` und `gfxler` in `role_definitions` eintragen BEVOR Backend-Code sie verwendet.

### Fallstrick 5: fansubGroupRoleCatalog-Startup-Reihenfolge
**Was schiefgeht:** `LoadFansubGroupCatalog` läuft vor `LoadCache` → Cache ist leer, Konsistenz-Check schlägt fehl oder `IsKnownFansubGroupRole` gibt falsche Ergebnisse.
**Vermeidung:** `LoadCache` zuerst, dann `LoadFansubGroupCatalog` beim Server-Startup.

### Fallstrick 6: GroupHistRoleDialog zeigt nach Whitelist-Update keine Daten
**Was schiefgeht:** Whitelist enthält nach Update `fansub_lead` statt `leader`; aber Frontend erwartet bestimmte Codes.
**Warum:** Tests in `GroupHistRoleDialog.test.tsx` prüfen auf `'leader'` und `'project_manager'` (Z. 15, 17, 68, 70).
**Vermeidung:** Test-Fixtures synchron mit Whitelist-Update anpassen.

---

## Code-Beispiele (verifiziert aus Codebase)

### group_history-Kontext-Test (bestehend, zu aktualisieren)
```go
// repository/role_definitions_context_test.go:29-32
// Aktuell:
var groupHistoryWhitelist = []string{"founder", "leader", "co_leader", "project_manager"}
// Nach Phase 95:
var groupHistoryWhitelist = []string{"founder", "fansub_lead", "co_leader", "project_lead", "techadmin", "gfxler"}
```
[VERIFIED: role_definitions_context_test.go:29-32 gelesen]

### LoadRoleCapabilities (bestehend — Muster für LoadFansubGroupRoles)
```go
// repository/authz_permissions.go:200-223
// Analog für LoadFansubGroupRoles:
func (r *AuthzRepository) LoadFansubGroupRoles(ctx context.Context) ([]string, error) {
    rows, err := r.db.Query(ctx, `
        SELECT code FROM role_definitions
        WHERE assignable = true
        ORDER BY sort_order, code
    `)
    // ... scan ...
}
```
[VERIFIED: authz_permissions.go gelesen]

---

## Runtime-State-Inventar

> Phase 95 ist eine Refaktorierungs-/Migrations-Phase. Explizite Antworten zu allen Kategorien:

| Kategorie | Gefundene Elemente | Erforderliche Aktion |
|-----------|-------------------|----------------------|
| Gespeicherte Daten | `hist_group_member_roles`-Zeilen mit `role_code IN ('leader', 'project_manager')` | **Datenmigration**: UPDATE in Migration 0112 (vor FK-Delete) |
| Live-Service-Config | Keine n8n-Workflows o.ä. mit Rollencodes bekannt | Keine Aktion |
| OS-registrierter Zustand | Keine OS-Registrierungen mit Rollencodes | Keine Aktion |
| Secrets/Env-Vars | Keine Env-Variablen mit Rollencodes | Keine Aktion |
| Build-Artefakte | Docker-Image muss nach Go-Änderungen neugebaut werden | `docker compose up -d --build team4sv30-backend` nach jedem Backend-Commit |

---

## Umgebungsverfügbarkeit

| Abhängigkeit | Benötigt von | Verfügbar | Version | Fallback |
|-------------|-------------|-----------|---------|----------|
| Go Backend Docker | Alle Backend-Änderungen | ✓ | Docker auf :8092 | — |
| PostgreSQL (Docker) | DB-Migrationen | ✓ | 16 | — |
| Next.js Dev-Server | Frontend-Tests | ✓ | :3000 (Hot-Reload) | — |
| Vitest | Frontend-Tests | ✓ | 3.x | — |

**Wichtig (aus MEMORY.md):** Backend-Änderungen erfordern explizit `docker compose up -d --build team4sv30-backend` — stale Backend zeigt API-404 trotz korrektem Code.

---

## Validierungs-Architektur

### Test-Framework

| Property | Wert |
|----------|------|
| Backend-Framework | `go test ./...` + `github.com/stretchr/testify` |
| Frontend-Framework | Vitest 3 (`npm run test` in `frontend/`) |
| Config-Datei | `frontend/vitest.config.ts` |
| Schnell-Kommando (Backend) | `cd backend && go test ./internal/handlers/... ./internal/repository/...` |
| Schnell-Kommando (Frontend) | `cd frontend && npm run test -- --reporter=verbose` |
| Vollständige Suite | `go test ./...` + `npm run test` |

### Anforderungs-Test-Karte

| Req-ID | Verhalten | Test-Typ | Automatisiertes Kommando | Datei vorhanden? |
|--------|-----------|----------|--------------------------|-----------------|
| D-04 | hist_group_member_roles enthält keine 'leader'/'project_manager'-Zeilen nach Migration | Migration-Roundtrip | `go test ./internal/repository/... -run TestRoleDefinitionsContext` | ✅ (role_definitions_context_test.go anpassen) |
| D-06 | Whitelist gibt nur kanonische Codes zurück | Unit | `go test ./internal/repository/... -run TestGroupHistoryWhitelist` | ❌ Wave 0 |
| D-07/08 | techadmin+gfxler in role_definitions, assignable=true, keine role_capabilities | Integration-Migration | Smoke gegen DB | ❌ Wave 0 |
| D-10 | SetMemberRole(false) erzeugt hist_group_member_roles-Eintrag | Unit (Repository) | `go test ./internal/repository/... -run TestAutoArchive` | ❌ Wave 0 |
| D-12 | GET /admin/fansub-group-roles liefert techadmin+gfxler | API-Roundtrip | `go test ./internal/handlers/... -run TestListFansubGroupRoles` | ❌ Wave 0 |
| D-13 (CR-01) | POST member-roles mit 'translator' → 422 | Unit (Handler) | `go test ./internal/handlers/... -run TestCreateHistGroupMemberRoleWhitelistReject` | ❌ Wave 0 |
| D-14 (WR-02) | GET member-roles mit fremder member_id → 422 | Unit (Handler) | `go test ./internal/handlers/... -run TestListHistGroupMemberRolesCrossGroupGuard` | ❌ Wave 0 |
| D-15 (WR-01) | Capability-Tests treffen Produktions-Handler | Unit (Handler) | `go test ./internal/handlers/... -run TestGrantCapability` | ✅ (umschreiben) |
| D-16 (WR-03/04) | ProposalForm.tsx ≤ 450 Z., ui-system/page.tsx ≤ 450 Z. | Statisch (wc -l) | `wc -l frontend/src/components/contributions/ProposalForm.tsx` | N/A |
| D-17 (WR-05) | Kategorie-Reihenfolge: gruppe → projekt → release | Unit (React) | `npm run test -- RoleCapabilityDetail` | ❌ Wave 0 |

### Abtastrate
- **Pro Task-Commit:** `go test ./internal/handlers/... ./internal/repository/...` + `npm run test -- --reporter=dot`
- **Pro Wave-Merge:** Vollständige Suite: `go test ./...` + `npm run test`
- **Phase-Gate:** Vollständige Suite grün vor `/gsd:verify-work`; manueller Smoke gegen Live-Backend `:8092` mit Bearer-Token

### Wave-0-Lücken (vor Implementierung zu erstellen)
- [ ] `backend/internal/repository/hist_group_member_roles_whitelist_test.go` — deckt D-06
- [ ] `backend/internal/repository/fansub_group_app_members_auto_archive_test.go` — deckt D-10
- [ ] `backend/internal/handlers/fansub_hist_group_member_roles_handler_test.go` — neue Tests für CR-01/WR-02 (Datei existiert, Tests ergänzen)
- [ ] `backend/internal/handlers/admin_fansub_group_roles_handler_test.go` — deckt D-12
- [ ] `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.test.tsx` — deckt D-17

---

## Sicherheitsdomäne

| ASVS-Kategorie | Trifft zu | Standard-Maßnahme |
|----------------|----------|-------------------|
| V4 Access Control | Ja | `CanForFansubGroup` + `requirePlatformAdminIdentity` bereits aktiv |
| V5 Input Validation | Ja | CR-01-Fix: Whitelist-Härtung im Write-Pfad (D-13) |
| V4 Cross-Scope | Ja | WR-02-Fix: Cross-Group-Guard in ListHistGroupMemberRoles (D-14) |

### Bekannte Bedrohungsmuster

| Muster | STRIDE | Standard-Gegenmaßnahme |
|--------|--------|------------------------|
| Write-Bypass mit erlaubtem App-Rollen-Code (`'translator'` als hist-Rolle) | Tampering | CR-01: `IsGroupHistoryWhitelistRole`-Check vor `Create` |
| Cross-Group-Enum: Lesen hist-Rollen einer anderen Gruppe per member_id | Information Disclosure | WR-02: fansubID-Membership-Check vor `ListByMember` |
| Neue Rolle ohne Capability bekommt irrtümlich Rechte | Elevation of Privilege | `fansubGroupRoleCatalog` und `IsKnownFansubGroupRole` sind Gate; `techadmin`/`gfxler` starten leer |

---

## Annahmen-Log

| # | Annahme | Abschnitt | Risiko bei falsch |
|---|---------|-----------|-------------------|
| A1 | `hist_fansub_group_members` hat `app_user_id`-Spalte für Link zu App-Usern | D-10 Auto-Archivierung | Auto-Archivierung braucht alternativen Lookup-Pfad |
| A2 | `fansub_group` als neuer Context-String in `role_definitions` ist der richtige Bezeichner | Migration 0112 | Context-Name muss konsistent mit Frontend-Query sein |
| A3 | `project_manager` in `components/contributions/contributionRoles.ts:12` ist im Rahmen von D-04 zu entfernen (nicht nur D-12) | Migrations-Planung | contributionRoles.ts und Proposal-Formular zeigen ungültige Rolle |
| A4 | Kein einziger aktiver App-User hat `role='leader'` oder `role='project_manager'` in `fansub_group_member_roles` | D-04 Migrations-Impact | Würde eine UPDATE-Migration für aktive Rollen erfordern |

---

## Offene Fragen

1. **hist_fansub_group_members.app_user_id-Spalte (für D-10)**
   - Was bekannt: `hist_fansub_group_members` hat `fansub_group_id`, `member_id`, Datum-Felder
   - Unklar: Gibt es eine direkte `app_user_id`-Verknüpfung oder nur über Member-Claims?
   - Empfehlung: Beim Planern direkt in `hist_fansub_group_members`-Schema prüfen. Falls kein Link: Auto-Archivierung nur möglich wenn Member eine aktive hist-Mitgliedschaft hat.

2. **Scope `contributionRoles.ts` in `components/contributions/` (A3)**
   - Was bekannt: Enthält `project_manager` und `project_lead` — beides Gruppen-Rollen-Codes
   - Unklar: Ob ProposalForm nur für Anime-Contributions gedacht ist (dann sind Gruppen-Codes irrtümlich)
   - Empfehlung: `project_manager` entfernen (D-04); `project_lead` im Planer mit Nutzer klären

3. **API-Endpunkt-Scoping für D-12 (Fansub-spezifisch vs. global)**
   - Was bekannt: Bestehender Endpunkt `GET /admin/fansubs/:id/role-definitions` liefert `group_history`-Whitelist
   - Unklar: Soll der neue Endpunkt Fansub-ID-scoped sein (mit Permission-Check) oder als Platform-Admin-Endpunkt global?
   - Empfehlung: Platform-Admin-Endpunkt `GET /api/v1/admin/role-definitions?context=fansub_group` für Einfachheit; Fansub-Mitglieder-Formulare rufen ihn mit ihrem Kontext auf.

---

## Quellen

### Primär (HIGH Konfidenz)
- `backend/internal/permissions/permissions.go` — `fansubGroupRoleCatalog`, Cache-Architektur, Rolle-Konstanten (direkt gelesen)
- `backend/internal/repository/hist_group_member_roles_repository.go` — `groupHistoryDialogRoleWhitelist`, `RoleCodeExistsForContext`, Create/ListByMember (direkt gelesen)
- `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` — CR-01/WR-02-Fundstellen (direkt gelesen)
- `backend/internal/handlers/admin_capability_handler.go` + `_test.go` — WR-01-Fundstellen (direkt gelesen)
- `database/migrations/0085_role_definitions_seed.up.sql` — Baseline-Seed (direkt gelesen)
- `database/migrations/0103_fansub_roles_group_history_context.up.sql` — Context-Tagging (direkt gelesen)
- `database/migrations/0106_fansub_group_member_roles_fk.up.sql` — FK statt CHECK (direkt gelesen)
- `database/migrations/0108_capability_registry.up.sql` — Capability-Registry-Schema (direkt gelesen)
- `frontend/src/types/fansub.ts` — `FANSUB_GROUP_ROLE_OPTIONS`, `FansubGroupRoleCode` (direkt gelesen)
- `frontend/src/app/admin/fansubs/[id]/edit/contributionRoles.ts` — Touch-Point 3 (direkt gelesen)
- `frontend/src/components/contributions/contributionRoles.ts` — Touch-Point 4 mit `project_manager` (direkt gelesen)
- `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx` — WR-05-Fundstelle (direkt gelesen)
- `.planning/phases/94-*/94-REVIEW.md` — CR-01/WR-01-05-Details (direkt gelesen)
- `.planning/notes/capability-registry-design.md` — Registry-Designziele (direkt gelesen)

### Sekundär (MEDIUM Konfidenz)
- `backend/internal/repository/authz_permissions.go` — `LoadRoleCapabilities`-Muster für D-12 (direkt gelesen)
- `backend/internal/repository/fansub_group_app_members_repository.go:380-426` — Revoke-Pfad für D-10 (direkt gelesen)
- Codebase-Grep: `'leader'`/`'project_manager'`-Fundstellen in Backend-SQL (bestätigt via Bash)

---

## Metadaten

**Konfidenz-Aufschlüsselung:**
- Standard-Stack: HIGH — bestehende Infra vollständig gelesen
- Migrations-Strategie: HIGH — alle Migration-Dateien und FK-Ketten verifiziert
- Auto-Archivierung (D-10): MEDIUM — Revoke-Pfad bestätigt, hist-Member-Linkage [ASSUMED]
- Frontend-Umbau (D-12): HIGH — alle Touch-Points direkt gelesen
- Review-Schulden: HIGH — file:line-Fundstellen aus REVIEW.md bestätigt

**Forschungsdatum:** 2026-06-30
**Gültig bis:** 2026-07-30 (stabiles Schema, kurze Haltbarkeit nur wenn weitere Migrations-Nummern vergeben werden)
