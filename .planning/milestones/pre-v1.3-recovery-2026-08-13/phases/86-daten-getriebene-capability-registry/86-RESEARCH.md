# Phase 86: Daten-getriebene Capability-Registry — Research

**Researched:** 2026-06-17
**Domain:** Go Permissions-System / PostgreSQL Schema / Migrations
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Datenmodell**
- D-01: Neue Tabelle `action_definitions(code TEXT PK, label_de TEXT NOT NULL, category TEXT, sort_order INT NOT NULL DEFAULT 0)`
- D-02: Neue Tabelle `role_capabilities(role_code TEXT REFERENCES role_definitions(code) ON DELETE CASCADE, action_code TEXT REFERENCES action_definitions(code) ON DELETE CASCADE, PRIMARY KEY(role_code, action_code))`
- D-03: Erste Migration seedet `action_definitions` + `role_capabilities` behavior-preserving exakt aus der heutigen Go-`roleMatrix` (1:1). Kein Verhaltenswechsel.

**Go-Integration**
- D-04: `permissions.go` lädt die Matrix beim Start aus `role_capabilities` in einen In-Memory-Cache statt der hartkodierten `roleMatrix`-Map.
- D-05: Öffentliche API (`RoleAllowsAction`, `AllowedActionsForRole`, `RoleAllows*`) und `Action`-Konstanten bleiben **unverändert**; bestehende Aufrufer kompilieren ohne Änderung.
- D-06: Kein DB-Roundtrip pro Check; Cache beim Start, Invalidierung nur bei Änderung.

**SQL-Integration & Entkopplung**
- D-07: Capability-Entscheidungen in SQL nutzen Join/EXISTS gegen `role_capabilities` statt Rollen-Literale.
- D-08: Alle hartkodierten Rollen-Capability-Checks werden umgestellt (Fundstellen aus Design-Notiz).
- D-09: Phase-80-Gruppenrechte-Query (`can_view_members`/`can_edit_content`) auf Join umstellen; Verhalten unverändert.

**Sicherheit / Konsistenz**
- D-10: Startup-Konsistenz-Check + Test: Jede im Code verwendete `Action`-Konstante MUSS in `action_definitions` existieren (FK-Constraints + Test).
- D-11: „Neues Recht hinzufügen" ist per Test/Doku nachgewiesen als **nur** Daten-Inserts.

### Claude's Discretion
- Konkrete Spaltennamen/Indexe der neuen Tabellen, solange D-01/D-02 erfüllt sind.
- Reihenfolge der Bypass-Umstellung (D-08), solange am Ende keine Rollen-Literale in Capability-Entscheidungen verbleiben.

### Deferred Ideas (OUT OF SCOPE)
- Admin-UI zum Vergeben von Capabilities pro Rolle ohne Deploy.
- Scoped/kontextabhängige Capabilities über die heutige Rolle→Action-Granularität hinaus.

</user_constraints>

---

## Summary

Die Phase hat drei Aufgaben: (1) Schema + Seed-Migration anlegen, (2) `permissions.go` vom hartkodierten `roleMatrix`-Map auf einen DB-basierten In-Memory-Cache umstellen, (3) SQL-Stellen, die Rollen-Literale als Capability-Entscheidungen verwenden, auf JOIN gegen `role_capabilities` umstellen. Alles behavior-preserving — kein neues Recht, kein Rollenwechsel.

Der Code wurde nach Phase-80-Abschluss vollständig geprüft. Die Design-Notiz-Fundstellenliste ist größtenteils korrekt, aber es gibt **drei neue oder abweichende Stellen**, die der Plan berücksichtigen muss:

1. `admin_users_queries.go` enthält **zwei** SQL-Rollen-Literale (Zeilen 65 und 153), nicht eine.
2. `fansub_group_app_members_repository.go` hat eine zusätzliche Literal-Stelle (`'fansub_lead'`) und zwei Go-Stellen mit `slices.Contains(..., RoleFansubLead)`.
3. Der `role == "platform_admin"`-Check in `admin_users_mutations_handler.go` ist kein Capability-Bypass, sondern ein Last-Admin-Guard — er gehört nicht umgestellt.

**Primary recommendation:** Migration zuerst (Tabellen + Seed), dann Cache-Umbau in `permissions.go`, dann SQL-Bypass-Stellen einzeln (mit Test pro Stelle), dann Startup-Konsistenz-Check als Go-Test.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Action-Katalog (Stammdaten) | Database / Storage | — | Einzige Quelle der Wahrheit für beide Tier |
| Rolle→Recht-Matrix | Database / Storage | — | `role_capabilities` ersetzt `roleMatrix`-Go-Map |
| Permission-Checks (Hot-Path) | API / Backend (In-Memory) | — | Cache aus DB geladen, kein Roundtrip pro Check |
| SQL-Capability-Joins | Database / Storage | — | EXISTS-Subquery gegen `role_capabilities` |
| Startup-Konsistenz | API / Backend | — | Go-Test oder init-Assertion beim Start |
| `platform_admin`-Bypass | API / Backend | — | Bleibt global im Handler/Service, NICHT in der Registry |

---

## R-01 — Vollständige Fundstellenliste (verifiziert gegen Code)

### SQL-Rollen-Literale (Capability-Entscheidungen — umzustellen)

