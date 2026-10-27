---
quick_id: 261026-wve
mode: quick-task
---

# Research: Playwright E2E-Testanmeldung mit dedizierten Testkonten

## 1. Keycloak-Integration & Rollen

- `docker-compose.yml`: Service `keycloak` (Container `team4sv30-keycloak`, Image `quay.io/keycloak/keycloak:26.7.2`, `docker-compose.yml:44-78`), Realm-Import aus `./infra/keycloak` (read-only, `docker-compose.yml:72`), Realm `team4s`, Client `team4s-frontend` (public, `directAccessGrantsEnabled: true`, `infra/keycloak/realm-team4s.json:252-258`) sowie `team4s-api` (`directAccessGrantsEnabled: false`).
- Admin-API-Zugriff: `KEYCLOAK_ADMIN=admin` / `KEYCLOAK_ADMIN_PASSWORD=admin` aus `.env.example`, bereits für den One-Shot-Service `keycloak-profile-config` genutzt (`docker-compose.yml:81-91`, `infra/keycloak/apply-team4s-user-profile.sh:9,13-17`) — belegt, dass `kcadm.sh` unter `/opt/keycloak/bin/kcadm.sh` im `keycloak`-Container funktioniert.
- Realm-Rollen: `platform_admin`, `content_admin`, `user` (`infra/keycloak/realm-team4s.json:25-39`), alle JIT-synchronisiert.
- JIT-Sync: `backend/internal/repository/authz_keycloak_sync.go:74-98` (`SyncGlobalRolesFromKeycloak`), aufgerufen bei jedem authentifizierten Request aus `backend/internal/middleware/current_user_auth.go:104-109`.
- **Kein bestehendes Provisionierungsskript** für Keycloak-Benutzer. Die bestehenden `*@team4s.de`-Konten sind laut `scripts/README-seed.md:63-71` manuell angelegt, nicht skriptgesteuert.
- Login-Flow: `frontend/src/app/login/page.tsx` triggert `beginKeycloakLogin()` (`frontend/src/lib/keycloakAuth.ts:147`) → Standard-OIDC-Redirect (PKCE) zur **gehosteten** Keycloak-Login-Seite. Kein eigenes `login.ftl` unter `infra/keycloak/themes/team4s/login/` → Standard-Keycloak-Basis-Theme-Selektoren gelten: `#username`, `#password`, `#kc-login`.
- Rückkehr: `/login?code=...&state=...` → `completeKeycloakAuthCallback` (`frontend/src/lib/api/auth.ts:131-139`) tauscht den Code, holt `/me`, persistiert die Session (`frontend/src/lib/api/client.ts:643`).

## 2. Fansub-Gruppen-Datenmodell & live vs. historisch (kritischer Unterschied)

- **Zwei getrennte Modelle** existieren parallel:
  - **Historisch (Crew-Credits):** `hist_fansub_group_members` / `hist_group_member_roles` (`database/migrations/0082`, `0083`). Rollen frei (`founder`, `translator`, `typesetter`, ...). Verwaltet über `/admin/fansubs/:id/group-members` und `/admin/fansubs/:id/member-roles` (`backend/cmd/server/admin_routes.go:241-248`). **Trägt KEINE Live-Berechtigung.**
  - **Live (App-Mitgliedschaft, berechtigungsrelevant):** `fansub_group_members` / `fansub_group_member_roles` (`database/migrations/0073_fansub_group_app_memberships.up.sql:3-31`, CHECK erlaubt nur `role = 'fansub_lead'`). Verwaltet über `/admin/fansubs/:id/app-members` (`backend/cmd/server/admin_routes.go:220-229`, Handler `backend/internal/handlers/app_auth_group_members.go`). **Diese Tabellen entscheiden `can_manage_members` / `CanForFansubGroup`.**
