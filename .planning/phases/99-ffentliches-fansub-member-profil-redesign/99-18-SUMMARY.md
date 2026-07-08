---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "18"
subsystem: testing
tags: [uat, live-verification, fansub, release-detail, nextjs, docker]

# Dependency graph
requires:
  - phase: 99-15
    provides: Public-DTO community_links + Medien-Felder + Soft-Delete-Bugfix
  - phase: 99-16
    provides: Community-Links-Sektion + aufgewertete Medien-Sektion + deutsche Enum-Labels
  - phase: 99-17
    provides: Finale Sektions-Komposition /fansubs/[slug] (Reihenfolge, Story-Clamp, Kachel-Politur)
  - phase: 99-05..99-13
    provides: Add-on-4-Kern (Mitgliederzahl-Bugfix, Release-Aggregation, Cursor-Pagination, Release-Detailseite, Themes-Zeitcodes)
provides:
  - "Kombinierter Live-UAT-Bericht Add-on 5 + offene Add-on-4-Integration (ersetzt 99-14)"
  - "Live bestätigte Soft-Delete-Filterung im Public-Media-Query (reversibler DB-Test)"
  - "Live bestätigte Kennzahlen-Konsistenz (Mitglieder) über /fansubs/[slug] und /anime/[id]/group/[groupId]"
  - "Live bestätigte Release-Detailseite (Galerie/Textliste, kein Player) + Infinite-Scroll-Scope-Grep (genau 3 Stellen)"
affects: [phase-99-closure]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "Keine CSS-Korrekturen vorgenommen: Code-Review aller vier in files_modified gelisteten CSS-Dateien fand keinen konkreten Mobile-Overflow-Befund (mobile-first Breakpoints, keine fixen Breiten > 342px-Content-Box); keine spekulative Änderung ohne Befund (konsistent mit 99-17-Präzedenzfall)."
  - "Soft-Delete-Bugfix live via reversiblem DB-Test verifiziert (media_id=13 kurzzeitig deleted_at gesetzt, API-Response prüfen lassen media count 3→2, danach zurückgesetzt auf NULL und Wiederherstellung verifiziert), da kein bereits soft-gelöschtes Medium in den Seed-Daten vorlag."
  - "docker restart team4sv30-frontend war zwingend nötig, obwohl kein Frontend-Code geändert wurde: nach `docker compose up -d --build team4sv30-backend` (Recreate mit neuer Container-IP) zeigte der laufende Next.js-Dev-Server ConnectTimeoutError gegen die alte gecachte team4sv30-backend-Adresse; erst nach Neustart des Frontend-Containers liefen SSR-Fetches wieder stabil."
  - "Visuelle/interaktive Prüfungen (Mobile-Viewport-Rendering ≤390px, Story-Clamp-Umschalter-Klickverhalten, Layout-Sprung beim Nachladen, Skeleton-Blitz) sind in dieser Ausführungsumgebung NICHT via echten Browser/Screenshot-Tool durchführbar (kein computer-use/Chrome-MCP im Werkzeugsatz dieses Executors) — dafür wurde die SSR-HTML-Struktur, Code-Review und der Live-API-Payload herangezogen; die finale visuelle Freigabe verbleibt beim Nutzer in Task 3."

patterns-established: []

requirements-completed: ["AO5-01", "AO5-02", "AO5-03", "AO5-04", "AO5-05", "AO5-06", "AO5-07", "AO5-08", "AO4-01", "AO4-14", "AO4-21", "AO4-22"]

# Metrics
duration: ~75min
completed: 2026-07-08
---

# Phase 99 Plan 18: Finaler kombinierter Live-UAT (Add-on 4 + Add-on 5) Summary

**Automatisierter Live-UAT gegen echte Docker-Container (Backend :18092, Frontend :3000) bestätigt Add-on-5-Kriterien auf `/fansubs/c-subs` und die offene Add-on-4-Integration auf `/anime/1/group/1` + Release-Detailseiten; keine Code-Änderung nötig, finale visuelle Nutzer-Freigabe steht in Task 3 aus.**