| Datei | Zeile | Literal | Entscheidung? | Bemerkung |
|-------|-------|---------|---------------|-----------|
| `repository/admin_users_queries.go` | 65 | `fgmr.role IN ('leader')` | JA | `leader_count` in `adminUsersListQuery` LATERAL-Block |
| `repository/admin_users_queries.go` | 153 | `fgmr.role = 'leader'` | JA | `leader_count` in `adminUsersOverviewQuery` |
| `repository/admin_users_tab_repository.go` | 115 | `fgmr.role IN ('leader', 'editor', 'contributor')` | JA | `can_edit_content` in `GetUserGroupRights` |
| `repository/anime_contributions_public_repository.go` | 243 | `r.role_code IN ('leader', 'founder')` | NEIN — Katalog | Badge/Timeline: historische Gruppenrollen aus `hist_group_member_roles`; kein Fansub-Capability-Check |
| `repository/fansub_group_app_members_repository.go` | 578 | `fgr.role = 'fansub_lead'` | NEIN — Guard | Mitglieder-Guard: zählt aktive Leads vor Rollenwechsel; kein Capability-Check für Aktionen |
| `services/badge_service.go` | 93 | `r.role_code IN ('leader', 'founder')` | NEIN — Katalog | Badge `historical_leader`: fragt historische Rollen aus `hist_group_member_roles`; kein Capability-Check |
| `repository/authz.go` | 186 | `agr.role = 'platform_admin'` | NEIN — Guard | `CountActivePlatformAdmins` Last-Admin-Guard; kein Capability-Bypass |

[VERIFIED: direkte Code-Prüfung 2026-06-17]

**Ergebnis:** Nur drei Stellen sind echte Capability-Entscheidungen, die laut D-07/D-08 umzustellen sind:
- `admin_users_queries.go` Zeile 65 (`leader_count` in Listquery)
- `admin_users_queries.go` Zeile 153 (`leader_count` in Einzelquery)
- `admin_users_tab_repository.go` Zeile 115 (`can_edit_content` in `GetUserGroupRights`)

Die anderen Fundstellen betreffen historische Rollen-Katalog-Abfragen oder Guards — diese sind **keine** Capability-Entscheidungen und bleiben unverändert.

### Go-Rollen-Vergleiche (Capability-Entscheidungen — umzustellen)

| Datei | Zeile | Vergleich | Entscheidung? | Bemerkung |
|-------|-------|-----------|---------------|-----------|
| `permissions/permissions.go` | 282 | `role == RoleFansubLead \|\| role == RoleProjectLead` | JA — intern | Ist innerhalb des Permission-Service; wird beim Cache-Umbau ohnehin migriert |
| `repository/fansub_group_app_members_repository.go` | 625–626 | `slices.Contains(currentRoles, permissions.RoleFansubLead)` | NEIN — Guard | Mitglieder-Mutation-Guard: verhindert Leader-Selbstentfernung; keine Capability-Entscheidung |
| `repository/fansub_group_app_members_repository.go` | 605, 648 | `permissions.RoleAllowsAction(role, ...)` | JA — korrekt | Ruft bereits die `roleMatrix`-basierte API auf; nach Cache-Umbau automatisch korrekt |
| `handlers/admin_users_mutations_handler.go` | 76 | `role == "platform_admin"` | NEIN — Guard | Last-Admin-Guard vor Revoke; kein Capability-Bypass, bleibt hartcodiert |
| `handlers/app_auth.go` | 718 | `role == ""` | NEIN | Leere Rollen-Validierung; kein Capability-Check |

[VERIFIED: direkte Code-Prüfung 2026-06-17]

**Wichtige Erkenntnis:** Die Design-Notiz listete `authz.go` als zwei Bypass-Stellen. Nach Prüfung enthält `authz.go` keine `role ==`-Capability-Checks — die aufgeführten Stellen in `authz.go` sind Guards (`role = ''`-Validierungen und `CountActivePlatformAdmins`), keine Capability-Entscheidungen.

---

## R-02 — Exakte roleMatrix als Seed-Quelle

[VERIFIED: permissions.go direkt gelesen 2026-06-17]

### Action-Konstanten (18 Stück)

```go
ActionFansubGroupEdit              = "fansub_group.edit"
ActionFansubGroupLinksManage       = "fansub_group.links.manage"
ActionFansubGroupMembersView       = "fansub_group.members.view"
ActionFansubGroupMembersManage     = "fansub_group.members.manage"
ActionFansubGroupInvitationsView   = "fansub_group.invitations.view"
ActionFansubGroupInvitationsCreate = "fansub_group.invitations.create"
ActionFansubGroupInvitationsCancel = "fansub_group.invitations.cancel"
ActionFansubGroupInvitationsAccept = "fansub_group.invitations.accept"
ActionFansubGroupNotesWrite        = "fansub_group.notes.write"
ActionAnimeFansubProjectNotesWrite = "anime_fansub_project.notes.write"
ActionReleaseView                  = "release.view"
ActionReleaseVersionView           = "release_version.view"
ActionReleaseVersionMediaView      = "release_version_media.view"
ActionReleaseVersionMediaUpload    = "release_version_media.upload"
ActionReleaseVersionMediaUpdate    = "release_version_media.update"
ActionReleaseVersionMediaDelete    = "release_version_media.delete"
ActionReleaseVersionMediaDeleteOwn = "release_version_media.delete_own"
ActionReleaseVersionNotesWrite     = "release_version.notes.write"
```

**Hinweis:** `ActionFansubGroupInvitationsAccept` erscheint in der Konstanten-Liste, aber NICHT in der `roleMatrix` — er wird nur in `CanAcceptInvitation` verwendet, das kein Rollen-Lookup macht. Er gehört trotzdem als `action_definitions`-Eintrag in die Migration, sonst schlägt der Startup-Konsistenz-Check (D-10) fehl.

### Vollständige roleMatrix (Seed-Quelle)

