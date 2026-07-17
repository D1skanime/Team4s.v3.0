# Phase 43: Keycloak Auth Foundation

## Ziel
Phase 43 trennt Identität und Business-Autorisierung sauber:

- Keycloak ist nur für Login, Token und Session-Lifecycle zuständig.
- Team4s bleibt die fachliche Autorität für `app_users`, globale App-Rollen und Fansub-Rollen.
- `fansub_lead` lebt ausschließlich in Team4s-Datenbanktabellen, nie als Keycloak-Rolle.

## Wichtige Grenzen

### Keycloak besitzt
- Login
- OIDC-Tokens
- Session-Ende und Backchannel-Logout
- Realm/Client-Bootstrap für lokale Entwicklung

### Team4s besitzt
- `app_users`
- `app_user_global_roles`
- `fansub_group_members`
- `fansub_group_member_roles`
- Auswertung von `platform_admin` und `fansub_lead`

### Nicht tun
- Keine fachlichen Fansub-Rollen aus JWT-Claims ableiten.
- Kein `fansub_lead` in Keycloak anlegen oder auswerten.
- Keine Rückkehr zu Legacy-`user_roles` als neue Phase-43-Quelle.

## Lokale Voraussetzungen

### Relevante `.env`-Werte
```env
AUTH_TOKEN_SECRET=team4s-local-dev-secret
KEYCLOAK_ENABLED=true
KEYCLOAK_ISSUER_URL=http://127.0.0.1:8081/realms/team4s
KEYCLOAK_DISCOVERY_URL=http://team4sv30-keycloak:8080/realms/team4s
KEYCLOAK_CLIENT_ID=team4s-frontend
KEYCLOAK_API_AUDIENCE=team4s-api
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
KEYCLOAK_DB_PASSWORD=keycloak_dev_password
NEXT_PUBLIC_API_URL=http://127.0.0.1:8092
NEXT_PUBLIC_KEYCLOAK_ENABLED=true
NEXT_PUBLIC_KEYCLOAK_BASE_URL=http://127.0.0.1:8081
NEXT_PUBLIC_KEYCLOAK_REALM=team4s
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=team4s-frontend
```

## Bootstrap

### 1. Datenbank, Redis und Keycloak starten
```powershell
docker compose up -d team4sv30-db team4sv30-redis keycloak-db keycloak
```

### 2. Backend und Frontend starten
```powershell
docker compose up -d --build team4sv30-backend team4sv30-frontend
```

### 3. Realm und Client prüfen
- Keycloak Admin Console: `http://127.0.0.1:8081`
- Realm: `team4s`
- Client: `team4s-frontend`
- API-Audience: `team4s-api`
- Import-Datei: [infra/keycloak/realm-team4s.json](/C:/Users/admin/Documents/Team4s/infra/keycloak/realm-team4s.json)
- Lokale Session-Zielwerte: Access-Token 5 Minuten, SSO-Idle 24 Stunden, SSO-Max 24 Stunden. Das Frontend soll Access-Tokens automatisch per Refresh erneuern, sodass Benutzer bis zu 24 Stunden angemeldet bleiben, außer sie melden sich aktiv ab.

### 4. Bootstrap-Benutzer
- `platform-admin` / `Team4sAdmin123!`
- E-Mail: `platform-admin@team4s.local`

Der Realm-Export enthaelt keine Team4s-Realm-Benutzer. Lokale Benutzer werden gezielt nach dem frischen Import angelegt.

## Erster Team4s-`platform_admin`

### Ablauf
1. Den lokalen Bootstrap-Admin im Realm `team4s` anlegen.
2. Mit `platform-admin` ueber [frontend/src/app/auth/page.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/auth/page.tsx) anmelden.
3. Dadurch erzeugt Team4s beim ersten `/api/me`-Zugriff einen `app_user`.
4. Danach in der Team4s-Datenbank `platform_admin` setzen.

### Keycloak-Bootstrap

```powershell
docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://127.0.0.1:8080 --realm master --user admin --password admin
docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh create users -r team4s -s username=platform-admin -s email=platform-admin@team4s.local -s firstName=Platform -s lastName=Admin -s enabled=true -s emailVerified=true
$userId = docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh get users -r team4s -q username=platform-admin --fields id | ConvertFrom-Json | Select-Object -ExpandProperty id
docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh set-password -r team4s --userid $userId --new-password Team4sAdmin123! --temporary=false
```

