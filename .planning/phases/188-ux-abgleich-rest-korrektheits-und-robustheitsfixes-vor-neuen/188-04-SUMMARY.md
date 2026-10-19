---
phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen
plan: 04
subsystem: ui
tags: [nextjs, config, images, fail-fast, D-09]

# Dependency graph
requires:
  - phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen
    provides: "Robustheitsfix-Reihenfolge aus 188-CONTEXT.md/188-RESEARCH.md (Befund #35.1)"
provides:
  - "configuredApiMediaPatterns wirft bei ungueltigem NEXT_PUBLIC_API_URL eine eindeutige deutsche Fail-Fast-Fehlermeldung statt eines unlesbaren TypeError: Invalid URL"
  - "Regressionsschutz-Testdatei publicImagePatterns.test.ts fuer Erfolgs-, Leer- und Fehlerfall"
affects: [frontend-build-robustness, next-config-loading]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "try/catch um new URL() mit geworfenem Error statt stillem Fallback, wenn D-09 Fail-Fast verlangt (Gegenbeispiel: publicApiUrl.ts macht bewusst Fallback fuer Request-Zeit-Code)"
    - ".d.mts-Begleitdatei neben .d.ts fuer .mjs-Quelldateien, die sowohl von next.config.mjs (Node direkt) als auch von .test.ts (TypeScript/bundler-Resolution) importiert werden (etabliertes Muster, siehe releaseEditorRedirects.d.mts)"

key-files:
  created:
    - frontend/src/lib/images/publicImagePatterns.test.ts
    - frontend/src/lib/images/publicImagePatterns.d.mts
  modified:
    - frontend/src/lib/images/publicImagePatterns.mjs

key-decisions:
  - "Fehlermeldung enthaelt wortwoertlich NEXT_PUBLIC_API_URL, den Text 'Ungueltige Umgebungsvariable' (mit echten Umlauten), den konkreten ungueltigen Wert und einen Hinweis auf die Next.js-Konfiguration -- erfuellt die must_haves-artifact-Anforderung 'contains: Ungültige Umgebungsvariable'"
  - "Zweiter Testfall fuer einen anderen ungueltigen Wert nutzt 'relative/path/only' statt des im Plan vorgeschlagenen 'ftp:/malformed', weil new URL('ftp:/malformed') in Node tatsaechlich NICHT wirft (wird zu einer gueltigen ftp://malformed/-URL geparst) -- verifiziert per Node-REPL vor dem Schreiben des Tests"

requirements-completed: [D-09]

# Metrics
duration: 12min
completed: 2026-10-19
---

# Phase 188 Plan 04: Fail-Fast-Fehlermeldung fuer ungueltigen NEXT_PUBLIC_API_URL Summary

**configuredApiMediaPatterns wirft bei ungueltigem NEXT_PUBLIC_API_URL eine eindeutige deutsche Fail-Fast-Fehlermeldung statt des unlesbaren TypeError: Invalid URL, Erfolgs-/Leerfall bleibt byte-identisch.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-10-19T23:22:00Z
- **Completed:** 2026-10-19T23:34:23Z
- **Tasks:** 1
- **Files modified:** 3 (1 geaendert, 2 neu)

## Accomplishments
- `new URL(trimmed)` in `configuredApiMediaPatterns` ist jetzt in `try/catch` eingebettet; der `catch`-Zweig wirft einen `Error` mit deutscher Nachricht, die `NEXT_PUBLIC_API_URL`, `Ungültige Umgebungsvariable` und den konkreten ungueltigen Wert enthaelt.
- Neue Testdatei `publicImagePatterns.test.ts` mit 4 Tests: gueltiger Wert (byte-identisches Pattern), leere/undefined/Whitespace-Werte (weiterhin `[]`, kein Throw), zwei unterschiedlich ungueltige Werte (beide werfen mit `NEXT_PUBLIC_API_URL` + konkretem Wert in der Message).
- Bestehende `ResponsiveImage.config.test.ts` bleibt vollstaendig gruen (13 Tests), kein Verhaltenswechsel im Erfolgsfall.

## Task Commits

Each task was committed atomically:

1. **Task 1: Try/catch + deutsche Fail-Fast-Meldung + neue Testdatei** - `b42aff271` (fix)

**Plan metadata:** (siehe Final-Commit unten)