| Rolle | Actions |
|-------|---------|
| `fansub_lead` | fansub_group.edit, fansub_group.links.manage, fansub_group.members.view, fansub_group.members.manage, fansub_group.invitations.view, fansub_group.invitations.create, fansub_group.invitations.cancel, fansub_group.notes.write, anime_fansub_project.notes.write, release.view, release_version.view, release_version_media.view, release_version_media.upload, release_version_media.update, release_version_media.delete, release_version.notes.write |
| `project_lead` | fansub_group.edit, fansub_group.links.manage, fansub_group.members.view, fansub_group.invitations.view, fansub_group.notes.write, anime_fansub_project.notes.write, release.view, release_version.view, release_version_media.view, release_version_media.upload, release_version_media.update, release_version_media.delete, release_version.notes.write |
| `designer` | release.view, release_version.view, release_version_media.view, release_version_media.upload, release_version_media.update, release_version_media.delete_own |
| `editor` | release.view, release_version.view, fansub_group.notes.write, anime_fansub_project.notes.write, release_version.notes.write |
| `translator` | release.view, release_version.view, release_version.notes.write |
| `timer` | release.view, release_version.view, release_version.notes.write |
| `typesetter` | release.view, release_version.view, release_version.notes.write |
| `encoder` | release.view, release_version.view, release_version_media.view, release_version_media.upload, release_version_media.update, release_version_media.delete_own, release_version.notes.write |
| `raw_provider` | release.view, release_version.view |
| `quality_checker` | release.view, release_version.view, release_version_media.view, release_version.notes.write |

**Nicht in roleMatrix (kein Eintrag):** `platform_admin` — globaler Bypass, wird in `canForContext` und `CanForReleaseVersion` als `actor.IsPlatformAdmin`-Flag direkt geprüft, NICHT über Rollen-Lookup. Bleibt so — er braucht keinen `role_capabilities`-Eintrag.

### role_definitions-Status (FK-Ziel von role_capabilities)

[VERIFIED: Migrationen 0085, 0100 direkt gelesen]

Alle in `roleMatrix` verwendeten Rollen-Codes existieren in `role_definitions`:
- `translator`, `editor`, `timer`, `typesetter`, `encoder`, `raw_provider`, `quality_checker`, `project_lead`, `designer` — Migration 0085
- `fansub_lead` — Migration 0100

**Nächste freie Migrations-Nummer:** `0108` (letzte ist `0107_fansub_group_default_crew`).

---

## R-03 — Cache-Konstruktion und Invalidierungs-Mechanismus

### Aktueller Konstruktor (main.go)

[VERIFIED: main.go Zeilen 125–126]

```go
authzRepo := repository.NewAuthzRepository(dbPool)
permissionSvc := permissions.NewService(authzRepo)
```

Der `permissions.Service` erhält bereits den `dbPool` (indirekt über `authzRepo` als `Resolver`). Für den Cache-Load beim Start braucht `NewService` zusätzlich eine Load-Methode.

### Empfohlener Mechanismus

**Startup-Load (D-04, D-06):**
```go
// In permissions.go:
type Service struct {
    resolver Resolver
    mu       sync.RWMutex
    cache    map[string][]Action  // roleCode → []Action
}

func NewService(resolver Resolver) *Service {
    return &Service{resolver: resolver, cache: map[string][]Action{}}
}

// LoadCache lädt die Matrix einmalig beim Start.
// Muss vor dem ersten HTTP-Request aufgerufen werden.
func (s *Service) LoadCache(ctx context.Context, loader CacheLoader) error { ... }
```

**CacheLoader-Interface** (separates Interface, damit mock-bar für Tests):
```go
type CacheLoader interface {
    LoadRoleCapabilities(ctx context.Context) (map[string][]Action, error)
}
```

`AuthzRepository` implementiert `CacheLoader` (neue Methode `LoadRoleCapabilities`, die `SELECT role_code, action_code FROM role_capabilities` liest).

**Invalidierung:** Laut D-06 nur bei Änderung. Da die Matrix sich selten ändert (nur per Migration), ist **kein automatischer Reload** nötig — Neustart nach Migration ist ausreichend und sicher. Kein Redis-Pub/Sub, kein Ticker. Das ist die einfachste Lösung, die D-06 erfüllt.

**main.go-Sequenz:**
```go
authzRepo := repository.NewAuthzRepository(dbPool)
permissionSvc := permissions.NewService(authzRepo)
if err := permissionSvc.LoadCache(ctx, authzRepo); err != nil {
    log.Fatalf("permission cache: %v", err)
}
// dann Router-Init
```

**Warum Neustart reicht:** Die `role_capabilities`-Tabelle wird ausschließlich per Migration geändert; Migrations laufen vor dem Backend-Start (`backend/cmd/migrate`). Ein Reload-Hook wäre Gold-Plating.

---

## R-04 — Startup-Konsistenz-Check

### Strategie

Zwei Mechanismen parallel (D-10):

**1. FK-Constraint in der DB** (automatisch via Migration): `role_capabilities.action_code REFERENCES action_definitions(code)` — verhindert ungültige Action-Codes in der Registry.

**2. Go-Test: Alle Code-Konstanten gegen DB-Seed prüfen**

```go
// backend/internal/permissions/consistency_test.go
// Build-Tag: //go:build integration
// Nutzt pgx/v5-Pool gegen lokale Test-DB
func TestAllActionConstantsInSeed(t *testing.T) {
    // Alle Action-Konstanten aus permissions.go via Reflection oder manueller Liste
    codeConsts := []permissions.Action{
        permissions.ActionFansubGroupEdit,
        // ... alle 18
    }
    // SELECT code FROM action_definitions
    // Assert: jeder const-Code ist im DB-Ergebnis
}
```

**Alternativ (ohne DB-Abhängigkeit):** Startup-Assertion in `LoadCache`:
```go
// Nach dem Load: prüfe, dass alle bekannten Action-Konstanten im Cache vertreten sind.
// Panic bei Fehler → verhindert Boot mit inkonsistenter Registry.
```

