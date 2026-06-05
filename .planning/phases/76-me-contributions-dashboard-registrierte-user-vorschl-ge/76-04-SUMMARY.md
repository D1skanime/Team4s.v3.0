---
phase: 76-me-contributions-dashboard-registrierte-user-vorschl-ge
plan: "04"
subsystem: contributions
tags: [frontend, components, modal, forms, upload, design-system, wave-4]
dependency_graph:
  requires:
    - 76-02
    - 76-03
  provides:
    - frontend/src/components/contributions/ReportModal.tsx
    - frontend/src/components/contributions/RejectReasonModal.tsx
    - frontend/src/components/contributions/ReportFormFehler.tsx
    - frontend/src/components/contributions/ReportFormStory.tsx
    - frontend/src/components/contributions/ReportFormMedia.tsx
    - frontend/src/components/contributions/ProposalForm.tsx (migriert)
    - frontend/src/lib/api.ts (uploadMediaSuggestion)
  affects:
    - frontend/src/components/contributions/ProposalForm.tsx (Modal-Primitive + Button-Primitive)
tech_stack:
  added: []
  patterns:
    - Modal-Primitive als Multi-Step-Navigator (ReportModal Typ→Formular)
    - Button-Primitive als Scope-Karten-Toggle (ProposalForm)
    - Button-Primitive als Rollen-Chip-Toggle variant=subtle (ProposalForm)
    - form-Attribut fuer Cross-Modal-Submit (ProposalForm Footer-Button mit form=FORM_ID)
    - authorizedUploadXhr-Wrapper exportiert als uploadMediaSuggestion (ReportFormMedia)
    - file input mit eslint-disable-Kommentar (kein FileInput-Primitiv in @/components/ui)
    - Claim-Typ als reiner Redirect-Link (Lock H — kein POST-Endpoint)
key_files:
  created:
    - frontend/src/components/contributions/ReportModal.tsx
    - frontend/src/components/contributions/RejectReasonModal.tsx
    - frontend/src/components/contributions/ReportFormFehler.tsx
    - frontend/src/components/contributions/ReportFormStory.tsx
    - frontend/src/components/contributions/ReportFormMedia.tsx
  modified:
    - frontend/src/components/contributions/ProposalForm.tsx
    - frontend/src/lib/api.ts
decisions:
  - "uploadMediaSuggestion als exportierter Wrapper für internen authorizedUploadXhr — authorizedUploadXhr ist nicht exportiert, daher Wrapper-Pattern"
  - "RejectReasonModal: onConfirm-Prop injiziert rejectAnimeContributionWithReason — Entkopplung von api.ts-Import in der Komponente selbst"
  - "ReportFormFehler/Story targetId als Select mit manueller ID-Eingabe — v1 hat keine Suchfunktion; Ziel-ID muss bekannt sein"
  - "ReportModal Claim-Early-Return vor Modal-Render — Claim rendert eigenstaendiges Modal statt Modal-Kind, da ProposalForm ebenfalls eigensstaendig rendert"
metrics:
  duration: "~35min"
  completed_date: "2026-06-05"
  tasks_completed: 2
  files_changed: 7
---

# Phase 76 Plan 04: Unified Melde-Modal + Reject-Pflicht-Begründungs-Modal Summary

`ReportModal` als Schritt-Navigator (Typ → Sub-Formular) mit `Modal`-Primitiv, `RejectReasonModal` mit Pflicht-Begründung (≥5 Zeichen), `ProposalForm`-Migration von handgebautem div-Modal auf `Modal`-Primitiv und nativen `<button>` auf `Button`-Primitiv, plus drei neue Sub-Formulare (`ReportFormFehler`, `ReportFormStory`, `ReportFormMedia`) mit `uploadMediaSuggestion`-Wrapper in api.ts.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | RejectReasonModal.tsx (neu) + ProposalForm.tsx-Migration auf UI-Primitive (D-09, C2) | `bba46144` |
| 2 | ReportModal.tsx + ReportFormFehler/Story/Media + uploadMediaSuggestion in api.ts (D-05/D-06) | `d435f542` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Functionality] uploadMediaSuggestion-Wrapper in api.ts**
- **Found during:** Task 2
- **Issue:** `authorizedUploadXhr` ist eine interne Funktion in `api.ts` und nicht exportiert. Der Plan beschreibt die direkte Nutzung durch `ReportFormMedia` — das ist ohne Export nicht möglich.
- **Fix:** `uploadMediaSuggestion` als exportierte Funktion in `api.ts` hinzugefügt, die intern `authorizedUploadXhr` aufruft. `ReportFormMedia` importiert nur den exportierten Wrapper.
- **Files modified:** `frontend/src/lib/api.ts`
- **Commit:** `d435f542`

**2. [Rule 1 - Bug] TypeScript-Fehler in ReportModal — redundante Type-Guards nach Early-Returns**
- **Found during:** Task 2
- **Issue:** Nach den Early-Returns für 'claim' und 'contribution' schränkt TypeScript `type` auf `'fehler' | 'story' | 'medien'` ein. Checks auf `type !== 'claim'` sind danach immer `true` — TypeScript meldet TS2367.
- **Fix:** Redundante `type !== 'claim' && type !== 'contribution'`-Guards entfernt; der Review-Hinweis wird bei jedem gesetzten `type` angezeigt (im verbleibenden Modal-Render sind alle übrigen Typen sowieso nur fehler/story/medien).
- **Files modified:** `frontend/src/components/contributions/ReportModal.tsx`
- **Commit:** `d435f542`

