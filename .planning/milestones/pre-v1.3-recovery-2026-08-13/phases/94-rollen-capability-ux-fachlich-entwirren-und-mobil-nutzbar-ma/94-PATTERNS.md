# Phase 94: Rollen-/Capability-UX fachlich entwirren und mobil nutzbar machen - Pattern Map

**Mapped:** 2026-06-30
**Files analyzed:** 18 (neu + geändert)
**Analogs found:** 18 / 18 (alle Bausteine existieren bereits im Repo)

> Kerneinsicht aus RESEARCH: Phase 94 ist überwiegend **Verdrahtung + UX-Komposition**, kein Neubau.
> Echte Neubauten: 1 Server-Guard, 1 Read-Endpunkt, additive API-Felder, 2 UI-Primitives (Switch, Accordion), Komponenten-Splits.

---

## File Classification

| Neu/Geändert | Datei | Rolle | Datenfluss | Closest Analog | Match |
|---|---|---|---|---|---|
| GEÄNDERT | `backend/internal/handlers/admin_capability_handler.go` | handler | request-response | (self) Lockout-Guard im selben File | exact |
| GEÄNDERT | `backend/internal/repository/authz_capability_mutations.go` | repository | CRUD | (self) `ListCapabilityMatrix` | exact |
| GEÄNDERT | `backend/internal/handlers/admin_capability_handler_test.go` | test | unit | (self) `TestRevokeCapabilityLastActionGuard` | exact |
| NEU | `backend/internal/handlers/…role_definitions_handler.go` (Read-Endpunkt) | handler | request-response | `fansub_hist_group_member_roles_handler.go:73` (`ListHistGroupMemberRoles`) | role+flow |
| NEU | Repo-Methode `ListByContext` (in `hist_group_member_roles_repository.go` o. neuem authz-File) | repository | CRUD (read) | `hist_group_member_roles_repository.go:231` (`RoleCodeExistsForContext`) | role+flow |
| GEÄNDERT | `backend/cmd/server/admin_routes.go` | route | request-response | `admin_routes.go:193,232` | exact |
| NEU | Backend-Test group_history-Read + Assignable-Anreicherung | test | unit | `admin_capability_handler_test.go` | role+flow |
| GEÄNDERT | `shared/contracts/admin-capabilities.yaml` | config/contract | — | (self) `RoleEntry` Schema `:208` | exact |
| GEÄNDERT | `frontend/src/types/admin-capability.ts` | model | — | (self) `RoleEntry` `:16` | exact |
| GEÄNDERT | `frontend/src/lib/api.ts` | utility (api-client) | request-response | (self) `listRoleCapabilities` `:9189` / `listMemberRoles` `:7979` | exact |
| NEU | `frontend/src/components/ui/Switch.tsx` | component (primitive) | event-driven | `frontend/src/components/ui/Tabs.tsx` (role-button-Primitive) | role-match |
| NEU | `frontend/src/components/ui/Accordion.tsx` | component (primitive) | event-driven | `Tabs.tsx` + `Card.tsx` | role-match |
| GEÄNDERT | `frontend/src/components/ui/index.ts` | config (barrel) | — | (self) | exact |
| GEÄNDERT | `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` (+ Split) | component | request-response | (self) | exact |
| NEU | Capability Master-Detail-Unterkomponenten | component | request-response | `RoleCapabilityTable.tsx` + `Card`/`Drawer responsiveSheet` | role-match |
| GEÄNDERT | `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx` | test | unit | (self) | exact |
| GEÄNDERT + SPLIT | `…/edit/GroupMembersTab.tsx` (1209 Z.) | component | CRUD/request-response | `FansubAppMembersSection.tsx` (bereits getrennt strukturiert) | role-match |
| GEÄNDERT + SPLIT | `…/edit/FansubAppMembersSection.tsx` (1064 Z.) | component | CRUD/request-response | (self, Label-Rename) | exact |

---

