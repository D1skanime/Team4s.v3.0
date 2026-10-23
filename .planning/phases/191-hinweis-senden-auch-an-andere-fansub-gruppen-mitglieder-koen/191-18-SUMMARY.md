---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 18
subsystem: ui
tags: [react, nextjs, vitest, contributions, d-12, public-pages]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "isEligibleForContributions in frontend/src/lib/contributionsEligibility.ts und ProposalForm's prefill-Prop (Plan 191-17)"
provides:
  - "ReportHintEntryPoint.tsx (frontend/src/components/contributions/): einziger, wiederverwendbarer, eligibility-gated 'Fehler melden'-Einstiegspunkt in das ProposalForm, der niemals einen Fehlertext/Platzhalter fuer nicht berechtigte Besucher zeigt"
  - "Zweiter Einstiegspunkt in ProposalForm live auf der oeffentlichen Projektseite (HeroSection.tsx) und der oeffentlichen Release-Seite (ReleaseDetailHero.tsx, nur bei genau einer Zielgruppe)"
affects: ["191-10 Task 2 (Live-Checkpoint, D-16): kann jetzt auch den D-12-Einstiegspunkt live pruefen, nicht nur /me/contributions"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zweistufige Datenbeschaffung fuer einen eligibility-gated Einstiegspunkt: die billige, sichtbarkeitsentscheidende Pruefung (getOwnProfile) laeuft eagerly beim Mount; die teurere, nur beim tatsaechlichen Klick noetige Datenliste (getMyMemberships) wird lazy erst im Klick-Handler geladen und ihr Resultat vor dem Oeffnen des Formulars (setOwnGroups + setIsOpen im selben Tick, React-18-Batching) committed, damit ProposalForms lazy-State-Initializer nie mit veralteten/leeren ownGroups mountet."
    - "Eine async Eligibility-Pruefung in einem Effekt behandelt jeden Fehlerzweig (401/403/Netzwerk) identisch zum negativen Fall (render null) -- es gibt keinen dritten, fehlertext-zeigenden Zustand fuer einen oeffentlichen, nicht authentifizierten Seitenbesucher (T-191-25)."

key-files:
  created:
    - frontend/src/components/contributions/ReportHintEntryPoint.tsx
    - frontend/src/components/contributions/ReportHintEntryPoint.test.tsx
  modified:
    - frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "ownGroups/getMyMemberships werden lazy erst beim Klick auf 'Fehler melden' geladen (nicht eager zusammen mit der Eligibility-Pruefung) -- wortgetreu der <behavior>-Vorgabe des Plans ('On click: lazily loads ownGroups'). Die Eligibility-Pruefung selbst (getOwnProfile) laeuft dagegen eager beim Mount, weil sie die Sichtbarkeits-Entscheidung der Komponente selbst traegt und fuer jeden Seitenaufruf ohnehin noetig ist."
  - "Inline-style (marginTop: 'var(--space-2)') statt neuer page.module.css-Klassen fuer den Abstand zum Nachbarelement in beiden Mount-Punkten -- analog zur in Plan 191-17 etablierten Begruendung: page.module.css steht nicht in den files_modified dieses Plans, ein neues CSS-Klassenpaar haette eine im Plan nicht vorgesehene Datei angefasst."
  - "ReportHintEntryPoint wird in page.test.tsx und ReleaseDetailHero.test.tsx auf einen Null-Render gemockt, statt diese Hero-Layout-Tests zusaetzlich mit einem RoleCatalogProvider-Wrapper auszustatten -- die Komponente hat bereits eigene, dedizierte Tests (ReportHintEntryPoint.test.tsx), die Hero-Tests pruefen reine Navigations-/Layout-Assertions, fuer die ein echter Provider-Aufbau irrelevanten Zusatzaufwand bedeutet haette."

requirements-completed: [D-12, D-08, D-15]

# Metrics
duration: ~35min
completed: 2026-10-23
---

# Phase 191 Plan 18: Gap-Closure Live-UAT-Nachbesserung (D-12 "Fehler melden"-Einstiegspunkt) Summary

**Ein einziger, wiederverwendbarer `ReportHintEntryPoint` rendert einen dezenten "Fehler melden"-Textlink auf der öffentlichen Projekt- und Release-Seite, sichtbar ausschließlich für berechtigte, angemeldete Mitglieder, und öffnet dasselbe `ProposalForm`, vorausgewählt über Plan 191-17's `prefill`-Prop.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-10-23T21:01:00Z (approx.)
- **Completed:** 2026-10-23T21:12:00Z (approx.)
- **Tasks:** 2 completed (Task 1 als TDD mit separatem RED/GREEN-Commit, Task 2 als normaler `auto`-Task + ein nachgezogener Testfix-Commit)
- **Files modified:** 7 (2 neu, 5 geändert)

## Accomplishments

- **Task 1:** `ReportHintEntryPoint.tsx` gebaut -- eine `'use client'`-Komponente, die per `useAuthSession()` + `getOwnProfile()` dieselbe `isEligibleForContributions`-Regel aus Plan 191-17 prüft (keine lokale Kopie) und ausschließlich bei positivem Ergebnis einen `Button variant="text" size="sm"` ("Fehler melden") rendert -- für jeden anderen Zustand (nicht initialisiert, nicht angemeldet, ineligibel, Netzwerk-/Serverfehler bei der Prüfung, T-191-25) liefert sie `null`, ohne Fehlertext oder Platzhalter. Bei Klick lädt sie `getMyMemberships()` lazy nach (nur bei tatsächlichem Klick, nicht für jeden Seitenbesuch) und öffnet `ProposalForm` mit `prefill={{ fansubGroupId, fansubGroupName, animeId, animeTitle }}`, den geladenen `ownGroups` und den über `useRoleCatalog('anime_contribution')` + `contributionRoleDefinitions` ermittelten `roleDefinitions`.
- **Task 2:** Mount an den beiden im Plan genannten Stellen: `HeroSection.tsx` (Projektseite, direkt nach `<h1>{anime.title}</h1>`, `fansubGroupId={groupID}`/`fansubGroupName={group.fansub.name}`/`animeId={animeID}`/`animeTitle={anime.title}`) und `ReleaseDetailHero.tsx` (Release-Seite, nach der `heroGroupLine`-Zeile, **nur wenn `props.groups.length === 1`** -- eine Coop-Release mit mehreren Gruppen hat keine eindeutige Zielgruppe für einen Hinweis, bewusste Scope-Grenze). `docs/FRONTEND_ARCHITEKTUR.md` dokumentiert beide wiederverwendbaren Bausteine (`contributionsEligibility.ts`, `ReportHintEntryPoint.tsx`) in Abschnitt 12, damit ein künftiger dritter Einstiegspunkt sie findet statt neu zu bauen.
- **Live-Verifikation auf dem Linux-Dev-Stack:** `/anime/2/group/24` (Projektseite, Bloody-Shadow/Anime 2) und `/anime/2/group/24/releases/152` (Release-Seite mit genau einer Gruppe) liefern nach Container-Neustart beide HTTP 200, ohne JS-Fehler im Container-Log und ohne sichtbaren "Fehler melden"-Link für den anonymen Besucher (erwartetes Gating-Verhalten).

## Task Commits

1. **Task 1 RED: failing Tests für ReportHintEntryPoint** - `7f390f1c8` (test)
2. **Task 1 GREEN: ReportHintEntryPoint-Komponente implementiert** - `6de04a129` (feat)
3. **Task 2: Mount auf Projekt- und Release-Hero + Doku** - `b86be24d8` (feat)
4. **Task 2 Nachzug: HeroSection-/ReleaseDetailHero-Tests gefixt** - `ad4c57e77` (fix, Rule 1)

## Files Created/Modified

- `frontend/src/components/contributions/ReportHintEntryPoint.tsx` - neu: eligibility-gated Einstiegspunkt, fachlicher Kommentar zum Zweistufen-Datenlade-Muster
- `frontend/src/components/contributions/ReportHintEntryPoint.test.tsx` - neu: 6 Tests (4 Sichtbarkeits-Gate-Faelle inkl. T-191-25-Netzwerkfehler, 1 Rendering-Test fuer Button-Eindeutigkeit, 1 Klick-Test fuer korrekte prefill/ownGroups/roleDefinitions-Weitergabe)
- `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` - `ReportHintEntryPoint` direkt nach dem `<h1>` gemountet (Inline-Abstand, kein neuer CSS-Eintrag)
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx` - `ReportHintEntryPoint` nach `heroGroupLine` gemountet, bedingt auf `props.groups.length === 1`
- `frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx` - `ReportHintEntryPoint` auf Null-Render gemockt (Rule 1, Testbreakage durch Task 2 behoben)
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx` - dieselbe Mock-Ergaenzung (Rule 1)
- `docs/FRONTEND_ARCHITEKTUR.md` - Abschnitt 12 um die beiden neuen wiederverwendbaren Bausteine ergaenzt

## Decisions Made

Siehe `key-decisions` im Frontmatter -- insbesondere die lazy-on-click-Ladestrategie fuer `ownGroups` (wortgetreu nach `<behavior>`), das Inline-style statt neuer CSS-Klassen (gleiche Begruendung wie Plan 191-17), und das Mocken von `ReportHintEntryPoint` in den beiden bestehenden Hero-Layout-Testdateien statt eines zusaetzlichen `RoleCatalogProvider`-Wrappers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint `react-hooks/set-state-in-effect` in der Eligibility-Pruefung**
- **Found during:** Task 1 (Lint-Lauf nach Task 2)
- **Issue:** Der fruehe `return`-Zweig fuer "keine Auth-Session" rief `setEligibility('ineligible')` synchron im Effekt-Body auf, was das Projekt-ESLint als potenziell kaskadierende Re-Renders markiert.
- **Fix:** `// eslint-disable-next-line react-hooks/set-state-in-effect` ergaenzt -- exakt dasselbe, bereits etablierte Muster wie in `useFansubEditGroupLoad.ts` fuer denselben Fall (frueher Guard-Return mit synchronem setState).
- **Files modified:** `frontend/src/components/contributions/ReportHintEntryPoint.tsx`
- **Verification:** `npx eslint` auf die betroffene Datei danach fehlerfrei; alle 6 Komponenten-Tests weiterhin gruen.
- **Committed in:** `b86be24d8`

**2. [Rule 1 - Bug] Zwei bestehende Hero-Layout-Tests brachen durch den neuen Mount-Punkt**
- **Found during:** Task 2 (Breiter Testlauf `src/app/anime/[id]/group/[groupId]`)
- **Issue:** `page.test.tsx` (`HeroSection navigation`) und `ReleaseDetailHero.test.tsx` rendern `HeroSection`/`ReleaseDetailHero` direkt ohne den root-level `RoleCatalogProvider` -- nach dem Mounten von `ReportHintEntryPoint` (das `useRoleCatalog` aufruft) warfen 5 Tests mit "useRoleCatalog must be used within RoleCatalogProvider".
- **Fix:** `ReportHintEntryPoint` in beiden Testdateien auf einen Null-Render-Stub gemockt (`vi.mock('@/components/contributions/ReportHintEntryPoint', () => ({ ReportHintEntryPoint: () => null }))`) -- die Komponente hat bereits eigene, dedizierte Tests; diese Hero-Tests pruefen reine Navigations-/Layout-Assertions.
- **Files modified:** `frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx`, `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx`
- **Verification:** `npm run test -- "src/app/anime/[id]/group/[groupId]"` danach 19/19 Testdateien gruen, 156/156 Tests.
- **Committed in:** `ad4c57e77`

## Issues Encountered

Voller Frontend-Testlauf (`npm run test`, 416 Dateien/3788 Tests): 4 Testdateien schlagen fehl, **keine davon im Scope dieses Plans**:

1. `src/components/profile/badgeArtwork.test.ts` -- erfordert `API_INTERNAL_URL` (umgebungsabhaengiger Gate-Test, nur im Compose-Service lauffaehig), bereits in Plan 191-17-SUMMARY als vorbestehend dokumentiert.
2. `src/components/ui/ResponsiveImage.config.test.ts` -- `hasRemoteMatch`-Assertion, bereits in Plan 191-15/17-SUMMARY als vorbestehend dokumentiert.
3. `src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts` -- `ENOENT: /backend/internal/permissions/permissions.go`, umgebungsabhaengiger Pfadzugriff, bereits in Plan 191-15/17-SUMMARY als vorbestehend dokumentiert.
4. `src/app/dev/ui-system/showcase/AchievementBadgeShowcase.test.tsx` -- ein Test timeoutete unter der Last des vollen parallelen Suite-Laufs; isoliert erneut ausgefuehrt (`npm run test -- AchievementBadgeShowcase`) liefen alle 7 Tests dieser Datei in 6.86s vollstaendig gruen -- flaky unter Last, nicht durch diesen Plan verursacht (die Datei gehoert zum `dev/ui-system`-Showcase, keine Beruehrung mit Contributions/Hero-Komponenten).

Der scope-genaue Verify-Befehl des Plans (`npm --prefix frontend run test -- ReportHintEntryPoint` sowie `npm --prefix frontend run typecheck`) ist vollstaendig gruen, ebenso die gesamte `src/app/anime/[id]/group/[groupId]`-Familie (19 Dateien, 156 Tests) und die gesamte `src/components/contributions`-Familie (12 Dateien, 68 Tests).

## User Setup Required

None - keine externe Service-Konfiguration noetig.

## Next Phase Readiness

- Live-Verifikation (D-16-Checkpoint, Plan 191-10 Task 2) kann jetzt zusaetzlich den D-12-Einstiegspunkt pruefen: `/anime/2/group/24` (Bloody-Shadow-Projektseite) und `/anime/2/group/24/releases/152` (zugehoerige Release-Seite mit genau einer Gruppe) sind reale, lokal erreichbare Beispielrouten mit dem neuen Mount-Punkt.
- Frontend-Container (`team4sv30-frontend`) laeuft nach Neustart fehlerfrei; `/`, `/fansubs`, `/me/contributions`, `/anime/2/group/24`, `/anime/2/group/24/releases/152` liefern alle HTTP 200.
- D-12 ist aus Sicht der UI vollstaendig umgesetzt -- die naechste offene Arbeit in `191-CONTEXT.md` ist der uebergreifende Live-Checkpoint aus Plan 191-10 Task 2 (D-16), nicht ein weiterer Nachbesserungsplan fuer D-12 selbst.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*

## Self-Check: PASSED

Alle 8 genannten Dateien existieren auf der Festplatte, alle 4 Task-Commit-Hashes
(`7f390f1c8`, `6de04a129`, `b86be24d8`, `ad4c57e77`) sind per `git log --oneline --all | grep`
im Git-Verlauf auffindbar.
