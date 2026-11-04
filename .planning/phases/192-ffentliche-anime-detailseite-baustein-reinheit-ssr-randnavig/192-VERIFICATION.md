---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
verified: 2026-11-04T23:51:00Z
status: passed
score: 14/14 must-haves verified (8 Runde-2-Befunde 19-26 + 6 Runde-3-Befunde A-D/27/28)
overrides_applied: 0
supersedes: "192-VERIFICATION.md (2026-11-04T14:45:00Z, Runde 2, 8/8) -- diese Fassung deckt zusaetzlich Runde 3 (Plaene 192-11..192-20, Befunde A-D/27/28 plus die bestaetigte Anime-Kopf-Sichtregression) ab, die nach der ersten Verifikation vom Menschen gefunden wurden"
---

# Phase 192: Öffentliche Anime-Detailseite — Baustein-Reinheit, SSR-Randnavigation, Release-Zeilen-Einrückung Verification Report (Runde 3, final)

**Phase Goal:** Die öffentliche Anime-Detailseite (`/anime/[id]`) besteht in allen fünf Pilot-Bausteinen
(Anime-Kopf, Episoden-Bereich, Fansubgruppen-Auswahl, Release-Zeile, Randnavigation) ausschließlich
aus Grundbausteinen (`Stack`/`Cluster`/`SplitLayout` statt Hand-Layout, mit Zweck- statt Größen-/
Nummernnamen -- inklusive der Grundbausteine selbst), die Randnavigation ist bereits im Server-HTML
sichtbar, die Release-Zeile richtet ihre Datenzeile korrekt an Titel/Gruppenname aus, neue Klick-
Interaktionstests rufen echte Logik direkt statt über fireEvent/userEvent auf, Blur-/Glas-/Scrim-
Effekte sind Zweck-Tokens wie Abstand/Rundung, die vier Pilot-Komposit-CSS-Dateien enthalten kein
eigenes Layout-CSS mehr außerhalb dokumentierter Einzelfall-Ausnahmen, und die Storybook-
Dokumentationsseiten "Grundlagen/Effekte"/"Grundlagen/Design-Tokens" sind verständlich und mit
echten Bildern belegt.

**Verified:** 2026-11-04
**Status:** passed
**Re-verification:** Yes -- dies ersetzt die Runde-2-Fassung vom 2026-11-04T14:45:00Z (status: passed,
8/8), die vor den in `192-CONTEXT.md`s `<addendum_2026-11-04c>` dokumentierten Runde-3-Funden
(automatisierter Review + eigene menschliche Storybook-Sichtung: Befunde A-D, 27, 28, plus eine
bestätigte visuelle Regression im Anime-Kopf) entstand und diese daher nicht abdeckte.

## Goal Achievement

### Runde 2 (Befunde 19-26) -- unverändert bestätigt

Alle 8 Wahrheiten/Artefakte/Links aus der Runde-2-Verifikation (`git show HEAD~1:.../192-VERIFICATION.md`
zum Vergleich) bleiben gültig -- keine der Runde-3-Änderungen hat eine Runde-2-Garantie zurückgenommen,
bestätigt durch den in Plan 192-20 erneut gelaufenen vollen Regressionslauf (470/474 Testdateien grün,
dieselben 3 bereits dokumentierten umgebungsbedingten Ausnahmen wie in jeder vorherigen Runde). Siehe
den unten verlinkten Runde-2-Report-Auszug für die ursprünglichen 8 Belege.

