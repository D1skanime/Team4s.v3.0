---
phase: 86-daten-getriebene-capability-registry
verified: 2026-06-18T12:00:00Z
status: passed
score: 11/11 must-haves verified
overrides_applied: 0
gaps: []
deferred: []
---

# Phase 86: Daten-getriebene Capability-Registry — Verifikations-Report

**Phase-Ziel:** Rechte zentral als Daten (action_definitions + role_capabilities) statt pro .go/SQL-Stelle hartkodiert; Go (Cache) und SQL (Join) lesen dieselbe Quelle; behavior-preserving aus roleMatrix migriert.
**Verifiziert:** 2026-06-18
**Status:** PASSED
**Re-Verifikation:** Nein — initiale Verifikation

---

## Methode

Goal-backward: Startet vom Phasenziel, prüft was im Code TATSÄCHLICH existiert — nicht was SUMMARY.md behauptet.
Live-Evidenz (echte DB team4s_v2, Backend :8092) aus der Aufgabenstellung wurde als Bestätigung herangezogen,
aber alle Code-Checks wurden unabhängig gegen den Codebase durchgeführt.

---

## Goal Achievement

### Observable Truths

| #  | Wahrheit                                                                                          | Status     | Evidenz                                                                                                         |
|----|---------------------------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------------------------------------|
| 1  | D-01: action_definitions(code PK, label_de, category, sort_order) existiert nach Migration 0108  | VERIFIED   | `CREATE TABLE IF NOT EXISTS action_definitions` in 0108.up.sql Zeile 8                                          |
| 2  | D-02: role_capabilities(role_code FK, action_code FK, PK) mit ON DELETE CASCADE existiert        | VERIFIED   | `CREATE TABLE IF NOT EXISTS role_capabilities` Zeilen 18–22; FKs mit ON DELETE CASCADE vorhanden               |
| 3  | D-03: Seed enthält exakt 18 action_definitions + 62 role_capabilities behavior-preserving         | VERIFIED   | 18 VALUES-Zeilen in INSERT action_definitions; 62 VALUES-Zeilen für role_capabilities (per grep -c zählbar); fansub_group.invitations.accept in action_definitions, KEIN role_capabilities-Eintrag; platform_admin nur im Kommentar, kein INSERT-Eintrag |
| 4  | D-04: permissions.go enthält CacheLoader-Interface + LoadCache(ctx, CacheLoader) Methode         | VERIFIED   | Zeilen 230–232 (Interface), Zeilen 247–270 (LoadCache); cacheMu + loadedCache als paket-globale Variablen Zeilen 151–153 |
| 5  | D-05: RoleAllowsAction + AllowedActionsForRole Signaturen unverändert (API stabil)               | VERIFIED   | `func RoleAllowsAction(role string, action Action) bool` Zeile 291; `func AllowedActionsForRole(role string) []Action` Zeile 273; bestehende 11 permissions-Tests grün |
| 6  | D-06: roleAllows() liest loadedCache (RLock), Fallback auf roleMatrix wenn nil                   | VERIFIED   | Zeilen 487–494 in permissions.go: cacheMu.RLock(), cache := loadedCache, cache != nil-Check, Fallback auf roleMatrix |
| 7  | D-07: Registry per SQL-Join konsultierbar (TestCapabilityJoinQuery beweist Actions je Rolle)     | VERIFIED   | capability_join_test.go: TestCapabilityJoinQuery PASS; beweist fansub_lead enthält ActionFansubGroupMembersManage, enthält NICHT ActionFansubGroupInvitationsAccept |
| 8  | D-08/D-09: Anzeige-Felder leader_count/can_view_members/can_edit_content UNVERÄNDERT mit Kommentar | VERIFIED | admin_users_queries.go: `role IN ('leader')` und `role = 'leader'` unverändert + "Anzeige-Heuristik"-Kommentare an 2 Stellen; admin_users_tab_repository.go: `role IN ('leader', 'editor', 'contributor')` unverändert + "Anzeige-Heuristiken"-Kommentar |
| 9  | D-10: Startup-Konsistenz-Check: alle 18 Action-Konstanten in action_definitions/allKnownActions  | VERIFIED   | LoadCache-Implementierung Zeilen 255–265: seenActions-Map + standaloneActions-Whitelist für ActionFansubGroupInvitationsAccept; TestStartupConsistencyCheck PASS (verlangt NoError für vollst. Cache + Error für unvollständigen Cache) |
| 10 | D-11: „Neues Recht = nur Daten" nachgewiesen (keine Code-Änderung nötig)                        | VERIFIED   | TestCapabilityJoinQuery-Kommentar dokumentiert Verwendungsmuster; SQL in admin_users_queries.go zeigt Beispiel-Pattern für echte Capability-Checks; allKnownActions muss für neuen Action-Code erweitert werden (1 Zeile Go), dann nur INSERT in action_definitions + role_capabilities |
| 11 | main.go verdrahtet LoadCache nach NewService, vor Router-Init, mit log.Fatalf bei Fehler         | VERIFIED   | Zeile 127: `if err := permissionSvc.LoadCache(ctx, authzRepo); err != nil { log.Fatalf("Capability-Registry laden fehlgeschlagen: %v", err) }`; deutsch per CLAUDE.md |

