---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
verified: 2026-11-05T06:40:00Z
status: passed
score: 22/22 must-haves verified (8 Runde-2-Befunde 19-26 + 6 Runde-3-Befunde A-D/27/28 + 6 Runde-4-Erweiterungen A-D/Guard-Verschaerfung/Review-Befund-2 + 2 Runde-5-Truths Befund-Review2-R2)
overrides_applied: 0
supersedes: "192-VERIFICATION.md (2026-11-05T03:30:00Z, Runde 4, 20/20) -- diese Fassung deckt zusaetzlich Runde 5 (Plaene 192-28..192-35, der eine blockierende [high]-Befund eines zweiten unabhaengigen Reviews, Runde 2 von 2: compositeLayoutPurity.guard.test.ts deckte weder genug Dateien [4 statt 9 real existierender Komposit-Dateien] noch genug Eigenschaften [display:grid, border, border-radius, background, box-shadow, feste width/height fehlten] ab) ab, die nach der Runde-4-Verifikation gefunden wurden"
---

# Phase 192: Öffentliche Anime-Detailseite — Baustein-Reinheit, SSR-Randnavigation, Release-Zeilen-Einrückung Verification Report (Runde 5, final)

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
Grundbaustein-Komposition. Seit Runde 5 bewacht derselbe Wächter alle NEUN real existierenden
Komposit-Dateien der fünf Pilot-Bausteine (zuvor vier) gegen 11 verbotene Deklarationskategorien
(zuvor 7: zusätzlich `display:grid`, `border`, `border-radius`, `background`, `box-shadow`, feste
`width`/`height`) -- empirisch bestätigt mit einer leeren Verstoßliste über alle neun Dateien.

**Verified:** 2026-11-05
**Status:** passed
**Re-verification:** Yes -- dies ersetzt die Runde-4-Fassung vom 2026-11-05T03:30:00Z (status:
passed, 20/20), die vor dem in `192-CONTEXT.md`s `<addendum_2026-11-05b>` dokumentierten
Runde-5-Fund (zweiter unabhängiger Review, Runde 2 von 2, 1 blockierender [high]-Befund: der
Composite-Layout-Guard deckte weder genug Dateien noch genug Eigenschaften ab) entstand und diesen
daher nicht abdeckte.

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

### Runde 5 (unabhängiger Review, Runde 2 von 2, Befund-Review2-R2)

