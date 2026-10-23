---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 13
subsystem: frontend
tags: [typescript, api-client, contract-mirror, fansub-group-hints, d-09]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "Backend-Contract ohne hint_type/requested_role_code, related_anime_id NOT NULL auf Request-Ebene (Plan 191-12)"
provides:
  - "FansubGroupHint/CreateFansubGroupHintRequest ohne hint_type/requested_role_code/-label"
  - "CreateFansubGroupHintRequest.related_anime_id als Pflichtfeld (number, nicht number|null|undefined)"
affects: ["191-14 (Leader-Review-UI)", "191-16 (Hinweis-Formular-UI)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared Frontend-Typ-Spiegel-Datei bleibt die einzige Quelle der Request-/Response-Form fuer alle drei UI-Konsumenten -- Konsumenten werden NICHT in diesem Plan nachgezogen (interface-first ordering, 191-14/191-16 folgen)"

key-files:
  modified:
    - frontend/src/types/fansub-group-hints.ts
    - frontend/src/lib/api/fansub-group-hints.ts
    - frontend/src/lib/api/fansub-group-hints.test.ts

key-decisions:
  - "related_anime_id/related_anime_title bleiben in der Lese-Form FansubGroupHint bewusst `| null` (Abweichung von der Plan-Annahme 'werden non-nullable') -- der tatsaechlich implementierte Go-Typ FansubGroupHintRow scannt beide Felder weiterhin ueber *int64/*string aus einem LEFT JOIN auf anime; die DB-NOT-NULL-Pflicht gilt nur fuer die Spalte selbst, nicht fuer das JOIN-Ergebnis. Live-Backend-Contract hat laut Auftrag Vorrang vor der urspruenglichen Planannahme."
  - "FansubGroupHintType komplett entfernt (nicht nur ungenutzt gelassen) -- kein Alt-Typ bleibt importierbar"

requirements-completed: [D-09, D-15]

# Metrics
duration: ~20min
completed: 2026-10-23
---

# Phase 191 Plan 13: Gap-Closure Live-UAT-Nachbesserung (Frontend-Contract-Spiegel) Summary

**Der geteilte Frontend-Typ-/API-Client-Spiegel fuer fansub_group_hints ist auf den tatsaechlich implementierten Plan-191-12-Backend-Contract reduziert: kein hint_type/requested_role_code mehr, related_anime_id ist beim Anlegen Pflicht, waehrend das Lese-Feld bewusst nullable bleibt, weil das Backend es per LEFT JOIN scannt.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-10-23T20:50:00Z (approx.)
- **Completed:** 2026-10-23T21:10:00Z (approx.)
- **Tasks:** 1 completed
- **Files modified:** 3

## Accomplishments

- **Task 1 (D-09):** `FansubGroupHintType` entfernt; `FansubGroupHint` und `CreateFansubGroupHintRequest` verzichten vollstaendig auf `hint_type`/`requested_role_code`/`requested_role_label`. `CreateFansubGroupHintRequest.related_anime_id` ist jetzt `number` (Pflicht), passend zur 422-Pflichtpruefung in `fansub_group_hints_me_handler.go` und zur NOT-NULL-Spalte aus Migration 0188.
- Datei-Dokumentation (D-15) in `fansub-group-hints.ts` auf das aktuelle Drei-Konsumenten-/Einzeltyp-Modell umgeschrieben, inkl. einer expliziten Begruendung, warum `related_anime_id`/`related_anime_title` in der Lese-Form `| null` bleiben (LEFT JOIN, nicht die Request-Spalte selbst).
- Doku-Kommentare in `fansub-group-hints.ts` (API-Client) von "fansub_lead-Mitgliedschaftsanfragen (D-01/D-07)" auf "Zielgruppen ohne aktive Leitung (D-11)" umformuliert -- an allen vier betroffenen Stellen (Dateikopf, `listGroupHints`, `listAdminFansubGroupHints`, `confirmAdminFansubGroupHint`, `rejectAdminFansubGroupHint`).
- Testliterale in `fansub-group-hints.test.ts` auf die neue Request-Form angepasst (kein `hint_type` mehr, `related_anime_id` als einfacher Pflichtwert).
- `grep -rln "hint_type\|requested_role_code\|FansubGroupHintType" frontend/src` nach der Aenderung bestaetigt: nur noch `FansubGroupHintsReviewSection.tsx`/`.test.tsx` (191-14-Scope) und `ProposalForm.useSubmit.ts`/`.test.ts` (191-16-Scope) betroffen -- genau wie im Plan vorhergesagt, bewusst nicht in diesem Plan angefasst.

## Task Commits

Each task was committed atomically:

1. **Task 1: Simplify FansubGroupHint/CreateFansubGroupHintRequest types + API client + tests** - `49bfce155` (fix)

## Files Created/Modified

- `frontend/src/types/fansub-group-hints.ts` - `FansubGroupHintType` entfernt, `FansubGroupHint`/`CreateFansubGroupHintRequest` ohne `hint_type`/`requested_role_code`/-`label`, `related_anime_id` auf `CreateFansubGroupHintRequest` jetzt Pflichtfeld, Doku-Kommentar auf D-09/D-11 umgeschrieben
- `frontend/src/lib/api/fansub-group-hints.ts` - Doku-Kommentare (Dateikopf + vier Funktionskommentare) von "fansub_lead-Mitgliedschaftsanfragen" auf "Zielgruppen ohne aktive Leitung (D-11)" umformuliert; keine Code-/Signatur-Aenderung noetig, da `createFansubGroupHint` den Body nur durchreicht
- `frontend/src/lib/api/fansub-group-hints.test.ts` - zwei Testliterale auf die neue `CreateFansubGroupHintRequest`-Form angepasst (kein `hint_type`, `related_anime_id` als Pflichtwert ohne Sonderbehandlung)

## Decisions Made

- **Abweichung von der Plan-Annahme fuer die Lese-Form:** Der Plan-Task-Text verlangte, `related_anime_id`/`related_anime_title` in `FansubGroupHint` auf non-nullable (`number`/`string`) umzustellen, "da der Backend dies jetzt auf jeder Zeile garantiert". Die Pruefung des tatsaechlich implementierten Go-Codes (`backend/internal/repository/fansub_group_hints_repository.go:33-53`, `FansubGroupHintRow.RelatedAnimeID *int64`/`RelatedAnimeTitle *string`, befuellt aus `LEFT JOIN anime a ON a.id = h.related_anime_id`) zeigt: die NOT-NULL-Pflicht aus Migration 0188 gilt nur fuer die Spalte `h.related_anime_id` selbst (durchgesetzt beim Anlegen, s. `related_anime_id`-Pflichtfeld oben), nicht fuer das Ergebnis des JOINs auf die `anime`-Tabelle, das technisch leer sein kann. Der Live-Contract in `shared/contracts/fansub-group-hints.yaml` (Zeilen 500-506) bestaetigt das: beide Felder sind dort weiterhin `nullable: true` und nicht im `required`-Array der `FansubGroupHint`-Schema. Gemaess dem expliziten Auftrag ("Typen/Client-Funktionen muessen exakt zum TATSAECHLICH implementierten Backend-Contract ... passen, nicht zur urspruenglichen Planannahme") bleiben beide Felder in der Lese-Form `| null`; nur `CreateFansubGroupHintRequest.related_anime_id` (die Request-Seite, wo die NOT-NULL-Pflicht tatsaechlich greift) wurde wie geplant auf ein Pflichtfeld umgestellt.
- `FansubGroupHintType` wurde komplett geloescht statt nur ungenutzt liegen zu lassen, wie im Plan-Task explizit verlangt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan-Annahme ueber Nullability von related_anime_id/related_anime_title in der Lese-Form korrigiert**
- **Found during:** Task 1, beim Abgleich mit dem tatsaechlichen Go-Code vor dem Edit
- **Issue:** Der Plan-Task-Text (`<behavior>`) verlangte, beide Felder in `FansubGroupHint` non-nullable zu machen. Das Backend (`FansubGroupHintRow`, LEFT JOIN auf `anime`) und der Live-Contract (`shared/contracts/fansub-group-hints.yaml`) halten beide Felder jedoch weiterhin fuer nullable -- nur die Request-Pflicht (`CreateFansubGroupHintRequest.related_anime_id`) ist tatsaechlich non-nullable geworden.
- **Fix:** `FansubGroupHint.related_anime_id`/`related_anime_title` auf `number | null`/`string | null` belassen (statt wie im Plan-Text vorgegeben auf `number`/`string` umzustellen); nur `CreateFansubGroupHintRequest.related_anime_id` wie geplant auf Pflicht-`number` gesetzt. Datei-Dokumentation erklaert die Begruendung (LEFT JOIN vs. Tabellen-Spalte) explizit, damit 191-14/191-16 diese Unterscheidung nicht erneut herleiten muessen.
- **Files modified:** `frontend/src/types/fansub-group-hints.ts`
- **Verification:** `grep -c "hint_type\|requested_role_code" frontend/src/types/fansub-group-hints.ts` → `0`; `npm --prefix frontend run test -- fansub-group-hints` gruen (8 Tests); abgeglichen gegen `backend/internal/repository/fansub_group_hints_repository.go` und `shared/contracts/fansub-group-hints.yaml`.
- **Committed in:** `49bfce155` (Task-1-Commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 -- Korrektur einer fehlerhaften Plan-Annahme anhand des tatsaechlich implementierten Live-Contracts, gemaess explizitem Auftrag)
**Impact on plan:** Kein Scope-Creep -- betrifft ausschliesslich die exakte Nullability-Form innerhalb der ohnehin geplanten Typdatei. Macht die Typen praeziser (naeher an der Laufzeit-Realitaet) statt wie im Plan-Text angenommen.

## Issues Encountered

`npm run typecheck` (Gesamtprojekt) bleibt nach diesem Plan ROT -- erwartungsgemaess, nicht im Scope dieses Plans: `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx`/`.test.tsx` (verwendet `FansubGroupHintType`/`hint_type`/`requested_role_label`, Scope Plan 191-14) und `frontend/src/components/contributions/ProposalForm.useSubmit.ts`/`.test.ts` (verwendet `hint_type`/`requested_role_code`, Scope Plan 191-16) kompilieren gegen die alte Form nicht mehr. Das ist exakt die vom Plan-Task vorhergesagte und ausdruecklich NICHT in diesem Plan zu behebende Konsequenz der interface-first-Reihenfolge ("Re-run grep ... confirm it only still matches files Plans 191-14/191-16 will fix"). `npm --prefix frontend run test -- fansub-group-hints` (der im Plan-Task spezifizierte Scoped-Verify-Befehl) ist gruen; der plan-weite `<verification>`-Satz "typecheck passes" bezieht sich auf den Gesamtzustand NACH 191-14/191-16, nicht auf den Zwischenstand dieses Einzelplans -- Aenderung an `FansubGroupHintsReviewSection.tsx`/`ProposalForm.useSubmit.ts` wuerde explizit gegen die im Plan-Task formulierte Scope-Grenze verstossen.

## User Setup Required

None -- reine Typ-/Client-Aenderung ohne Laufzeitverhalten-Aenderung am laufenden Container, kein `docker restart` noetig (wie in 191-06 bereits fuer reine Typ-/Client-Aenderungen entschieden).

## Next Phase Readiness

- `frontend/src/types/fansub-group-hints.ts` und `frontend/src/lib/api/fansub-group-hints.ts` sind jetzt der verbindliche, einzige Formgeber fuer alle drei UI-Konsumenten -- Plan 191-14 (Leader-Review-Liste) und Plan 191-16 (Hinweis-Formular) koennen direkt gegen diese Typen bauen, ohne die Form erneut herzuleiten.
- Bekannte, erwartete Blocker fuer 191-14/191-16: beide muessen beim Anfassen ihrer jeweiligen Dateien (`FansubGroupHintsReviewSection.tsx` bzw. `ProposalForm.useSubmit.ts`/`ProposalForm.extraSteps.tsx`/Step-Komponenten) die Hinweisart-/Rollenfeld-UI vollstaendig entfernen (D-09) -- der gesamte verbleibende `hint_type`/`requested_role_code`-Fussabdruck im Frontend liegt ausschliesslich in diesen beiden Dateifamilien.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*

## Self-Check: PASSED

All 3 modified files and the commit hash (49bfce155) verified present.
