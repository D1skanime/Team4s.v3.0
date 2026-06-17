# Design-Notiz: Daten-getriebene Capability-Registry (geplante eigene Phase)

**Erstellt:** 2026-06-17 (während Phase-80-UAT)
**Status:** Vorgemerkt als eigene Phase — erst nach Phase-80-Abschluss planen/ausführen.
**Auslöser:** Nutzer-Anforderung — neue Rechte sollen zentral integrierbar sein, nicht pro `.go`/SQL-Stelle hartkodiert.

## Problem (Ist-Zustand, verifiziert am 2026-06-17)

- **Rollen-Katalog** ist bereits daten-getrieben: `role_definitions(code, label_de, contexts[], sort_order)`.
- **Rolle→Recht-Matrix** ist zentral, aber **hartkodiert in Go**: `roleMatrix map[string][]Action` in
  `backend/internal/permissions/permissions.go`. Recompile nötig; nur vom Permission-`Service` genutzt.
- **Verstreute Bypässe** umgehen den Service und re-kodieren Rollen-Literale:
  - SQL `... role IN ('leader','editor','contributor')`:
    - `backend/internal/repository/admin_users_queries.go` (leader_count)
    - `backend/internal/repository/admin_users_tab_repository.go` (can_edit_content, GetUserGroupRights)
    - `backend/internal/repository/anime_contributions_public_repository.go`
    - `backend/internal/services/badge_service.go`
  - Go `role == "..."`:
    - `backend/internal/handlers/admin_users_mutations_handler.go`
    - `backend/internal/handlers/app_auth.go`
    - `backend/internal/repository/authz.go` (2 Stellen)
- Kernursache: SQL kann die Go-`roleMatrix` nicht lesen → dort wird zwangsläufig hartkodiert.

## Zielbild

Eine **Quelle der Wahrheit**, die **Go UND SQL** lesen können → muss als **Daten in der DB** liegen.

### Schema

```sql
action_definitions (
  code      text PRIMARY KEY,        -- z.B. 'release_version_media.upload'
  label_de  text NOT NULL,
  category  text,                     -- UI-Gruppierung
  sort_order int NOT NULL DEFAULT 0
);

role_capabilities (
  role_code   text REFERENCES role_definitions(code) ON DELETE CASCADE,
  action_code text REFERENCES action_definitions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_code, action_code)
);
```

### Go-Seite
- `permissions.go` lädt `role_capabilities` beim Start in einen In-Memory-Cache (statt der hartkodierten `roleMatrix`).
- Öffentliche API + `Action`-Konstanten bleiben **unverändert** (`RoleAllowsAction`, `AllowedActionsForRole`) → bestehende Aufrufer ändern sich nicht.
- Cache-Invalidierung nur bei Änderung (selten); keine DB-Roundtrips im Hot-Path.

### SQL-Seite
Rollen-Literale ersetzen durch Join gegen dieselbe Wahrheit:
```sql
-- vorher
bool_or(fgmr.role IN ('leader','editor','contributor')) AS can_edit_content
-- nachher
bool_or(EXISTS (
  SELECT 1 FROM role_capabilities rc
  WHERE rc.role_code = fgmr.role AND rc.action_code = 'release_version_media.update'
)) AS can_edit_content
```

## „Neues Recht hinzufügen" = nur Daten
```sql
INSERT INTO action_definitions (code, label_de) VALUES ('release_version.publish','Veröffentlichen');
INSERT INTO role_capabilities (role_code, action_code) VALUES
  ('fansub_lead','release_version.publish'), ('project_lead','release_version.publish');
```
Null `.go`-Dateien, null SQL-Stellen. Der Phase-80-Rechte-Drawer rendert es automatisch (Katalog-getrieben).

## Trade-offs / Pflicht-Gegenmittel
- **Compile-Sicherheit verloren** für Action-Codes → FK-Constraints + Startup-Konsistenz-Check/Test, der jede im Code benutzte `Action`-Konstante gegen `action_definitions` abgleicht.
- **Hot-Path** → In-Memory-Cache beim Start, Invalidierung bei Änderung.
- **Migration behavior-preserving** → erste Migration seedet `role_capabilities` exakt aus der heutigen `roleMatrix`; danach Bypass-Stellen einzeln umstellen.

## Empfohlener Phasen-Umfang (für spätere discuss/plan-phase)
1. Migration: `action_definitions` + `role_capabilities` anlegen, aus `roleMatrix` seeden (1:1).
2. `permissions.go`: Matrix aus Cache statt Go-Map; API stabil halten.
3. Startup-Konsistenz-Check + Tests (Code-Konstanten ⇄ Tabelle).
4. Bypass-Stellen entfernen (die oben gelisteten SQL- + Go-Fundstellen) → alle konsultieren die Registry.
5. Phase-80-Rechte-Drawer/Gruppenrechte-Query auf Katalog/Join umstellen.
6. Optional: Admin-UI zum Pflegen von `role_capabilities` (Rechte vergeben ohne Deploy).

## Verwandte Artefakte
- `backend/internal/permissions/permissions.go` (roleMatrix, Action-Konstanten, Service)
- `backend/internal/repository/authz_permissions.go` (Phase-83-Auflösung, Resolver)
- Phase 80 Rechte-Flächen: `admin_users_tab_repository.go` (GetUserGroupRights), `UserGroupRightsTab.tsx`