**Score: 11/11 Wahrheiten verifiziert**

---

## Required Artifacts

| Artifact                                                           | Erwartet                             | Status    | Details                                                                    |
|--------------------------------------------------------------------|--------------------------------------|-----------|----------------------------------------------------------------------------|
| `database/migrations/0108_capability_registry.up.sql`             | Tabellen-Schema + roleMatrix-Seed    | VERIFIED  | Existiert; CREATE TABLE IF NOT EXISTS + 18 action_definitions + 62 role_capabilities                    |
| `database/migrations/0108_capability_registry.down.sql`           | Rollback-Migration                   | VERIFIED  | Existiert; DROP TABLE IF EXISTS role_capabilities + action_definitions (korrekte FK-Reihenfolge)       |
| `backend/internal/permissions/capability_registry_test.go`        | TestRoleMatrixSeedParity, TestCacheLoadAndLookup, TestStartupConsistencyCheck GREEN | VERIFIED | Alle 3 Tests PASS (go test ./internal/permissions/... 14/14) |
| `backend/internal/permissions/permissions.go`                     | CacheLoader-Interface, LoadCache, cacheMu, loadedCache, allKnownActions, standaloneActions, roleAllows-Fallback | VERIFIED | Vollständig implementiert, Signaturen stabil |
| `backend/internal/repository/authz_permissions.go`                | LoadRoleCapabilities() via pgx       | VERIFIED  | Zeile 200: func; pgx SELECT role_code, action_code FROM role_capabilities; rows.Err()-Check; Compile-Zeit-Assertion Zeile 226 |
| `backend/cmd/server/main.go`                                      | LoadCache-Aufruf beim Start          | VERIFIED  | Zeile 127; nach NewService (Zeile 126), vor Router-Init; log.Fatalf bei Fehler |
| `backend/internal/repository/capability_join_test.go`             | TestCapabilityJoinQuery PASS         | VERIFIED  | Existiert; TestCapabilityJoinQuery PASS; D-07-Kommentar vorhanden          |
| `backend/internal/repository/admin_users_queries.go`              | Kommentare an 2 leader_count-Stellen | VERIFIED  | "Anzeige-Heuristik"-Kommentare an Zeilen 65 und 156 (grep -c = 2); SQL unverändert |
| `backend/internal/repository/admin_users_tab_repository.go`       | Kommentar oberhalb can_view_members/can_edit_content | VERIFIED | "Anzeige-Heuristiken"-Kommentar Zeile 114 (grep -c = 1); SQL unverändert |

---

## Key Link Verification