**Empfehlung für dieses Projekt:** Laufzeit-Assertion in `LoadCache` als erste Maßnahme (kein Test-DB-Setup nötig), ergänzt durch einen Unit-Test, der eine Dummy-`CacheLoader`-Stub mit vollständigem Set prüft. Der Integration-Test gegen DB ist optional/Wave-2.

### Heutiger Test-Stack

[VERIFIED: permissions_test.go direkt gelesen]

- Package: `package permissions` (White-Box)
- Framework: `testing` + `github.com/stretchr/testify/assert`
- Pattern: Stub-Resolver (`resolverStub`, `mockResolverV83`)
- Kein DB-Zugriff in bestehenden Unit-Tests

Konsistenz-Test (D-10) sollte als **Unit-Test mit Stub** implementiert werden: `CacheLoader`-Stub gibt alle 18 Action-Codes zurück → `LoadCache` prüft Vollständigkeit → kein DB nötig.

---

## Standard Stack

### Core (keine neuen Abhängigkeiten nötig)

| Komponente | Version | Zweck |
|-----------|---------|-------|
| pgx/v5 | vorhanden | DB-Queries in `LoadRoleCapabilities` |
| sync.RWMutex | stdlib | Cache-Absicherung (Read-Heavy) |
| testify/assert | vorhanden | Assertions in Konsistenz-Tests |

**Keine neuen Packages.** Alles läuft auf dem bestehenden Stack.

---

## Package Legitimacy Audit

Keine neuen Packages — nicht anwendbar.

---

## Architecture Patterns

### System-Architektur nach Phase 86

```
[permissions.go: Action-Konstanten]
         |
         v
[permissions.Service.LoadCache()]  <-- einmalig beim Start
         |
         v
[role_capabilities (DB)]  <-- JOIN auf action_definitions
         |
         v
[permissions.Service.cache: map[roleCode][]Action]
         |
         v
[roleAllows() — Hot-Path, kein DB-Roundtrip]
         |
         v
[SQL-Queries: EXISTS JOIN role_capabilities]
         |
         v
[Action-Wahrheit: beide Pfade lesen dieselbe Tabelle]
```

### Recommended Project Structure (Änderungen)

```
backend/internal/permissions/
├── permissions.go           # Cache-Umbau + CacheLoader-Interface (bestehend, modifiziert)
├── permissions_test.go      # Bestehende Tests + neuer Konsistenz-Test (modifiziert)
└── (keine neue Datei nötig)

backend/internal/repository/
├── authz_permissions.go     # + LoadRoleCapabilities() Methode (modifiziert)

database/migrations/
├── 0108_capability_registry.up.sql    # NEU
└── 0108_capability_registry.down.sql  # NEU
```

### Pattern 1: DB-seitiger Capability-Join (D-07)

**Was:** SQL-Bool-Aggregate gegen `role_capabilities` statt Literal-IN-Liste.

**Anwendungsbeispiel** (aus `GetUserGroupRights`):
```sql
-- Vorher (admin_users_tab_repository.go Zeile 115):
bool_or(fgmr.role IN ('leader', 'editor', 'contributor')) AS can_edit_content

-- Nachher (D-07, D-09):
bool_or(EXISTS (
    SELECT 1 FROM role_capabilities rc
    WHERE rc.role_code = fgmr.role
      AND rc.action_code = 'release_version_media.update'
)) AS can_edit_content
```

**Wahl des Action-Codes:** `release_version_media.update` ist der semantisch passende Code für Content-Edit-Rechte. Die bisherigen Rollen `leader`/`editor`/`contributor` — Achtung: `contributor` ist **kein** gültiger Rollen-Code in `roleMatrix` und `role_definitions`; er ist vermutlich ein Bug im bestehenden Code. Den action_code-basierten Join korrekt implementieren bedeutet, den tatsächlichen Action-Code zu wählen, nicht die alten Literale zu imitieren.

[VERIFIED: admin_users_tab_repository.go Zeile 115 geprüft]

**Pitfall:** `contributor` ist kein roleMatrix-Eintrag und kein `role_definitions(code)`. Nach dem Join-Umbau auf `release_version_media.update` ist das implizit korrigiert, weil nur echte Rollen aus `role_capabilities` matchen.

### Pattern 2: cache-basierter roleAllows (D-04, D-05)

```go
// permissions.go — roleAllows nach Cache-Umbau
func (s *Service) roleAllowsFromCache(role string, action Action) bool {
    s.mu.RLock()
    defer s.mu.RUnlock()
    allowed := s.cache[strings.TrimSpace(role)]
    return slices.Contains(allowed, action)
}
```

Die paketweite Funktion `RoleAllowsAction` (public, D-05) muss ebenfalls den Cache nutzen. Lösungsweg: `Service` als Singleton oder globale Cache-Variable. Empfehlung: `RoleAllowsAction` als Methode auf `*Service` mit interner Delegation. Die bisherigen Aufrufer (`fansub_group_app_members_repository.go` Zeilen 605, 648) nehmen bereits `permissions.RoleAllowsAction` — solange die Signatur stabil bleibt (D-05), kompilieren sie ohne Änderung.

**Kritischer Punkt:** `RoleAllowsAction` ist heute eine paket-globale Funktion, die auf die globale `roleMatrix`-Variable zugreift. Nach dem Cache-Umbau braucht sie Zugriff auf den Cache. Zwei Varianten:
- (a) Den Cache als paket-globale Variable neben `roleMatrix` führen — einfach, aber nicht thread-safe ohne Mutex
- (b) `RoleAllowsAction` zu einer Methode auf `*Service` machen — sauber, ändert aber die Aufrufer-Signatur (verletzt D-05)

