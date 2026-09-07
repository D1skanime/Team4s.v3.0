# Phase 151 frontend checks — paused handoff

No further Execute, browser matrix or build was started after the user's stop request. The already-running full test was allowed to finish.

| Check | Result | Evidence |
|---|---|---|
| Latest full Vitest, one worker | **PASS: 293 files, 2237 tests; 1 skipped file and 3 todo; 202.61 s; exit 0** | `checks/team4s-151-sequential-vitest.log` and `.json` |
| Artwork resolver/live catalog/files | **7/7 PASS**, included in the latest full run; all six Karaoke PNGs now exist | same full log |
| Latest carousel | **39/39 PASS**, included in the latest full run | full log; prior focused `final-review-green` and `carousel-readable-tests` |
| Gallery | **7/7 PASS**, including all 84 compositions and 100/200 full-mount fixtures; included in latest full run | full log; gallery review |
| Production build | **PASS**, Next compile, TypeScript, 25 static pages, Docker image built; exit 0 | `/tmp/team4s-151-final-frontend-build.log` |
| Full lint | **Baseline failure unchanged: 13 errors, 332 warnings**, outside phase code | `/tmp/team4s-151-final-frontend-lint.log` |
| Standalone dev typecheck | **Baseline failure unchanged**, generated `GroupReleasesPageProps.params` sync/Promise mismatch | `/tmp/team4s-151-final-frontend-typecheck.log` |
| Focused carousel + consumers | 37+105 PASS at integration; later 39 carousel and 105 consumers PASS | carousel summaries/review; dedicated logs |
| Shared component integration | **176 PASS** | `component-review-tests.log` |
| Auto image sizes + chain + ResponsiveImage | **100 PASS** | `container-sizes-green.log` |
| Points/contrast/CSS-scanner expectation repairs | **56 PASS** | `test-expectation-fixes.log` |
| Scoped ESLint | **0 errors/0 warnings** for reviewed production changes, gallery, collector and targeted tests at their recorded review points | scoped logs and agent handoffs |
| Native touch / canceled gesture / reduced motion | **PASS** in both motion modes; horizontal 0→1, vertical page +165 px with same active card; first click after touch cancellation works; active/inactive opacity 1/0.72 | `evidence/after/native-touch/result.json`, `checks/check-native-touch.cjs` |

## Superseded failures and their meaning

- Baseline full frontend: 291 files / 2225 tests PASS, one skipped test/file and three todo.
- Resolver TDD: initially 7 failures; after implementation 6 pass / 1 failure for missing assets. The latest full run closes this gap with 7/7 PASS, with no exception or skip.
- Points grouping regression: expected RED (1 failure / 93 skipped), then implementation/consumer checks PASS.
- Image auto-sizing TDD: 2 fail / 3 pass, then 100 PASS across affected files.
- Canceled-gesture test draft: 2 fail / 37 pass. Its jsdom pointer fixture was corrected using the existing geometry seam; native browser evidence independently reproduced the behavioral bug. Final 39 PASS and native trusted-touch proof PASS.
- An earlier integration run recorded 2231 pass / 3 fail / 3 todo. Two obsolete CSS scanner line expectations were corrected (56 focused PASS); one asset gap remained then. That log pathname was later reused, so the older result is retained as a historical note, not represented by the newer contents.
- The overloaded simultaneous build/test/lint/typecheck run returned 287 passed files, 6 failed files, 1 skipped file; 2191 pass / 10 fail / 3 todo and four Vitest worker RPC timeouts. It also exhausted nearly all 8 GB RAM and 4 GB swap and disrupted SSH. **Superseded by the latest one-worker full PASS without increasing timeouts or changing unrelated tests.** Its raw result is retained in `checks/team4s-151-final-frontend-checks.json`.

## Limits of this checkpoint

The successful production image build predates the final three additive PNGs; no rebuild was started after the stop request. The current source and all six assets were covered by the latest full Vitest run, but final five-rank Karaoke visual acceptance is pending. Scoped lint predates the newly added one-off alpha extraction script. Full lint and dev typecheck are still not green; do not change unrelated routes or configuration to hide their baseline failures.

All root direct-check logs are copied to local ignored `evidence/handoff-logs/`; `151-LOG-INDEX.json` records all available root/agent logs and hashes. Plan summaries contain the earlier repeated focused runs. Overlapping counts must not be added as unique tests.


## Abschlusslauf 2026-09-07 (nach dem Wiederaufnehmen)

Alle folgenden Ergebnisse wurden nach dem Geometriefix in `BadgeChip.module.css` neu erhoben und
loesen die oberen Checkpoint-Einschraenkungen ab.

| Check | Ergebnis | Beleg |
|---|---|---|
| Produktionsbuild `docker compose build team4sv30-frontend` | **PASS, rc=0** — kompiliert, TypeScript ok, 25 statische Seiten, Image gebaut | `/tmp/p151-build.log` |
| Vitest voll, ein Worker | **PASS: 293 Dateien / 2239 Tests; 1 Datei skipped, 3 todo; 207.14 s; exit 0** | `/tmp/p151-test.log` |
| Collector-Browsermatrix | **PASS: `pass: true`, 16/16 Zeilen, 0 Findings, 0 Browserfehler** | `evidence/final-review/gap-manifest.json`, `browser-matrix-summary.json` |
| Nativer Touch-Check | **PASS (`pass: true`)** | `checks/check-native-touch.cjs` |
| Scoped ESLint (geaenderte Dateien) | **0 Fehler** | — |
| Voller ESLint | **Baseline unveraendert: 13 Fehler, 332 Warnungen**, ausserhalb des Phasencodes | `/tmp/p151-lint.log` |
| `npx tsc --noEmit` | **PASS** — der frueher notierte `GroupReleasesPageProps`-Fehler reproduziert nach dem Build nicht mehr | `/tmp/p151-lint.log` |
| `git diff --check` | **rc=0** | — |

Der Volltest liegt +2 Tests ueber dem Uebergabestand (2237 -> 2239); die Differenz sind die zwei
neuen Regressionsfaelle in `AchievementArtwork.test.tsx`.
