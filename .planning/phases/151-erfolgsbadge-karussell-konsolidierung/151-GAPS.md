# Phase 151 gaps — geschlossen

Abschluss am 2026-09-07 durch die unabhaengige Verifikation (`151-VERIFICATION.md`).
**Alle Gaps sind geschlossen; es bleibt kein offener Punkt.** Die Tabelle unten ist der
Schlussstand, danach folgt die historische Fassung der pausierten Uebergabe.

| Gap | Schlussstand | Beleg |
|---|---|---|
| Drei fehlende Karaoke-Quellen / Alpha-Freigabe | **CLOSED** | Sechs RGBA-Dateien vorhanden, Resolver 7/7 PASS, Sichtabnahme aller fuenf Stufen erfolgt |
| Volltest unter Speicherdruck | **CLOSED** | 293 Dateien / 2239 Tests PASS, 1 skipped, 3 todo, exit 0, ein Worker |
| Vollstaendige Browsermatrix | **CLOSED** | Collector `pass: true`, 16/16 Zeilen, 0 Findings, 0 Browserfehler |
| Erschoepfende Sichtabnahme | **CLOSED** | Alle 197 Zeilen in `evidence/final-review/ARTWORK-SIGNOFF.md` signiert, Kontaktboegen ohne Beschnitt |
| Kontaktbogen-Beschnitt / Hover-Drawer in alten Screenshots | **CLOSED** | Neuer Lauf: alle Kontaktbogen-Kacheln `contained: true`, keine Drawer-Artefakte |
| Build auf den finalen additiven Assets | **CLOSED** | `docker compose build team4sv30-frontend` rc=0 nach den letzten drei PNGs |
| Finale unabhaengige Verifikation, Summaries 01/05, GSD-Abschluss, Push | **CLOSED** | `151-01-SUMMARY.md`, `151-05-SUMMARY.md`, `151-VERIFICATION.md`, Commits auf `main` |
| Slot-Geometrie `historical_leader` bei 320 px | **CLOSED (neu gefunden und behoben)** | Root Cause, Minimalfix und Regressionstest in `151-VERIFICATION.md` |
| Voller Lint / Dev-Typecheck | **Vorbestehend, unveraendert** | 13 Fehler / 332 Warnungen ausserhalb des Phasencodes; `tsc --noEmit` aktuell fehlerfrei |
| Breite Backend-Diagnose | **Vorbestehend, umgebungsbedingt** | 49 Fehler ohne Phase-128-DSN-/Phase-134-Fixtures; Backend byteidentisch zur Baseline |

---

## Historische Fassung (pausierte Uebergabe)


Current checkpoint supersedes the historical progress notes below. No further Execute step is authorized in this paused task.

| Gap | Current state | Handoff evidence |
|---|---|---|
| Three missing Karaoke sources / alpha permission | **CLOSED technically** | Explicit user permission received; Entry, motif and Bronze added at1254² with real alpha. Six sources now ship; all107 earlier hashes unchanged; resolver7/7 PASS. Final visual acceptance remains open. |
| Full Vitest failures under VM memory pressure | **CLOSED by isolated rerun** | 2237 PASS,293 passed files,1 skipped file,3 todo; no timeout increases or unrelated changes. Run heavy checks sequentially, Vitest one worker. |
| Complete final browser matrix | **OPEN; not started after final fixes** | Revised collector is saved and lint/syntax reviewed; old full runs predate fixes and must not be accepted. |
| Exhaustive visual signoff | **OPEN** | Original107 sources reviewed,3 native frames reviewed,3 extraction previews inspected. Older79 compositions were inspected in partially cropped contact sheets. All84 final full-card rows, final six Karaoke sources/five compositions and final responsive screenshots need signoff. |
| Contact-sheet clipping / hover drawer in old screenshots | **Collector correction implemented; final evidence pending** | Full contain thumbnails, fresh run directories, pointer moved away from left edge and drawer closed through UI. No production-navigation change. |
| Build on final additive assets | **OPEN final packaging check** | Prior isolated production build passed before the last3 PNGs. Current code/assets pass full Vitest. No new build after user stop. |
| Final independent verifier, Plan01/05 summaries, GSD closure and push | **OPEN** | No final VERIFICATION/UAT/signoff exists; phase remains3/5 implemented. Existing plans unchanged. |
| Full lint / dev typecheck | **Known baseline issues** |13 errors332 warnings outside phase; generated GroupReleasesPageProps mismatch. |
| Broad backend diagnostic | **Known baseline/environment issues** |49 repository failures; missing fixture DSNs/runtime and prior source expectations. Focused regressions, build/vet and guarded PostgreSQL checks PASS. |

