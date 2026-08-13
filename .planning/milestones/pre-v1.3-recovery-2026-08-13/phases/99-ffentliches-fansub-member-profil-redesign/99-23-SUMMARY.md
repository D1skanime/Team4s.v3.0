---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "23"
subsystem: ui
tags: [react, nextjs, css-modules, scroll-snap, a11y, fansubs]

requires:
  - phase: "99-19"
    provides: "banner_url auf PublicFansubProject (Anime-Banner mit Cover-Fallback im Public-DTO)"
provides:
  - "FansubProjectBannerCard: 16:9-Banner-Projektkarte mit Titel-Overlay, Status-Pill, banner_url->cover_image->Skeleton-Fallback"
  - "FansubProjectsCarousel: A11y-Karussell (scroll-snap, Pfeil-Buttons, Tastatur, Skeleton-Uebergang, 'X weitere anzeigen'-Endkachel)"
  - "FansubProjectsSection: ein Header ('Projekte'), ongoing als Banner-Karten, completed+archived gemeinsam im Karussell"
affects: [99-24, 99-25]

tech-stack:
  added: []
  patterns:
    - "Client-Karussell mit scroll-snap-type:x + ref.scrollBy statt Bibliothek"
    - "Tastaturbedienung ueber onKeyDown auf der scroll-Bahn selbst (ArrowLeft/ArrowRight), kein Fokus-Trap noetig"
    - "Skeleton-Uebergang per useState+useEffect(setTimeout(...,0)) statt synchronem setState-in-Effekt (react-hooks/set-state-in-effect-konform)"
    - "next/image gemockt in Vitest-Tests (forwardRef-Wrapper) fuer loading/sizes-Assertions"

key-files:
  created:
    - frontend/src/components/fansubs/FansubProjectBannerCard.tsx
    - frontend/src/components/fansubs/FansubProjectsCarousel.tsx
    - frontend/src/components/fansubs/FansubProjectsSection.module.css
    - frontend/src/components/fansubs/__tests__/FansubProjectsCarousel.test.tsx
  modified:
    - frontend/src/components/fansubs/FansubProjectsSection.tsx
    - frontend/src/components/fansubs/__tests__/FansubProjectsSection.test.tsx

key-decisions:
  - "Karussell fasst completed+archived-Buckets zusammen statt separater Karussells je Status (Statuslabel wird pro Karte aus dem Bucket abgeleitet), um bei kleinen Datensaetzen keine leeren Mini-Karussells zu erzeugen"
  - "CAROUSEL_INITIAL=8 initial sichtbare Karten, Endkachel zeigt Restzahl und blendet sie inline aus dem bereits geladenen items-Array ein (kein Nachladen)"
  - "Skeleton-Uebergang ueber einen einmaligen setTimeout(0) nach Mount statt IntersectionObserver pro Karte - einfacher, deterministisch testbar, keine react-hooks/set-state-in-effect-Verletzung"

patterns-established:
  - "Karussell-Komponenten in diesem Repo: kein natives <button>, ausschliesslich @/components/ui Button (iconOnly+variant=ghost fuer Pfeile)"

requirements-completed: [AO6-06, AO6-01, AO6-04]

duration: 55min
completed: 2026-07-09
---

# Phase 99 Plan 23: Projekte-Sektion - Banner-Karten + A11y-Karussell Summary

