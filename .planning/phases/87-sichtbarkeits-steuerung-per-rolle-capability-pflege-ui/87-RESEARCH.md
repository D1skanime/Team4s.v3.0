# Phase 87: Sichtbarkeits-Steuerung per Rolle + Capability-Pflege-UI — Research

**Researched:** 2026-06-18
**Domain:** Permissions-Enforcement (Go) + Admin-Pflege-UI (Next.js/React)
**Confidence:** HIGH (alle kritischen Punkte gegen Code verifiziert)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** In Phase 87 wird eine konkrete Liste heute ungated Lese-Pfade festgelegt, die künftig das zutreffende View-Recht prüfen (`permissions.Service` `CanFor*` mit `*.view`-Action). Auswahl ist Produktentscheidung beim Discuss-Schritt.
- **D-02:** Checks nutzen Phase-86-Registry (daten-getrieben); keine neuen hartkodierten Rollen-Listen.
- **D-03:** `platform_admin` bleibt globaler Bypass (sieht alles).
- **D-04:** Admin-UI (nur Plattform-Admin) listet alle Rollen mit Capabilities aus `role_capabilities` und erlaubt Vergeben/Entziehen einzelner Capabilities pro Rolle.
- **D-05:** Ausschließlich `@/components/ui`-Primitives; deutscher UI-Text mit korrekten Umlauten; modulare Komponenten (<=450 Zeilen).
- **D-06:** Jede Capability-Änderung ist auditierbar und wirkt nach Cache-Reload ohne Deploy.
- **D-07:** Last-Admin/Lockout-Schutz: kritische Fähigkeit kann nicht global so entzogen werden, dass sich der Betrieb aussperrt.
- **D-08:** Neue Endpunkte streng über `shared/contracts/*` (OpenAPI) → Backend-Handler → `frontend/src/lib/api.ts` → Frontend-Types; serverseitiges Plattform-Admin-Gate auf jedem neuen Endpunkt.

### Claude's Discretion
- Konkrete Auswahl der zu gatenden Lese-Pfade (R-01) — Produktentscheidung; Research liefert Inventar.
- Genaue Gestaltung des Cache-Reload-Mechanismus (R-02) — minimal-invasiv, API-stabil.
- Reuse-Grad der Phase-80-Muster (R-03).

### Deferred Ideas (OUT OF SCOPE)
- Feld-/spaltengranulare Sichtbarkeit über die heutige Action-Granularität hinaus.
- Scoped Capabilities pro konkreter Ressource (nicht nur pro Gruppe/Release-Version).
</user_constraints>

---

## Summary

Phase 87 baut auf dem Phase-86-Fundament auf: `action_definitions` + `role_capabilities` in DB (Migration 0108), `permissions.Service.LoadCache` lädt beim Start in `loadedCache` (paketglobaler `sync.RWMutex`). Der Cache wird **einmalig beim Server-Start** geladen und seitdem nie mehr invalidiert — der kritischste Plan-Punkt für D-06 ist deshalb das Nachrüsten einer `ReloadCache`-Funktion plus deren Aufruf nach jeder Mutation.

Der Lese-Pfad-Katalog zeigt: Mutations-Endpunkte (Upload, Edit, Delete) sind überwiegend bereits mit `CanFor*`-Checks gesichert. Reine Lese-Endpunkte (`GET /fansubs/:id/members`, `GET /fansubs/:id`, öffentliche Contributions, öffentliche Fansub-Listenendpunkte) laufen heute vollständig ungated. Welche davon in Phase 87 gated werden, ist Produktentscheidung — das Inventar steht unten.

Die Pflege-UI kann zu 80% aus dem Phase-80-Muster (`UserGlobalRolesTab.tsx`) abgeleitet werden: gleiche Drawer-Struktur, gleiche Modal-Confirmation, gleiche Audit-Seam, gleicher Last-Admin-Guard-Ansatz. Neue Endpunkte: `GET /admin/role-capabilities`, `PUT /admin/role-capabilities/:roleCode/:actionCode`, `DELETE /admin/role-capabilities/:roleCode/:actionCode`.