- `scripts/seed-member-profile-fixtures.mjs` nutzt **nur** das historische Modell (`ensureHistMember`, `ensureRoles` — Zeile 535 u. a. mit `fansub_lead` als Credit-Label, nicht als Live-Rolle). Dieses Skript allein reicht NICHT, um `can_manage_members` live zu setzen.
- **Benötigter Fixture-Weg für Live-Berechtigungen:**
  1. `POST /fansubs` (als Plattform-Admin) → Gruppe anlegen (`backend/cmd/server/admin_routes.go:121`).
  2. Optional: `POST /admin/fansubs/:id/group-members` → historischer Eintrag je Testkonto (für Konsistenz mit bestehendem Seed-Muster, liefert `historical_member_id`).
  3. `GET /admin/fansubs/:id/app-member-candidates?q=...` → `app_user_id` der Testkonten auflösen (Suche nach E-Mail/Anzeigename, Handler `SearchFansubGroupAppMemberCandidates`, `app_auth_group_members.go:58-96`). **Voraussetzung: Das Testkonto muss sich mindestens einmal via Keycloak angemeldet haben**, da `app_users`-Zeilen erst durch `EnsureAppUserForIdentity` (JIT, `backend/internal/repository/app_auth_repository.go:45`) beim ersten Login entstehen.
  4. `POST /admin/fansubs/:id/app-members` mit `{app_user_id, roles: ["fansub_lead"], historical_member_id?}` für Leitung UND Stellvertretung (Handler `CreateFansubGroupAppMember`, `app_auth_group_members.go:102`). Für ein einfaches Mitglied ohne Rolle verlangt der Handler entweder `roles` non-empty ODER `historical_member_id` gesetzt (`len(roles)==0 && !hasHistoricalLink` → 400) — also historischen Eintrag zuerst anlegen und per `historical_member_id` verlinken, `roles: []`.
  5. Einziger bekannter Live-Rollenwert ist `models.FansubGroupMemberRoleLead = "fansub_lead"` (`backend/internal/models/app_auth.go:17`) — **es gibt keine separate "Stellvertretung"-Rolle im Datenmodell.** Siehe Entscheidung in CONTEXT.md.
- **Permission-Bypass für Plattform-Admin:** `canForContext` gibt bei `actor.IsPlatformAdmin` sofort `Allowed=true` zurück (`backend/internal/permissions/permissions.go:139-147`) — e2e-admin kann die komplette Fixture-Erstellung direkt über die echte API ausführen, ohne zusätzliche Gruppenmitgliedschaft.

## 3. Tab „Fansub Members" — Abschnitte

- Tab: `frontend/src/app/admin/fansubs/[id]/edit/mainTabRouting.ts:16-29`, Tab-Key `collaboration`, Label „Fansub Members" (Zeile 25).
- „Eingehende Hinweise": `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx`, Titel `Eingehende Hinweise (${openCount})` (Zeile 130). Gate: `if (!capabilities?.can_manage_members) return null;` (Zeile 54).
- „Offene Vorschläge": `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx`. Gate: `if (!capabilities.can_manage_members) return null;` (Zeile 36).
- `can_manage_members` wird aus der Live-Mitgliedschaft (`fansub_lead`) abgeleitet — siehe Abschnitt 2.

## 4. Geschützte Bearbeitung — 403-Ziel für einfaches Mitglied

- Backend-Guard: `backend/internal/handlers/contribution_review_handler.go:91` (Liste) und `:139` (Bestätigen) — `h.permissionSvc.CanForFansubGroup(ctx, actor, permissions.ActionFansubGroupMembersManage, fansubID)`; bei `!result.Allowed` → `writePermissionDenied(c, result)` (Zeile 147, HTTP 403) + Audit-Log (`auditPermissionDenied`, Zeile 145).
- Frontend: Abschnitt rendert für Nicht-Leitung `null` (kein Button sichtbar) — siehe Abschnitt 3.
- **Konkreter Testfall:** Mitglied-Konto öffnet Tab „Fansub Members" der eigenen Gruppe → Abschnitt „Offene Vorschläge" ist nicht im DOM (kein Button) UND ein direkter `page.request`-Aufruf gegen den Confirm-Endpunkt liefert 403.

## 5. Admin-Benutzerliste

