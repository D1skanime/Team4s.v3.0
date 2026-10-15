---
quick_id: 261015-gm3
status: complete
---

# Quick Task 261015-gm3: README neu schreiben (F-11) — Summary

**Commit:** fd3a08144

## Was gemacht wurde

- `README.md` komplett neu geschrieben: nicht-technische deutsche Eingangstür
  mit den Abschnitten Was-ist-Team4s, Stack-Übersicht (Tabelle), Installation
  (Docker Compose, `.env`-Pflichtwerte ohne reale Werte, Migrationen,
  Keycloak-Realm + erster Admin, Funktionsprüfung), Erste Schritte als Admin
  (Login/Plattform-Admin, Fansub-Gruppe anlegen, Mitglieder einladen →
  Mailpit, Anime anlegen manuell/Jellyfin/AniSearch, Release-Editor
  `/admin/episode-versions/<id>/edit`) sowie Links auf die weiterführende
  Doku. Zwei markierte Screenshot/-Video-Platzhalter eingefügt (keine Bilder
  eingecheckt).
- `docs/ENTWICKLUNG.md` neu angelegt mit dem aktualisierten technischen
  Altinhalt: Ports-Tabelle (inkl. Hinweis auf die host-lokale `.env`-
  Überschreibung `KEYCLOAK_PORT=18081` / `BACKEND_PORT=18092`),
  Entwicklungs-Workflow, Migrationsbefehle (ohne hartcodierte Dateiliste —
  war mit 184 vorhandenen Migrationen vs. 14 im alten README stark veraltet),
  API-Contracts, Auth (Keycloak-OIDC als Primärpfad, JIT-Sync der Realm-
  Rollen `platform_admin`/`content_admin`, HMAC-Legacy-Bypass als Dev-
  Fallback), Smoke-Checks und Degraded-Observability-Signale.
- `docs/README.md` um eine Zeile für `docs/ENTWICKLUNG.md` ergänzt.

## Was entfallen/gewandert ist

- **Gewandert nach `docs/ENTWICKLUNG.md`:** Ports, Migrationsbefehle,
  API-Contract-Liste, Health-Check-curl, Smoke-Check-Aufrufe,
  Degraded-Observability-Signale.
- **Entfernt (veraltet, nicht übernommen):**
  - GSD-Container-Skript (`scripts/gsd-linux.sh`) — nicht mehr erwähnt.
  - Fast-Refresh/HMR-Behauptung für das Frontend — ersetzt durch den Hinweis,
    dass HMR im Docker-Dev-Setup nicht zuverlässig greift und nach
    Frontend-Änderungen `docker restart team4sv30-frontend` nötig ist.
  - Hartcodierte Migrationsdateiliste (0001–0014) — durch `./migrate status`
    plus Verweis auf das Verzeichnis ersetzt (aktueller Stand: 184 Dateien).
  - PowerShell-Token-Generierung für `NEXT_PUBLIC_AUTH_TOKEN` und
    `auth/issue`-Dev-Key-Beispiel als Haupt-Workflow — Keycloak-OIDC ist der
    primäre Login-Pfad, der HMAC-Bypass ist nur noch als Dev-Fallback
    dokumentiert.
  - `AUTH_ADMIN_ROLE_NAME` als Rechtequelle — ersetzt durch die korrekte
    Beschreibung: Plattform-/Content-Admin-Rechte kommen aus den
    Keycloak-Realm-Rollen `platform_admin`/`content_admin` per JIT-Sync in
    `app_user_global_roles`; `AUTH_ADMIN_ROLE_NAME` und
    `AUTH_ADMIN_BOOTSTRAP_USER_IDS` sind als veralteter Fallback markiert.

## Keycloak-Einrichtung und erster Admin (verifiziert am echten Stand)

- Der Realm `team4s` wird von Keycloak beim Start automatisch aus
  `infra/keycloak/realm-team4s.json` importiert (`start-dev --import-realm`,
  Volume-Mount `./infra/keycloak:/opt/keycloak/data/import:ro`). Die Datei
  enthält die Realm-Rollen `platform_admin`, `content_admin`, `user` sowie
  die Clients `team4s-frontend`/`team4s-api`, aber **keine** vorbefüllten
  Benutzer (`"users": []`).
- Der erste Admin entsteht daher manuell: Benutzer über die Frontend-
  Registrierung (`intent=register` in `frontend/src/lib/keycloakAuth.ts`)
  oder direkt in der Keycloak-Admin-Konsole anlegen, dort unter
  *Users → Role mapping* die Realm-Rolle `platform_admin` zuweisen. Beim
  nächsten authentifizierten Request synchronisiert das Backend diese Rolle
  automatisch in `app_user_global_roles` (JIT-Sync, kein Neustart, kein
  manueller DB-Eintrag) — belegt durch
  `.planning/notes/2026-08-26-keycloak-upgrade-und-voll-reset.md` und
  `docs/BACKEND_ARCHITEKTUR.md` (`platform_admin_authz.go`,
  `AppUserHasGlobalRole`).
- Das frühere `AUTH_ADMIN_BOOTSTRAP_USER_IDS`-Bootstrap (DB-Rolle für
  App-User-ID 1) ist laut `.env.example`-Kommentar explizit als veralteter
  Fallback markiert und wurde in den neuen Texten entsprechend eingeordnet,
  nicht als aktueller Weg beschrieben.

## Geprüft, nicht übernommen

- Keine echten Zugangsdaten, Passwörter oder internen IPs in den neuen
  Dateien (Stichprobe per `grep` auf bekannte Dev-Passwörter/IP-Muster
  durchgeführt, ein gefundenes `team4s_dev_password`-Beispiel wurde durch
  `<passwort>` ersetzt).
- ASCII-Umlaut-Scan (`ae/oe/ue`-Heuristik) über alle drei Dateien ohne Treffer.
