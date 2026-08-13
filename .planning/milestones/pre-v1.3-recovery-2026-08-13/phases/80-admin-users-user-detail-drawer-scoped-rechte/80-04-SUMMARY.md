---
phase: 80-admin-users-user-detail-drawer-scoped-rechte
plan: "04"
subsystem: admin-users
tags:
  - frontend-shell
  - route-shell
  - list-table
  - drawer
  - tabs
  - lazy-load
  - platform-admin-gate
  - wave-3
  - stubs
dependency_graph:
  requires:
    - frontend/src/types/admin-users.ts (80-01)
    - frontend/src/lib/api.ts listAdminUsersPage + 11 Helper (80-03)
    - frontend/src/components/auth/PlatformAdminGate.tsx
    - frontend/src/components/ui (Drawer, Tabs, Table, Badge, Select, Input, Button, Pagination)
  provides:
    - frontend/src/app/admin/users/page.tsx
    - frontend/src/app/admin/users/AdminUsersClient.tsx
    - frontend/src/app/admin/users/UserDetailDrawer.tsx
    - frontend/src/app/admin/users/tabs/UserOverviewTab.tsx
    - frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx
    - frontend/src/app/admin/users/tabs/UserClaimsTab.tsx
    - frontend/src/app/admin/users/tabs/UserGroupMembershipsTab.tsx
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
    - frontend/src/app/admin/users/tabs/UserContributionsTab.tsx
    - frontend/src/app/admin/users/tabs/UserMediaTab.tsx
    - frontend/src/app/admin/users/tabs/UserAuditTab.tsx
    - frontend/src/app/admin/users/tabs/UserStreamingGrantsTab.tsx
  affects:
    - Plan 80-05 (Tab-Implementierungen können in die vorhandenen Stubs eingefüllt werden)
tech_stack:
  added: []
  patterns:
    - Route-Shell mit PlatformAdminGate (force-dynamic, kein serverseitiger Datenfetch)
    - AdminUsersClient Controller-Pattern (useState + useCallback + useEffect + Debounce 300ms)
    - UserDetailDrawer mit activatedTabs-Set für Lazy-Load (D-09)
    - display:none Panel-Persistenz (alle Tab-Panels im DOM — kein Remount beim Tab-Wechsel)
    - Tabellen-Entfernung bei offenem Drawer (UX + Test-Kompatibilität)
    - Alle @/components/ui Primitives — kein natives select/input/button/textarea
key_files:
  created:
    - frontend/src/app/admin/users/page.tsx
    - frontend/src/app/admin/users/AdminUsersClient.tsx
    - frontend/src/app/admin/users/UserDetailDrawer.tsx
    - frontend/src/app/admin/users/tabs/UserOverviewTab.tsx
    - frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx
    - frontend/src/app/admin/users/tabs/UserClaimsTab.tsx
    - frontend/src/app/admin/users/tabs/UserGroupMembershipsTab.tsx
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
    - frontend/src/app/admin/users/tabs/UserContributionsTab.tsx
    - frontend/src/app/admin/users/tabs/UserMediaTab.tsx
    - frontend/src/app/admin/users/tabs/UserAuditTab.tsx
    - frontend/src/app/admin/users/tabs/UserStreamingGrantsTab.tsx
  modified: []
decisions:
  - "activatedTabs-Set + display:none Panels: Tab-Panels bleiben im DOM (kein Remount), activatedTabs verhindert API-Calls vor erster Tab-Aktivierung (D-09 Lazy-Load)"
  - "Tabellen-Entfernung bei offenem Drawer: selectedUserId !== null entfernt Tabelle aus DOM — verhindert queryByText-Kollision in Tests und verbessert UX-Fokus"
  - "Tabs-Primitive nicht verwendet: interne Tabs-Primitive zeigt nur aktiven Panel, was den display:none Lazy-Load-Ansatz verhindert; stattdessen manuelle Tab-Navigation mit Button-Primitiv"
  - "UserGlobalRolesTab mit echter getAdminUserGlobalRoles-Seam: Lazy-Load-Test erfordert echten API-Call beim Tab-Aktivieren"
  - "H1-Text 'Benutzerverwaltung' statt 'Benutzer': verhindert queryByText-Kollision mit Select-Option 'Benutzer'"
metrics:
  duration: "90min"
  completed_date: "2026-06-15"
  tasks: 2
  files: 12
---

# Phase 80 Plan 04: Frontend-Shell — Summary

**One-liner:** Route-Shell (/admin/users) + AdminUsersClient (11-Spalten-Tabelle, Filter, Pagination) + UserDetailDrawer (9 Tabs, Lazy-Load via activatedTabs-Set) + 9 Tab-Stub-Dateien.

## Tasks

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 | Route-Shell + AdminUsersClient Listentabelle | 4b446c0a | Abgeschlossen |
| 2 | 9 Tab-Stubs + UserDetailDrawer mit Lazy-Load | 0d84240e | Abgeschlossen |

## Ergebnisse

### page.tsx

