---
phase: 60-smtp-mailfluss-fuer-team4s-einladungen-und-keycloak-accountm
plan: "01"
subsystem: infrastructure
tags: [smtp, mailpit, keycloak, docker-compose, env, ops-docs]
dependency_graph:
  requires: []
  provides:
    - Mailpit-Service im Compose-Stack (SMTP 1025 / Web-UI 8025)
    - Keycloak SMTP-Konfiguration fuer lokalen Mailpit-Versand
    - Dokumentierte SMTP-Env-Defaults und Mailjet-Platzhalter
  affects:
    - docker-compose.yml
    - infra/keycloak/realm-team4s.json
    - .env.example
    - docs/operations/keycloak-auth-foundation-phase43.md
tech_stack:
  added:
    - axllent/mailpit:latest (Docker-Image fuer lokalen SMTP-Catcher)
  patterns:
    - Compose-Service als gemeinsamer SMTP-Stub fuer Backend und Keycloak
    - Kommentierte Produktions-Platzhalter in .env.example ohne reale Secrets
key_files:
  created: []
  modified:
    - docker-compose.yml
    - infra/keycloak/realm-team4s.json
    - .env.example
    - docs/operations/keycloak-auth-foundation-phase43.md
decisions:
  - "Mailpit als einziger lokaler SMTP-Catcher fuer Backend und Keycloak: kein separater SMTP-Stub pro Dienst"
  - "Mailjet-Produktionskonfiguration nur als auskommentierte Platzhalter in .env.example -- niemals echte Credentials ins Repo"
  - "KC_SMTP_* direkt im docker-compose.yml gesetzt: kein separates Keycloak-SMTP-Secret in der lokalen .env noetig"
metrics:
  duration: "~15min"
  completed_date: "2026-06-02"
  tasks: 3
  files: 4
---

# Phase 60 Plan 01: Lokale SMTP-Infrastruktur -- Mailpit, Keycloak-Konfiguration und Env-Doku -- Summary

Lokale SMTP-Infrastruktur vollstaendig hergestellt: Mailpit als gemeinsamer SMTP-Catcher fuer Backend und Keycloak, realm-seitige SMTP-Konfiguration fuer Passwort-Reset-Mails und reproduzierbare Betriebsdoku fuer den spaeteren Mailjet-Produktionswechsel.

## Aufgaben

### Task 1 -- Mailpit-Service in Docker Compose ergaenzen

**Commit:** 6248858f

Service `team4sv30-mailpit` mit Image `axllent/mailpit:latest` wurde in `docker-compose.yml` ergaenzt. SMTP-Port 1025 und Web-UI-Port 8025 sind exponiert. Backend- und Keycloak-Service erhalten SMTP-Env-Variablen, die intern auf `team4sv30-mailpit:1025` zeigen.

Abgedeckte Designentscheidungen: D-03 (gemeinsamer Mailpit-Server), D-05 (eigener Compose-Service), D-06 (lokale Defaults getrennt von Produktion).

### Task 2 -- Keycloak lokale SMTP-Konfiguration

**Commit:** 960bcca8

Im Realm-Import `infra/keycloak/realm-team4s.json` wurde `smtpServer` ergaenzt mit Host `team4sv30-mailpit`, Port 1025, From-Adresse `account@team4s.local`, kein Auth und kein SSL/STARTTLS. `resetPasswordAllowed` bleibt `true`.

Abgedeckte Designentscheidungen: D-01 (Keycloak als Account-Mail-Besitzer), D-07 (Keycloak kann Passwort-Reset-Mails an Mailpit senden).

### Task 3 -- Env-Beispiele und lokale Betriebsdoku aktualisieren

**Commit:** 8951c59c

`.env.example` erhaelt einen neuen SMTP-Abschnitt mit drei Teilen:
- Lokalem Mailpit-Default-Block (`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`) mit Hinweis auf die Mailpit-Web-UI unter `http://127.0.0.1:8025`
- Erklaerung, dass Keycloak-SMTP-Werte bereits im Compose liegen und kein separates Secret noetig ist
- Auskommentiertem Mailjet-Produktionsblock mit Platzhaltern (`<mailjet-api-key>`, `<mailjet-secret-key>`) -- keine echten Credentials

`docs/operations/keycloak-auth-foundation-phase43.md` erhaelt einen neuen Abschnitt "SMTP und Mailversand (lokal und Produktion)" mit:
- Anleitung zum Starten von Mailpit und Verifikation ueber die Web-UI
- Verweis auf die lokalen Env-Defaults in `.env.example`
- Produktionsleitfaden fuer Mailjet mit Env-Variablen-Liste und Sicherheitshinweis

## Deviationen vom Plan

Keine -- Plan wurde exakt wie beschrieben umgesetzt.

## Bekannte Stubs

Keine. Alle dokumentierten Mailjet-Placeholders sind explizit als solche markiert und nicht fuer laufende Funktionalitaet vorgesehen.

## Bedrohungsoberflaeche

Kein neuer Netzwerk-Endpunkt, kein neuer Auth-Pfad, keine Schema-Aenderung. Der Mailpit-Service ist ausschliesslich lokal exponiert (127.0.0.1) und nimmt keine externen Verbindungen an.

## Self-Check: PASSED

- FOUND: .env.example
- FOUND: docs/operations/keycloak-auth-foundation-phase43.md
- FOUND: .planning/phases/60-smtp-mailfluss-fuer-team4s-einladungen-und-keycloak-accountm/60-01-SUMMARY.md
- Commit 6248858f (Task 1): verifiziert
- Commit 960bcca8 (Task 2): verifiziert
- Commit 8951c59c (Task 3): verifiziert
