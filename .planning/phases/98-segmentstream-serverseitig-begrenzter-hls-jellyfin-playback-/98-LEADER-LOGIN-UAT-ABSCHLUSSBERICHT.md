# Phase 98 - Leader Login UAT Abschlussbericht

Datum: 2026-07-06

## Umfang

Live-UAT im In-App-Browser, ohne App-API-Aufrufe für den E2E-Testfluss.

Geprüfter Pflichtfall:
- Frischer Docker-Teststack nach Reset.
- Platform-Admin meldet sich an.
- C-Subs wird angelegt.
- `csubs-leader` meldet sich einmal an, damit der App-User existiert.
- Platform-Admin fügt `csubs-leader` als bestehendes App-Mitglied zu C-Subs hinzu.
- Platform-Admin meldet sich über sichtbaren UI-Logout ab.
- `csubs-leader` meldet sich über Keycloak an.
- Leader-Profil, Member-Verifizierung und C-Subs-Adminzugriff werden im Browser geprüft.

## Fixes

### Verifizierter Member-Claim für App-Mitglieder

Problem:
Ein App-User, der als aktives Fansubgruppen-Mitglied ohne historische Identität hinzugefügt wurde, bekam zwar einen `members`-Anchor und `fansub_group_members.member_id`, aber keinen verifizierten `member_claims`-Eintrag. `/me/profile` zeigte dadurch den Zwischenstatus "noch keinem verifizierten Member-Eintrag zugeordnet".

Fix:
`FansubGroupAppMemberRepository.Create` schreibt nun immer einen verifizierten `member_claims`-Eintrag für den kanonischen `member_id`, auch wenn der `member_id` erst aus dem App-User erzeugt wurde.

Geänderte Dateien:
- `backend/internal/repository/fansub_group_app_members_repository.go`
- `backend/internal/repository/fansub_group_app_members_repository_test.go`

### AppShell Logout Navigation

Problem:
Beim Platform-Admin ohne Member-Profil wurde die lokale Session geleert, die UI konnte aber auf der alten Profilansicht stehen bleiben.

Fix:
AppShell navigiert nach Start des zentralen Logout-Flows sofort auf `/login`; die Remote-Abmeldung bleibt best-effort im Hintergrund.

Geänderte Dateien:
- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/components/layout/AppShell.test.tsx`

### E2E-Port-Konfiguration

Problem:
Lokale Standardports `8081` und `8092` waren belegt.

Fix:
Backend-Port ist über `BACKEND_PORT` konfigurierbar; E2E-Override setzt die lokalen Testports auf `18081` und `18092`.

Geänderte Dateien:
- `docker-compose.yml`
- `tmp/docker-compose.e2e.override.yml`

## Live Browser UAT

Ergebnis: bestanden.

Browser-Schritte:
- Login `platform-admin` über Keycloak.
- C-Subs in `/admin/fansubs/create` angelegt.
- Login `csubs-leader` über Keycloak, App-User initialisiert.
- Zurück als `platform-admin`, in `/admin/fansubs/1/edit?tab=collaboration` `csubs-leader` als bestehendes Profil ausgewählt.
- Rollen `Gruppenleitung` und `Projektleitung` gesetzt.
- Mitgliederliste zeigte danach `csubs-leader`, Status `Aktiv`, Rollen `Gruppenleitung` und `Projektleitung`.
- Platform-Admin über sichtbaren Drawer-Logout abgemeldet.
- Login `csubs-leader` über Keycloak.
- `/me/profile` zeigte `Verifiziert als CSubs Leader` und `MEINE GRUPPEN C-Subs`.
- Sichtbarer C-Subs-Link öffnete `/admin/fansubs/1/edit`.

## ID-Kontrolle

Nur read-only Postgres-Kontrollblick, keine App-API:

- `app_user_id`: 2
- `preferred_username`: `csubs-leader`
- `email`: `csubs-leader@team4s.local`
- `member_id`: 1
- `member.nickname`: `CSubs Leader`
- `claim_id`: 1
- `claim_status`: `verified`
- `verification_method`: `manual_review`
- `verified_by`: 1 (`platform-admin`)
- `group_member_id`: 1
- `fansub_group_id`: 1
- `group_name`: `C-Subs`
- `status`: `active`
- `roles`: `{fansub_lead, project_lead}`

Damit hängt der Leader nicht mehr in einem Zwischenstatus.

## Checks

- `go test ./internal/repository ./internal/handlers`
- `npm test -- --run src/components/layout/AppShell.test.tsx src/app/me/profile/page.test.tsx`
- `git diff --check`

## Gaps / Noch zu klären

- Browser-Automation-Hinweis: Bei offenem Drawer können semantische Playwright-Klicks gegen die Drawer-Overlay-Fläche laufen. Für diesen UAT wurde der sichtbare Button/Link per Koordinate geklickt. Für zukünftige UAT-Skripte sollte der Drawer-Zustand explizit geöffnet/geschlossen und dann per sichtbarer Box geprüft werden.
- Produktentscheidung: Der automatisch erzeugte `members`-Anchor für `csubs-leader` bleibt `noindex=true`, obwohl der Claim verifiziert ist. Das Profil ist intern korrekt verifiziert; falls neu erzeugte Profile nach Verifizierung standardmäßig öffentlich indexierbar sein sollen, muss das separat entschieden und umgesetzt werden.
