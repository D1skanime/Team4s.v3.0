---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 17
subsystem: testing
tags: [react, vitest, testing-library, storybook, anime, fansubs, watchlist, hooks]

requires:
  - phase: 192-09
    provides: "useFansubGroupSwitch/useWatchlistAction hooks und das etablierte renderHook+Component(props)+elements()-Baum-Direktaufruf-Muster statt fireEvent/userEvent (Befund 25)"
  - phase: 192-14
    provides: "AnimeEdgeNavigation.module.css/.tsx Layout-Bereinigung (previewCard ueber Card/Cluster) -- diese Plan beruehrt dieselbe Komponente nur auf der Hover-Zustandslogik-Ebene, kein Konflikt"
provides:
  - "useAnimeEdgeNavigationHover.ts: neuer, direkt testbarer Hook fuer AnimeEdgeNavigations Hover-/Fokus-Vorschauzustand (hoverDirection/previewAnime/previewCoverUrl/handlersFor)"
  - "AnimeEdgeNavigation.test.tsx: Hover-Test ruft den neuen Hook per renderHook direkt auf statt fireEvent.mouseEnter/mouseLeave"
  - "FansubVersionBrowser.test.tsx: Gruppenwechsel-Href-Test ruft useFansubGroupSwitch direkt per renderHook auf statt zweimal fireEvent.click"
  - "WatchlistAddButton.test.tsx: neuer direkter useWatchlistAction-Hook-Test belegt den 'disabled bis Status aufgeloest'-No-Op als Fachregel, ersetzt den bisherigen render()+fireEvent.click-Test"
  - "AnimeDetailView.stories.tsx: 'Merkliste umschalten'-Story (userEvent.click-play-Funktion) entfernt, als reiner Anzeige-Fall 'Merkliste (als Mitglied)' umbenannt"
affects: [192-final-verification]

tech-stack:
  added: []
  patterns:
    - "Hover-/Fokus-Zustandslogik hinter mehreren DOM-Ereignis-Handlern (mouseEnter/mouseLeave/focus/blur/touchStart) wird -- wie zuvor Klick-Logik in 192-09 -- in einen eigenen, parametrisierten Hook ausgelagert, der eine handlersFor(richtung)-Fabrikfunktion statt fuenf einzelner Event-Props zurueckgibt"
    - "Ein render()+fireEvent.click-Test, dessen reale Garantie (hier: 'Button bleibt deaktiviert, solange der Status nicht aufgeloest ist') bereits vollstaendig als Hook-Invariante (handleToggle ist ein No-Op fuer jeden Status ausser present/absent) ausdrueckbar ist, wird auf einen direkten renderHook-Test umgestellt, auch wenn 192-09 ihn zuvor bewusst als Ausnahme behalten hatte -- eine Ausnahme bleibt nur so lange bestehen, wie der Branch sie nicht ohnehin schon anfasst"
    - "Eine Storybook-play-Funktion mit userEvent.click wird ersatzlos entfernt (nicht durch eine andere Simulationsform ersetzt), wenn die zugrundeliegende Fachlogik bereits ueber einen direkten Hook-Test bewiesen ist -- echte Klickablaeufe bleiben Live-UAT-Sache"

key-files:
  created:
    - frontend/src/components/anime/useAnimeEdgeNavigationHover.ts
  modified:
    - frontend/src/components/anime/AnimeEdgeNavigation.tsx
    - frontend/src/components/anime/AnimeEdgeNavigation.test.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.test.tsx
    - frontend/src/components/watchlist/WatchlistAddButton.test.tsx
    - frontend/src/app/anime/[id]/AnimeDetailView.stories.tsx

