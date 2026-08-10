---
phase: "122"
name: "Öffentliche Projekt-Member-Seite mit Beiträgen, Medien und Release-Historie"
created: 2026-08-10
status: Ready for planning
---

# Phase 122: Öffentliche Projekt-Member-Seite mit Beiträgen, Medien und Release-Historie — Context

**Gathered:** 2026-08-10
**Method:** Section-32 analyse-first Recherche gegen den Live-Code (`/home/d1sk/team4s`), read-only.

<domain>
## Phase Boundary

Neue **öffentliche, read-only** Seite, die ausschliesslich die Mitwirkung **eines** Members an
**genau einem** Anime-Projekt innerhalb **genau einer** Fansubgruppe zeigt — die kombinierte Sicht
`Member × Fansubgruppe × Anime`. Beantwortet: „Was hat dieser Member bei genau diesem Projekt
öffentlich beigetragen?"

**Bewusst NICHT:** kein zweites allgemeines Memberprofil, keine globalen Badges/Punkte/
Achievements, keine anderen Projekte/Gruppen, keine projektübergreifende Historie, keine
Wiederverwendung aus dem privaten `/me/...`-Bereich. Erzeugt **keine** neue Media-Ownership
(Medien bleiben release-version-scoped, §22).

**Reihenfolge/Abhängigkeit:** baut auf den bestehenden öffentlichen Fansub-Projektseiten
(`anime/[id]/group/[groupId]/ProjectPage`) und ihrem Daten-Loader auf. Läuft neben Phase 121
(EXECUTING); Nutzer hat entschieden, 121 unberührt zu lassen.

## Recherche-Kernbefunde (Ist-Zustand, verifiziert)

- **Link-Stelle (§2):** genau `frontend/src/components/fansubs/ProjectMemberRows.tsx`, nur benutzt
  von `app/anime/[id]/group/[groupId]/sections/TeamSection.tsx`. Aktuell:
  `member_slug !== null` -> `<Link href={'/members/' + slug}>`; slug-lose externe Contributor ->
  nicht-klickbares `<div>` (erfüllt §2 bereits). Test: `ProjectMemberRows.test.tsx`.
- **Route-Helper:** `frontend/src/lib/fansubProjectRoutes.ts` (`buildPublicFansubProjectPath`,
  `buildPublicFansubReleasePath`). Slug->ID-Auflösung über `getPublicFansubProfileBySlug`.
- **Rollen (§3.1):** `group_contributors_repository.go::GetProjectContributors(animeID, groupID)`
  liefert Member×anime×group-Rollen aus zwei Quellen: `anime_contributions` (Projektrollen) +
  `release_member_roles` (Per-Version-Crew).
- **Notes (§3.2):** `release_version_notes` (`rvn`) hat `member_id`, `role_id`,
  `release_version_id`, `fansub_group_id`, `visibility IN ('public','internal')`,
  `status IN ('draft','published','archived','deleted')`. Repo kann bereits
  `WHERE rvn.member_id = $2`. Öffentlich = `visibility='public' AND status='published'`.
- **Media (§3.3):** `release_version_media` besitzt `release_version_id` + `fansub_group_id` +
  `media_asset_id` + `uploaded_by_user_id` (Uploader, -> `users`). **Keine** Member-Contributor-
  Spalte. Sichtbarkeit über `media_assets.visibility_id` + `review_status_id` +
  `release_version_media.deleted_at IS NULL` + Ausschluss `review.rejected`-Audit.
- **Release-Mitwirkung (§3.4):** `release_member_roles` × `release_versions` ×
  `release_version_groups` (kanonische Spalte `fansub_group_id`, NIE `fansubgroup_id`).
- **Sichtbarkeit Contributions (§22):** `ac.is_public_on_anime_page = true AND hfgm.visibility =
  'public'` (+ `status='confirmed'` = verified). Das vom Brief vermutete Feld existiert exakt.
- **Cursor-Pagination:** `backend/internal/repository/release_cursor_pagination.go` — seek-based,
  `limit+1`-Overfetch, `DefaultCursorPageLimit=24`, `MaxCursorPageLimit=100`.
- **Bild-Infra:** `components/ui/ResponsiveImage.tsx` + `hooks/useNearViewportActivation.ts`.
- **Media Viewer:** `components/fansubs/FansubMediaLightbox.tsx` (109 Z.) — hat ArrowLeft/Right,
  Escape, `role=dialog`/`aria-modal` (via `Modal`), Prev/Next-Wrap, `n/N`-Zähler. Aber: einfaches
  Bild-Overlay, KEIN Desktop-Sidebar-Layout, KEIN Nachbar-Prefetch.
