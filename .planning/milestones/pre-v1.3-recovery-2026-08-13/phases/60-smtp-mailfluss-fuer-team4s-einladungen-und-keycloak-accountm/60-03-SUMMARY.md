---
phase: 60-smtp-mailfluss-fuer-team4s-einladungen-und-keycloak-accountm
plan: "03"
subsystem: contract-frontend-docs
tags: [openapi, contract, fansub, invitations, smtp, ux, docs]
dependency_graph:
  requires:
    - 60-02 (Cancel-on-fail SMTP-Backend)
  provides:
    - OpenAPI-Contract fuer Invitation-Create mit invite_link und 502-Fehlerpfad
    - Frontend-UX auf Mailversand ausgerichtet, 502-Fehler explizit kommuniziert
    - Betriebsdoku Mailpit lokal und Mailjet Produktionswechsel
  affects:
    - shared/contracts/openapi.yaml
    - shared/contracts/fansubs.yaml
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx
    - docs/operations/mail-delivery.md
tech_stack:
  added: []
  patterns:
    - OpenAPI 3.0-Schemas fuer Invitation-Create-Response ohne erfundene Delivery-Felder
    - Cancel-on-fail-Fehlerpfad als 502 im Contract dokumentiert
    - details/summary HTML-Pattern fuer dezenten Entwickler-Fallback-Link
key_files:
  created:
    - docs/operations/mail-delivery.md
  modified:
    - shared/contracts/openapi.yaml
    - shared/contracts/fansubs.yaml
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx
decisions:
  - "D-14 umgesetzt: Contract dokumentiert invite_link als Dev/Copy-Fallback, 502 bei SMTP-Ausfall -- keine erfundenen Delivery-Felder"
  - "D-13 umgesetzt: Erfolgsmeldung 'Einladung wurde gesendet.' statt Copy/Paste-Workaround-Text"
  - "D-15 bestaetigt: FansubAppMembersSection nutzt weiterhin zentralen api.ts-Helfer, keine neuen Bearer-Seams"
  - "D-04 umgesetzt: Mailjet als SMTP-Provider dokumentiert (Host/Port/User/Password/STARTTLS) ohne Secrets"
  - "60-02-Abweichung (Cancel-on-fail) korrekt im Contract verankert: kein migration-0081, kein Delivery-Status-Feld"
metrics:
  duration: "~25min"
  completed_date: "2026-06-02"
  tasks: 3
  files: 5
---

# Phase 60 Plan 03: API-Contract, Frontend-UX und Betriebsdoku -- Summary

OpenAPI-Contract und fansubs.yaml um Invitation- und App-Member-Endpunkte ergaenzt; Frontend-UX auf E-Mail-Versand ausgerichtet mit explizitem 502-SMTP-Fehlerfall; Betriebsdoku fuer lokalen Mailpit-Test und spaetere Mailjet-Produktion erstellt.

## Aufgaben

### Task 1 -- OpenAPI und DTOs synchronisieren

**Commit:** 364c3a89

`shared/contracts/openapi.yaml` und `shared/contracts/fansubs.yaml` um vollstaendige
Invitation- und App-Member-Endpunkte ergaenzt:

- `POST /api/v1/admin/fansubs/{id}/invitations`: 201 mit `FansubGroupInvitationCreateResponse`
  (enthaelt `invite_link` als absoluten Einmal-Link / Dev-Fallback); 502 bei SMTP-Ausfall
  (Cancel-on-fail, `reason_code: mail_delivery_failed`) dokumentiert.
- `GET /api/v1/admin/fansubs/{id}/invitations`: Einladungsliste.
- `POST /api/v1/admin/fansubs/{id}/invitations/{id}/cancel`: Einladung stornieren.
- `POST /api/v1/invitations/accept`: Einladung annehmen (Einmal-Token).
- `GET/POST /api/v1/admin/fansubs/{id}/app-members`: App-Member-Liste und Erstellung.
- Neue Schemas: `FansubGroupInvitationCreateResponse`, `FansubGroupInvitationCreateData`,
  `FansubGroupInvitation`, `FansubGroupInvitationListResponse`, `FansubAppMember`,
  `FansubAppMemberListResponse`, `AcceptFansubInvitationRequest`, `AcceptFansubInvitationResponse`.

Frontend-DTOs in `frontend/src/types/fansub.ts` waren bereits korrekt -- keine Aenderung noetig.
`frontend/src/lib/api.ts` behandelt 502 bereits via `parseApiErrorPayload` als `ApiError` -- keine
Aenderung noetig.

Abgedeckte Designentscheidungen: D-14.

### Task 2 -- Einladungs-UX an Mailversand anpassen

**Commit:** fb561d8f

`FansubAppMembersSection.tsx`:

- Erfolgsmeldung geaendert von *"Einladung wurde erstellt und als Einmal-Link bereitgestellt."*
  zu *"Einladung wurde gesendet."* -- kein Copy/Paste-Workaround-Charakter mehr.
- `createdInviteLink` wird nicht mehr prominent als `Einmal-Link: <code>...</code>` gezeigt,
  sondern als aufklappbares `<details>`-Element (*"Einladungslink (Entwickler-Fallback)"*).
- Hinweistext im Einladungsbereich: *"Der Einladungslink wird per E-Mail zugestellt."*
  statt *"einmal angezeigt"*.
- `formatApiError`: 502 gibt *"Einladungsmail konnte nicht zugestellt werden. Bitte
  SMTP-Konfiguration pruefen."* -- klar verstaendlich fuer Admins.

`FansubAppMembersSection.test.tsx`:

- Bestehender Einladungs-Test prueft jetzt explizit *"Einladung wurde gesendet."* als Erfolgstext.
- Neuer Test `shows smtp error message on 502 invitation failure` prueft die 502-Fehlermeldung.
- Alle 4 Tests bestehen.

`npm run typecheck` besteht ohne Fehler.

Abgedeckte Designentscheidungen: D-13, D-15.

### Task 3 -- Mailpit- und Mailjet-Handoff dokumentieren

**Commit:** f7cb21c4

`docs/operations/mail-delivery.md` erstellt mit:

- Uebersichtstabelle: Team4s Backend vs. Keycloak -- wer schickt welche Mails.
- **Lokal Mailpit:** Ports (1025/8025), Web-UI, alle Backend-SMTP-Env-Variablen mit
  lokalen Defaults, Keycloak-KC_SMTP_*-Werte, Fehlerpfad 502/Cancel-on-fail erklaert,
  lokaler Test-Ablauf Schritt fuer Schritt.
- **Produktion Mailjet:** alle Team4s-Backend-Env-Werte fuer Mailjet (Host, Port, User,
  Password, STARTTLS, APP_PUBLIC_URL), Keycloak-KC_SMTP_*-Werte, Sicherheitshinweis
  zu Secrets, Verweis auf Mailjet-Account-URL.
- Tabelle aller beteiligten Dateien.

Kein Account-spezifisches Secret committed. `.env.example` war bereits durch Plan 60-01
aktualisiert und enthaelt Mailjet-Kommentarblock.

Abgedeckte Designentscheidungen: D-04.

## Deviationen vom Plan

### Keine Aenderung an frontend/src/types/fansub.ts und frontend/src/lib/api.ts noetig

**Begruendung:** Die Frontend-DTOs in `fansub.ts` spiegelten bereits die korrekte Backend-Response
wider (`invite_link`-Feld vorhanden, kein Delivery-Status-Feld). Die `createFansubGroupInvitation`-
Funktion in `api.ts` nutzte bereits `parseApiErrorPayload` und wirft `ApiError` mit dem korrekten
HTTP-Status -- 502 wird automatisch korrekt behandelt. Keine Code-Aenderung war noetig, nur die
Dokumentation im Contract.

**Einordnung:** Kein Abweichungstyp -- Plan-Vorbedingung war bereits erfuellt.

### .env.example nicht veraendert

**Begruendung:** `.env.example` wurde durch Plan 60-01 bereits vollstaendig mit SMTP-Env-Werten
und Mailjet-Kommentarblock aktualisiert. Eine erneute Bearbeitung haette nur Duplikate erzeugt.

## Bekannte Stubs

Keine. Alle drei Tasks sind vollstaendig umgesetzt. Mail-Template-UX (HTML-Gestaltung der
Einladungsmail) ist bewusst einfach gehalten und kann spaeter als eigener UX-Slice erweitert
werden -- kein Stub, da der Mailversand funktioniert.

## Bedrohungsoberflaeche

Keine neuen Bedrohungsflaechen durch diesen Plan. Die Betriebsdoku enthaelt explizite
Sicherheitshinweise, dass SMTP-Credentials nie committed werden duerfen.

## Self-Check: PASSED

- FOUND: shared/contracts/openapi.yaml (Invitation- und App-Member-Schemas und Pfade ergaenzt)
- FOUND: shared/contracts/fansubs.yaml (Invitation- und App-Member-Endpunkte ergaenzt)
- FOUND: frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx (UX-Text aktualisiert)
- FOUND: frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx (4 Tests, alle gruen)
- FOUND: docs/operations/mail-delivery.md (erstellt)
- Commit 364c3a89 (Task 1): verifiziert
- Commit fb561d8f (Task 2): verifiziert
- Commit f7cb21c4 (Task 3): verifiziert
- vitest run FansubAppMembersSection: 4/4 PASS
- npm run typecheck: PASS (keine Fehler)
