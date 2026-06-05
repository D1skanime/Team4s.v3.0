---
phase: 76-me-contributions-dashboard-registrierte-user-vorschl-ge
plan: "05"
subsystem: contributions
tags: [frontend, page, dashboard, wiring, modal, filter, wave-5]
dependency_graph:
  requires:
    - 76-03
    - 76-04
  provides:
    - frontend/src/app/me/contributions/page.tsx (vollständig umgebaut)
    - frontend/src/components/contributions/MyContributionsSection.tsx (Props-Umstellung)
    - frontend/src/components/contributions/MyProposalsSection.tsx (Props-Erweiterung)
  affects:
    - frontend/src/components/contributions/ContributionInbox.tsx (eingebunden)
    - frontend/src/components/contributions/ContributionSummary.tsx (eingebunden)
    - frontend/src/components/contributions/ReportModal.tsx (als Overlay verdrahtet)
    - frontend/src/components/contributions/RejectReasonModal.tsx (als Overlay verdrahtet)
tech_stack:
  added: []
  patterns:
    - useMemo-Filter (D-11) — applyFilters aus ContributionFilters.tsx, kein zweiter API-Call
    - reload-Callback via useCallback — einmaliger Lade-Seam für alle Action-Handler
    - prefillType + prefillContributionId als optionale ReportModal-Props (D-10 Details korrigieren)
    - Overlay-State-Maschine: rejectModalOpenId (number|null) + reportModalOpen + prefillType/prefillId
key_files:
  created: []
  modified:
    - frontend/src/app/me/contributions/page.tsx
    - frontend/src/components/contributions/MyContributionsSection.tsx
    - frontend/src/components/contributions/MyProposalsSection.tsx
decisions:
  - "MyProposalsSection behält eigenen getMyMemberships()-Call (für ProposalForm), aber entfernt getMyAnimeContributions()-Duplikat — page.tsx ist alleiniger Owner der Contributions-Daten (D-11)"
  - "MyContributionsSection: initialContributions-Prop auf contributions+onVisibilityChange umgestellt — Filterung liegt in page.tsx useMemo, optimistische Sichtbarkeits-Updates weiterhin über page.tsx State"
  - "filteredProposals basiert auf is_own_proposal=true statt Status-Whitelist — konservativere Filterung; Status-Chips filtern zusätzlich über applyFilters"
metrics:
  duration: "~25min"
  completed_date: "2026-06-05"
  tasks_completed: 1
  files_changed: 3
---

# Phase 76 Plan 05: Finale Verdrahtung Dashboard Summary

`page.tsx` vollständig umgebaut: D-02-Sektionsreihenfolge (ContributionInbox → ContributionSummary → MyContributionsSection → MyProposalsSection), useMemo-Filter für client-seitige Filterung (D-11), Handler-Kette für Bestätigen/Ablehnen/Korrigieren (D-08/D-09/D-10), ReportModal und RejectReasonModal als Overlays. MyContributionsSection und MyProposalsSection auf gefilterte Daten-Props umgestellt.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | page.tsx Umbau + MyContributionsSection Props-Umstellung + MyProposalsSection Props-Erweiterung | `9b062879` |

## Human-Verify Checkpoint: PENDING (Orchestrator führt mit User durch)

**Status:** PENDING — automatisierte Verifikation abgeschlossen, Human-Verify ausstehend.

Die 8 Prüfpunkte für den manuellen Checkpoint (Task 2, `type="checkpoint:human-verify"`):

1. **Dashboard-Layout (D-02):** Prüfe Reihenfolge auf `http://localhost:3000/me/contributions`: (a) „Offene Aktionen"-Karte zuoberst; (b) „Überblick & Filter"-Karte mit Stat-Chips darunter; (c) „Vorschlagen / Melden"-Button sichtbar; (d) Mitwirkungen-Liste und Vorschläge-Liste darunter.

2. **Inbox (D-03):** Falls keine pending/disputed Contributions vorhanden → EmptyState „Keine offenen Aktionen" erscheint. Falls vorhanden: Bestätige-/Ablehnen-Buttons sichtbar. Klicke „Das war ich nicht" → Reject-Modal öffnet sich mit Pflicht-Textarea.

3. **Reject-Modal (D-09):** Sende-Button deaktiviert solange Textarea leer. Tippe weniger als 5 Zeichen → Senden immer noch deaktiviert. Tippe ≥5 Zeichen → Button aktiv. Sende → Toast „Widerspruch wurde gespeichert." erscheint.

4. **Stat-Chip-Filter (D-12):** Klicke einen Status-Chip → Liste wird gefiltert. Erneuter Klick auf denselben Chip → Filter aufgehoben. Klicke „Filter zurücksetzen" wenn mehrere aktiv.

5. **Melde-Modal (D-05/D-06):** Klicke „Vorschlagen / Melden" → Modal öffnet Typ-Auswahl. Wähle „Fehler / Korrektur melden" → Ziel-Select und Textarea erscheinen. Fülle aus und sende → Toast „Vorschlag zur Prüfung gesendet." Prüfe, dass Claim-Typ nur einen Hinweis + Weiterleitungs-Link zeigt (kein Formular).

6. **UI-Primitive-Check (C1/C2):** Kein Eingabefeld sieht nach nativem Browser-Standard-Select aus; alle Buttons haben einheitliches Design. VisibilityDropdown ist Migration auf Select-Primitive erkennbar (einheitliches Aussehen).

