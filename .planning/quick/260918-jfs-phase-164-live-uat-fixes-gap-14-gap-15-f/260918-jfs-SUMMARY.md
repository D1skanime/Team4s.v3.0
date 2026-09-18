---
phase: quick-260918-jfs
plan: 01
subsystem: ui
tags: [nextjs, react, vitest, frontend, anime-detail]

# Dependency graph
requires:
  - phase: 164
    provides: public anime detail page (/anime/[id]) and fansub release preview/detail rendering this quick task modifies
provides:
  - "Fansub-Release-Datumszeile mit neuem öffentlichen Wortlaut (Preview + Detailseite)"
  - "/anime/[id] ohne Kommentarbereich und ohne 'Mitwirkende Gruppen'-Bereich"
affects: [anime-detail-page, fansub-release-preview, release-detail-hero]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - frontend/src/components/fansubs/episodePreviewFormat.ts
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx
    - frontend/src/app/anime/[id]/page.tsx
    - frontend/src/app/anime/[id]/page.module.css
    - frontend/src/lib/api.ts

key-decisions:
  - "Unused-Var-Lint-Warnung für 'animeID' in page.tsx (durch Entfernen des getAnimeComments-Aufrufs verwaist) als Rule-1-Bug direkt behoben, statt als offenen Lint-Finding stehen zu lassen"

patterns-established: []

requirements-completed: [GAP-14, GAP-15]

# Metrics
duration: 7min
completed: 2026-09-18
---

# Quick Task 260918-jfs: Live-UAT-Fixes GAP-14/GAP-15 Summary

**Fansub-Release-Datumszeile auf "Fansub-Release vom TT.MM.JJJJ" umformuliert und Kommentar-/"Mitwirkende Gruppen"-Bereiche vollständig von der öffentlichen Anime-Detailseite entfernt (inkl. 10 gelöschter verwaister Frontend-Dateien).**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-18T14:06:47Z
- **Completed:** 2026-09-18T14:13:18Z
- **Tasks:** 4/4
- **Files modified:** 9 modified, 10 deleted

## Accomplishments
- GAP-14: `formatReleaseDateLine` (episodePreviewFormat.ts) und `ReleaseDetailHero.tsx`-Technikraster zeigen jetzt öffentlich "Fansub-Release vom TT.MM.JJJJ" statt "Veröffentlicht am/Veröffentlicht"; Admin-Formulare unangetastet.
- GAP-15a: Kommentarbereich (`CommentSection`, `getAnimeComments`-SSR-Fetch) vollständig von `/anime/[id]` entfernt; verwaiste Comment-Komponenten (7 Dateien) gelöscht; `createAnimeComment` bleibt erhalten (weiterer echter Aufrufer in `api.auth-refresh.test.ts`).
- GAP-15b: "Mitwirkende Gruppen"-Bereich (`AnimeContributionsSection`) vollständig von `/anime/[id]` entfernt; verwaiste Dateien (3) gelöscht; `GroupContributionBlock.*` unangetastet (eigenständiger Importer über `ReleaseVersionBreakdown.tsx`).
- Alle 6 betroffenen Testdateien grün (120 Tests), `tsc --noEmit` 0 Fehler, ESLint 0 Findings, Container neu gestartet und live per curl gegen `/anime/4` verifiziert.

## Task Commits

Each task was committed atomically:

1. **Task 1: GAP-14 — Fansub-Release-Datumszeile umformulieren (Preview + Detailseite)** - `51c7b1fb` (fix)
2. **Task 2: GAP-15a — Kommentarbereich vollständig von /anime/[id] entfernen** - `903403dc` (fix, gelöschte Comment-Komponenten) + `202641aa` (fix, page.tsx/api.ts/Tests — siehe Deviations)
3. **Task 3: GAP-15b — "Mitwirkende Gruppen"-Bereich vollständig von /anime/[id] entfernen** - `21f3a79c` (fix)
4. **Task 4: Verifikation** - `798e2e5d` (fix, Entfernung der durch Task 2 verwaisten `animeID`-Variable — siehe Deviations)

**Plan metadata:** wird vom Orchestrator separat committet.