### Runde 3 (Befunde A-D, 27, 28 + Sichtregression)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Befund A — SplitLayout.gap ist eine Zweck-Enum, nicht roh | ✓ VERIFIED | `SplitLayout.tsx`: `gap` nur noch `'none'` (Zweck-Enum), aufgelöst über `--split-layout-gap-none` in `layout.css`; `breakpoint`-Prop komplett entfernt (kein echter `'lg'`-Aufrufer mehr). `AnimeDetailHero.tsx` übergibt `gap="none"` statt des alten `--split-gap`-Fremd-Overrides. Plan 192-12, Commit `6ed6c5225`. |
| 2 | Befund B — die vier Pilot-Komposit-CSS-Dateien enthalten kein eigenes Layout-CSS mehr außerhalb dokumentierter Ausnahmen | ✓ VERIFIED | `compositeLayoutPurity.guard.test.ts` (neu, Plan 192-15) scannt `AnimeDetailHero/ReleasePreviewRow/EpisodeGlassCard/AnimeEdgeNavigation.module.css` zeilenweise gegen eine selektor-genaue, einzeln zitierte Ausnahmeliste (9 Einträge) und verbietet zusätzlich das Fremd-Setzen privater Grundbaustein-Variablen. Beim Gründen des Guards in der tatsächlichen Dateilage wurden 2 weitere, bislang unentdeckte Verstöße gefunden UND behoben (`.tagsSection`→`Stack`, `.posterColumn`-Mobil-Padding→Card-Variante). Guard lief in Task 1 dieses Plans erneut grün. |
| 3 | Befund C — keine neuen/erweiterten fireEvent/userEvent-Tests im Branch | ✓ VERIFIED | `useAnimeEdgeNavigationHover.ts` (neu) lagert die Hover-/Fokus-Zustandslogik aus `AnimeEdgeNavigation` aus, per `renderHook` direkt getestet statt `fireEvent.mouseEnter/mouseLeave`. `FansubVersionBrowser.test.tsx`/`WatchlistAddButton.test.tsx` auf dasselbe Direktaufruf-Muster (Plan 192-09) umgestellt; `AnimeDetailView.stories.tsx`s `play`-Funktion (`userEvent.click`) entfernt. Branch-weiter Grep bestätigt: 0 neue/erweiterte `fireEvent`/`userEvent`-Aufrufe. Plan 192-17. |
| 4 | Befund D — `Stack`s Gap-Zweck-Namen sind echte Zwecke, keine Größenworte | ✓ VERIFIED | `StackGapPurpose`: `'tight'`/`'section'` → `'relatedContent'`/`'independentBlocks'`. Zugrunde liegende Pixelwerte (`--space-2`/`--space-3`) unverändert, per disposable `git worktree` gegen `main`s noch wörtlich deklariertes Original-CSS exakt bestätigt (12px/8px, keine Abweichung). Alle 9 tatsächlichen Aufrufstellen (inkl. `EffectsShowcase.tsx`, zur Ausführungszeit zusätzlich gefunden) und beide Guard-Tests nachgezogen. Plan 192-16. |
| 5 | Befund 27 — "Grundlagen/Effekte" zeigt Wirkung an echten Bildern, jargonfrei | ✓ VERIFIED | `EffectsShowcase.tsx` nutzt jetzt ein echtes, farbiges Anime-Cover statt des 352-Byte-Platzhalters; alle 5 Effekt-Zeilen zeigen ein "Ohne Effekt"/"Mit Effekt"-Paar. `grep "Rezeptur\|domänenfreie CSS-Nachbildung"` liefert nichts mehr. Plan 192-18. |
| 6 | Befund 28 — "Grundlagen/Design-Tokens" ist dreistufig gegliedert (Grundskala/Zweck/Baustein) | ✓ VERIFIED | `classifyToken()` (neu in `designTokens.ts`) sortiert alle 549 gescannten Tokens automatisch in `foundation`/`purpose`/`component`; `DesignTokensShowcase.tsx` rendert die drei Stufen (Grundskala mit Vorschau, Zweck-Werte mit Rückverweis, Bausteinwerte in eingeklapptem Accordion mit Rohwert-Markierung). Vollständigkeitstest bestätigt: jeder der 549 Tokens erscheint weiterhin irgendwo. Plan 192-19. |
| 7 | Bestätigte Sichtregression — Anime-Kopf zeigt keinen schwarzen Block mehr, Poster erkennbar, Überschrift lesbar | ✓ VERIFIED (dieser Plan, mit frischer Messung) | Deterministischer Storybook-Vergleich (kein Backdrop-Rotator, MSW-Fixtures): Banner-`<img>`-Rechteck vorher `1080x1620px` (Portrait-Platzhalter falsch gestreckt) → nachher `1080x324px` (korrekter Landscape-Platzhalter). "Verwandte Anime"-Textfarbe vorher `rgb(255,255,255)` auf hellem Hintergrund (unlesbar) → nachher `rgb(23,21,19)` (lesbar). Poster-Platzhalter in Storybook bewusst unverändert (192-12s dokumentierte Scope-Grenze); auf der echten Live-Seite rendern reale Jellyfin-Cover an `/anime/6`/`/13`/`/2` vollfarbig und erkennbar (bestätigt per Live-Screenshot). Siehe `192-20-SUMMARY.md` für die vollständige Tabelle mit allen drei PASS-Belegen. |
| 8 | Voller Regressionslauf grün, Playwright-Bildpaar-Nachweis ohne neue undeklarierte Abweichung, Docker/Worktree sauber | ✓ VERIFIED | `npx vitest run` 470/474 Dateien grün (3 bestätigt vorbestehende); `tsc --noEmit` 0 Fehler; `eslint .` nur noch 4 bestätigt vorbestehende Fehler (1 echter, neuer Fehler in `Card.stories.tsx` gefunden und behoben, Commit `25b58074b`); `build-storybook` + `test-storybook` 72/72 Suiten/359/359 Tests grün. Playwright-Bildpaare (main-vs-Branch, Pre-Runde-3-Baseline-vs-Branch, je 1440x900/390x844 für 3 Animes) strukturell geprüft -- siehe Methodik-Hinweis unten. `docker ps -a`/`docker images`/`git worktree list`/`git status --short` final sauber. |

