---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
verified: 2026-11-05T03:30:00Z
status: passed
score: 20/20 must-haves verified (8 Runde-2-Befunde 19-26 + 6 Runde-3-Befunde A-D/27/28 + 6 Runde-4-Erweiterungen A-D/Guard-Verschaerfung/Review-Befund-2)
overrides_applied: 0
supersedes: "192-VERIFICATION.md (2026-11-04T23:51:00Z, Runde 3, 14/14) -- diese Fassung deckt zusaetzlich Runde 4 (Plaene 192-21..192-27, die beiden blockierenden [high]-Befunde eines unabhaengigen Reviews: compositeLayoutPurity-Ausnahmeliste + Card-padding rohe Stufen) ab, die nach der Runde-3-Verifikation gefunden wurden"
---

# Phase 192: Öffentliche Anime-Detailseite — Baustein-Reinheit, SSR-Randnavigation, Release-Zeilen-Einrückung Verification Report (Runde 4, final)

**Phase Goal:** Die öffentliche Anime-Detailseite (`/anime/[id]`) besteht in allen fünf Pilot-Bausteinen
(Anime-Kopf, Episoden-Bereich, Fansubgruppen-Auswahl, Release-Zeile, Randnavigation) ausschließlich
aus Grundbausteinen (`Stack`/`Cluster`/`SplitLayout` statt Hand-Layout, mit Zweck- statt Größen-/
Nummernnamen -- inklusive der Grundbausteine selbst), die Randnavigation ist bereits im Server-HTML
sichtbar, die Release-Zeile richtet ihre Datenzeile korrekt an Titel/Gruppenname aus, neue Klick-
Interaktionstests rufen echte Logik direkt statt über fireEvent/userEvent auf, Blur-/Glas-/Scrim-
Effekte sind Zweck-Tokens wie Abstand/Rundung, und die Storybook-Dokumentationsseiten
"Grundlagen/Effekte"/"Grundlagen/Design-Tokens" sind verständlich und mit echten Bildern belegt.
Die vier Pilot-Komposit-CSS-Dateien enthalten seit Runde 4 KEIN eigenes Layout-CSS mehr -- auch
nicht als dokumentierte Einzelfall-Ausnahme: `compositeLayoutPurity.guard.test.ts` ist seit Runde 4
ein permanenter, AUSNAHMELOSER Wächter -- die vormalige `DOCUMENTED_LAYOUT_EXCEPTIONS`-Liste ist
ersatzlos entfernt, jede der vier Pilot-Komposit-Dateien besteht nachweislich zu 100% aus
Grundbaustein-Komposition.

**Verified:** 2026-11-05
**Status:** passed
**Re-verification:** Yes -- dies ersetzt die Runde-3-Fassung vom 2026-11-04T23:51:00Z (status:
passed, 14/14), die vor den in `192-CONTEXT.md`s `<addendum_2026-11-05a>` dokumentierten
Runde-4-Funden (unabhängiger Review, 2 blockierende [high]-Befunde: die Ausnahmeliste im
Composite-Layout-Guard widersprach der ursprünglichen Befund-22/23-Vorgabe, und `Card.padding` nahm
weiterhin rohe Größenstufen statt Zweck-Namen) entstand und diese daher nicht abdeckte.

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

### Runde 4 (unabhängiger Review, Befund-Review1 + Befund-Review2)

Nach der Runde-3-Verifikation meldete ein unabhängiger, nur-lesender Review zwei blockierende
`[high]`-Befunde: (1) `compositeLayoutPurity.guard.test.ts` ließ trotz Befund 22/23s
ursprünglicher, ausnahmeloser Vorgabe eine selektor-genaue `DOCUMENTED_LAYOUT_EXCEPTIONS`-Liste zu
(12 Einträge über die vier Pilot-Komposit-Dateien verteilt); (2) `Card.padding` nahm weiterhin rohe
Größenstufen (`'1'..'9'`) statt Zweck-Namen, im Widerspruch zur in Befund 24 bereits etablierten
Namensregel. Beide Befunde wurden durch sieben Pläne (192-21 bis 192-27) behoben: vier neue, echte
Grundbaustein-Erweiterungen lösten alle 12 Ausnahmefälle durch wiederverwendbare Fähigkeiten statt
einer zweiten, versteckten Ausnahmeliste; eine Zweck-Enum-Umstellung löste `Card.padding`; der Guard
selbst verlor die Ausnahmeliste vollständig; eine abschließende Nachweis-Runde bestätigte alles
gegen den tatsächlichen Code- und Build-Zustand.