| Von                                   | Nach                            | Via                             | Status   | Details                                                             |
|---------------------------------------|----------------------------------|---------------------------------|----------|---------------------------------------------------------------------|
| `role_capabilities.role_code`         | `role_definitions(code)`        | FK ON DELETE CASCADE            | WIRED    | 0108.up.sql Zeile 19: REFERENCES role_definitions(code) ON DELETE CASCADE |
| `role_capabilities.action_code`       | `action_definitions(code)`      | FK ON DELETE CASCADE            | WIRED    | 0108.up.sql Zeile 20: REFERENCES action_definitions(code) ON DELETE CASCADE |
| `main.go permissionSvc.LoadCache()`   | `authzRepo.LoadRoleCapabilities()` | CacheLoader-Interface          | WIRED    | main.go Zeile 127; authz_permissions.go Zeile 200; Compile-Zeit-Assertion Zeile 226 |
| `permissions.roleAllows()`            | `loadedCache`                   | cacheMu.RLock()                 | WIRED    | permissions.go Zeilen 487–494; cache != nil → loadedCache; Fallback auf roleMatrix |
| `TestCapabilityJoinQuery`             | `permissions.CacheLoader (stub)` | stubCapabilityLoader            | WIRED    | capability_join_test.go: stubCapabilityLoader implementiert CacheLoader; assertions auf result["fansub_lead"] |

---

## Data-Flow Trace (Level 4)

Keine frontend-seitigen Render-Komponenten in dieser Phase. Alle Artefakte sind Backend-only (DB-Tabellen, Go-Cache, Test-Stubs).

Der Cache-Datenfluss wurde Level-4-äquivalent geprüft:
- `role_capabilities` (DB, 62 Einträge) → `AuthzRepository.LoadRoleCapabilities()` (pgx SELECT) → `permissions.LoadCache()` (D-10-Check) → `loadedCache` (map[string][]Action) → `roleAllows()` (RLock) → `RoleAllowsAction()` / `CanForFansubGroup()` etc.
- Quelle produziert echte Daten: Migration 0108 seedet 62 role_capabilities-Zeilen; Live-DB bestätigt (action_definitions=18, role_capabilities=62, 10 Rollen).

---

## Behavioral Spot-Checks

| Verhalten                                  | Kommando                                                        | Ergebnis                     | Status |
|--------------------------------------------|-----------------------------------------------------------------|------------------------------|--------|
| Alle permissions-Tests grün (14/14)        | `go test ./internal/permissions/... -count=1`                   | ok 0.484s                    | PASS   |
| TestCapabilityJoinQuery PASS               | `go test ./internal/repository/... -run TestCapabilityJoinQuery -v` | PASS 0.00s                 | PASS   |
| go build ./... kompiliert                  | `go build ./...`                                                | kein Ausgabe (= OK)          | PASS   |

---

## Probe Execution

Phase 86 hat keine dedizierten `probe-*.sh`-Skripte; der Phasenbeweis läuft über Go-Tests.

---

## Requirements Coverage

| Requirement | Plan     | Beschreibung                                    | Status    | Evidenz                                                             |
|-------------|----------|-------------------------------------------------|-----------|---------------------------------------------------------------------|
| D-01        | 86-01    | action_definitions-Tabelle anlegen              | SATISFIED | 0108.up.sql CREATE TABLE action_definitions                         |
| D-02        | 86-01    | role_capabilities-Tabelle mit FKs anlegen       | SATISFIED | 0108.up.sql CREATE TABLE role_capabilities + FK REFERENCES          |
| D-03        | 86-01    | behavior-preserving Seed aus roleMatrix         | SATISFIED | 18 action_definitions + 62 role_capabilities (exakt roleMatrix)     |
| D-04        | 86-02    | permissions.go lädt Matrix in In-Memory-Cache   | SATISFIED | LoadCache-Implementierung, cacheMu + loadedCache                    |
| D-05        | 86-02    | Öffentliche API stabil (Signatur unverändert)   | SATISFIED | RoleAllowsAction/AllowedActionsForRole unverändert; 11 Alttests grün |
| D-06        | 86-02    | Kein DB-Roundtrip im Hot-Path                   | SATISFIED | roleAllows() liest nur In-Memory-loadedCache (RLock)                |
| D-07        | 86-03    | Registry per SQL-Join konsultierbar (Test)      | SATISFIED | TestCapabilityJoinQuery PASS; stub beweist role_capabilities-Semantik |
| D-08        | 86-03    | 3 Anzeige-Heuristiken unverändert + Kommentare  | SATISFIED | SQL-Literale unverändert; "Anzeige-Heuristik"-Kommentare vorhanden  |
| D-09        | 86-03    | Phase-80-Gruppenrechte-Query unverändert        | SATISFIED | admin_users_tab_repository.go: can_view_members/can_edit_content SQL unverändert |
| D-10        | 86-01/02 | Startup-Konsistenz-Check gegen action_definitions | SATISFIED | LoadCache prüft allKnownActions vs. seenActions + standaloneActions; TestStartupConsistencyCheck PASS |
| D-11        | 86-03    | „Neues Recht = nur Daten" nachgewiesen          | SATISFIED | TestCapabilityJoinQuery + SQL-Kommentare; role_capabilities-Join-Muster dokumentiert |

