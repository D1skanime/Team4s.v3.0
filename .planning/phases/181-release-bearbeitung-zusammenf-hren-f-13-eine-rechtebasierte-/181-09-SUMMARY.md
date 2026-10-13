---
phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-
plan: 09
subsystem: ui
tags: [nextjs, redirects, release-editor, cleanup, phase-closeout]

# Dependency graph
requires:
  - phase: 181-02
    provides: "buildReleaseEditorRedirects() -- the already-tested RedirectRule[] builder this plan wires into next.config.mjs for the first time"
  - phase: 181-08
    provides: "All 11 external entry points already repointed to /releases/[versionId]/edit, making it safe to activate the redirects and delete the old pages without any reachable broken intermediate state"
provides:
  - "Both old release-editor addresses (/admin/episode-versions/:id/edit, /me/releases/:id/workspace) permanently 308-redirect to /releases/:versionId/edit with query parameters preserved (D-01/D-04)"
  - "Both old route folders fully deleted -- the merged release-editor page is now the only code path"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Framework/runtime-neutral .mjs sibling for modules consumed directly by next.config.mjs (no TS/bundler step at config-load time), matching the existing publicImagePatterns.mjs/.d.ts precedent"

key-files:
  created:
    - frontend/src/lib/releaseEditorRedirects.d.mts
  modified:
    - frontend/next.config.mjs
  deleted:
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/ (12 files)"
    - "frontend/src/app/me/releases/[versionId]/workspace/ (4 files)"
  renamed:
    - "frontend/src/lib/releaseEditorRedirects.ts -> frontend/src/lib/releaseEditorRedirects.mjs"

key-decisions:
  - "Renamed releaseEditorRedirects.ts to .mjs (Rule 1 bug fix): the plan's interface block specified `import ... from './src/lib/releaseEditorRedirects.ts'`, but next.config.mjs is loaded directly by Node 20 (frontend container's runtime) with no TS/bundler step -- importing a .ts file threw ERR_UNKNOWN_FILE_EXTENSION and crash-looped the frontend container. Fixed by following the codebase's own existing precedent (publicImagePatterns.mjs, whose header comment explicitly documents being framework/runtime-neutral for this exact reason) instead of inventing a new pattern."
  - "Added a sibling releaseEditorRedirects.d.mts (mirroring publicImagePatterns.d.ts) so tsc --noEmit resolves types for the renamed .mjs module under the project's allowJs:false tsconfig -- required for Task 2's typecheck-clean acceptance criterion."
  - "Verified the exact remaining file inventory of both old folders (12 + 4 files) against the plan's documented interfaces block before deleting -- exact match, no surprises, nothing additional needed relocating."

patterns-established: []

requirements-completed: [D-01, D-04]

# Metrics
duration: ~35min
completed: 2026-10-13
---

# Phase 181 Plan 09: Redirects aktivieren + alte Routen loeschen Summary

**Die bereits in Plan 02 getestete `buildReleaseEditorRedirects()` wurde in `next.config.mjs` verdrahtet (als `.mjs`-Umbenennung statt der im Plan vorgesehenen `.ts`-Datei, da Node 20 im Frontend-Container `.ts`-Importe in `next.config.mjs` nicht versteht), und beide Altrouten (`/admin/episode-versions/[versionId]/edit`, `/me/releases/[versionId]/workspace`) wurden vollstaendig geloescht -- die Phase ist damit code-complete.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-10-13T17:05:00Z
- **Completed:** 2026-10-13T17:40:00Z
- **Tasks:** 2/2
- **Files modified:** 20 (1 neu, 1 geaendert, 1 umbenannt, 16 geloescht, 1 Rename-Quelle)

## Accomplishments
- `buildReleaseEditorRedirects()` ist in `next.config.mjs`'s `redirects()` verdrahtet; beide Altadressen leiten jetzt live mit `HTTP 308` und vollstaendig erhaltenen Query-Parametern auf `/releases/:versionId/edit` weiter -- live per `curl -sI` gegen den laufenden Dev-Server bestaetigt.
- Beide alten Routenordner (`admin/episode-versions/[versionId]/edit/`, 12 Dateien; `me/releases/[versionId]/workspace/`, 4 Dateien) wurden nach exaktem Abgleich mit der im Plan dokumentierten Dateiliste vollstaendig geloescht.
- Volle Regression gruen: `tsc --noEmit` 0 Fehler, `npm run lint` unveraendert bei der dokumentierten Baseline (6 vorbestehende Fehler/222 vorbestehende Warnungen), voller `npm test` 389/390 Dateien gruen (389 = 395-Dateien-Baseline aus 181-08 minus die 6 mit den Altordnern geloeschten Testdateien), 0 neue Fehlschlaege.
- Repo-weiter Grep bestaetigt: ausserhalb der bereits in 181-08 dokumentierten 3 Ausnahmekategorien (Redirect-Regel-Quellstrings in `releaseEditorRedirects.mjs`/-Test, Backend-API-Endpunkt-URLs in `lib/api/episodes.ts`, historische Portierungs-Kommentare) finden sich keine verbleibenden Referenzen auf die beiden Altpfade mehr.
- Backend: `go build ./...` und `go vet ./...` sauber. Dieser Plan hat keine Backend-Dateien veraendert; die vorbestehenden Backend-Testfehlschlaege (Phase-128-Postgres-DSN-Umgebungsvariable fehlt, Phase-134-Keycloak-Netzwerk-/Credential-Probleme) liegen ausserhalb des Scopes dieses Plans.

## Task Commits