| # | Erweiterung/Befund | Status | Evidence |
|---|---|--------|----------|
| 1 | A -- `Stack` Rhythmus-Modus (Array-`gap`, nicht-einheitlicher Kind-Abstand) + neuer Zweck `'captionLines'` | ✓ VERIFIED | `Stack.tsx`: `gap?: StackGapPurpose \| StackGapPurpose[]`, Array-Modus rendert pro Lücke einen reinen `marginTop`-Wrapper, Fail-fast bei Längen-Mismatch. Verdrahtet in `.infoCardBody` (6 Fälle, Plan 192-24) und `AnimeEdgeNavigation.previewType` (Plan 192-26). Plan 192-21, Commits `a0f75e762`/`a0ccd22ab`/`10dbddc2b`/`b5afde099`. |
| 2 | B -- `Cluster` Haltepunkt-Umkehr (`collapseBelow`/`gapCollapsed`, Zeile↔Spalte) | ✓ VERIFIED | `Cluster.tsx`: `collapseBelow?: 'md'` + `gapCollapsed?: ClusterGapPurpose`, Zwei-Ebenen-Container-Query-Wrapper (dasselbe Muster wie `SplitLayout`). Verdrahtet in `AnimeDetailHero.titleRow` (Plan 192-24) und `ReleasePreviewRow.row` (Plan 192-26). Plan 192-22 Task 1, Commits `204ca319a`/`d4374b746`. |
| 3 | C -- `Cluster` Schwebe-Overlay-Modus (`float="controlBand"`, bedingte Flex-/Absolute-Existenz je Haltepunkt) | ✓ VERIFIED | `Cluster.tsx`: `float?: 'controlBand'`, oberhalb des Haltepunkts `position:absolute` auf dem WURZELELEMENT (nicht nur dem inneren Container-Query-Kind -- ein in Plan 192-25 bei der ersten echten Verdrahtung gefundener und behobener Architekturfehler, siehe `192-25-SUMMARY.md` Deviation 1), `pointer-events` korrekt gescopt. Verdrahtet in `AnimeDetailHero.edgeNavigationOverlay`, löst den vormaligen lokalen `<div>` komplett ab. Plan 192-22 Task 2 + Plan 192-25, Commits `5cc4f814c`/`9724af725`/`abdc87796`. |
| 4 | D -- `Card` Zweck-benannte Polsterung (`content`/`nestedBlock`/`dividedSection`/`none`) + Rand-bis-Rand-Modus (`bleedBelowMd`) | ✓ VERIFIED | `Card.tsx`: `CardPaddingPurpose`-Enum ersetzt die rohen `'1'..'9'`-Stufen vollständig (löst Review-Befund 2), alle 3 echten Aufrufstellen migriert (`grep -rn 'padding="[1-9]"' frontend/src --include=*.tsx` liefert repo-weit nichts mehr). Neues `dividedSection`-Rezept verdrahtet in `EpisodeGlassCard.versionList` (Plan 192-26), `bleedBelowMd` verdrahtet in `AnimeDetailHero.posterMetaCard` (Plan 192-25). Plan 192-23, Commits `2c945887c`/`7a1bfa5b2`/`56c83fa33`/`0d1648142`. |
| 5 | Guard-Verschärfung -- `compositeLayoutPurity.guard.test.ts` verliert `DOCUMENTED_LAYOUT_EXCEPTIONS`/`LayoutException`/`isAllowed` sowie den zugehörigen Existenz-Selbsttest vollständig | ✓ VERIFIED | `grep -c "DOCUMENTED_LAYOUT_EXCEPTIONS" frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts` → `0` (checkable, nicht nur behauptet). Hauptprüfung läuft unbedingt (`checkDeclarations` ruft kein `isAllowed` mehr auf) und besteht mit literalem `toEqual([])` über alle vier Pilot-Dateien. Regressions-Canary (bindend laut `192-CONTEXT.md`-Interface-Vorgabe): je ein verbotenes Muster (`display:flex`+`padding:4px`) einzeln in jede der vier Dateien eingefügt, Haupttest schlägt JEDES Mal fehl, danach `git checkout -- <datei>` zurückgesetzt -- für `AnimeDetailHero`/`ReleasePreviewRow`/`EpisodeGlassCard`/`AnimeEdgeNavigation` je einzeln bestätigt. Plan 192-27 Task 1, Commit `bac3f0efd`. |
| 6 | Review-Befund 2 -- `Card.padding` nimmt keine rohen Größenstufen mehr | ✓ VERIFIED | Durch Zeile 4 (D) vollständig gelöst -- `gapPurposeNaming.guard.test.ts` erweitert um `padding="[1-9]"` als verbotenes Muster, verhindert künftigen Rückfall. Plan 192-23. |