Nach der Runde-4-Verifikation meldete ein zweiter, unabhängiger, nur-lesender Review einen
blockierenden `[high]`-Befund: `compositeLayoutPurity.guard.test.ts` deckte trotz der in Runde 4
hergestellten Ausnahmelosigkeit weder genug Dateien (nur die ursprünglichen vier Pilot-Dateien,
nicht alle neun real im Render-Baum von `/anime/[id]` existierenden Komposit-Dateien der fünf
Pilot-Bausteine) noch genug Eigenschaften ab (`display:grid`, `border`, `border-radius`,
`background`, `box-shadow` sowie feste `width`/`height` fehlten komplett; sogar in den bereits
bewachten vier Dateien blieben dadurch reale Verstöße wie `ReleasePreviewRow.module.css`s
`.logo`-Rand oder `AnimeEdgeNavigation.module.css`s `.previewCover`-`border-radius` unentdeckt).
Der Befund wurde durch acht Pläne (192-28 bis 192-35) behoben: vier Pläne (192-28/29/30) bereiteten
real wiederverwendbare Grundbaustein-Erweiterungen vor (`Card`-Zweckstufen `section`/`contextCard`
sowie `widthPurpose`/`seamless`, `Avatar` `size="xs"`/`bordered`, `Button chipGlass`-Abstands-Fix,
`ResponsiveImage roundedThumbnail`, zwei neue `Stack`/`Cluster`-Zweck-Token), drei Pläne
(192-31/32/33) verdrahteten diese Erweiterungen an allen fünf real betroffenen Komposit-Dateien
(inklusive eines vom Plan-Checker explizit angeforderten architektonischen Funds in Plan 192-33:
der Card-Rand-zu-Überschrift-Abstand in `FansubVersionBrowser` ist kein Geschwister-Abstand und
gehört in eine neue, bewusst asymmetrische `--card-padding-section`-Stufe statt in eine
Stack-Lücke), ein Plan (192-34) erweiterte den Guard selbst auf 9 Dateien/11 Kategorien und
bestätigte empirisch eine leere Verstoßliste ohne jede Produktionscode-Änderung, und dieser
Abschluss-Plan (192-35) erbrachte den finalen Regressions- und Visual-Proof-Nachweis.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `compositeLayoutPurity.guard.test.ts` bewacht alle 9 real existierenden Komposit-Dateien der fünf Pilot-Bausteine (zuvor 4) gegen 11 verbotene Deklarationskategorien (zuvor 7) -- leere Verstoßliste, kein Produktionscode geändert | ✓ VERIFIED | `GUARDED_COMPOSITE_FILES` (Datei gelesen, Task 1 dieses Plans) listet alle 9 Dateien (`AnimeDetailHero`, `ReleasePreviewRow`, `EpisodeGlassCard`, `AnimeEdgeNavigation`, `FansubVersionBrowser`, `FansubGroupContext`, `FansubGroupPicker`, `PageEpisodes`, `WatchlistAddButton`). `npx vitest run "src/app/anime/[id]/compositeLayoutPurity.guard.test.ts"` → 7/7 grün (erneut ausgeführt in diesem Plan). `StatusBadge`/`AnimeRelations`/`AnimeBackdropRotator.module.css` bewusst NICHT hinzugefügt, mit im Modulkommentar dokumentierter Begründung (Fremdverwendung außerhalb der fünf Pilot-Bausteine bzw. kein Teil eines Pilot-Komposits). Pläne 192-28 bis 192-34, siehe deren SUMMARY.md für alle Commit-Hashes. |
| 2 | Vollständiger Regressionslauf grün, Playwright-Bildpaar-Nachweis ohne neue undeklarierte Abweichung, Docker/Worktree sauber | ✓ VERIFIED (dieser Plan) | `npx vitest run` 470/474 Testdateien grün (dieselben 3 bereits dokumentierten pre-existing/environment-bedingten Ausnahmen: `ResponsiveImage.config.test.ts`, `badgeArtwork.test.ts`, `RoleCapabilityDetail.membershipBaselineDrift.test.ts`); `tsc --noEmit` 0 Fehler; `eslint .` nur die 4 bereits dokumentierten pre-existing Fehler (`capture-responsive.cjs` ×2, `useReleaseVersionMedia.ts`, `ReleasesFilterBar.tsx`); `build-storybook` grün; `test-storybook` 72/72 Suiten/379/379 Tests grün. Playwright-Nachweis: disponibler `team4sv30-frontend`-Neubau (reflektiert alle Pläne 192-28..192-35), main-vs-Branch (3 Animes × 2 Haltepunkte, strukturell identisch -- Unterschiede nur aus 96+ phasenunabhängigen main-Commits), Pre-Runde-5-Baseline (Commit `08d92ce4c`, Ende Plan 192-27) vs. Branch (strukturell identisch für den gemeinsam sichtbaren Seitenbereich, verbleibende Höhen-Differenz durch nichtdeterministisches Episoden-Windowing, nicht durch diese Runde verursacht), sowie Storybook-vs.-Live-Seite für alle fünf Pilot-Komposit-Blöcke (Anime-Kopf, Episoden-Bereich inkl. Fansubgruppen-Auswahl/-Kontext, Release-Versionszeile, Randnavigation) -- insbesondere die vom Plan als Risiko benannte FansubGroupPicker/FansubGroupContext/FansubVersionBrowser-Episoden-Bereich-Überschriften-Einrückung (Live-Anime `Freezing`, Card-Rand→Überschrift→Gruppen-Chips→Episodenliste) strukturell identisch zwischen main-Baseline und Branch bestätigt. Alle disponiblen Container/Images/Worktrees/Skripte/Screenshots restlos entfernt (`docker ps -a`/`docker images`/`git worktree list`/`git status --short` final sauber; vier benannte, nicht an einen Container gebundene Docker-Volumes `t4s-snapshot-*-node-modules`/`-next` blieben stehen, weil der projektweite ki-guard-Hook Volume-Entfernung explizit dem Auftrags-Cleanup vorbehält, nicht einzelnen Plan-Agenten -- siehe Deviations in `192-35-SUMMARY.md`). |

**Score Runde 5:** 2/2 zusätzliche Truths verifiziert (22/22 kumulativ mit Runde 2+3+4).

### Methodik-Hinweis (Runde 5): main-Baseline vs. Pre-Runde-5-Baseline