## Historical execution notes (preserved)


| Finding | State | Evidence / action |
|---|---|---|
| Prototype portrait escaped implicit grid track | CLOSED | Explicit minmax/zero minima; actual image rectangles verified at320/390/1440 and container boundaries; see UI-REVIEW |
| Plan task order/ownership/integrity gate | CLOSED | Five reviewed plans; final PLAN-REVIEW PASS; original107 hash gate executable |
| FocalCarousel grew beyond450-line guideline | CLOSED | Coordinator private-module extraction;449-line engine/207-line internal module;35 tests and scoped lint PASS; commitc4dc7689 |
| Built-in image generator repeatedly returns RGB instead of alpha | OPEN | New generation, background-extraction edit and edit of original RGBA reference all yielded RGB. Multiple native generation/edit strategies exhausted: rejected RGB outputs were never copied to public/. Three native RGBA frames (Silver/Gold/Platinum) are verified and accepted. Entry/motif/Bronze remain missing after final retries. Explicit permission to use existing Sharp for mechanical alpha extraction is pending; no pixel processing occurred. |
| Karaoke live-filesystem coverage | OPEN, dependent on artwork | Resolver TDD moved from7 failures to6 passes/1 expected failure initially listing six missing Karaoke files; the current failure lists exactly Entry, motif and Bronze. Full gate remains RED until accepted PNGs exist. |

## Sequencing deviation
After the image tool exhausted three alpha-preservation strategies, the coordinator continued independent
resolver implementation while image processing approval was pending. This does not close Plan01 or weaken
its complete catalog/filesystem gate. Tests use the existing listRoleDefinitions API helper (one real public
catalog request) and the actual public directory; future-role/missing-file negative proofs pass. UI/business
threshold ownership remains unchanged. Resolver logs: `/tmp/team4s-151-resolver-red.log` and
`/tmp/team4s-151-resolver-awaiting-assets.log`.

## Integration review updates

- CLOSED: shared-slot specificity shield removed after family CSS cleanup.
- CLOSED: locked placeholders now use the shared hero/marker geometry rather than relying on removed legacy maxima.
- CLOSED: de-CH points grouping SSR/browser mismatch (apostrophe glyph). Focused regression RED/GREEN and clean Chromium 390/1440 loads recorded.
- CLOSED: 320px hero width compression and overlapping marker lanes. Outer spacing/card widths and wrapping corrected; repeat browser result has no geometry/overflow/page-error findings.
- OPEN: Entry, motif and Bronze Karaoke images are still RGB with baked checkerboards after three further native attempts using RGBA references only. No failed image was published. Silver/Gold/Platinum have verified native alpha and are additive public files. Explicit user permission for mechanical freestanding of new files is pending, not assumed. Final native attempt provenance remains `/tmp/team4s-151-alpha-final.md` and is copied into the phase record before handoff.
- Sequencing: Plan-05 gallery and collector coding began once component interfaces and CSS were stable while the final three artwork files remained blocked. File ownership is disjoint; exhaustive asset/visual gates remain failing until this is resolved, and no phase completion or final push is claimed.

- CLOSED: CSS rewrite accidentally restored individual stage card surfaces removed before Phase151. Baseline source comparison plus real computed-style review restored the existing transparent presentation; no geometry regression at320.
- CLOSED: independent carousel findings (native-inert click targeting, expand/collapse physical-scroll restoration, stale navigation ref after shrink) fixed in7ed98fff.37 component +105 consumer tests and actual Chromium native input/centering/focus checks pass; see151-CAROUSEL-REVIEW-FIXES.md.
- CLOSED: disclosure buttons below44px. Shared toggle minima corrected; actual browser measures all six gallery disclosures at44px height.
- CLOSED: full-suite old points glyph/source-shape expectations updated without changing threshold behavior. Source-count contrast assertion no longer locks duplicate CSS declarations; remaining formulas are still audited. The existing CSS scanner textual exception line follows the edited test.56 focused tests PASS.
- IN PROGRESS: collector review replaces synthetic native-input claims, strengthens every-slot/alpha/transparent-surface checks and contains full-card contact thumbnails. Final matrix and complete manual signoff are not yet accepted.
- OPEN evidence issue: desktop profile screenshots captured the hover navigation because the default pointer was on the left edge. Move pointer into content and close the drawer through its UI before final capture; do not alter production navigation.
