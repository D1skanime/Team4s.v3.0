---
phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug
plan: 03
subsystem: ui
tags: [nextjs, react, css-modules, vitest, fansubs]

# Dependency graph
requires:
  - phase: 190-02
    provides: "Live-Checkpoint D-p abgeschlossen, Hero-Rahmen/Status-Dopplung bereits erledigt"
provides:
  - "resolveMemberSectionLabel(status, count) in fansub-team-labels.ts — einzige Quelle fuer die status-abhaengige Mitglieder-Ueberschrift"
  - "group.status als durchgereichter Prop von page.tsx bis FansubTeamActiveGroup"
  - "Wiederverwendetes useClampedOverflow-Zitat-Clamp (2-3 Zeilen, auf/zu-klappbar) in beiden Team-Untergruppen"
  - "Kein per-Karte 'unbestaetigt'-Badge mehr; Hinweis einmalig in der Historische-Nennungen-Ueberschrift"
affects: [190-04, 190-05, 190-06, 190-07, 190-08, 190-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Record+accessor-Pattern (wie getFansubStatusLabel) fuer eine zweite, schmalere status-abhaengige Labelfunktion wiederverwendet statt If/Else-Kaskade"
    - "useClampedOverflow-Hook (bereits fuer FansubStoryBlock etabliert) auf eine zweite Content-Art (Zitate statt Rich-Text) angewendet, keine Neuimplementierung"

key-files:
  created:
    - frontend/src/lib/fansub-team-labels.ts
    - frontend/src/lib/fansub-team-labels.test.ts
  modified:
    - "frontend/src/app/fansubs/[slug]/page.tsx"
    - "frontend/src/app/fansubs/[slug]/page.test.tsx"
    - frontend/src/components/fansubs/FansubTeamSection.tsx
    - frontend/src/components/fansubs/__tests__/FansubTeamSection.test.tsx
    - frontend/src/components/fansubs/FansubTeamActiveGroup.tsx
    - frontend/src/components/fansubs/__tests__/FansubTeamActiveGroup.test.tsx
    - frontend/src/components/fansubs/FansubTeamHistoricalGroup.tsx
    - frontend/src/components/fansubs/__tests__/FansubTeamHistoricalGroup.test.tsx
    - frontend/src/components/fansubs/FansubTeamSection.module.css
    - frontend/src/app/dev/ui-system/showcase/PublicFansubSurfacesShowcase.tsx

key-decisions:
  - "status als Pflicht-Prop (nicht optional) auf FansubTeamSectionProps/FansubTeamActiveGroupProps eingefuehrt, damit kein Call-Site ohne Status unbemerkt auf den alten hartkodierten Text zurueckfaellt — erzwingt den Fix an allen drei Call-Sites (page.tsx, Showcase, Komponententests) sofort als Typfehler statt still falsch zu rendern"
  - "Clamp-Zielwert 3.6rem (statt der 8.5rem von FansubStoryBlock) gewaehlt, weil .memberSlogan mit 13px/1.4 eine deutlich kleinere Schrift ist als Story-Fliesstext — 2-3 Zeilen bei dieser Groesse entsprechen ca. 3.6rem, nicht dem Story-Wert"
  - "unconfirmed-Badge entfernt, aber unconfirmed-Filterlogik (claimed === false) unveraendert als Datenquelle fuer die Teilgruppe beibehalten — nur die Anzeige wandert von Karte zu Ueberschrift"

patterns-established:
  - "Status-abhaengige UI-Strings bekommen eine einzige exportierte Pure-Function (Record+Accessor), nie zwei parallele If/Else-Kaskaden fuer dieselbe FansubStatus-Union (gleiches Prinzip wie bereits in 190-01 fuer den Badge/Meta-Zeilen-Status etabliert)"

requirements-completed: [D-c, D-e, D-q, D-f, D-g]

# Metrics
duration: ~25min
completed: 2026-10-21
---

# Phase 190 Plan 03: Team- und Hero-Kennzahlen-Textarbeit Summary

**Hero-Kennzahl zeigt "Releases", Mitglieder-Ueberschrift ist status-abhaengig ("Aktive Mitglieder" nur bei `active`), Team-Zitate klemmen auf 2-3 Zeilen mit Mehr/Weniger-Toggle, und das "unbestaetigt"-Badge sitzt nur noch einmal in der Abschnittsueberschrift statt auf jeder Karte.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-21T11:19:00Z (approx.)
- **Completed:** 2026-10-21T11:36:00Z
- **Tasks:** 3
- **Files modified:** 12 (2 neu, 10 geaendert)

## Accomplishments
- Neue `frontend/src/lib/fansub-team-labels.ts` mit `resolveMemberSectionLabel(status, count)`: `"Aktive Mitglieder · N"` nur bei `status === 'active'`, sonst einheitlich `"Mitglieder · N"` fuer `inactive` UND `dissolved` (D-q, keine Sonderbehandlung von `dissolved`).
- `group.status` fliesst jetzt von `page.tsx` durch `FansubTeamSection` bis in `FansubTeamActiveGroup`, wo die zuvor hartkodierte Ueberschrift durch den Aufruf der neuen Pure-Function ersetzt wurde.
- Hero-Kennzahl `"Release-Versionen"` heisst jetzt `"Releases"` (D-c).
- `member.member_slogan` wird in beiden Team-Untergruppen (`FansubTeamActiveGroup`, `FansubTeamHistoricalGroup`) ueber den bereits bestehenden `useClampedOverflow`-Hook auf ca. 2-3 Zeilen (`max-height: 3.6rem`) geklemmt und per "Mehr anzeigen"/"Weniger anzeigen"-Button aufklappbar — identisches Muster wie `FansubStoryBlock`, keine Neuimplementierung (D-f).
- Das per-Karte "unbestaetigt"-Badge in `FansubTeamHistoricalGroup` ist entfernt; der Hinweis steht jetzt einmalig in der Abschnittsueberschrift: `"Historische Nennungen (unbestaetigt) · N"` (D-g).

## Task Commits

Each task was committed atomically:

1. **Task 1: Hero-Label "Releases" + status-abhaengige Mitglieder-Ueberschrift (D-c, D-e/D-q)** - `1d5e5b5dd` (feat)
2. **Task 2: Zitat-Clamp in Team-Karten (D-f)** - `7a49d4090` (feat)
3. **Task 3: "unbestaetigt"-Badge entfernen, Hinweis in Ueberschrift (D-g)** - `a1c401959` (fix)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `frontend/src/lib/fansub-team-labels.ts` - neu: `resolveMemberSectionLabel(status, count)`
- `frontend/src/lib/fansub-team-labels.test.ts` - neu: Logik-Tests fuer alle drei `FansubStatus`-Werte
- `frontend/src/app/fansubs/[slug]/page.tsx` - Hero-Label "Releases"; `status={group.status}` an `FansubTeamSection` durchgereicht
- `frontend/src/app/fansubs/[slug]/page.test.tsx` - Metrik-Assertion auf "Releases" aktualisiert
- `frontend/src/components/fansubs/FansubTeamSection.tsx` - `status`-Prop ergaenzt, an `FansubTeamActiveGroup` durchgereicht (nicht an `FansubTeamHistoricalGroup`)
- `frontend/src/components/fansubs/__tests__/FansubTeamSection.test.tsx` - `status="active"` an beiden Render-Aufrufen ergaenzt
- `frontend/src/components/fansubs/FansubTeamActiveGroup.tsx` - `'use client'` ergaenzt; nutzt `resolveMemberSectionLabel`; Zitat-Clamp via `useClampedOverflow`
- `frontend/src/components/fansubs/__tests__/FansubTeamActiveGroup.test.tsx` - `status="active"` an beiden Render-Aufrufen ergaenzt (Rule 3: Typfehler durch neuen Pflicht-Prop)
- `frontend/src/components/fansubs/FansubTeamHistoricalGroup.tsx` - Zitat-Clamp via `useClampedOverflow`; `unconfirmed`-Badge entfernt, Hinweis in Ueberschrift verschoben
- `frontend/src/components/fansubs/__tests__/FansubTeamHistoricalGroup.test.tsx` - Assertion auf entferntem Badge durch Heading-Assertion ersetzt
- `frontend/src/components/fansubs/FansubTeamSection.module.css` - neue Regeln `.quoteClamped`/`.quoteExpanded`
- `frontend/src/app/dev/ui-system/showcase/PublicFansubSurfacesShowcase.tsx` - `status="active"` ergaenzt (Rule 3: Typfehler durch neuen Pflicht-Prop)

## Decisions Made
- `status` als Pflicht-Prop (nicht optional mit Default) eingefuehrt, damit jede Call-Site den Status explizit angeben muss — verhindert stilles Fallback-Verhalten an vergessenen Aufrufstellen.
- Clamp-Zielwert `3.6rem` statt der `8.5rem` aus `FansubStoryBlock` gewaehlt, weil `.memberSlogan` mit 13px/1.4 deutlich kleiner ist als Story-Fliesstext (siehe 190-PATTERNS.md-Hinweis dazu).
- `unconfirmed`-Filterlogik (`claimed === false`) bleibt unveraendert als Datenquelle der Teilgruppe; nur die visuelle Badge-Anzeige entfaellt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `status`-Prop an zwei weiteren Call-Sites nachgezogen, die nicht in der Plan-Dateiliste standen**
- **Found during:** Task 1 (`status`-Prop auf `FansubTeamSectionProps`/`FansubTeamActiveGroupProps` als Pflichtfeld eingefuehrt)
- **Issue:** `tsc --noEmit` zeigte Typfehler an zwei Stellen, die der Plan nicht in `files_modified` gelistet hatte: `frontend/src/app/dev/ui-system/showcase/PublicFansubSurfacesShowcase.tsx` (Showcase-Verwendung von `FansubTeamSection`) und `frontend/src/components/fansubs/__tests__/FansubTeamActiveGroup.test.tsx` (direkter Test von `FansubTeamActiveGroup`, unabhaengig vom im Plan explizit genannten `FansubTeamSection.test.tsx`)
- **Fix:** `status="active"` an beiden Stellen ergaenzt (Showcase zeigt bereits aktive Beispieldaten; Test deckt bereits nur aktive Mitglieder ab)
- **Files modified:** `frontend/src/app/dev/ui-system/showcase/PublicFansubSurfacesShowcase.tsx`, `frontend/src/components/fansubs/__tests__/FansubTeamActiveGroup.test.tsx`
- **Verification:** `npx tsc --noEmit` zeigt keine aus diesem Plan stammenden Fehler mehr; betroffene Testdatei gruen
- **Committed in:** `1d5e5b5dd` (Task 1 commit)

**2. [Out-of-scope, nicht gefixt] Vorbestehender, nicht zusammenhaengender Testfehler in `DefaultCrewManager.test.tsx`**
- **Found during:** Task 2 Verifikation (`npm test` Volllauf)
- **Issue:** `DefaultCrewManager.test.tsx > ruft applyDefaultCrew auf und zeigt Ergebnis-Feedback nach Klick` schlug in diesem Lauf fehl (`expected true to be false` auf `button.disabled`); Datei wurde zuletzt in Commit `ae71aa18b` (Phase 176) geaendert, keine Beruehrung durch diesen Plan. Beim erneuten Volllauf fuer Task 3 war derselbe Test wieder gruen (3653/3656 bestanden) — wirkt flaky/timing-abhaengig, nicht durch 190-03 verursacht.
- **Fix:** Nicht gefixt (Scope-Grenze: nur Dateien anfassen, die dieser Plan ohnehin aendert). In `deferred-items.md` dokumentiert statt behoben.
- **Files modified:** keine (nur Dokumentation in `.planning/phases/190-.../deferred-items.md`)
- **Committed in:** `7a49d4090` (Task 2 commit, Dokumentation mitcommittet)

---

**Total deviations:** 2 (1 Rule-3-Autofix, 1 dokumentiert/nicht gefixt)
**Impact on plan:** Beide Abweichungen notwendig bzw. korrekt behandelt — der Rule-3-Fix war zwingend fuer einen gruenen Typecheck, der dokumentierte Fund liegt ausserhalb des Scopes dieses Plans. Kein Scope-Creep in den Kernaenderungen (D-c/D-e/D-q/D-f/D-g).

## Issues Encountered
- Beim ersten Entwurf von Task 2 wurde versehentlich auch das `unconfirmed`-Badge aus `FansubTeamHistoricalGroup.tsx` entfernt (das ist eigentlich Task 3s Aenderung). Vor dem Commit korrigiert: Badge/`unconfirmed`-Prop fuer Task 2 wiederhergestellt, sodass Task 2 ausschliesslich den Zitat-Clamp liefert und Task 3 die Badge-Entfernung als eigener, klar abgegrenzter Commit folgt.
- `npm test` im Container ueberschreitet das 120s-Default-Timeout des Bash-Tools (~130-145s Laufzeit); beide Volllaeufe wurden als Background-Task gestartet und per Notification abgewartet statt per Sleep-Polling.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 190-03 ist abgeschlossen; Full suite (3653 Tests) und Typecheck (bis auf einen vorbestehenden, nicht zusammenhaengenden `.next`-generierten Typfehler in `app/anime/page.ts`, der gitignored und nicht Teil dieses Repos-Quellcodes ist) sind gruen. Frontend-Container wurde nach dem letzten Commit neu gestartet (`docker restart team4sv30-frontend`), bereit fuer Live-Verifikation auf `/fansubs/<slug>` falls eine folgende Plan-Welle das benoetigt. Keine Blocker fuer 190-04 ff.

## Self-Check: PASSED

All created/modified files confirmed present on disk; all three task commits (`1d5e5b5dd`, `7a49d4090`, `a1c401959`) confirmed present in `git log --oneline --all`.

---
*Phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug*
*Completed: 2026-10-21*