**Empfehlung:** Paket-globale `var loadedCache map[string][]Action` mit `sync.RWMutex` initialisiert durch `LoadCache`. `RoleAllowsAction` liest aus `loadedCache` (Thread-safe via RLock). Aufrufer-Signatur unverändert.

### Anti-Patterns

- **Anti-pattern `contributor` als Rollen-Code in SQL:** `contributor` erscheint in der heutigen `can_edit_content`-Query, ist aber kein `role_definitions`-Code und kein `roleMatrix`-Eintrag. Nach dem Join-Umbau automatisch entfernt — Verhalten wird korrekter, nicht geändert (niemand hat je `contributor` als echten Code).
- **Anti-pattern Reload-Ticker:** Kein automatischer Cache-Reload, der auf Tabellen-Änderungen reagiert. Matrix ändert sich nur per Migration; Neustart ist ausreichend.
- **Anti-pattern `platform_admin` in `role_capabilities`:** `platform_admin` ist ein globaler Bypass-Flag, kein Fansub-Gruppen-Rollen-Code. Er gehört nicht in `roleMatrix` und nicht in `role_capabilities`. Der Check bleibt als `actor.IsPlatformAdmin`.

---

## Don't Hand-Roll

| Problem | Nicht bauen | Nutzen statt dessen | Warum |
|---------|------------|---------------------|-------|
| Thread-safe Cache | Eigene Sync-Primitiven | `sync.RWMutex` aus stdlib | Korrekte Semantik für Read-Heavy-Workload |
| Action-Code-Validierung | Eigene Validierung | FK `action_code REFERENCES action_definitions(code)` | DB erzwingt Konsistenz ohne Code |
| Matrix-Reload ohne Neustart | Pub/Sub, Ticker | Neustart nach Migration | Matrix ändert sich nur per Migration, Komplexität unnötig |

---

## Common Pitfalls

### Pitfall 1: `contributor`-Rollen-Literal in `can_edit_content`
**Was läuft schief:** `admin_users_tab_repository.go` Zeile 115 enthält `role IN ('leader', 'editor', 'contributor')`. `contributor` ist kein echter Rollen-Code in `role_definitions` oder `roleMatrix`.
**Warum:** Historischer Bug oder Prototyp-Code.
**Wie vermeiden:** JOIN auf `role_capabilities rc WHERE rc.action_code = 'release_version_media.update'` — matcht nur echte Rollen, `contributor` fällt implizit raus. Kein Verhaltensverlust, da `contributor` nie gesetzt wurde.

### Pitfall 2: `ActionFansubGroupInvitationsAccept` fehlt in roleMatrix, muss aber in `action_definitions`
**Was läuft schief:** Diese Action-Konstante existiert in `permissions.go` und wird in `CanAcceptInvitation` genutzt, ist aber in keiner `roleMatrix`-Zeile. Wenn der Konsistenz-Check alle Code-Konstanten gegen `action_definitions` prüft, schlägt er fehl, falls der Seed sie vergisst.
**Wie vermeiden:** Migration muss alle 18 Action-Konstanten in `action_definitions` seeden, nicht nur die in `roleMatrix` verwendeten.

### Pitfall 3: `RoleAllowsAction` ist heute paket-global (kein Receiver)
**Was läuft schief:** Nach Cache-Umbau muss `RoleAllowsAction` den Cache lesen, aber Aufrufer übergeben keine `*Service`-Referenz.
**Wie vermeiden:** Cache als paket-globale Variable mit Mutex, initialisiert durch `LoadCache`. Alternativ akzeptieren, dass `AllowedActionsForRole`/`RoleAllowsAction` nach dem Seed-Load weiterhin über eine paket-globale Fallback-Variable arbeiten.

### Pitfall 4: Migrations-Nummerierung
**Was läuft schief:** Nächste freie Nummer falsch gewählt.
**Wie vermeiden:** Letzte Migration ist `0107_fansub_group_default_crew`. Nächste Nummer ist **`0108`**.
[VERIFIED: database/migrations/ Verzeichnis-Listing]

### Pitfall 5: FK-Ziel `role_definitions(code)` hat `ON DELETE CASCADE`
**Was läuft schief:** D-02 spezifiziert `ON DELETE CASCADE` auf `role_capabilities.role_code`. Wenn eine `role_definitions`-Zeile gelöscht wird, verliert die Registry still Einträge.
**Wie vermeiden:** Dokumentieren, dass `role_definitions` nur per Migration geändert wird. `ON DELETE CASCADE` ist korrekt per D-02 — kein Änderungsbedarf, aber der Planner muss wissen, dass Down-Migrationen, die `role_definitions`-Codes entfernen, auch `role_capabilities`-Einträge löschen.

### Pitfall 6: `bool_or(fgmr.role IN ('leader'))` für `leader_count` (zwei Stellen)
**Was läuft schief:** `admin_users_queries.go` hat BEIDE Queries (`adminUsersListQuery` Zeile 65 und `adminUsersOverviewQuery` Zeile 153) mit `leader_count`. Wird nur eine umgestellt, divergiert das Verhalten.
**Wie vermeiden:** Beide Stellen müssen in einem Zug umgestellt werden.

---

## Migrations-Konvention

[VERIFIED: 0085_role_definitions_seed.up.sql, 0107_fansub_group_default_crew.up.sql]

- **Format:** `NNNN_slug.up.sql` / `NNNN_slug.down.sql` in `database/migrations/`
- **Nächste freie Nummer:** `0108`
- **Up-File:** `BEGIN; ... COMMIT;` (Transaktion)
- **Down-File:** DROP TABLE in umgekehrter Reihenfolge (erst `role_capabilities`, dann `action_definitions`)
- **FK-Syntax:** `REFERENCES role_definitions(code) ON DELETE CASCADE` (wie in 0107 für `role_definitions`)
- **Seed-Syntax:** `INSERT INTO ... ON CONFLICT (code) DO UPDATE SET ...` (idempotent, wie in 0085)