**Score Runde 4:** 6/6 zusätzliche Truths verifiziert (20/20 kumulativ mit Runde 2+3).

**Zusätzlicher, bei der Abschluss-Verifikation gefundener und behobener Fehler (nicht Teil der
beiden Review-Befunde, aber im selben Plan behoben):** `Stack.stories.tsx`s zwei Array-Modus-
Demonstrationen ("Anime-Kopf-Rhythmus", "Rhythmus-Modus") übergaben ihre mehreren `<Box>`-Kinder
als EIN `<>...</>`-Fragment statt als echtes Array -- `Stack`s `Children.toArray(children)` zählt
ein Fragment-Element als EIN Kind (nicht als seine enthaltenen Elemente), wodurch die
Rhythmus-Array-Längenprüfung fälschlich "1 Kind" statt der tatsächlichen 7/3 sah und beim Rendern
warf. Gefunden durch `test-storybook` (vorher nie für diese beiden, in Plan 192-21/192-24 neu
angelegten Stories gelaufen -- jene Pläne verifizierten sich selbst nur über eigene
Playwright-Skripte/`vitest`, nicht über den Storybook-Test-Runner). Produktionscode (`Stack.tsx`,
`AnimeDetailHero.tsx`s `infoCardChildren`) war NICHT betroffen (nutzte bereits ein echtes
`ReactNode[]`-Array). Fix: beide Stories auf ein echtes, geschlüsseltes Array umgestellt. Plan
192-27, Commit `83165c6e4`. Nach dem Fix: `test-storybook` 72/72 Suiten / 370/370 Tests grün.

### Methodik-Hinweis (Runde 4): Baseline-Wahl und Bildqualität der disponiblen Snapshots

Für Runde 4 wurde als präziser Vor-Runde-Vergleich der Commit unmittelbar vor Plan 192-21
(`9d6bdce73`) verwendet (isoliert exakt, was Runde 4 verändert hat), zusätzlich zum
phasenweiten `main`-vs-Branch-Paar (`main` = `907fa79f1`, zum Zeitpunkt dieser Verifikation 96+
Commits hinter dem Branch, größtenteils unabhängig von dieser Phase). Beide disponiblen
Snapshot-Container (dev-mode, `npm run dev -- --webpack`, auf demselben Docker-Netzwerk wie der
laufende Backend-Container) zeigten für alle drei geprüften Animes (`/anime/6`, `/13`, `/2`) an
beiden Haltepunkten (1440×900/390×844) STRUKTURELL identischen Seitenaufbau zur Branch-Instanz --
die Pre-Runde-4-Baseline sogar mit exakt identischen Bild-Gesamthöhen (z. B. `anime/6` Desktop:
1667px auf beiden Seiten, `anime/13` Desktop: 1932px auf beiden Seiten, `anime/2` Desktop: 2034px
auf beiden Seiten), was Zero-Höhen-Drift durch diese Runde bestätigt. Cover-/Backdrop-Bilder luden
in beiden disponiblen Snapshot-Containern nicht (identisches Artefakt der Wegwerf-Infrastruktur,
nicht des Codes -- die laufende Branch-Instanz zeigt reale Jellyfin-Cover korrekt), daher wie bereits
in Runde 3 etabliert strukturell statt pixelgenau verglichen. Zusätzlich wurde ein
Storybook-vs.-Live-Seite-Bildpaar für alle fünf Pilot-Komposit-Blöcke (Anime-Kopf Desktop+Mobil,
Episoden-Bereich, Release-Versionszeile, Randnavigation) erzeugt und mit der laufenden Branch-Seite
strukturell abgeglichen -- keine undeklarierte Abweichung gefunden.

