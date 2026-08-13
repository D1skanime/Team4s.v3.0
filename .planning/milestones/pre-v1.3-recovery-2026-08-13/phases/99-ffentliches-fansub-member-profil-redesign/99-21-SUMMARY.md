---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "21"
subsystem: ui
tags: [react, nextjs, lucide-react, css-modules, fansub-profile]

# Dependency graph
requires:
  - phase: 99-19/99-20
    provides: stories[]-Migration und komponierte Fansub-Profilseite (Sektionsreihenfolge, ein SectionHeader je Sektion)
provides:
  - Reine Zeitraum-Formatierung (formatMemberPeriod) fuer historische Mitglieder
  - Historische Team-Listen mit Rolle+Zeitraum und Einklappen ab Schwelle 9
  - Aktive Mitglieder mit oeffentlichem Profil klar klickbar (Akzent + Chevron) zu /members/[slug]
  - Zweispaltiges Team-Grid (Desktop) mit Mobil-Fallback (<=640px)
  - Entdoppelter Team-Sektions-Header (kein Eyebrow mehr)
affects: [99-22, 99-23, 99-24, 99-25, 99-26]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-Collapse-Pattern: useCollapsibleEntries-Hook je Teilliste (former/unconfirmed) mit eigenem showAll-State"
    - "lucide-react ChevronRight als aria-hidden Affordance-Icon neben Akzent-Link (wie FansubCommunityLinksSection)"

key-files:
  created:
    - frontend/src/components/fansubs/fansubTeamPeriod.ts
    - frontend/src/components/fansubs/__tests__/fansubTeamPeriod.test.ts
    - frontend/src/components/fansubs/__tests__/FansubTeamHistoricalGroup.test.tsx
    - frontend/src/components/fansubs/__tests__/FansubTeamActiveGroup.test.tsx
  modified:
    - frontend/src/components/fansubs/FansubTeamHistoricalGroup.tsx
    - frontend/src/components/fansubs/FansubTeamActiveGroup.tsx
    - frontend/src/components/fansubs/FansubTeamSection.tsx
    - frontend/src/components/fansubs/FansubTeamSection.module.css

key-decisions:
  - "HISTORICAL_COLLAPSE_THRESHOLD=9 als Konstante; Einklappen gilt separat pro Teilliste (Ehemalige Mitglieder / Historische Nennungen), nicht global kombiniert."
  - "Trennzeichen ' · ' zwischen Rolle und Zeitraum liegt ausserhalb des memberPeriod-Spans (eigener Textknoten), damit getByText/Testing-Library exakt auf den Zeitraumtext matcht."
  - "Aktive Mitglieder ohne member_slug bleiben unveraendert bei styles.memberName; nur der Link-Zweig bekommt styles.memberLink + ChevronRight."

patterns-established:
  - "useCollapsibleEntries<T>(entries) generischer Hook fuer Einklapp-Logik mit dynamischer Restzahl im Button-Label."

requirements-completed: ["Phase 99 Add-on 6 CONTEXT AO6-07 (Team zweispaltig, klickbar erkennbar, historisch einklappbar)", "Phase 99 Add-on 6 CONTEXT AO6-08 (historische Mitglieder: Rolle + Zeitraum)", "Phase 99 Add-on 6 CONTEXT AO6-04 (ein klarer Header pro Sektion)"]

# Metrics
duration: 20min
completed: 2026-07-09
---

# Phase 99 Plan 21: Team-Sektion zweispaltig, klickbare Profile, Zeitraum bei Historie Summary

**Team-Sektion der Fansub-Profilseite zeigt aktive Mitglieder mit oeffentlichem Profil als Akzent-Link+Chevron in einem zweispaltigen Grid, historische Mitglieder mit Rolle+Zeitraum (formatMemberPeriod) und einklappbare Listen ab 9 Eintraegen, unter einem einzigen Sektions-Header.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-09T11:57:00Z
- **Completed:** 2026-07-09T12:11:30Z
- **Tasks:** 2
- **Files modified:** 7 (3 neu, 4 geaendert)

