# Mail-Zustellung: Lokaler Mailpit-Betrieb und Mailjet-Produktionswechsel

## Übersicht

Team4s nutzt zwei SMTP-Quellen:

| Quelle | Verantwortlich für |
|--------|-------------------|
| Team4s Backend | Fansub-Gruppeneinladungen und künftige App-Domain-Mails |
| Keycloak | Account-Mails: Passwort vergessen, E-Mail-Verifikation, Account Actions |

Lokal zeigen beide auf denselben Mailpit-SMTP-Server. Mailpit fängt alle Mails ab,
ohne echte Adressen zu erreichen.

---

## Lokaler Betrieb mit Mailpit

### Voraussetzungen

Docker Compose läuft (`docker compose up -d`). Mailpit ist im Compose-Stack
als `team4sv30-mailpit` enthalten und startet automatisch.

### Ports

| Port | Zweck |
|------|-------|
| `1025` | SMTP-Empfang (alle lokalen Dienste) |
| `8025` | Mailpit Web-UI |

### Web-UI aufrufen

```
http://127.0.0.1:8025
```

Eingehende Mails erscheinen dort in Echtzeit. Alle Links in den Mails sind klickbar.

### Team4s Backend — SMTP-Env-Werte (lokal)

Das Backend liest SMTP-Konfiguration aus Umgebungsvariablen. Die lokalen Defaults
in `docker-compose.yml` zeigen bereits auf Mailpit:

| Variable | Lokaler Default | Beschreibung |
|----------|-----------------|--------------|
| `SMTP_ENABLED` | `true` | `true` aktiviert echten SMTP-Versand (`docker-compose.yml`-Default) |
| `SMTP_HOST` | `team4sv30-mailpit` | SMTP-Server-Hostname |
| `SMTP_PORT` | `1025` | SMTP-Port |
| `SMTP_FROM` | `noreply@team4s.local` | Absender-Adresse |
| `SMTP_FROM_NAME` | `Team4s` | Absender-Anzeigename |
| `SMTP_USER` | *(leer)* | SMTP-Auth-Benutzername |
| `SMTP_PASSWORD` | *(leer)* | SMTP-Auth-Passwort |
| `SMTP_STARTTLS` | `false` | STARTTLS-Upgrade erzwingen (lokal aus; Produktion auf `true`) |
| `APP_PUBLIC_URL` | `http://127.0.0.1:3002` | Basis-URL für absolute Links in Mails |

> **Hinweis:** Die Config liest primär die kanonischen Namen `SMTP_FROM` und
> `SMTP_USER`. Die früheren Namen `SMTP_FROM_EMAIL` und `SMTP_USERNAME` werden aus
> Kompatibilitätsgründen weiterhin als Fallback akzeptiert.

Der lokale Mailversand ist über `docker-compose.yml` standardmäßig aktiviert
(`SMTP_ENABLED=true`). Um ihn zu deaktivieren, setze in `.env`:

```dotenv
SMTP_ENABLED=false
```

Wenn `SMTP_ENABLED=false`, nutzt das Backend einen `NoopMailer`:
alle Mails werden lautlos verworfen. Der Einladungs-`invite_link` im Response
kann dann als Entwickler-Fallback genutzt werden.

### Fehlerpfad bei SMTP-Ausfall

Schlägt der SMTP-Versand fehl (z.B. Mailpit nicht erreichbar), passiert Folgendes:

1. Die Einladung wird sofort storniert (kein stiller `pending`-Record).
2. Ein Audit-Event `fansub_group_invitation.mail_failed` wird geschrieben.
3. Der Endpunkt gibt `502 Bad Gateway` zurück:
   ```json
   { "error": { "message": "Einladung konnte nicht gesendet werden. Bitte prüfe die SMTP-Konfiguration.", "reason_code": "mail_delivery_failed" } }
   ```
4. Die UI zeigt: *"Einladungsmail konnte nicht zugestellt werden. Bitte SMTP-Konfiguration prüfen."*

### Keycloak — SMTP-Konfiguration (lokal)

Keycloak erhält die SMTP-Daten über `KC_SMTP_*`-Env-Variablen in `docker-compose.yml`.
Die Defaults zeigen ebenfalls auf Mailpit:

