---
created: 2026-10-19T21:30:00+00:00
title: „Accountdaten verwalten“ führt zu Keycloak-Fehlerseite
area: auth-profile
status: open
files:
  - frontend/src/app/me/profile/components/AccountSecurityCard.tsx
  - backend/internal/handlers/app_profile.go
  - .env (KEYCLOAK_ACCOUNT_URL)
---

## Problem (Nutzerbefund 19.10.2026)

Als eingeloggter User auf `/me/profile` → Knopf „Accountdaten verwalten“ öffnet die Keycloak-Account-Konsole in neuem Tab. Dort steht nur:

> Ein Fehler ist aufgetreten — Entschuldigung, es ist ein unerwarteter Fehler aufgetreten.

## Erste Analyse (Hypothese, nicht bestätigt)

- Der Link kommt aus `profile.keycloak_account_url` (Backend `resolveKeycloakAccountURL`, `app_profile.go:820`) bzw. `.env`: `KEYCLOAK_ACCOUNT_URL=http://192.168.235.196:18081/realms/team4s/account`.
- Das ist eine **nicht sichere** Herkunft (http + LAN-IP, nicht localhost). Die Keycloak-Account-Konsole (v3, Keycloak 26.x) ist eine Single-Page-App mit PKCE und braucht dafür `crypto.subtle`, das Browser nur in einem Secure Context (https oder localhost) bereitstellen. Gleiches Muster wie bei unserem eigenen Login, der deshalb nur über den Tunnel `127.0.0.1:3300` funktioniert.
- Das Keycloak-Log zeigt passend dazu dauerhaft „Non-secure context detected; cookies are not secured …“.
- Der Login selbst funktioniert, weil die Keycloak-Login-Seite serverseitig gerendert ist; nur die Account-Konsole als JS-App scheitert.

## Zu prüfen / mögliche Lösungen

1. Hypothese bestätigen: Browser-Konsole auf der Fehlerseite (crypto.subtle / PKCE-Fehler?), Keycloak-Log auf ERROR beim Aufruf.
2. Prüfen, ob der Client `account-console` im Realm `team4s` aktiv ist und Redirect-URIs/Web-Origins zur aufgerufenen URL passen.
3. Lösungsvarianten: Account-URL über eine sichere Herkunft ausliefern (Tunnel/localhost-Port für Keycloak, bzw. später https mit Zertifikat), ODER den Knopf ausblenden bzw. mit Hinweis versehen, solange keine sichere Herkunft verfügbar ist, ODER die benötigten Kontoaktionen (Passwort ändern, E-Mail) in Team4s selbst anbieten.
4. Gilt nur für die Dev-Umgebung auf der VM? Bei einer späteren https-Bereitstellung wäre das Problem vermutlich von selbst weg — trotzdem sollte der Knopf heute nicht auf eine Fehlerseite führen.