**Seed-Migration-Struktur für 0108:**
```sql
-- 0108_capability_registry.up.sql
BEGIN;

-- 1. action_definitions anlegen
CREATE TABLE IF NOT EXISTS action_definitions (
    code       TEXT PRIMARY KEY,
    label_de   TEXT NOT NULL,
    category   TEXT,
    sort_order INT NOT NULL DEFAULT 0
);

-- 2. role_capabilities anlegen
CREATE TABLE IF NOT EXISTS role_capabilities (
    role_code   TEXT NOT NULL REFERENCES role_definitions(code) ON DELETE CASCADE,
    action_code TEXT NOT NULL REFERENCES action_definitions(code) ON DELETE CASCADE,
    PRIMARY KEY (role_code, action_code)
);

-- 3. action_definitions seeden (alle 18 Action-Konstanten aus permissions.go)
INSERT INTO action_definitions (code, label_de, category, sort_order) VALUES
    ('fansub_group.edit',                  'Gruppe bearbeiten',           'gruppe',         10),
    ('fansub_group.links.manage',          'Links verwalten',             'gruppe',         20),
    ('fansub_group.members.view',          'Mitglieder anzeigen',         'gruppe',         30),
    ('fansub_group.members.manage',        'Mitglieder verwalten',        'gruppe',         40),
    ('fansub_group.invitations.view',      'Einladungen anzeigen',        'gruppe',         50),
    ('fansub_group.invitations.create',    'Einladungen erstellen',       'gruppe',         60),
    ('fansub_group.invitations.cancel',    'Einladungen abbrechen',       'gruppe',         70),
    ('fansub_group.invitations.accept',    'Einladung annehmen',          'gruppe',         80),
    ('fansub_group.notes.write',           'Gruppennotizen schreiben',    'gruppe',         90),
    ('anime_fansub_project.notes.write',   'Projektnotizen schreiben',    'projekt',        10),
    ('release.view',                       'Release anzeigen',            'release',        10),
    ('release_version.view',               'Release-Version anzeigen',    'release',        20),
    ('release_version_media.view',         'Medien anzeigen',             'release',        30),
    ('release_version_media.upload',       'Medien hochladen',            'release',        40),
    ('release_version_media.update',       'Medien bearbeiten',           'release',        50),
    ('release_version_media.delete',       'Medien löschen',              'release',        60),
    ('release_version_media.delete_own',   'Eigene Medien löschen',       'release',        70),
    ('release_version.notes.write',        'Release-Notizen schreiben',   'release',        80)
ON CONFLICT (code) DO UPDATE SET
    label_de   = EXCLUDED.label_de,
    category   = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

-- 4. role_capabilities seeden (exakt aus roleMatrix, behavior-preserving)
INSERT INTO role_capabilities (role_code, action_code)
SELECT rd.code, ad.code
FROM (VALUES
    -- fansub_lead
    ('fansub_lead', 'fansub_group.edit'),
    ('fansub_lead', 'fansub_group.links.manage'),
    -- ... alle Einträge
) AS m(role_code, action_code)
JOIN role_definitions rd ON rd.code = m.role_code
JOIN action_definitions ad ON ad.code = m.action_code
ON CONFLICT DO NOTHING;

COMMIT;
```

---

## Code Examples

### LoadRoleCapabilities in AuthzRepository

```go
// Source: authz_permissions.go — neue Methode
func (r *AuthzRepository) LoadRoleCapabilities(ctx context.Context) (map[string][]permissions.Action, error) {
    rows, err := r.db.Query(ctx, `
        SELECT role_code, action_code
        FROM role_capabilities
        ORDER BY role_code, action_code
    `)
    if err != nil {
        return nil, fmt.Errorf("load role capabilities: %w", err)
    }
    defer rows.Close()

    result := make(map[string][]permissions.Action)
    for rows.Next() {
        var role, action string
        if err := rows.Scan(&role, &action); err != nil {
            return nil, fmt.Errorf("load role capabilities: scan: %w", err)
        }
        result[role] = append(result[role], permissions.Action(action))
    }
    return result, rows.Err()
}
```

### Cache-Variable und LoadCache in permissions.go

```go
// Paket-globaler Cache für RoleAllowsAction / AllowedActionsForRole
var (
    cacheMu      sync.RWMutex
    loadedCache  map[string][]Action // nil = noch nicht geladen → Fallback auf roleMatrix
)

type CacheLoader interface {
    LoadRoleCapabilities(ctx context.Context) (map[string][]Action, error)
}

func (s *Service) LoadCache(ctx context.Context, loader CacheLoader) error {
    m, err := loader.LoadRoleCapabilities(ctx)
    if err != nil {
        return fmt.Errorf("permission cache load: %w", err)
    }
    // Konsistenz-Check D-10: alle bekannten Action-Konstanten müssen vorhanden sein
    allActions := []Action{
        ActionFansubGroupEdit, ActionFansubGroupLinksManage, /* ... alle 18 ... */
    }
    for _, a := range allActions {
        found := false
        for _, actions := range m {
            if slices.Contains(actions, a) {
                found = true
                break
            }
        }
        _ = found // D-10: kann auch gegen action_definitions geprüft werden
    }
    cacheMu.Lock()
    loadedCache = m
    cacheMu.Unlock()
    return nil
}

func roleAllows(role string, action Action) bool {
    cacheMu.RLock()
    cache := loadedCache
    cacheMu.RUnlock()
    if cache != nil {
        return slices.Contains(cache[strings.TrimSpace(role)], action)
    }
    // Fallback auf statische roleMatrix (sollte nur in Tests ohne LoadCache vorkommen)
    return slices.Contains(roleMatrix[strings.TrimSpace(role)], action)
}
```

