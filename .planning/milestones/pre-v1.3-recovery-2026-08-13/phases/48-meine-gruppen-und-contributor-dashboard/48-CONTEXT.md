# Phase 48: Meine Gruppen & Contributor Dashboard - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning
**Source:** Inline phase brief from user plus current codebase inspection and prior Phase-43-47 planning artifacts

<domain>
## Phase Boundary

Diese Phase fuehrt einen Contributor-Bereich `Meine Gruppen` ein.

**Was diese Phase liefern soll:**
- Uebersicht eigener Fansub-Gruppen fuer eingeloggte User
- Rollen, Mitgliedschaftsstatus, aktive Zeit und gruppenbezogene Capabilities pro eigener Gruppe
- Schnellaktionen in bestehende Gruppen-, Notes-, Release-, Media- und Drawer-Funktionen
- sichere Contributor-Gruppenseite bzw. gekapselte Wiederverwendung bestehender Admin-Komponenten
- read-only oder vorbereitete Anzeige `Meine Beteiligungen`, wenn vorhandene Credit-Seams das ohne grossen Neubau erlauben
- Navigationseintraege fuer `Mein Profil`, `Meine Gruppen`, Keycloak-Account und Logout

**Was diese Phase NICHT liefern soll:**
- keine neue Media-Upload-Architektur
- keinen neuen Tiptap-Editor
- keine neue Episode-zu-Release-Mapping-Logik
- kein neues Member-Profil
- kein neues Keycloak-Setup
- keine Public Archive Pages
- keine Social-/Notification-/Messaging-Features

</domain>

<decisions>
## Locked Decisions

- Phase 48 soll bestehende Funktionen sichtbar, erreichbar und sicher scopen, nicht neu erfinden.
- Die Permission Engine bleibt die einzige Sicherheitsquelle.
- Das Frontend nutzt ausschliesslich Capabilities und keine Rollenchecks.
- `GET /api/me/fansub-groups` liefert nur Gruppen, in denen der aktuelle User wirklich Mitglied ist oder historisch war, nach Projektregel.
- Contributor-Kontexte duerfen keine fremden Gruppen, Releases oder Release-Versionen leaken.
- Bestehende Fansub-Edit-, Notes-, Release-Drawer- und Media-Komponenten werden bevorzugt wiederverwendet, wenn sie contributor-sicher kapselbar sind.
- Wenn bestehende globale Admin-Komponenten zu offen sind, werden sie fuer Contributor-Kontexte gekapselt oder abgesichert statt komplett neu gebaut.
- Historische Credits bleiben read-only Kontexte und nie App-Rechte.
- `platform_admin` behaelt Vollsicht, aber das Contributor-Dashboard darf fuer normale User nur eigene Gruppen zeigen.
- Wenn die app-user-/membership-/permission-runtime-seams in der Ausfuehrungs-Branch fehlen oder unklar bleiben, ist das ein BLOCKER.

## Branch-Reality Findings

- Sichtbar wiederverwendbare Frontend-Bausteine existieren bereits:
  - `frontend/src/app/admin/fansubs/[id]/edit/page.tsx`
  - `AnimeProjectNotesSection`
  - `NotesTab`
  - `ReleaseVersionMediaDrawerSummary`
  - bestehende Fansub-Admin-Routen mit `Members verwalten`
- Es gibt bereits Hinweise auf Navigations-Helfer und Gruppenkontext-Helfer wie `frontend/src/lib/groupNavigation.ts`.
- Die aktuell sichtbare Branch zeigt weiterhin stark global-admin-orientierte Fansub-Admin-Seiten und die alte `/admin/fansubs/[id]/members`-Route.
- Die neueren app-user-/capability-/permission-runtime-seams aus Phasen 43-47 sind in der offenen Branch noch nicht konsistent als umgesetzte Runtime-Realitaet sichtbar.

## Planning Assumption

