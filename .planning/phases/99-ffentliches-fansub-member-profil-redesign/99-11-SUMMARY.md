---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "11"
subsystem: ui
tags: [nextjs, react, typescript, cursor-pagination, intersection-observer, go, pgx]

# Dependency graph
requires:
  - phase: 99-07
    provides: Aggregierender Public-Release-Detail-Endpoint (getGroupReleaseDetail), Basis fuer LatestReleaseSection
  - phase: 99-08
    provides: Cursor-Client-Funktionen (getGroupReleaseListCursor) und CursorPage<T>, Basis fuer OlderReleasesList
  - phase: 99-10
    provides: HeroSection-Leerfall-Bereinigung (Subgroups-Text) und GroupEdgeNavigation-Label, unabhaengig konsumiert
provides:
  - "LatestReleaseSection: eingebettete Vorschau des neuesten Release (Titel, Datum, Kennzahlen, 3-4 Bildvorschauen +X, 2 Textauszuege, Beteiligten-Avatare, Detail-Link) — AO4-11"
  - "OlderReleasesList: kompakte, per Cursor nachladende Liste aelterer Releases mit IntersectionObserver-Autoload UND manuellem 'Mehr laden'-Button — AO4-12/AO4-21/AO4-25"
  - "Projektseite folgt AO4-13-Reihenfolge (Hero->Aktionen->Beteiligte->Geschichte(bedingt)->Neuestes Release->Weitere Releases->Sammel-Hinweis->Mehr entdecken) mit einem einzigen Sammel-Hinweis fuer leere Bereiche (AO4-07)"
  - "GetGroupReleasesCursor liefert zusaetzlich images_count/notes_count pro release_version_id (additive Backend-Erweiterung, nur Cursor-Pfad)"
affects: [99-12-release-detail-page, AO4-11, AO4-12, AO4-13, AO4-21, AO4-22, AO4-23, AO4-25]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LatestReleaseSection ist ein async Server-Component, das sein Datum selbst per getGroupReleaseDetail laedt statt es als Prop von page.tsx zu bekommen — reduziert page.tsx auf Ableitung von IDs"
    - "OlderReleasesList kombiniert IntersectionObserver-Autoload und manuellen Button ueber denselben loadPage-Callback (identisches Pattern wie ScreenshotGallery.tsx)"
    - "hasStoryContent/buildEmptyAreaLabels aus page.tsx exportiert und pure-function-getestet (Analogie zu 99-09s fansubs/[slug]/page.tsx)"
    - "ReleasesSection wurde vom generischen 5er-Grid zum Kompositions-Punkt fuer LatestReleaseSection + OlderReleasesList umgebaut, behaelt aber den bestehenden 'Alle Releases ansehen'-Link"

key-files:
  created:
    - frontend/src/app/anime/[id]/group/[groupId]/sections/LatestReleaseSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/LatestReleaseSection.module.css
    - frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.module.css
    - frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx
  modified:
    - frontend/src/app/anime/[id]/group/[groupId]/page.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/page.module.css
    - frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx
    - backend/internal/models/group.go
    - backend/internal/repository/group_repository_cursor.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/group.ts

key-decisions:
  - "AO4-13s Reihenfolgen-Vorgabe nennt Team/Themes/Media nicht explizit; Team bleibt direkt nach GroupSectionsNav (vor Geschichte), Themes/Media bleiben nach Weitere Releases und vor dem Sammel-Hinweis — die benannte Reihenfolge (Hero->Aktionen->Geschichte->Neuestes Release->Weitere Releases->Sammel-Hinweis->Mehr entdecken) bleibt exakt eingehalten."
  - "'Aktionen' aus AO4-13 existiert bereits als styles.actions-Block innerhalb HeroSection.tsx (Releases ansehen/Fansub-Profil) — keine neue Komponente noetig."
  - "Aeltere-Releases-Reihenfolge folgt der aufsteigenden Cursor-Sortierung (episode_number ASC) statt umgekehrt-chronologisch; keine explizite Anforderung dazu vorhanden."
  - "MediaSection.tsx traegt einen Altkommentar '/* Section ALWAYS visible (D-15) */' — D-15 bezieht sich aber auf 'keine Platzhalter-Produktionsdaten', nicht auf Pflicht-Sichtbarkeit; scope_fence dieses Plans erlaubt Leerfall-Bereinigung fuer Medien explizit ('Keine Layout-Vorgabe fuer befuellte Medien-Sektionen, nur Leerfall-Bereinigung'), daher jetzt bedingt gerendert."