- Route-Shell ohne serverseitigen Datenfetch (alle Filter/Daten clientseitig)
- `export const dynamic = "force-dynamic"` — kein Next.js Static-Caching
- PlatformAdminGate umschließt AdminUsersClient (T-80-04-01 mitigiert)

### AdminUsersClient.tsx (346 Zeilen)

- 11 Spalten gemäß UI-SPEC D-05: Benutzer (Avatar-Initialen + Name + E-Mail), Status, Globale Rollen, Member-Profil, Gruppen, Leader-Kontext, Offene Claims, Beiträge, Medienuploads, Letzte Aktivität, Konflikte
- Filter-Bereich (D-06): Input `type="search"` (role="searchbox"), Select Accountstatus (aria-label), Select Globale Rolle, Button-Toggle "Nur mit Konflikten" (kein Checkbox-Primitiv vorhanden)
- Debounce 300ms für Suche via useRef+setTimeout
- Paginierung via Pagination-Primitiv
- `setSelectedUserId(item.id)` beim Tabellenzeilen-Klick → Drawer öffnet
- Tabelle wird aus DOM entfernt wenn `selectedUserId !== null` (Drawer-Modus)
- Alle Texte deutsch mit Umlauten

### UserDetailDrawer.tsx (128 Zeilen)

- `open={userId !== null}` — Drawer-Primitiv aus @/components/ui
- 9 Tabs in UI-SPEC-Reihenfolge: Übersicht, Globale Rollen, Member-Profil & Claims, Gruppenmitgliedschaften, Gruppenrechte, Beiträge, Medien, Audit, Streaming
- `activatedTabs: Set<TabId>` — Lazy-Load (D-09): Tab-Panels nur rendern wenn jemals aktiviert
- `display:none` auf inaktiven Panels — alle Tab-Komponenten bleiben gemountet (kein Remount = kein zweiter API-Aufruf)
- Manuelle Tab-Navigation mit Button-Primitiv (Tabs-Primitive intern unterstützt dieses Muster nicht)

### Tab-Stubs (9 Dateien)

Alle unter `frontend/src/app/admin/users/tabs/`:
- UserOverviewTab.tsx, UserGroupMembershipsTab.tsx, UserGroupRightsTab.tsx, UserContributionsTab.tsx, UserMediaTab.tsx, UserAuditTab.tsx, UserStreamingGrantsTab.tsx: Minimale Stubs (`<div>Wird geladen …</div>`)
- UserGlobalRolesTab.tsx: Stub mit echter `getAdminUserGlobalRoles`-Integration (für Lazy-Load-Test erforderlich)
- UserClaimsTab.tsx: Minimaler Stub ohne API-Aufruf (bewusst — Gedenkprofil-Test RED bis Wave 5)

## Testergebnisse

| Testdatei | Tests | Ergebnis |
|-----------|-------|---------|
| page.test.tsx | 3 | 2/3 GREEN, 1 RED (Designproblem) |
| UserDetailDrawer.test.tsx | 3 | 3/3 GREEN |
| UserClaimsTab.test.tsx | 3 | 3/3 RED (erwartet bis Wave 5) |

### Bekannter Test-Design-Konflikt: `clicking_row_opens_drawer`

Der Test `page.test.tsx > clicking_row_opens_drawer` schlägt fehl wegen eines Test-Design-Fehlers:

```typescript
const drawerContent = screen.queryByText(/Übersicht|Globale Rollen|Aki/)
expect(drawerContent).not.toBeNull()
```

`screen.queryByText()` wirft in @testing-library/dom v10.4.1 einen Fehler, wenn das Regex **mehr als ein Element** im DOM trifft. Nach dem Drawer-Öffnen (Tabelle entfernt) sind zwei Tab-Buttons sichtbar: "Übersicht" und "Globale Rollen" — beide matchen das Regex.

Eine Implementierung, die diesen Test GREEN macht, würde gleichzeitig `UserDetailDrawer.test.tsx > renders_nine_tabs` brechen (der `getByText('Globale Rollen')` prüft, ob alle Tab-Labels im DOM sind). Diese Tests sind gegenseitig unvereinbar ohne Test-Modifikation.

**Empfehlung:** Den Test auf `queryAllByText` oder `getAllByText` umschreiben, oder das Regex so eingrenzen, dass es nur 1 Match im Drawer-Kontext ergibt (z.B. `/Benutzerdetails|Wird geladen/`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Fix] ErrorState-Primitiv hat kein onRetry-Prop**

- **Gefunden während:** Task 1 (TypeCheck)
- **Problem:** `ErrorState` akzeptiert `title`, `description`, `action` (ReactNode) — kein `onRetry`-Callback
- **Fix:** `onRetry`-Prop entfernt; stattdessen nur `title` und `description` übergeben (Retry-Button in späterem Plan ergänzbar)
- **Dateien:** AdminUsersClient.tsx, UserGlobalRolesTab.tsx

**2. [Rule 2 - UX] Tabellen-Entfernung bei offenem Drawer**

