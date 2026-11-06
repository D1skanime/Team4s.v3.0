---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 02
subsystem: ui
tags: [react, nextjs, css-modules, container-queries, design-system, storybook]

# Dependency graph
requires:
  - phase: 192-01
    provides: "Stack/Cluster/SplitLayout Layout-Grundbausteine"
provides:
  - "AnimeDetailHero besitzt Card(variant=publicHero)+SplitLayout+edgeNavigation-Slot vollstaendig selbst (Befund 21)"
  - "AnimeDetailHero.module.css als alleinige Stilquelle des Anime-Kopf-Bausteins (Befund 22 fuer diesen Baustein)"
  - "AnimeDetailView.tsx ordnet den Anime-Kopf nur noch an, kennt kein inneres Raster/Optik mehr"
affects: [192-03, 192-04, 192-05, 192-06, 192-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SplitLayout align=\"stretch\" explizit gesetzt, um das bisherige CSS-Grid-Default-Stretching (ungleich hohe Poster-/Info-Spalten strecken sich auf dieselbe Hoehe) zu reproduzieren -- SplitLayouts eigener Standard (\"start\") haette das ohne diese explizite Angabe stillschweigend veraendert"
    - "edgeNavigation als optionaler ReactNode-Slot-Prop (nicht children), vom Baustein selbst in .edgeNavigationOverlay positioniert -- der Aufrufer liefert nur den Inhalt, nicht die Positionierungs-CSS-Klasse"
    - "Ein einziger zusammengefuehrter @media(max-width:767px)-Block statt zwei getrennter (einer je ehemaliger Quelldatei), damit CSS-Lesetests per indexOf() eindeutig bleiben"

key-files:
  created:
    - frontend/src/app/anime/[id]/AnimeDetailHero.module.css
  modified:
    - frontend/src/app/anime/[id]/AnimeDetailHero.tsx
    - frontend/src/app/anime/[id]/AnimeDetailHero.stories.tsx
    - frontend/src/app/anime/[id]/AnimeDetailView.tsx
    - frontend/src/app/anime/[id]/AnimeDetailView.styles.ts
    - frontend/src/app/anime/[id]/page.module.css
    - frontend/src/app/anime/[id]/detailStyleSystem.guard.test.ts
    - frontend/src/app/anime/[id]/page.test.tsx
    - frontend/src/app/anime/[id]/page.performance.test.ts
  deleted:
    - frontend/src/app/anime/[id]/page.poster.module.css
    - frontend/src/app/anime/[id]/page.infoCard.module.css

key-decisions:
  - "AnimeDetailView.tsx und page.module.css wurden entgegen der PLAN.md-Frontmatter-files_modified-Liste (die beide Dateien nicht auffuehrte) ebenfalls geaendert -- ohne diese Ergaenzung haette page.module.css weiterhin denselben toten --card-public-hero-columns-Hook gesetzt (verletzt Task 1s eigenes must_haves-Kriterium \"kein Seiten-Level-CSS setzt diesen Hook mehr\") und AnimeDetailView.tsx haette eine zweite, verschachtelte Card(publicHero) um den jetzt vollstaendigen AnimeDetailHero gelegt (Pitfall 3) plus einen stillschweigend leerlaufenden edgeNavigationOverlay-Hook (die Klasse existiert nach dem Merge-Umbau nicht mehr im gemergten styles-Objekt der Seite). 192-CONTEXT.md verlangt bindend, dass die Seite nur noch <AnimeDetailHero .../> mit Randnavigation als Slot-Prop einsetzt -- diese Ergaenzung setzt exakt diese Vorgabe um."
  - "edgeNavigation wird von AnimeDetailHero selbst in einen <div className={styles.edgeNavigationOverlay}> gewrappt statt vom Aufrufer bereits fertig positioniert uebergeben -- AnimeDetailView.tsx kennt das Positionierungs-CSS des Bausteins dadurch gar nicht mehr (konsequente Fortsetzung von Befund 22)."
  - "Zwei getrennte @media(max-width:767px)-Bloecke aus den beiden Alt-Dateien wurden zu einem einzigen zusammengefuehrt (statt zwei Bloecke in Dateireihenfolge zu belassen) -- sonst findet page.test.tsx's indexOf('@media (max-width: 767px)') nur den ERSTEN Block und zwei bestehende CSS-Lesetests schlagen fehl, da .divider/.edgeNavigationOverlay im zweiten Block gestanden haetten."
  - "Redundante gap-Deklarationen (gap: var(--space-2) auf .badges/.tagsList, gap: var(--space-5) auf .statsRow) wurden beim Stack/Cluster-Umbau vollstaendig entfernt statt nur display/flex-wrap -- Cluster setzt gap bereits ueber seine eigene private --cluster-gap-Variable; eine zusaetzliche, direkt deklarierte gap-Eigenschaft auf derselben Klasse wuerde exakt das nicht-deterministische Deklarationsreihenfolge-Wettrennen reproduzieren, das dieser ganze Phasen-Umbau beheben soll (siehe Card.module.css-Kommentar zum fruehren --card-public-hero-columns-Hook)."

patterns-established:
  - "Zusammengesetzte Bausteine (Zusammengesetzte Bausteine/*) koennen wie Grundbausteine einen optionalen Slot-Prop (edgeNavigation) anbieten, dessen Positionierungs-CSS komplett beim Baustein selbst bleibt -- der Aufrufer liefert ausschliesslich fachlichen Inhalt."

requirements-completed: [Befund-21, Befund-22]

# Metrics
duration: ~20min
completed: 2026-11-04
---

# Phase 192 Plan 02: Anime-Kopf-Baustein (Card+SplitLayout+Randnavigations-Slot) Summary

**AnimeDetailHero besitzt jetzt die äußere Glas-Karte, das Zwei-Spalten-Raster (SplitLayout) und den Randnavigations-Overlay-Slot vollständig selbst -- Storybook-Story und Live-Seite rendern erstmals dieselbe Baumstruktur, der alte `--card-public-hero-columns`-Override-Hook ist vollständig retiriert.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-11-04T10:42:35Z
- **Tasks:** 2 completed
- **Files modified:** 10 (1 neu, 8 geändert, 2 gelöscht)

## Accomplishments
- `AnimeDetailHero.tsx` rendert `<Card variant="publicHero"><SplitLayout firstColumn={Poster-Card} secondColumn={Info-Card} />{edgeNavigation}</Card>` statt eines Fragments aus zwei bloßen Cards -- `AnimeDetailHero.stories.tsx` zeigt dadurch erstmals exakt dieselbe Struktur wie die Live-Seite (zwei neue Beweis-Storys `Desktop1440`/`Mobile390`, dieselben Standard-Args)
- Poster-Spalte (`posterMeta`/`genresSection`/`genres`) und Info-Karte (`badges`/`tagsList`/`statsRow`) nutzen jetzt `Stack`/`Cluster` statt lokalem Flex-/Wrap-/Gap-CSS; `.infoCardBody` bleibt bewusst ein reiner `div` (nicht-einheitliche Abstände, dokumentiert per Code-Kommentar)
- `page.poster.module.css`/`page.infoCard.module.css` gelöscht, Inhalt vollständig in das neue, alleinige `AnimeDetailHero.module.css` überführt; `page.module.css`s toter `--card-public-hero-columns`-Setter vollständig entfernt (kein Seiten-Level-CSS setzt diesen Hook mehr)
- `AnimeDetailView.tsx` setzt nur noch `<AnimeDetailHero ... edgeNavigation={...} />` ein -- kein eigener Card-Wrapper, keine seiteneigene Overlay-Positionierung mehr
- Beide `elements()`-Testwalker (`page.test.tsx`, `page.performance.test.ts`) materialisieren `SplitLayout` jetzt direkt, da dessen `firstColumn`/`secondColumn` benannte Props statt `children` sind
- Alle bestehenden, nicht plan-bezogenen Guard-Tests (`catalogTaxonomy.test.ts`, `foreignVariableOverrides.regression.test.ts`, `processHistory.regression.test.ts`) bleiben unverändert grün

## Task Commits

Each task was committed atomically:

1. **Task 1: Consolidate page-owned CSS into AnimeDetailHero's own module + restructure around Card + SplitLayout** - `12be0c18d` (feat)
2. **Task 2: Restructure AnimeDetailHero.tsx around Card + SplitLayout + edgeNavigation slot; repair elements() tree-walkers; add proof stories** - `b606f6484` (feat)

**Plan metadata:** (siehe `docs(192-02)`-Commit nach diesem Dokument)

## Files Created/Modified
- `frontend/src/app/anime/[id]/AnimeDetailHero.module.css` (neu) - alleinige Stilquelle des Anime-Kopf-Bausteins; `.heroSplit` ersetzt den retirierten `--card-public-hero-columns`-Hook
- `frontend/src/app/anime/[id]/AnimeDetailHero.tsx` - besitzt Card(publicHero)+SplitLayout+edgeNavigation-Slot, Stack/Cluster statt lokalem Flex-CSS
- `frontend/src/app/anime/[id]/AnimeDetailHero.stories.tsx` - zwei neue Beweis-Storys (Desktop1440/Mobile390)
- `frontend/src/app/anime/[id]/AnimeDetailView.tsx` - ordnet den Baustein nur noch an, kein Card-Wrapper mehr (Ergänzung, siehe Decisions)
- `frontend/src/app/anime/[id]/AnimeDetailView.styles.ts` - mergt nur noch shellStyles+episodesStyles (zwei statt vier Dateien)
- `frontend/src/app/anime/[id]/page.module.css` - toter `--card-public-hero-columns`-Setter entfernt (Ergänzung, siehe Decisions)
- `frontend/src/app/anime/[id]/detailStyleSystem.guard.test.ts` - prüft nur noch die zwei verbleibenden Seiten-CSS-Dateien
- `frontend/src/app/anime/[id]/page.test.tsx` - SplitLayout im elements()-Walker materialisiert, zwei CSS-Lesetests zeigen auf AnimeDetailHero.module.css, Dead-Code-Test liest die aktuelle Dateiliste
- `frontend/src/app/anime/[id]/page.performance.test.ts` - SplitLayout im elements()-Walker materialisiert, `getAnimeList` defensiv mitgemockt (Pitfall 2)
- `frontend/src/app/anime/[id]/page.poster.module.css` (gelöscht)
- `frontend/src/app/anime/[id]/page.infoCard.module.css` (gelöscht)

## Decisions Made
Siehe `key-decisions` im Frontmatter (AnimeDetailView.tsx/page.module.css-Ergänzung, edgeNavigation-Slot-Design, zusammengeführter 767px-Media-Block, Entfernung redundanter gap-Deklarationen).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `AnimeDetailView.tsx` und `page.module.css` ergänzend geändert, obwohl nicht in PLAN.md's `files_modified`/`<files>` gelistet**
- **Found during:** Task 1/2 (beim Umsetzen der Task-1-Acceptance-Criteria und von 192-CONTEXT.md's bindender Vorgabe "Seite setzt nur noch `<AnimeDetailHero .../>` ein")
- **Issue:** Die PLAN.md-Frontmatter nennt `AnimeDetailView.tsx`/`page.module.css` nicht unter `files_modified`, und success_criteria behauptet sogar explizit "AnimeDetailView.tsx ist unchanged by this plan". Ließe man beide Dateien unverändert, würde `AnimeDetailHero`s neue, vollständige `Card(publicHero)+SplitLayout`-Struktur von `AnimeDetailView.tsx`s weiterhin vorhandenem äußeren `<Card variant="publicHero">`-Wrapper ein zweites Mal umschlossen (doppelt verschachtelte Hero-Karte, Pitfall 3 aus 192-RESEARCH.md), UND der seiteneigene `edgeNavigationOverlay`-Klassenname würde nach dem Styles-Merge-Umbau (Task 1) ins Leere zeigen (Klasse existiert nicht mehr im gemergten `styles`-Objekt der Seite) -- die Randnavigation hätte ihre Overlay-Positionierung verloren. Beides wäre ein sichtbarer Live-Seiten-Bruch gewesen.
- **Fix:** `AnimeDetailView.tsx` setzt jetzt nur noch `<AnimeDetailHero ... edgeNavigation={gridQuery ? <AnimeEdgeNavigation .../> : null} />` ein (kein Card-Wrapper, keine Overlay-Div mehr); `page.module.css`s `.heroContainer`-Regel (nur noch der tote `--card-public-hero-columns`-Setter) wurde entfernt.
- **Files modified:** `frontend/src/app/anime/[id]/AnimeDetailView.tsx`, `frontend/src/app/anime/[id]/page.module.css`
- **Verification:** `npx vitest run "src/app/anime/[id]"` (237/237 grün), `npx tsc --noEmit` (keine neuen Fehler), `npx eslint` (clean)
- **Committed in:** `12be0c18d` (page.module.css, Task 1), `b606f6484` (AnimeDetailView.tsx, Task 2)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical functionality, two files touched for one coherent fix)
**Impact on plan:** Notwendig, um den in CONTEXT.md bindend vorgegebenen Endzustand ("Seite setzt nur noch `<AnimeDetailHero .../>` ein") tatsächlich zu erreichen und einen sichtbaren Live-Regressionsfund (doppelte Hero-Karte, leerlaufende Randnavigations-Positionierung) zu vermeiden. Kein Scope-Creep über Befund 21/22 hinaus.

## Issues Encountered
- Das initial geschriebene `AnimeDetailHero.module.css` hatte zwei getrennte `@media (max-width: 767px)`-Blöcke (je einer aus den beiden ehemaligen Quelldateien) -- zwei bestehende CSS-Lesetests in `page.test.tsx` nutzen `indexOf('@media (max-width: 767px)')`, was nur den ERSTEN Block fand und beide Tests fehlschlagen ließ. Behoben durch Zusammenführung zu einem einzigen 767px-Block (siehe `key-decisions`).
- `processHistory.regression.test.ts` (verbietet "Befund NN"-Verweise in `*.stories.tsx`-Kommentaren projektweit) schlug zunächst auf einen eigenen Kommentar in `AnimeDetailHero.stories.tsx` fehl -- Kommentar fachlich umformuliert, ohne die Nummer zu nennen.
- `ResponsiveImage.config.test.ts` schlägt sowohl isoliert als auch in der Gesamtsuite fehl, unabhängig von jeder in diesem Plan geänderten Datei (next.config.mjs/env-abhängiges Remote-Pattern-Matching) -- als vorbestehend bestätigt und in `deferred-items.md` protokolliert, nicht behoben (außerhalb des Scopes dieses Plans).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Befund 21 (Anime-Kopf-Baustein) und der für diesen Baustein relevante Teil von Befund 22 (Seite ordnet nur an) sind abgeschlossen; `AnimeDetailHero.stories.tsx` zeigt jetzt dieselbe Struktur wie die Live-Seite (visuelle Bildpaar-Verifikation bleibt laut Acceptance Criteria bewusst Plan 07 vorbehalten).
- Offen für Folgepläne dieser Phase: Episoden-Bereich/Fansubgruppen-Karte/Release-Zeile (weitere Pilot-Bausteine), SSR-Randnavigation (Befund 19, `AnimeEdgeNavigation` erhält noch keine serverseitig aufgelösten `previous`/`next`-Props -- `edgeNavigation` wird aktuell unverändert mit der bisherigen, rein client-seitigen `AnimeEdgeNavigation`-API bestückt), Release-Zeilen-Einrückung (Befund 20).
- Kein Blocker: `catalogTaxonomy.test.ts`/`foreignVariableOverrides.regression.test.ts`/`processHistory.regression.test.ts` bleiben unverändert grün; `ResponsiveImage.config.test.ts`-Fehlschlag ist vorbestehend und dokumentiert, nicht blockierend für diesen Plan.

## Self-Check: PASSED

All created/modified files verified present on disk (`AnimeDetailHero.module.css` exists; `page.poster.module.css`/`page.infoCard.module.css` confirmed absent); both task commit hashes (`12be0c18d`, `b606f6484`) verified present in `git log`.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*
