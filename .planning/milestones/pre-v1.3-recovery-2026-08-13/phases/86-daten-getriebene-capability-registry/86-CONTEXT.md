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

**Entscheidung 2026-06-18 (verfeinert nach Research + Behavior-Preservation-Analyse):** Die heutigen SQL-„Rollen-Checks" im Admin-Tab (`leader_count` = `role = 'leader'`, `can_view_members` = `role IS NOT NULL`, `can_edit_content` = `role IN ('leader','editor','contributor')`) sind **Anzeige-Heuristiken im read-only Admin-Tab, KEINE Capability-Entscheidungen** — und sie bilden keine roleMatrix-Capability sauber ab (z.B. `'leader'` hat keine Capabilities; `release_version.notes.write` hätten 8 Rollen statt `{editor}`). Eine Umstellung wäre daher NICHT behavior-preserving. Gewählt: **Infrastruktur bauen, Anzeige-Felder unverändert lassen.**

- **D-07:** Die Registry stellt die **Fähigkeit** bereit, Capability-Entscheidungen in SQL per Join/EXISTS gegen `role_capabilities` zu treffen (`EXISTS (SELECT 1 FROM role_capabilities rc WHERE rc.role_code = <role> AND rc.action_code = '<action>')`). Diese Fähigkeit wird per Test nachgewiesen (Join liefert die erwarteten Actions je Rolle), damit künftige ECHTE SQL-Capability-Checks sie nutzen.
- **D-08:** Die heutigen SQL-Rollen-Literale im Admin-Tab (`leader_count`, `can_view_members`, `can_edit_content`) bleiben **bewusst unverändert** (Anzeige-Heuristiken, keine Capability-Entscheidungen) — dokumentiert per Code-Kommentar am jeweiligen Ort mit Verweis auf die Registry für künftige echte Checks. `badge_service.go`, `anime_contributions_public_repository.go` sind per Research R-01 Katalog-Anzeigen (keine Capability-Checks); `authz.go` enthält nur Guards. → 100% behavior-preserving.
- **D-09:** Die Phase-80-Gruppenrechte-Query bleibt unverändert (siehe D-08); die Registry-Join-Fähigkeit (D-07) steht für eine spätere, bewusst geplante Korrektur dieser Anzeige-Semantik bereit (separater Scope).

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
