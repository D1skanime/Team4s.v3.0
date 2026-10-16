# Entwicklung

Technische Referenz für die lokale Entwicklung an Team4s: Dienste, Ports,
Entwicklungs-Workflow, Migrationen, API-Contracts, Auth und Smoke-Checks. Für
den nicht-technischen Überblick siehe [../README.md](../README.md), für den
Wegweiser durch die übrige Dokumentation [README.md](README.md).

## Dienste und Ports

Alle Dienste laufen über Docker Compose (`docker-compose.yml`). Host-Ports
sind über `.env`-Variablen überschreibbar (Defaultwerte aus
`docker-compose.yml` in Klammern):

| Dienst              | Container-Port | Host-Port (Variable)                  |
|---------------------|-----------------|-----------------------------------------|
| Frontend            | 3000             | `3000` (fest)                           |
| Backend             | 8092             | `BACKEND_PORT` (Default `8092`)         |
| PostgreSQL (App)    | 5432             | `POSTGRES_PORT` (Default `5433`)        |
| Redis               | 6379             | `6379` (fest)                           |
| Keycloak            | 8080             | `KEYCLOAK_PORT` (Default `8081`)        |
| Keycloak-Datenbank  | 5432             | `KEYCLOAK_POSTGRES_PORT` (Default `5434`) |
| Mailpit (SMTP/Web)  | 1025 / 8025      | `1025` / `8025` (fest)                  |

Auf diesem Entwicklungshost sind `KEYCLOAK_PORT` und `BACKEND_PORT` in `.env`
auf `18081` bzw. `18092` umgelegt, um Portkollisionen mit anderen lokalen
Diensten zu vermeiden — den tatsächlichen Stand liefert `.env`.

Browserzugriffe erfolgen über `http://<host>:<port>`, serverseitige
Container-zu-Container-Aufrufe über die internen Compose-Service-Namen
(z. B. `team4sv30-backend:8092`).

## Entwicklungs-Workflow

`docker compose up -d` lädt automatisch `docker-compose.override.yml` mit und
startet Backend und Frontend im Entwicklungsmodus:

- **Backend:** Compose Watch synchronisiert geänderte Go-Dateien in den
  Container; [Air](https://github.com/air-verse/air) baut `cmd/server` neu und
  startet nur den Backend-Prozess. Der Migration-Runner wendet beim
  Container-Start einmalig alle ausstehenden Migrationen an und läuft danach
  nicht automatisch erneut.
- **Frontend:** Der `frontend/`-Ordner ist in den Container gemountet.
  **Hot Module Reloading greift im Docker-Dev-Setup nicht zuverlässig** — nach
  einer Frontend-Änderung den Container neu starten, um die Änderung sicher
  zu übernehmen:

  ```bash
  docker restart team4sv30-frontend
  ```

Separate Terminals mit Watch-Ausgabe:

```bash
docker compose up -d
docker compose watch team4sv30-backend
```

### Datenbankänderungen

Eine neue SQL-Migration prüfen und anwenden (kein Image-Neubau nötig):

```bash
docker compose exec team4sv30-backend ./migrate status
docker compose exec team4sv30-backend ./migrate up
docker compose exec team4sv30-backend ./migrate down -steps 1
```

Nur Änderungen an Dockerfiles, Go-/Node-Abhängigkeiten oder
Compose-Umgebungsvariablen erfordern einen Neubau des betroffenen Dienstes
(`docker compose up -d --build <dienst>`).

## Datenbank-Migrationen

Migrationsdateien liegen unter `database/migrations/` (fortlaufend
nummeriert, `*.up.sql` / `*.down.sql`). Der Stand lässt sich jederzeit mit
`./migrate status` prüfen; die Liste einzelner Dateien wird hier bewusst
nicht geführt, da sie sich mit jeder neuen Migration ändert.

Außerhalb des Containers (lokaler Go-Toolchain-Zugriff auf die DB):

```bash
cd backend
export DATABASE_URL="postgres://team4s:<passwort>@localhost:<POSTGRES_PORT>/team4s_v2?sslmode=disable"
go run ./cmd/migrate status
go run ./cmd/migrate up
go run ./cmd/migrate down -steps 1
```

## Backend-Testsuite vollständig ausführen

`scripts/test-backend.sh` reproduziert die volle, unscoped Backend-Testsuite
(`go test ./...`) reproduzierbar in einem isolierten Container, ohne dass
`.env`-Variablen oder Wegwerf-Datenbanken manuell angelegt werden müssen.
Hintergrund: ein früherer manueller Lauf scheiterte, weil nur `backend/`
statt des gesamten Repos gemountet war — dadurch konnten
`database/migrations/` und `shared/contracts/` nicht gefunden werden, was
fast die gesamte Suite fälschlich rot färbte. Das Skript mountet deshalb
immer den **gesamten** Projektordner und setzt `WORKDIR` auf `backend/`
innerhalb des Containers.

Als Test-Runner-Image dient `golang:1.25-alpine` — dasselbe Alpine-Basisimage
wie `backend/Dockerfile`s Produktions-Build, damit dieselben, bereits
bewährten `apk`-Paketnamen (`vips vips-tools ffmpeg fontconfig font-dejavu
font-noto font-noto-cjk` zur Laufzeit, `build-base pkgconfig vips-dev` für
den CGO/govips-Build) ohne Raten auf ein Debian/`apt-get`-Äquivalent
installiert werden können.

Jede im Backend referenzierte `*_TEST_DSN`-Umgebungsvariable wird automatisch
aus `backend/internal` ermittelt (nicht händisch gepflegt) und auf eine
frisch angelegte, eindeutig benannte Wegwerf-Datenbank auf `team4sv30-db`
umgelenkt — `team4s_v2` wird dabei nie beschrieben, höchstens einmalig
lesend per `pg_dump --schema-only` gespiegelt (für die zehn Fixtures, die das
volle Schema statt handgerollter Stand-in-Tabellen benötigen). Der
9-Test-Cluster der Phase-134-Verifikationsmatrix bekommt zusätzlich einen
temporären, über `scripts/provision-phase134-matrix-db.sh` migrierten und
befüllten Backend-Container im Docker-Netzwerk gestartet. Alle angelegten
Datenbanken und der temporäre Backend-Container werden am Ende wieder
entfernt — unabhängig davon, ob der Testlauf selbst grün oder rot war.

```bash
bash scripts/test-backend.sh
```

## API-Contracts

- Quelle der Wahrheit: `shared/contracts/openapi.yaml`
- Feature-Contracts (Auszug, siehe Verzeichnis für den vollständigen Stand):
  `anime-list.yaml`, `anime-detail.yaml`, `anime-backdrops.yaml`,
  `episodes.yaml`, `episode-versions.yaml`, `comments.yaml`,
  `watchlist.yaml`, `auth.yaml`, `admin-content.yaml`,
  `admin-capabilities.yaml`, `asset-stream.yaml`, `contributions.yaml`,
  `fansubs.yaml`

## Auth

Team4s nutzt Keycloak (OIDC) als primären Login-Mechanismus
(`KEYCLOAK_ENABLED=true`). Das Frontend leitet Login/Registrierung an
Keycloak weiter; das Backend verifiziert die vom Frontend übergebenen
Keycloak-Access-Tokens gegen `KEYCLOAK_DISCOVERY_URL` /
`KEYCLOAK_API_AUDIENCE`.

**Plattform-/Content-Admin-Rechte** werden nicht über eine Backend-Umgebungs­
variable vergeben, sondern aus Keycloak-Realm-Rollen abgeleitet: Die
Realm-Rollen `platform_admin` und `content_admin` werden bei jedem
authentifizierten Request per JIT-Sync (Just-in-Time) in die
Anwendungstabelle `app_user_global_roles` übernommen. Eine Rechteänderung in
Keycloak wirkt somit ohne Neustart und ohne manuellen Datenbankeintrag beim
nächsten Request des betroffenen Nutzers.

`AUTH_ADMIN_ROLE_NAME` und `AUTH_ADMIN_BOOTSTRAP_USER_IDS` sind ein
veralteter, nur noch als Fallback vorhandener Bootstrap-Mechanismus aus der
Zeit vor der Keycloak-Rollen-Synchronisierung (legacy `roles` /
`user_roles`-Tabellen) und sollten für neue Admin-Zuweisungen nicht mehr
verwendet werden.

Für lokale Entwicklung ohne Keycloak existiert ein HMAC-basierter
Legacy-Bypass (`RUNTIME_PROFILE=local`, `AUTH_TOKEN_SECRET`), der nur in
Nicht-Produktionsprofilen aktivierbar ist. Endpunkte:

```bash
POST /api/v1/auth/issue
POST /api/v1/auth/refresh
POST /api/v1/auth/revoke
```

Optionale Konfiguration (Backend-Umgebungsvariablen):
- `AUTH_ACCESS_TOKEN_TTL_SECONDS` (Default: `900`)
- `AUTH_REFRESH_TOKEN_TTL_SECONDS` (Default: `604800`)
- `REDIS_ADDR` / `REDIS_DB` für den Rate-Limiter

## Health-Check

```bash
curl http://localhost:<BACKEND_PORT>/health
curl "http://localhost:<BACKEND_PORT>/api/v1/anime?page=1&per_page=24"
curl "http://localhost:<BACKEND_PORT>/api/v1/anime/1"
```

## Smoke-Checks

Gezielte PowerShell-Smoke-Checks unter `scripts/` für hochverfügbare Pfade:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-auth-comments-watchlist.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-fansubs.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-episode-playback.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-anime-media.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-admin-content.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-search.ps1
```

Gemeinsame Optionen (soweit vom jeweiligen Skript unterstützt):
- `-ApiBaseUrl` überschreibt die API-Basis-URL (Default: `http://localhost:8092`)
- `-AuthTokenSecret` übergibt das Auth-Secret direkt (sonst wird der
  Container-/Env-Wert gelesen)

## Keycloak-Konfiguration prüfen

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-keycloak-config.ps1
```

## Degraded-Observability-Signale

Das Backend protokolliert strukturierte Log-Signale für Redis-Degraded-/
Unavailable-Pfade:
- `event=redis_auth_state_unavailable` mit `component=comment_auth|auth_issue`
- `event=redis_comment_rate_limit_degraded` mit `component=comment_rate_limit`

```bash
docker compose logs backend | grep redis_auth_state_unavailable
docker compose logs backend | grep redis_comment_rate_limit_degraded
```

Schwellenwert-Prüfung (Exit-Code ungleich 0 bei Warnung):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\redis-observability-alerts.ps1
```

Default-Schwellen (5-Minuten-Fenster):
- `redis_auth_state_unavailable >= 1` → WARN
- `redis_comment_rate_limit_degraded >= 3` → WARN

Optionen: `-WindowMinutes`, `-AuthStateUnavailableWarnThreshold`,
`-CommentRateLimitDegradedWarnThreshold`, `-NoFailOnWarn`