**Primary recommendation:** ReloadCache zuerst bauen, dann Mutations-Endpunkte, dann UI — so kann D-06 end-to-end getestet werden, bevor die UI fertig ist.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| View-Capability-Checks an Lese-Endpunkten | API / Backend | — | Permission-Logik gehört server-seitig; Client vertraut dem Gate |
| Cache-Invalidierung nach Mutation | API / Backend | — | Cache lebt im Backend-Prozess; muss direkt nach DB-Write neu geladen werden |
| Pflege-UI (Vergeben/Entziehen) | Frontend (CSR) | API / Backend | Gleiche Pattern wie Phase-80-Rollen-Tab |
| Audit-Log-Schreiben | API / Backend | — | Analog Phase 80; im Handler nach erfolgreicher Mutation |
| Last-Admin/Lockout-Guard | API / Backend | — | Server-seitig, analog `CountActivePlatformAdmins` |
| Contract-Definition | Shared (OpenAPI) | — | D-08: OpenAPI zuerst, dann Handler, dann Frontend |

---

## R-02: Cache-Invalidierung — KRITISCHER BEFUND

### Ist-Zustand (verifiziert)

[VERIFIED: backend/internal/permissions/permissions.go]

```go
// paket-globaler In-Memory-Cache
var (
    cacheMu     sync.RWMutex
    loadedCache map[string][]Action
)

func (s *Service) LoadCache(ctx context.Context, loader CacheLoader) error {
    m, err := loader.LoadRoleCapabilities(ctx)
    // ... D-10-Konsistenz-Check ...
    cacheMu.Lock()
    loadedCache = m
    cacheMu.Unlock()
    return nil
}
```

[VERIFIED: backend/cmd/server/main.go Zeile 127]

```go
permissionSvc := permissions.NewService(authzRepo)
if err := permissionSvc.LoadCache(ctx, authzRepo); err != nil {
    log.Fatalf("Capability-Registry laden fehlgeschlagen: %v", err)
}
```

**Befund:** `LoadCache` wird **einmalig beim Start** aufgerufen. Es gibt **keine** `ReloadCache`-, `InvalidateCache`- oder ähnliche Funktion. Eine `role_capabilities`-Änderung zur Laufzeit wirkt **nicht** auf den Cache — widerspricht D-06 direkt.

### Fehlende Funktion: `ReloadCache`

Minimale, API-stabile Ergänzung in `permissions.go`:

```go
// ReloadCache lädt die Capability-Matrix erneut aus der DB und ersetzt atomisch den Cache.
// Aufgerufen nach jeder role_capabilities-Mutation (Vergeben/Entziehen).
// API-stabil: LoadCache bleibt unverändert für den Startup-Pfad.
func (s *Service) ReloadCache(ctx context.Context, loader CacheLoader) error {
    return s.LoadCache(ctx, loader) // delegiert — selbe Logik inkl. D-10-Check
}
```

Alternativ kann `LoadCache` direkt erneut aufgerufen werden — beide Ansätze funktionieren, da `LoadCache` idempotent ist und den Cache atomar ersetzt.

### Verdrahtung für den Aufruf

[VERIFIED: backend/cmd/server/main.go] `permissionSvc` ist eine `*permissions.Service`-Referenz. Der neue Capability-Mutations-Handler muss diese Referenz erhalten, um nach einer `role_capabilities`-Mutation `permissionSvc.LoadCache(ctx, authzRepo)` (oder `ReloadCache`) aufzurufen.

Konstruktor-Muster (analog `WithPermissionDeps`):

```go
// Neuer Handler für Capability-Mutationen
type AdminCapabilityHandler struct {
    authzRepo     *repository.AuthzRepository  // für LoadRoleCapabilities
    permissionSvc *permissions.Service         // für ReloadCache
    auditLogRepo  *repository.AuditLogRepository
}
```

**Warnung:** Der D-10-Konsistenz-Check in `LoadCache` prüft, dass alle `allKnownActions` in `role_capabilities` vorhanden sind. Wenn eine Action über die UI _global_ entzogen wird (kein Rolleneintrag mehr), schlägt der Reload-Check fehl und der Server-Start scheitert. Für Phase 87 muss der Plan klarstellen:

- Capabilities können pro Rolle entzogen werden, aber nicht so, dass eine Action aus **keiner** Rolle mehr vorhanden ist (sofern sie nicht in `standaloneActions` deklariert ist). Der Handler muss diesen Fall prüfen ODER `ReloadCache` muss den D-10-Check im Laufzeit-Reload-Pfad _weicher_ handhaben (log + warnen statt fatal).
- **Empfehlung für D-07:** Lockout-Guard prüft nicht nur "letzter Admin", sondern auch "wird durch diese Änderung eine essentielle Action komplett entfernt?". Einfachste Implementierung: `ReloadCache` schlägt bei D-10-Fehler zurück (HTTP 409 statt Crash), Mutation wird nicht persistiert.