---

## Anti-Patterns Found

| Datei                               | Zeile | Muster          | Schwere   | Wirkung                                                              |
|-------------------------------------|-------|-----------------|-----------|----------------------------------------------------------------------|
| Keine Blocker gefunden              | -     | -               | -         | -                                                                    |

Scan auf TBD/FIXME/XXX/PLACEHOLDER/TODO in den phase-spezifischen Dateien: keine blockierenden Marker gefunden.

---

## Vorbestehende Fehlschläge (NICHT Phase 86)

Folgende Tests schlugen beim Gesamttest-Lauf fehl, sind aber **nicht von Phase 86 berührt**:

| Test                                        | Datei                                                | Letzter Commit (nicht Phase 86)       | Klassifikation              |
|---------------------------------------------|------------------------------------------------------|---------------------------------------|-----------------------------|
| TestPhase69AnimeContributionMutationsUseRouteScope | backend/internal/repository/phase69_context_scoping_test.go | b0b38c69 (fix(phase69)) | Vorbestehend, gedrifteter Source-Fragment-Test |
| TestContributionUpsert_FourColumnConflict   | backend/internal/repository/anime_contributions_inputs_test.go | (phase 81 oder früher) | Vorbestehend |
| TestGetMemberIDForContribution_MethodExists | backend/internal/services/badge_service_test.go     | 8aca3d3c (feat(68-01))               | Vorbestehend |

Begründung: Alle drei Dateien haben keinen Commit aus Phase 86 (da41ef69, 63d88a45, a740b7ae, 5f122a10, fee644ba, f9bbe98b). Sie sind als separate Nacharbeit geflaggt und blockieren den Phase-86-Abschluss nicht.

---

## Human Verification Required

Keine. Alle kritischen Wahrheiten sind programmatisch verifizierbar.

---

## Gaps Summary

Keine Gaps. Alle 11 must-have Wahrheiten sind vollständig im Code nachgewiesen.

---

## Commit-Nachweis

Alle 6 Phase-86-Commits existieren und sind auf main:

| Commit     | Inhalt                                                              |
|------------|---------------------------------------------------------------------|
| `da41ef69` | feat(86-01): Migration 0108 — action_definitions + role_capabilities + Seed |
| `63d88a45` | test(86-01): Wave-0-RED-Tests + CacheLoader-Interface-Stub          |
| `a740b7ae` | feat(86-02): LoadCache + RWMutex-Cache + allKnownActions + roleAllows-Fallback |
| `5f122a10` | feat(86-02): LoadRoleCapabilities in AuthzRepository + LoadCache-Verdrahtung |
| `fee644ba` | test(86-03): D-07 Nachweis-Test                                     |
| `f9bbe98b` | docs(86-03): D-08/D-09/D-11 Kommentare an Anzeige-Heuristiken      |

---

_Verifiziert: 2026-06-18_
_Verifier: Claude (gsd-verifier)_
