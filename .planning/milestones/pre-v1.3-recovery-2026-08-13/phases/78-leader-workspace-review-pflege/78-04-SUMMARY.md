---
phase: 78-leader-workspace-review-pflege
plan: "04"
subsystem: admin-fansub-workspace
tags: [frontend, tdd, green, media-review, phase76-stub, page-wiring, capability-gating, d-05, d-08, lock-f, sc5]
dependency_graph:
  requires:
    - 78-01 (RED-Testvertrag GroupMediaReviewSection)
    - 78-02 (ContributionsReviewSection)
    - 78-03 (listFansubGroupMedia, patchFansubMediaReview, api.ts-Helfer)
  provides:
    - GroupMediaReviewSection (Sichtbarkeit/Prüfstatus/Owner-Flag im media-Tab)
    - UserSuggestionsInbox (Phase-76-Stub in media/notes/vorschlaege)
    - page.tsx-Verdrahtung aller neuen Review-Flächen
  affects:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/UserSuggestionsInbox.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
tech_stack:
  added: []
  patterns:
    - Capability-Gate (null-Render ohne capabilities.can_edit_group / can_edit_notes / can_manage_members)
    - useCallback/useEffect-Lade-Muster mit try/finally + LoadingState/ErrorState
    - Draft-State per Medium (lokaler Selektorzustand vor Speichern)
    - EmptyState variant="compact" als Phase-76-Stub
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/UserSuggestionsInbox.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
decisions:
  - "capabilities-Guard in page.tsx: Komponenten werden nur wenn capabilities != null gerendert (null aus Ladezustand führt zu null-Render statt Prop-Fehler)"
  - "media-Tab: GroupMediaReviewSection außerhalb der details-Sektion, aber noch unter activeMainTab === media (eigene Card-Struktur)"
  - "ReviewQueue vollständig aus page.tsx entfernt (kein Import mehr), ersetzt durch ContributionsReviewSection"
metrics:
  duration_minutes: 40
  completed_date: "2026-06-05"
  tasks_completed: 3
  tasks_total: 4
  files_created: 3
  files_modified: 1
---

# Phase 78 Plan 04: Frontend-Verdrahtung Review-/Pflege-Flächen Summary

**One-liner:** GroupMediaReviewSection mit Sichtbarkeit/Prüfstatus-Selektoren (listFansubGroupMedia/patchFansubMediaReview) und Owner-Flag, capability-gegateter Phase-76-Stub UserSuggestionsInbox, chirurgische page.tsx-Verdrahtung in media/vorschlaege/notes-Tabs ohne neue Logik.

---

## Completed Tasks

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 | GroupMediaReviewSection.tsx (+CSS) — Sichtbarkeit/Prüfstatus + Owner-Flag | 4c8324ca | GroupMediaReviewSection.tsx, GroupMediaReviewSection.module.css |
| 2 | UserSuggestionsInbox.tsx — Phase-76-Stub | f749e946 | UserSuggestionsInbox.tsx |
| 3 | page.tsx chirurgisch verdrahten | a9df2f87 | page.tsx |
| 4 | (automated parts — live UAT ausstehend) | — | — |

---

## What Was Built

### GroupMediaReviewSection.tsx (210 Zeilen, NEU)

Capability-gegatete Komponente (D-08: `if (!capabilities.can_edit_group) return null`) mit:
- **Lese-Quelle:** `listFansubGroupMedia(fansubId, undefined)` aus 78-03 — lädt alle Medien der Gruppe
- **Mutation:** `patchFansubMediaReview(fansubId, item.id, { visibility, review_status })` — schreibt **nur** Sichtbarkeit + Prüfstatus (D-05, kein Owner-Umhängen)
- **Selektoren pro Medium:** FormField „Sichtbarkeit" → Select (Intern/Öffentlich) + FormField „Prüfstatus" → Select (In Prüfung/Freigegeben/Abgelehnt/Archiviert/Entfernt)
- **Owner-Flag:** Badge variant="warning" „Owner-Zuordnung prüfen" wenn `owner_consistent=false` — kein Owner-Edit-Feld (D-05, Phase 79)
- **Draft-State:** Lokale Selektor-Kopie pro Medium, erst beim Klick auf „Änderungen speichern" persistiert
- **Toast:** „Prüfstatus aktualisiert." bei Erfolg; Inline-Fehler „Änderungen konnten nicht gespeichert werden." bei Fehler
- **LoadingState/ErrorState/EmptyState** mit exakten UI-SPEC-Copywriting-Strings
- Ausschließlich `@/components/ui`-Primitive (kein natives select/input/button/textarea)

### GroupMediaReviewSection.module.css (NEU)

Colocated CSS mit `.mediaReviewGrid` (auto-fill minmax(280px,1fr)), `.cardFooterActions`, `.inlineError`, `.toastSuccess`.