- Phase 48 setzt eine funktionsfaehige Gruppenmitgliedschaft aus Phase 45, Einladungs-/Join-Seams aus Phase 46 und Member-Profilseams aus Phase 47 voraus.
- Wenn diese Grundlagen in der Ausfuehrungs-Branch fehlen, muss Phase 48 mit einem Pre-flight-Blocker stoppen.

</decisions>

<constraints>
## Constraints

- `AGENTS.md` bleibt bindend.
- Vor Implementierung muessen DB-/Backend-/Frontend-Seams fuer Gruppen, Memberships, Releases, Media, Notes, Profil und Navigation dokumentiert werden.
- Keine bestehende Funktion unnötig neu bauen.
- Wiederverwendbare Komponenten sollen bevorzugt gekapselt oder capability-gesteuert werden.
- Wenn Scoping fuer bestehende Admin-Komponenten unklar oder gefaehrlich bleibt, ist fuer die Ausfuehrung ein BLOCKER noetig statt stillschweigendem Freischalten.

## Mandatory Pre-Analysis Checklist

- `app_users`, Profilstruktur aus Phase 47, `fansub_groups`, `fansub_group_members`, `fansub_group_member_roles`, `anime_fansub_groups`, `fansub_releases`, `release_versions`, `release_version_groups`, `release_media`, `fansub_group_media` und relevante Archivtabellen dokumentieren.
- Aktuelle Auth-/CurrentUser-/Permission-/Capability-Seams und Fehlerkonventionen fuer `401/403/404/409/422` dokumentieren.
- Bestehende Fansub-Gruppen-Endpunkte, Release-/Release-Version-Endpunkte, Media-Endpunkte und Profil-Endpunkte dokumentieren.
- Bestehende Frontend-Navigation, Profilseite, Fansub-Edit-Seite, Release Drawer, Media Upload UI, Tiptap-Einbindungen, Capability-Hooks und API-Clients dokumentieren.
- Fuer jede wiederverwendete Admin-Komponente entscheiden, ob sie im Contributor-Kontext direkt wiederverwendbar, zu kapseln oder zu blockieren ist.
- Die spaetere Ausfuehrungsantwort muss mit einer kurzen Ist-Analyse beginnen, die gefundene Funktionen, Tabellen, Komponenten, Wiederverwendungsentscheidungen und etwaige neue Migrationen zusammenfasst.

</constraints>

<canonical_refs>
## Canonical References

### Workflow and prior phases
- `.planning/ROADMAP.md`
- `AGENTS.md`
- `.planning/phases/47-member-profile-und-historical-identity/47-CONTEXT.md`
- `.planning/phases/47-member-profile-und-historical-identity/47-RESEARCH.md`
- `.planning/phases/45-fansub-member-management-mvp/45-CONTEXT.md`
- `.planning/phases/44-app-permission-engine-fuer-fansub-release-und-media-kontexte/44-CONTEXT.md`

### Current visible contributor/admin reuse seams
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx`
- `frontend/src/app/admin/fansubs/[id]/members/page.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx`
- `frontend/src/lib/groupNavigation.ts`
- `frontend/src/lib/api.ts`
- `backend/cmd/server/main.go`
- `backend/cmd/server/admin_routes.go`

</canonical_refs>

<specifics>
## Specific Ideas From Phase Brief

- Kernendpunkt:
  - `GET /api/me/fansub-groups`
- bevorzugte UI-Routen:
  - `/admin/my-groups`
  - optional `/admin/my-groups/:id`
- Beispiel-Capabilities pro Gruppe:
  - `canOpenContributorGroup`
  - `canEditGroup`
  - `canViewGroupMedia`
  - `canUploadGroupMedia`
  - `canViewReleases`
  - `canEditReleaseDescriptions`
  - `canUploadReleaseMedia`
  - `canManageMembers`

</specifics>

<deferred>
## Deferred Ideas

- Public Archive Pages
- tiefere Contributor-Self-Service-Flows jenseits des Dashboards
- groessere Beteiligungs-/Arbeitsqueue-Logik
- Phase 49 Kandidat: Public Archive Pages

</deferred>