### SQL
```sql
UPDATE app_users
SET status = 'active', updated_at = NOW()
WHERE email = 'platform-admin@team4s.local';

INSERT INTO app_user_global_roles (app_user_id, role, created_at)
SELECT au.id, 'platform_admin', NOW()
FROM app_users au
WHERE au.email = 'platform-admin@team4s.local'
ON CONFLICT (app_user_id, role) DO NOTHING;
```

### Prüfen
```sql
SELECT au.id, au.email, augr.role
FROM app_users au
LEFT JOIN app_user_global_roles augr ON augr.app_user_id = au.id
WHERE au.email = 'platform-admin@team4s.local'
ORDER BY au.id, augr.role;
```

## `/api/me` als stabile Session-Seam
- Frontend nutzt `/api/v1/me` als erste verlässliche Runtime-Prüfung.
- Erwartung: erfolgreicher Keycloak-Login plus Keycloak-`access_token` mit `aud` = `team4s-api` als Team4s-Bearer ergibt einen aufgelösten Team4s-`app_user`.
- `id_token` bleibt ein Login-/Identitätsartefakt für den Client und darf nicht als Team4s-API-Bearer akzeptiert werden.
- Pending-Benutzer dürfen `/api/me` lesen, aber keine geschützten Admin-Mutationen ausführen.
- Geschützte Admin-Requests ziehen ein abgelaufenes Access-Token im Frontend transparent genau einmal per Refresh-Token nach und wiederholen dann den ursprünglichen Request einmal.

## Browserprofil-Regel
- Ein Browserprofil darf immer nur genau einen aktiven Team4s-App-User gleichzeitig halten.
- Wenn sich im selben Browserprofil ein anderer User neu anmeldet, beendet Team4s die alte lokale Session hart und signalisiert den Wechsel per Cross-Tab-Event.
- Bereits offene Tabs dieses Browserprofils verlieren ihren alten App-Kontext sofort und wechseln kontrolliert auf `/auth`.
- Verschiedene Browser oder getrennte Browserprofile dürfen weiterhin unterschiedliche Team4s-User parallel halten.

## Docker-Hinweis zu Issuer und Discovery
- In Docker darf der Backend-Verifier einen internen Discovery-Endpunkt nutzen, während der öffentliche Issuer konsequent auf `127.0.0.1` zeigt.
- Standard im Compose-Setup:
  - `KEYCLOAK_ISSUER_URL=http://127.0.0.1:8081/realms/team4s`
  - `KEYCLOAK_DISCOVERY_URL=http://team4sv30-keycloak:8080/realms/team4s`
  - `KEYCLOAK_CLIENT_ID=team4s-frontend`
  - `KEYCLOAK_API_AUDIENCE=team4s-api`
- So bleiben Browser-Redirects und JWT-`iss` stabil, während das Backend JWKS intern ohne Host-Port-Umweg laden kann.

## Backchannel-Logout
- Backend-Endpunkt: `POST /api/v1/auth/keycloak/backchannel-logout`
- Keycloak liefert `logout_token`.
- Team4s invalidiert die lokale Session über Redis-Schlüssel pro `sid` und `sub`.
- Zusätzliche Persistenzmarke: `app_users.last_logout_at`

## Wenn Realm-Import nicht neu greift
Keycloak importiert `realm-team4s.json` nur sauber auf frischem Keycloak-Datenstand. Wenn Realm oder Client schon existieren, ist das bestehende Keycloak-DB-Volume die wahrscheinliche Ursache.

### Nicht-destruktives Update für bestehende lokale Realms
Wenn das Volume behalten werden soll, muss die API-Audience live ergänzt werden:

1. Client `team4s-api` anlegen.
2. Client Scope `team4s-api` mit Audience Mapper `included.client.audience=team4s-api` anlegen.
3. Den Scope als Default Client Scope von `team4s-frontend` hinzufügen.
4. Danach ein neues Token holen und prüfen, dass `access_token.aud` `team4s-api` enthält, während `id_token.aud` `team4s-frontend` bleibt.

### Absichtlicher Reset
```powershell
docker compose down
docker volume rm team4s_keycloak_db_data
docker compose up -d keycloak-db keycloak
```

Wenn der Volume-Name lokal anders lautet, zuerst prüfen:
```powershell
docker volume ls
```

## Phase 104: Account Console 403 – Ursache und Fix

### Reproduktion
Der externe Keycloak Account Console Link (`/realms/team4s/account`, geöffnet aus
`AccountSecurityCard.tsx` in einem neuen Tab) lud die Seite selbst mit HTTP 200,
aber die Account-REST-API, die die Account-Console-SPA beim Rendern intern aufruft
(`GET /realms/team4s/account`, `GET /realms/team4s/account/credentials`, ...),
antwortete für jeden echten Login mit HTTP 403. Reproduzierbar mit einem echten
Authorization-Code-/PKCE-Login gegen den Client `account-console` und einem
anschließenden `GET .../account` mit `Accept: application/json` und dem erhaltenen
Bearer-Token.

