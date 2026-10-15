# Team4s

Team4s ist eine Anime-Plattform für Fansub-Gruppen: Sie verwaltet Animes,
Releases und deren Medien (Cover, Banner, Videos) sowie Fansub-Gruppen,
Mitglieder und Beiträge. Admins pflegen die Inhalte, prüfen eingereichte
Releases und geben sie zur Veröffentlichung frei.

<!-- PLATZHALTER: Produkt-Screenshot/-Video der Startseite hier einfügen -->

## Was ist Team4s

- **Anime-Katalog:** Animes mit Beschreibung, Cover, Genres und Staffeln.
- **Releases & Medien:** Fansub-Gruppen laden Episoden-Releases samt Medien
  hoch, ein Admin prüft und gibt sie frei.
- **Fansub-Gruppen & Mitglieder:** Gruppen verwalten ihre Mitglieder, Rollen
  und Beiträge (Übersetzung, Encode, Timing usw.).
- **Admin-Bereich:** Zentrale Oberfläche, um Animes, Releases, Gruppen und
  Rechte zu pflegen.

<!-- PLATZHALTER: Screenshot des Admin-Bereichs (Anime-Übersicht) hier einfügen -->

## Stack-Übersicht

| Komponente   | Technologie                     | Zweck                                   |
|--------------|----------------------------------|------------------------------------------|
| Frontend     | Next.js (React)                  | Öffentliche Seite + Admin-Oberfläche      |
| Backend      | Go (Gin)                         | API, Geschäftslogik, Medienverwaltung     |
| Datenbank    | PostgreSQL                       | Anwendungsdaten (Anime, Releases, Nutzer) |
| Cache/Limits | Redis                            | Rate-Limiting, Session-/Zähler-Daten      |
| Login        | Keycloak                         | Benutzerkonten, Login, Registrierung      |
| Mail (lokal) | Mailpit                          | Fängt lokal versendete E-Mails ab (Einladungen, Keycloak-Mails) |

Details zu den einzelnen Diensten und Ports: [docs/ENTWICKLUNG.md](docs/ENTWICKLUNG.md).

## Installation

Voraussetzung: Docker und Docker Compose sind auf dem Zielrechner installiert.
Alle Dienste (Frontend, Backend, Datenbank, Redis, Keycloak, Mailpit) laufen
ausschließlich als Compose-Services.

1. **Repository holen und `.env` anlegen**

   ```bash
   cp .env.example .env
   ```

   In `.env` müssen mindestens folgende Werte gesetzt bzw. geprüft werden
   (ohne hier reale Werte zu nennen):
   - `AUTH_TOKEN_SECRET` – ein eigenes, zufälliges Secret für lokale Tokens.
   - `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` – Zugangsdaten für die
     Keycloak-Admin-Konsole (lokale Entwicklung: Defaultwerte aus
     `.env.example` reichen; für produktivnahe Umgebungen eigene Werte setzen).
   - `KEYCLOAK_DB_PASSWORD` – Passwort der Keycloak-eigenen Datenbank.
   - `APP_PUBLIC_URL` – öffentlich erreichbare Basis-URL des Frontends (für
     Links in versendeten E-Mails).
   - Optional: API-Schlüssel für externe Dienste (TMDB, Fanart.tv, Jellyfin),
     falls diese Importquellen genutzt werden sollen.

2. **Stack starten**

   ```bash
   docker compose up -d
   ```

   Das startet Datenbank, Redis, Keycloak (inklusive automatischem Import des
   mitgelieferten `team4s`-Realms aus `infra/keycloak/`), Mailpit, Backend und
   Frontend.

3. **Migrationen anwenden**

   Der Backend-Container wendet beim Start automatisch alle ausstehenden
   Datenbank-Migrationen an. Der aktuelle Stand lässt sich prüfen mit:

   ```bash
   docker compose exec team4sv30-backend ./migrate status
   ```

4. **Keycloak-Realm und ersten Admin einrichten**

   Der Realm `team4s` wird beim ersten Start automatisch aus
   `infra/keycloak/realm-team4s.json` importiert (inklusive der Rollen
   `platform_admin`, `content_admin` und `user`). Beim Erststart existieren
   noch keine Benutzerkonten.

   - Einen Benutzer über die Registrierung im Frontend anlegen (oder direkt
     in der Keycloak-Admin-Konsole unter `http://<host>:<KEYCLOAK_PORT>`
     mit den Zugangsdaten aus `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD`).
   - In der Keycloak-Admin-Konsole diesem Benutzer unter *Users → Role
     mapping* die Realm-Rolle `platform_admin` zuweisen.
   - Danach einmal im Team4s-Frontend einloggen: Beim ersten authentifizierten
     Zugriff synchronisiert das Backend die Keycloak-Rolle automatisch in die
     Anwendungsrechte (kein Neustart, kein manueller Datenbankeintrag nötig).

5. **Funktionsprüfung**

   ```bash
   curl http://<host>:<BACKEND_PORT>/health
   ```

   Danach das Frontend im Browser unter `http://<host>:3000` aufrufen und den
   Login testen.

Technische Details (genaue Ports, Smoke-Checks, API-Contracts, Auth-Ablauf,
Entwicklungs-Workflow) stehen in [docs/ENTWICKLUNG.md](docs/ENTWICKLUNG.md).

## Erste Schritte als Admin

1. **Einloggen und Plattform-Admin-Rechte prüfen** – nach dem Login im
   Admin-Bereich (`/admin`) sollten alle Verwaltungsbereiche sichtbar sein.
2. **Fansub-Gruppe anlegen** – unter `/admin/fansubs/create` eine neue Gruppe
   erstellen.
3. **Mitglieder einladen** – in der Gruppenverwaltung (`/admin/fansubs/<id>/edit`)
   Mitglieder einladen; Einladungs-Mails landen lokal in Mailpit
   (`http://<host>:8025`).
4. **Anime anlegen** – unter `/admin/anime/create` einen Anime manuell
   erfassen oder per Jellyfin- bzw. AniSearch-Import vorbefüllen und vor dem
   Speichern im Formular prüfen/anpassen.
5. **Release bearbeiten und freigeben** – im Editor
   `/admin/episode-versions/<id>/edit` Medien eines Releases bearbeiten und
   zur Veröffentlichung freigeben.

<!-- PLATZHALTER: Screenshot/Video des Release-Editors hier einfügen -->

## Weiterführende Dokumentation

- [docs/README.md](docs/README.md) – Wegweiser durch die technische Dokumentation
- [docs/FRONTEND_ARCHITEKTUR.md](docs/FRONTEND_ARCHITEKTUR.md) – Aufbau des Next.js-Frontends
- [docs/BACKEND_ARCHITEKTUR.md](docs/BACKEND_ARCHITEKTUR.md) – Aufbau des Go-Backends
- [docs/ENTWICKLUNG.md](docs/ENTWICKLUNG.md) – Entwicklungs-Workflow, Ports, Smoke-Checks, Contracts, Auth