- Route: `frontend/src/app/admin/users/page.tsx` (15 Zeilen), umschlossen von `PlatformAdminGate` (`frontend/src/components/auth/PlatformAdminGate.tsx`). Bei `!currentUser?.is_platform_admin` wird eine Sperrseite statt der Kinder gerendert (Zeile 73-83) — kein sichtbarer Button für Nicht-Admins.
- Backend: `GET /admin/users` (`backend/cmd/server/admin_routes.go:203`) → `ListUsers`, erste Prüfung `requirePlatformAdminIdentity` (`backend/internal/handlers/admin_users_handler.go:111-114`).
- Hinweis an Planung: Es existiert eine zweite, scheinbar schattierte Route-Registrierung auf demselben Pfad (`admin_routes.go:217`, `appAuthHandler.ListAppUsers`) — für diesen Task nicht relevant, nur zur Kenntnis.

## 6. Bestehende Playwright/E2E-Infrastruktur

- **Kein** `playwright.config.ts`, **kein** `frontend/e2e/`-Ordner, **kein** containerisiertes Playwright-Setup.
- `"playwright": "1.55.0"` ist bereits Dev-Dependency in `frontend/package.json:44`, aber bisher nur als Low-Level-`chromium`-Launcher in Ad-hoc-Skripten unter `frontend/scripts/*.mjs` genutzt (kein Test-Runner, kein `expect`). **`@playwright/test` ist NICHT installiert** — muss ergänzt werden.
- Node `v24.19.0`, npm `11.17.0`, Lockfile `frontend/package-lock.json`.
- Dev-Stack-URL: Frontend-Container auf Host-Port `3000` (`http://192.168.235.196:3000` bzw. lokal `http://127.0.0.1:3000`); SSH-Tunnel für menschliches UAT ist `127.0.0.1:3300` (laut `CLAUDE.md`, nur für Live-Browser-Abnahme relevant, NICHT für den Playwright-Lauf selbst). Backend-Host-Port laut `scripts/README-seed.md`-Defaults: `SEED_API_BASE=http://192.168.235.196:18092`, Keycloak `SEED_KC_BASE=http://192.168.235.196:18081`.

## 7. .env / Secrets-Konventionen

- Kein `~/.config/*.env`-Muster im Repo vorhanden — das ist für diesen Task **neues, aber vom Auftrag explizit vorgegebenes** Muster (`~/.config/team4s-e2e.env`, Rechte 0600).
- Node-Skripte lesen Konfiguration ausschließlich über `process.env.*` mit Inline-Defaults, kein dotenv-Paket.
- `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` liegen bereits in `.env.example` und fließen in `docker-compose.yml` — das Provisionierungsskript kann dieselben Variablen für den Admin-Zugriff auf Keycloak wiederverwenden.

## 8. Dateigrößen

Alle unmittelbar betroffenen Bestandsdateien liegen unter 450 Zeilen (`login/page.tsx` 192, `keycloakAuth.ts` 273, `PlatformAdminGate.tsx` 89, `admin/users/page.tsx` 15, `contribution_review_handler.go`, `authz_keycloak_sync.go`, `current_user_auth.go` jeweils < 450). `frontend/src/lib/api/client.ts` (1095 Zeilen) ist bereits über dem Limit — **nicht anfassen**, stattdessen eine neue, separate Playwright-Helper-Datei schreiben, die ggf. exportierte Funktionen importiert, statt die Datei zu erweitern.

## Implikation für die Planung

Der robusteste Weg für die Playwright-Anmeldung ist die echte OIDC-Weiterleitung über die gehostete Keycloak-Login-Seite (Standard-Theme-Selektoren `#username`/`#password`/`#kc-login`), nicht ein Mock. Das Provisionierungsskript muss zusätzlich zur Keycloak-Benutzeranlage auch die **Live-App-Mitgliedschaft** (`/admin/fansubs/:id/app-members`, NICHT nur die historischen `/admin/fansubs/:id/group-members`-Endpunkte) setzen, da nur diese Tabellen die geprüften Berechtigungen (`can_manage_members`, 403-Guard) tragen. Jedes Testkonto muss vor der Fixture-Vergabe mindestens einmal eingeloggt haben (JIT erzeugt die `app_users`-Zeile), bevor sein `app_user_id` über die Such-Kandidaten-Route auflösbar ist.