### Ursache (evidenzbasiert)
`infra/keycloak/realm-team4s.json` deklariert eine eigene `clientScopes`-Liste
(`profile`, `email`, `team4s-api`). Keycloaks Realm-Import behandelt eine
mitgelieferte `clientScopes`-Liste als abschließend und legt dadurch **nicht**
automatisch den eingebauten `roles`-Scope an. Ohne diesen Scope trägt kein Token in
diesem Realm jemals `realm_access`/`resource_access`-Claims. Die eingebauten
Clients `account`/`account-console` (von Keycloak selbst gebootstrapt, weil sie in
der JSON absichtlich **nicht** redeklariert werden – siehe nächster Absatz) bekamen
dadurch nie `roles` in ihre `defaultClientScopes`. Ihre Access-Tokens enthielten
deshalb kein `resource_access.account.roles`, obwohl der einloggende Nutzer über
`default-roles-team4s` durchaus die Client-Rollen `view-profile`/`manage-account`
auf dem `account`-Client besitzt. Die eingebaute Account-REST-API von Keycloak
prüft exakt dieses Claim und antwortete deshalb konsequent mit 403.

Wichtiger Nebenbefund: Eine explizite Redeklaration der Clients `account` und
`account-console` in der Realm-JSON (naheliegender erster Fixversuch, um ihnen
`defaultClientScopes: ["roles"]` mitzugeben) wurde live gegen eine frische
Keycloak-26-Instanz getestet und unterdrückt dabei Keycloaks eigenes Bootstrapping
der Standard-Rollen (`view-profile`, `manage-account`, `manage-account-links`,
`delete-account`) und der `default-roles-team4s`-Composite-Zuordnung auf dem
`account`-Client. Deshalb bleiben `account`/`account-console` in der Realm-JSON
absichtlich undeklariert.

### Fix
1. `infra/keycloak/realm-team4s.json` deklariert jetzt zusätzlich den
   Standard-`roles`-Scope (mit den drei Standard-Protocol-Mappern `audience
   resolve`, `realm roles`, `client roles`). Das stellt sicher, dass ein frischer
   Import den Scope kennt und Keycloaks eigenes Bootstrapping die
   `default-roles-team4s`-Composites korrekt auf `view-profile`/`manage-account`
   des `account`-Clients setzt.
2. Weil eine eigene `clientScopes`-Liste auch verhindert, dass Keycloak `roles`
   automatisch als *Default*-Scope auf die eingebauten Clients `account` und
   `account-console` anwendet, übernimmt `scripts/verify-keycloak-config.ps1`
   diesen einen verbleibenden Schritt idempotent über die Admin-REST-API. Dieses
   Skript ist für **beide** Szenarien identisch:
   - **Frischer Import:** `docker compose up -d keycloak-db keycloak` (importiert
     die aktualisierte `realm-team4s.json` inklusive `roles`-Scope), danach einmal
     `powershell -ExecutionPolicy Bypass -File scripts/verify-keycloak-config.ps1`
     ausführen. Das Skript legt den Scope an, falls er fehlt, weist ihn `account`
     und `account-console` als Default-Scope zu und beweist per echtem PKCE-Login,
     dass `/realms/team4s/account` keinen 403 mehr liefert.
   - **Bestehendes Volume (nicht-destruktiv):** Realm-Import wird von Keycloak bei
     bereits vorhandenem Realm übersprungen. Denselben Befehl
     (`powershell -ExecutionPolicy Bypass -File scripts/verify-keycloak-config.ps1`)
     gegen das laufende `team4sv30-keycloak` ausführen; er erkennt den fehlenden
     `roles`-Scope bzw. die fehlende Default-Scope-Zuordnung und ergänzt sie
     idempotent, ohne bestehende Nutzer, Realm-Rollen oder andere Clients
     anzufassen.
3. Das Skript unterstützt `-SkipApply` (nur prüfen, nichts ändern – z. B. für
   CI/Read-only-Kontexte) und `-SkipLiveCheck` (nur die statische Realm-JSON und
   die Live-Scope-Zuordnung prüfen, ohne einen echten Login durchzuführen).

### Was bewusst unverändert bleibt
- Keine Passwort-Policy, kein Brute-Force-/Lockout-Schutz, keine
  E-Mail-Verifikationspflicht (D-11/D-12/D-14) – das Skript prüft das explizit mit.
