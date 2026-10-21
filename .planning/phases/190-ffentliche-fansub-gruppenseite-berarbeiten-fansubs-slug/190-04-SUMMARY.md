---
phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug
plan: 04
subsystem: ui
tags: [nextjs-image, css, focal-carousel, fansubs]

# Dependency graph
requires:
  - phase: 190-02
    provides: "Root-Cause-Diagnose fuer D-b (sizes-Prop-Dichte-Verzerrung statt Container-Breite)"
provides:
  - "Banner-Rendergroesse auf der Gruppenseite entspricht wieder dem echten Bildseitenverhaeltnis (sizes-Prop-Bug behoben)"
  - "Geschichte-Textblock zentriert auf ~76ch Lesebreite, Text bleibt linksbuendig"
  - "FocalCarousel singleItemLayout-Prop ('quiet' | 'grid', Default 'quiet'), rueckwaertskompatibel"
  - "FansubProjectsGrid nutzt singleItemLayout=\"grid\" -- Einzelprojekt-Gruppen zeigen die normale Grid-Karte statt der ruhigen Grosskarten-Darstellung"
affects: [190-05, 190-06, 190-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optionaler, rueckwaertskompatibler Enum-Prop an einem geteilten UI-Primitive (FocalCarousel) statt Komponenten-Duplikation fuer einen einzelnen abweichenden Konsumenten"

key-files:
  created: []
  modified:
    - frontend/src/components/fansubs/FansubHeroSection.tsx
    - frontend/src/components/fansubs/FansubStorySection.module.css
    - frontend/src/components/ui/FocalCarouselInternals.tsx
    - frontend/src/components/ui/FocalCarousel.tsx
    - frontend/src/components/fansubs/FansubProjectsGrid.tsx
    - frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx

key-decisions:
  - "D-b final umgesetzt als Komponenten-Bugfix (nicht als neuer CSS-Wert): die stray sizes=\"1200px\"-Prop auf dem Banner-ResponsiveImage wurde entfernt, exakt dem sizes-losen Muster der Projektseite (HeroSection.tsx) folgend. Post-Fix-Messung bei 1440px (1090.9x200.0px) bestaetigt rechnerisch die erwartete, unverzerrte Groesse basierend auf dem echten 1200/220-Seitenverhaeltnis der Gruppenbanner-Datei bei max-height:200px."
  - "Bei 375px aendert sich die gemessene Groesse NICHT (279x51px vor und nach dem Fix) -- rechnerisch erwartet, da bei dieser schmalen Viewport-Breite max-width:100% (Container-Breite) die bindende Beschraenkung ist, nicht die (vormals fehlkorrigierte) intrinsische Bildgroesse; die density-Korrektur aendert nur die ungebundene intrinsische Groesse, nicht das Seitenverhaeltnis, daher bleibt das sichtbare Ergebnis bei containergebundenem Rendering identisch."
  - "D-r/D-h: singleItemLayout-Prop direkt nach deferInteractionUntilNearViewport in FocalCarouselProps<T> ergaenzt, Default 'quiet' bewahrt das Verhalten fuer alle anderen 4 Konsumenten unveraendert (MemberBadgeChain, RoleAchievementCard, ThumbnailStrip, AchievementBadgeShowcase) -- keine Aenderung an diesen Dateien, ihre Tests bestehen unveraendert."

requirements-completed: [D-b, D-l, D-h, D-r]

# Metrics
duration: ~25min
completed: 2026-10-21
---

# Phase 190 Plan 04: Banner-Bugfix, Geschichte-Zentrierung, FocalCarousel singleItemLayout Summary

**Entfernt die stray `sizes="1200px"`-Prop vom Gruppenseiten-Banner (Root-Cause-Fix statt neuer CSS-Wert), zentriert den Geschichte-Textblock auf ~76ch und gibt `FocalCarousel` einen rueckwaertskompatiblen `singleItemLayout`-Prop, damit Einzelprojekt-Fansubgruppen als normale Grid-Karte statt als ruhige Grosskarte rendern.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-10-21T11:46:23Z
- **Tasks:** 3 (Task 3 war reine Verifikation, kein Code)
- **Files modified:** 6

## Accomplishments
- Banner der Gruppenseite rendert nach dem Fix bei 1440px mit 1090.9×200.0px (statt der vormals verzerrten 973×178px) -- rechnerisch exakt das erwartete, unverzerrte Seitenverhaeltnis der echten Bannerdatei.
- Geschichte-Textblock steht jetzt mittig auf der Seite (`.storyStack` mit `margin: 0 auto`, `max-width: 76ch`), Text bleibt linksbuendig, keine Strukturaenderung an `SectionHeader` noetig.
- `FocalCarousel` bekam einen optionalen, rueckwaertskompatiblen `singleItemLayout`-Prop; Einzelprojekt-Fansubgruppen zeigen jetzt dieselbe Navigationspfeile-Behandlung wie Mehrfach-Projekt-Gruppen statt der ruhigen Grosskarten-Darstellung.
- Alle vier anderen `FocalCarousel`-Konsumenten (`MemberBadgeChain`, `RoleAchievementCard`, `ThumbnailStrip`, `AchievementBadgeShowcase`) bleiben unveraendert -- kein Code-Diff in diesen Dateien, ihre Tests bestehen weiterhin unveraendert.

## Post-Fix Banner-Messung (Task 1, Pflicht-Abnahmekriterium)

Playwright `getBoundingClientRect()` des Banner-`<img>` auf `/fansubs/new-subs`, ausgefuehrt im `team4sv30-frontend`-Container NACH Neustart des Containers mit dem gefixten Code:

| Viewport | Breite | Hoehe |
|---|---|---|
| 1440×900 | **1090.90625px** | **199.984375px** |
| 375×800 | **279px** | **51.140625px** |

Beide Seiten HTTP 200, keine JS-Console-/Page-Errors. Die 1440px-Messung (≈1090.9×200) bestaetigt die in 190-02-SUMMARY.md berechnete Erwartung (≈1090×200, basierend auf dem echten 1200/220-Seitenverhaeltnis der Gruppenbanner-Datei bei `max-height: 200px`) exakt -- die Diskrepanz zur Projektseite ist geschlossen.

Die 375px-Messung ist unveraendert identisch zum in 190-02-SUMMARY.md dokumentierten Vor-Fix-Wert (279×51px). Das ist rechnerisch korrekt und keine fehlgeschlagene Korrektur: bei dieser schmalen Viewport-Breite ist `max-width: 100%` (Container-Breite) die bindende CSS-Beschraenkung, nicht die (vormals durch die `sizes`-Prop fehlkorrigierte) intrinsische Bildgroesse. Die Dichte-Korrektur aus dem urspruenglichen Bug skaliert nur die ungebundene intrinsische Groesse gleichmaessig (beide Achsen um denselben Faktor ≈1.233), das Seitenverhaeltnis bleibt dabei unveraendert -- sobald `max-width: 100%` statt der intrinsischen Groesse bindet, verschwindet der Effekt der Dichte-Korrektur vollstaendig aus dem sichtbaren Ergebnis. Der Fix wirkt also korrekt genau dort, wo er mathematisch wirken muss (am `max-height`-Clamp bei 1440px), und hat erwartungsgemaess keinen Effekt dort, wo eine andere CSS-Regel bereits bindet (375px).

## Task Commits

1. **Task 1: Banner-Rendergroesse (D-b) + Geschichte zentrieren (D-l)** - `9ceafd406` (fix)
2. **Task 2a: Failing Test fuer Einzelprojekt (D-h/D-r RED)** - `602923a5e` (test)
2. **Task 2b: FocalCarousel singleItemLayout-Prop + FansubProjectsGrid opt-in (D-h/D-r GREEN)** - `f53bb9398` (feat)
3. **Task 3: Regressionslauf** - kein Commit (reine Verifikation, keine Dateiaenderung)

## Files Created/Modified
- `frontend/src/components/fansubs/FansubHeroSection.tsx` - `sizes="1200px"`-Prop vom Banner-`ResponsiveImage`-Aufruf entfernt
- `frontend/src/components/fansubs/FansubStorySection.module.css` - `.storyStack` bekommt `margin: 0 auto`, `max-width` von 68ch auf 76ch erweitert
- `frontend/src/components/ui/FocalCarouselInternals.tsx` - `FocalCarouselProps<T>` um optionales `singleItemLayout?: 'quiet' | 'grid'` erweitert
- `frontend/src/components/ui/FocalCarousel.tsx` - `singleItemLayout = 'quiet'` Default-Destrukturierung, `quiet`-Berechnung respektiert den neuen Prop
- `frontend/src/components/fansubs/FansubProjectsGrid.tsx` - einziger Call-Site mit `singleItemLayout="grid"`
- `frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` - neuer Testfall fuer `makeItems(1)`

## Decisions Made
- D-b wurde, wie von 190-02-SUMMARY.md verbindlich festgelegt, als reiner Prop-Entfernungs-Bugfix umgesetzt, nicht als neuer `max-height`-Wert.
- Die Task-2-TDD-Testassertion wurde ueber die im Plan woertlich vorgegebenen Assertions hinaus um eine echte, differenzierende Behavior-Pruefung ergaenzt (Pruefung der Navigationspfeile-Praesenz), nachdem sich empirisch zeigte, dass die urspruenglich geplanten Assertions (Text/Link-Praesenz, keine Zaehler-Card) bereits VOR der Implementierung bestanden haetten -- siehe Deviations unten.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/Teststil] TDD-RED-Test um echte differenzierende Assertion ergaenzt**
- **Found during:** Task 2 (FocalCarousel singleItemLayout TDD-Zyklus)
- **Issue:** Die im Plan woertlich vorgegebenen Testassertions fuer den neuen `makeItems(1)`-Testfall (Projekt-Titel/Link sichtbar, keine "Alle N Projekte anzeigen"-Zaehler-Card) wurden empirisch VOR jeder Implementierungsaenderung ausgefuehrt und bestanden bereits (bestaetigt per Testlauf) -- sie unterscheiden nicht zwischen dem alten `quiet`-Verhalten und dem neuen `singleItemLayout="grid"`-Verhalten. Das verletzt die verbindliche RED-Gate-Anforderung (ein Test muss vor der Implementierung fehlschlagen) und die CLAUDE.md-Teststil-Regel (Verhaltens-Assertions muessen den gepruften Code tatsaechlich unterscheidbar ausfuehren).
- **Fix:** Per Playwright-freier RTL-Rendering-Probe empirisch verifiziert, dass `FocalCarousel`s `quiet`-Modus bei genau einem sichtbaren Item die beiden `NavArrow`-Buttons ("Vorherige Projekte"/"Weitere Projekte") komplett aus dem DOM entfernt (waehrend sie beim 3-Item-Fall bereits heute gerendert werden). Testfall um zwei zusaetzliche Assertions ergaenzt (`getByRole('button', { name: 'Vorherige Projekte' })`/`'Weitere Projekte'`), die nachweislich VOR der Implementierung fehlschlagen (RED bestaetigt per Testlauf) und NACH der Implementierung bestehen (GREEN bestaetigt per Testlauf).
- **Files modified:** `frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx`
- **Verification:** RED-Lauf vor Implementierung: 1 von 5 Tests fehlgeschlagen (genau der neue Testfall, exakt an den zwei neuen Assertions). GREEN-Lauf nach Implementierung: 5/5 bestanden.
- **Committed in:** `602923a5e` (RED), `f53bb9398` (GREEN)