1. **Task 1: Redirects aktiviert (D-01/D-04)** - `b018ff2c` (feat) -- inkl. Rule-1-Fix: `releaseEditorRedirects.ts` -> `.mjs`
2. **Task 2: Alte Routenordner geloescht + volle Regression** - `0bda3021` (chore) -- inkl. `releaseEditorRedirects.d.mts` (Typdeklarationen fuer das umbenannte `.mjs`-Modul)

**Plan metadata:** (this commit)

## Files Created/Modified
- `frontend/next.config.mjs` - Import + `redirects: async () => buildReleaseEditorRedirects()` ergaenzt (images/turbopack-Bloecke unveraendert)
- `frontend/src/lib/releaseEditorRedirects.mjs` - umbenannt von `.ts` (Rule 1), TS-`interface` zu JSDoc-`@typedef` konvertiert
- `frontend/src/lib/releaseEditorRedirects.d.mts` - neu, Typdeklarationen fuer das `.mjs`-Modul (mirrors `publicImagePatterns.d.ts`)
- `frontend/src/lib/releaseEditorRedirects.test.ts` - Import-Pfad auf `./releaseEditorRedirects.mjs` aktualisiert
- `frontend/src/app/admin/episode-versions/[versionId]/edit/` - komplett geloescht (12 Dateien)
- `frontend/src/app/me/releases/[versionId]/workspace/` - komplett geloescht (4 Dateien)

## Decisions Made
- Siehe `key-decisions` im Frontmatter: `.mjs`-Umbenennung statt des im Plan vorgesehenen `.ts`-Imports (Rule 1 -- Code funktionierte wie geplant nicht, bestaetigt durch einen crash-loopenden Frontend-Container), plus die begleitende `.d.mts`-Typdeklaration, beide nach dem bereits im Repo etablierten `publicImagePatterns.mjs`/`.d.ts`-Muster.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `next.config.mjs` kann keine `.ts`-Datei direkt importieren**
- **Found during:** Task 1, unmittelbar nach dem urspruenglichen `import ... from './src/lib/releaseEditorRedirects.ts'` gemaess Plan-Interface-Block
- **Issue:** `next.config.mjs` wird im `team4sv30-frontend`-Container direkt von Node 20 geladen, ohne TS-/Bundler-Schritt. Der Import einer `.ts`-Datei warf `TypeError: Unknown file extension ".ts"` (`ERR_UNKNOWN_FILE_EXTENSION`) und liess den Frontend-Container in eine Neustart-Schleife laufen (bestaetigt per `docker compose ps`/`docker logs`).
- **Fix:** `releaseEditorRedirects.ts` zu `releaseEditorRedirects.mjs` umbenannt (TS-`interface` zu JSDoc-`@typedef` konvertiert, Funktionssignatur sonst unveraendert), Import-Pfade in `next.config.mjs` und im Testfile entsprechend aktualisiert, und eine begleitende `releaseEditorRedirects.d.mts` ergaenzt, damit `tsc --noEmit` unter dem Projekt-`allowJs:false`-Tsconfig weiterhin typisiert bleibt -- exakt das bereits im Repo etablierte Muster von `publicImagePatterns.mjs`/`.d.ts`, dessen Header-Kommentar denselben Grund explizit dokumentiert.
- **Files modified:** `frontend/src/lib/releaseEditorRedirects.mjs` (umbenannt von `.ts`), `frontend/src/lib/releaseEditorRedirects.d.mts` (neu), `frontend/src/lib/releaseEditorRedirects.test.ts`, `frontend/next.config.mjs`
- **Commit:** `b018ff2c` (Umbenennung + next.config.mjs-Verdrahtung), `0bda3021` (`.d.mts`-Nachtrag)

## Issues Encountered

Waehrend der Diagnose wurde `.next/types`/`.next/dev/types` im laufenden Container geloescht, um den TS-Validator-Cache zu leeren (stale Referenzen auf die zu loeschenden Altrouten); das fuehrte kurzzeitig zu `ENOENT`-Fehlern beim Dev-Server, bis ein `docker restart team4sv30-frontend` den `.next`-Cache sauber neu aufgebaut hat. Danach lief der Server wieder stabil (bestaetigt per `curl` 200 auf `/` und 308 auf beiden Altadressen).

## User Setup Required

None - keine externe Service-Konfiguration noetig. Frontend-Container wurde nach den Aenderungen neu gestartet (`docker restart team4sv30-frontend`).

## Next Phase Readiness
- Phase 181 (9/9 Plaene) ist damit code-complete: die rechtebasierte Release-Bearbeitungsseite unter `/releases/[versionId]/edit` ist die einzige verbleibende Implementierung, beide Altadressen leiten dauerhaft weiter, alle 11 externen Einstiegspunkte zeigen direkt auf die neue Seite.
- **Offen, NICHT von diesem Plan abgehakt:** das in 181-VALIDATION.md dokumentierte Live-UAT-Checklist (alle 11 Einstiegspunkte im Browser anklicken, Tab-Sichtbarkeit Admin-vs-Mitglied vergleichen, Projekt-vs-Episode-Navigation vergleichen, Plattform-Admin-ohne-Mitgliederprofil-Seitenaufruf als nicht-404 bestaetigen) bleibt ein menschlicher Verifikationsschritt und wird hier bewusst nicht selbst als bestanden markiert.
- Keine Blocker fuer zukuenftige Phasen.

---
*Phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-*
*Completed: 2026-10-13*

## Self-Check: PASSED

`frontend/next.config.mjs`, `frontend/src/lib/releaseEditorRedirects.mjs`, `frontend/src/lib/releaseEditorRedirects.d.mts` auf der Festplatte gefunden; beide Altordner bestaetigt nicht mehr vorhanden (`ls` meldet "No such file or directory" fuer beide Pfade); beide Task-Commits (`b018ff2c`, `0bda3021`) im Git-Log gefunden.