</domain>

<decisions>
## Implementation Decisions

### D-01 Abgrenzung (LOCKED)
Kombinierte öffentliche Read-View `Member × Fansubgruppe × Anime`. Niemals Contributions aus
anderen Anime/Gruppen oder globale Member-Aktivität. Keine Profilkopie (§26).

### D-02 Route (LOCKED)
`/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]`. Slug->ID wie die bestehende
Projektseite (`getPublicFansubProfileBySlug` -> `project.id`, `group.id`). Neuer Route-Helper in
`fansubProjectRoutes.ts`.

### D-03 Link-Verhalten (LOCKED)
Änderung NUR in `ProjectMemberRows.tsx` (isoliert, nur via `TeamSection`). Komponente erhält
`groupSlug` + `animeSlug` als Props und verlinkt interne Member auf die Projekt-Member-Route;
ganze Karte klickbar; optionale Affordance „Beiträge im Projekt ansehen ->" ist KEIN zweiter
Navigationsweg. Externe ohne Slug bleiben `<div>`. Alle anderen Member-Links (Ranking, Gruppen-
seite, Archiv, `members/[slug]`) UNVERÄNDERT. Regression in `ProjectMemberRows.test.tsx`.

### D-04 Rollen (LOCKED)
Reuse `GetProjectContributors(animeID, groupID)`-Logik; Rollen im Hero/darunter als Chips.
Keine globalen Memberrollen.

### D-05 Notes projektweit (LOCKED)
Neue member-scoped, projektweite Notes-Collection aus `release_version_notes` gefiltert auf
`member_id` + Release-Versionen des (anime, group) + `visibility='public' AND status='published'`.
Release-/Folgenkontext bleibt Metadatum je Karte. Cursor-Pagination, initial ~15.

### D-06 Media-Attribution (LOCKED — Stop-Condition-Entscheid, Nutzer 2026-08-10)
„Medien dieses Members" = `release_version_media` gefiltert auf `uploaded_by_user_id`, aufgelöst
zum Member über `member_claims (app_user_id <-> member_id)` / `members.user_id`. **Kein
Schema-Change.** Ownership bleibt release-version-scoped (§22 erfüllt). Sichtbarkeit:
`media_assets.visibility_id` public + gültiger `review_status` + `deleted_at IS NULL` + kein
`review.rejected`. Cursor-Pagination, initial ~24.
**Dokumentierte Fragilität:** Admin-Uploads „on behalf", ungeclaimte Member und Mehrfach-Claims
können zu fehlender/ungenauer Zuordnung führen. Counts zählen nur eindeutig auflösbare,
öffentliche Medien (§23). Siehe DECISIONS.md.