## Pattern Assignments

### `admin_capability_handler.go` — Server-Guard `role_not_assignable` (D-05, AC 7) [handler, request-response]

**Analog (im selben File):** der bestehende Lockout-Guard `RevokeCapability` `:138-146`. Identische Struktur (Vorab-Check → `c.JSON(status, gin.H{"error": gin.H{"code","message"}})` → `return`) für den neuen Guard wiederverwenden.

**Importe bereits vorhanden** (`:3-11`): `net/http`, `team4s.v3/backend/internal/permissions`, `github.com/gin-gonic/gin`. `permissions.IsKnownFansubGroupRole` ist sofort nutzbar — kein neuer Import.

**Vorhandenes Guard-Muster (Lockout, `:138-146`) — Vorbild für den neuen Guard:**
```go
if count <= 1 && !permissions.IsStandaloneAction(permissions.Action(actionCode)) {
    c.JSON(http.StatusConflict, gin.H{
        "error": gin.H{
            "code":    "lockout_guard",
            "message": "Diese Berechtigung kann nicht entzogen werden, da sonst keine Rolle mehr über sie verfügt.",
        },
    })
    return
}
```

**Neuer Guard — einzubauen in BEIDE Mutationspfade** (`GrantCapability` nach `:83`, `RevokeCapability` nach `:127`, jeweils VOR dem Lockout-Guard / DB-Mutation):
```go
if !permissions.IsKnownFansubGroupRole(roleCode) {
    c.JSON(http.StatusUnprocessableEntity, gin.H{
        "error": gin.H{
            "code":    "role_not_assignable",
            "message": "Diese Rolle ist eine historische bzw. nicht-zuweisbare Rolle und kann keine Berechtigungen erhalten.",
        },
    })
    return
}
```
Status **422** (nicht 409 — kollidiert mit `lockout_guard`). 422 ist Konvention für semantisch ungültige Eingaben (vgl. `fansub_hist_group_member_roles_handler.go:158,191,206`).

**Assignable-Anreicherung der Matrix (D-04)** — im Handler nach `ListCapabilityMatrix`, vor `c.JSON` (`ListCapabilityMatrix` `:56-63`), weil das Repo `permissions` nicht kennen darf:
```go
for i := range matrix.Roles {
    matrix.Roles[i].Assignable = permissions.IsKnownFansubGroupRole(matrix.Roles[i].RoleCode)
}
```

---

### `authz_capability_mutations.go` — DTO-Erweiterung `Assignable`/`Contexts` (D-04) [repository, CRUD]

**Analog (im selben File):** `CapabilityMatrixRoleEntry` `:29-34`. Additive Felder ergänzen (kein Breaking Change):
```go
type CapabilityMatrixRoleEntry struct {
    RoleCode   string                        `json:"role_code"`
    LabelDE    string                        `json:"label_de"`
    Actions    []CapabilityMatrixActionState `json:"actions"`
    Assignable bool                          `json:"assignable"`            // NEU (Handler füllt)
    Contexts   []string                      `json:"contexts,omitempty"`    // NEU (Query liefert rd.contexts)
}
```

**Query-Erweiterung** (`ListCapabilityMatrix` `:59-74`): `rd.contexts` in SELECT aufnehmen und in den Scan-/Aggregations-Block (`:89-128`) durchreichen. `Assignable` NICHT im Repo berechnen (Repo darf nicht von `permissions` abhängen — siehe Kommentar `:52`).

**Wichtig (Pitfall 1 / D-06):** Diese Struct-Änderung MUSS im selben Task mit `admin-capabilities.yaml`, `admin-capability.ts` und der Test-Fixture synchron erfolgen.

---

### Neuer Read-Endpunkt `GET /admin/role-definitions?context=group_history` (D-07, AC 1/3) [handler + repository]

**Handler-Analog:** `fansub_hist_group_member_roles_handler.go` → `ListHistGroupMemberRoles` `:73-115`.