_Hinweis: Task 2 wurde in zwei Commits gesplittet, da ein `git add` mit gemischten Pfaden (bereits per `git rm` gestagte gelöschte Dateien + neu geänderte Dateien) an einem einzelnen ungültigen Pathspec scheiterte und dadurch nur die bereits gestagten Löschungen committet wurden. Der zweite Commit (`202641aa`) trägt die restlichen Task-2-Änderungen (page.tsx, api.ts, Tests) nach — inhaltlich beides Teil von Task 2, keine Scope-Änderung._

## Files Created/Modified
- `frontend/src/components/fansubs/episodePreviewFormat.ts` - `formatReleaseDateLine` gibt jetzt "Fansub-Release vom ..." zurück
- `frontend/src/components/fansubs/episodePreviewFormat.test.ts` - Assertion auf neuen Wortlaut angepasst
- `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx` - Assertions auf neuen Wortlaut angepasst
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx` - Label "Fansub-Release vom" statt "Veröffentlicht"
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx` - Assertions auf neues Label angepasst
- `frontend/src/app/anime/[id]/page.tsx` - CommentSection- und AnimeContributionsSection-Wiring, getAnimeComments-Fetch, `commentsResponse`/`commentsError` und der verwaiste `animeID`-Local entfernt
- `frontend/src/app/anime/[id]/page.module.css` - CSS-Kommentar "Content Area (Episodes, Comments)" → "Content Area (Episodes)"
- `frontend/src/app/anime/[id]/page.test.tsx` - Mocks/Assertions für `getAnimeComments` entfernt
- `frontend/src/app/anime/[id]/page.performance.test.ts` - Mocks/Assertions/Fetch-Zähler für `getAnimeComments` entfernt
- `frontend/src/lib/api.ts` - `getAnimeComments`, `buildCommentQuery`, `CommentListParams`, `PaginatedCommentResponse`-Import entfernt; `createAnimeComment` unverändert
- `frontend/src/components/comments/CommentSection.tsx` - gelöscht (verwaist)
- `frontend/src/components/comments/CommentSection.module.css` - gelöscht (verwaist)
- `frontend/src/components/comments/CommentForm.tsx` - gelöscht (verwaist)
- `frontend/src/components/comments/CommentForm.module.css` - gelöscht (verwaist)
- `frontend/src/components/comments/CommentForm.test.tsx` - gelöscht (verwaist)
- `frontend/src/components/comments/commentSectionState.ts` - gelöscht (verwaist)
- `frontend/src/components/comments/commentSectionState.test.ts` - gelöscht (verwaist)
- `frontend/src/components/anime/AnimeContributionsSection.tsx` - gelöscht (verwaist)
- `frontend/src/components/anime/AnimeContributionsSection.module.css` - gelöscht (verwaist)
- `frontend/src/components/anime/AnimeContributionsSection.test.tsx` - gelöscht (verwaist)

## Decisions Made
- Der durch das Entfernen von `getAnimeComments(animeID, ...)` verwaiste lokale `const animeID = anime.id` in `page.tsx` wurde ebenfalls entfernt, um die vom Plan geforderte "0 neue ESLint-Findings"-Bedingung zu erfüllen (siehe Deviations).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/Lint-Regression] Verwaiste `animeID`-Variable nach Entfernen von getAnimeComments**
- **Found during:** Task 4 (ESLint-Verifikationslauf)
- **Issue:** Nach Entfernen des `getAnimeComments(animeID, ...)`-Aufrufs in Task 2 blieb `const animeID = anime.id` in `page.tsx` als einzige verbleibende Verwendung ungenutzt zurück, was ESLint `@typescript-eslint/no-unused-vars` als neue Warnung meldete — verletzt die vom Plan geforderte Bedingung "0 neue Findings".
- **Fix:** Zeile `const animeID = anime.id` in `AnimeDetailContent` vollständig entfernt (an keiner anderen Stelle im JSX-Baum referenziert; alle Verwendungsstellen nutzen bereits `anime.id` direkt).
- **Files modified:** `frontend/src/app/anime/[id]/page.tsx`
- **Verification:** `npx eslint ...` läuft danach mit 0 Errors/0 Warnings; `npx tsc --noEmit` weiterhin 0 Fehler; alle 6 betroffenen Testdateien (120 Tests) weiterhin grün.
- **Committed in:** `798e2e5d` (Task 4)