### UserSuggestionsInbox.tsx (52 Zeilen, NEU)

Capability-gegateter Phase-76-Stub (D-03/D-04/D-08):
- Props: `{ fansubId, domain: 'media'|'notes'|'contribution', capabilities }`
- Gate je domain: media→`can_edit_group`, notes→`can_edit_notes`, contribution→`can_manage_members`
- Rendert `EmptyState variant="compact"` mit „Noch keine Nutzer-Vorschläge" + Phase-76-Beschreibung
- Kein Fetch, kein erfundener Endpoint (D-04)
- TODO-Kommentar mit Phase-76-Follow-Up-Hinweis

### page.tsx (chirurgisch, +68 -50 Zeilen)

Reine Verdrahtung ohne neue Logik:
- **Imports:** ContributionsReviewSection, GroupMediaReviewSection, UserSuggestionsInbox hinzugefügt; `ReviewQueue` entfernt
- **vorschlaege-Tab:** `<ReviewQueue>` ersetzt durch `<ContributionsReviewSection>` + `<UserSuggestionsInbox domain="contribution">` (D-03)
- **media-Tab:** `<GroupMediaReviewSection>` + `<UserSuggestionsInbox domain="media">` unterhalb MediaUpload-Grid (D-06)
- **notes-Tab:** `<UserSuggestionsInbox domain="notes">` am Ende (D-03)
- MAIN_TABS unverändert — kein neuer Tab-Key (D-01)
- capabilities-Guard: Komponenten werden nur gerendert wenn `capabilities != null`

---

## TDD Gate Compliance

- RED-Commit: ✅ `1db71040` (aus 78-01)
- GREEN-Commit: ✅ `4c8324ca` — alle 9 GroupMediaReviewSection-Tests grün

---

## SC5-Negativnachweis (Code-Level, automatisiert)

```bash
grep -rn "ContributionsReviewSection|GroupMediaReviewSection|UserSuggestionsInbox|ClaimManagementPanel|ReviewQueue" \
  frontend/src/app/admin/my-groups/
# Ergebnis: keine Treffer
```

**Befund:** Kein Review-/Pflege-Komponent ist unter `/admin/my-groups/` importiert oder gerendert. Lock F eingehalten.

---

## Deviations from Plan

### Auto-angepasste Implementierung

**1. [Rule 2 - Sicherheit] capabilities-null-Guard in page.tsx**
- **Gefunden während:** Task 3 — TypeScript-Typenprüfung
- **Problem:** `capabilities` in page.tsx ist `FansubGroupCapabilities | null` (Ladezustand); neue Komponenten erwarten `FansubGroupCapabilities` (non-nullable)
- **Fix:** Render der neuen Komponenten nur wenn `capabilities != null` via `capabilities ? (…) : null` — konsistent mit bestehenden Gating-Mustern (canUseMainTab macht dasselbe)
- **Keine funktionale Auswirkung:** Beim Laden der Seite sind capabilities null; sobald geladen, rendert der aktive Tab die Komponenten; die Komponenten gaten sich nochmals intern (D-08)

**2. [Rule 1 - Stilkonsistenz] media-Tab-Struktur mit React Fragment**
- **Gefunden während:** Task 3
- **Problem:** Die `details`-Sektion des media-Tabs musste in ein `<>…</>` eingebettet werden, um GroupMediaReviewSection + UserSuggestionsInbox als Geschwister hinzufügen zu können, ohne den Tab-Bedingungsblock zu duplizieren
- **Fix:** `{activeMainTab === "media" ? (<> … </>) : null}` — minimale strukturelle Änderung, kein neues Element sichtbar für den User

---

## Known Stubs

- **UserSuggestionsInbox:** rendert nur EmptyState — bewusster Stub (Phase 76 nicht implementiert). Daten werden erst nach Phase 76 angezeigt. Stub ist intentional und durch D-03/D-04 dokumentiert.

---

## Threat Flags

Keine neuen Bedrohungsflächen jenseits des Plans.

| Flag | File | Description |
|------|------|-------------|
| T-78-12 mitigiert | GroupMediaReviewSection.tsx | Gate `can_edit_group` → null-Render (D-08) |
| T-78-13 mitigiert | UserSuggestionsInbox.tsx | Kein Fetch, nur EmptyState — kein Daten-Leak (D-04) |
| T-78-14 mitigiert | GroupMediaReviewSection.tsx | Nur Sichtbarkeit/Prüfstatus-Selektoren, kein Owner-Edit-Feld (D-05) |
| T-78-15 mitigiert | page.tsx | Review-Komponenten nur in /admin/fansubs/[id]/edit, SC5 greift |

---

## Human-Verify (live, ausstehend nach Merge)

Die folgenden Schritte müssen **nach Merge auf main** gegen den Dev-Server auf Port 3000 durchgeführt werden:

### Voraussetzung
- Dev-Server `:3000` läuft (NICHT Docker `:3002` — Memory `testing_live_dev_server`)
- Leader-Account mit mindestens einer Gruppe verfügbar

### Schritt 1: vorschlaege-Tab (SC4/D-07/D-08)
1. `/admin/fansubs/<gruppe>/edit` öffnen, „Vorschläge"-Tab anklicken
2. **Erwartung:** ContributionsReviewSection sichtbar; „Nur offene anzeigen"-Toggle aktiv (Standard); erledigte Einträge ausgeblendet bis Toggle auf „Alle anzeigen" umgestellt
3. Falls Beiträge vorhanden: Bestätigen/Ablehnen-Aktion ausführen → kein Claim sichtbar (Lock H)
4. Phase-76-Stub: EmptyState „Noch keine Nutzer-Vorschläge" unterhalb der ContributionsReviewSection **Erwartung:** sichtbar

### Schritt 2: SC2-Reuse-Pflege-Pfad (D-02 — Kritisch)
1. „mitglieder"-Tab: **Erwartung:** nur historische Mitglieder, keine externen Mitwirkenden
2. „rollen"-Tab: **Erwartung:** nur historische Rollen, keine Contributions vermischt
3. **Erwartung:** externe Mitwirkende erscheinen ausschließlich im „vorschlaege"-Tab (ContributionsReviewSection), nie als Gruppenmitglied
4. Bestätigung: keine Vermischung zwischen Mitglied und Mitwirkender (Entscheidung 3 + Lock H)

### Schritt 3: media-Tab (SC3/D-05/D-08)
1. „Medien"-Tab öffnen
2. **Erwartung:** GroupMediaReviewSection mit Sichtbarkeit- und Prüfstatus-Selektoren sichtbar (wenn Medien vorhanden)
3. Selektor-Wert ändern → „Änderungen speichern" klicken → Toast „Prüfstatus aktualisiert." erscheint
4. Falls `owner_consistent=false`-Medium: Badge „Owner-Zuordnung prüfen" sichtbar, kein Owner-Edit-Feld
5. Phase-76-Stub: EmptyState „Noch keine Nutzer-Vorschläge" unterhalb GroupMediaReviewSection **Erwartung:** sichtbar

### Schritt 4: notes-Tab
1. „Gruppengeschichte"-Tab öffnen
2. **Erwartung:** NotesTab + GroupHistorySection wie bisher; am Ende Phase-76-Stub „Noch keine Nutzer-Vorschläge" sichtbar

### Schritt 5: SC5-Negativnachweis (Lock F) — Live
1. `/admin/my-groups/<gruppe>` öffnen
2. **Erwartung:** KEINE Claim-/Contribution-/Medien-Review-Aktionen sichtbar (ContributionsReviewSection, GroupMediaReviewSection, UserSuggestionsInbox erscheinen nicht)

### Schritt 6: D-08-Gating (optional, falls Nicht-Leader-Account verfügbar)
1. Mit Account ohne `can_edit_group`/`can_manage_members` auf vorschlaege/media-Tab
2. **Erwartung:** Review-Flächen rendern null (unsichtbar)

### Schritt 7: Umlaute
1. Alle sichtbaren Strings auf korrekte Umlaute prüfen (ä/ö/ü/ß — keine ae/oe/ue/ss-Ersetzungen)

---

## Self-Check

### Erstellte/veränderte Dateien existieren:
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` — vorhanden (210 Zeilen) ✅
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.module.css` — vorhanden ✅
- `frontend/src/app/admin/fansubs/[id]/edit/UserSuggestionsInbox.tsx` — vorhanden (52 Zeilen) ✅
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — ContributionsReviewSection/GroupMediaReviewSection/UserSuggestionsInbox importiert ✅

### Tests:
- GroupMediaReviewSection.test.tsx: 9/9 grün ✅
- ContributionsReviewSection.test.tsx: 11/11 grün ✅
- Keine neuen TypeScript-Fehler (vorherige deferred: ContributionInbox, ContributionSummary, rejectAnimeContributionWithReason — pre-existing aus 78-03-SUMMARY) ✅

### Commits existieren:
- `4c8324ca` — feat(78-04): GroupMediaReviewSection ✅
- `f749e946` — feat(78-04): UserSuggestionsInbox ✅
- `a9df2f87` — feat(78-04): page.tsx chirurgisch verdrahten ✅

### SC5-Negativnachweis (grep):
- Kein Review-Komponent unter `/admin/my-groups/` ✅

### Dateigrößen:
- GroupMediaReviewSection.tsx: 210 Zeilen (≤ 450 ✅)
- UserSuggestionsInbox.tsx: 52 Zeilen (≤ 200 ✅)

## Self-Check: PASSED