---

## R-01: Lese-Pfad-Inventar — gated vs. ungated

### Bereits gated (haben `CanFor*`-Check)

[VERIFIED: backend/internal/handlers/ — grep CanFor*]

| Endpunkt (Route) | Handler-Datei | Action |
|---|---|---|
| GET `/admin/fansubs/:id/anime/:animeId/releases` | admin_content_fansub_releases_handlers.go | ActionReleaseView |
| GET `/admin/fansubs/:id/anime/:animeId/releases/canonical` | admin_content_fansub_releases_handlers.go | ActionReleaseView |
| GET `/admin/releases/:releaseId` | admin_content_fansub_releases_handlers.go | ActionReleaseView |
| GET `/admin/episode-versions/:versionId/editor` | admin_content_episode_version_editor.go | ActionReleaseVersionView + ActionReleaseVersionMediaView |
| GET `/admin/fansubs/:id/releases/:releaseId/theme-assets` | admin_content_release_theme_assets.go | ActionReleaseView |
| GET `/admin/fansubs/:id/anime/:animeId/theme-assets` | admin_content_release_theme_assets.go | ActionReleaseView |
| GET `/admin/release-versions/:versionId/media` (Liste) | admin_content_release_version_media.go | ActionReleaseVersionMediaView |
| GET `/me/fansub-groups` | app_auth.go | (implizit: Mitgliedschaft, kein Action-Check, aber nur eigene Gruppen) |
| GET `/me/fansub-groups/:id` | app_auth.go | (implizit: Mitgliedschaft) |
| GET `/me/fansub-groups/:id/members` | app_auth.go | ActionFansubGroupMembersView |
| GET `/me/fansub-groups/:id/invitations` | app_auth.go | ActionFansubGroupInvitationsView |

### Ungated — Kandidaten für Gating

[VERIFIED: backend/internal/handlers/fansub_group_members.go, fansub_groups.go, contributions_public_handler.go]

| Endpunkt (Route) | Handler-Datei:Funktion | Auth-Check heute | Anmerkung |
|---|---|---|---|
| GET `/fansubs/:id/members` | fansub_group_members.go:ListFansubMembers | **keiner** — vollständig öffentlich | Stärkster Kandidat für `ActionFansubGroupMembersView` |
| GET `/fansubs/:id` | fansub_groups.go:GetFansubByID | keiner | Öffentliche Gruppendetails |
| GET `/fansubs` | fansub_groups.go:ListFansubs | keiner | Öffentliche Gruppenliste |
| GET `/fansubs/:id/contributions` | contributions_public_handler.go | keiner | Öffentliche Contributions |
| GET `/anime/:id/contributions` | contributions_public_handler.go | keiner | Öffentliche Contributions |
| GET `/members/:slug/contributions` | contributions_public_handler.go | keiner | Öffentliche Contributions |
| GET `/fansubs/:id/domain-projection` | domain_projection_handler.go | keiner | Öffentlich |
| GET `/anime/:id/group/:groupId/contributors` | group_contributors_handler.go | keiner | Öffentlich |
| GET `/admin/fansubs/:id/group-members` | fansub_hist_group_members_handler.go | requireAdmin (Legacy) | Admin-seitig, kein `CanFor*`-View-Check |
| GET `/admin/fansubs/:id/anime-coverage` | fansub_anime_contributions_handler.go | requireAdmin (Legacy) | Admin-seitig |
| GET `/admin/fansubs/:id/unified-members` | fansub_anime_contributions_unified_handler.go | requireAdmin (Legacy) | Admin-seitig |

**Wichtige Unterscheidung:** Öffentliche Endpunkte (keine Auth) können nur mit einem neuen optionalen Auth-Layer gated werden — das ist konzeptionell aufwendiger als Admin-Endpunkte mit bestehendem `requireAdmin`. Für Phase 87 sind **Admin-seitige ungated Endpunkte** die natürlichsten ersten Kandidaten. Öffentliche Endpunkte würden einen größeren Refactor erfordern und sollten als Deferred markiert werden (oder explizit als Scope-Entscheid im Discuss-Schritt).

---

## R-03: Reuse Phase-80-Muster

### Frontend-Muster (verifiziert)