**Auth-Gate-Muster (`:85-94`) — übernehmen** (Open Question 3: `CanForFansubGroup(...MembersView)` ist konsistenter, da der Dialog im Fansub-Edit-Kontext lebt):
```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
if err != nil { writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden."); return }
if !result.Allowed {
    auditPermissionDenied(c, h.auditLogRepo, identity, "…denied", &fansubID, "…", nil, permissions.ActionFansubGroupMembersView, result)
    writePermissionDenied(c, result); return
}
```
Response-Envelope-Muster: `c.JSON(http.StatusOK, gin.H{"data": items})` (`:114`).

**Repo-Methode-Analog:** `hist_group_member_roles_repository.go:231` (`RoleCodeExistsForContext`) — gleiche `$N = ANY(contexts)`-Mechanik, jetzt als Liste. **Kuratiert** (Pitfall 2 / Open Question 1 — Whitelist `founder,leader,co_leader,project_manager`, vor Implementierung mit User bestätigen):
```go
const q = `
  SELECT code, label_de, sort_order
  FROM role_definitions
  WHERE 'group_history' = ANY(contexts)
    AND code = ANY($1)
  ORDER BY sort_order, code`
```
Begründung Whitelist: Migration 0103 markiert ALLE App-Rollen zusätzlich mit `group_history` → naives `ANY(contexts)` liefert auch `translator`/`encoder`.

**api.ts-Helper-Analog:** `listMemberRoles` (`api.ts:7979`) für den Fetch-Aufbau (GET, `data`-Envelope-Unwrap).

---

### `admin_routes.go` — Route-Registrierung [route, request-response]

**Analog (exakt):** `:193` (`v1.GET("/admin/fansubs/:id/member-roles", auth, deps.histGroupMemberRolesHandler.ListHistGroupMemberRoles)`) und `:232` (`v1.GET("/admin/role-capabilities", auth, deps.adminCapabilityHandler.ListCapabilityMatrix)`).

Neue Zeile analog: `v1.GET("/admin/fansubs/:id/role-definitions", auth, deps.…Handler.ListRoleDefinitionsByContext)` (Pfad im Fansub-Scope, passend zum gewählten `CanForFansubGroup`-Gate).

**Runtime-Hinweis:** Neue Go-Route erscheint erst nach `docker compose up -d --build team4sv30-backend` (Backend :8092) — sonst API-404 trotz korrektem Code.

---

### Backend-Tests (AC 10) [test, unit]

**Analog (exakt):** `admin_capability_handler_test.go`.
- Stub-Muster: `stubCapabilityAuthzRepo` `:22-59` (Struct-Literale, kein Mock-Framework).
- Context-Helper: `makeCapabilityTestContext` `:84-91` + `c.Params = gin.Params{…}` (`:116-119`).
- Assertion-Muster für Fehlercode: `TestRevokeCapabilityLastActionGuard` `:144-195` — Body in `struct{ Error struct{ Code string } }` parsen und `body.Error.Code` prüfen. Für den neuen Guard: Status `422`, Code `role_not_assignable`, Grant **und** Revoke (Pitfall 4).
- Negativ-Rollen für Tests: `founder`, `co_leader` (nicht in `fansubGroupRoleCatalog`); Positiv: `fansub_lead` (assignable).

---

### `admin-capabilities.yaml` — Contract (D-06, AC 11) [contract]

**Analog (im selben File):** `RoleEntry` Schema `:208-221`. Additiv, `required`-Liste (`:210`) NICHT erweitern:
```yaml
RoleEntry:
  required: [role_code, label_de, actions]   # assignable NICHT required → rückwärtskompatibel
  properties:
    # … role_code, label_de, actions bestehen …
    assignable:
      type: boolean
      description: Ob die Rolle Capabilities erhalten darf (App-Gruppenrolle).
    contexts:
      type: array
      items: { type: string }
      description: role_definitions.contexts (für Kontext-Badges).
```
Optional: neues Schema für `GET /admin/.../role-definitions`-Response (Liste aus `{code,label_de,sort_order}`) + Guard-Fehlercode `role_not_assignable` dokumentieren.