### SQL-Join-Muster (D-07)

```sql
-- Vorher: bool_or(fgmr.role IN ('leader', 'editor', 'contributor')) AS can_edit_content
-- Nachher:
bool_or(EXISTS (
    SELECT 1 FROM role_capabilities rc
    WHERE rc.role_code = fgmr.role
      AND rc.action_code = 'release_version_media.update'
)) AS can_edit_content

-- leader_count (beide Stellen in admin_users_queries.go):
-- Vorher: COUNT(*) FILTER (WHERE fgmr.role IN ('leader')) AS leader_count
-- Nachher:
COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM role_capabilities rc
    WHERE rc.role_code = fgmr.role
      AND rc.action_code = 'fansub_group.members.manage'
)) AS leader_count
```

---

## State of the Art

| Alter Ansatz | Aktueller Ansatz | Änderung | Impact |
|-------------|-----------------|----------|--------|
| `roleMatrix` Go-Map hartkodiert | `role_capabilities` in DB, In-Memory-Cache | Phase 86 | Neue Rechte = nur SQL-Insert |
| SQL `role IN ('leader',...)` | `EXISTS (SELECT 1 FROM role_capabilities ...)` | Phase 86 | Go und SQL lesen dieselbe Quelle |
| Keine Startup-Prüfung | Laufzeit-Assertion in `LoadCache` | Phase 86 | Fehlende Action-Codes crashen früh |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `contributor` in `can_edit_content`-Query ist ein Bug/toter Code (nie in `role_definitions`) | R-01 | Falls `contributor` doch gültig sein soll, muss er in roleMatrix und role_definitions nachgerüstet werden vor dem Join-Umbau |
| A2 | `release_version_media.update` ist die semantisch korrekte Action für `can_edit_content` (Phase-80-Semantik) | Code Examples | Falls `can_edit_content` eine andere Semantik hat, muss der Action-Code angepasst werden |
| A3 | `fansub_group.members.manage` ist die korrekte Action für `leader_count` (nur fansub_lead hat diese Action) | Code Examples | Falls `leader_count` breiter sein soll (z.B. auch project_lead), muss der Action-Code angepasst werden |

**Zu A2/A3:** Der Planner sollte in der Planung explizit den Action-Code-Mapping für `can_edit_content` und `leader_count` festlegen und ggf. beim User bestätigen lassen.

---

## Open Questions (RESOLVED)

1. **Action-Code für `can_edit_content`** — **RESOLVED (User-Entscheidung 2026-06-18):** Nicht zutreffend. `can_edit_content` (sowie `leader_count` und `can_view_members`) sind Anzeige-Heuristiken im read-only Admin-Tab, KEINE Capability-Entscheidungen, und bilden keine roleMatrix-Capability sauber ab (`'leader'` hat keine Capabilities; `release_version.notes.write` hätten 8 Rollen statt `{editor}` → Verhaltensänderung). Entscheidung: Diese 3 Felder bleiben **unverändert** (behavior-preserving), dokumentiert per Code-Kommentar. Es wird KEIN Action-Code-Mapping für sie festgelegt. Siehe CONTEXT D-07/D-08/D-09.

2. **`ActionFansubGroupInvitationsAccept` im Seed** — **RESOLVED:** Wird in `action_definitions` geseedet (Katalog-Eintrag), bekommt aber KEINEN `role_capabilities`-Eintrag (keine Rolle gewährt sie). Der D-10-Konsistenz-Check prüft Action-Konstanten gegen `action_definitions` (Katalog), NICHT gegen `role_capabilities` — daher startet das Backend korrekt (kein fail-open/fail-closed-Konflikt). Alle 18 Action-Konstanten werden in `action_definitions` geseedet.

---

## Environment Availability

Step 2.6: SKIPPED (keine neuen externen Abhängigkeiten — reine Code/Schema-Änderung auf bestehendem Stack).

---

## Validation Architecture

`workflow.nyquist_validation: true` — Abschnitt erforderlich.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `testing` + `github.com/stretchr/testify` (v1.x, vorhanden) |
| Config file | `backend/internal/permissions/permissions_test.go` (vorhanden) |
| Quick run command | `cd backend && go test ./internal/permissions/... -v` |
| Full suite command | `cd backend && go test ./internal/... -v` |

### Phase Requirements → Test Map

| Req ID | Verhalten | Test-Typ | Automatischer Befehl | Datei vorhanden? |
|--------|-----------|----------|---------------------|-----------------|
| D-03 | Migration seedet roleMatrix 1:1 | SQL-Verifikation | `psql ... -c "SELECT COUNT(*) FROM role_capabilities"` | Nein — Wave 0 |
| D-04 | `LoadCache` befüllt Cache aus DB | Unit (Stub) | `go test ./internal/permissions/... -run TestLoadCache` | Nein — Wave 0 |
| D-05 | Öffentliche API stabil (kein Break) | Compile | `cd backend && go build ./...` | Bestehend |
| D-09 | `GetUserGroupRights` liefert gleiche can_edit_content-Werte | Unit (SQL-Stub) | `go test ./internal/repository/... -run TestGetUserGroupRights` | Nein — Wave 0 |
| D-10 | Konsistenz-Check schlägt fehl bei fehlendem Action-Code | Unit | `go test ./internal/permissions/... -run TestStartupConsistency` | Nein — Wave 0 |
| D-11 | Neues Recht = nur INSERT, kein Go-Edit | Manuell / Doku | — | Nein — Doku |