## Files Created/Modified
- `frontend/src/lib/images/publicImagePatterns.mjs` - `configuredApiMediaPatterns` wirft jetzt deutsche Fail-Fast-Fehlermeldung statt TypeError bei ungueltiger URL
- `frontend/src/lib/images/publicImagePatterns.test.ts` - neue Unit-Tests fuer Erfolgs-, Leer- und Fehlerfall
- `frontend/src/lib/images/publicImagePatterns.d.mts` - neue TS-Deklarationsdatei fuer den `.mjs`-Import aus `.test.ts` (Rule 3 Auto-Fix, siehe Deviations)

## Decisions Made
- Fehlermeldungstext enthaelt alle vier im Task gefordeten Elemente (Variablenname, Label "Ungültige Umgebungsvariable", konkreter Wert, Next.js-Hinweis) mit echten Umlauten.
- Zweiter Fehlerfall-Testwert wurde vom im Plan vorgeschlagenen `'ftp:/malformed'` auf `'relative/path/only'` geaendert, weil `new URL('ftp:/malformed')` in Node tatsaechlich erfolgreich zu `ftp://malformed/` geparst wird (kein Throw) -- per Node-Check vor dem Schreiben verifiziert, damit der Test nicht fehlschlaegt bzw. nicht das zu testende Verhalten verfehlt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fehlende TS-Deklarationsdatei fuer .mjs-Import aus Testdatei ergaenzt**
- **Found during:** Task 1 (Verifikation `npx tsc --noEmit`)
- **Issue:** `publicImagePatterns.test.ts` importiert `./publicImagePatterns.mjs` per TypeScript/bundler-Modulaufloesung. Unter dieser Aufloesung sucht TS fuer einen `.mjs`-Import gezielt nach einer `.d.mts`-Datei (nicht `.d.ts`) -- `publicImagePatterns.d.ts` existierte bereits, aber ohne `.d.mts`-Pendant schlug `tsc --noEmit` mit `TS7016: Could not find a declaration file for module './publicImagePatterns.mjs'` fehl. Dasselbe Muster existiert bereits im Repo fuer `releaseEditorRedirects.mjs` (`.d.ts` UND `.d.mts` nebeneinander, identischer Inhalt).
- **Fix:** `publicImagePatterns.d.mts` mit identischem Inhalt zu `publicImagePatterns.d.ts` angelegt (gleiche etablierte Konvention wie `releaseEditorRedirects.d.mts`).
- **Files modified:** `frontend/src/lib/images/publicImagePatterns.d.mts` (neu)
- **Verification:** `npx tsc --noEmit` im Container zeigt danach keinen Fehler mehr fuer diese Datei (verbleibende zwei Fehler sind vorbestehende, unveraenderte `.next/dev/types`-Generate-Artefakte fuer unverwandte Routen, ausserhalb des Scopes dieses Plans).
- **Committed in:** `b42aff271` (Task-1-Commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Notwendig, damit `npx tsc --noEmit` wie in `<acceptance_criteria>` gefordert sauber laeuft. Kein Scope-Creep, folgt bestehendem Repo-Muster 1:1.

## Issues Encountered
- Der im Plan als Beispiel genannte zweite ungueltige Testwert `'ftp:/malformed'` wirft in Node tatsaechlich NICHT (wird als `ftp://malformed/` geparst). Vor dem Schreiben des Tests per `node -e` verifiziert und durch `'relative/path/only'` ersetzt, das nachweislich wirft. Kein Produktionsverhalten geaendert, nur die Testwahl.

## User Setup Required
None - keine externe Service-Konfiguration noetig.

## Next Phase Readiness
- Befund #35.1 vollstaendig behoben: ungueltige `NEXT_PUBLIC_API_URL`-Werte brechen den Next.js-Config-Load mit einer eindeutigen, verstaendlichen deutschen Fehlermeldung ab statt mit einem unlesbaren `TypeError: Invalid URL`.
- Gueltige/leere Werte bleiben byte-identisch zu vorher (bewiesen durch Regressionstests und die unveraendert gruene `ResponsiveImage.config.test.ts`).
- Volle Frontend-Testsuite (393 Testdateien, 3631 Tests) laeuft gruen; `frontend`-Container wurde neu gestartet und laeuft stabil.

---
*Phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen*
*Completed: 2026-10-19*

## Self-Check: PASSED

- FOUND: frontend/src/lib/images/publicImagePatterns.mjs
- FOUND: frontend/src/lib/images/publicImagePatterns.test.ts
- FOUND: frontend/src/lib/images/publicImagePatterns.d.mts
- FOUND commit: b42aff271