key-decisions:
  - "WatchlistAddButton.test.tsx's 'blocks both actions until status resolves, ignoring the old SSR hint' render()+fireEvent-Test wurde vollstaendig entfernt statt per Component(props)+onClick-Direktaufruf konvertiert: der getestete initiallyInWatchlist-Prop ist in WatchlistAction (WatchlistAddButton.tsx) bereits toter, unbenutzter Code (nur Kompatibilitaets-Kommentar, nie destrukturiert) -- es gibt keine eigene SSR-Hint-spezifische Abdeckung mehr zu bewahren. Die reale Garantie ('kein Klick-Effekt, solange der Status nicht aufgeloest ist') ist als neuer direkter useWatchlistAction-Hook-Test ('ist ein No-Op, solange der Watchliststatus noch nicht aufgeloest ist') voll abgedeckt -- derselbe handleToggle-Guard (status !== 'present' && status !== 'absent'), den der alte DOM-Test nur indirekt bewies."
  - "FansubVersionBrowser.test.tsx's Gruppenwechsel-Href-Test nutzt renderHook(useFansubGroupSwitch) statt eines Component(props)+elements()-Baum-Direktaufrufs, weil der fachlich interessante Teil (welche Gruppe nach einem Wechsel aktiv ist) vollstaendig in useFansubGroupSwitch lebt -- die href-Bauweise selbst (FansubGroupContext liest activeGroup.slug direkt in ein Button-href-Template) ist trivial und wird gegen dieselben Pfad-Bauer (buildPublicFansubProjectPath) geprueft, die die Produktionskomponente tatsaechlich verwendet."
  - "AnimeDetailView.stories.tsx's 'Merkliste umschalten'-Story wurde zu 'Merkliste (als Mitglied)' (Export MerklistenAlsMitglied) umbenannt, da der alte Name nach dem Entfernen der play-Funktion einen weiterhin bestehenden interaktiven Testablauf suggerieren wuerde -- sie bleibt ein reiner Anzeige-Fall (angemeldetes Mitglied sieht den echten Merklisten-Button statt 'Anmeldung erforderlich')."

patterns-established:
  - "Eine von einer frueheren Gap-Runde (192-09) bewusst als Ausnahme behaltene fireEvent-basierte Testabdeckung wird in der naechsten Runde, die dieselbe Datei ohnehin anfasst, vollstaendig konvertiert statt die Ausnahme fortzuschreiben -- 'Dateien, die dieser Branch bereits veraendert hat' bleiben in Scope, auch wenn der konkrete Test nicht in der urspruenglichen Plan-Dateiliste stand."

requirements-completed: [Befund-C]

duration: ~16min
completed: 2026-11-04
---

# Phase 192 Plan 17: Letzte fireEvent/userEvent-Vorkommen entfernen (Befund C) Summary

**AnimeEdgeNavigations Hover-/Fokus-Vorschaulogik wandert in einen neuen, direkt testbaren Hook (useAnimeEdgeNavigationHover); die drei verbleibenden fireEvent/userEvent-Stellen in FansubVersionBrowser.test.tsx, WatchlistAddButton.test.tsx und AnimeDetailView.stories.tsx werden auf das in Plan 192-09 etablierte Direktaufruf-Muster umgestellt -- der gesamte Branch enthaelt jetzt null fireEvent/userEvent-Aufrufe in neuen/erweiterten Tests.**

## Performance

- **Duration:** ~16 min (Task-Commits)
- **Started:** 2026-11-04T22:51:00Z
- **Completed:** 2026-11-04T23:02:27Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- `useAnimeEdgeNavigationHover.ts`: neuer Hook uebernimmt `AnimeEdgeNavigationContext`s komplette Hover-/Fokus-Zustandslogik (welche Richtung gehovert/fokussiert ist -> welches Vorschau-Anime/Cover-URL daraus folgt) inklusive der fuenf Event-Handler (`handlersFor(direction)`), nach exakt demselben Auslagerungsmuster wie `useFansubGroupSwitch`/`useWatchlistAction` (Plan 192-09). `AnimeEdgeNavigation.tsx` ist jetzt ein reiner Konsument, Verhalten unveraendert (`npx tsc --noEmit` clean, alle 5 Tests der Datei gruen).
- `AnimeEdgeNavigation.test.tsx`: der Hover-Test ruft `useAnimeEdgeNavigationHover` jetzt per `renderHook`/`act` direkt auf und prueft `hoverDirection`/`previewAnime` nach `onMouseEnter`/`onMouseLeave` -- kein `fireEvent.mouseEnter`/`mouseLeave` mehr in der Datei.
- `FansubVersionBrowser.test.tsx`: der Test `'verlinkt Zur-Fansub-Gruppe und Zum-Projekt...'` ruft `useFansubGroupSwitch` per `renderHook` direkt auf (`updateFansubSelection(7)`/`updateFansubSelection(9)`) und prueft die daraus abgeleitete aktive Gruppen-Slug gegen dieselben Pfad-Bauer (`/fansubs/${slug}`, `buildPublicFansubProjectPath`), die `FansubGroupContext` tatsaechlich verwendet -- kein `fireEvent.click` mehr in diesem Test (28 andere, nicht in diesem Plan benannte `fireEvent.click`-Aufrufe in derselben Datei bleiben bewusst unveraendert, siehe Scope-Grenze unten).
- `WatchlistAddButton.test.tsx`: der render()+fireEvent-Test `'blocks both actions until status resolves...'` wurde entfernt; ein neuer direkter `useWatchlistAction`-Hook-Test (`'ist ein No-Op, solange der Watchliststatus noch nicht aufgeloest ist'`) belegt dieselbe Fachregel (`handleToggle` ist ein No-Op fuer jeden Status ausser `present`/`absent`) ohne Rendering/`fireEvent`.
- `AnimeDetailView.stories.tsx`: die `play`-Funktion (`userEvent.click`) der Story "Merkliste umschalten" ist entfernt; die Story heisst jetzt "Merkliste (als Mitglied)" (`MerklistenAlsMitglied`) und bleibt ein reiner Anzeige-Fall. Live per Playwright gegen die bereits laufende lokale Storybook-Instanz (`docker compose`, Port 6006) bestaetigt: die umbenannte Story erscheint korrekt im Story-Index, rendert ohne Konsolenfehler und zeigt den echten "Zur Watchlist"-Button (nicht "Anmeldung erforderlich") fuer `team4sRole: mitglied`.
- Volle Regressionssuite (`npx vitest run`, 5757 Tests): nach dieser Plan-Aenderung bleiben nur die drei bereits vorher dokumentierten/umgebungsbedingten, unveraendert vom Scope dieses Plans entfernten Fehlschlaege (siehe Issues Encountered) -- keine neuen Fehlschlaege.

