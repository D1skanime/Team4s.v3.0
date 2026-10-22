---
phase: quick-261022-ap1
plan: 01
subsystem: ui
tags: [react, nextjs, typescript, fansubs, vitest]

requires:
  - phase: 190
    provides: FansubTeamMemorialBlock.tsx / FansubTeamSection.tsx (Memorial-Block auf der öffentlichen Fansub-Gruppenseite, identifizierter Rest-Befund WR-01)
provides:
  - "Pure, unit-getestete Key-Funktion buildFansubMemorialKey(source, id) in frontend/src/lib/"
  - "Kollisionsfreier React-Key im Memorial-Block, gebildet aus Quelle+id statt member_display_name"
  - "FansubTeamMemorialEntry-Typ als expliziter Träger der Herkunft (member/historical) zwischen FansubTeamSection.tsx und FansubTeamMemorialBlock.tsx"
affects: [fansubs, public-group-page]

tech-stack:
  added: []
  patterns:
    - "Herkunfts-Discriminator (source: 'member'|'historical') wird dort gesetzt, wo er eindeutig bekannt ist (FansubTeamSection.tsx), statt im Konsumenten strukturell zu erraten"

key-files:
  created:
    - frontend/src/lib/fansub-memorial-key.ts
    - frontend/src/lib/fansub-memorial-key.test.ts
  modified:
    - frontend/src/components/fansubs/FansubTeamMemorialBlock.tsx
    - frontend/src/components/fansubs/FansubTeamSection.tsx

key-decisions:
  - "Quelle wird als getaggtes Entry-Objekt ({ source, row }) durchgereicht statt per struktureller Discriminator-Erkennung im Memorial-Block, weil DomainProjectionMemberRow/HistoricalRow keinen zuverlässigen Laufzeit-Discriminator teilen (joined_year/left_year existiert nur auf dem historischen Typ, ist aber nicht als Discriminator-Feld gedacht)."
  - "Risiko-Sweep nach ähnlichen key={...display_name}-Stellen wurde nur beobachtet und dokumentiert, nicht verändert (explizit per Plan-Scope ausgeschlossen)."

patterns-established:
  - "Pure Key-Bildungsfunktionen für Listen mit potenziell kollidierenden ids aus mehreren Quellen gehören nach frontend/src/lib/ und werden isoliert unit-getestet (Vorbild: fansub-team-labels.ts)."

requirements-completed: []

duration: 15min
completed: 2026-10-22
---

# Phase quick-261022-ap1: Gruppenseite React-Key im Memorial-Block Summary

**Memorial-Block der öffentlichen Fansub-Gruppenseite bildet React-Keys jetzt aus Quelle+id (`buildFansubMemorialKey`) statt aus dem kollisionsanfälligen `member_display_name`.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-10-22T07:48:00Z (ca.)
- **Completed:** 2026-10-22T07:49:11Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Neue pure Funktion `buildFansubMemorialKey(source, id)` in `frontend/src/lib/fansub-memorial-key.ts`, abgedeckt durch zwei Logiktests (Kollisionsfall + Format-Fixierung).
- `FansubTeamMemorialBlock.tsx` baut den React-Key jetzt aus `entry.source` + `entry.row.id` statt aus `member.member_display_name`; neues exportiertes Interface `FansubTeamMemorialEntry` trägt die Herkunft explizit.
- `FansubTeamSection.tsx` markiert die Quelle beim Zusammenbauen von `allMemorial` (`'member'` für `memorialMembers`, `'historical'` für `memorialHistorical`) — der einzige Ort, an dem die Herkunft unzweifelhaft bekannt ist.
- Bestehender Render-Test `FansubTeamSection.test.tsx` bleibt unverändert grün (kein Verhaltensbruch am sichtbaren Markup).
- Risiko-Sweep nach ähnlichen `key={...display_name}`/`key={...name}`-Stellen im restlichen Frontend durchgeführt und dokumentiert (siehe unten), keine weitere Datei verändert.
- Vollverifikation im Frontend-Container (nicht lokal): betroffene Testdateien grün, `npm run typecheck` fehlerfrei, `team4sv30-frontend` neu gestartet und wieder "Up".

## Task Commits

Der Plan verlangte explizit genau einen gezielten Abschlusscommit über alle vier geänderten/neuen Dateien (kein Commit pro Task):