[VERIFIED: frontend/src/app/admin/users/UserDetailDrawer.tsx]
[VERIFIED: frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx]

Die Pflege-UI für `role_capabilities` folgt **exakt demselben Muster** wie `UserGlobalRolesTab.tsx`:

**Drawer-Struktur:**
- `Drawer` + Tab-Navigation via `Button` (variant secondary/ghost) aus `@/components/ui`
- Lazy-Load via `activatedTabs: Set<TabId>`

**Tab-Muster für Capability-Vergabe:**
```
RolesTable (Tabelle: Rolle | Actions | Aktion)
  └── Button "Capability entziehen" → RevokeModal
SectionHeader + Button "Capability vergeben" → AssignModal
```

**Modal-Muster:**
- `Modal` aus `@/components/ui` mit `footer`-Prop
- Pending-State (`isMutating`) sperrt Buttons
- Inline-Error via `role="alert"` `<p>`

**Audit-Seam:**
```go
// Analog admin_users_mutations_handler.go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "role_capability.granted",  // oder "role_capability.revoked"
    TargetType:     "role_capability",
    Action:         "grant_capability",          // oder "revoke_capability"
    Outcome:        "allowed",
    Payload:        map[string]any{"role_code": roleCode, "action_code": actionCode},
})
```

**Last-Admin-Guard-Analogie:**
Analog zu `CountActivePlatformAdmins` + HTTP 409 bei Revoke der letzten `platform_admin`-Rolle muss Phase 87 prüfen: Würde das Entziehen einer Action dazu führen, dass kein Reload mehr möglich ist (D-10-Fehler)? Simpelste Lösung: Backend prüft vor Delete, ob nach der Mutation noch mindestens eine Rolle die Action hält ODER die Action ist `standaloneActions`.

---

## Standard Stack

### Core — keine neuen Pakete notwendig

Phase 87 braucht keine neuen Go-Pakete oder npm-Pakete. Alles basiert auf dem bestehenden Stack:

| Komponente | Wo | Nutzung in Phase 87 |
|---|---|---|
| `permissions.Service` | `backend/internal/permissions/permissions.go` | `LoadCache` erneut aufrufen nach Mutation |
| `permissions.CacheLoader` | Interface in permissions.go | `authzRepo.LoadRoleCapabilities` implementiert es bereits |
| `repository.AuthzRepository` | `backend/internal/repository/authz.go` + `authz_permissions.go` | Neue Methoden: `ListRoleCapabilities`, `GrantRoleCapability`, `RevokeRoleCapability` |
| `repository.AuditLogRepository` | vorhanden | Audit-Writes nach Mutation |
| `@/components/ui` | Frontend | Pflicht (D-05) |
| `frontend/src/lib/api.ts` | Frontend | Neue Funktionen ergänzen |
| `frontend/src/types/` | Frontend | Neue Typen ergänzen |

### Package Legitimacy Audit

Keine neuen externen Pakete — Abschnitt entfällt.

---

## Architecture Patterns

### System Architecture Diagram

```
Admin-UI (Browser)
  └── Drawer: Rollen-Capability-Matrix
        ├── GET /admin/role-capabilities → listet action_definitions + role_capabilities (DB)
        ├── PUT /admin/role-capabilities/:roleCode/:actionCode
        │     ├── Platform-Admin-Gate (requirePlatformAdminIdentity)
        │     ├── INSERT role_capabilities
        │     ├── permissions.Service.LoadCache (Reload) ←── NEUES PLAN-ITEM
        │     └── AuditLog.Write
        └── DELETE /admin/role-capabilities/:roleCode/:actionCode
              ├── Platform-Admin-Gate
              ├── Lockout-Guard: mindestens 1 Rolle behält Action (oder standaloneAction)
              ├── DELETE role_capabilities
              ├── permissions.Service.LoadCache (Reload)
              └── AuditLog.Write

Lese-Endpunkte (ausgewählte) — neuer Gate
  GET /admin/fansubs/:id/... (ungated, Admin-seitig)
  └── permissionSvc.CanFor*(actor, action.view, resourceID) → 403 wenn denied
                  ↑
          loadedCache (RWMutex) ←── sofort wirksam nach Reload
```

### Recommended Project Structure