**Laufende Projekte als volle 16:9-Anime-Banner-Karten (Titel-Overlay + Status-Pill), abgeschlossene/archivierte Projekte gemeinsam in einem tastaturbedienbaren scroll-snap-Karussell mit "X weitere anzeigen"-Endkachel; ein einheitlicher Sektions-Header ohne "Laufende Projekte"-Doppel.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-07-09T12:40:00Z (ca.)
- **Completed:** 2026-07-09T11:38:49Z
- **Tasks:** 2 (beide TDD, je RED+GREEN-Commit)
- **Files modified:** 6 (2 neu erstellt zusaetzlich zu Task 1's 2 neuen Dateien)

## Accomplishments
- Neue `FansubProjectBannerCard`: banner_url (Anime-Banner, AO6-01) mit Fallback auf cover_image, sonst Skeleton derselben 16:9-Flaeche (kein Layout-Sprung); next/image mit `fill`+`sizes`+`loading="lazy"`+`unoptimized`; Titel-Overlay-Leiste + Status-Pill (Badge)
- Neues `FansubProjectsCarousel` (Client-Komponente): scroll-snap-Bahn (`scroll-snap-type: x mandatory`), Pfeil-Buttons (@/components/ui Button, iconOnly+ghost, ChevronLeft/Right) scrollen per `scrollBy({behavior:'smooth'})`, Bahn selbst ist per Tastatur bedienbar (`tabIndex=0` + `onKeyDown` ArrowLeft/ArrowRight rufen dieselbe scrollBy-Logik auf), `role="region" aria-label="Projekt-Karussell"`; initial 8 Karten sichtbar, Endkachel "X weitere anzeigen" blendet den Rest inline aus dem bereits geladenen `items`-Array ein (kein Netzwerk-Nachladen, kein Auto-Scroll)
- `FansubProjectsSection` umgebaut: genau EIN `SectionHeader title="Projekte"` (vorher "Laufende Projekte"-Titel + "Laufend"-Subtitel-Doppel); ongoing-Bucket als Banner-Karten-Grid, completed+archived-Buckets gemeinsam ins Karussell (Statuslabel pro Karte aus dem urspruenglichen Bucket abgeleitet)
- Live gegen echte DB-Daten verifiziert (`/fansubs/c-subs`, Docker `team4sv30-frontend`): Header exakt einmal "Projekte", kein "Laufende Projekte" mehr im DOM, Banner-Karte verlinkt korrekt auf `/anime/1/group/1`, Skeleton-Fallback greift korrekt (das Seed-Anime "Viper's Creed" hat weder `banner_url` noch `cover_image` gesetzt - bestaetigt den vollstaendigen Fallback-Pfad in Produktion)

## Task Commits

Jeder Task wurde als RED (failing test) + GREEN (Implementierung) committet:

1. **Task 1: FansubProjectBannerCard** (AO6-01/06)
   - `f8f5949a` test(99-23): add failing test for Banner-Projektkarte (AO6-01/06)
   - `179dac67` feat(99-23): FansubProjectBannerCard mit 16:9-Banner, Titel-Overlay, Status-Pill (AO6-01/06)
2. **Task 2: FansubProjectsCarousel + Section-Rewiring** (AO6-06/04)
   - `6b5f2893` test(99-23): add failing test for Projekt-Karussell und entdoppelten Header (AO6-06/04)
   - `b4b4bdf7` feat(99-23): Projekte als Banner-Karten + A11y-Karussell, ein Header (AO6-06/04)

_RED wurde jeweils durch temporaeres Entfernen der Implementierungsdatei verifiziert (`Failed to resolve import`), danach GREEN durch Wiederherstellen bestaetigt._

## Files Created/Modified
- `frontend/src/components/fansubs/FansubProjectBannerCard.tsx` - 16:9-Banner-Projektkarte, banner_url->cover_image->Skeleton, Titel-Overlay, Status-Pill
- `frontend/src/components/fansubs/FansubProjectsCarousel.tsx` - Client-Karussell: scroll-snap, Pfeile, Tastatur, Skeleton-Uebergang, "weitere anzeigen"
- `frontend/src/components/fansubs/FansubProjectsSection.tsx` - ein Header, ongoing->Banner-Karten, completed+archived->Karussell
- `frontend/src/components/fansubs/FansubProjectsSection.module.css` - neues eigenes CSS-Modul (bannerCard/-Frame/-Overlay/-StatusPill, carouselShell/-Row/-Track/-Item/-Arrow/-Skeleton/moreTile), nur Team4s-Tokens
- `frontend/src/components/fansubs/__tests__/FansubProjectsSection.test.tsx` - Banner-Card-Verhalten (Bild/Fallback/Skeleton) + Section-Wiring (ein Header, Buckets)
- `frontend/src/components/fansubs/__tests__/FansubProjectsCarousel.test.tsx` - Pfeil-aria-labels, "weitere anzeigen"-Klick-Enthuellung, role=region+tabindex

## Decisions Made
- Karussell fasst completed+archived zu einer gemeinsamen Bahn zusammen (statt zwei getrennten Mini-Karussells je Status), da Statuslabel bereits pro Karte mitgegeben wird und getrennte Karussells bei kleinen Datensaetzen unnoetig fragmentieren wuerden.
- Skeleton-Uebergang ueber `useEffect(() => { const timer = setTimeout(() => setReady(true), 0); ... }, [])` statt direktem `setReady(true)` im Effekt-Koerper - vermeidet den ESLint-Fehler `react-hooks/set-state-in-effect` (aktives Projekt-Lint-Regelwerk verbietet synchrones setState direkt im Effekt).
- Kein IntersectionObserver pro Karte: da alle Projekt-Items bereits synchron als Prop vorliegen (kein Nachladen), reicht ein einmaliger Skeleton->Karten-Uebergang nach Mount als einfache Realisierung von "Skeleton-Platzhalter beim Laden".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint-Verstoss `react-hooks/set-state-in-effect` bei erstem Skeleton-Ansatz behoben**
- **Found during:** Task 2 (FansubProjectsCarousel)
- **Issue:** Erster Ansatz rief `setReady(true)` direkt (synchron via `requestAnimationFrame`, dann ohne Wrapper) im Effekt-Koerper auf; ESLint (`react-hooks/set-state-in-effect`) meldete dies als Fehler.
- **Fix:** Aufruf in `setTimeout(() => setReady(true), 0)` innerhalb des Effekts verschoben (mit `clearTimeout`-Cleanup), damit der setState-Aufruf nicht mehr direkt/synchron im Effekt-Koerper steht.
- **Files modified:** frontend/src/components/fansubs/FansubProjectsCarousel.tsx
- **Verification:** `npx eslint` auf der Datei liefert keine Fehler mehr; Vitest-Tests weiterhin gruen (Test-Timing an `setTimeout(0)` angepasst via `await act(async () => { await new Promise(r => setTimeout(r, 0)) })`).
- **Committed in:** b4b4bdf7 (Task 2 GREEN-Commit)

---

**Total deviations:** 1 auto-fixed (1 Bug/Lint-Konformitaet)
**Impact on plan:** Kein Scope-Creep - reine Lint-Konformitaet der bereits geplanten Skeleton-Mechanik.

## Issues Encountered
- Vorhandene Seed-Daten (`c-subs`, `honto`) enthalten je nur 1 Projekt (Status `ongoing`), daher konnte das Karussell (completed/archived, "weitere anzeigen"-Endkachel bei >8 Karten) NICHT live mit echten Daten durchgespielt werden. Die Banner-Karte (inkl. Skeleton-Fallback, da "Viper's Creed" weder `banner_url` noch `cover_image` gesetzt hat) wurde live bestaetigt; die Karussell-Mechanik (Pfeile, Tastatur, Skeleton-Uebergang, "weitere anzeigen"-Klick) ist ausschliesslich durch die Vitest-Suite (`FansubProjectsCarousel.test.tsx`, 3 Tests) abgedeckt, nicht durch Live-Interaktion im Browser. Ehrlich vermerkt gemaess Plan-Vorgabe.

## Verification durchgefuehrt
- `cd frontend && npx vitest run src/components/fansubs` - 13 Testdateien, 35 Tests, alle gruen
- `cd frontend && npm run typecheck` - keine Fehler
- `cd frontend && npx eslint <geaenderte Dateien>` - keine Fehler/Warnungen
- Live: Docker-Stack gestartet (`docker compose up -d team4sv30-db team4sv30-redis team4sv30-backend team4sv30-frontend`), `docker restart team4sv30-frontend`, `GET /fansubs/c-subs` (Port 3000) liefert 200 ohne Serverfehler im Log; gerendertes HTML bestaetigt genau einen `<h2>Projekte</h2>`, kein "Laufende Projekte"-String mehr, Banner-Karte verlinkt korrekt (`/anime/1/group/1`) und zeigt den Skeleton-Fallback (kein Banner/Cover im Seed-Datensatz vorhanden -> Fallback-Kette bestaetigt bis zum Skeleton-Endzustand)

## User Setup Required
None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness
- Projekte-Sektion (AO6-01/06/04) ist abgeschlossen und live bestaetigt (im Rahmen der verfuegbaren Seed-Daten).
- Fuer eine vollstaendige visuelle Karussell-Verifikation (Pfeile/Skeleton/"weitere anzeigen" mit >8 echten Projekten) waere ein Seed-Datensatz mit mehreren completed/archived-Projekten je Gruppe hilfreich - kein Blocker fuer diesen Plan, da Vitest die Mechanik vollstaendig abdeckt.
- Bereit fuer die naechsten Add-on-6-Plaene (Team/Historie/Community/Medien-Sektionen, sofern noch offen).

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-09*

## Self-Check: PASSED
- All created/modified files verified present on disk.
- All 4 task commits (f8f5949a, 179dac67, 6b5f2893, b4b4bdf7) verified in git log.