## Task Commits

Each task was committed atomically:

1. **Task 1: AnimeEdgeNavigation -- Hover-Vorschaulogik in eigenen Hook ausgelagert; zwei fireEvent-Tests konvertiert** - `17bf31788` (refactor)
2. **Task 2: letzte drei fireEvent/userEvent-Vorkommen entfernen (FansubVersionBrowser, WatchlistAddButton, AnimeDetailView-Story)** - `480b9430e` (test)

**Plan metadata:** committed alongside this SUMMARY/STATE/ROADMAP update

## Files Created/Modified

- `frontend/src/components/anime/useAnimeEdgeNavigationHover.ts` (new) - Hover-/Fokus-Vorschauzustandsautomat (`hoverDirection`/`previewAnime`/`previewCoverUrl`/`handlersFor`), direkt per `renderHook` testbar
- `frontend/src/components/anime/AnimeEdgeNavigation.tsx` - `AnimeEdgeNavigationContext` konsumiert jetzt den neuen Hook statt eigenen `useState`/`withPreviewHandlers`-Closures; `getCoverUrl`-Import entfernt (lebt jetzt im Hook)
- `frontend/src/components/anime/AnimeEdgeNavigation.test.tsx` - Hover-Test auf `renderHook(useAnimeEdgeNavigationHover)` + direkte `handlersFor('next').onMouseEnter()/.onMouseLeave()`-Aufrufe umgestellt, `fireEvent`-Import entfernt
- `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx` - Gruppenwechsel-Href-Test auf `renderHook(useFansubGroupSwitch)` + `buildPublicFansubProjectPath`-Vergleich umgestellt; `buildPublicFansubProjectPath`-Import ergaenzt
- `frontend/src/components/watchlist/WatchlistAddButton.test.tsx` - alten render()+fireEvent-Test entfernt; neuen direkten `useWatchlistAction`-No-Op-Test (Status noch nicht aufgeloest) ergaenzt
- `frontend/src/app/anime/[id]/AnimeDetailView.stories.tsx` - `play`-Funktion/`userEvent`/`within`-Imports entfernt, Story `MerklistenToggle` -> `MerklistenAlsMitglied` ("Merkliste umschalten" -> "Merkliste (als Mitglied)") umbenannt

## Decisions Made