7. **Umlaut-Check (C3):** Titel „Meine Beiträge", „Überblick & Filter", „Offene Aktionen" etc. korrekt dargestellt (kein „Ubersicht", „Offene Aktionen" etc.).

8. **Backend-Migration:** Docker-Backend mit Migration 0097 appliziert (`cd backend && go run ./cmd/migrate/main.go up`); Prüfe dass Dashboard Daten lädt ohne 500-Fehler.

**Voraussetzung:** Dev-Server :3000 (`npm run dev` im frontend-Verzeichnis) + Docker-Backend mit Migration 0097.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] MyProposalsSection error-State entfernt — nie gesetzt, aber im Render verwendet**
- **Found during:** Task 1
- **Issue:** Nach Umbau der loadData()-Funktion (kein getMyAnimeContributions()-Call mehr) wurde `setError()` nie aufgerufen. Der `error`-State blieb immer `null`, was den Error-Render-Block dead code machte. TypeScript hätte eine unused variable gemeldet.
- **Fix:** `error`-State und `setError`-Aufruf entfernt; Error-Render-Block für Memberships-Fehler entfernt (bei 404 wird nur `setOwnGroups([])` gesetzt — kein Error-Display nötig, da ProposalForm-Button dann deaktiviert ist).
- **Files modified:** `frontend/src/components/contributions/MyProposalsSection.tsx`
- **Commit:** `9b062879`

## Verification Results

### TypeScript
- `npx tsc --noEmit` — **fehlerfrei**

### Contributions-Tests
- `ContributionInbox.test.tsx` — **3/3 GRÜN**
- `ContributionSummary.test.tsx` — **3/3 GRÜN**
- `ProposalForm.test.tsx` — **3/3 GRÜN**
- `ReviewQueue.test.tsx` — **2/2 GRÜN**
- Gesamt Contributions-Suite: **11/11 GRÜN**

### Backend-Tests
- `TestRejectContributionRequiresReason` — **GRÜN**
- `TestSuggestionAudit` — **GRÜN**

### Pre-existing Test-Fehler (außerhalb Scope Plan 05)
Folgende Test-Dateien schlagen fehl, aber sind nicht durch Plan-05-Änderungen verursacht:
- `src/app/me/profile/page.test.tsx` (27 Fehler) — pre-existing, kein Contributions-Bezug
- `src/app/admin/anime/page.test.tsx` (3 Fehler) — pre-existing
- `src/lib/api.no-token-boundary.test.ts` (2 Fehler) — pre-existing
- `src/app/admin/anime/create/` (8 Fehler) — pre-existing
- `src/app/admin/fansubs/[id]/edit/page.test.tsx` (2 Fehler) — pre-existing

### Zeilenzählung (450-Zeilen-Limit)
- `page.tsx` — 222 Zeilen (OK)
- `MyContributionsSection.tsx` — 50 Zeilen (OK)
- `MyProposalsSection.tsx` — 260 Zeilen (OK)

### D-02 Reihenfolge
ContributionInbox → ContributionSummary → MyContributionsSection → MyProposalsSection — eingehalten

### D-11 kein zweiter API-Call
- `page.tsx` macht genau einen `getMyAnimeContributions()`-Call via `reload`-Callback
- `MyProposalsSection` macht nur noch `getMyMemberships()` (für ProposalForm)
- Filterung ausschließlich via `applyFilters`-useMemo in page.tsx — eingehalten

## Known Stubs

Übertragen aus Plan 04 (nicht durch Plan 05 eingeführt):
- **UploadMediaSuggestion — Backend-Datei-Persistenz:** `ReportFormMedia` sendet Datei, Backend ignoriert Datei-Inhalt (nur DB-Eintrag). Auflösung in späterer Medien-Pipeline-Phase.

## Threat Flags

Keine neuen Trust-Boundaries außerhalb des Plan-05-`<threat_model>`.

- T-76-05-01: `handleConfirm`/`handleRejectWithReason` gehen an Backend-Handler mit Owner-Check — implementiert
- T-76-05-02: member_reason nur im eigenen Dashboard sichtbar (Me-Endpoint) — eingehalten
- T-76-05-03: `openCorrectModal` prefillContributionId ist nur UI-State — Backend validiert unabhängig

## Self-Check: PASSED

- `frontend/src/app/me/contributions/page.tsx` — FOUND (222 Zeilen)
- `frontend/src/components/contributions/MyContributionsSection.tsx` — FOUND (50 Zeilen)
- `frontend/src/components/contributions/MyProposalsSection.tsx` — FOUND (260 Zeilen)
- Commit `9b062879` — vorhanden
- page.tsx ≤450 Zeilen — PASSED
- MyContributionsSection ≤450 Zeilen — PASSED
- MyProposalsSection ≤450 Zeilen — PASSED
- ContributionInbox-Tests 3/3 GRÜN — PASSED
- ContributionSummary-Tests 3/3 GRÜN — PASSED
- ProposalForm-Tests 3/3 GRÜN — PASSED
- tsc --noEmit fehlerfrei — PASSED
- TestRejectContributionRequiresReason — PASSED
- TestSuggestionAudit — PASSED
- D-02 Sektionsreihenfolge eingehalten — PASSED
- D-11 kein zweiter API-Call — PASSED
- Human-Verify (Task 2) — PENDING (automatisiert nicht prüfbar)