```
backend/internal/
├── permissions/
│   └── permissions.go              (ReloadCache ergänzen — 1 Funktion)
├── repository/
│   └── authz_capability_mutations.go  (NEU: GrantRoleCapability, RevokeRoleCapability, ListCapabilityMatrix)
├── handlers/
│   └── admin_capability_handler.go    (NEU: ListCapabilityMatrix, GrantCapability, RevokeCapability)
└── cmd/server/
    └── admin_routes.go                (neue Routen eintragen)

frontend/src/
├── app/admin/role-capabilities/
│   └── page.tsx                       (NEU: Server-Component mit Gate)
│   └── RoleCapabilityClient.tsx       (NEU: <=450 Zeilen, Drawer/Tabelle/Modals)
├── lib/api.ts                         (3 neue Funktionen)
└── types/admin-capability.ts          (NEU: RoleCapabilityMatrix-Typen)
```

### Migrations-Stand

[VERIFIED: database/migrations/] Letzte Migration: `0108_capability_registry`. Nächste wäre `0109_...` — aber Phase 87 braucht **keine neue Migration**: `role_capabilities` und `action_definitions` existieren seit 0108. Alle Schema-Anforderungen sind erfüllt.

### Pattern 1: Capability-Mutations-Handler (Backend)

```go
// Source: Analog admin_users_mutations_handler.go
func (h *AdminCapabilityHandler) GrantCapability(c *gin.Context) {
    identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
    if !ok {
        return
    }

    roleCode := c.Param("roleCode")
    actionCode := c.Param("actionCode")

    if err := h.capabilityRepo.GrantRoleCapability(c.Request.Context(), roleCode, actionCode); err != nil {
        // ... Fehlerbehandlung
        return
    }

    // Cache-Reload — D-06
    if err := h.permissionSvc.LoadCache(c.Request.Context(), h.authzRepo); err != nil {
        log.Printf("capability grant: cache reload fehlgeschlagen: %v", err)
        // Mutation war erfolgreich, aber Cache ist veraltet — warnen, nicht fatal
    }

    _ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
        ActorAppUserID: &identity.AppUserID,
        EventType:      "role_capability.granted",
        TargetType:     "role_capability",
        Action:         "grant_capability",
        Outcome:        "allowed",
        Payload:        map[string]any{"role_code": roleCode, "action_code": actionCode},
    })

    c.JSON(http.StatusOK, gin.H{"message": "Capability erfolgreich vergeben."})
}
```

### Pattern 2: Lockout-Guard für Revoke

```go
func (h *AdminCapabilityHandler) RevokeCapability(c *gin.Context) {
    // ... Auth-Gate ...
    
    roleCode := c.Param("roleCode")
    actionCode := c.Param("actionCode")
    
    // Lockout-Guard: Action darf nicht aus allen Rollen entzogen werden
    // (außer wenn standaloneAction)
    remainingCount, err := h.capabilityRepo.CountRolesWithAction(c.Request.Context(), actionCode)
    if err != nil { /* ... */ }
    if remainingCount <= 1 && !h.isStandaloneAction(actionCode) {
        c.JSON(http.StatusConflict, gin.H{"error": gin.H{
            "message": "Diese Capability kann nicht entzogen werden — sie ist die letzte aktive Rolle für diese Action.",
            "code":    "lockout_guard",
        }})
        return
    }
    
    // DELETE + Reload + Audit
}
```

### Anti-Patterns to Avoid

- **Cache nicht neu laden:** Nach Mutation nur DB ändern ohne `LoadCache` → D-06 verletzt; Änderung wirkt erst nach Server-Neustart.
- **D-10-Check ignorieren:** `LoadCache` prüft alle Action-Konstanten. Wenn Reload fehlschlägt wegen D-10, darf das nicht den laufenden Server crashen — nur die Mutation ablehnen.
- **Plattform-Admin-Gate vergessen:** Jeder neue `/admin/role-capabilities/*`-Endpunkt muss `requirePlatformAdminIdentity` als erste Aktion haben.
- **Öffentliche Endpunkte stilllegen ohne Auth-Migration:** `GET /fansubs/:id/members` ist vollständig ohne Auth — ein View-Check dort würde alle unauthentifizierten Requests brechen. Nur Admin-Endpunkte mit bestehendem Auth-Layer gaten (Phase 87 Scope).

---

## Don't Hand-Roll