See `key-decisions` in frontmatter for the full reasoning on dropping the WatchlistAddButton SSR-hint test entirely (dead prop, equivalent coverage already existing), the `renderHook`-over-`elements()`-tree choice for the FansubVersionBrowser conversion, and the story rename.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/CLAUDE.md-Verstoss] Eigener Kommentar enthielt einen verbotenen Plan-Dateiverweis**
- **Found during:** Post-Task-2 full regression run (`npx vitest run`)
- **Issue:** Mein eigener, neu verfasster Kommentar in `AnimeDetailView.stories.tsx` referenzierte `(Plan 192-09)` als reine Begruendung -- genau das von CLAUDE.md ("Verboten in Code-Kommentaren") und dem automatisierten `processHistory.regression.test.ts`-Gate verbotene Muster (`Plan\s*\d+-\d+`). Der Test schlug fehl: `Plan-Dateiverweis (Plan 192-09): expected [...] to deeply equal []`.
- **Fix:** Kommentar umformuliert -- die fachliche Begruendung (play-Funktionen simulieren keinen echten Nutzerablauf, die Fachlogik ist bereits ueber `useWatchlistAction`s Hook-Tests bewiesen, echte Klickablaeufe werden live abgenommen) bleibt vollstaendig erhalten, nur der Plan-Nummern-Verweis entfaellt.
- **Files modified:** `frontend/src/app/anime/[id]/AnimeDetailView.stories.tsx` (bereits Teil des Task-2-Commits, vor dem Commit korrigiert)
- **Verification:** `npx vitest run src/components/ui/processHistory.regression.test.ts` gruen (237 Tests); volle Regressionssuite danach erneut gepruefte, keine neuen Fehlschlaege.
- **Committed in:** `480b9430e` (Task 2 commit -- Fund und Korrektur erfolgten VOR dem Commit, kein separater Fix-Commit noetig)

---

**Total deviations:** 1 auto-fixed (1 CLAUDE.md-Konventions-Verstoss, vor dem Commit korrigiert)
**Impact on plan:** Keine Verhaltens- oder Scope-Aenderung -- reine Kommentar-Korrektur, bevor der Task-2-Commit entstand. Kein Scope-Creep.

## Issues Encountered

- Die volle Regressionssuite (`npx vitest run`, 5757 Tests) zeigt drei Fehlschlaege, alle nachweislich unabhaengig von diesem Plan:
  1. `src/components/profile/badgeArtwork.test.ts` -- verlangt `API_INTERNAL_URL` (nur im Linux-Compose-Backend-Kontext gesetzt, nicht in diesem Frontend-only-Testlauf). Umgebungsbedingtes Gate, kein Code-Fehler.
  2. `src/components/ui/ResponsiveImage.config.test.ts` -- bereits in `deferred-items.md` unter Plan 192-02 dokumentiert, erneut bestaetigt unabhaengig (kein von diesem Plan beruehrtes File ueberlappt `ResponsiveImage`/`next.config.mjs`).
  3. `src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts` -- verlangt eine gemountete `/backend/internal/permissions/permissions.go`-Quelle (nur im vollen Docker-Compose-Checkout vorhanden, nicht in diesem Frontend-Arbeitsverzeichnis). Umgebungsbedingtes Gate, kein Code-Fehler, kein von diesem Plan beruehrtes File betroffen.
  Keiner der drei beruehrt ein von diesem Plan geaendertes File -- nicht in `deferred-items.md` neu aufgenommen, da (1) und (3) reine Laufzeitumgebungs-Gates sind (keine Code-Regression) und (2) bereits dokumentiert ist.
- Die Storybook-`test-storybook`-CLI unterstuetzt kein Filtern nach Story-Name/-ID; eine volle Suite gegen alle Stories waere unverhaeltnismaessig lang und ausserhalb des Scopes gewesen. Stattdessen wurde die umbenannte Story gezielt per Playwright gegen die bereits laufende lokale Storybook-Instanz (`docker compose`, Port 6006) verifiziert (Story-Index-Eintrag korrekt, kein Konsolenfehler, korrekter Button-Text fuer `team4sRole: mitglied`) -- gleichwertiger Nachweis zum geforderten Smoke-Check.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Befund C ist vollstaendig geschlossen: `grep -rn "fireEvent\." frontend/src/components/anime/AnimeEdgeNavigation.test.tsx` sowie die beiden benannten Tests in `FansubVersionBrowser.test.tsx`/`WatchlistAddButton.test.tsx` und `userEvent` in `AnimeDetailView.stories.tsx` zeigen nur noch Erwaehnungen in Testnamen/Kommentaren (als Begruendung "statt fireEvent/userEvent"), keine tatsaechlichen Aufrufe mehr.
- Andere, nicht in diesem Plan benannte `fireEvent.click`-Stellen in `FansubVersionBrowser.test.tsx` (28 verbleibende) und `WatchlistAddButton.test.tsx` (5 verbleibende) sind bewusst unveraendert -- sie gehoeren zu Tests, die dieser Branch nicht neu geschaffen/erweitert hat, und sind laut `192-CONTEXT.md`s Befund-C-Entscheidung explizit ausserhalb des Scopes dieser Runde.
- Keine Blocker fuer die finale Verifikationsrunde dieser Phase.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*

## Self-Check: PASSED

All 6 claimed created/modified files confirmed present on disk; both task commits
(`17bf31788`, `480b9430e`) confirmed present in `git log --oneline --all`.