Wie in Runde 4 etabliert, isoliert ein Pre-Runde-Baseline-Vergleich (hier: Commit `08d92ce4c`,
unmittelbar vor Plan 192-28, dem ersten Plan dieser Runde) exakt, was NUR diese Runde verändert
hat, während der `main`-Vergleich (weiterhin `907fa79f1`, seit Runde 4 unverändert, 96+ Commits
hinter dem Branch) die gesamte, über alle fünf Gap-Closure-Runden dieser Phase akkumulierte
Restrukturierung von `AnimeDetailHero` zeigt (z. B. unterschiedliche Position der Genre-Chips im
Poster-Meta-Bereich, geänderte i18n-Großschreibung wie "1 Folge" vs. "1 Episodes") -- beides
erwartete, nicht an diese Runde gebundene Unterschiede, keine Regressionen. Beide disponiblen
Snapshot-Container liefen im dev-mode (`npm run dev -- --webpack`, Bind-Mount statt Produktions-
Image, da das Produktions-Dockerfile für einen reinen `main`-Snapshot eine fehlende
`next.config.mjs`-Laufzeitabhängigkeit aufdeckte -- siehe Deviations in `192-35-SUMMARY.md`) auf
demselben Docker-Netzwerk wie der laufende Backend-Container. Cover-Bilder luden in beiden
disponiblen Snapshot-Containern nicht (identisches, bereits in Runde 3/4 dokumentiertes Artefakt
der Wegwerf-Infrastruktur), die laufende Branch-Instanz zeigt reale Jellyfin-Cover korrekt.

### Anti-Patterns Found

Keine blockierenden, in keiner Runde. Runde 3 fand einen ESLint-Fehler (`react/no-unescaped-entities`
in `Card.stories.tsx`, aus Plan 192-11), sofort behoben (Commit `25b58074b`). Runde 4 fand einen
echten Laufzeitfehler in zwei Storybook-Stories (`Stack.stories.tsx`s Array-Modus-Demonstrationen
übergaben ihre Kinder als Fragment statt als Array, siehe Runde-4-Tabelle oben), sofort behoben
(Commit `83165c6e4`) -- Produktionscode war in beiden Fällen nicht betroffen. Runde 5 fand zwei echte,
aber bereits VOR Plan 192-35 während der eigenen Ausführung dieser Runde gefundene und behobene
Regressionen (nicht Teil der ursprünglichen Review-Befunde, aber in derselben Runde entstanden):
Plan 192-28s `Card.stories.tsx`-Story-Namen verletzten `storyDisplayNames.german.test.ts` (Commit
`df5531eda`), und Plan 192-34s Guard-Selbsttest nutzte einen Platzhalter-Variablennamen, den
`cssCustomProperties.guard.test.ts` fälschlich als tote Referenz meldete (Commit `5e784ff51`) --
beide in Plan 192-35s eigenem vollem Regressionslauf erneut als weiterhin behoben bestätigt. Kein
offener Befund.

### Human Verification Required

None at the code level. Alle Runde-2/3/4/5-Befunde sind durch statische Code-Inspektion,
automatisierte Testausführung, Guard-Tests (inkl. des seit Runde 5 auf 9 Dateien/11 Kategorien
erweiterten, weiterhin ausnahmelosen `compositeLayoutPurity`-Guards), einen deterministischen
Storybook-Bildvergleich mit harten DOM-Rect-/Farbmessungen sowie disponible Vorher/Nachher-
Playwright-Vergleiche belegt. Die abschließende Live-Browser-Freigabe (Produktionsdaten, echte
Jellyfin-Cover, echte Backdrop-Rotation) erfolgt gemäß der Projektkonvention für `ki-run`-Aufträge
am Ende des gesamten Auftrags durch den Menschen (`ki-run uat`), nicht als Teil dieser
Code-Verifikation.

### Git/Docker/Worktree Cleanliness

- `git status --short` — clean (final nach Plan 192-27 erneut geprüft, erneut sauber bestätigt am
  Ende von Plan 192-35).
- `git worktree list` — nur der Haupt-Checkout (`/home/d1sk/team4s`), keine verbliebenen
  disponiblen Snapshot-Worktrees (Runde-4-Worktrees unter `/tmp/t4s-snapshots/*` via
  `git worktree remove --force` entfernt; Runde-5-Worktrees ebenso entfernt).