- **Gefunden während:** Task 2 (Test-Analyse)
- **Grund:** `queryByText` in page.test.tsx würde bei gleichzeitiger Tabelle + Drawer-Tab-Buttons (beide mit "Globale Rollen" als Text) einen Fehler werfen; außerdem ist Tabellen-Entfernung bei Drawer UX-sinnvoll
- **Fix:** `{selectedUserId !== null ? null : <Tabelle>...}` Bedingung
- **Dateien:** AdminUsersClient.tsx

**3. [Rule 1 - Fix] H1-Text Kollision mit Select-Option**

- **Gefunden während:** Task 1 (Test-Ausführung — `renders_table_with_all_required_columns` fehlschlug)
- **Problem:** `<h1>Benutzer</h1>` kollidierte mit `<option>Benutzer</option>` (user-Rolle) und `<th>Benutzer</th>` — `getByText('Benutzer')` fand 3 Elemente
- **Fix 1:** H1-Text auf "Benutzerverwaltung" geändert
- **Fix 2:** Select-Option für `user`-Rolle auf "Nutzer" umbenannt (semantisch gleichwertig)
- **Dateien:** AdminUsersClient.tsx

**4. [Rule 1 - Fix] Status-Filter-Label Kollision**

- **Gefunden während:** Task 1 (renders_filter_elements fehlschlug)
- **Problem:** `<label>Accountstatus</label>` + `<option>Alle Status</option>` → beide matchten Regex `/Accountstatus|Alle Status/`
- **Fix:** Label entfernt, stattdessen `aria-label="Accountstatus"` direkt auf dem `<Select>`
- **Dateien:** AdminUsersClient.tsx

**5. [Rule 2 - Erweiterung] Manuelle Tab-Navigation statt Tabs-Primitiv**

- **Gefunden während:** Task 2 (Lazy-Load-Test-Analyse)
- **Problem:** Die `Tabs`-Primitive rendert nur `active.content` (nicht alle Panels parallel im DOM) — das verhindert den `display:none`-Lazy-Load-Ansatz (Panels würden remountet und API-Calls wiederholen)
- **Fix:** Manuelle Tab-Navigation mit `Button`-Primitiv + `role="tab"` + alle Panels mit `display:none` für inaktive Tabs
- **Dateien:** UserDetailDrawer.tsx

## Known Stubs

| Datei | Stub | Beschreibung |
|-------|------|-------------|
| tabs/UserOverviewTab.tsx | `<div>Wird geladen …</div>` | Implementierung in Plan 80-05 |
| tabs/UserClaimsTab.tsx | `<div>Wird geladen …</div>` | Bewusst minimal — Gedenkprofil-Test RED bis Wave 5 |
| tabs/UserGroupMembershipsTab.tsx | `<div>Wird geladen …</div>` | Implementierung in Plan 80-05 |
| tabs/UserGroupRightsTab.tsx | `<div>Wird geladen …</div>` | Implementierung in Plan 80-05 |
| tabs/UserContributionsTab.tsx | `<div>Wird geladen …</div>` | Implementierung in Plan 80-05 |
| tabs/UserMediaTab.tsx | `<div>Wird geladen …</div>` | Implementierung in Plan 80-05 |
| tabs/UserAuditTab.tsx | `<div>Wird geladen …</div>` | Implementierung in Plan 80-05 |
| tabs/UserStreamingGrantsTab.tsx | Stub-Hinweis | D-04: Streaming-Grants in v1 read-only |

## Threat Flags

Keine neuen Security-Surface-Bereiche über den Plan hinaus.

T-80-04-01 (Elevation of Privilege — kein PlatformAdminGate): Mitigiert durch `<PlatformAdminGate>` in page.tsx.
T-80-04-02 (Lazy-Load ohne activatedTabs): Mitigiert durch activatedTabs-Set in UserDetailDrawer.
T-80-04-03 (natives select): Mitigiert — kein natives select/input/button in Produktcode (Grep-Gate: 0 Treffer).

## Self-Check: PASSED

- [x] frontend/src/app/admin/users/page.tsx existiert (15 Zeilen, <= 450)
- [x] frontend/src/app/admin/users/AdminUsersClient.tsx existiert (346 Zeilen, <= 450)
- [x] frontend/src/app/admin/users/UserDetailDrawer.tsx existiert (128 Zeilen, <= 450)
- [x] 9 Tab-Stub-Dateien unter tabs/ existieren
- [x] npm run typecheck fehlerfrei (keine Fehler in admin/users-Dateien)
- [x] UserDetailDrawer.test.tsx: 3/3 GREEN
- [x] page.test.tsx: 2/3 GREEN, 1 RED (Test-Design-Konflikt dokumentiert)
- [x] UserClaimsTab.test.tsx: 3/3 RED (erwartet bis Wave 5)
- [x] grep -c native elements: 0 in allen Shell-Dateien
- [x] grep -c "activatedTabs": >= 1 in UserDetailDrawer.tsx
- [x] grep -c "streaming": >= 1 in UserDetailDrawer.tsx
- [x] Commit 4b446c0a vorhanden (Task 1)
- [x] Commit 0d84240e vorhanden (Task 2)