---

**Total deviations:** 1 auto-fixed (1 Rule-1-Lint-Regression)
**Impact on plan:** Notwendig, um die im Plan selbst geforderte "0 neue ESLint-Findings"-Bedingung zu erfüllen. Kein Scope-Creep, reine Aufräumung eines durch die geplante Änderung selbst verwaisten Symbols.

## Issues Encountered
- Ein `git add` mit gemischten Pfaden (bereits per `git rm` gestagte gelöschte Dateien plus neu geänderte Dateien in einem Aufruf) scheiterte mit einem Pathspec-Fehler auf dem ersten bereits vollständig gestagten Pfad und verhinderte dadurch stillschweigend das Stagen der übrigen, gültigen Pfade im selben Aufruf. Dadurch wurde Task 2 in zwei separate Commits gesplittet (`903403dc` für die reinen Datei-Löschungen, `202641aa` für den restlichen Code-Diff). Kein inhaltlicher Verlust, beide Commits sind Teil von Task 2 und wurden sofort im Anschluss korrigiert nachgeprüft (`git status --short` zeigte danach keine unstaged Änderungen mehr).

## Live-Verifikation (Task 4, Schritt 5)

Container `team4sv30-frontend` wurde neu gestartet und lieferte sofort (1. Versuch) `200` auf `curl -sf http://127.0.0.1:3000/anime/4`. Live-HTML (`Naruto`, 110723 Bytes, u.a. `episodesSection` vorhanden — Seite hat vollständig gerendert):

| Prüfung | Ergebnis | Befund |
|---|---|---|
| `grep -c "Kommentare"` | `0` | Kommentarbereich live bestätigt entfernt (GAP-15a) |
| `grep -c "Mitwirkende Gruppen"` | `0` | "Mitwirkende Gruppen"-Bereich live bestätigt entfernt (GAP-15b) |
| `grep -c "Fansub-Release vom"` | `0` | — |
| `grep -c "Veröffentlicht am"` | `0` | — |

**GAP-14-Wortlaut-Befund:** Anime 4 (Naruto) hat auf der öffentlichen Detailseite `/anime/4` derzeit keine Fansub-Release-Version mit gesetztem `release_date` (beide Zähler `0` — korrekt gemäß dem in Task 1 verifizierten Fallback-Verhalten: die Zeile wird bei fehlendem Datum komplett weggelassen, nicht durch einen falschen String ersetzt). Der neue Wortlaut "Fansub-Release vom TT.MM.JJJJ" konnte an Anime 4 daher **nicht live bestätigt werden** — die Bestätigung stützt sich ausschließlich auf die in Task 1 grün laufenden Unit-Tests (`episodePreviewFormat.test.ts`, `FansubVersionBrowser.test.tsx`, `ReleaseDetailHero.test.tsx`), die den exakten Rückgabestring bzw. das Label direkt prüfen.

## User Setup Required

None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness
- Beide Live-UAT-Gaps (GAP-14, GAP-15) vom 18.09.2026 sind umgesetzt und lokal/live verifiziert.
- Laufende Phase-164-Abnahme ist unberührt; dieser Quick-Task ersetzt keine Phasen-UAT.
- Empfehlung für zukünftige UAT: falls "Fansub-Release vom" auch live an einem konkreten Anime mit gesetztem `release_date` bestätigt werden soll, empfiehlt sich ein gezielter Check an einem Anime/Release mit bekanntem `release_date`-Wert (z.B. über die Admin-Ansicht vorab identifizieren).

## Self-Check: PASSED

All modified files verified present, all deleted files verified absent, all 5 commit hashes (`51c7b1fb`, `903403dc`, `202641aa`, `21f3a79c`, `798e2e5d`) verified present in git log.

---
*Phase: quick-260918-jfs*
*Completed: 2026-09-18*
