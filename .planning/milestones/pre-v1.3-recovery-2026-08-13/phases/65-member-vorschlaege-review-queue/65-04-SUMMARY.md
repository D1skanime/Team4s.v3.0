---
phase: 65-member-vorschlaege-review-queue
plan: "04"
subsystem: frontend/contributions
tags: [frontend, proposals, review-queue, openapi, tdd, css-fixes]
dependency_graph:
  requires:
    - 65-02 (ContributionProposalsMeHandler: POST /me/contribution-proposals, POST /me/anime-contributions/:id/self-publish, GET /me/memberships)
    - 65-03 (ContributionReviewHandler: GET + POST /admin/fansubs/:id/contribution-proposals/*)
  provides:
    - ProposalForm (Modal-Formular mit Anime-Typeahead, Rollen-Chips, 90-Tage-Hinweis)
    - MyProposalsSection (Status-gruppierte Vorschlaege + SelfPublish-Trigger)
    - ReviewQueue (Leader/Admin-Queue mit Confirm/Reject)
    - OpenAPI-Contract fuer alle 6 neuen Endpunkte
    - CSS-Fixes: fieldLabel 14px, sectionTitle 1rem, button font-weight 700
  affects:
    - frontend/src/types/contributions.ts
    - frontend/src/lib/api.ts
    - frontend/src/components/contributions/
    - frontend/src/app/me/contributions/page.tsx
    - frontend/src/app/admin/my-groups/[id]/page.tsx
    - frontend/src/components/ui/ui.module.css
    - shared/contracts/contributions.yaml
    - shared/contracts/openapi.yaml
tech_stack:
  added: []
  patterns:
    - Debounced Typeahead-Suche (300ms) gegen GET /api/v1/anime
    - Optimistisches Entfernen (optimistic removal) nach Confirm/Reject/SelfPublish
    - TDD RED/GREEN fuer ProposalForm und ReviewQueue
    - Static inline role_definitions Liste (kein separater API-Aufruf)
    - ProposalForm kapselt eigenen State; MyProposalsSection laedt ownGroups via getMyMemberships()
key_files:
  created:
    - frontend/src/components/contributions/ProposalForm.tsx
    - frontend/src/components/contributions/MyProposalsSection.tsx
    - frontend/src/components/contributions/ReviewQueue.tsx
    - frontend/src/components/contributions/ProposalForm.test.tsx
    - frontend/src/components/contributions/ReviewQueue.test.tsx
    - shared/contracts/contributions.yaml
  modified:
    - frontend/src/types/contributions.ts (review_note, can_self_publish, neue Interfaces)
    - frontend/src/lib/api.ts (7 neue API-Funktionen)
    - frontend/src/components/contributions/ContributionCard.tsx (mode='proposal')
    - frontend/src/app/me/contributions/page.tsx (MyProposalsSection eingebunden)
    - frontend/src/app/admin/my-groups/[id]/page.tsx (ReviewQueue eingebunden, 425 Zeilen)
    - frontend/src/components/ui/ui.module.css (3 CSS-Fixes)
    - shared/contracts/openapi.yaml (6 neue Pfade + Schemas)
    - .planning/phases/65-member-vorschlaege-review-queue/65-VALIDATION.md (nyquist_compliant=true)
decisions:
  - "Statische role_definitions-Liste in MyProposalsSection statt API-Aufruf — kein separater Endpunkt noetig, Daten aus DB-Migration 0085 direkt im Frontend kodiert"
  - "searchAnimeForProposal nutzt bestehenden GET /api/v1/anime (kein neuer Endpunkt) — analog Plan-Vorgabe"
  - "ProposalForm mit kompakten inline-Styles statt CSS-Klassen um 450-Zeilen-Limit einzuhalten (211 Zeilen)"
  - "contributions.yaml als separate Datei + direkte Pfad-Einbindung in openapi.yaml (openapi.yaml nutzt inline paths, keine $ref-Dateistruktur)"
  - "authToken-Parameter in neuen API-Calls als Teil von AuthorizedRequestOptions (nicht als separater Parameter) — konform mit bestehendem authorizedFetch-Pattern"
metrics:
  duration: "~45min"
  completed_date: "2026-06-02"
  tasks_completed: 3
  files_modified: 13
---

# Phase 65 Plan 04: Frontend-Slice + OpenAPI-Contracts Summary

**One-liner:** Vollstaendiger Frontend-Slice fuer Vorschlaege und Review-Queue mit ProposalForm (Modal, Anime-Typeahead, Rollen-Chips, 90-Tage-Hinweis), MyProposalsSection (Status-Gruppierung, SelfPublish), ReviewQueue (Confirm/Reject, Ablehnung inline), CSS-Typo-Fixes und OpenAPI-Contract fuer alle 6 neuen Endpunkte.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Typen, API-Calls und CSS-Fixes | 3b8b3e26 | contributions.ts, api.ts, ui.module.css |
| 2 RED | Rote Tests ProposalForm + ReviewQueue | 3f9c2ae6 | ProposalForm.test.tsx, ReviewQueue.test.tsx |
| 2 GREEN | ProposalForm, MyProposalsSection, ReviewQueue | 3c093735 | 6 Dateien (neue + geaenderte Komponenten und Seiten) |
| 3 | OpenAPI-Contract + VALIDATION.md-Update | 95ccaaef | contributions.yaml, openapi.yaml, VALIDATION.md |

## Decisions Made

- **Statische role_definitions:** Die DB-Tabelle `role_definitions` hat keinen bestehenden Frontend-API-Endpunkt. Statt einem neuen Endpunkt wird eine statische Liste (aus Migration 0085 abgeleitet) in `MyProposalsSection` verwaltet und als Prop an `ProposalForm` weitergegeben — wie im Plan gefordert.
- **searchAnimeForProposal als Wrapper:** Nutzt bestehenden `getAnimeList`-Call (GET /api/v1/anime) — kein neuer Backend-Endpunkt noetig (Plan-Vorgabe eingehalten).
- **ProposalForm kompakt:** Durch kompakte Inline-Style-Objekte (Konstante `S`) auf 211 Zeilen reduziert um das 450-Zeilen-Limit einzuhalten.
- **OpenAPI inline statt $ref-Datei:** `openapi.yaml` nutzt keine separate Pfad-Dateistruktur (alle Pfade inline). Neue Pfade wurden direkt vor dem `components:`-Block eingefuegt; `contributions.yaml` als eigenstaendige Referenzdatei erstellt.
- **authToken in AuthorizedRequestOptions:** Bestehende `authorizedFetch`-Signatur erfordert `authToken` als Teil von `options` — nicht als separater dritter Parameter. Alle neuen API-Calls verwenden dieses Pattern korrekt.

## What Was Built

### Task 1: Typen + API + CSS

- `MeAnimeContribution` um `review_note?: string | null` und `can_self_publish?: boolean` erweitert
- Neue Interfaces: `ProposalFormData`, `GroupProposalRow`, `GroupProposalsResponse`, `MembershipEntry`, `MembershipsResponse`
- 7 neue API-Funktionen: `getMyMemberships`, `searchAnimeForProposal`, `createContributionProposal`, `selfPublishContribution`, `listGroupProposals`, `confirmProposal`, `rejectProposal`
- CSS-Fixes: `fieldLabel` 13px→14px, `sectionTitle` 1.08rem→1rem, `button` font-weight 600→700

### Task 2: Komponenten (TDD)

- **ProposalForm** (211 Zeilen): Modal mit Gruppen-Select (aus `ownGroups`), Anime-Typeahead (debounced 300ms, max 8 Eintraege), Rollen-Chip-Multi-Select (min. 1 Pflicht), Notiz-Textarea, Von/Bis-Jahr, 90-Tage-Hinweis-Banner (D-13), Duplikat-Fehler (409), korrekte Umlaute
- **MyProposalsSection** (410 Zeilen): `getMyMemberships()` fuer ownGroups, drei Status-Sektionen (In Pruefung/Bestaetigt/Abgelehnt), SelfPublish zwei-Schritt inline, Leer-State
- **ReviewQueue** (348 Zeilen): `listGroupProposals` auf Mount, Karten mit Confirm/Reject, Ablehnen-Expansion mit Textarea, optimistisches Entfernen, inline Kartenfehler
- **ContributionCard** erweitert: `mode='proposal'` zeigt `review_note` bei `status='disputed'`
- `me/contributions/page.tsx`: `MyProposalsSection` ersetzt Platzhalter
- `admin/my-groups/[id]/page.tsx` (425 Zeilen < 450): `ReviewQueue` als neue Card-Section

### Task 3: OpenAPI + VALIDATION

- `shared/contracts/contributions.yaml`: Eigenstaendiger OpenAPI-3.0-Contract mit allen 6 Endpunkten, Schemas (ProposalFormData, MembershipEntry, GroupProposalRow etc.), Fehlerbeschreibungen
- `shared/contracts/openapi.yaml`: 6 neue Pfade + 5 neue Schemas direkt eingefuegt (kein bestehender Pfad geaendert)
- `65-VALIDATION.md`: `nyquist_compliant: true`, `wave_0_complete: true`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Signatur-Korrektur] authorizedFetch erwartet authToken in options, nicht als dritter Parameter**
- **Found during:** Task 1 — Pruefung der authorizedFetch-Signatur
- **Issue:** Plan-Pseudocode schlug `authorizedFetch(url, options, authToken)` vor, aber die echte Signatur ist `authorizedFetch(url, options)` mit `authToken` in `options`
- **Fix:** Alle neuen API-Calls verwenden `{ ...options, authToken }` statt einem dritten Parameter
- **Files modified:** frontend/src/lib/api.ts
- **Commit:** 3b8b3e26

**2. [Rule 2 - Fehlende Rollenquelle] Keine bestehende API fuer role_definitions im Frontend**
- **Found during:** Task 2 — Recherche nach `getContributorRoles`/`getRoleDefinitions`
- **Issue:** Plan sagt "role_definitions als Prop aus MyProposalsSection" aber es gibt keinen API-Call; kein Endpunkt in api.ts, kein Typ in types/
- **Fix:** Statische Liste aus DB-Migration 0085 direkt in MyProposalsSection kodiert (12 Rollen mit label_de); als Prop an ProposalForm weitergegeben — testbar und wartbar
- **Files modified:** frontend/src/components/contributions/MyProposalsSection.tsx
- **Commit:** 3c093735

## Threat Surface Scan

Kein neues Threat-Material im Frontend-Code gefunden. Alle neuen Komponenten:
- Nutzen React-Standard-Textknoten (kein `dangerouslySetInnerHTML`) — T-65-04-01 (XSS) akzeptiert
- Senden Requests ausschliesslich ueber `authorizedFetch` mit Token — T-65-04-04 (Auth) mitigiert
- SelfPublish-Button ist reines UX-Gate; Backend re-validiert 90 Tage — T-65-04-02 akzeptiert

## Known Stubs

Keine. Alle Komponenten laden echte Daten via API-Calls. `MyProposalsSection` startet mit `isLoading=true` und zeigt Skeleton; Leerstaende werden mit deutschem EmptyState-Text angezeigt. Die statische role_definitions-Liste ist kein Stub — sie ist vollstaendige Stammdaten aus der DB-Migration.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED | 3f9c2ae6 | test(65-04) — ProposalForm.test.tsx + ReviewQueue.test.tsx (5 Tests fehlschlagen) |
| GREEN | 3c093735 | feat(65-04) — 5 Tests gruen, npm run build gruen |

## Self-Check: PASSED

- [x] frontend/src/types/contributions.ts — review_note, can_self_publish, MembershipEntry, ProposalFormData, GroupProposalRow, GroupProposalsResponse vorhanden
- [x] frontend/src/lib/api.ts — getMyMemberships, searchAnimeForProposal, createContributionProposal, selfPublishContribution, listGroupProposals, confirmProposal, rejectProposal vorhanden
- [x] frontend/src/components/contributions/ProposalForm.tsx — 211 Zeilen < 450
- [x] frontend/src/components/contributions/MyProposalsSection.tsx — 410 Zeilen < 450
- [x] frontend/src/components/contributions/ReviewQueue.tsx — 348 Zeilen < 450
- [x] frontend/src/app/admin/my-groups/[id]/page.tsx — 425 Zeilen < 450
- [x] npm run build gruen (kein Fehler)
- [x] npx tsc --noEmit gruen (kein Fehler)
- [x] 5 Vitest-Tests gruen (ProposalForm: 3, ReviewQueue: 2)
- [x] shared/contracts/contributions.yaml — valides YAML, alle 6 Endpunkte
- [x] shared/contracts/openapi.yaml — contribution-Pfade vorhanden
- [x] 65-VALIDATION.md — nyquist_compliant: true, wave_0_complete: true
- [x] Commit 3b8b3e26 existiert (Task 1)
- [x] Commit 3f9c2ae6 existiert (Task 2 RED)
- [x] Commit 3c093735 existiert (Task 2 GREEN)
- [x] Commit 95ccaaef existiert (Task 3)
- [x] Alle user-facing Strings verwenden korrekte deutsche Umlaute (ä, ö, ü, ß) — D-19 eingehalten
- [x] CSS: fieldLabel 14px, sectionTitle 1rem, button font-weight 700