## Accomplishments
- Reine, getestete `formatMemberPeriod`-Funktion fuer Zeitraumdarstellung (`2018–2020`, `seit 2018`, `bis 2020`, `''`)
- `FansubTeamHistoricalGroup` zeigt je Eintrag Rolle + Zeitraum, behaelt das `unbestätigt`-Badge, und klappt lange Teillisten (Ehemalige/Historische Nennungen) ab 9 Eintraegen mit dynamischem "X weitere anzeigen"-Button ein
- `FansubTeamActiveGroup` verlinkt Mitglieder mit `member_slug` klar erkennbar (Akzentfarbe + `ChevronRight`-Icon) zu `/members/[slug]`; Mitglieder ohne Profil bleiben neutral
- Team-Grid ist zweispaltig auf Desktop (`repeat(2, minmax(0,1fr))`) und einspaltig unter 640px
- `FansubTeamSection` rendert nur noch einen `SectionHeader` ohne redundantes `eyebrow="Fansub"`

## Task Commits

Each task was committed atomically (TDD RED→GREEN):

1. **Task 1: Zeitraum-Formatierung + historische Liste (AO6-08/07)**
   - `f94ab634` test(99-21): add failing tests for Zeitraum-Formatierung und historische Liste
   - `b6b85d54` feat(99-21): Zeitraum-Formatierung + historische Liste mit Rolle+Zeitraum und Einklappen
2. **Task 2: Aktive Mitglieder klickbar + zweispaltig + Header entdoppelt (AO6-07/04)**
   - `af986e75` test(99-21): add failing test for Chevron/Akzent-Link bei aktiven Mitgliedern
   - `9cd35774` feat(99-21): aktive Mitglieder klickbar erkennbar, zweispaltiges Grid, ein Sektions-Header

_TDD-Gate-Sequenz je Task verifiziert: test(...)-Commit vor feat(...)-Commit, beide gruen im finalen Testlauf._

## Files Created/Modified
- `frontend/src/components/fansubs/fansubTeamPeriod.ts` - reine `formatMemberPeriod(joinedYear, leftYear)`-Funktion
- `frontend/src/components/fansubs/__tests__/fansubTeamPeriod.test.ts` - 4 Formatierungsfaelle
- `frontend/src/components/fansubs/FansubTeamHistoricalGroup.tsx` - `use client`, Rolle+Zeitraum, `useCollapsibleEntries`-Hook (Schwelle 9) fuer beide Teillisten
- `frontend/src/components/fansubs/__tests__/FansubTeamHistoricalGroup.test.tsx` - Rolle+Zeitraum, unbestaetigt-Badge, Einklappen/Aufklappen
- `frontend/src/components/fansubs/FansubTeamActiveGroup.tsx` - `styles.memberLink` + `ChevronRight` nur im `member_slug`-Zweig
- `frontend/src/components/fansubs/__tests__/FansubTeamActiveGroup.test.tsx` - Link+Chevron vs. neutraler Name
- `frontend/src/components/fansubs/FansubTeamSection.tsx` - `SectionHeader` ohne `eyebrow`
- `frontend/src/components/fansubs/FansubTeamSection.module.css` - `activeGrid` auf `repeat(2, minmax(0,1fr))` + `@media (max-width: 640px)`; neue Klassen `memberPeriod`, `memberLink`

## Decisions Made
- Einklappen gilt separat je Teilliste (Ehemalige Mitglieder / Historische Nennungen), da beide eigene Ueberschriften und potenziell unterschiedliche Laengen haben.
- Trennzeichen `' · '` als eigener Textknoten ausserhalb des `memberPeriod`-Spans, damit Testing-Library-Matcher exakt auf den Zeitraumtext treffen (sonst wird `'· 2008–2011'` als ein Textknoten zusammengefasst).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test-Assertions an Projekt-Konvention angepasst (kein jest-dom)**
- **Found during:** Task 1 (RED-Phase)
- **Issue:** Erster Testentwurf nutzte `toBeInTheDocument()`; das Projekt hat kein `@testing-library/jest-dom` als Chai-Matcher-Erweiterung registriert (`vitest.config.ts` ohne Setup-Datei), andere Fansub-Tests nutzen durchgehend `toBeTruthy()`/`toBeNull()`.
- **Fix:** Assertions auf `toBeTruthy()`/`toBeNull()` umgestellt, konsistent mit `FansubGroupMediaBlock.test.tsx`.
- **Files modified:** frontend/src/components/fansubs/__tests__/FansubTeamHistoricalGroup.test.tsx
- **Verification:** Testlauf gruen nach Anpassung.
- **Committed in:** f94ab634 (Task 1 RED-Commit)