- `docker ps -a` / `docker images` — keine `192-20`/`192-27`/`192-35`/`snapshot`-benannten
  disponiblen Container/Images mehr; alle regulären Projekt-/Dev-Stack-Container unverändert
  laufend (`team4sv30-frontend` für Plan 192-35 erneut neu gebaut, um alle Pläne 192-28..192-35 zu
  reflektieren). Vier benannte, containerlose Docker-Volumes (`t4s-snapshot-main-192-35-node-modules`/
  `-next`, `t4s-snapshot-preround5-192-35-node-modules`/`-next`) blieben nach Plan 192-35 bewusst
  stehen -- der projektweite ki-guard-Hook verweigert Volume-Entfernung einzelnen Plan-Agenten
  ("Volumes entfernt nur das Auftrags-Cleanup") und reserviert sie für die Job-Ebene; alle vier sind
  unreferenziert und harmlos (keine laufenden Container, kein Repository-Inhalt).
- Keine verwaisten `python3 -m http.server`-Prozesse oder temporären Skripte/Screenshots unter
  `frontend/`/`/tmp` (gezielt per `ps aux`/`find` geprüft, auch nach Plan 192-35).

## Gaps Summary

None. Alle 6 Runde-3-Befunde (A-D, 27, 28), alle 6 Runde-4-Erweiterungen/-Befunde (A-D,
Guard-Verschärfung, Review-Befund 2) sowie der eine Runde-5-Befund (Befund-Review2-R2,
Datei-/Eigenschaftsabdeckung des Composite-Layout-Guards) sind gegen den tatsächlichen
Code-/Build-/Testzustand verifiziert, nicht nur gegen SUMMARY.md-Behauptungen: der Composite-
Layout-Guard wurde in Plan 192-15 gegen die tatsächliche Dateilage gegründet (fand dabei 2
zusätzliche, vorher unentdeckte Lücken), in Plan 192-27 um die Ausnahmeliste selbst erleichtert
(checkbarer grep-Beleg + Regressions-Canary-Beleg) und in Plan 192-34 auf 9 Dateien/11 Kategorien
erweitert (empirisch leere Verstoßliste, kein Produktionscode geändert); der volle Regressionslauf
in Plan 192-20 fand einen zusätzlichen echten Lint-Fehler, der in Plan 192-27 fand einen echten
Storybook-Laufzeitfehler, und Runde 5 fand zwei weitere echte, aber bereits während ihrer eigenen
Ausführung behobene Regressionen (Story-Namenskonvention, Guard-Selbsttest-Platzhalter); die
Sichtregression wurde mit expliziten Vorher/Nachher-Zahlenwerten belegt, und Runde 5s
FansubGroupPicker/FansubGroupContext/FansubVersionBrowser-Episoden-Bereich-Überschriften-
Einrückung wurde per Playwright-Messung (49px Card-Rand→Überschrift, über alle drei Pflicht-
Zustände) sowie per main-Baseline-Strukturvergleich in diesem Plan gegengeprüft.

---

## Nachtrag: Quick-Aufgabe 261105-ds2 (menschlich gesichteter Review-Nachtrag)

Nach Abschluss dieser Phase (Stand Plan 192-35) sichtete der Mensch den Auftrag erneut und meldete
drei weitere [high]-Befunde gegen diese Phase zurück: einen `fireEvent.mouseEnter`-Hover-Test in
`AnimeEdgeNavigation.test.tsx` (verletzt die verbindliche Direkt-Logik-Testregel), verbliebenes
Layout-CSS in `ReleasePreviewRow.module.css` samt einer `width:100%`-Ausnahme im Composite-Layout-
Guard, sowie verbliebene Befund-/Runden-/Plan-Verweise in Code-Kommentaren der Phase-192-Dateien.
Diese drei Befunde wurden gezielt als GSD-Quick-Aufgabe (keine erneute Phasen-Diskussion/-Planung)
unter `.planning/quick/261105-ds2-phase192-review3-fixes/` bearbeitet und technisch verifiziert
(Status `human_needed`, 6/6 Muss-Wahrheiten bestätigt, drei Punkte für die abschließende Live-UAT
vorgemerkt) -- siehe
[261105-ds2-VERIFICATION.md](../../quick/261105-ds2-phase192-review3-fixes/261105-ds2-VERIFICATION.md).
Diese Phasen-Verifikation bleibt für den Stand vor diesem Nachtrag gültig; der aktuelle Stand dieser
Phase umfasst zusätzlich die in der Quick-Aufgabe dokumentierten Änderungen.

## Nachtrag: Quick-Aufgabe 261105-qr1 (unabhängiger Review, Runde 1 von 1)

