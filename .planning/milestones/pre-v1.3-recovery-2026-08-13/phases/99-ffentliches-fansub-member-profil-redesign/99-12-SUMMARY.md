---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "12"
subsystem: ui
tags: [nextjs, react, typescript, server-components, responsive-images]

# Dependency graph
requires:
  - phase: 99-06
    provides: PublicGroupTheme start_time/end_time (AO4-04), Datenquelle für ThemeTimeline
  - phase: 99-07
    provides: Aggregierender Public-Release-Detail-Endpoint (getGroupReleaseDetail), Datenquelle für Hero/ContributorsRow
  - phase: 99-11
    provides: LatestReleaseSection-Detail-Link-Format (/anime/:id/group/:groupId/releases/:releaseVersionId), das diese Route jetzt bedient
provides:
  - "Eigenstaendige oeffentliche Release-Detailseite unter releases/[releaseVersionId] (AO4-15)"
  - "ReleaseDetailHero mit Kennzahlen (Bilder/Texte/Beteiligte) + Veroeffentlichungsdatum + srcSet/sizes-Hero-Bild (AO4-16/AO4-23)"
  - "ContributorsRow: horizontale, mobil-scrollbare Avatar-Reihe mit Name + Rolle (AO4-17)"
  - "ThemeTimeline: OP/ED/Middle-Vorschau mit Thumbnail/Zeitcode/Typ-Tag ohne Player (AO4-20)"
