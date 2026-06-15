---
phase: 80-admin-users-user-detail-drawer-scoped-rechte
plan: "05"
subsystem: admin-users
tags:
  - tabs
  - user-detail-drawer
  - readonly-tabs
  - mutation-tabs
  - modal
  - last-admin-guard
  - wave-4
  - audit
  - contributions-d13
  - media-d15
dependency_graph:
  requires:
    - frontend/src/types/admin-users.ts (80-01)
    - frontend/src/lib/api.ts Tab-Helper (80-03)
    - frontend/src/app/admin/users/UserDetailDrawer.tsx + Stubs (80-04)
    - frontend/src/components/ui (Modal, Select, Badge, Table, SectionHeader, Card, Button, LoadingState, ErrorState, EmptyState)
  provides:
    - frontend/src/app/admin/users/tabs/UserClaimsTab.tsx (Gedenkprofil-Badge, read-only)
    - frontend/src/app/admin/users/tabs/UserGroupMembershipsTab.tsx (Mitgliedschaften, read-only)
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx (Gruppenrechte, read-only)
    - frontend/src/app/admin/users/tabs/UserContributionsTab.tsx (D-13: 4 Sektionen, read-only)
    - frontend/src/app/admin/users/tabs/UserMediaTab.tsx (D-15: release-version-grouped, read-only)
    - frontend/src/app/admin/users/tabs/UserAuditTab.tsx (Aktivitätsprotokoll, read-only)
    - frontend/src/app/admin/users/tabs/UserOverviewTab.tsx (Stat-Grid, Konflikte, Accountstatus-Mutation)
    - frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx (Assign/Revoke mit Modal + Last-Admin-Guard)
  affects:
    - Checkpoint: Human-Verify UAT der vollständigen /admin/users-Route
tech_stack:
  added: []
  patterns:
    - Lade/Fehler/Empty-Triade (ContributionsReviewSection-Muster) in allen 8 Tabs
    - Mutation+Modal-Pattern (ClaimManagementPanel-Muster) in UserOverviewTab + UserGlobalRolesTab
    - Last-Admin-Guard via 409-Antwort → Inline-Fehler im Modal (nicht globaler Toast)
    - D-13 Vier-Sektionen-Gruppierung in UserContributionsTab (leere Sektionen ausgeblendet)
    - D-15 Release-version-grouped Medien in UserMediaTab mit Berechtigung-Badge
    - Deep-Links via window.open('...', '_blank') für kanonische Arbeitsflächen (read-only Tabs)
    - role="tab" Selektoren in Tests vermeiden Text-Kollision zwischen Tab-Buttons und Paneel-Inhalten
key_files:
  created: []
  modified:
    - frontend/src/app/admin/users/tabs/UserClaimsTab.tsx
    - frontend/src/app/admin/users/tabs/UserGroupMembershipsTab.tsx
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
    - frontend/src/app/admin/users/tabs/UserContributionsTab.tsx
    - frontend/src/app/admin/users/tabs/UserMediaTab.tsx
    - frontend/src/app/admin/users/tabs/UserAuditTab.tsx
    - frontend/src/app/admin/users/tabs/UserOverviewTab.tsx
    - frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx
    - frontend/src/app/admin/users/tabs/UserClaimsTab.test.tsx
    - frontend/src/app/admin/users/UserDetailDrawer.test.tsx
decisions:
  - "D-13 UserContributionsTab: Vier Sektionen (project_defaults, release_overrides, open_disputes, legacy_historical); leere Sektionen ausgeblendet; Release-Override enthält Link 'Release-Version öffnen'"
  - "D-15 UserMediaTab: Medien gruppiert nach owner_context/release_version_id; Berechtigung-Badge success/warning; Deep-Link 'Arbeitsfläche öffnen' → /me/releases/[versionId]/workspace"
  - "D-J Gedenkprofil: UserClaimsTab zeigt badge muted 'Gedenkprofil' wenn profile_status=memorial; kein Edit-Button"
  - "Last-Admin-Guard: 409-Antwort bei updateAdminUserStatus und revokeAdminUserGlobalRole → Inline-Fehler im Modal auf Deutsch (T-80-05-02, T-80-05-03)"
  - "Test-Fix Strategie: getByRole('tab', { name }) statt getByText für Tab-Navigation-Tests um Text-Kollisionen zwischen Tab-Buttons und gleichnamigen Paneel-SectionHeader-Titeln zu vermeiden"
metrics:
  duration: "45min"
  completed_date: "2026-06-15"
  tasks: 3
  files: 10
---

# Phase 80 Plan 05: Tab-Implementierungen — Summary