| Problem | Nicht bauen | Stattdessen | Warum |
|---|---|---|---|
| Cache-Thread-Safety | Eigenen Mutex | `cacheMu sync.RWMutex` in `permissions.go` | Bereits vorhanden, getestet |
| Audit-Log | Eigene Tabelle/Logik | `repository.AuditLogRepository.Write` | Phase-80-Pattern, konform |
| Platform-Admin-Gate | Eigene Auth-Logik | `requirePlatformAdminIdentity` in `platform_admin_authz.go` | Einheitlicher Gate |
| Modal/Bestätigung | Eigenes Modal | `Modal` aus `@/components/ui` | Design-System-Pflicht (D-05) |
| Tabellen-UI | Eigenes Markup | `Table/TableHead/TableBody/TableRow/TableCell` aus `@/components/ui` | Design-System-Pflicht |

---

## Common Pitfalls

### Pitfall 1: D-10-Check schlägt beim Laufzeit-Reload fehl

**Was schiefgeht:** Admin entzieht die letzte Rolle für Action X. `LoadCache` wird aufgerufen, D-10-Check findet Action X in keiner Rolle und keiner standaloneAction → `fmt.Errorf` wird zurückgegeben. Wenn der Handler das als Fatal behandelt, crasht der Server nicht, aber der Cache ist veraltet.

**Wurzel:** `LoadCache` ist für Startup-Fail-Fast designed, nicht für Laufzeit-Toleranz.

**Vermeidung:** Im Revoke-Handler **vor** der DB-Mutation prüfen, ob nach der Änderung noch mindestens 1 Rolle die Action hat (oder sie ist standaloneAction). Commit nur wenn Guard ok. Dann ist `ReloadCache` nach erfolgreicher Mutation immer erfolgreich.

**Frühwarnsignal:** `LoadCache` gibt Fehler zurück, der im Handler geloggt wird ohne den Request zu beenden.

### Pitfall 2: Öffentliche Endpunkte unbeabsichtigt gaten

**Was schiefgeht:** Planner wählt `GET /fansubs/:id/members` als Kandidat — das ist vollständig ohne Auth. Ein `CanFor*`-Check schlägt für alle unauthentifizierten Requests fehl (kein Actor vorhanden).

**Vermeidung:** Nur Endpunkte gaten, die bereits `authMiddleware` haben. Öffentliche Endpunkte explizit als "außerhalb Phase-87-Scope" markieren.

### Pitfall 3: permissionSvc-Referenz nicht in Capability-Handler

**Was schiefgeht:** Neuer `AdminCapabilityHandler` bekommt beim Konstrukt nur `authzRepo` und `auditLogRepo`, aber nicht `permissionSvc`. Cache-Reload nach Mutation ist nicht möglich.

**Vermeidung:** Konstruktor explizit `*permissions.Service` aufnehmen. Verdrahtung in `main.go` analog `adminContentHandler.WithPermissionDeps(permissionSvc, auditLogRepo)`.

### Pitfall 4: Datei überschreitet 450 Zeilen

**Was schiefgeht:** Pflege-UI mit Rollen-Tabelle + Grant-Modal + Revoke-Modal + Fetching-Logik wird >450 Zeilen.

**Vermeidung:** Subkomponenten in separate Dateien (`RoleCapabilityTable.tsx`, Modals) auslagern, analog `UserGlobalRolesTab.tsx` (389 Zeilen bereits nahe am Limit).

---

## Code Examples

### Bestehender CanFor*-Aufruf (Vorlage)

```go
// Source: backend/internal/handlers/admin_content_fansub_releases_handlers.go
result, err := h.permissionSvc.CanForFansubGroup(
    c.Request.Context(), actor, permissions.ActionReleaseView, fansubID,
)
if err != nil {
    writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
    return
}
if !result.Allowed {
    writePermissionDenied(c, result)
    return
}
```

### Bestehende Audit-Write-Vorlage

```go
// Source: backend/internal/handlers/admin_users_mutations_handler.go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "app_user_global_role.assigned",
    TargetType:     "app_user",
    TargetID:       &userID,
    Action:         "assign_global_role",
    Outcome:        "allowed",
    Payload:        map[string]any{"role": role},
})
```

### Bestehende Frontend-API-Funktion (Vorlage)