### D-07 Release-Mitwirkung (LOCKED)
Eigener Abschnitt aus `release_member_roles` (member-scoped, pro Release-Version), kompakte Cards
(Folge, Version, bestätigt-Datum, Rollen, „Release ansehen ->" via `buildPublicFansubReleasePath`).
KEINE Wiedereinbettung von Texten/Bildern (§16). Cursor-Pagination, initial ~15.

### D-08 Backend Read-Contract (LOCKED)
Neuer öffentlicher, getrennter Endpoint-Satz (§21), z. B.
`GET /api/v1/fansubs/:groupId/anime/:animeId/members/:memberSlug` (Hero + Projektbeziehung +
Rollen + Summary-Counts) und getrennte paginierte `/notes`, `/media`, `/releases`. Keine
Riesen-Response. OpenAPI (`shared/contracts/openapi.yaml`) + `frontend/src/types/*` +
`frontend/src/lib/api.ts` im selben Change aktualisieren.

### D-09 Zentrale Visibility-Policy (LOCKED)
Die heute verstreuten Public-Filter (Contributions/Notes/Media) in einer zentralen Backend-Policy
bündeln, damit alle vier Collections dieselbe „öffentlich in diesem Projektkontext"-Regel nutzen.
Versteckte Inhalte NICHT über Counts verraten (§23).

### D-10 404 vs. Empty State (LOCKED)
404 wenn Anime/Gruppe/Member fehlt, Gruppe+Anime nicht kombiniert existiert, oder Member keine
fachliche Projektbeziehung hat. Empty State (kein 404) wenn Beziehung existiert, aber 0
öffentliche Notes/Media/Release-Details (§24). Nie auf `/members/[slug]` umleiten.

### D-11 Reuse Bild-/Viewer-Infra (LOCKED, mit Erweiterung)
`ResponsiveImage` + `useNearViewportActivation` wiederverwenden. `FansubMediaLightbox` als Basis;
für §14–18 erweitern (Desktop Bild+Sidebar, Mobile gestapelt, Nachbar-Prefetch, Thumbnail/Preview/
Original-Varianten). Extend-vs-neu ist Discretion, siehe unten.

### D-12 Rollen-Platzierung (LOCKED — Discuss 2026-08-10)
Rollen-Chips NUR im Hero (kompakt). Kein separater "Rollen in diesem Projekt"-Block unter dem Hero
(vermeidet Redundanz mit den Summary-Counts, haelt Hero fokussiert). Betrifft 122-05.

### D-13 Empty-State-Umfang (LOCKED — Discuss 2026-08-10)
Member mit Projektbeziehung aber 0 oeffentlichen Detailbeitraegen: NUR Hero + Rollen + freundlicher
Hinweistext (Brief-24-Beispiel). Leere Sektionen (Texte/Bilder/Releases) UND die Sticky-Nav werden im
Leerfall komplett ausgeblendet — keine "0"-Sektions-Header. Betrifft 122-05.

### D-14 Karten-Affordance (LOCKED — Discuss 2026-08-10)
"Beitraege im Projekt ansehen ->" erscheint NUR bei Hover/Fokus der Memberkarte; der Chevron bleibt
permanente Affordance. Kein zweiter, konkurrierender Navigationsweg (ein Link/Karte). Betrifft 122-04.

### D-15 Textkarten-Ueberschrift (LOCKED — Discuss 2026-08-10)
Textbeitrag-Karte: Rolle als Ueberschrift (Brief-Beispiel "Qualitaetspruefung"), "Beitrag zu Folge X"
als Sekundaerzeile. `release_version_notes.title` wird nur zusaetzlich angezeigt, wenn vorhanden und
nicht leer. Betrifft 122-06.

### D-16 Rueckwege zum Projekt (LOCKED — Discuss 2026-08-10, bestaetigt)
Zwei sichtbare Rueckwege zur oeffentlichen Projektseite sind PFLICHT: (a) Hero-Button "Zurueck zum
Projekt" -> buildPublicFansubProjectPath(fansubSlug, animeSlug); (b) Breadcrumb Anime-Ebene ->
derselbe Projektpfad. Zusaetzlich Breadcrumb Gruppe -> /fansubs/[slug]. Explizit als must_have in
122-05.

### D-17 Breitbild/Wide-Screen-Responsiveness (LOCKED — Discuss 2026-08-10)
Die Seite muss auf breiten/ultrabreiten Desktop-Monitoren (1920, 2560, Ultrawide 3440) genauso gut
aussehen wie auf Laptop-Desktop — nicht nur ein schmales 1440-Layout mit riesigen Leerraendern:
- Lesesektionen (Breadcrumb, Hero, Summary, Texte, Releases) auf sinnvolle max content-width
  (~1440-1600px) begrenzen, zentriert — keine ueberbreiten Textzeilen.
- Der Galerie-Container darf breiter sein als die Lesesektionen und die Spaltenzahl auf breiten
  Viewports ERHOEHEN statt Thumbnails aufzublasen: ~4 Spalten @ 1280-1680, ~5 @ ~1920, ~6 @ ~2560+.
  Feste aspect-ratio je Karte (kein CLS), Thumbnails behalten sinnvolle Groesse.
- Media Viewer bleibt max-width ~1400-1600px (D-11), auf Ultrawide zentriert.
- Test-Matrix (122-10) erweitern: zusaetzlich 1920 und 2560 (optional 3440) zu 320/390/768/1024/1440.
Betrifft 122-05, 122-07, 122-09, 122-10.

## Discretion Areas
- Genaues Spalten-/Grid-Layout (Texte 2-spaltig, Galerie 4/3/2/1) und Sticky-Nav-Umsetzung.
- Media Viewer: `FansubMediaLightbox` erweitern ODER dediziertes Projekt-Member-Viewer-Komponente,
  falls Erweiterung die bestehende Semantik (Wrap durch ALLE Gruppen-Medien) bräche.
- Mapping „ein Textbeitrag" = eine `rvn`-Zeile (member+role+release_version) inkl. „Mehr anzeigen".
- Cursor-Seitengrössen final (Notes/Releases ~15, Media ~24) innerhalb der Helper-Grenzen.

## Deferred Ideas
- Falls die Uploader->Member-Zuordnung (D-06) fachlich unzureichend wird: explizite nullable
  `member_id`-Contributor-Spalte auf `release_version_media` als eigene spätere Phase.
</decisions>