---

### `admin-capability.ts` — Frontend-Typ (D-06) [model]

**Analog (im selben File):** `RoleEntry` `:16-20`. Additiv optional:
```ts
export interface RoleEntry {
  role_code: string;
  label_de: string;
  actions: RoleActionState[];
  assignable?: boolean;   // NEU
  contexts?: string[];    // NEU
}
```
Plus neuer Typ `RoleDefinitionOption { code: string; label_de: string; sort_order: number }` für den group_history-Read.

---

### `api.ts` — Helper (D-06) [utility]

**Analog (exakt):** `listRoleCapabilities` `:9189-9213` (Matrix deserialisiert generisch → keine Fetch-Änderung nötig, nur Typkonformität). Fehlercode-Durchreichung: `parseApiErrorPayload` + `new ApiError(status, msg, null, code, details)` (`:9201-9207`) — `ApiError.code` trägt `role_not_assignable` automatisch ins Frontend.

Neuer Helper `listGroupHistoryRoleDefinitions(fansubId)` nach Muster `listMemberRoles` (`:7979`) — GET, `data`-Envelope.

---

### `Switch.tsx` (NEU, D-12) [component / ui-primitive, event-driven]

**Analog:** `Tabs.tsx` (`frontend/src/components/ui/Tabs.tsx`) — bestes Vorbild für ein interaktives Primitive mit nativem `<button>` + ARIA-Rolle + `styles`-Modul.

**Konventionen aus `Tabs.tsx` übernehmen:**
- `'use client'` Direktive (`:1`).
- Import: `import { classNames } from './classNames'` + `import styles from './ui.module.css'` (`:6-7`).
- Props-Interface exportieren (`export interface TabsProps`, `:16`).
- Native Elemente erlaubt, weil Primitive-Definition (CLAUDE.md-Ausnahme); Konsumenten nutzen nur das Primitiv.

**Muster:** `<button type="button" role="switch" aria-checked={checked} onClick={onChange}>` (analog `role="tab" aria-selected` in `Tabs.tsx:34-46`). Touch-Ziel ≥ 44 px via CSS in `ui.module.css`. Export in `index.ts` ergänzen (`export * from './Switch'`).

---

### `Accordion.tsx` (NEU, D-12) [component / ui-primitive, event-driven]

**Analog:** `Tabs.tsx` (State-/ARIA-Muster) + `Card.tsx` (`frontend/src/components/ui/Card.tsx`) für die Container-Komposition (Header + Body, `variant`-Prop-Muster `:6-14`).

**Konventionen:** wie `Tabs.tsx` (`useId`/`useState`, `classNames`, `ui.module.css`). Header als `<button aria-expanded>`-Toggle (statt horizontaler Tab-Leiste — `Tabs` ist bei 390 px ungeeignet, Anti-Pattern in RESEARCH). Export in `index.ts`.

---

### `RoleCapabilityClient.tsx` + Master-Detail-Split (D-11/D-12/D-13) [component, request-response]

**Analog (self + Geschwister):** aktuelle `RoleCapabilityClient.tsx` (243 Z.) zeigt das Lade-/Fehler-/Modal-Muster, das beizubehalten ist:
- Datenlade-Hook: `loadData` `:53-69` (try → `ApiError`-Branch → finally).
- Lade-/Fehlerzustand: `<LoadingState … />` / `<ErrorState … />` (`:165-171`).
- **409-Inline-Fehler-Muster** (`handleRevokeConfirm` `:149-160`) — für den neuen 422-`role_not_assignable`-Fall analog erweitern (`err.status === 422` → spezifischer Inline-Text).

