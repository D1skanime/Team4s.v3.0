---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "13"
subsystem: ui
tags: [nextjs, react, typescript, go, gin, pgx, cursor-pagination, intersection-observer]

# Dependency graph
requires:
  - phase: 99-08
    provides: Cursor-Client-Funktionen getGroupReleaseImages/getGroupReleaseNotes + generischer CursorPage<T>-Typ
  - phase: 99-12
    provides: Release-Detailroute-Geruest (page.tsx, Hero/ContributorsRow/ThemeTimeline), in das Galerie/Textliste eingesetzt werden
provides:
  - "ReleaseGallery: vollstaendige Bildergalerie als Grid mit Typ-Tag (AO4-05) und Autor-Chip pro Bild, Cursor-Nachladen (AO4-18/24)"
  - "ReleaseNotesList: vollstaendige Textliste als Karten mit Avatar/Name/Zeitpunkt/Inhalt, Cursor-Nachladen (AO4-19/24)"
  - "PublicReleaseImage.author_name (Backend+Contract+TS-Typ) — Rule-2-Ergaenzung, ohne die AO4-18-Autor-Chip-Anforderung nicht erfuellbar war"
affects: ["99-14-uat-und-abschluss"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IntersectionObserver + manueller 'Mehr laden'-Button (AO4-25) identisch zum bereits verifizierten OlderReleasesList-Muster (99-11), fuer beide neuen Listen wiederverwendet"
    - "Dedupe-per-id beim Anhaengen nachgeladener Cursor-Seiten an bereits vom Aggregat-Endpoint gelieferte Initialdaten — verhindert doppelte Kacheln/Karten falls die vollstaendig ladende Aggregat-Reihenfolge und die Seek-Cursor-Reihenfolge je einmal divergieren"
    - "RichTextRenderer (@/components/editor) fuer body_html statt eigenem dangerouslySetInnerHTML — folgt der bestehenden Projektkonvention aus MemberGroupsHistorySection.tsx ('kein dangerouslySetInnerHTML ausserhalb')"
    - "LATERAL-Subquery-Join (uploader_author) in loadImages()/ListReleaseVersionImagesCursor() statt direkter JOINs, um Zeilen-Fan-out ueber mehrere member_claims-Zeilen pro app_user_id zu vermeiden — ein Bild bleibt eine Ausgabezeile"

key-files:
  created:
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.module.css
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.module.css
  modified:
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx
    - backend/internal/repository/release_detail_public_repository.go
    - backend/internal/repository/release_detail_public_repository_helpers.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/releaseDetail.ts

key-decisions:
  - "Rule 2 (fehlende kritische Funktionalitaet): Das Plan-Read-First fuer Task 1 nahm faelschlich an, releaseDetail.ts enthalte bereits ein Autor/Uploader-Feld fuer Bilder. Tatsaechlich fehlte author_name in PublicReleaseImage komplett (weder im Aggregat- noch im Cursor-Endpoint) — ohne dieses Feld war der von AO4-18 zwingend geforderte Autor-Chip nicht darstellbar. Additiv ergaenzt: LATERAL-Join release_version_media.uploaded_by_user_id -> users -> app_users(legacy_user_id) -> member_claims(claim_status='verified') -> members, mit Fallback-Kaskade (Mitglieds-Anzeigename > App-User-Anzeigename > legacy Username). Keine Schema-Aenderung (Spalte existiert seit Migration 0059); OpenAPI-Contract + TS-Typ gespiegelt. Kein Rule-4-Fall: kein neues Schema, kein neuer Service-Layer, kein Breaking Change — rein additive Query-/DTO-Erweiterung an einem bereits in diesem Plan bearbeiteten Endpoint."
  - "Initialdaten aus dem Aggregat-Endpoint (detail.images/detail.notes, vollstaendig unpaginiert laut 99-07) werden 1:1 als erste Seite an ReleaseGallery/ReleaseNotesList uebergeben (kein redundanter Initial-Fetch). Da die Aggregat-Reihenfolge fuer Bilder identisch zur Cursor-Reihenfolge ist (sort_order ASC, id ASC), aber fuer Texte bewusst abweicht (Aggregat: sort_order/created_at/id vs. Cursor: created_at/id, siehe 99-08-Entscheidung), wird jede nachgeladene Cursor-Seite defensiv per id gegen bereits vorhandene Items dedupliziert — unabhaengig von Sortier-Details nie doppelte Kacheln/Karten."
  - "hasMore wird initial aus initialItems.length < totalCount berechnet. Da der Aggregat-Endpoint aktuell unbegrenzt laedt (images_count/notes_count == len(images)/len(notes) immer), ist hasMore in der Praxis heute immer false — Infinite-Scroll/'Mehr laden' ist strukturell fertig und typecheck-sauber, aber mit den aktuellen Testdaten (1 Bild, 2 Texte) nicht im befuellten Nachlade-Zustand live abnehmbar (analog zur bereits in 99-12 dokumentierten Einschraenkung fuer Beteiligte/Themes)."
  - "Notiz-Avatare bleiben Initialen-Placeholder ohne loading=\"lazy\" (kein <img>-Element) — release_version_notes liefert kein Avatarbild, identisch zur in 99-12 dokumentierten ContributorsRow-Entscheidung."

requirements-completed: [AO4-18, AO4-19, AO4-05, AO4-21, AO4-22, AO4-23, AO4-24, AO4-25]

# Metrics
duration: ~50min
completed: 2026-07-08
---

# Phase 99 Plan 13: Release-Detailseite — Bildergalerie und Textliste mit Cursor-Infinite-Scroll Summary

**ReleaseGallery (Grid mit Typ-Tag + Autor-Chip) und ReleaseNotesList (Karten mit Avatar/Zeitpunkt/Inhalt) laden per Seek-Cursor nach (IntersectionObserver + "Mehr laden"), lazy/srcSet-Bilder ohne Layout-Sprung — inklusive einer additiven Backend-Ergaenzung, die den bislang komplett fehlenden Bild-Autornamen aufloest.**

## Performance

- **Duration:** ~50 min
- **Completed:** 2026-07-08
- **Tasks:** 3/3
- **Files modified:** 9 (4 created, 5 modified)

## Accomplishments
- `ReleaseGallery` rendert die vollstaendige Bildergalerie als responsives Grid; jede Kachel zeigt eine feste Aspect-Ratio-Box (`loading="lazy"`, `srcSet`/`sizes`), einen Typ-Tag aus `CATEGORY_LABELS` (AO4-05) und einen Autor-Chip; Nachladen automatisch per `IntersectionObserver` und manuell per `Button` "Mehr laden" (AO4-21/24/25).
- `ReleaseNotesList` rendert die vollstaendige Textliste als Karten (Initialen-Avatar, Name, Rolle, deutsches Datum/Zeit-Format, sanitizter Inhalt via `RichTextRenderer`), identisches Nachlade-Muster wie die Galerie.
- Backend-Luecke geschlossen: `PublicReleaseImage` hatte in beiden Endpunkten (Aggregat + Cursor) **kein** Autor-/Uploader-Feld — die von AO4-18 zwingend geforderte Sichtbarkeit von Typ-Tag UND Autor-Chip war damit nicht erfuellbar. Additiv ergaenzt (`author_name`), live gegen Docker verifiziert: `GET /api/v1/anime/1/group/1/releases/1` und `.../releases/1/images` liefern jetzt `"author_name":"CSubs Leader"`.
- `page.tsx` bindet beide Komponenten mit den bereits geladenen Initialdaten (`detail.images`/`detail.notes`) plus IDs ein; Reihenfolge Hero → Beteiligte → Galerie → Textliste → OP/ED/Middle-Timeline; leere Sektionen blenden sich selbst aus.
- Live gegen Docker (Frontend neu gestartet) verifiziert: `/anime/1/group/1/releases/1` zeigt die Sektionen "Galerie" und "Textbeiträge", den Typ-Tag "Outtake", den Autor-Chip "CSubs Leader" (3x im Markup: Hero-Kontext ausgenommen), `srcSet`/`sizes` und `loading="lazy"` am Galerie-Bild. Regressionscheck `/anime/1/group/1` weiterhin 200.

## Task Commits

Each task was committed atomically:

1. **Task 1: ReleaseGallery (Grid, Typ-Tag + Autor, Cursor-Infinite-Scroll) + Backend author_name** - `b7b981f3` (feat)
2. **Task 2: ReleaseNotesList (Karten, Cursor-Infinite-Scroll)** - `4a8bd978` (feat)
3. **Task 3: Galerie und Textliste in die Detailroute einbinden** - `c72153ad` (feat)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx` (150 Zeilen) — Bild-Grid mit Typ-Tag/Autor-Chip, Cursor-Nachladen, Dedupe-per-id
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.module.css` — Token-basierte Styles (feste Aspect-Ratio-Boxen, Skeleton-Kacheln)
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx` (146 Zeilen) — Text-Karten mit Avatar/Name/Zeitpunkt/RichTextRenderer, Cursor-Nachladen
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.module.css` — Token-basierte Styles (Skeleton-Karten fester Hoehe)
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx` — Komponenten eingebunden, Reihenfolge Hero→Beteiligte→Galerie→Textliste→Timeline
- `backend/internal/repository/release_detail_public_repository.go` — `PublicReleaseImage.AuthorName` ergaenzt, `ListReleaseVersionImagesCursor` liefert `author_name`
- `backend/internal/repository/release_detail_public_repository_helpers.go` — `uploaderAuthorNameJoin`-Konstante (LATERAL-Subquery), `imagesQuery()`/`loadImages()` liefern `author_name`
- `shared/contracts/openapi.yaml` — `PublicReleaseImage.author_name` (nullable string) dokumentiert
- `frontend/src/types/releaseDetail.ts` — `PublicReleaseImage.author_name: string | null` ergaenzt

## Decisions Made
Siehe `key-decisions` im Frontmatter fuer die vier wichtigsten Entscheidungen (Rule-2-Backend-Ergaenzung fuer author_name, Initialdaten+Dedupe-Strategie, hasMore-Berechnung und deren praktische Nicht-Testbarkeit mit aktuellen Testdaten, Notiz-Avatare ohne loading="lazy").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] PublicReleaseImage.author_name ergaenzt (Backend + Contract + TS-Typ)**
- **Found during:** Task 1, beim Lesen von `frontend/src/types/releaseDetail.ts` (Plan-Read-First behauptete faelschlich, ein Autor/Uploader-Feld existiere bereits)
- **Issue:** Weder der Aggregat-Endpoint (`GetPublicReleaseDetail`/`loadImages`) noch der Cursor-Endpoint (`ListReleaseVersionImagesCursor`) lieferten irgendein Autor-/Uploader-Feld fuer Bilder. AO4-18 verlangt explizit "pro Bild sind Typ-Tag UND Autor-Chip sichtbar" — ohne Datenquelle war das nicht erfuellbar.
- **Fix:** `uploaderAuthorNameJoin` (LATERAL-Subquery: `release_version_media.uploaded_by_user_id -> users -> app_users(legacy_user_id) -> member_claims(claim_status='verified') -> members`, Fallback-Kaskade Mitglieds-Anzeigename > App-User-Anzeigename > legacy Username) in `imagesQuery()` und `ListReleaseVersionImagesCursor` ergaenzt; `PublicReleaseImage.AuthorName *string` (json: `author_name`) hinzugefuegt; OpenAPI-Schema und TS-Typ gespiegelt.
- **Files modified:** `backend/internal/repository/release_detail_public_repository.go`, `backend/internal/repository/release_detail_public_repository_helpers.go`, `shared/contracts/openapi.yaml`, `frontend/src/types/releaseDetail.ts`
- **Verification:** `go build ./...` (Exit 0), Backend-Container neu gebaut, live `GET /api/v1/anime/1/group/1/releases/1` und `.../releases/1/images` liefern `"author_name":"CSubs Leader"`; Frontend zeigt den Chip live im Markup.
- **Committed in:** `b7b981f3` (Task 1 Commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — fehlendes kritisches Datenfeld)
**Impact on plan:** Notwendig, um die AO4-18-Kernanforderung (Autor-Chip) ueberhaupt erfuellbar zu machen; rein additive Query-/DTO-Erweiterung ohne Schema-Aenderung, kein Scope-Creep in Richtung neuer Endpunkte/Tabellen.

## Issues Encountered
None ueber die dokumentierte Deviation hinaus. Backend-Rebuild (`docker compose up -d --build team4sv30-backend`) und Frontend-Neustart (`docker restart team4sv30-frontend`) liefen ohne Zwischenfaelle.

## Live Verification (statt nur Code-Level)

Backend neu gebaut, Frontend neu gestartet:
- `GET http://localhost:18092/api/v1/anime/1/group/1/releases/1` → `200`, `images[0].author_name = "CSubs Leader"`.
- `GET http://localhost:18092/api/v1/anime/1/group/1/releases/1/images?limit=5` → `200`, identischer `author_name`-Wert im Cursor-Endpoint.
- `GET http://localhost:3000/anime/1/group/1/releases/1` → `200`; Markup enthaelt "Galerie", "Textbeiträge", "Outtake" (Typ-Tag), "CSubs Leader" (Autor-Chip + Notiz-Autor), `srcSet="... 480w, ... 1280w"`, `sizes="(max-width: 640px) 50vw, ..."`, `loading="lazy"` am Galerie-Bild.
- Regressionscheck: `GET http://localhost:3000/anime/1/group/1` weiterhin `200` nach dem Frontend-Neustart.
- `go test ./internal/repository/... -run TestTrimCursorPage` → alle 3 Subtests PASS (unveraendert, da `trimCursorPage` selbst nicht angefasst wurde).
- `cd frontend && npm run typecheck` → fehlerfrei; `npx eslint` auf allen drei betroffenen Dateien → keine Fehler.

Nicht live abnehmbar mit aktuellen Testdaten: der befuellte Nachlade-Zustand (`hasMore=true` → IntersectionObserver/"Mehr laden" tatsaechlich ausgeloest), da der Aggregat-Endpoint aktuell unbegrenzt laedt und `images_count`/`notes_count` fuer alle geprueften Releases exakt der Anzahl bereits gelieferter Items entspricht (analog zur in 99-12 dokumentierten Einschraenkung).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Release-Detailseite (AO4-15 bis AO4-25) ist vollstaendig: Hero, Beteiligte, Galerie, Textliste, OP/ED/Middle-Timeline.
- 99-14 kann die verbleibende Live-UAT/Abschluss-Verifikation der gesamten Add-on-4-Phase durchfuehren, inklusive des in dieser wie in 99-12 dokumentierten Vorbehalts, dass befuellte Nachlade-Zustaende (Beteiligte, Themes, jetzt auch Galerie/Textliste-Cursor-Fortsetzung) mit den aktuellen Testdaten nur im Leerfall/Vollfall, nicht im echten Mehrseiten-Nachlade-Fall pruefbar sind.
- Sollte ein zukuenftiger Release mit sehr vielen Bildern/Texten den Aggregat-Endpoint spuerbar verlangsamen, waere eine Begrenzung von `loadImages`/`loadNotes` (z. B. auf die erste Cursor-Seite) ein sinnvoller Folge-Schritt — aktuell aus Plan-Scope-Gruenden nicht umgesetzt.

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-08*

## Self-Check: PASSED

- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.module.css
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.module.css
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx
- FOUND: backend/internal/repository/release_detail_public_repository.go
- FOUND: backend/internal/repository/release_detail_public_repository_helpers.go
- FOUND commit: b7b981f3
- FOUND commit: 4a8bd978
- FOUND commit: c72153ad