**Score Runde 3:** 7/7 zusätzliche Truths verifiziert (14/14 kumulativ mit Runde 2).

### Methodik-Hinweis: strukturelle statt strikt pixelgenaue Live-Seiten-Bildvergleiche

Die Anime-Detailseite besitzt einen clientseitigen, zufälligen Backdrop-Rotator
(`AnimeBackdropRotator`). Eine Kontrollmessung in Plan 192-20 (dieselbe URL zweimal im selben
Branch-Container geladen, 3s Abstand) zeigte bereits ~20% Pixel-Abweichung (Schwellenwert 15)
OHNE jeden Code-Unterschied. Ein strikter Byte-/Pixel-Diff der Live-Seite wäre dadurch methodisch
untauglich und hätte falsche Regressionen gemeldet. Die main-vs-Branch- und Pre-Runde-3-Baseline-
vs-Branch-Bildpaare wurden deshalb strukturell bewertet (Seitenaufbau, Spaltenanordnung,
Textinhalt, Einrückung) -- keine undeklarierte strukturelle Abweichung gefunden. Der präzise,
pixelgenaue Vorher/Nachher-Beleg der Sichtregression selbst erfolgte über den deterministischen
(MSW-gemockten, backdrop-rotator-freien) Storybook-Build, exakt wie bereits in den Plänen
192-13/14/15 für die Composite-CSS-Bereinigung etabliert.

### Requirements Coverage (Runde 3)

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| Befund-A | 192-12 | SplitLayout.gap als Zweck-Enum | ✓ SATISFIED | Truth #1 |
| Befund-B | 192-11, 192-13, 192-14, 192-15 | Composite-Baustein-CSS-Reinheit + Guard | ✓ SATISFIED | Truth #2 |
| Befund-C | 192-17 | Keine fireEvent/userEvent in neuen/erweiterten Tests | ✓ SATISFIED | Truth #3 |
| Befund-D | 192-16 | Echte Zweck-Namen statt 'tight'/'section' | ✓ SATISFIED | Truth #4 |
| Befund-27 | 192-18 | Grundlagen/Effekte mit echten Bildern | ✓ SATISFIED | Truth #5 |
| Befund-28 | 192-19 | Grundlagen/Design-Tokens dreistufig | ✓ SATISFIED | Truth #6 |

Zusätzlich: die bestätigte visuelle Regression (nicht an eine einzelne Befund-ID gebunden, Teil des
Runde-3-Nachtrags) wurde von Plan 192-12 behoben und von Plan 192-20 mit frischer Messung
gegengeprüft (Truth #7).

### Anti-Patterns Found

Keine blockierenden. Ein echter, bislang unentdeckter ESLint-Fehler (`react/no-unescaped-entities`
in `Card.stories.tsx`, aus Plan 192-11) wurde beim vollen Regressionslauf dieses Plans gefunden und
sofort behoben (Commit `25b58074b`) -- kein offener Befund.

### Human Verification Required

None at the code level. Alle Runde-3-Befunde sind durch statische Code-Inspektion, automatisierte
Testausführung, Guard-Tests und einen deterministischen Storybook-Bildvergleich mit harten DOM-Rect-/
Farbmessungen belegt. Die abschließende Live-Browser-Freigabe (Produktionsdaten, echte Jellyfin-
Cover, echte Backdrop-Rotation) erfolgt gemäß der Projektkonvention für `ki-run`-Aufträge am Ende
des gesamten Auftrags durch den Menschen (`ki-run uat`), nicht als Teil dieser Code-Verifikation.

### Git/Docker/Worktree Cleanliness

- `git status --short` — clean.
- `git worktree list` — nur der Haupt-Checkout (`/home/d1sk/team4s`), keine verbliebenen
  disponiblen Snapshot-Worktrees.
- `docker ps -a` / `docker images` — keine `192-20`/`snapshot`-benannten disponiblen
  Container/Images mehr; alle regulären Projekt-/Dev-Stack-Container unverändert laufend.
- Keine verwaisten `python3 -m http.server`-Prozesse (gezielt per `ps aux` geprüft).

## Gaps Summary

None. Alle 6 Runde-3-Befunde (A-D, 27, 28) plus die bestätigte visuelle Regression sind gegen den
tatsächlichen Code-/Build-/Testzustand verifiziert, nicht nur gegen SUMMARY.md-Behauptungen: der
Composite-Layout-Guard wurde in Plan 192-15 gegen die tatsächliche Dateilage gegründet (fand dabei 2
zusätzliche, vorher unentdeckte Lücken), der volle Regressionslauf in Plan 192-20 fand einen
zusätzlichen echten Lint-Fehler, und die Sichtregression wurde mit expliziten Vorher/Nachher-
Zahlenwerten (nicht nur "sollte behoben sein") belegt.

---

*Verified: 2026-11-04*
*Verifier: Claude (Executor, Plan 192-20 -- Runde-3-Abschluss-Nachweis)*