**Layout-Umbau (Master-Detail):**
- **Master (links):** Rollenliste als `Card`-Rows (`Card variant="interactive"`) mit Kontext-`Badge`.
- **Detail (rechts):** Kategorien als `Accordion`, pro Capability eine Row mit `Switch`.
- **Mobile (390 px):** Detail im `Drawer variant="responsiveSheet"` (`Drawer.tsx:17,34` — Bottom-Sheet < 760 px). Keine horizontale Matrix.
- **Split-Pflicht:** Master-Liste, Detail-Panel und Kategorie-Accordion in eigene Dateien auslagern, damit jede ≤ 450 Z. bleibt (analog der bereits getrennten `RoleCapabilityTable.tsx`/`GrantCapabilityModal.tsx`/`RevokeCapabilityModal.tsx`).

**Badge-Ableitung (D-13)** — `Badge.tsx` (6 Varianten `:6`):
```tsx
const variant = role.assignable ? 'info' : 'muted'
const label = role.assignable ? 'Aktive App-Rolle' : 'Historische Rolle'
<Badge variant={variant}>{label}</Badge>
```
Nicht-assignable Rollen: entweder ausblenden oder klar markiert + Switch disabled (visuell), Server-Guard bleibt die echte Absicherung (D-05).

---

### `RoleCapabilityClient.test.tsx` (AC 10) [test, unit]

**Analog (self):** vorhandene Datei zeigt die exakten Konventionen:
- `// @vitest-environment jsdom` (`:1`), `@testing-library/react` (`:9`).
- Fixture `sampleMatrix` `:14-51` — um `assignable` pro Rolle ergänzen (mind. eine `assignable:false`-Hist-Rolle).
- 409-Mock-Muster `:82-85` (`vi.spyOn(apiModule, "revokeRoleCapability").mockRejectedValueOnce(new apiModule.ApiError(409, …, null, "lockout_guard"))`) — für 422-`role_not_assignable`-Verhalten und Disabled-Switch adaptieren.

---

### `GroupMembersTab.tsx` (D-07/D-08/D-09, Split) [component, CRUD]

**Analog:** `FansubAppMembersSection.tsx` (Geschwister im selben `edit/`-Ordner) als Vorbild für den Extraktions-Schnitt (eigene Section-/Editor-/Modal-Komponenten, gemeinsames `styles`-Modul).

**Realer Defekt (RESEARCH-Korrektur):** Der Hist-Dialog nutzt bereits das `Select`-Primitiv (`:1089-1102`) — D-08 ist erfüllt. **Nur die Rollenquelle** ist falsch: `:1097` `FANSUB_GROUP_ROLE_OPTIONS.map` → ersetzen durch die group_history-Liste (neuer api.ts-Helper / Read-Endpunkt). `Select`-Primitiv beibehalten:
```tsx
// AKTUELL (:1096-1101) — falsche Quelle:
<option value="">Rolle auswählen</option>
{FANSUB_GROUP_ROLE_OPTIONS.map((option) => (
  <option key={option.code} value={option.code}>{option.label}</option>
))}
// ZIEL: über group_history-Rollen (founder/leader/co_leader/project_manager) mappen.
```
**Sprache (D-09):** Labels klar historisch formulieren ("Frühere Funktion in der Gruppe"), keine Begriffe die wie aktive App-Rechte wirken. Umlaute korrekt.
**Split-Pflicht (Pitfall 3):** Split ZUERST in eigenem Task (Datei ist 1209 Z.) — z. B. historischer Rollen-Dialog als eigene Komponente — bevor die Rollenquelle geändert wird.

---

### `FansubAppMembersSection.tsx` (D-10, Split) [component, CRUD]