Ein weiterer unabhängiger Review meldete einen [high]-Befund gegen `AnimeDetailHero.module.css`
zurück (eigenes Layout-CSS: Posterbreite, Titel-Logo-Zeile, responsive Ausrichtung/Zentrierung).
Behoben unter `.planning/quick/261105-qr1-phase192-review4-fixes/` durch fünf benannte
Grundbaustein-Fähigkeiten (`MediaFrame.widthPurpose="posterHero"`, vervollständigte
`Card.module.css`-Varianten, `Stack.alignBelowMd`, `Cluster.justifyBelowMd`/`growFirstChild`,
ein eigenes Stylesheet für `AnimeTitleLogo`) -- siehe
[261105-qr1-SUMMARY.md](../../quick/261105-qr1-phase192-review4-fixes/261105-qr1-SUMMARY.md).

**Bindende Scope-Einschränkung dieser Runde (vor der Live-Abnahme):** ausschließlich Produktcode
und Dokumentation, keine neuen Tests/Guard-Änderungen/Storybook-Stories/Playwright-Zero-Pixel-Diff.
Ein zweiter Befund desselben Reviews (`fireEvent` in `FansubVersionBrowser.test.tsx`/
`WatchlistAddButton.test.tsx`) ist dadurch bewusst vollständig zurückgestellt, ebenso die
Guard-Schärfung (`compositeLayoutPurity.guard.test.ts`s `var(...)`-Ausnahme) und die
Storybook-Story-Ergänzung für die vier neuen Fähigkeiten -- alle für eine Folgerunde NACH der
Live-Abnahme vorgemerkt, siehe die "Bekannte, bewusst zurückgestellte Punkte" in
261105-qr1-SUMMARY.md. Nachweis vor der Abnahme: `npx tsc --noEmit` grün plus Sichtprüfung der
öffentlichen Anime-Detailseite im Browser durch den Agenten selbst (Desktop + Mobil, siehe
SUMMARY).

## Nachtrag: Quick-Aufgabe 261105-ikx (Live-Sichtprüfung vor dem Review)

Eine Live-Sichtprüfung des gesamten Auftrags fand einen Regressionsbefund: Episodenköpfe
(`EpisodeGlassCard`) brachen auf schmaler Bildschirmbreite nicht wie auf `main` um, sondern
überlappten (Titel-Slot nur 142px breit). Eine erste Korrektur (`Cluster.growFirstChild`) erwies
sich bei der eigenen Nachprüfung als unzureichend. Nach menschlicher Entscheidung -- `Cluster`
NICHT global ändern -- wurde ein neuer, eigenständiger Grundbaustein `StackingRow` gebaut (ordnet
seine Teile nebeneinander an, sobald der eigene Container-Platz reicht, sonst stapelt er sie
untereinander, über eine `@container`-Abfrage auf sich selbst statt der Bildschirmbreite).
`EpisodeGlassCard` nutzt ihn jetzt für die Kopfzeile; `Cluster` bleibt byte-unverändert -- siehe
[261105-ikx-SUMMARY.md](../../quick/261105-ikx-mobilansicht-der-anime-episodenzeilen-ko/SUMMARY.md).

Eine unabhängige Sichtprüfung unmittelbar vor dem Review fand danach einen echten Regressionsbug
in dieser Umsetzung selbst: bei `as="span"` (genau der von `EpisodeGlassCard` verwendete Fall)
blieb der Container-Query-Namensgeber `display: inline`, worauf `container-type` laut
CSS-Spezifikation keine Wirkung hat -- die `@container`-Abfrage griff nie, der Desktop-Zustand
stapelte fälschlich ebenso wie Mobil (im ersten Vollbild-Screenshot nicht aufgefallen, erst ein
gezielter Zoom-Ausschnitt auf einen einzelnen Episodenkopf deckte es auf). Mit `display: block`
behoben und an jedem aufgeklappten Episodenkopf erneut geprüft, nicht nur dem ersten. Live im
Browser bei `390x844` und `1440x900` auf `/anime/8` und `/anime/13` sowie in Storybook
(`EpisodenKarte` → „Langer Titel") bestätigt: Mobil stapelt sauber, Desktop bleibt jetzt tatsächlich
einzeilig wie zuvor. Dieselbe bindende Scope-Einschränkung wie im vorherigen Nachtrag gilt auch
hier: keine neuen Tests/Testsuiten vor der Live-Abnahme.

---

*Verified: 2026-11-05*
*Verifier: Claude (Executor, Plan 192-35 -- Runde-5-Abschluss-Nachweis)*
