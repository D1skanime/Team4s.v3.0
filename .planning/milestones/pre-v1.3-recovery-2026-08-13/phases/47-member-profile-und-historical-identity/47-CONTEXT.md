# Phase 47: Member Profile & Historical Identity - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning
**Source:** Inline phase brief from user plus current codebase inspection and prior Phase-43-46 planning artifacts

<domain>
## Phase Boundary

Diese Phase fuehrt einen echten Profilbereich fuer historische Fansub-Mitglieder ein.

**Was diese Phase liefern soll:**
- eigenes Team4s-Profil fuer eingeloggte User
- archivbezogene Felder wie Fansub-Name, Display Name, Avatar, Bio, Member Story und aktive Zeit
- Gruppenzugehoerigkeiten und Rollen als read-only Profilkontext
- vorbereitete oder read-only historische Credit-/Beteiligungsanzeige
- Avatar-Upload ueber die bestehende Media-Architektur
- Link/Button zur Keycloak Account Console fuer E-Mail, Passwort und MFA
- Verschiebung des fachlich falsch platzierten Profilbezugs aus der Fansub-Gruppen-Edit-Seite
- optionale Admin-Sicht fuer fremde Profile

**Was diese Phase NICHT liefern soll:**
- keine Passwortaenderung in Team4s
- keine E-Mail-Aenderung in Team4s
- keine MFA-Verwaltung in Team4s
- kein neues Keycloak-Setup
- keine Social-/Messaging-Features
- keine neue Gruppenproduktion oder Registrierung

</domain>

<decisions>
## Locked Decisions

- Keycloak bleibt fuer Login, E-Mail, Passwort, MFA und Account-Sicherheit verantwortlich.
- Team4s speichert nur archivbezogene Profilinformationen.
- `fansub_name` ist fuer die historische Identitaet zentraler als ein erzwungener Realname.
- Team4s darf Keycloak-Accountdaten nicht direkt editieren; stattdessen gibt es einen Button `Accountdaten in Keycloak ändern`.
- Bestehende User-/Member-/Story-/Media-/Audit-Seams werden bevorzugt wiederverwendet.
- Gruppenmitgliedschaften und Gruppenrollen werden im Profil angezeigt, aber nicht als persoenliche Stammdaten vermischt.
- Historische Credits wie `release_member_roles`, `member_episode_notes` oder `member_anime_notes` duerfen fuer read-only Anzeige genutzt werden, aber nie fuer App-Rechte.
- Profilbearbeitung fuer normale User ist auf das eigene Profil beschraenkt.
- `platform_admin` darf Profile optional administrativ sehen/bearbeiten.
- Wenn app-user-/permission-/member-management-Seams in der Ausfuehrungs-Branch fehlen, ist das ein BLOCKER statt ein Anlass, auf eine falsche Legacy-Seam auszuweichen.

## Branch-Reality Findings

- In der aktuell sichtbaren Branch gibt es sichtbare historische Member-/Profil-Anker in den alten V2-Tabellen und Migrationsdokumenten:
  - `members`
  - `group_members`
  - `avatar_media_id`
  - `member_group_stories`
  - `release_member_roles`
  - `member_anime_notes`
  - `member_episode_notes`
- `member_group_stories` existiert bereits als TipTap-/Rich-Text-Struktur und ist ein starker Kandidat fuer die persoenliche Fansub-Geschichte statt eines komplett neuen Freitextsystems.
- Die sichtbare Fansub-Admin-UI verlinkt heute auf `Members verwalten` aus der Gruppen-Edit-Seite, aber noch nicht auf ein eigenstaendiges Profil.
- Ein klares Runtime-Seam fuer `app_users`/`/api/me/profile`/Keycloak-Account-Console-Link ist in der geoeffneten Branch weiterhin nicht eindeutig sichtbar.

## Planning Assumption

- Phase 47 setzt eine verfuegbare Phase-43-Auth-Seam und idealerweise die Member-/Permission-Seams aus Phase 45/46 voraus.
- Wenn diese Grundlagen in der Ausfuehrungs-Branch fehlen oder widerspruechlich bleiben, muss Phase 47 mit einem Pre-flight-Blocker stoppen.