- `team4s-frontend.directAccessGrantsEnabled` bleibt `true` als dokumentierte
  lokale Testkonfiguration (D-13).
- Die Realm-Rolle `user` bleibt eine reine lokale lose Login-Rolle; sie wird nicht
  automatisch zu einer Team4s-Berechtigung (D-15). Der `roles`-Scope-Fix betrifft
  ausschließlich Keycloaks eigene Account-Console-Autorisierung, nicht
  Team4s-Autorisierung – das Team4s-Backend liest `realm_access`/`resource_access`
  ohnehin nicht aus (siehe „Team4s besitzt“ oben).

### Verifikation
```powershell
docker compose config
powershell -ExecutionPolicy Bypass -File scripts/verify-keycloak-config.ps1
```
Zusätzlich manuell: Auf `/me/profile` „Accountdaten verwalten“ in einem neuen Tab
öffnen, Name/E-Mail/Passwort verwalten, ohne 403.

## SMTP und Mailversand (lokal und Produktion)

### Lokale Entwicklung: Mailpit

Der Compose-Service `team4sv30-mailpit` fängt alle ausgehenden Mails ab, ohne sie wirklich zu versenden.

- SMTP-Endpunkt (intern im Compose-Netz): `team4sv30-mailpit:1025`
- Web-UI zum Lesen empfangener Mails: `http://127.0.0.1:8025`

Beide Dienste -- Backend und Keycloak -- zeigen lokal auf denselben Mailpit-Server, sodass sowohl Team4s-eigene Transaktionsmails als auch Keycloak-Account-Mails (Passwort-Reset, Einladungen) in der Mailpit-UI erscheinen.

Mailpit starten:
```powershell
docker compose up -d team4sv30-mailpit
```

Danach eine Keycloak-Passwort-Reset-Mail auslösen (Keycloak Admin Console oder `/auth`-Seite) und in der Mailpit-UI unter `http://127.0.0.1:8025` prüfen.

#### Lokale Env-Werte (Backend-SMTP)

Die folgenden Standardwerte sind in `.env.example` dokumentiert und per `docker-compose.yml` bereits als Backend-Env gesetzt -- in der lokalen `.env` muss nichts extra konfiguriert werden:

```env
SMTP_HOST=team4sv30-mailpit
SMTP_PORT=1025
SMTP_FROM=noreply@team4s.local
```

Keycloak bekommt seine lokalen SMTP-Werte direkt aus `docker-compose.yml` (`KC_SMTP_HOST`, `KC_SMTP_PORT`, `KC_SMTP_FROM`). Kein lokales Keycloak-SMTP-Secret nötig.

### Produktion: Mailjet (SMTP-Relay)

Für Produktionsumgebungen wird Mailjet als SMTP-Relay eingesetzt. Die Zugangsdaten kommen als SMTP-Credentials und dürfen **niemals** ins Repository committed werden.

Zu setzende Env-Variablen in der Produktions-Infrastruktur:
```env
SMTP_HOST=in-v3.mailjet.com
SMTP_PORT=587
SMTP_FROM=noreply@team4s.de
SMTP_USER=<mailjet-api-key>
SMTP_PASSWORD=<mailjet-secret-key>
```

Keycloak in Produktion benötigt analoge `KC_SMTP_*`-Variablen mit demselben Mailjet-Endpunkt.

Vollständige Platzhalter-Dokumentation: siehe `.env.example`.

---

## Empfohlener schneller Dev/Test-Flow
1. `/auth` öffnen.
2. Mit Keycloak anmelden.
3. Prüfen, dass `/api/me` einen `app_user` liefert.
4. Falls nötig einmalig `platform_admin` per SQL setzen.
5. `/admin/fansubs/:id/edit` öffnen und Mitglieder/Lead testen.
6. Zum Zurücksetzen lokal abmelden oder Cookies/Storage löschen.

## Phase-44-Handoff
Phase 44 muss auf diesen Seams aufbauen:

- authentifizierter Principal: `CurrentUser`/`AuthIdentity` mit `AppUserID`, `GlobalRoles`, `AppUserStatus`
- globale Rollen: `app_user_global_roles`
- Fansub-Mitgliedschaft: `fansub_group_members`
- gruppenspezifische Rollen: `fansub_group_member_roles`

Phase 44 darf nicht:

- auf Keycloak-Rollenclaims als fachliche Autorisierung umfallen
- Legacy-`users`/`user_roles` wieder als primäre App-Autorisierung behandeln
- eine parallele Gruppen-/Mitgliedschaftslogik neben den Phase-43-Tabellen erfinden
