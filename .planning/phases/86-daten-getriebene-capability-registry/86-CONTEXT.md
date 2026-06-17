# Phase 86: Daten-getriebene Capability-Registry - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning
**Source:** Design-Diskussion während Phase-80-UAT (siehe `.planning/notes/capability-registry-design.md`)

<domain>

## Phase Boundary

Das Rechte-/Rollen-Management wird so umgebaut, dass **neue Rechte zentral als Daten** integrierbar sind, statt Rollen-Capability-Logik pro `.go`-/SQL-Stelle hartzukodieren. Eine Quelle der Wahrheit (`action_definitions` + `role_capabilities`), die **sowohl Go (In-Memory-Cache) als auch SQL (Join)** lesen. Brownfield: `permissions.go` + bestehende Rollen-/Audit-Strukturen bleiben erhalten und werden erweitert, nicht ersetzt.

**Nicht im Scope:** Neue fachliche Rechte erfinden; UI zum Pflegen der Registry (optionaler Folge-Schritt); Änderung des Rollen-Katalogs `role_definitions`.

</domain>

<decisions>

## Implementation Decisions

### Datenmodell
- **D-01:** Neue Tabelle `action_definitions(code TEXT PK, label_de TEXT NOT NULL, category TEXT, sort_order INT NOT NULL DEFAULT 0)` als Katalog aller Rechte/Aktionen.
- **D-02:** Neue Tabelle `role_capabilities(role_code TEXT REFERENCES role_definitions(code) ON DELETE CASCADE, action_code TEXT REFERENCES action_definitions(code) ON DELETE CASCADE, PRIMARY KEY(role_code, action_code))` als Matrix Rolle→Recht.
- **D-03:** Die erste Migration seedet `action_definitions` + `role_capabilities` **behavior-preserving exakt aus der heutigen Go-`roleMatrix`** (1:1). Kein Verhaltenswechsel durch die Einführung.

### Go-Integration
- **D-04:** `backend/internal/permissions/permissions.go` lädt die Matrix beim Start aus `role_capabilities` in einen In-Memory-Cache statt der hartkodierten `roleMatrix`-Map.
- **D-05:** Die öffentliche API (`RoleAllowsAction`, `AllowedActionsForRole`, `RoleAllows*`) und die `Action`-Konstanten bleiben **unverändert**; bestehende Aufrufer kompilieren ohne Änderung.
- **D-06:** Permission-Checks bleiben im Hot-Path performant: kein DB-Roundtrip pro Check; Cache beim Start, Invalidierung nur bei Änderung (selten).

### SQL-Integration & Entkopplung
- **D-07:** Capability-Entscheidungen in SQL nutzen einen Join/EXISTS gegen `role_capabilities` statt Rollen-Literale. Beispiel: `bool_or(EXISTS (SELECT 1 FROM role_capabilities rc WHERE rc.role_code = fgmr.role AND rc.action_code = '<action>'))`.
- **D-08:** Alle hartkodierten Rollen-Capability-Checks werden umgestellt (Fundstellen aus der Design-Notiz):
  - SQL `role IN (...)`: `admin_users_queries.go`, `admin_users_tab_repository.go` (GetUserGroupRights/can_edit_content), `anime_contributions_public_repository.go`, `badge_service.go`.
  - Go `role == "..."`: `admin_users_mutations_handler.go`, `app_auth.go`, `authz.go` (2 Stellen).
- **D-09:** Phase-80-Gruppenrechte-Query (`can_view_members`/`can_edit_content`) wird auf den Join umgestellt; Verhalten unverändert (bestehende Tests grün).

### Sicherheit / Konsistenz
- **D-10:** Startup-Konsistenz-Check + Test: Jede im Code verwendete `Action`-Konstante MUSS in `action_definitions` existieren (FK-Constraints + Test). Ersetzt die durch die Daten-Auslagerung verlorene Compile-Sicherheit.
- **D-11:** „Neues Recht hinzufügen" ist per Test/Doku nachgewiesen als **nur** Daten-Inserts (`action_definitions` + `role_capabilities`) — kein `.go`/SQL-Datei-Edit.

### Research-Flags
- **R-01:** Aktuelle, vollständige Liste ALLER hartkodierten Rollen-/Capability-Checks gegen den Code zum Planungszeitpunkt verifizieren (die Design-Notiz-Liste ist von 2026-06-17; nach Phase 80 ggf. neue Stellen).
- **R-02:** Exakte heutige `roleMatrix`-Einträge als Seed-Quelle auslesen; sicherstellen, dass `platform_admin` (globaler Bypass) korrekt außerhalb/innerhalb der Matrix behandelt wird.
- **R-03:** Cache-Invalidierungs-Mechanismus festlegen (Reload-Hook vs. Neustart) — passend zu wie selten sich die Matrix ändert.
- **R-04:** Mechanismus für den Startup-Konsistenz-Check (Go-Test der Code-Konstanten gegen DB/Seed vs. Laufzeit-Assertion beim Start).

### Claude's Discretion
- Konkrete Spaltennamen/Indexe der neuen Tabellen, solange D-01/D-02 erfüllt sind.
- Reihenfolge der Bypass-Umstellung (D-08), solange am Ende keine Rollen-Literale in Capability-Entscheidungen verbleiben.

</decisions>

<canonical_refs>

## Canonical References

Downstream agents müssen diese vor Planung/Implementierung lesen.

### Design & Begründung
- `.planning/notes/capability-registry-design.md` — vollständiges Zielbild, Trade-offs, Fundstellen, empfohlener Umfang.

### Bestehende Rechte-Architektur (erweitern, nicht ersetzen)
- `backend/internal/permissions/permissions.go` — `roleMatrix`, `Action`-Konstanten, Service-API.
- `backend/internal/repository/authz.go` und `authz_permissions.go` — Resolver, Rollen-Auflösung.
- DB-Tabelle `role_definitions` (code, label_de, contexts[], sort_order) — Rollen-Katalog.

### Umzustellende Bypass-Stellen
- `backend/internal/repository/admin_users_queries.go`, `admin_users_tab_repository.go`
- `backend/internal/repository/anime_contributions_public_repository.go`
- `backend/internal/services/badge_service.go`
- `backend/internal/handlers/admin_users_mutations_handler.go`, `app_auth.go`

### Projektregeln
- `CLAUDE.md`, `AGENTS.md` — Migrations append-only (`database/migrations/*.sql`), Contract-Disziplin, <=450 Zeilen.

</canonical_refs>

<specifics>

## Specific Ideas

- Migration-Paar: `0NNN_capability_registry.up.sql` legt Tabellen an + seedet aus roleMatrix; `.down.sql` droppt sie.
- `platform_admin` bleibt globaler Bypass (nicht zwingend Teil der Gruppenrollen-Matrix) — wie heute.
- Optionaler Folge-Schritt (NICHT in dieser Phase): Admin-UI zum Pflegen von `role_capabilities` ohne Deploy.

</specifics>

<deferred>

## Deferred Ideas

- Admin-UI zum Vergeben von Capabilities pro Rolle ohne Deploy.
- Scoped/kontextabhängige Capabilities über die heutige Rolle→Action-Granularität hinaus.

</deferred>

---

*Phase: 86-daten-getriebene-capability-registry*
*Context gathered: 2026-06-17 aus Design-Diskussion (Phase-80-UAT)*