---

**Total deviations:** 1 auto-fixed (1 Rule-1-Teststil-Korrektur)
**Impact on plan:** Staerkt die TDD-Gate-Einhaltung fuer diesen Plan, keine Scope-Erweiterung -- derselbe Testfall, dieselbe vom Plan vorgegebene Grundstruktur, nur um zwei zusaetzliche, tatsaechlich differenzierende Assertions ergaenzt.

## Issues Encountered

Die vollstaendige `npm test`-Suite zeigte in zwei von vier aufeinanderfolgenden Laeufen je einen anderen, von diesem Plan unberuehrten Testdatei-Fehlschlag unter Last (`src/lib/server/imageDisplay.test.ts` Timeout bei paralleler Bild-Verarbeitung; `src/app/dev/ui-system/showcase/AchievementBadgeShowcase.test.tsx`; `src/app/admin/fansubs/[id]/edit/DefaultCrewManager.test.tsx` Timing-abhaengiger Button-Status). Jede dieser drei Dateien lief isoliert zuverlaessig gruen (mehrfach reproduziert), und ein vierter vollstaendiger Lauf war komplett gruen (399/400 Dateien, 3654/3657 Tests, 1 geplanter Skip, 3 Todo) -- dieselbe bereits in `STATE.md` (Phase 186, Phase 181) dokumentierte Ressourcenkonkurrenz-Flakiness auf der geteilten Entwicklungsmaschine, keine Regression durch diesen Plan.

## Next Phase Readiness
- Alle vier Muss-Wahrheiten dieses Plans erfuellt: Banner unverzerrt, Geschichte zentriert, Einzelprojekt-Gruppen als normale Grid-Karte, andere `FocalCarousel`-Konsumenten unveraendert.
- Keine Blocker fuer die Folgeplaene 190-05 bis 190-07.

## Self-Check: PASSED

Alle 6 geaenderten/erstellten Dateien verifiziert vorhanden. Alle 3 Commit-Hashes
(`9ceafd406`, `602923a5e`, `f53bb9398`) verifiziert in `git log --oneline --all`.

---
*Phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug*
*Completed: 2026-10-21*