**One-liner:** Acht vollständige Tab-Komponenten implementiert (Stubs aus Plan 80-04 ersetzt): 6 read-only Deep-Link-Tabs + UserOverviewTab (Accountstatus-Mutation mit Last-Admin-Guard) + UserGlobalRolesTab (Assign/Revoke mit Modal und Last-Admin-Guard).

## Tasks

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 | Sechs read-only Tabs + UserContributionsTab (D-13) | 8735708e | Abgeschlossen |
| 2a | UserOverviewTab (Accountstatus-Mutation + Konfliktliste) | 0601172d | Abgeschlossen |
| 2b | UserGlobalRolesTab (Assign/Revoke + Modals + Last-Admin-Guard) | 0601172d | Abgeschlossen |
| 3 | Checkpoint: Human-Verify UAT | — | Awaiting |

## Ergebnisse

### UserClaimsTab.tsx (179 Zeilen)

- Zwei Sektionen via SectionHeader: "Member-Profil" und "Claims & Einladungen"
- Gedenkprofil-Badge: `<Badge variant="muted">Gedenkprofil</Badge>` wenn `profile_status === 'memorial'`
- Kein Edit-Button, kein Verify-Button (D-J: read-only)
- Claims-Tabelle mit Status-Badge (success/warning/danger)
- 3/3 UserClaimsTab-Tests GREEN

### UserGroupMembershipsTab.tsx (171 Zeilen)

- Tabelle: Gruppe, Rollen, Status, Beigetreten
- Deep-Link "In Gruppe öffnen" → `/admin/fansubs/[id]/edit` (neuer Tab)
- Leerzustand: "Keine Gruppenmitgliedschaften vorhanden."

### UserGroupRightsTab.tsx (141 Zeilen)

- Hinweistext (Card): "Gruppenrechte können in der jeweiligen Gruppenansicht bearbeitet werden."
- Tabelle: Gruppe, Rollen, Inhalte-bearbeiten-Badge, Mitglieder-einsehen-Badge
- Deep-Link "Gruppe bearbeiten" → `/admin/fansubs/[id]/edit` (neuer Tab)
- Kein Edit-Control für Rechte (D-03)

### UserContributionsTab.tsx (211 Zeilen)

- D-13: Vier Sektionen (leere Gruppen ausgeblendet):
  - "Projektweite Beiträge (Standard)": project_defaults (release_version_id IS NULL)
  - "Release-spezifische Overrides": release_overrides mit Version-Badge und Link
  - "Offene / strittige Beiträge": open_disputes mit dispute_state-Badge
  - "Historisch / Legacy": legacy_historical mit "Historisch"-Badge
- Count-Badge pro Sektion

### UserMediaTab.tsx (189 Zeilen)

- D-15: Medien gruppiert nach owner_context/release_version_id
- Pro Medien-Item: Typ, Dateigröße, Hochgeladen-Datum, Berechtigung-Badge (success/warning)
- Deep-Link "Arbeitsfläche öffnen" → `/me/releases/[versionId]/workspace` (neuer Tab)

### UserAuditTab.tsx (159 Zeilen)

- Tabelle: Zeitstempel, Ereignistyp, Aktion, Ziel, Ergebnis-Badge
- Ergebnis-Badge: success "Erlaubt" / danger "Verweigert"
- SectionHeader "Aktivitätsprotokoll" mit Count-Badge

### UserOverviewTab.tsx (332 Zeilen)

- Stat-Grid: 7 Counts in Card-Raster (Globale Rollen, Gruppen, Claims, Beiträge, Arbeitsflächen, Medien, Konflikte)
- Konflikte-Sektion: Warn-Badge + bulleted Liste (D-19), nur wenn `conflict_details.length > 0`
- Accountstatus-Abschnitt: Status-Badge + Deaktivieren/Reaktivieren-Button
- Deaktivieren: Bestätigungs-Modal ("Konto deaktivieren", "Jetzt deaktivieren", "Abbrechen")
- Reaktivieren: Direkte Mutation (nicht destruktiv, kein Modal nötig)
- Last-Admin-Guard: 409 → Inline-Fehler "Das Konto des letzten aktiven Plattform-Admins kann nicht deaktiviert werden." (T-80-05-03)
- Grep-Gate: 0 native select/input/textarea/button

### UserGlobalRolesTab.tsx (388 Zeilen)

- Tabelle aktiver Rollen mit "Rolle entziehen"-Button pro Zeile
- Entzugs-Modal: Bestätigungstext, Inline-Fehler bei 409 "Die letzte Plattform-Admin-Rolle kann nicht entzogen werden." (T-80-05-02)
- Vergabe-Button → Modal mit Select (assignable_roles minus bereits zugewiesene)
- Toast-Erfolg: Reload nach Vergabe/Entzug via `loadData()`
- Leerzustand: "Diesem Benutzer sind keine globalen Rollen zugewiesen."
- Grep-Gate: 0 native select/input/textarea/button