**2. [Rule 1 - Bug] Zeitraum-Trennzeichen brach Text-Matching**
- **Found during:** Task 1 (GREEN-Phase)
- **Issue:** Erste Implementierung rendertete `' · '` und den Zeitraumtext im selben `<span className={styles.memberPeriod}>`, wodurch der volle Text `'· 2008–2011'` lautete statt `'2008–2011'` — Tests fanden den erwarteten exakten Text nicht.
- **Fix:** Trennzeichen als separaten Textknoten ausserhalb des `memberPeriod`-Spans platziert.
- **Files modified:** frontend/src/components/fansubs/FansubTeamHistoricalGroup.tsx
- **Verification:** `npx vitest run src/components/fansubs` gruen (29/29).
- **Committed in:** b6b85d54 (Task 1 GREEN-Commit)

---

**Total deviations:** 2 auto-fixed (beide Rule 1, Test-/Implementierungskorrekturen ohne Scope-Aenderung)
**Impact on plan:** Keine funktionale Abweichung von den Akzeptanzkriterien; beide Fixes waren noetig, damit die geplanten Verhaltensweisen korrekt testbar/anzeigbar sind.

## Issues Encountered
None.

## Live-Verifikation

`docker restart team4sv30-frontend` durchgefuehrt (inkl. Turbopack-Dev-Cache-Clear unter `/app/.next/dev`, da ein reiner Restart die Aenderungen zunaechst nicht neu kompilierte); danach `/fansubs/c-subs` (Port 3000) erfolgreich mit 200 geladen und HTML/CSS-Bundle inspiziert:
- Sektions-Header zeigt nur noch `<h2>Team & Mitglieder</h2>` ohne Eyebrow-Absatz — bestaetigt.
- Ausgeliefertes CSS-Bundle enthaelt `grid-template-columns: repeat(2, minmax(0, 1fr))`, `@media (max-width: 640px)` sowie die neuen Klassen `memberLink`/`memberPeriod` — bestaetigt.
- Historischer Eintrag "Akropolis" (`joined_year: null, left_year: null`) zeigt korrekt keinen Zeitraum (leerer String, kein Trenner) — bestaetigt.
- **Nicht visuell verifizierbar:** Alle aktiven/historischen Mitglieder der Test-Seed-Gruppe `c-subs` haben `member_slug: null` (kein oeffentliches Profil verlinkt), daher konnte der Akzent-Link+Chevron-Zustand in dieser Umgebung nicht live am Beispiel eines echten verlinkten Mitglieds betrachtet werden. Verhalten ist ueber `FansubTeamActiveGroup.test.tsx` (Unit-Test mit `member_slug` gesetzt) code-seitig abgesichert; empfohlen: bei naechster UAT-Session mit einer Gruppe/Mitglied mit gesetztem `member_slug` gegenpruefen.
- Die Einklapp-Schwelle (>9 Eintraege) konnte mangels ausreichend vieler Seed-Mitglieder ebenfalls nicht live ausgeloest werden; Verhalten ist ueber `FansubTeamHistoricalGroup.test.tsx` (12 synthetische Eintraege) abgesichert.

## User Setup Required
None - keine externe Service-Konfiguration noetig.

## Next Phase Readiness
- Team-Sektion (AO6-04/07/08) ist code- und unit-test-seitig vollstaendig; visuelle Live-Bestaetigung von Link+Chevron und Einklapp-Zustand steht aus, da der aktuelle `c-subs`-Seed keine verlinkten/zahlreichen Mitglieder enthaelt.
- Naechste Plaene (99-22ff.) koennen unveraendert auf `DomainProjectionMemberRow`/`DomainProjectionHistoricalRow` sowie `formatMemberPeriod` aufbauen.

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-09*

## Self-Check: PASSED

Alle 9 referenzierten Dateien gefunden, alle 4 Commit-Hashes (f94ab634, b6b85d54, af986e75, 9cd35774) in `git log` verifiziert.