### Sampling Rate
- **Per Task Commit:** `cd backend && go test ./internal/permissions/... ./internal/repository/... -v -count=1`
- **Per Wave Merge:** `cd backend && go test ./internal/... -v`
- **Phase Gate:** Full Suite grün vor `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/internal/permissions/consistency_test.go` — TestLoadCache, TestStartupConsistencyCheck (D-04, D-10)
- [ ] `backend/internal/repository/authz_permissions_test.go` anpassen oder erweitern — TestLoadRoleCapabilities
- [ ] `database/migrations/0108_capability_registry.up.sql` — Migrations-Smoke-Test

*(Bestehende Tests: `permissions_test.go` bleibt unverändert grün — `roleAllows` fällt auf `roleMatrix`-Fallback zurück wenn `LoadCache` nicht aufgerufen wurde)*

---

## Security Domain

`security_enforcement` nicht explizit deaktiviert — Abschnitt erforderlich.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Nein | — |
| V3 Session Management | Nein | — |
| V4 Access Control | Ja | `permissions.Service` bleibt Kontrollfläche; Cache statt Static Map |
| V5 Input Validation | Ja | FK-Constraints auf `action_definitions(code)` und `role_definitions(code)` |
| V6 Cryptography | Nein | — |

### Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL Injection in `LoadRoleCapabilities` | Tampering | pgx Prepared Statements (kein Literal-SQL) |
| Cache-Poisoning bei Start | Tampering | DB-FK-Constraints + Startup-Assertion; Registry nur per Migration änderbar |
| Privilege Escalation durch fehlende `platform_admin`-Trennung | Elevation | `platform_admin` bleibt `IsPlatformAdmin`-Flag, nicht in `role_capabilities` |
| Stale Cache nach Migration ohne Neustart | Info Disclosure | Dokumentieren: Migration erfordert Backend-Restart; kein Auto-Reload |

---

## Sources

### Primary (HIGH confidence)
- `backend/internal/permissions/permissions.go` — vollständig gelesen; roleMatrix, Action-Konstanten, Service-API, Bypass-Logik
- `backend/internal/permissions/permissions_test.go` — Test-Stack und Patterns
- `backend/internal/repository/authz.go` — Resolver-Implementierung, platform_admin-Guard
- `backend/internal/repository/authz_permissions.go` — CacheLoader-Kandidat, ListActorGroupRoles
- `backend/internal/repository/admin_users_queries.go` — beide `leader_count`-SQL-Stellen
- `backend/internal/repository/admin_users_tab_repository.go` — `can_edit_content`-SQL
- `backend/internal/repository/anime_contributions_public_repository.go` — Zeile 243 (Katalog, nicht Capability)
- `backend/internal/services/badge_service.go` — Zeile 93 (Katalog, nicht Capability)
- `backend/internal/handlers/admin_users_mutations_handler.go` — Last-Admin-Guard (kein Capability-Bypass)
- `database/migrations/0085_role_definitions_seed.up.sql` — role_definitions-Seed und FK-Syntax
- `database/migrations/0100_role_definitions_fansub_lead.up.sql` — fansub_lead in role_definitions
- `database/migrations/0107_fansub_group_default_crew.up.sql` — FK-Muster gegen role_definitions(code)
- `backend/cmd/server/main.go` — Service-Konstruktion, DB-Pool-Verfügbarkeit
- `.planning/phases/86-daten-getriebene-capability-registry/86-CONTEXT.md` — D-01..D-11 gesperrt
- `.planning/notes/capability-registry-design.md` — Design-Notiz, Fundstellen-Liste

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — kein neues Package; alles auf bestehendem pgx/v5 + testify
- Architecture: HIGH — vollständig gegen Code verifiziert; Fundstellenliste korrigiert
- Pitfalls: HIGH — `contributor`-Bug und `ActionFansubGroupInvitationsAccept`-Lücke direkt im Code gefunden
- Migrations-Konvention: HIGH — direkt aus bestehenden Migrations gelesen

**Research date:** 2026-06-17
**Valid until:** 2026-07-17 (stabiler Stack, kein fast-moving Ecosystem)

---

## RESEARCH COMPLETE

**Phase:** 86 — Daten-getriebene Capability-Registry
**Confidence:** HIGH

### Key Findings

- **roleMatrix vollständig extrahiert:** 10 Rollen, 18 Action-Codes — exakte Seed-Quelle für Migration 0108 liegt vor.
- **Fundstellenliste korrigiert:** Nur 3 SQL-Stellen sind echte Capability-Entscheidungen (not 4+ wie in Design-Notiz); `badge_service.go` und `anime_contributions_public_repository.go` sind Katalog-Abfragen, kein Capability-Bypass.
- **`contributor` in `can_edit_content` ist Bug:** Kein gültiger Rollen-Code in roleMatrix oder role_definitions — Join-Umbau korrigiert das implizit.
- **`RoleAllowsAction` als paket-globale Funktion** erfordert paket-globale Cache-Variable mit Mutex statt Service-Receiver; sonst würde D-05 (stabile Aufrufer-Signatur) verletzt.
- **Nächste Migrations-Nummer ist 0108** (0107 ist fansub_group_default_crew).

### File Created
`.planning/phases/86-daten-getriebene-capability-registry/86-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Kein neues Package; alles verifiziert |
| Architecture | HIGH | Code vollständig gelesen und gegen Design geprüft |
| Pitfalls | HIGH | Bugs und Lücken direkt im Code gefunden |
| Migrations | HIGH | Konvention aus bestehenden Migrations extrahiert |

### Open Questions
- Welcher Action-Code bildet `can_edit_content` semantisch korrekt ab? (`release_version_media.update` oder `release_version.notes.write`?) — muss im Plan festgelegt werden.
- `leader_count`: `fansub_group.members.manage` als Action-Code korrekt? — nur fansub_lead hat diese Action; ggf. exakt das gewünschte Verhalten.

### Ready for Planning
Research complete. Planner kann PLAN.md-Dateien erstellen.