```typescript
// Source: frontend/src/lib/api.ts — revokeAdminUserGlobalRole
export async function revokeAdminUserGlobalRole(
  userId: number,
  role: string,
): Promise<void> {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/api/v1/admin/users/${userId}/global-roles/${encodeURIComponent(role)}`
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    throw new ApiError(response.status, extractErrorMessage(body, 'Rolle konnte nicht entzogen werden.'))
  }
}
```

### RoleCapabilityMatrix — neuer Endpunkt-Contract (Entwurf)

```
GET /api/v1/admin/role-capabilities
Response:
{
  "roles": [
    {
      "role_code": "fansub_lead",
      "label_de": "Fansub-Lead",
      "actions": [
        { "code": "release.view", "label_de": "Release anzeigen", "category": "release", "granted": true },
        { "code": "fansub_group.edit", "label_de": "Gruppe bearbeiten", "category": "gruppe", "granted": true },
        ...
      ]
    },
    ...
  ],
  "all_actions": [
    { "code": "release.view", "label_de": "Release anzeigen", "category": "release", "sort_order": 10 },
    ...
  ]
}
```

---

## State of the Art

| Alter Ansatz | Aktueller Ansatz | Stand | Impact |
|---|---|---|---|
| Hartkodierte `roleMatrix` in Go | `role_capabilities` in DB + `loadedCache` | Phase 86 (2026-06-18) | Neue Actions ohne Recompile |
| Kein Laufzeit-Reload | Nur Startup-`LoadCache` | Phase 86 (noch kein Reload) | **Phase 87 muss `ReloadCache` nachrüsten** |
| Kein Admin-Interface für Capabilities | Pflege-UI geplant | Phase 87 | Admin kann Capabilities ohne Deploy ändern |

---

## Assumptions Log

| # | Claim | Abschnitt | Risiko bei Fehler |
|---|---|---|---|
| A1 | `ReloadCache` kann durch erneutes `LoadCache` implementiert werden (delegiert) | R-02 | Niedrig — verifiziert, dass `LoadCache` idempotent ist |
| A2 | Öffentliche Endpunkte sind absichtlich außerhalb Phase-87-Scope | R-01 | Mittel — falls Produkt öffentliche Gating will, braucht das optionale Auth-Middleware |
| A3 | `role_definitions`-Tabelle enthält alle Fansub-Rollen mit `label_de` (für UI-Rendering) | R-03 | Niedrig — verifiziert in Migrationen 0085 + 0100 |

**Wenn diese Tabelle leer wäre:** Alle Behauptungen in diesem Research wurden verifiziert oder zitiert. A1–A3 sind geringes Risiko.

---

## Open Questions

1. **Welche konkreten Admin-Lese-Endpunkte sollen in Phase 87 gated werden?**
   - Was wir wissen: Mehrere Admin-Endpunkte laufen heute nur mit Legacy-`requireAdmin` ohne View-`CanFor*`. Kandidaten: `/admin/fansubs/:id/group-members`, `/admin/fansubs/:id/unified-members`, `/admin/fansubs/:id/anime-coverage`.
   - Unklar: Ob der Benutzer alle, einige oder nur neue (noch zu definierende) Endpunkte gaten will.
   - Empfehlung: Im Discuss-Schritt eine konkrete Auswahl treffen und in D-01 festschreiben.

2. **Wie soll der Lockout-Guard bei `standaloneActions` umgehen?**
   - Was wir wissen: `ActionFansubGroupInvitationsAccept` ist eine `standaloneAction` — kein `role_capabilities`-Eintrag. Darf diese über die Pflege-UI überhaupt sichtbar/vergebar sein?
   - Empfehlung: `standaloneActions` in der Pflege-UI als read-only mit Label „Systemaktion" anzeigen, nicht editierbar.

---

## Environment Availability

Phase 87 ist eine reine Code-/Config-Änderungsphase ohne neue externe Abhängigkeiten.

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| PostgreSQL (role_capabilities, action_definitions) | Cache-Reload nach Mutation | ✓ | Migration 0108 existiert | — |
| `permissions.Service` | Cache-Reload | ✓ | Phase-86-Build | — |

---

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Vitest 3 (Frontend) + Go test (Backend) |
| Config file | `frontend/vitest.config.ts` |
| Quick run (Backend) | `cd backend && go test ./internal/permissions/... -count=1` |
| Quick run (Frontend) | `cd frontend && npm test -- --run` |
| Full suite (Backend) | `cd backend && go test ./...` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| D-06 | Cache-Reload nach Mutation wirkt ohne Deploy | unit | `go test ./internal/permissions/... -run TestReloadCache` | ❌ Wave 0 |
| D-07 | Lockout-Guard: Entziehen letzter Action-Holder → 409 | unit | `go test ./internal/handlers/... -run TestRevokeCapabilityLockoutGuard` | ❌ Wave 0 |
| D-08 | Platform-Admin-Gate auf neuen Endpunkten | unit | `go test ./internal/handlers/... -run TestCapabilityEndpointsRequirePlatformAdmin` | ❌ Wave 0 |
| D-04/D-05 | Pflege-UI rendert Rollen mit Actions, nutzt `@/components/ui` | component | `npm test -- --run RoleCapabilityClient` | ❌ Wave 0 |
| D-01 | View-Check an ausgewählten Lese-Endpunkten → 403 für ungated Rollen | integration | `go test ./internal/handlers/... -run TestViewCapabilityEnforcement` | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `backend/internal/permissions/permissions_reload_test.go` — TestReloadCache
- [ ] `backend/internal/handlers/admin_capability_handler_test.go` — TestGrantCapability, TestRevokeCapabilityLockoutGuard, TestCapabilityEndpointsRequirePlatformAdmin
- [ ] `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx` — Render-Test

### Sampling Rate

- **Per Task Commit:** `go test ./internal/permissions/... -count=1 && go test ./internal/handlers/... -run TestCapability -count=1`
- **Per Wave Merge:** `go test ./... && cd frontend && npm test -- --run`
- **Phase Gate:** Full suite grün vor `/gsd:verify-work`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | ja | `requirePlatformAdminIdentity` auf allen neuen Endpunkten |
| V3 Session Management | nein | Keine Session-Verwaltung in Phase 87 |
| V4 Access Control | ja | Platform-Admin-Gate + Lockout-Guard |
| V5 Input Validation | ja | `roleCode` und `actionCode` gegen Whitelist/FK validieren (DB-FK reicht für Action-Code; Role-Code Allowlist im Handler) |
| V6 Cryptography | nein | Keine kryptografischen Operationen |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Unbefugtes Entziehen aller View-Capabilities | Tampering + Elevation | Platform-Admin-Gate + Lockout-Guard |
| Injection über roleCode/actionCode Parameter | Tampering | Parametrisierte SQL-Queries (pgx); DB-FK wirft Error bei ungültigem Code |
| Cache-Inkonsistenz nach Fehler im Reload | Tampering | Reload-Fehler loggen + HTTP 500 zurückgeben, Mutation rückgängig (oder Rollback-Strategie klären) |
| Audit-Log-Lücke bei Failed Reload | Repudiation | Audit-Write vor Reload; selbst wenn Reload fehlschlägt, ist die Mutation auditiert |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: backend/internal/permissions/permissions.go] — vollständige Implementierung von `LoadCache`, `cacheMu`, `loadedCache`, `allKnownActions`, `standaloneActions`
- [VERIFIED: backend/cmd/server/main.go Zeile 127] — einmaliger Startup-`LoadCache`; kein Reload-Mechanismus vorhanden
- [VERIFIED: backend/internal/handlers/admin_users_mutations_handler.go] — Vorlage: Platform-Admin-Gate, Last-Admin-Guard, Audit-Write
- [VERIFIED: frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx] — Vorlage: Modal-Muster, Assign/Revoke-Flow
- [VERIFIED: frontend/src/app/admin/users/UserDetailDrawer.tsx] — Drawer/Tab-Struktur mit Lazy-Load
- [VERIFIED: database/migrations/0108_capability_registry.up.sql] — Schema action_definitions + role_capabilities + Seed
- [VERIFIED: database/migrations/0085_role_definitions_seed.up.sql + 0100] — role_definitions Katalog mit label_de

### Secondary (MEDIUM confidence)
- [VERIFIED: backend/internal/handlers/ — grep CanFor*] — vollständiges Inventar gated vs. ungated Endpunkte
- [VERIFIED: backend/internal/repository/authz_permissions.go] — `LoadRoleCapabilities` implementiert `CacheLoader`-Interface

---

## Metadata

**Confidence breakdown:**
- Cache-Reload-Analyse: HIGH — direkt gegen `permissions.go` und `main.go` verifiziert
- Lese-Pfad-Inventar: HIGH — vollständiger Handler-Scan
- Frontend-Muster-Reuse: HIGH — `UserGlobalRolesTab.tsx` direkt gelesen
- Lockout-Guard-Design: MEDIUM — Konzept abgeleitet aus bestehendem `CountActivePlatformAdmins`-Muster, aber D-10-Interaktion ist neu

**Research date:** 2026-06-18
**Valid until:** 2026-07-18 (stabile Codebasis, kein Fast-Moving-Stack)