# Metrics
duration: ~55min
completed: 2026-07-08
requirements-completed: [AO4-11, AO4-12, AO4-13, AO4-21, AO4-22, AO4-23, AO4-25]
---

# Phase 99 Plan 11: Neuestes-Release-Vorschau, Aeltere-Releases-Liste und AO4-13-Reihenfolge Summary

**Projektseite bettet das neueste Release mit Bild-/Text-/Beteiligten-Vorschau direkt ein, laedt aeltere Releases per Seek-Cursor mit Auto- und manuellem Nachladen, und folgt jetzt der AO4-13-Sektionsreihenfolge mit einem einzigen Sammel-Hinweis fuer leere Bereiche.**

## Performance

- **Duration:** ~55 min
- **Completed:** 2026-07-08
- **Tasks:** 3/3
- **Files modified:** 12 (7 created, 5 modified originally declared; plus 2 additional backend/contract files as documented deviation)

## Accomplishments
- `LatestReleaseSection` laedt das aggregierte Release-Payload (99-07) selbst und zeigt Titel, Veroeffentlichungsdatum, Kennzahlen, 3-4 Bildvorschauen mit +X-Kachel, 2 Textauszuege, Beteiligten-Avatare und den Link zur (noch zu bauenden) Release-Detailseite — live gegen den echten Docker-Backend verifiziert (Release "Vipers Creed. S01E12-CSubs.mkv" korrekt eingebettet, Link `/anime/1/group/1/releases/12`).
- `OlderReleasesList` (Client-Komponente) nachlaedt aeltere Releases ueber `getGroupReleaseListCursor` (99-08) mit `IntersectionObserver`-Autoload und einem sichtbaren "Mehr laden"-Button als Fallback; live verifiziert, dass `images_count`/`notes_count` pro Release-Zeile jetzt reale Werte liefern (z. B. Episode 1: 1 Bild, 2 Texte).
- Projektseite (`page.tsx`) folgt jetzt exakt der AO4-13-Reihenfolge; `hasStoryContent`/`buildEmptyAreaLabels` sind als reine, getestete Funktionen exportiert; ein einziger Sammel-Hinweis fasst leere Team-/Geschichte-/Themes-/Media-/Release-Bereiche zusammen statt sie einzeln als EmptyState zu zeigen — live bestaetigt gegen anime/1/group/1 (Sammel-Hinweis zeigt korrekt nur "Beteiligte am Projekt, Geschichte, OP/ED/Middle", keine einzelnen "Noch keine..."-Texte mehr).

## Task Commits

Each task was committed atomically:

1. **Task 1: LatestReleaseSection (eingebettetes neuestes Release)** - `219e2c5a` (feat)
2. **Task 2: OlderReleasesList (Cursor-Infinite-Scroll + Mehr laden)** - `6c55288d` (feat)
3. **Task 3: page.tsx neu ordnen und Sektionen verdrahten** - `428eb82d` (feat)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `frontend/src/app/anime/[id]/group/[groupId]/sections/LatestReleaseSection.tsx` (+`.module.css`) - AO4-11: async Server-Component, laedt `getGroupReleaseDetail` selbst, rendert Kopf-Kennzahlen/Bild-/Text-Vorschauen/Beteiligten-Avatare/Detail-Link
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx` (+`.module.css`, `.test.tsx`) - AO4-12/21/25: Client-Komponente mit `getGroupReleaseListCursor`, IntersectionObserver + Button-Fallback, filtert das eingebettete neueste Release aus
- `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx` (+`.test.tsx`) - komponiert jetzt `LatestReleaseSection`+`OlderReleasesList` statt des generischen 5er-Grids; behaelt den "Alle Releases ansehen"-Link
- `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` (+`.test.tsx`) - AO4-13-Reihenfolge, `hasStoryContent`/`buildEmptyAreaLabels` exportiert, bedingtes Rendern aller optionalen Sektionen
- `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` - `.emptySummary`-Klasse fuer den Sammel-Hinweis (Analogie zu `fansubs/[slug]/page.module.css`)
- `backend/internal/models/group.go` / `backend/internal/repository/group_repository_cursor.go` - `EpisodeReleaseSummary` um `images_count`/`notes_count` erweitert, `GetGroupReleasesCursor` liefert diese ueber korrelierte COUNT-Subqueries (identische Sichtbarkeits-Gates wie `ReleaseDetailPublicRepository`)
- `shared/contracts/openapi.yaml` / `frontend/src/types/group.ts` - `images_count`/`notes_count` additiv im `EpisodeReleaseSummary`-Schema/-Typ dokumentiert

## Decisions Made
- Siehe `key-decisions` im Frontmatter fuer die vier wichtigsten Entscheidungen (Reihenfolge-Interpretation, Aktionen-Wiederverwendung, Sortierrichtung der aelteren Liste, Media-Leerfall-Override).
- `OlderReleasesList` filtert das bereits eingebettete neueste Release rein clientseitig aus der geladenen Cursor-Seite heraus (`items.filter(item => item.id !== excludeReleaseVersionId)`) statt eine Backend-Ausschlussklausel einzufuehren — einfacher und ausreichend, da die Cursor-Liste ohnehin aufsteigend sortiert ist und das neueste Release fast immer die letzte Seite betrifft.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] GetGroupReleasesCursor lieferte keine Bild-/Text-Anzahl pro Release**
- **Found during:** Task 2 (OlderReleasesList), beim Implementieren der Zeilen-Anzeige "Bild-/Text-Anzahl"
- **Issue:** `models.EpisodeReleaseSummary` (Rueckgabetyp von `GetGroupReleasesCursor` aus 99-08) enthaelt kein `images_count`/`notes_count`-Feld — Task 2s Acceptance-Criterion "Jeder Eintrag zeigt Bild-/Text-Anzahl" war ohne Backend-Erweiterung nicht erfuellbar, ohne pro Zeile einen teuren Zusatz-Request an `getGroupReleaseDetail` zu feuern (N+1, widerspricht "kompakte Liste, kein Overload").
- **Fix:** `EpisodeReleaseSummary` um `ImagesCount`/`NotesCount` (`images_count`/`notes_count`) erweitert; `GetGroupReleasesCursor`s Listen-Query um zwei korrelierte COUNT-Subqueries ergaenzt, mit identischen Sichtbarkeits-Gates wie `ReleaseDetailPublicRepository.countImages`/`countNotes` (release_version_media: `public`/`approved`/`ready`; release_version_notes: `public`/`published`). Nur die Cursor-Variante ist betroffen; die alte Offset-`GetGroupReleases` (genutzt von `releases/page.tsx`) liefert die Felder unveraendert als 0, da diese Seite sie nicht rendert. OpenAPI-Schema und der Frontend-Typ `EpisodeReleaseSummary` wurden additiv gespiegelt.
- **Files modified:** `backend/internal/models/group.go`, `backend/internal/repository/group_repository_cursor.go`, `shared/contracts/openapi.yaml`, `frontend/src/types/group.ts`
- **Verification:** `go build ./...` und `go vet ./internal/repository/... ./internal/models/...` fehlerfrei; Docker-Backend neu gebaut, live gegen `GET /api/v1/anime/1/group/1/release-list?limit=5` verifiziert — `images_count`/`notes_count` liefern reale, von 0 abweichende Werte (Episode 1: 1 Bild/2 Texte, Episode 3: 1 Bild/0 Texte).
- **Committed in:** `6c55288d` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3, blocking)
**Impact on plan:** Notwendig, um Task 2s explizites Acceptance-Criterion zu erfuellen; additiv und risikoarm (keine neue Tabelle, kein neuer Service, betrifft nur die neue Cursor-Route). Kein Scope-Creep.

## Issues Encountered
- Ein erster Testentwurf fuer `ReleasesSection.test.tsx` rendere direkt gegen `LatestReleaseSection` (async Server-Component) via `renderToStaticMarkup` und schlug mit "Objects are not valid as a React child (found: [object Promise])" fehl — async Server-Components lassen sich ausserhalb der Next.js-RSC-Pipeline nicht mit `react-dom/server` rendern. Geloest durch `vi.mock` fuer `LatestReleaseSection`/`OlderReleasesList`, sodass der Test nur `ReleasesSection`s eigene Kompositionslogik prueft.
- `jsdom` kennt kein `IntersectionObserver` — `OlderReleasesList.test.tsx` stubbt eine Minimal-Klasse, damit der Autoload-Effekt nicht wirft; die Tests decken damit gezielt den manuellen "Mehr laden"-Pfad ab (AO4-25).
- Ein einzelner `curl`-Request gegen `:3000` timete waehrend paralleler Next-Dev-Kompilierung anderer Routen aus (ENOMEM-Warnungen im Container deuten auf begrenzten Arbeitsspeicher hin); ein direkt folgender Request lieferte 200 mit korrektem Inhalt — kein Implementierungsfehler, sondern Umgebungs-Ressourcenengpass.

## Live Verification (statt nur Code-Level)

Backend neu gebaut (`docker compose up -d --build team4sv30-backend`) und Frontend neu gestartet (`docker restart team4sv30-frontend`):
- `GET /api/v1/anime/1/group/1/release-list?limit=5` → `200`, `images_count`/`notes_count` pro Episode korrekt befuellt (z. B. Episode 1: `images_count:1, notes_count:2`).
- `GET /api/v1/anime/1/group/1/releases/1` → `200`, vollstaendiges Release-Detail mit realem Bild (`fun_outtake`) und zwei Texten.
- `GET http://localhost:3000/anime/1/group/1` → `200`, gerenderter Flight-Payload bestaetigt: `LatestReleaseSection` zeigt das neueste Release ("Vipers Creed. S01E12-CSubs.mkv") mit Link `/anime/1/group/1/releases/12` und dem Text "Vollständiges Release ansehen" (korrekte Umlaute); `OlderReleasesList` rendert `id="weitere-releases"`; der Sammel-Hinweis zeigt exakt "Beteiligte am Projekt, Geschichte, OP/ED/Middle" (Releases und Medien sind fuer dieses Anime/Gruppe nicht leer); keine einzelnen "Noch keine ..."-Texte mehr im Markup.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Der Detail-Link aus `LatestReleaseSection` sowie die Zeilen-Links aus `OlderReleasesList` zeigen bereits auf `/anime/:id/group/:groupId/releases/:releaseVersionId` — diese Route existiert als Frontend-Seite noch nicht (das ist Scope von 99-12/AO4-15..20), die verlinkte URL ist aber bereits final korrekt.
- `images_count`/`notes_count` sind jetzt fuer die Cursor-Release-Liste verfuegbar; sollte eine kuenftige Cursor-Liste auch die Offset-Variante `GetGroupReleases` beruehren wollen, muesste dieselbe Erweiterung dort nachgezogen werden (aktuell bewusst nicht noetig, da `releases/page.tsx` diese Felder nicht rendert).

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-08*

## Self-Check: PASSED

All created files verified present on disk; all three task commit hashes (`219e2c5a`, `6c55288d`, `428eb82d`) verified present in git log.