**3. [Rule 1 - Bug] Unnötiger eslint-disable-Kommentar bei useRef**
- **Found during:** Task 2 (ESLint-Check)
- **Issue:** ESLint meldete „Unused eslint-disable directive" für einen Kommentar bei `useRef<HTMLInputElement>`, da `no-restricted-syntax` nicht auf `useRef` feuert.
- **Fix:** Kommentar bei `useRef` entfernt; der begründete Kommentar bleibt korrekt beim tatsächlichen `<input type="file">`-Element.
- **Files modified:** `frontend/src/components/contributions/ReportFormMedia.tsx`
- **Commit:** `d435f542`

## Verification Results

### TypeScript
- `tsc --noEmit` — **fehlerfrei** (beide Tasks)

### ESLint
- `npx eslint src/components/contributions/` — **1 Warnung** in `ReviewQueue.tsx` (pre-existing, außerhalb Scope Plan 04); alle neuen Dateien: keine Fehler, keine Warnungen
- `ReportFormMedia.tsx` file input: eslint-disable-Kommentar direkt über `<input type="file">` — begründet (kein FileInput-Primitiv in @/components/ui)

### Tests
- `ProposalForm.test.tsx` — **3/3 GRÜN** (Migration hat keine Regressionen)

### Zeilenzählung (450-Zeilen-Limit)
- `ReportModal.tsx` — 210 Zeilen (OK)
- `ReportFormFehler.tsx` — 131 Zeilen (OK)
- `ReportFormStory.tsx` — 127 Zeilen (OK)
- `ReportFormMedia.tsx` — 194 Zeilen (OK)
- `RejectReasonModal.tsx` — 98 Zeilen (OK)
- `ProposalForm.tsx` — 279 Zeilen (OK)

### Claim-Typ
- ReportModal Claim-Pfad: kein API-Call, nur `Button href="/me/claim"` (Lock H eingehalten)

### Design-System
- ProposalForm: kein handgebautes position:fixed-div mehr; kein natives `<button>` mehr
- RejectReasonModal: Modal + Textarea + Button aus `@/components/ui`
- ReportModal: Modal aus `@/components/ui`; alle Typ-Auswahl-Buttons: Button-Primitiv
- ReportFormFehler/Story: FormField+Select+Textarea aus `@/components/ui`
- ReportFormMedia: FormField+Select aus `@/components/ui`; file input begründet ausgenommen

## Known Stubs

**UploadMediaSuggestion — Backend-Datei-Persistenz nicht implementiert:**
- **Dateien:** `frontend/src/components/contributions/ReportFormMedia.tsx`, `frontend/src/lib/api.ts`
- **Grund:** Das Backend `UploadMediaSuggestion` in `suggestions_me_handler.go` speichert die hochgeladene Datei nicht auf dem Dateisystem (dokumentierter Stub aus Plan 02). Es legt nur den `member_suggestions`-DB-Eintrag an.
- **Auswirkung:** Der Upload-Button schickt die Datei, aber das Backend ignoriert den Datei-Inhalt und speichert nur Kategorie + Metadaten.
- **Auflösung:** Medien-Pipeline-Integration in späterer Phase.

## Threat Flags

Keine neuen Trust-Boundaries außerhalb des Plan-04-`<threat_model>`.

- T-76-04-01 (EoP/ReportFormMedia): `uploadMediaSuggestion` setzt keine Owner-Felder — Backend setzt `owner_member_id` aus `requireMeIdentity` (nicht aus Request). Implementiert.
- T-76-04-02 (Tampering/Claim): ReportModal Claim-Typ hat keinen POST-Call; nur `href="/me/claim"`. Lock H eingehalten.
- T-76-04-03 (DoS/Upload-Größe): Client-seitige Prüfung auf 20 MB vor Upload implementiert; Backend ist primäre Schranke.

## Self-Check: PASSED

- `frontend/src/components/contributions/ReportModal.tsx` — FOUND
- `frontend/src/components/contributions/RejectReasonModal.tsx` — FOUND
- `frontend/src/components/contributions/ReportFormFehler.tsx` — FOUND
- `frontend/src/components/contributions/ReportFormStory.tsx` — FOUND
- `frontend/src/components/contributions/ReportFormMedia.tsx` — FOUND
- `frontend/src/components/contributions/ProposalForm.tsx` (migriert) — FOUND
- `frontend/src/lib/api.ts` (uploadMediaSuggestion) — FOUND
- Commits `bba46144`, `d435f542` — vorhanden
- Alle Dateien ≤450 Zeilen — PASSED
- ProposalForm-Tests 3/3 GRÜN — PASSED
- tsc --noEmit fehlerfrei — PASSED
- ESLint contributions/ keine unerwarteten Fehler — PASSED
- Claim-Typ kein API-Call — PASSED