**Analog (self):** nutzt `FANSUB_GROUP_ROLE_OPTIONS` korrekt für aktive Rollen — bleibt so (D-01). Nur Label-Rename:
- `:501` "…welche Aufgaben die Person übernimmt." / `:860,915` "Aufgaben…" / `:1005-1006` Section "Rollen" → konsequent auf **"Aktive Rechte"** (bevorzugt) bzw. "Aufgaben & Rechte" umstellen. Keine historischen Rollen im aktiven Dialog.
- Umlaute beachten.
**Split-Pflicht (Pitfall 3):** Datei ist 1064 Z. → vor inhaltlicher Änderung in Unterkomponenten splitten (Member-Editor-Panel, Modals).

---

## Shared Patterns

### Server-Guard / kontrollierter Fehler (gilt für alle Capability-Mutationen)
**Source:** `admin_capability_handler.go:138-146` (Lockout-Guard).
**Apply to:** neuer `role_not_assignable`-Guard (Grant + Revoke). Vorab-Check VOR DB-Mutation → `c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"code":…, "message":…}})` → `return`.

### Permission-Gate im Read-Handler
**Source:** `fansub_hist_group_member_roles_handler.go:85-94` (`CanForFansubGroup` + `writePermissionDenied` + `auditPermissionDenied`).
**Apply to:** neuer group_history-Read-Endpunkt.

### Assignable-Wahrheitsquelle (kein Schema-Change)
**Source:** `permissions.IsKnownFansubGroupRole` / `fansubGroupRoleCatalog` (`permissions.go:200-211,303-305`).
**Apply to:** Guard (D-05), Matrix-Anreicherung (D-04), Badge-Ableitung (D-13).

### Fehlercode-Durchreichung ins Frontend
**Source:** `api.ts:9201-9207` (`parseApiErrorPayload` → `new ApiError(status, msg, null, code, details)`) + `RoleCapabilityClient.tsx:149-160` (status-spezifischer Inline-Fehler).
**Apply to:** 422-`role_not_assignable`-Handling im Client.

### UI-Primitive-Konvention (globales Design-System, CLAUDE.md Pflicht)
**Source:** `Tabs.tsx` (`'use client'`, `classNames`, `ui.module.css`, exportiertes Props-Interface, native Elemente nur im Primitiv) + `index.ts`-Barrel-Export.
**Apply to:** neue `Switch.tsx` / `Accordion.tsx`. Konsumenten dürfen KEINE nativen `<button>/<input type=checkbox>` bauen (ESLint `no-restricted-syntax`).

### Mobile-Bottom-Sheet
**Source:** `Drawer.tsx:17,34` (`variant="responsiveSheet"`, < 760 px Bottom-Sheet).
**Apply to:** Capability-Detail bei 390 px (D-12/D-14).

### Contract+Typen+api.ts+Test synchron (D-06/AC 11)
**Source:** Quartett `authz_capability_mutations.go` (Struct) ↔ `admin-capabilities.yaml:208` (Schema) ↔ `admin-capability.ts:16` (Interface) ↔ `RoleCapabilityClient.test.tsx:14` (Fixture).
**Apply to:** `assignable`/`contexts`-Erweiterung — in EINEM Task, neue Felder additiv (keine `required`-Erweiterung).

---

## No Analog Found

Keine. Alle benötigten Rollen haben einen bestehenden Analog im Repo. Die einzige MEDIUM-Confidence betrifft NICHT einen fehlenden Analog, sondern offene Produktentscheidungen:
- group_history-Rollen-Whitelist (Open Question 1) — Mechanik-Analog `RoleCodeExistsForContext` existiert.
- Kategorie-Display-Mapping 3→5 (Open Question 2) — reines Frontend-Mapping, kein Code-Analog nötig.

---

## Metadata

**Analog search scope:** `backend/internal/handlers/`, `backend/internal/repository/`, `backend/internal/permissions/`, `backend/cmd/server/`, `frontend/src/components/ui/`, `frontend/src/app/admin/role-capabilities/`, `frontend/src/app/admin/fansubs/[id]/edit/`, `frontend/src/lib/api.ts`, `frontend/src/types/`, `shared/contracts/`
**Files scanned:** ~16 gelesen
**Pattern extraction date:** 2026-06-30
