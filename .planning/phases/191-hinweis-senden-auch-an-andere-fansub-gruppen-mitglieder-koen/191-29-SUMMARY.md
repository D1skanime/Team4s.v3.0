---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 29
subsystem: docs
tags: [comments, d-25, cleanup, frontend]

requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "Phase-191-Code (D-01..D-28) inkl. Plan 191-26/191-27/191-28 Kommentar-Sweeps"
provides:
  - "D-25-konforme Kommentare in den letzten 8 vom D-25-Register genannten
    member-/öffentlichkeits-seitigen Dateien"
affects: [191-30, 191-31]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx"
    - "frontend/src/components/contributions/ReportHintEntryPoint.tsx"
    - "frontend/src/components/contributions/ProposalForm.useSubmit.ts"
    - "frontend/src/lib/contributionsEligibility.ts"
    - "frontend/src/lib/fansubGroupHintStatus.ts"

key-decisions:
  - "frontend/src/lib/api/fansub-group-hints.ts und frontend/src/types/fansub-group-hints.ts waren beim Diff-Abgleich bereits D-25-konform (jeder D-Verweis stand schon als trailing Parenthese hinter einer fachlichen Erklärung) -- unverändert gelassen, kein Diff erzeugt."
  - "Der bereits bestehende, akzeptable Sichtbarkeits-Gate-Absatz in ReportHintEntryPoint.tsx ('Sichtbarkeits-Gate (D-12 D2, strikt): ...') wurde NICHT angefasst, da er schon eine fachliche Erklärung direkt nach dem Label trägt -- nur der bare-lead-Absatz direkt davor wurde umformuliert."

requirements-completed: [D-25]

duration: ~10min
completed: 2026-10-24
---

# Phase 191 Plan 29: D-25-Sweep Member-/öffentliche Hinweis-Dateien (vierte Gap-Closure-Runde) Summary

**Die letzten 8 vom D-25-Dateiregister genannten, aber von keinem anderen Nachbesserungsplan
berührten Dateien (öffentliche "Fehler melden"-Einstiegspunkte, Submit-Payload-Builder,
API-Client, Eligibility-/Status-Hilfsfunktionen, Typkontrakt) wurden auf bare D-NN-Kommentare
geprüft; 6 davon enthielten einen Lead-D-Verweis ohne vorangestellte fachliche Erklärung und
wurden umformuliert, 2 waren bereits konform.**

## Performance

- **Duration:** ~10min
- **Completed:** 2026-10-24T01:27:53Z
- **Tasks:** 1/1 completed
- **Files modified:** 6 (von 8 im Plan genannten Dateien — 2 bereits konform)

## Accomplishments
- In 6 Dateien wurden alle gefundenen bare-`D-NN (...)`-Lead-Kommentare so umformuliert, dass
  die fachliche Regel führt und der Decision-Verweis nur noch als trailing Parenthese steht
  (Muster aus D-21/Plan 191-21 übernommen).
- `frontend/src/lib/api/fansub-group-hints.ts` und `frontend/src/types/fansub-group-hints.ts`
  wurden per `git diff 72fc7c0f6..HEAD` geprüft und enthielten bereits ausschließlich
  D-Verweise als trailing Parenthese hinter einer fachlichen Erklärung — kein Änderungsbedarf,
  kein Diff erzeugt.
- Keine Verhaltensänderung: ausschließlich Kommentarzeilen betroffen (per Auge geprüft, siehe
  Self-Check), Frontend-Typecheck bleibt grün.

## Task Commits

Each task was committed atomically:

1. **Task 1: D-25 comment sweep across the 8 public/member-facing files** - `f68b796bb` (docs)

**Plan metadata:** (dieser Commit, siehe unten)

## Files Created/Modified
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx` - Kommentar zum "Fehler melden"-Mount-Gate umformuliert (D-12 jetzt trailing)
- `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` - Kommentar zum zweiten Einstiegspunkt umformuliert (D-12 jetzt trailing)
- `frontend/src/components/contributions/ReportHintEntryPoint.tsx` - Datei-JSDoc-Lead-Absatz und die `onSuccess`-No-op-Begründung umformuliert (D-12/D-17 jetzt trailing); der bereits konforme "Sichtbarkeits-Gate"-Absatz blieb unverändert
- `frontend/src/components/contributions/ProposalForm.useSubmit.ts` - `PrefillTargetGroup`-JSDoc und die Von/Bis-Jahr-Feldkommentare umformuliert (D-12/D-20 jetzt trailing)
- `frontend/src/lib/contributionsEligibility.ts` - Datei-Kommentar umformuliert (D-06/D-09/D-12 jetzt trailing)
- `frontend/src/lib/fansubGroupHintStatus.ts` - Datei-Kommentar umformuliert (191-23/D-18 jetzt trailing)

## Deviations from Plan

None - plan exactly as written. Die zwei nicht veränderten Dateien aus den `files_modified`
des Plans (`fansub-group-hints.ts`, `types/fansub-group-hints.ts`) wurden wie im Plan
vorgesehen geprüft, enthielten aber laut `git diff 72fc7c0f6..HEAD` keinen bare-D-NN-Lead-Fund
— das ist das erwartete Ergebnis einer Prüfung, kein Abweichen vom Auftrag.

## Verification

- `git diff 72fc7c0f6..HEAD -- <file>` für alle 8 Dateien zeigt keinen verbleibenden reinen
  Decision-ID-Verweis ohne begleitende fachliche Erklärung mehr.
- `git diff --stat` des Task-Commits (`f68b796bb`) betrifft ausschließlich Kommentarzeilen (per
  Augenschein bestätigt — kein Hunk ändert eine Nicht-Kommentar-Zeile, kein exportiertes Symbol
  umbenannt oder retypisiert).
- `cd frontend && npm run typecheck` → exit 0.
- Logik-Tests der direkt betroffenen Module (`fansubGroupHintStatus.test.ts`,
  `contributionsEligibility.test.ts`) → 10/10 grün.

## Pre-Existing, Out-of-Scope Issue (nicht gefixt)

`npx vitest run` über das gesamte `contributions`-Verzeichnis zeigt 9 fehlschlagende
Testdateien mit `Failed to resolve import "./contributions.module.css"`. Das ist **kein**
durch diesen Plan verursachtes Problem: Plan 191-27 (Commit `98bb500bc`) hat
`contributions.module.css` bewusst gelöscht und die 12 importierenden `.tsx`-Dateien
**absichtlich** noch auf die gelöschte Datei zeigen lassen ("...zeigen bis Plan 191-31
absichtlich noch auf die geloeschte Datei", siehe Commit-Message von `98bb500bc`) — die
Behebung ist explizit Plan 191-31 zugewiesen. Dieser Plan (191-29) berührt keine der
betroffenen Importzeilen und liegt außerhalb des 8-Datei-Scopes; laut Scope-Boundary-Regel
wird dieser vorbestehende, bereits bekannte Zustand hier nicht angefasst.

## Self-Check: PASSED

- FOUND: `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx`
- FOUND: `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx`
- FOUND: `frontend/src/components/contributions/ReportHintEntryPoint.tsx`
- FOUND: `frontend/src/components/contributions/ProposalForm.useSubmit.ts`
- FOUND: `frontend/src/lib/contributionsEligibility.ts`
- FOUND: `frontend/src/lib/fansubGroupHintStatus.ts`
- FOUND: commit `f68b796bb` in `git log --oneline --all`