1. **Task 1: Pure Key-Funktion mit Logiktest extrahieren** — Code-Teil des Abschlusscommits `8ab04e3b8`
2. **Task 2: Fix verdrahten + Risiko-Sweep** — Code-Teil des Abschlusscommits `8ab04e3b8`
3. **Task 3: Vollverifikation, Frontend-Neustart, Commit** — `8ab04e3b8` (fix(quick-261022-ap1): React-Key im Memorial-Block aus Quelle+id statt Anzeigename bilden)

**Plan metadata:** wird vom Orchestrator separat committet (SUMMARY.md/STATE.md sind hier bewusst nicht enthalten).

## Files Created/Modified
- `frontend/src/lib/fansub-memorial-key.ts` - Pure Funktion `buildFansubMemorialKey(source, id)`, Typ `FansubMemorialSource`
- `frontend/src/lib/fansub-memorial-key.test.ts` - Zwei Logiktests (Kollisionsfall, Format)
- `frontend/src/components/fansubs/FansubTeamMemorialBlock.tsx` - React-Key aus `buildFansubMemorialKey(entry.source, entry.row.id)`, neues Interface `FansubTeamMemorialEntry`
- `frontend/src/components/fansubs/FansubTeamSection.tsx` - `allMemorial` als getaggtes `FansubTeamMemorialEntry[]` statt rohes Row-Array

## Decisions Made
- Herkunft (`source`) wird als explizites Feld auf einem getaggten Entry-Objekt mitgegeben statt per struktureller Typ-Erkennung im Memorial-Block erraten — robuster gegen künftige Felderweiterungen auf beiden Row-Typen.
- `renderMemorialName` bleibt unverändert auf einzelne Row-Objekte spezialisiert (wird jetzt mit `entry.row` statt `member` aufgerufen) — kein unnötiger API-Umbau dieser Hilfsfunktion.

## Deviations from Plan

None - plan executed exactly as written.

## Risiko-Sweep: weitere `key={...display_name}`/`key={...name}`-Fundstellen (nur gemeldet, nicht verändert)

Grep: `grep -rn "key={.*display_name\|key={.*\.name}" frontend/src --include=*.tsx`

**Höheres Risiko (Personenliste, kein Index-/Jahres-Fallback im Key):**
- `frontend/src/components/fansubs/FansubContributorsSection.tsx:42` — `key={contributor.member_display_name}` — exakt dasselbe Kollisionsmuster wie der hier behobene Bug (Personenliste, reiner Anzeigename als Key, kein Fallback). Kandidat für ein Folge-Ticket.

**Niedrigeres Risiko / bereits mit Fallback abgesichert (Personenlisten):**
- `frontend/src/components/anime/GroupContributionBlock.tsx:37` — `` `${contributor.member_slug ?? contributor.member_display_name}-${contributor.started_year ?? index}` `` (slug- und Index-Fallback vorhanden)
- `frontend/src/components/anime/ReleaseVersionBreakdown.tsx:49` — gleiches Muster wie oben
- `frontend/src/components/fansubs/GroupLeaderTimeline.tsx:34` — `` `${entry.member_slug ?? entry.member_display_name}-${entry.role_code}-${entry.started_year ?? index}` `` (slug-, Rollen- und Index-Fallback vorhanden)

**Niedrigeres Risiko / keine Personen-/Gruppenliste:**
- `frontend/src/app/admin/anime/components/CreatePage/AnimeCreateTagField.tsx:116` — `key={token.name}` (Tag-Token, keine Personenliste)
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditGenreSection.tsx:127` — `key={item.name}` (Genre)
- `frontend/src/app/admin/anime/components/CreatePage/AnimeCreateGenreField.tsx:102` — `key={token.name}` (Genre)
- `frontend/src/app/dev/ui-system/page.tsx:389` — `key={row.name}` (UI-Showcase, statische Demo-Daten)
- `frontend/src/app/dev/ui-system/showcase/CompositionShowcase.tsx:87` — `key={row.name}` (UI-Showcase, statische Demo-Daten)

Keine dieser Dateien wurde in diesem Plan angefasst — reine Beobachtung für ein mögliches Folge-Ticket, insbesondere für `FansubContributorsSection.tsx`.

## Issues Encountered
None.

## User Setup Required
None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness
Der Rest-Befund WR-01 aus dem Phase-190-Code-Review ist vollständig geschlossen. `FansubContributorsSection.tsx` (siehe Risiko-Sweep oben) ist der naheliegendste Kandidat für ein mögliches Folge-Ticket mit demselben Fix-Muster.

---
*Phase: quick-261022-ap1*
*Completed: 2026-10-22*

## Self-Check: PASSED

All 4 code files found on disk, commit `8ab04e3b8` found in `git log --oneline --all`.