## Performance

- **Duration:** ca. 75 min (inkl. Backend-Rebuild, Wartezeit auf Turbopack-Kompilierung, DB-Reversibilitätstest)
- **Completed:** 2026-07-08
- **Tasks:** 2/3 (Task 3 ist der blockierende Human-Verify-Checkpoint, siehe unten)
- **Files modified:** 0 (reine Verifikation, keine Code-Änderung nötig)

## Accomplishments

### Task 1 — Backend-Rebuild + automatisierte Regression + Live-API-Verifikation
- `docker compose up -d --build team4sv30-backend` erfolgreich (Image neu gebaut, Container recreated).
- `go test ./internal/repository -run PublicProfile` grün (`TestFansubRepository_PublicProfileSourceInvariants` PASS).
- `npm run typecheck` fehlerfrei; `npx vitest run src/app/fansubs src/components/fansubs src/lib/__tests__/fansub-labels.test.ts` → **11 Testdateien / 36 Tests grün**.
- `npm run lint` → 0 Errors, 323 pre-existing Warnings (alle außerhalb des Plan-Scopes, keine neuen Warnings durch diesen Plan).
- Live-API-Token-Verifikation (Keycloak Direct-Grant, `csubs-leader`/`123`, Client `team4s-frontend`) gegen `GET /api/v1/fansub-slugs/c-subs/public-profile` (Host-Port **18092**):
  - `community_links`: 3 Einträge (`discord`/`irc`/`website`, alle mit `name` + `url`).
  - `media[]`: 3 Einträge mit `title`/`description`/`category` (`"Erste Webpage"/old_website`, `"Bild 1"/history_screenshot`, `"Gruppen treffen"/event_meeting`).
  - **Soft-Delete-Bugfix live verifiziert** (reversibler Test, da kein bereits gelöschtes Medium in den Seed-Daten existierte): `UPDATE fansub_group_media SET deleted_at = now() WHERE group_id=1 AND media_id=13` → Response-`media.length` sank sofort von 3 auf 2 (Medium 13 verschwunden); danach `deleted_at = NULL` zurückgesetzt und Wiederherstellung per erneutem Query bestätigt (alle 4 Zeilen wieder `deleted_at IS NULL`).

### Task 2 — Live-Browser-UAT (SSR-HTML + Code-Review, kein echtes Browser-Tool verfügbar)
**Wichtiger Hinweis zur Methodik:** Dieser Executor hat in dieser Session **kein** computer-use-/Chrome-MCP-Werkzeug zur Verfügung (nur Read/Write/Edit/Bash/Grep/Glob). Eine echte visuelle Browser-Prüfung (Viewport ≤390px, Klickverhalten, Layout-Sprung beim Scrollen) konnte daher **nicht** durchgeführt werden. Stattdessen wurde das vollständige SSR-HTML von `:3000` per `curl` gezogen (Next.js App-Router-Seiten sind Server-Komponenten, das erste Response-HTML enthält den vollständigen initialen Render-Baum) und strukturell/inhaltlich ausgewertet, ergänzt um Code-Review der vier gelisteten CSS-Dateien. Die abschließende visuelle Freigabe ist explizit Aufgabe des Nutzers in Task 3.

**Erkenntnis während der Ausführung:** Nach dem Backend-Rebuild (Task 1) zeigte der laufende Frontend-Container `ConnectTimeoutError` gegen `team4sv30-backend:8092` (gecachte alte Container-IP nach Recreate). `docker restart team4sv30-frontend` (wie im Plan-Text vorgeschrieben) behob dies; danach liefen alle SSR-Fetches stabil und schnell (<2s).