Zusätzlich: die bestätigte visuelle Regression (nicht an eine einzelne Befund-ID gebunden, Teil des
Runde-3-Nachtrags) wurde von Plan 192-12 behoben und von Plan 192-20 mit frischer Messung
gegengeprüft (Truth #7).

### Anti-Patterns Found

Keine blockierenden, in keiner Runde. Runde 3 fand einen ESLint-Fehler (`react/no-unescaped-entities`
in `Card.stories.tsx`, aus Plan 192-11), sofort behoben (Commit `25b58074b`). Runde 4 fand einen
echten Laufzeitfehler in zwei Storybook-Stories (`Stack.stories.tsx`s Array-Modus-Demonstrationen
übergaben ihre Kinder als Fragment statt als Array, siehe Runde-4-Tabelle oben), sofort behoben
(Commit `83165c6e4`) -- Produktionscode war in beiden Fällen nicht betroffen. Kein offener Befund.

### Human Verification Required

None at the code level. Alle Runde-2/3/4-Befunde sind durch statische Code-Inspektion, automatisierte
Testausführung, Guard-Tests (inkl. des seit Runde 4 ausnahmelosen `compositeLayoutPurity`-Guards samt
Regressions-Canary-Beleg), einen deterministischen Storybook-Bildvergleich mit harten DOM-Rect-/
Farbmessungen sowie disponible Vorher/Nachher-Playwright-Vergleiche belegt. Die abschließende
Live-Browser-Freigabe (Produktionsdaten, echte Jellyfin-Cover, echte Backdrop-Rotation) erfolgt gemäß
der Projektkonvention für `ki-run`-Aufträge am Ende des gesamten Auftrags durch den Menschen
(`ki-run uat`), nicht als Teil dieser Code-Verifikation.

### Git/Docker/Worktree Cleanliness

- `git status --short` — clean (final nach Plan 192-27 erneut geprüft).
- `git worktree list` — nur der Haupt-Checkout (`/home/d1sk/team4s`), keine verbliebenen
  disponiblen Snapshot-Worktrees (Runde-4-Worktrees unter `/tmp/t4s-snapshots/*` via
  `git worktree remove --force` entfernt).
- `docker ps -a` / `docker images` — keine `192-20`/`192-27`/`snapshot`-benannten disponiblen
  Container/Images mehr; alle regulären Projekt-/Dev-Stack-Container unverändert laufend
  (`team4sv30-frontend` für diese Verifikation neu gebaut, um alle Runde-4-Pläne zu reflektieren).
- Keine verwaisten `python3 -m http.server`-Prozesse oder temporären Skripte/Screenshots unter
  `frontend/`/`/tmp` (gezielt per `ps aux`/`find` geprüft).

## Gaps Summary

None. Alle 6 Runde-3-Befunde (A-D, 27, 28) sowie alle 6 Runde-4-Erweiterungen/-Befunde (A-D,
Guard-Verschärfung, Review-Befund 2) sind gegen den tatsächlichen Code-/Build-/Testzustand
verifiziert, nicht nur gegen SUMMARY.md-Behauptungen: der Composite-Layout-Guard wurde in Plan
192-15 gegen die tatsächliche Dateilage gegründet (fand dabei 2 zusätzliche, vorher unentdeckte
Lücken) und in Plan 192-27 um die Ausnahmeliste selbst erleichtert, mit einem checkbaren
grep-Beleg UND einem Regressions-Canary-Beleg (nicht nur einer Behauptung); der volle
Regressionslauf in Plan 192-20 fand einen zusätzlichen echten Lint-Fehler, der in Plan 192-27 fand
einen echten Storybook-Laufzeitfehler; die Sichtregression wurde mit expliziten Vorher/Nachher-
Zahlenwerten belegt.

---

*Verified: 2026-11-05*
*Verifier: Claude (Executor, Plan 192-27 -- Runde-4-Abschluss-Nachweis)*