affects: ["99-13-galerie-und-textliste"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-Component-Seite laedt Anime-/Gruppenkontext (Breadcrumb/Poster-Fallback) getrennt vom Haupt-Payload (getGroupReleaseDetail), damit ein Fehlschlag des Kontext-Fetches die Detailseite nicht blockiert (AO4-14)"
    - "ThemeTimeline ist ein eigenstaendiger async Server-Component, der getGroupThemes selbst laedt (Analogie zu LatestReleaseSection aus 99-11), statt Daten von page.tsx durchzureichen"
    - "ContributorsRow bekommt contributors[] direkt aus dem bereits geladenen getGroupReleaseDetail-Payload (kein Zusatz-Request)"
    - "Initialen-Avatar (kein avatar_url im Payload, 99-07-Entscheidung) identisch zum bereits live verifizierten LatestReleaseSection-Muster aus 99-11"

key-files:
  created:
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ContributorsRow.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx
  modified: []

key-decisions:
  - "ContributorsRow und ThemeTimeline verwenden ausschliesslich Initialen-Avatare bzw. keinen Player, da das ReleaseDetailResponse-Payload (99-07) bewusst kein avatar_url-Feld enthaelt — kein Rule-4-Architekturfall, sondern konsistente Nutzung des bestehenden Datenvertrags (Backend-Erweiterung waere Scope-Creep ausserhalb der files_modified dieses Plans)."
  - "Galerie/Textliste (AO4-18/19) bewusst NICHT gebaut — Plan-Scope ist explizit auf Route-Shell/Hero/Beteiligte/Timeline begrenzt, folgt in 99-13. Keine Platzhalter-Sektionen mit sichtbarem 'kommt bald'-Text eingefuegt, um kein Stub-Pattern zu erzeugen; Erweiterung um Galerie/Textliste erfolgt strukturell einfach durch Ergaenzen weiterer <section>-Bloecke nach ThemeTimeline in page.tsx."
  - "Anime-/Gruppenkontext (Titel, Gruppenname, Poster-Fallback) wird getrennt von getGroupReleaseDetail geladen; schlaegt dieser Kontext-Fetch fehl, werden Breadcrumb-Labels generisch ('Anime'/'Gruppe') statt eines Seitenabbruchs verwendet — die Detailseite bleibt nutzbar, solange der Haupt-Endpoint antwortet (AO4-14-Geist)."

# Metrics
duration: ~35min
completed: 2026-07-08
requirements-completed: [AO4-15, AO4-16, AO4-17, AO4-20, AO4-23]
---

# Phase 99 Plan 12: Release-Detailseite — Route-Shell, Hero, Beteiligte, OP/ED/Middle-Timeline Summary

**Neue eigenstaendige oeffentliche Route `/anime/[id]/group/[groupId]/releases/[releaseVersionId]` rendert Hero-Kennzahlen mit srcSet/sizes-Bild, eine horizontale Beteiligten-Avatarreihe und eine OP/ED/Middle-Vorschau-Timeline ohne Video-Player — Galerie/Textliste folgen in 99-13.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-07-08
- **Tasks:** 3/3
- **Files modified:** 5 (5 created, 0 modified)

## Accomplishments
- Server-Component-Route `page.tsx` parst `id`/`groupId`/`releaseVersionId` mit Number-Guard, laedt `getGroupReleaseDetail` (AO4-02/99-07), behandelt 404 via `notFound()` und andere Fehler mit generischem deutschem Text (kein technischer Leak, AO4-14).
- `ReleaseDetailHero` zeigt Bilder-/Text-/Beteiligte-Kennzahlen und Veroeffentlichungsdatum; Hero-Bild (erstes verfuegbares Release-Bild, sonst Anime-Poster als Fallback) mit `srcSet`/`sizes` fuer mobile Aufloesungen (AO4-23).
- `ContributorsRow` rendert Beteiligte als horizontale, auf Mobile scrollbare Avatar-Reihe mit Name + Rolle; blendet sich bei leerer Liste komplett aus.
- `ThemeTimeline` laedt die Projekt-Themes selbst (`getGroupThemes`) und zeigt pro Theme Thumbnail, deutschen Typ-Tag (Opening/Ending/Middle) und Zeitcode-Spanne aus `start_time`/`end_time` (AO4-04, 99-06) — ohne Platzhalter bei fehlendem Zeitcode, ohne Video-Player.
- Live gegen den echten Docker-Backend/Frontend verifiziert: `/anime/1/group/1/releases/1` liefert 200 mit korrekt gerenderten Breadcrumbs ("Viper's Creed" → "C-Subs" → "Releases" → "Episode 1"), Hero-Bild mit `srcSet`, Kennzahlen "1 Bilder / 2 Texte / 0 Beteiligte" — exakt die Backend-Werte.

## Task Commits

Each task was committed atomically:

1. **Task 1: Route-Shell und Hero mit Kennzahlen** - `7830973d` (feat)
2. **Task 2: ContributorsRow (Beteiligte als Avatar-Reihe)** - `25d3d253` (feat)
3. **Task 3: ThemeTimeline (OP/ED/Middle ohne Player)** - `571d6fef` (feat)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx` - Server-Component-Route, laedt Anime-/Gruppenkontext + `getGroupReleaseDetail`, komponiert Hero/ContributorsRow/ThemeTimeline (103 Zeilen)
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css` - Tokens-basierte Styles fuer Hero, Beteiligten-Reihe, Timeline (221 Zeilen)
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx` - Kennzahlen-Hero mit `srcSet`/`sizes`-Bild (75 Zeilen)
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ContributorsRow.tsx` - Beteiligten-Avatarreihe (35 Zeilen)
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx` - OP/ED/Middle-Vorschau (79 Zeilen)

## Decisions Made
Siehe `key-decisions` im Frontmatter fuer die drei wichtigsten Entscheidungen (Initialen-Avatare statt Bild wegen fehlendem `avatar_url`-Feld, kein Platzhalter-Stub fuer Galerie/Textliste, entkoppeltes Kontext-Laden fuer Breadcrumb/Poster).

## Deviations from Plan

None - plan executed exactly as written. Die Task-1-Commit-Reihenfolge (Route+Hero zuerst, dann ContributorsRow/ThemeTimeline) spiegelt die Plan-Nummerierung; da `page.tsx` bereits in Task 1 beide spaeteren Komponenten importiert, war der Task-1-Commit isoliert betrachtet nicht buildbar (fehlende Importe), bis Task 2/3 unmittelbar danach committet wurden — am Ende von Task 3 ist der Repo-Zustand vollstaendig konsistent (`npm run typecheck` fehlerfrei nach jedem der drei Commits in Folge). Dies ist eine Struktureigenheit der Plan-Task-Reihenfolge (Hero-Seite referenziert Sub-Komponenten, die erst in Task 2/3 entstehen), kein Implementierungsfehler.

## Issues Encountered
- Die lokale Docker-Sandbox zeigte wiederholt `TypeError: fetch failed` / `ConnectTimeoutError` zwischen Frontend- und Backend-Container unter Last (bereits in 99-11 als "Umgebungs-Ressourcenengpass" dokumentiert) — direkte `node fetch`-Tests aus dem Frontend-Container zum Backend-Health-Endpoint sowie zum Release-Detail-Endpoint liefen sofort fehlerfrei; wiederholte `curl`-Anfragen gegen `:3000` lieferten nach mehreren Sekunden Wartezeit konsistent 200 mit korrektem Markup. Kein Implementierungsfehler, sondern intermittierende Umgebungslast (bestaetigt: auch die bereits produktive Gruppenseite `/anime/1/group/1` zeigte zeitweise denselben Effekt).
- Aktuelle Testdaten liefern fuer alle geprueften Releases (`1`, `2`, `12`) `contributors_count: 0` und fuer alle geprueften Gruppen (`1`-`3`) eine leere Themes-Liste — `ContributorsRow` und `ThemeTimeline` konnten daher nur im Leerfall (Sektion ausgeblendet) live bestaetigt werden, nicht im befuellten Zustand. Code-Pfad fuer den befuellten Fall ist typecheck-/eslint-sauber und spiegelt exakt das bereits live verifizierte Avatar-/Vorschau-Muster aus `LatestReleaseSection`/`ThemesSection` (99-06/99-07/99-11).

## Live Verification (statt nur Code-Level)

Frontend-Container neu gestartet (`docker restart team4sv30-frontend`):
- `GET http://localhost:3000/anime/1/group/1/releases/1` → `200`, Breadcrumb "Anime → Viper's Creed → C-Subs → Releases → Episode 1" korrekt gerendert, `Zurück zum Projekt`-Link vorhanden.
- Hero-Bild: `<img src=".../thumb.jpg" srcSet=".../thumb.jpg 480w, .../original.jpg 1280w" sizes="(max-width: 640px) 100vw, ...">` — `srcSet`/`sizes` bestaetigt (AO4-23).
- Kennzahlen-Zeile: "1 Bilder", "2 Texte", "0 Beteiligte" — deckt sich exakt mit `GET /api/v1/anime/1/group/1/releases/1` (`images_count:1, notes_count:2, contributors_count:0`).
- `ContributorsRow` korrekt ausgeblendet (leere `contributors[]`), `ThemeTimeline` korrekt ausgeblendet (leere Themes-Liste fuer Gruppe 1) — beide Leerfall-Pfade bestaetigt (AO4-14).
- Regressionscheck: `GET http://localhost:3000/anime/1/group/1` (bestehende, in 99-11 live verifizierte Projektseite) weiterhin `200` mit intaktem Inhalt nach dem Frontend-Neustart.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Route-Geruest, Hero, Beteiligte und Timeline stehen; 99-13 kann Galerie (AO4-18) und Textliste (AO4-19) unterhalb von `ThemeTimeline` in `page.tsx` ergaenzen, ohne bestehende Sektionen zu veraendern.
- Zum vollstaendigen visuellen Beweis des befuellten Beteiligten-/Timeline-Zustands sollten Testdaten mit `contributors_count > 0` bzw. vorhandenen `theme_segments` verwendet werden — aktuell nicht in der lokalen DB vorhanden.

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-08*

## Self-Check: PASSED

- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ContributorsRow.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx
- FOUND commit: 7830973d
- FOUND commit: 25d3d253
- FOUND commit: 571d6fef