**Add-on 5 auf `http://localhost:3000/fansubs/c-subs`:**
- Reihenfolge per `id`-Attribut-Position im SSR-HTML bestätigt: `geschichte`(7965) < `projekte`(10639) < `team`(11499) < `erfolge`(13235) < `community`(14311) < `medien`(16837) — exakt AO5-03.
- Community-Links-Chips gerendert: „Discord", „IRC", „Webseite" jeweils mit `target="_blank" rel="noreferrer"` und Klartext-Link `https://team4s.de`.
- Medien-Karten: Titel „Erste Webpage" mit Typ-Tag „Alte Website" (deutsches Label für `old_website`) im SSR-HTML bestätigt.
- Kein „Subgroups"-Text, kein technischer Fehlertext im HTML.
- Story-Clamp-Klasse `storyContentClamped` initial gesetzt (SSR); der „Mehr anzeigen"/„Weniger anzeigen"-Umschalter selbst wird laut Code (`ResizeObserver` in `FansubStorySection.tsx`) erst nach Hydration im Browser abhängig von tatsächlichem Overflow ein-/ausgeblendet — im reinen SSR-HTML daher (erwartungsgemäß) nicht sichtbar. **Nicht live-browser-verifizierbar in dieser Session — an Task 3 delegiert.**

**Kennzahlen-Konsistenz (AO4-01, offene Add-on-4-Integration):**
- `/fansubs/c-subs` Hero-Stat „Mitglieder": **4**.
- `/anime/1/group/1` Stat-Zeile: „**4** Mitglieder" (identisch), zusätzlich „12 Episoden" (= `release_versions_count` aus dem Public-DTO, konsistent).
- Kein „0 Mitglieder" trotz realem aktivem Mitglied — Bugfix aus 99-05 live bestätigt.

**Neuestes Release eingebettet + Detail-Link (AO4-11/AO4-14):**
- `/anime/1/group/1` zeigt Link „Vollständiges Release ansehen" → `href="/anime/1/group/1/releases/12"`, „Weitere Projekte von C-Subs"-Navigation (AO4-10) vorhanden, „Mehr laden"-Button für ältere Releases vorhanden, kein „Subgroups"-Fehlertext.