## Testergebnisse

| Testdatei | Tests | Ergebnis |
|-----------|-------|---------|
| UserClaimsTab.test.tsx | 3 | 3/3 GREEN |
| UserDetailDrawer.test.tsx | 3 | 3/3 GREEN |
| page.test.tsx | 3 | 3/3 GREEN |

**Gesamt: 9/9 Tests GREEN**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] UserClaimsTab.test.tsx: queryByText durch queryAllByText ersetzt**

- **Gefunden während:** Task 1 (Testausführung)
- **Problem:** `screen.queryByText(/Team Naruto|Member-Profil|Keine Einträge/)` wirft Fehler wenn mehrere Elemente matchen — da UserClaimsTab sowohl `SectionHeader title="Member-Profil"` als auch die Profil-Info und Empty-State rendert
- **Fix:** `queryByText` → `queryAllByText` mit `expect(contents.length).toBeGreaterThan(0)`
- **Dateien:** tabs/UserClaimsTab.test.tsx
- **Commit:** 8735708e

**2. [Rule 1 - Bug] UserDetailDrawer.test.tsx: getByText durch getByRole('tab') ersetzt**

- **Gefunden während:** Task 2a/2b (Testausführung nach UserOverviewTab-Implementierung)
- **Problem:** `screen.getByText('Globale Rollen')` trifft Tab-Button UND Stat-Grid-Label "Globale Rollen" im UserOverviewTab — `getByText` wirft bei mehreren Treffern
- **Fix:** Alle `getByText(tabLabel)` für Tab-Klick-Navigation → `getByRole('tab', { name: tabLabel })`; betrifft `renders_nine_tabs`, `tabs_lazy_load_on_first_activation`, `scoped_tabs_have_no_mutation_controls`
- **Dateien:** UserDetailDrawer.test.tsx
- **Commit:** 0601172d

### Scope Boundary

- Pre-existierender TypeScript-Fehler in `src/components/auth/PlatformAdminGate.test.tsx` (hasRefreshToken-Typ) wurde NICHT angefasst — außerhalb des Plan-80-05-Scope.

## Known Stubs

Alle 8 Tab-Stubs aus Plan 80-04 wurden ersetzt. Noch als Stub verbleibend:

| Datei | Stub | Beschreibung |
|-------|------|-------------|
| tabs/UserStreamingGrantsTab.tsx | Hinweistext-Stub | D-04: Streaming-Grants sind in v1 nicht konfigurierbar — explizit als Scope-Exclusion geplant |

## Threat Flags

Keine neuen Security-Surface-Bereiche über Plan 80-05 hinaus.

- T-80-05-01: Gruppenrechte-Tab ohne Edit-Controls (D-03) — mitigiert durch Grep-Gate (0 Mutations-Buttons)
- T-80-05-02: Last-Admin-Guard Revoke — mitigiert durch 409-Inline-Fehler im Entzugs-Modal
- T-80-05-03: Last-Admin-Guard Disable — mitigiert durch 409-Inline-Fehler im Deaktivierungs-Modal
- T-80-05-06: UserClaimsTab ohne Mutations-Controls — mitigiert, 3/3 Tests beweisen Abwesenheit

## Self-Check: PASSED

- [x] 8 Tab-Dateien existieren und wurden vollständig implementiert
- [x] Commit 8735708e vorhanden (Task 1: 6 read-only Tabs)
- [x] Commit 0601172d vorhanden (Task 2a+2b: UserOverviewTab + UserGlobalRolesTab)
- [x] npm run typecheck: keine Fehler in admin/users/tabs/* (pre-existierender Fehler in PlatformAdminGate.test.tsx ist out-of-scope)
- [x] npm test -- src/app/admin/users: 9/9 GREEN
- [x] Grep-Gate: 0 native Elemente in UserOverviewTab.tsx und UserGlobalRolesTab.tsx
- [x] Zeilenzählung: alle Tabs <= 450 Zeilen (UserGlobalRolesTab: 388, UserOverviewTab: 332)
- [x] "Gedenkprofil" in UserClaimsTab.tsx: 1 Treffer
- [x] "project_default" in UserContributionsTab.tsx: >= 1 Treffer
- [x] "Arbeitsfläche öffnen" in UserMediaTab.tsx: 1 Treffer
- [x] "Konto deaktivieren" in UserOverviewTab.tsx: >= 1 Treffer
- [x] "letzten aktiven Plattform-Admins" in UserOverviewTab.tsx: 1 Treffer
- [x] "letzte Plattform-Admin-Rolle" in UserGlobalRolesTab.tsx: 1 Treffer
- [x] "Rolle vergeben" in UserGlobalRolesTab.tsx: >= 1 Treffer