```yaml
KC_SMTP_HOST: team4sv30-mailpit
KC_SMTP_PORT: 1025
KC_SMTP_FROM: account@team4s.local
KC_SMTP_AUTH: "false"
KC_SMTP_SSL: "false"
KC_SMTP_STARTTLS: "false"
```

Zusätzlich ist `smtpServer` im Realm-Export `infra/keycloak/realm-team4s.json`
fest auf Mailpit eingestellt. Wenn der Realm neu importiert wird, sind Keycloak-Mails
automatisch in Mailpit sichtbar — kein manueller Admin-UI-Schritt nötig.

### Lokaler Test-Ablauf

1. `docker compose up -d` starten (`SMTP_ENABLED=true` ist Compose-Default).
2. Fansub-Einladung über Admin-UI oder API erstellen.
3. Mailpit Web-UI unter `http://127.0.0.1:8025` öffnen → Einladungsmail erscheint.
4. Einladungslink in der Mail klicken → Weiterleitung zur Annahme-Seite.
5. Keycloak-Passwort-Reset auslösen (z.B. über `http://127.0.0.1:8081`).
6. Reset-Mail in Mailpit prüfen → Link funktioniert lokal.

---

## Produktionswechsel auf Mailjet

### Konzept

Mailjet wird als generischer SMTP-Provider genutzt. Es sind **keine Code-Änderungen**
nötig — nur Env-Variablen werden umgestellt.

### Team4s Backend — SMTP-Env-Werte (Produktion mit Mailjet)

```dotenv
SMTP_ENABLED=true
SMTP_HOST=in-v3.mailjet.com
SMTP_PORT=587
SMTP_FROM=noreply@team4s.de
SMTP_FROM_NAME=Team4s
SMTP_USER=<mailjet-api-key>
SMTP_PASSWORD=<mailjet-secret-key>
SMTP_STARTTLS=true
APP_PUBLIC_URL=https://team4s.de
```

> **Sicherheitshinweis:** `SMTP_USER` und `SMTP_PASSWORD` sind Mailjet-API-Key und
> Secret-Key. Diese dürfen **niemals** in das Repository committed werden.
> Env-Variablen in `.env` sind in `.gitignore` ausgenommen; Produktionswerte kommen
> aus dem Deployment-Secret-Management.

### Keycloak — SMTP-Env-Werte (Produktion mit Mailjet)

Keycloak erhält dieselben Mailjet-Zugangsdaten über `KC_SMTP_*` in der
Produktions-Compose-Konfiguration oder dem Kubernetes-Secret:

```dotenv
KC_SMTP_HOST=in-v3.mailjet.com
KC_SMTP_PORT=587
KC_SMTP_FROM=account@team4s.de
KC_SMTP_AUTH=true
KC_SMTP_SSL=false
KC_SMTP_STARTTLS=true
KC_SMTP_USER=<mailjet-api-key>
KC_SMTP_PASSWORD=<mailjet-secret-key>
```

Alternativ kann die Keycloak-SMTP-Konfiguration über die Admin-UI unter
*Realm Settings → Email* gesetzt werden (Änderung gilt sofort, kein Neustart).

### Mailjet-Account

Mailjet-API-Keys werden unter [app.mailjet.com → API Key Management](https://app.mailjet.com/account/api_keys)
erstellt. Für Transactional Mail wird ein Sender mit verifizierter Domain benötigt.

---

## Verwandte Dateien

| Datei | Zweck |
|-------|-------|
| `docker-compose.yml` | Mailpit-Service, Keycloak-SMTP-Env, Backend-SMTP-Env |
| `.env.example` | Dokumentierte lokale Env-Werte (keine Secrets) |
| `infra/keycloak/realm-team4s.json` | Realm-Import mit Mailpit-SMTP-Defaults |
| `backend/internal/config/config.go` | SMTP-Konfigurationsfelder im Backend |
| `backend/internal/services/mailer.go` | SMTPMailer und NoopMailer |
| `backend/internal/handlers/app_auth.go` | `CreateFansubGroupInvitation` mit Cancel-on-fail |
