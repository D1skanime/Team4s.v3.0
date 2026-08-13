---
phase: 95-rollenmodell-entwirren-gruppen-vs-projekt-ebene-techadmin-gf
plan: "06"
subsystem: fullstack
tags: [go, nextjs, migration, docker, roles, capabilities, human-verify, gap-closure]

dependency_graph:
  requires:
    - phase: 95-02
      provides: GET /admin/fansub-group-roles Endpunkt + dynamischer Catalog
    - phase: 95-03
      provides: hist-Whitelist + Auto-Archivierung
    - phase: 95-04
      provides: AdminCapabilityHandler Interface-Refaktor
    - phase: 95-05
      provides: Frontend-Umbau (Typen, API, Consumer)
  provides:
    - ProposalForm.tsx / ProposalForm.steps.tsx / dev-ui-system-page.tsx <=450 Zeilen (D-16)
    - Backend-Docker-Rebuild + Migration 0112/0113 angewandt
    - Gap G1: member-scoped Rollen-Laden im App-Add-Flow (context=fansub_group)
    - Gap G2: hist-Dialog zeigt techadmin/gfxler (redundante Kontext-Bedingung entfernt)
    - Leader-Terminologie vereinheitlicht (Gruppenleitung/Leiter -> Leader, Migration 0113)
    - fansub_lead aus App-Add-Picker ausgeschlossen (dedizierter SetFansubLead-Pfad)
    - Gap G4: Capability-Editierbarkeit von Gruppen-Zuweisbarkeit entkoppelt
  affects: []
---

# Plan 95-06 — Datei-Splits D-16 + Backend-Rebuild + Human-Verify

## Task 1 — Datei-Splits (D-16)
`ProposalForm.tsx` (350 Z.), `ProposalForm.steps.tsx` (324 Z.), `dev/ui-system/page.tsx` (348 Z.)
sowie die ausgelagerten Showcase-Dateien liegen alle bei/unter 450 Zeilen. Commit `34f41799`.

## Task 2 — Backend-Rebuild + Migration
Backend-Docker-Image neu gebaut; Migration `0112 role_model_cleanup` angewandt (Pending: 0);
Endpunkt `GET /admin/fansub-group-roles` live. Keycloak läuft in diesem Setup auf **:8081**
(nicht :8080), der neue Endpunkt ist Platform-Admin-only — der App-Add-Flow nutzt daher den
member-scoped Weg (siehe Gap G1). Später zusätzlich Migration `0113 fansub_lead_label_leader`.

## Task 3 — Human-Verify (mit Live-UAT durch Nutzer)
Der Human-Verify hat mehrere reale Defekte aufgedeckt, die vor Abschluss vollständig behoben
und jeweils live (:3000, echte Daten, echte Tokens) verifiziert wurden:

### Gap G1 — techadmin/GFX fehlten im App-Mitglied-Add-Picker (D-12-Kontraktbruch)
Der platform-admin-only Catalog lieferte Fansub-Leitungen 403 → falscher statischer Fallback;
Admins bekamen Codes ohne `label_de` (leere Chips). **Fix:** member-scoped
`GET /admin/fansubs/:id/role-definitions?context=fansub_group` (liefert `label_de`+`sort_order`,
Authz `ActionFansubGroupMembersView`); Frontend darauf umverdrahtet. Commits `f55fe902`, `e8bdb505`.

### Gap G2 — historische Rolle nicht wählbar / techadmin+gfxler fehlten
`ListGroupHistoryRoleDefinitions` filterte zusätzlich `'group_history' = ANY(contexts)` —
redundant zur expliziten Whitelist und schloss techadmin/gfxler (nur Kontext fansub_group) aus.
Bedingung entfernt; Whitelist ist alleinige Kuration. Commit `f55fe902`.

### Leader-Terminologie + Add-Picker
- `fansub_lead` aus dem App-Add-Picker ausgeschlossen — die Gruppenleitung wird ausschließlich
  über den dedizierten `SetFansubLead`-Pfad gesetzt. Commit `d283d918`.
- „Gruppenleitung"/„Leiter" durchgängig durch **„Leader"** ersetzt (Migration 0113 für das
  DB-Label + Frontend-Strings). Commit `26216349`.

### Gap G4 — Capability-Editierbarkeit entkoppelt von Gruppen-Zuweisbarkeit
Aktive Contribution-/Projekt-Rollen (encoder, editor, translator …) tragen reale Rechte, waren
aber im Capability-UI gesperrt, weil der Guard an `IsKnownFansubGroupRole` (nur die 6
Gruppen-Picker-Rollen) hing. **Fix:** neuer Katalog `capabilityRoleCatalog` +
`IsCapabilityBearingRole` (Rollen mit Kontext `fansub_group` ODER `anime_contribution`);
Grant/Revoke-Guard umgestellt (Fehlercode `role_not_capability_bearing`); Matrix-Feld
`capability_editable`; Frontend-Badges dreistufig (Aktive App-Rolle / Projekt-/Release-Rolle /
Historische Rolle) und Editierbarkeit an `capability_editable` gekoppelt. Commits `decdda78`, `aab33906`.

**End-to-End live verifiziert:** Grant `encoder → fansub_group.members.view` als Platform-Admin;
ein Encoder-User (`ao-encoder`) erhält daraufhin 200 statt 403 auf dem geschützten Endpunkt,
nach Revoke wieder 403. Die in der Capability-Matrix gesetzten Rechte greifen also für alle
Träger der Rolle (`canForContext` prüft alle Gruppenrollen gegen `role_capabilities`).

## Verifikation
- Go: `go build ./...` + `go test ./...` grün (alle Pakete).
- Frontend: `tsc --noEmit` grün; Vitest role-capabilities 23/23, FansubAppMembersSection 5/5.
- Live (:3000 Prod-Build nach `docker compose up -d --build`): Human-Verify durch Nutzer bestätigt.

## Nachgelagert (eigene Phase — Rollenmodell-Rework, NICHT Phase 95)
- **Zwei-Rollen-Koexistenz (Sheppert-Modell):** Person hält gleichzeitig historische Rolle
  (z. B. Leader, ohne Rechte) und aktive App-Rolle (z. B. Timer, mit Rechten). Datentechnisch
  bereits möglich (`hist_group_member_roles` + `fansub_group_member_roles`, beide an `members`);
  offen: Claim-Flow (historische Person loggt sich ein → Identität bestätigen → App-Account) und
  Admin-UI zum Setzen von historisch-bis-X vs. aktiv-ab-X inkl. **tagesgenauer** Daten (aktuell
  nur Jahre).
- **G3:** Member-Management-UI mobil-tauglich machen (separater Task).