</decisions>

<constraints>
## Constraints

- `AGENTS.md` bleibt bindend.
- Vor Implementierung muessen bestehende User-/Member-/Story-/Media-/Audit-/Capability-Seams dokumentiert werden.
- Wenn Profilfelder bereits existieren, muessen sie wiederverwendet werden.
- Wenn Profilfelder fehlen, ist nur eine minimale Migration nach Projektkonvention erlaubt.
- Wenn unklar bleibt, ob Profilstammdaten auf `app_users`, `users`, `members` oder eine Bruecke zwischen ihnen gehoeren, ist fuer die Ausfuehrung ein BLOCKER mit konkreter Rueckfrage noetig.
- Das Frontend soll bestehende Admin-Muster beibehalten; keine grosse Neugestaltung.

## Mandatory Pre-Analysis Checklist

- User-/App-User-/Member-Tabellen und ihre Beziehungen dokumentieren, insbesondere `app_users`, `users`, `members`, `fansub_group_members` oder gleichwertige Strukturen.
- Bereits vorhandene Profilfelder, `avatar_media_id`/`avatar_media_asset_id`, Story-/Bio-Felder, Zeitraeume und Sichtbarkeitsfelder identifizieren.
- `member_group_stories`, `release_member_roles`, `member_episode_notes`, `member_anime_notes` und ihre Eignung fuer read-only Profilkontext dokumentieren.
- Bestehende Media-Architektur fuer Avatar-Upload dokumentieren (`media_assets`, `media_files`, Upload-Services).
- Auth-/CurrentUser-/Permission-/Capability-Seams und Fehlerkonventionen fuer `401/403/404/409/422` dokumentieren.
- Den falsch platzierten Member-/Profilbezug in der Fansub-Edit-Seite sowie vorhandene Header-/Navigation-/User-Menue-Seams dokumentieren.
- Die spaetere Ausfuehrungsantwort muss mit einer kurzen Ist-Analyse beginnen, die gefundene Tabellen, Felder, Middleware, Frontend-Seams, Wiederverwendungsentscheidungen und neue Migrationen zusammenfasst.

</constraints>

<canonical_refs>
## Canonical References

### Workflow and prior phases
- `.planning/ROADMAP.md`
- `AGENTS.md`
- `docs/architecture/db-schema-fansub-domain.md`
- `.planning/phases/45-fansub-member-management-mvp/45-CONTEXT.md`
- `.planning/phases/46-fansub-group-invitations-und-join-requests-mvp/46-CONTEXT.md`

### Current visible member/profile/media seams
- `database/migrations/0044_add_db_schema_v2_target_tables.up.sql`
- `database/migrations/0062_member_group_stories.up.sql`
- `database/migrations/0068_member_group_stories_tiptap.up.sql`
- `backend/internal/repository/member_group_story_context_repository.go`
- `backend/internal/repository/member_group_stories_repository.go`
- `frontend/src/types/fansubNotes.ts`
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx`
- `frontend/src/app/admin/fansubs/[id]/members/page.tsx`
- `frontend/src/lib/api.ts`

</canonical_refs>

<specifics>
## Specific Ideas From Phase Brief

- MVP-Profilfelder:
  - `display_name`
  - `fansub_name`
  - `avatar_media_asset_id`
  - `bio` / `profile_bio`
  - `member_story`
  - `active_from`
  - `active_until`
  - `is_currently_active`
  - `profile_visibility`
- Sichtbarkeit:
  - `public`
  - `members_only`
  - `private`
- Profil-Route:
  - `/admin/profile` oder bestehende Projektkonvention
- Profile-Capabilities:
  - `canViewOwnProfile`
  - `canEditOwnProfile`
  - `canUploadOwnAvatar`
  - `canOpenKeycloakAccount`
  - `canViewMemberships`
  - `canViewHistoricalCredits`

</specifics>

<deferred>
## Deferred Ideas

- Contributor Dashboard / Meine Gruppen
- tiefere Self-Service-Workflows fuer Gruppen-/Release-Inhalte
- vollstaendige oeffentliche Personen-/Archivseiten
- Phase 48 Kandidat: Contributor Dashboard / Meine Gruppen & Rechte

</deferred>