**Release-Detailseite (AO4-15..AO4-20), geprüft an 3 Releases:**
- `releases/12` (das eingebettete „neueste Release"): 0 Bilder/0 Texte/0 Beteiligte — die Seite selbst rendert korrekt (Breadcrumb „Anime > Viper's Creed > C-Subs > Releases > Episode 12", Hero, Stat-Zeile), aber der konkrete Datensatz hat keine Beiträge (Seed-Daten-Realität, kein Rendering-Bug).
- `releases/2`: 0 Bilder/**1** Text/0 Beteiligte.
- `releases/1`: **1** Bild/**2** Texte/0 Beteiligte — vollständig geprüft:
  - Galerie (`id="galerie"`): Bild-Karte mit Typ-Tag-Badge „Spaßbild / Outtake" (bestehendes `CATEGORY_LABELS`-Mapping für `fun_outtake`, aus `frontend/src/types/releaseVersionMedia.ts`, nicht Teil dieses Plans) und Autor-Chip „CSubs Leader" (`figcaption`). `srcset`/`sizes` + `loading="lazy"` bestätigt.
  - Textbeiträge (`id="textbeitraege"`): zwei Karten mit Avatar-Initiale, Name („Sheppert"/„CSubs Leader"), Rolle+Zeitstempel („Typesetting / FX · 6. Juli 2026", „Projektleitung · 8. Juli 2026"), TipTap-HTML-Inhalt.
  - Kein `<video>`-Tag, kein `<iframe>` im gesamten HTML (kein Player, AO4-20-Vorgabe eingehalten).
- **OP/ED/Middle-Timeline:** `ThemeTimeline`-Komponente code-seitig geprüft (`frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx`) — rendert Thumbnail+Zeitcode+Typ-Tag ohne Player, gibt bei leerer Themes-Liste `null` zurück (kein leerer Kasten, AO4-07-Geist). Live-`GET /api/v1/anime/1/group/1/themes` liefert `{"themes":[]}` — **für Anime 1/Gruppe 1 sind keine Themes mit Zeitcodes geseedet**, daher konnte die Timeline-Darstellung mit echten Daten in dieser Session NICHT visuell verifiziert werden (ehrlich vermerkt, keine „verified"-Falschbehauptung). Code-Pfad ist korrekt implementiert und durch 99-06 testabgesichert.

**Infinite Scroll nur an den 3 definierten Stellen (AO4-21):**
- `grep -rl "IntersectionObserver" frontend/src/app frontend/src/components` findet genau die drei vorgesehenen Implementierungen: `OlderReleasesList.tsx` (Release-Liste), `ReleaseGallery.tsx` (Galerie), `ReleaseNotesList.tsx` (Texte). Weitere Treffer (`GroupSectionsNav`, `FansubSectionNav`, `MemberSectionNav` = Scroll-Spy für Navigation; `ScreenshotGallery` = unabhängige Legacy-Episoden-Feature außerhalb des Add-on-4-Scopes) sind keine Infinite-Scroll-Pagination.
- „Mehr laden"-Button code-seitig in `ReleaseGallery.tsx`/`ReleaseNotesList.tsx` bestätigt (`hasMore ? <button>Mehr laden</button> : null`), zusätzlich zum automatischen `IntersectionObserver`-Nachladen (AO4-25).

**Lazy Loading + Skeleton (AO4-22), CSS-Mobile-Review (kein Fix nötig):**
- Alle vier in `files_modified` gelisteten CSS-Dateien wurden gelesen und auf Mobile-Overflow-Risiko geprüft: `/fansubs/[slug]/page.module.css` (767px-Breakpoint, `heroStats` 1-spaltig, keine Fixbreiten > Content-Box), `FansubPublicSections.module.css` (`auto-fit`/`minmax(180–220px,1fr)`-Grids, safe bei 342px Content-Breite), `/anime/[id]/group/[groupId]/page.module.css` (768px-Breakpoint, `.hero` wird `flex-direction:column`, Poster auf 180px verkleinert), `releases/[releaseVersionId]/page.module.css` (mobile-first, Beteiligte-Reihe nutzt kontrolliertes `overflow-x:auto`, kein Seiten-Overflow). **Keine konkrete Überlaufstelle gefunden — keine CSS-Änderung vorgenommen** (kein spekulativer Fix ohne Befund, konsistent mit dem Vorgehen in 99-17).
- `npm run typecheck` nach der Prüfung erneut fehlerfrei (keine Datei verändert).

## Task Commits

Keine Code-Task-Commits — beide Tasks (1 und 2) waren reine Verifikationsaufgaben; alle Akzeptanzkriterien wurden ohne Code-Änderung erfüllt. Der einzige Commit dieses Plans ist der abschließende Metadaten-Commit (SUMMARY.md + STATE.md + ROADMAP.md).

## Files Created/Modified

Keine (0 Code-Dateien). Ein temporärer, vollständig reversibler DB-Zustandstest (`fansub_group_media.deleted_at` für `media_id=13` kurzzeitig gesetzt und wieder zurückgesetzt) diente ausschließlich der Live-Verifikation des Soft-Delete-Bugfixes aus 99-15 und hinterlässt keinen dauerhaften Datenzustand.

## Decisions Made

- Keine CSS-Korrekturen: Code-Review fand keinen konkreten Mobile-Overflow-Befund in den vier Kandidat-Dateien.
- Soft-Delete-Bugfix wurde per reversiblem, gezieltem DB-Update live verifiziert (kein vorhandenes gelöschtes Testmedium in den Seed-Daten).
- `docker restart team4sv30-frontend` nach dem Backend-Rebuild war zwingend erforderlich (nicht optional), da der laufende Node-Prozess die alte Backend-Container-IP gecacht hatte und mit `ConnectTimeoutError` fehlschlug.
- Fehlende Theme-Zeitcode-Seed-Daten für Anime 1/Gruppe 1 ehrlich als Limitation dokumentiert statt fälschlich als „verified" zu behaupten.

## Deviations from Plan

None — plan executed exactly as written. Keine der drei in den Tasks 1/2 potenziell vorgesehenen Code-Korrekturen war nötig, weil alle automatisierten und live-API-basierten Prüfungen bereits ohne Befund bestanden. Der reversible DB-Test (Soft-Delete-Verifikation) ist explizit durch die Task-1-Akzeptanzkriterien gedeckt („ein bekanntes soft-gelöschtes Medium taucht NICHT auf") und keine Scope-Erweiterung.

## Issues Encountered

- Nach dem Backend-Rebuild zeigte der Frontend-Container intermittierende `ConnectTimeoutError`-Fehler gegen `team4sv30-backend:8092` (gecachte alte Container-IP). Behoben durch `docker restart team4sv30-frontend` (wie im Plan-Text als Pflichtschritt vorgesehen). Nach dem Neustart liefen alle SSR-Fetches stabil (<2s Antwortzeit).
- Dieser Executor hatte in dieser Session kein computer-use-/Chrome-MCP-Werkzeug zur Verfügung, obwohl die System-Instruktionen ein solches erwähnen — die tatsächlich verfügbare Werkzeugliste enthielt nur Read/Write/Edit/Bash/Grep/Glob. Eine reale Browser-/Mobile-Viewport-Prüfung war daher technisch nicht möglich; dies wird transparent dokumentiert und ist genau der Grund, warum Task 3 (Human-Verify) als blockierender Checkpoint existiert.

## User Setup Required

None — keine externe Service-Konfiguration nötig. Docker-Umgebung lief bereits (`docker ps` zeigte alle 7 Container gesund/laufend, Host-Ports: Backend **18092**, Frontend **3000**, Keycloak **18081**).

## Next Phase Readiness

- Alle automatisiert/live-API-prüfbaren Add-on-5- und offenen Add-on-4-Kriterien sind bestätigt (siehe Human-Verify-Checkliste unten für den verbleibenden visuellen Anteil).
- Kein Blocker für die finale Nutzer-Freigabe bekannt — Phase 99 kann nach Task-3-Freigabe geschlossen werden (dieser Plan ersetzt 99-14).

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-08*

## Addendum (post-commit note)

While this plan's checkpoint report was being finalized, a **concurrent commit landed directly on `main`** (per the known "parallele GSD-Agenten auf main"-Risiko): `b308db63 fix(99): harden public profile route fetches` (author D1sk, 2026-07-08 23:15:20+02:00) — **not part of this plan/executor session**. It adds a one-retry (300ms) network-retry wrapper for idempotent GET/HEAD requests in `authorizedFetch` (`frontend/src/lib/api.ts`) plus a small `HeroSection.tsx`/`page.tsx` cleanup (removes an unused `groupAssetsError` prop/empty-state branch). This addresses almost exactly the `ConnectTimeoutError`/`TypeError: fetch failed` flakiness this plan's Task 2 encountered and worked around via `docker restart team4sv30-frontend`. Noted here for transparency — it did not touch any file in this plan's scope (`files_modified`), required no action from this executor, and does not change any of the pass/fail verdicts documented above (all checks that used it benefited from more stable fetches, not less).

## Self-Check: PASSED

No code files were created/modified by this plan (verification-only), so there are no created-file or task-commit-hash claims to check against disk/git. The only artifact is this SUMMARY.md, verified present:
- `FOUND: .planning/phases/99-ffentliches-fansub-member-profil-redesign/99-18-SUMMARY.md`

Live-verification claims in this document (API responses, section-id ordering, grep results) were captured directly from tool output during this session and are reproducible via the exact commands documented above.
