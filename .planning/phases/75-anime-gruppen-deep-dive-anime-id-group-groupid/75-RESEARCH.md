# Phase 75: Anime-Gruppen-Deep-Dive `/anime/[id]/group/[groupId]` - Research

**Researched:** 2026-06-05
**Domain:** Next.js App Router (Server Component) · öffentliche Read-Oberfläche · Go-Backend-Seams (neue Projektions-Endpoints) · Brownfield-Umbau
**Confidence:** HIGH (alle Kernbefunde direkt im Quellcode und in den Planungsartefakten verifiziert)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Narrative, einspaltige Scroll-Seite (analog Phase 73). Bestehende Hero-/Showcase-Logik wandert in Abschnitte — kein Wegwerfen der Logik. Keine neue Route.
- **D-02:** Verbindliche Abschnittsreihenfolge: Hero → Projektstory → Mitwirkende & beteiligte Member → Releases/Versionen → OP/ED/Middle (Themes) → Release-Version-Medien → Deep-Links/Rückverlinkung. (Bewusst: Menschen vor Releases.)
- **D-03:** Kuratierte Releases-Vorschau auf der Hauptseite + bestehende `/releases`-Subpage als volle Liste. Subpage (Filter OP/ED/Karaoke, Suche, Pagination) bleibt erhalten.
- **D-04:** Sektions-Navigation: Desktop = klebende Anker-Nav (Story · Mitwirkende · Releases · OP/ED/Middle · Medien); Mobil = klebende, horizontal scrollbare Chip-Leiste mit denselben Sprungmarken.
- **D-05:** Empty States = Abschnitt sichtbar mit dezentem Platzhalter (z. B. „Noch keine Mitwirkenden hinterlegt") — stabile Struktur/Anker.
- **D-06:** Projektspezifische Personenmenge — nur wer an DIESEM Anime für DIESE Gruppe mitwirkte. Quellen: `release_member_roles` + `anime_contributions`/`anime_contribution_roles`, gescoped auf Anime+Gruppe. KEIN voller Gruppen-Roster.
- **D-07:** Zwei getrennte Blöcke (Decision 3 LOCKED): „Team-Beteiligte" (App-Member-Rollen an den Releases) und abgesetzter Block „Externe Mitwirkende" (`anime_contributions`). Eine Contribution erscheint NIE im Team-Block.
- **D-08:** Rollen aggregiert je Person übers Projekt. Pro-Version-Aufschlüsselung in `/releases`-Tiefe.
- **D-09:** Verlinkung: geclaimt → `/members/[slug]`; ungeclaimt → nur Name/Nennung, kein Link.
- **D-10:** Kuratierte Releases-Highlights auf der Hauptseite (neueste/wichtigste) + Link zur vollen `/releases`-Liste.
- **D-11:** Mehrere Release-Versionen je Release sichtbar machen, wo Daten es hergeben (v1/v2, TV/BD).
- **D-12:** Dedizierter Themes-Abschnitt für OP/ED/Middle: Themes der Gruppe gruppiert nach Typ, mit Theme-Infos. Reuse theme/segment-APIs.
- **D-13:** Themes-Abschnitt MIT visuellen Asset-Einblicken — öffentliche Theme-/Segment-Assets zeigen, sofern sichtbar/freigegeben. Read-only.
- **D-14:** Eigener „Release-Einblicke"-Abschnitt, Galerie öffentlicher `release_version_media` dieser Gruppe/dieses Anime. Quelle: `getReleaseVersionMedia`.
- **D-15:** Sichtbarkeit strikt: nur öffentlich+freigegebene Medien. Bei keinen sichtbaren Medien bleibt der Abschnitt mit dezentem Platzhalter erhalten.

### Claude's Discretion
- Konkrete Komponenten-Aufteilung (Refactor der bestehenden `page.tsx` in Section-Komponenten vs. neue Section-Komponenten), CSS-Module-Struktur, Sticky-Nav-/Chip-Implementierung, exakte Anzahl/Sortierung der Releases-Highlights, Aggregations-/Sortier-Schwellwerte — Planner/Executor, solange D-01..D-15 und die v1.2-Locks eingehalten werden.
- Ob bestehende öffentliche Helper erweitert oder neue Projektions-Felder/-Endpoints aus Phase 72 konsumiert werden — Planner-Entscheid unter Lock K (Contract-zuerst). Hinweis: Für projektspezifische Mitwirkende/Member existiert auf dieser Route noch kein öffentlicher Read-Seam — Researcher/Planner müssen Datenherkunft und Contract-konformen Seam klären.

### Deferred Ideas (OUT OF SCOPE)
- Schreib-/Pflege-/Upload-Flows (Story pflegen, Medien bereitstellen, Contributions erfassen/prüfen) → Phasen 77/78/79.
- Vollständige Release-Liste in die Hauptseite holen / `/releases`-Subpage auflösen — verworfen (D-03).
- Pro-Release-Version-Rollenaufschlüsselung auf Hauptseite (D-08).
- Migration der nativen `<input>`-Elemente der `/releases`-Subpage — nur anfassen, falls Subpage ohnehin berührt wird.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Beschreibung | Research-Unterstützung |
|----|--------------|------------------------|
| **D** | Anime-Gruppen-Deep-Dive `/anime/[id]/group/[groupId]` stärken — bestehende Route umbaut zu narrativer Scroll-Seite | Bestandsseite (`page.tsx`, ~290 Zeilen) als Basis bestätigt; Hero/Showcase-Logik bleibt erhalten, wird zu Sektionen. |
| **A** | Kein Greenfield — bestehende Routen/APIs/Tabellen/Komponenten erweitern, keine Parallelmodelle | Alle neuen Seams müssen als Erweiterung bestehender Repos/Handler modelliert werden. Keine neue Route. |
| **G** | Medien folgen strikt der Ownership-Matrix: Release-Version-Medien → `release_version_media`; Theme-Assets → `release_theme_assets` | Klärung: beide Seams haben heute NUR Admin-Endpunkte; öffentliche Leseendpunkte müssen neu ergänzt werden (siehe Befund 3 + 4). |
| **K** | Contract-Disziplin Pflicht: OpenAPI + `lib/api.ts` + Frontend-Typen gemeinsam vor Endpoint-Änderungen | Neue öffentliche Endpunkte erfordern OpenAPI-Ergänzung, neuen `api.ts`-Helper, neue TypeScript-Typen. |
</phase_requirements>

---

## Summary

Phase 75 ist eine reine **Frontend-Umbauphase** an der bestehenden öffentlichen Route `/anime/[id]/group/[groupId]`, abhängig von Backend-Seams. Die bestehende `page.tsx` (~290 Zeilen) ist eine monolithische Server-Component, die Hero, Projektstory, GroupAssetShowcase und Edge-Navigation versammelt. Der Umbau zerlegt sie in die sieben vorgeschriebenen Sektionen (D-02) und ergänzt die fehlenden Abschnitte (Mitwirkende & Team, Themes, Release-Version-Medien-Galerie).

**Kritisches Befund-Cluster:** Für drei der sieben Sektionen existieren **heute keine öffentlichen Read-Seams**:

1. **Projektspezifische Mitwirkende & Team-Beteiligte** — es gibt keinen öffentlichen Endpoint `GET /api/v1/anime/:id/group/:groupId/contributors`. Die einzige öffentliche Contributions-Route (`GET /api/v1/anime/:id/contributions`) liefert alle Gruppen grouped by fansub, aber ohne Scope auf eine einzelne Gruppe UND ohne `release_member_roles` (App-Member-Block). Ein neuer Backend-Endpoint + Repository-Query ist erforderlich.

2. **Themes/OP/ED/Middle** — alle Theme/Segment-Endpunkte sind admin-geschützt (`/admin/anime/:id/themes`, `/admin/fansubs/:id/anime/:animeId/theme-assets`). Es gibt keinen öffentlichen Endpunkt. Für D-12/D-13 (public Theme-Einblicke mit Visibility-Gate) muss ein neuer öffentlicher Leseendpunkt ergänzt werden, der nur freigegebene/öffentliche Assets liefert.

3. **Release-Version-Medien-Galerie** — `getReleaseVersionMedia` im Frontend ruft `/api/v1/admin/release-versions/:versionId/media` auf — ein auth-geschützter Admin-Endpoint. Für D-14/D-15 (öffentliche Galerie nur freigegebener Medien) ist ein öffentlicher Seam nötig (z. B. `GET /api/v1/anime/:id/group/:groupId/release-media`).

**Konsequenz:** Phase 75 ist nicht rein Frontend — sie erfordert drei neue, schmale Backend-Endpunkte (+ Repository-Queries + OpenAPI + `api.ts`-Helper + Typen). Alle drei folgen dem bewährten Projektions-Repository-Muster aus Phase 72/73.

**Sicherer Bereich:** Die bestehende Hero-/Assets-/Releases-/Edge-Nav-Logik kann vollständig wiederverwendet werden. Die Sektions-Nav (D-04) entspricht exakt dem Phase-73-Muster.

**Primary recommendation:** Plane einen Backend-Wave (neue Projektions-Endpoints + OpenAPI + Typen), gefolgt von einem Frontend-Wave (Section-Komponenten-Umbau + Sektions-Nav). Die Story- und Releases-Sektionen können sofort auf vorhandenen Seams aufsetzen; Team/Themes/Medien sind vom Backend-Wave abhängig.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Projektstory-Abschnitt (D-02/Story) | Frontend Server (SSR/RSC) | — | Daten kommen aus `getGroupDetail` (bereits vorhanden: `group.story` aus `anime_fansub_groups.notes`). Kein neuer Seam nötig. |
| Team-Beteiligte / Externe Mitwirkende (D-06/D-07) | API / Backend (neuer Endpoint) | Frontend Server (SSR) | Kein öffentlicher Endpoint für gescope-te Personenmenge. Projektion benötigt: `release_member_roles` (App-Member) + `anime_contributions`/`anime_contribution_roles` (externe), beides WHERE anime_id=X AND group_id=Y. |
| Releases-Vorschau (D-10/D-11) | Frontend Server (SSR/RSC) | — | `getGroupReleases` existiert und liefert Episode-Releases. Für kuratierte Highlight-Vorschau: gleicher Endpoint, nur die ersten N Einträge anzeigen. Subpage bleibt die volle Liste. |
| Themes/OP/ED/Middle (D-12/D-13) | API / Backend (neuer Endpoint) | Frontend Server (SSR) | Alle theme/segment-Endpoints sind admin-geschützt. Neuer öffentlicher Endpoint erforderlich, der nur freigegebene Themes+Assets einer Gruppe+Anime liefert. |
| Release-Version-Medien-Galerie (D-14/D-15) | API / Backend (neuer Endpoint) | Frontend Server (SSR) | `getReleaseVersionMedia` ist admin-only. Öffentlicher Seam nötig mit Visibility-Gate (nur freigegebene/öffentliche Medien). |
| Sektions-Navigation (D-04) | Browser / Client | Frontend Server | Sticky-Nav ist client-seitig (Scroll-Tracking), Chip-Leiste mobil. Analog Phase 73. |
| Verlinkung geclaimt/ungeclaimt (D-09) | Frontend Server (SSR/RSC) | — | `member_slug` kommt aus dem neuen Contributions-Endpoint; null = ungeclaimt = kein Link. |
| Empty States (D-05) | Frontend Server (SSR/RSC) | — | Render-Entscheidung im RSC; kein separater Seam. |

---

## Standard Stack

Keine neuen externen Pakete in dieser Phase. Es wird ausschließlich der bestehende, in CLAUDE.md festgelegte Stack genutzt.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16 | Server Components, Routing | `frontend/package.json`; bestehende Seite nutzt diese Patterns [VERIFIED: page.tsx] |
| React | 18.3.1 | UI-Rendering | `frontend/package.json` [VERIFIED] |
| TypeScript | bestehend | Typsicherheit | ESLint-Konfiguration + `frontend/tsconfig.json` [VERIFIED] |
| Go + Gin | 1.25 / bestehend | Backend-Endpunkte | `backend/go.mod`; alle öffentlichen Handler nutzen Gin [VERIFIED: contributions_public_handler.go] |
| pgx/v5 | bestehend | Postgres-Queries | Alle Repos nutzen `pgxpool.Pool` [VERIFIED: group_repository.go] |
| `@/components/ui` | bestehend | Globales Design-System (Pflicht laut CLAUDE.md) | Showcase unter `/dev/ui-system` [ASSUMED — nicht direkt in page.tsx geprüft, aber CLAUDE.md ist bindend] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS Modules | bestehend | Komponenten-Styling | Bestehende `page.module.css` wiederverwenden und erweitern [VERIFIED: page.tsx import] |
| `CollapsibleStory` | bestehend | Story-Rendering | Bereits in `page.tsx` importiert; direkt weiternutzen [VERIFIED] |
| `GroupEdgeNavigation` | bestehend | Edge-Nav zwischen Gruppen | Bereits in `page.tsx` importiert [VERIFIED] |
| `GroupAssetShowcase` | bestehend | Episoden-Assets-Showcase | Bereits in `page.tsx` als eigene Komponente [VERIFIED] |
| `Breadcrumbs` | bestehend | Seitennavigation | Bereits in `page.tsx` importiert [VERIFIED] |

**Installation:** Keine. (`Package Legitimacy Audit` entfällt — keine externen Pakete.)

---

## Befund 1: Bestehende Seite und wiederverwendbare Seams

[VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/page.tsx]

Die bestehende `page.tsx` hat ~290 Zeilen und ist ein async Server Component. Sie ruft vier Endpoints auf:

```
getGroupDetail(animeID, groupID)   →  GET /api/v1/anime/:id/group/:groupId
getAnimeByID(animeID)              →  GET /api/v1/anime/:id
getGroupAssets(animeID, groupID)   →  GET /api/v1/anime/:id/group/:groupId/assets
getGroupReleases(animeID, groupID) →  GET /api/v1/anime/:id/group/:groupId/releases
getAnimeFansubs(animeID)           →  GET /api/v1/anime/:id/fansubs (für Edge-Nav)
```

**GroupDetail-DTO** (`types/group.ts`, `models/GroupDetail`):
```typescript
GroupDetail {
  id, anime_id, fansub_id,
  fansub: { id, slug, name, logo_url },
  story?: string | null,    // kommt aus anime_fansub_groups.notes (Legacy-Kurznotiz)
  period?: { start, end },  // heute immer null (Period nicht aus Releases abgeleitet)
  stats: { member_count, episode_count },
  created_at, updated_at
}
```

**Wichtig:** `group.story` entspricht `anime_fansub_groups.notes` — dem einfachen Legacy-Kurznotiz-Anker. Strukturierte Projektstory lebt in `anime_fansub_project_notes` (Tiptap-Editor, `body_html`). Phase 75 soll die Projektstory anzeigen — es muss geklärt werden, welches Feld genutzt wird. Empfehlung: `anime_fansub_project_notes.body_html` konsumieren (sofern Phase 72/78 dies freischaltet), mit Fallback auf `anime_fansub_groups.notes`.

**GroupReleasesData** liefert `episodes: EpisodeReleaseSummary[]` — für die kuratierte Highlights-Vorschau (D-10) können die ersten 3-5 Einträge dargestellt werden. Das Release-Modell enthält `has_op`, `has_ed`, `karaoke_count` als Felder, die in der Daten-Abfrage jedoch noch auf Dummy-Werte gesetzt sind (`ep.HasOP = false` usw.) — Hinweis für Planner: Releases-Vorschau kann `released_at`, `title`, `episode_number` zeigen; Badge-Flags noch nicht verlässlich.

---

## Befund 2: Öffentliche Contributions-Seams — was existiert, was fehlt

[VERIFIED: contributions_public_handler.go, anime_contributions_public_repository.go, main.go]

### Existierende öffentliche Endpunkte
```
GET /api/v1/anime/:id/contributions     →  GetPublicAnimeContributions (anime_contributions + anime_contribution_roles)
GET /api/v1/fansubs/:id/contributions   →  GetFansubContributions (leader_timeline + counts)
GET /api/v1/members/:slug/contributions →  GetMemberContributions (role_timeline)
```

**`GetPublicAnimeContributions`** liefert `PublicAnimeContributionsResponse.groups[]` — nach Gruppe gruppierte externe Mitwirkende eines Anime. Jede `AnimeContributionGroup` enthält:
- `fansub_group_id`, `fansub_group_name`, `fansub_group_slug`
- `contributors: PublicContributorRow[]` mit `member_display_name`, `member_slug`, `roles`, `role_labels`, `is_verified`
- `version_breakdown: ReleaseVersionBreakdownGroup[]` (versions-spezifische Beiträge)

**Was fehlt für D-06/D-07:**

(a) **Scope auf Gruppe+Anime:** Der Endpoint `/api/v1/anime/:id/contributions` liefert alle Gruppen für diesen Anime. Für die Deep-Dive wird nur die EINE Gruppe (`groupId`) benötigt. Lösung: Entweder eine neue Route `GET /api/v1/anime/:id/group/:groupId/contributors` oder client-seitig filtern. Da Lock K einen Contract-konformen Seam fordert, ist eine neue Route vorzuziehen. Die Repository-Query kann den bestehenden `GetPublicAnimeContributions`-Query mit zusätzlichem `AND ac.fansub_group_id = $2` eingrenzen — minimaler Aufwand.

(b) **App-Member-Block (D-07 „Team-Beteiligte"):** `release_member_roles` (JOIN `members`, `contributor_roles`) liefert App-Member-Rollen je Release. Diese Quelle ist heute **vollständig ohne öffentlichen Endpunkt**. Sie müsste in denselben neuen Endpoint einbezogen werden als separater Block im Response-DTO.

```sql
-- Externe Mitwirkende (Quelle anime_contributions, gescoped auf Gruppe+Anime):
SELECT DISTINCT m.display_name, slug, roles[], is_verified
FROM anime_contributions ac
JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
JOIN members m ON m.id = hfgm.member_id
WHERE ac.anime_id = $1 AND ac.fansub_group_id = $2
AND ac.is_public_on_anime_page = true AND hfgm.visibility = 'public'

-- Team-Beteiligte (Quelle release_member_roles, gescoped auf Gruppe+Anime):
SELECT DISTINCT m.id, m.display_name, m.slug, roles aggregiert
FROM release_member_roles rmr
JOIN members m ON m.id = rmr.member_id
JOIN fansub_releases fr ON fr.id = rmr.release_id
JOIN episodes e ON e.id = fr.episode_id
JOIN release_versions rv ON rv.release_id = fr.id
JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
WHERE e.anime_id = $1 AND rvg.fansub_group_id = $2
```

(c) **Claimed/Unclaimed (D-09):** `member_slug` ist in `PublicContributorRow` bereits vorhanden (NULL = ungeclaimt/ohne öffentliches Profil). Für `release_member_roles` muss der Slug analog abgeleitet werden (via `member_claims.claim_status='verified'` JOIN auf `app_users` → `members.nickname` → Slug-Ableitung).

---

## Befund 3: Themes/OP/ED/Middle — kein öffentlicher Seam

[VERIFIED: admin_routes.go, main.go — keine öffentliche Theme-Route vorhanden]

Alle Theme-/Segment-Endpoints sind admin-gesichert:
```
GET /admin/anime/:id/themes
GET /admin/anime/:id/segments
GET /admin/fansubs/:id/anime/:animeId/theme-assets
GET /admin/releases/:releaseId/theme-assets
```

**Für D-12/D-13** ist ein neuer öffentlicher Endpunkt erforderlich, z. B.:
```
GET /api/v1/anime/:id/group/:groupId/themes
```

Dieser Endpoint muss:
- Themes des Anime filtern, die durch `release_theme_assets` an Releases dieser Gruppe gebunden sind (`release_theme_assets.release_id` → `fansub_releases.id` → `release_version_groups.fansub_group_id = groupId`)
- Nur öffentlich freigegebene Assets liefern (Sichtbarkeits-Gate aus Phase-72-Projektion: `visibility='public'` UND `review_status='approved'` sobald Phase 72 diese Felder ergänzt hat)
- Theme-Infos gruppiert nach Typ (OP/ED/Middle) liefern

**Tabellen-Kette:**
```
themes → theme_segments → release_theme_assets → media_assets → media_files
                                ↓
                          fansub_releases → episodes (anime_id=X)
```

**Sichtbarkeits-Gate:** Phase 72 ergänzt Review-/Visibility-Felder auf `media_assets`. Bis Phase 72 executed ist, kann der öffentliche Theme-Endpoint einen Hilfs-Filter nutzen (z. B. `media_assets.status='ready'`). Der Planner muss entscheiden, ob Phase 75 auf Phase-72-Felder wartet oder einen vorläufigen Filter nutzt.

---

## Befund 4: Release-Version-Medien-Galerie — kein öffentlicher Seam

[VERIFIED: admin_routes.go — `GET /admin/release-versions/:versionId/media` ist auth-geschützt; frontend/src/lib/api.ts — `getReleaseVersionMedia` ruft Admin-Pfad auf]

`getReleaseVersionMedia` aus `lib/api.ts` ist explizit ein Admin-Helper und kann auf einer öffentlichen Page nicht genutzt werden (kein Auth-Token vorhanden im öffentlichen RSC-Kontext).

**Für D-14/D-15** ist ein neuer öffentlicher Endpunkt erforderlich, z. B.:
```
GET /api/v1/anime/:id/group/:groupId/release-media
```

Dieser Endpoint muss:
- `release_version_media` für alle Release-Versionen dieser Gruppe und dieses Anime aggregieren
- Nur öffentlich+freigegebene Medien liefern (Phase-72-Visibility-Gate: `visibility='public'` AND `review_status='approved'`)
- Thumbnail-URLs und Originals mit resolvePublicApiUrl auflösen (analog Admin-Handler)
- Leer-Response bei keinen sichtbaren Medien (leeres Array, kein 404)

**Tabellen-Kette:**
```
release_version_media → media_assets → media_files (Pfade)
        ↓
release_versions → fansub_releases → episodes (anime_id=X)
        ↓
release_version_groups (fansub_group_id=Y)
```

**Sichtbarkeits-Gate-Pragmatismus:** Wenn Phase 72 die Review-/Visibility-Felder auf `media_assets` noch nicht gesetzt hat zum Zeitpunkt von Phase 75, gibt es zwei Optionen:
- **Option A (empfohlen):** Öffentlicher Endpoint gibt erst dann Medien zurück, wenn Phase-72-Felder vorliegen. Phase 75 zeigt always-empty bis Phase 72 deployed ist.
- **Option B:** Provisorischer Filter (`media_assets.status='ready'`) als Fallback. Risiko: nicht freigegebene Medien könnten öffentlich erscheinen.
Der Planner muss diese Entscheidung explizit treffen.

---

## Befund 5: Anime-Fansub-Projektstory — richtiges Feld unklar

[VERIFIED: group_repository.go, db-schema-fansub-domain.md]

`GetGroupDetail` liest `anime_fansub_groups.notes` und setzt es als `detail.Story`. Laut `db-schema-fansub-domain.md` (Abschnitt 3.4) ist `anime_fansub_groups.notes` ein **einfacher Legacy-/Kurznotiz-Anker**. Strukturierte Projektstory lebt in `anime_fansub_project_notes` (Tabelle mit `body_html`, `body_markdown`, `status`, `visibility` — Tiptap-Editor, seit Migration 0066).

Für eine narrative Scroll-Seite (D-01) sollte die **strukturierte Projektstory aus `anime_fansub_project_notes.body_html`** bevorzugt werden. Dafür ist ein Repository-Query-Erweiterung in `group_repository.go` nötig (oder eigener Handler). `GetGroupDetail` muss erweitert oder ein separater Call ergänzt werden.

**Priorität:** Mittel. Wenn `anime_fansub_project_notes` für diesen Anime+Gruppe keine Zeile hat (keine Story gepflegt), ist `story` null → Empty State (D-05). Der Planner entscheidet, ob der neue Backend-Endpoint die `anime_fansub_project_notes`-Story direkt mit in der Antwort liefert oder ob es einen separaten Fetch gibt.

---

## Befund 6: Sektions-Navigation (D-04) — Phase-73-Muster

[VERIFIED: 73-CONTEXT.md D-04; CollapsibleStory.tsx, GroupEdgeNavigation.tsx bestehen]

Phase 73 etabliert das kanonische Sektions-Nav-Muster:
- **Desktop:** klebende vertikale Anker-Nav mit `<a href="#section-id">` Links
- **Mobil:** horizontal scrollbare Chip-Leiste mit denselben Sprungmarken
- Implementierung via CSS `position: sticky` + `overflow-x: auto` + `scroll-behavior: smooth`

Phase 75 soll dasselbe Muster verwenden (CONTEXT.md D-04 referenziert explizit Phase 73 D-04). Die Anker-IDs für Phase 75:
- `#story` — Projektstory
- `#team` — Mitwirkende & beteiligte Member
- `#releases` — Releases/Versionen
- `#themes` — OP/ED/Middle
- `#medien` — Release-Version-Medien

Die Sticky-Nav-Komponente aus Phase 73 kann entweder direkt importiert werden (falls Phase 73 eine eigene Komponente extrahiert) oder nach demselben Muster neu gebaut werden.

---

## Befund 7: Datei-Größen-Budget (≤450 Zeilen)

[VERIFIED: page.tsx ~290 Zeilen; CLAUDE.md Modularity-Constraint]

Die bestehende `page.tsx` hat ~290 Zeilen und enthält die gesamte Fetch-Logik plus Hero-Rendering. Nach dem Umbau werden es deutlich mehr — die Seite muss in Section-Komponenten aufgeteilt werden.

**Empfohlene Aufteilung:**
```
frontend/src/app/anime/[id]/group/[groupId]/
├── page.tsx                       # Fetch-Orchestrierung + Layout-Shell (~150 Zeilen)
├── page.module.css                # Basis-Layout + Hero-Styles (erweitern)
├── GroupAssetShowcase.tsx         # bestehend — unverändert
├── sections/
│   ├── HeroSection.tsx            # Hero + Stats + Periode (~80 Zeilen)
│   ├── StorySection.tsx           # Projektstory + CollapsibleStory (~60 Zeilen)
│   ├── TeamSection.tsx            # Team-Beteiligte + Externe Mitwirkende (~120 Zeilen)
│   ├── ReleasesSection.tsx        # Highlights-Vorschau + Link zu /releases (~100 Zeilen)
│   ├── ThemesSection.tsx          # OP/ED/Middle-Abschnitt (~120 Zeilen)
│   ├── MediaSection.tsx           # Release-Einblicke-Galerie (~100 Zeilen)
│   └── BacklinksSection.tsx       # Rückverlinkung Gruppe + Anime (~40 Zeilen)
└── GroupSectionsNav.tsx           # Sticky-Nav (Desktop+Mobil) (~80 Zeilen)
```

Alle Section-Komponenten erhalten vorberechnete Daten als Props vom Server Component `page.tsx` — kein Client-Side-Fetch in den Sections (Lock K).

---

## Befund 8: Claimed/Unclaimed — Slug-Ableitung

[VERIFIED: anime_contributions_public_repository.go, memberSlugExpr, memberDisplayExpr]

Der bestehende `memberSlugExpr` in `anime_contributions_public_repository.go`:
```go
const memberSlugExpr = `NULLIF(LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(TRIM(%s), '[^a-z0-9]+', '-', 'gi'))), '')`
```

Dieser leitet den Slug direkt aus `members.nickname` ab. **NULL** bedeutet: kein Nickname (extrem selten) oder ungeclaimt mit leerem Slug. In der Praxis: wenn `member_slug IS NULL` → ungeclaimt → nur Name anzeigen, kein Link.

Für den neuen Contributor-Endpoint gilt dieselbe Logik:
- `anime_contributions`-Block: `member_slug` aus `memberSlugExpr(m.nickname)` — NULL = kein Link
- `release_member_roles`-Block: gleiche Slug-Ableitung, aber aus `members.nickname` (via JOIN)

Der Unterschied zwischen „hat Slug, aber kein claim" und „claimed" ist fachlich: `member_claims.claim_status='verified'` bedeutet ein App-User hat das Profil geclaimt. Für die Verlinkung auf `/members/[slug]` (Phase 74) reicht es, ob ein Slug ableitbar ist — das `/members/[slug]`-Profil existiert für alle `members`-Datensätze mit Nickname, nicht nur für geclaimte. Planner-Entscheidung: soll nur verlinkt werden wenn claimed (strikte Interpretation D-09) oder wenn slug != null?

**Empfehlung (aus Phase 73 D-10 analog):** Verlinkung wenn `member_slug != null` — das entspricht dem Pattern aus Phase 73. Phase 74 steuert das Profil-Verhalten; Phase 75 verlinkt nur.

---

## Architecture Patterns

### System Architecture Diagram

```
  Browser/Visitor
       |
       v
  [Next.js Server Component: page.tsx]
       |
       |── getGroupDetail()        → GET /api/v1/anime/:id/group/:groupId
       |── getAnimeByID()          → GET /api/v1/anime/:id
       |── getGroupAssets()        → GET /api/v1/anime/:id/group/:groupId/assets
       |── getGroupReleases()      → GET /api/v1/anime/:id/group/:groupId/releases  [highlight slice]
       |── getAnimeFansubs()       → GET /api/v1/anime/:id/fansubs  [edge nav]
       |
       |── NEU: getGroupContributors()   → GET /api/v1/anime/:id/group/:groupId/contributors
       |── NEU: getGroupThemes()         → GET /api/v1/anime/:id/group/:groupId/themes
       |── NEU: getGroupReleaseMedia()   → GET /api/v1/anime/:id/group/:groupId/release-media
       |
       v
  [Section-Komponenten (RSC-Props)]
    HeroSection → GroupDetail, AnimeDetail, GroupAssets
    StorySection → GroupDetail.story / anime_fansub_project_notes.body_html
    TeamSection → GroupContributorsResponse { team_members[], external_contributors[] }
    ReleasesSection → GroupReleasesData.episodes (erste N)
    ThemesSection → GroupThemesResponse { themes: [{ type, title, assets[] }] }
    MediaSection → GroupReleaseMediaResponse { items: ReleaseVersionMediaItem[] }
    BacklinksSection → fansub.slug, animeID
    |
    v
  [GroupSectionsNav — Client Component]
    Desktop: sticky Anker-Nav
    Mobil: horizontal scrollbare Chip-Leiste
```

### Recommended Project Structure
```
frontend/src/app/anime/[id]/group/[groupId]/
├── page.tsx                   # Server Component, Fetch-Orchestrierung
├── page.module.css            # Layout-Styles erweitern
├── GroupAssetShowcase.tsx     # bestehend, unverändert
├── GroupSectionsNav.tsx       # NEU: Sticky-Nav Client Component (≤80 Zeilen)
└── sections/
    ├── HeroSection.tsx        # NEU
    ├── StorySection.tsx       # NEU
    ├── TeamSection.tsx        # NEU
    ├── ReleasesSection.tsx    # NEU
    ├── ThemesSection.tsx      # NEU
    ├── MediaSection.tsx       # NEU
    └── BacklinksSection.tsx   # NEU

backend/internal/repository/
└── group_contributors_repository.go    # NEU: projektspezifische Mitwirkende/Member

backend/internal/handlers/
└── group_contributors_handler.go       # NEU: dünner Handler für drei neue Endpoints
   (oder gruppe_public_handler.go als gemeinsamer Handler)

shared/contracts/openapi.yaml          # drei neue Pfade + Schemas
frontend/src/lib/api.ts                # drei neue Helper-Funktionen
frontend/src/types/groupContributors.ts  # NEU: DTO-Typen
```

### Pattern 1: Neue Öffentliche Read-Endpoints (Projektions-Muster)
**What:** Dünner Handler + dediziertes Repository nach dem Vorbild von `contributions_public_handler.go`.
**When to use:** Für alle drei neuen öffentlichen Seams (Mitwirkende, Themes, Release-Medien).
**Example (Mitwirkende):**
```go
// Source: backend/internal/handlers/contributions_public_handler.go (Vorbild)
func (h *GroupPublicHandler) GetGroupContributors(c *gin.Context) {
    animeID, _ := parseAnimeID(c.Param("id"))
    groupID, _ := parseGroupID(c.Param("groupId"))
    response, err := h.repo.GetProjectContributors(c.Request.Context(), animeID, groupID)
    if err != nil { internalError(c, "interner serverfehler"); return }
    c.JSON(http.StatusOK, response)
}
```

### Pattern 2: Section-Komponente mit Props (kein Client-Fetch)
**What:** RSC-Sektion erhält vorberechnete Daten als Props von `page.tsx`, rendert HTML.
**When to use:** Für alle sieben Sektionen.
**Example:**
```typescript
// Alle Daten kommen als Props — kein useEffect, kein fetch
interface TeamSectionProps {
  teamMembers: TeamMemberEntry[]
  externalContributors: ExternalContributorEntry[]
}
export function TeamSection({ teamMembers, externalContributors }: TeamSectionProps) {
  // Rendert zwei getrennte Blöcke (D-07)
}
```

### Pattern 3: Sticky-Nav Client Component
**What:** Isolierte Client Component für Scroll-Tracking + Anker-Links.
**When to use:** `GroupSectionsNav.tsx` — einzige Client Component auf der Seite.
**Example:**
```typescript
'use client'
// Desktop: position:sticky, scroll-linked active-state
// Mobil: overflow-x:auto, Chip-Leiste
// Anker-IDs: #story #team #releases #themes #medien
```

### Anti-Patterns to Avoid
- **`getReleaseVersionMedia` (Admin-Endpoint) auf öffentlicher Seite aufrufen:** Dieser Endpoint erfordert Auth. Auf einer öffentlichen RSC ohne Token führt das zu 401. Immer neuen öffentlichen Seam verwenden.
- **Theme-Daten über Admin-Endpoints laden:** Analog — alle `/admin/...`-Theme-Routen sind auth-geschützt.
- **Gruppenmitgliedschaft aus Contributions ableiten (Lock A/Decision 3):** `release_member_roles`-Einträge sind Release-Credits, keine Mitgliedschaftsbestätigung. Sie erscheinen im Team-Block (D-07), NICHT im Gruppen-Roster.
- **Gesamten `GetPublicAnimeContributions`-Response laden und client-seitig filtern:** Verarbeitung auf Server-Seite halten; Lock K verlangt Contract-konformen Seam.
- **`anime_fansub_groups.notes` als vollwertige Projektstory anzeigen:** Das ist ein Kurznotiz-Anker; strukturierte Story lebt in `anime_fansub_project_notes`.
- **GroupDetail.period als verlässliches Datum nutzen:** `period` ist in `group_repository.go` explizit `nil` gesetzt — wird nicht aus Releases abgeleitet. Nicht anzeigen, bis Backend-Unterstützung vorhanden.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Member-Slug-Ableitung | Eigene Slug-Logik | `memberSlugExpr` / `memberDisplayExpr` aus `anime_contributions_public_repository.go` | Bereits konsistent etabliert; Doppelarbeit = Drift [VERIFIED] |
| Rollen-Labels | Hartkodierte Rollennamen | `role_definitions` (code → label_de) JOIN + `COALESCE(rd.label_de, role_code)` | Etablierte Lookup; immer joinen [VERIFIED: anime_contributions_public_repository.go] |
| Theme-Asset-Sichtbarkeit | Eigene Visibility-Flags | Phase-72-Projektionsfelder auf `media_assets` (`visibility_id`, `review_status`) | Ownership-Matrix (Decision 8/G) — nicht neu erfinden [VERIFIED: 72-RESEARCH.md] |
| Sticky-Nav | Eigene Scroll-/Intersection-Observer-Logik | Phase-73-Sektions-Nav-Muster (wenn Phase 73 Komponente extrahiert hat) | Konsistenz zwischen Phase 73 und 75 — UX-Kohärenz |
| API-Client | Direkter `fetch`-Aufruf im RSC oder Client | `authorizedFetch` / `lib/api.ts`-Helper | Lock K — kein ad-hoc-Fetch; alle Server-Calls über zentrale api.ts-Funktionen [VERIFIED: CLAUDE.md, 72-RESEARCH.md] |
| Breadcrumbs | Eigenes Breadcrumb-Markup | `@/components/navigation/Breadcrumbs` | Bereits in `page.tsx` genutzt [VERIFIED] |
| UI-Primitives | Native `<button>`, `<select>` | `@/components/ui/Button`, `@/components/ui/Select` etc. | CLAUDE.md-Pflicht; ESLint no-restricted-syntax [VERIFIED: CLAUDE.md] |

**Key insight:** Der gesamte Frontend-Umbau ist Kompositions- und Splitting-Arbeit. Die Backend-Arbeit ist ebenfalls Projektion bestehender Tabellen. Kein neues Modell, keine neue DB-Struktur.

---

## Projekt-Constraints (aus CLAUDE.md)

| Constraint | Auswirkung auf Phase 75 |
|-----------|-------------------------|
| **Brownfield:** Bestehende Logik verbessern, nicht ersetzen | `page.tsx`-Hero/Showcase/Releases/Edge-Nav-Logik wandert in Sektionen — kein Wegwerfen |
| **Globales UI-Primitives-Gebot:** `@/components/ui` Pflicht | Alle neuen Sektionen nutzen `Button`, `Card`, etc. — keine nativen Elemente für Primitiv-Typen |
| **Modularity:** Produktionsdateien ≤ 450 Zeilen | `page.tsx` muss aufgespalten werden; Section-Komponenten je ≤ 150 Zeilen |
| **UX quality:** Explizite UX-Aufmerksamkeit | Sektions-Nav, Empty States, Mobile-Layout als explizite Planungsaufgaben |
| **Lock K:** Kein ad-hoc-Fetch, keine Token-Direktzugriffe | Alle neuen API-Calls über `lib/api.ts`; neue Endpunkte erst in OpenAPI + Backend + api.ts |
| **Neutralitäts-Regel:** Keine gruppenspezifischen Daten auf neutraler Anime-Ebene | Alle neuen Backend-Queries nutzen `anime_fansub_groups`/`release_version_groups` als Scope-Anker |
| **Entscheidung 9:** Keine Umstellung öffentlicher Anime-Reads ohne Authority-Entscheid | Bestehende `getAnimeByID`-Calls unverändert lassen |
| **Umlaute:** Korrekte deutsche Umlaute in allen user-facing Strings | „Mitwirkende", „Beteiligte", „Noch keine Mitwirkenden hinterlegt", etc. |

---

## Common Pitfalls

### Pitfall 1: Admin-Endpunkte auf öffentlicher Seite
**What goes wrong:** `getReleaseVersionMedia` und Theme-Endpoints sind Admin-Only. Aufruf im öffentlichen SSR-Kontext führt zu 401 (kein Auth-Token vorhanden).
**Why it happens:** `api.ts`-Funktionen nutzen `authorizedFetch`; Admin-Endpoints in `admin_routes.go` sind durch `authMiddleware` geschützt.
**How to avoid:** Neue öffentliche Endpunkte in `main.go` ohne Auth-Middleware registrieren.
**Warning signs:** HTTP 401 oder leere Daten; TypeScript-Typ deutet auf Admin-Response hin.

### Pitfall 2: Contributions-Endpoint ohne Gruppen-Scope
**What goes wrong:** `GET /api/v1/anime/:id/contributions` liefert Contributions aller Gruppen für diesen Anime. Wenn client-seitig gefiltert, erscheinen kurz Daten anderer Gruppen oder es entsteht unnötiger Netzwerk-Traffic.
**Why it happens:** Bestehender Endpoint ist nicht scoped auf eine Gruppe.
**How to avoid:** Neuen Endpoint `GET /api/v1/anime/:id/group/:groupId/contributors` mit `AND ac.fansub_group_id = $2` in der Query.
**Warning signs:** Response enthält mehrere `fansub_group_id`-Werte statt nur einer.

### Pitfall 3: release_member_roles ohne Sichtbarkeits-Gate
**What goes wrong:** `release_member_roles` hat keine inhärenten Visibility-/Review-Flags. Werden alle Einträge ohne Gate öffentlich angezeigt, können interne Release-Credits sichtbar sein.
**Why it happens:** Tabelle stammt aus älterem Design ohne Sichtbarkeits-Konzept.
**How to avoid:** Zunächst alle `release_member_roles`-Einträge als public behandeln (conservative default) — sie sind Release-Credits, kein sensibler Datensatz. Oder: nur für releases mit `release_versions` ohne `deleted_at` anzeigen. Phase-79-Medien-Ownership-Durchsetzung ist der richtige Ort für striktere Gates.
**Warning signs:** Keine Warning-Signs in Phase 75; Risiko ist akzeptabel.

### Pitfall 4: anime_fansub_project_notes vs. anime_fansub_groups.notes verwechseln
**What goes wrong:** `group.story` aus `GroupDetail` zeigt nur `anime_fansub_groups.notes` (Legacy-Kurznotiz). Die strukturierte Projektstory aus `anime_fansub_project_notes` wird ignoriert.
**Why it happens:** `GetGroupDetail` liest `afg.notes` und setzt es als `detail.Story`. `anime_fansub_project_notes.body_html` ist nicht Teil der Antwort.
**How to avoid:** Backend-Erweiterung: `GetGroupDetail` (oder neuer separater Query) muss auch `anime_fansub_project_notes` LEFT-JOIN und `body_html` liefern (sofern `status='published'` und `visibility='public'`).
**Warning signs:** Story-Abschnitt zeigt Kurztext statt formatierten HTML-Text.

### Pitfall 5: Period-Feld als verlässliches Datum verwenden
**What goes wrong:** `group.period` ist in `group_repository.go` explizit auf `nil` gesetzt — nicht aus Release-Daten abgeleitet. Anzeigen führt zu immer leerem Feld.
**Why it happens:** `// Period is nullable and not stored directly in anime_fansub_groups`
**How to avoid:** Period-Anzeige im Hero weglassen oder bedingt: nur anzeigen wenn `group.period != null && (group.period.start || group.period.end)`.

### Pitfall 6: Sichtbarkeits-Gate vor Phase-72-Felder erzwingen
**What goes wrong:** Phase 72 ergänzt Review-/Visibility-Felder auf `media_assets`. Wenn Phase 75 auf diese Felder referenziert, aber Phase 72 noch nicht deployed ist, schlägt der SQL-Query fehl.
**Why it happens:** Sequenzielle Phasenabhängigkeit.
**How to avoid:** Planner muss Phasenreihenfolge festlegen: Backend-Wave von Phase 75 darf Phase-72-Felder erst nutzen wenn Phase 72 deployed. Alternative: Bootstrap-Filter (`media_assets.status='ready'`) als temporärer Fallback.

---

## Code Examples

### Bestehender öffentlicher Contributions-Query (Vorbild für neuen Endpoint)
```go
// Source: backend/internal/repository/anime_contributions_public_repository.go
// GetPublicAnimeContributions — Vorbild für GetProjectContributors (Phase 75)
// Änderung: WHERE-Clause um AND ac.fansub_group_id = $2 ergänzen
query := `
    SELECT
        fg.id AS fansub_group_id,
        fg.name AS fansub_group_name,
        ` + displayCol + ` AS member_display_name,
        ` + slugCol + ` AS member_slug,
        ...
    FROM anime_contributions ac
    JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
    JOIN members m ON m.id = hfgm.member_id
    JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
    WHERE ac.anime_id = $1
      AND ac.fansub_group_id = $2   -- NEU: Gruppen-Scope
      AND ac.is_public_on_anime_page = true
      AND hfgm.visibility = 'public'
      AND ac.release_version_id IS NULL
    ORDER BY COALESCE(ac.started_year, 9999), member_display_name
`
```

### Release-Member-Rollen-Query (Team-Block, D-07)
```go
// NEU: Team-Beteiligte aus release_member_roles, gescoped auf Anime+Gruppe
teamQuery := `
    SELECT DISTINCT ON (m.id)
        m.id AS member_id,
        ` + displayCol + ` AS member_display_name,
        ` + slugCol + ` AS member_slug,
        COALESCE(ARRAY_AGG(DISTINCT cr.label) FILTER (WHERE cr.label IS NOT NULL), ARRAY[]::text[]) AS role_labels
    FROM release_member_roles rmr
    JOIN members m ON m.id = rmr.member_id
    JOIN contributor_roles cr ON cr.id = rmr.role_id
    JOIN fansub_releases fr ON fr.id = rmr.release_id
    JOIN episodes e ON e.id = fr.episode_id
    JOIN release_versions rv ON rv.release_id = fr.id
    JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
    WHERE e.anime_id = $1 AND rvg.fansub_group_id = $2
    GROUP BY m.id, m.display_name, m.nickname
    ORDER BY m.id, member_display_name
`
```

### Section-Komponente mit Empty State (D-05)
```typescript
// Source: 75-CONTEXT.md D-05, Phase 73 D-15 analog
export function TeamSection({ teamMembers, externalContributors }: TeamSectionProps) {
  return (
    <section id="team" className={styles.section}>
      <h2 className={styles.sectionHeading}>Beteiligte am Projekt</h2>

      {/* Team-Beteiligte (App-Member-Rollen) */}
      <div className={styles.teamBlock}>
        <h3>Team-Beteiligte</h3>
        {teamMembers.length === 0 ? (
          <p className={styles.emptyState}>Noch keine Team-Mitglieder erfasst.</p>
        ) : (
          teamMembers.map(m => (
            m.member_slug
              ? <Link href={`/members/${m.member_slug}`}>{m.member_display_name}</Link>
              : <span>{m.member_display_name}</span>
          ))
        )}
      </div>

      {/* Externe Mitwirkende — eigener, abgesetzter Block (D-07) */}
      <div className={styles.externalBlock}>
        <h3>Externe Mitwirkende</h3>
        {externalContributors.length === 0 ? (
          <p className={styles.emptyState}>Keine externen Mitwirkenden hinterlegt.</p>
        ) : (
          externalContributors.map(c => (/* ... */))
        )}
      </div>
    </section>
  )
}
```

---

## State of the Art

| Alte Praxis | Aktuelle Praxis | Änderung | Auswirkung |
|-------------|-----------------|----------|------------|
| Monolithische `page.tsx` mit inline-Rendering | Section-Komponenten, je ≤ 450 Zeilen | Phase 75 | Wartbarkeit, CLAUDE.md-Compliance |
| `anime_fansub_groups.notes` als Story | `anime_fansub_project_notes.body_html` (Tiptap) | Seit Migration 0066/Phase 60+ | Strukturierte, editorbasierte Story statt Freitext |
| Theme-Assets nur Admin | Öffentliche Sichtbarkeit via Phase-72-Visibility-Gate | Phase 72+75 | Theme-Arbeit der Gruppe wird öffentlich sichtbar |
| Release-Version-Medien nur Admin | Öffentliche Galerie für freigegebene Medien | Phase 72+75 | Release-Prozess-Einblicke für Besucher |

**Deprecated/outdated:**
- `group.period` aus `GroupDetail` ist nie gesetzt — anzeigen erst wenn Backend abgeleitet.
- `release_version_groups.fansubgroup_id` — existiert nicht mehr (Migration entfernt); immer `fansub_group_id` nutzen.

---

## Open Questions

1. **Projektstory-Quelle: `anime_fansub_groups.notes` oder `anime_fansub_project_notes.body_html`?**
   - Was wir wissen: Beide Felder existieren. `notes` ist Kurztext; `anime_fansub_project_notes` ist Tiptap-Editor mit `status`/`visibility`.
   - Was unklar ist: Welches Feld Phase 75 anzeigen soll; ob `getGroupDetail` erweitert wird oder ein separater Fetch nötig ist.
   - Empfehlung: `anime_fansub_project_notes.body_html` bevorzugen (strukturiert), mit Fallback auf `anime_fansub_groups.notes`. Backend-Erweiterung in `group_repository.go` nötig.

2. **Sichtbarkeits-Gate für Themes/Medien vor Phase-72-Deployment**
   - Was wir wissen: Phase 72 ergänzt `review_status` / `visibility_id` auf `media_assets`. Phase 75 braucht diese Felder für D-13 und D-15.
   - Was unklar ist: Ob Phase 72 vor Phase 75 deployed wird und ob der Planner Phasenreihenfolge erzwingt.
   - Empfehlung: Backend-Wave von Phase 75 prüft explizit, ob Phase-72-Felder in DB existieren (`IF EXISTS` in Query) oder nutzt `media_assets.status='ready'` als temporären Fallback.

3. **Slug-Verlinkung: wann genau verlinken?**
   - Was wir wissen: `member_slug` ist NULL wenn kein Nickname ableitbar; geclaimt bedeutet `member_claims.claim_status='verified'`.
   - Was unklar ist: Soll Phase 75 nur bei claimed verlinken oder wenn Slug != null?
   - Empfehlung: Verlinkung wenn `member_slug != null` (analog Phase 73 D-10) — das `/members/[slug]`-Profil existiert für alle Members mit Nickname.

4. **Phasenreihenfolge Backend-Wave**
   - Was wir wissen: Drei neue öffentliche Endpoints brauchen OpenAPI + Backend + api.ts + Typen.
   - Was unklar ist: In welcher Phase-75-Wave diese Arbeit landet (Wave 1 Backend, Wave 2 Frontend).
   - Empfehlung: Planner plant explizit Wave 01 (Backend-Endpoints + Contracts + Typen), Wave 02 (Section-Komponenten-Umbau Frontend), Wave 03 (Sektions-Nav + Integration).

---

## Environment Availability

Step 2.6: SKIPPED für externe Tools — Phase 75 ist rein code-basiert (Frontend-Umbau + Backend-Erweiterungen im bestehenden Stack). Keine neuen externen Services oder CLI-Tools erforderlich.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3 (Frontend) + testify (Go-Backend) |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npm test -- --reporter=verbose` |
| Full suite command | `cd frontend && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-07 | Team-Beteiligte und Externe Mitwirkende in getrennten Blöcken | unit (component) | `npm test -- TeamSection` | ❌ Wave 0 |
| D-09 | Verlinkung nur bei member_slug != null | unit (component) | `npm test -- TeamSection` | ❌ Wave 0 |
| D-05 | Empty States bei fehlenden Daten anzeigen | unit (component) | `npm test -- sections` | ❌ Wave 0 |
| G/K | Neue Backend-Endpoints liefern korrekte DTOs | unit (Go repository) | `go test ./backend/internal/repository/... -run GroupContributors` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx` — REQ D-07, D-09
- [ ] `backend/internal/repository/group_contributors_repository_test.go` — REQ G/K
- [ ] Section-Komponenten-Tests für Empty States (REQ D-05)

---

## Security Domain

Phase 75 ist eine öffentliche Read-/Anzeige-Phase ohne Auth-Flows. Neue Backend-Endpoints werden ohne `authMiddleware` in `main.go` registriert (öffentlich). Keine schützenswerten Eingaben; keine Mutations.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | nein | — (öffentliche Seite) |
| V3 Session Management | nein | — |
| V4 Access Control | indirekt | Visibility-Gate auf Backend-Seite: nur public+approved Medien ausliefern |
| V5 Input Validation | ja (minimal) | `animeID` und `groupID` Path-Parameter als int64 parsen mit `parseAnimeID`/`parseGroupID` (bestehende Helfer) |
| V6 Cryptography | nein | — |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path-Parameter-Injection (integer overflow) | Tampering | `parseAnimeID`/`parseGroupID` validieren auf `id > 0` (bestehend, [VERIFIED: group_handler.go]) |
| Öffentlich freigegebene Medien zeigen interne Inhalte | Information Disclosure | Visibility-Gate im Repository-Query; `WHERE visibility='public' AND review_status='approved'` |

---

## Sources

### Primary (HIGH confidence)
- `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` — Bestandsseite analysiert, ~290 Zeilen [VERIFIED]
- `backend/internal/handlers/contributions_public_handler.go` — öffentliche Contributions-Seams [VERIFIED]
- `backend/internal/repository/anime_contributions_public_repository.go` — Projektions-Muster, SQL-Queries, DTOs [VERIFIED]
- `backend/internal/repository/group_repository.go` — GroupDetail, GroupReleases, getGroupStats [VERIFIED]
- `backend/internal/handlers/group_handler.go` — GroupHandler, parseGroupID [VERIFIED]
- `backend/cmd/server/main.go` — Route-Registration öffentlicher Endpoints [VERIFIED]
- `backend/cmd/server/admin_routes.go` — Theme/Segment/ReleaseVersionMedia als Admin-Only bestätigt [VERIFIED]
- `frontend/src/lib/api.ts` — `getReleaseVersionMedia` auf Admin-Pfad bestätigt [VERIFIED]
- `frontend/src/types/group.ts` — GroupDetail-DTO; period=null bestätigt [VERIFIED]
- `frontend/src/types/contributions.ts` — PublicContributorRow, AnimeContributionGroup [VERIFIED]
- `docs/architecture/current-system-inventory.md` — Media Ownership Matrix, Core Ownership Rules [VERIFIED]
- `docs/architecture/db-schema-fansub-domain.md` — release_member_roles, anime_contributions, hist_*-Struktur [VERIFIED]
- `shared/contracts/openapi.yaml` — drei bestehende öffentliche Gruppen-Paths; keine Theme/Medien-Pfade [VERIFIED]
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-RESEARCH.md` — Phase-72-Projektions-Muster, Membership-vs-Contribution-Separation [VERIFIED]
- `.planning/phases/73-public-fansub-page-fansubs-slug-erweitern/73-CONTEXT.md` — Sektions-Nav-Muster D-04, Empty-State D-15, Member-vs-Mitwirkende D-07..D-10 [VERIFIED]
- `.planning/milestones/v1.2-DISCUSSION.md` — Entscheidungen A, D, G, H, K (LOCKED) [VERIFIED]

### Secondary (MEDIUM confidence)
- `docs/architecture/db-runtime-authority-map.md` — Neutralitäts-Regel bestätigt (keine öffentlichen Anime-Reads umstellen) [CITED]

### Tertiary (LOW confidence)
- Keine.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@/components/ui`-Primitive werden in bestehender `page.tsx` noch nicht vollständig genutzt — native Elemente könnten vorhanden sein | Standard Stack | Wenn bereits vollständig genutzt, kein Problem; wenn nicht, ESLint-Warnung bei Anfassen |
| A2 | Phase 73 extrahiert eine wiederverwendbare Sektions-Nav-Komponente | Architecture Patterns | Falls nicht, muss Phase 75 eigene Sticky-Nav bauen (akzeptabler Mehraufwand) |
| A3 | `release_member_roles` enthält keine sensiblen internen Daten, die öffentlich nicht sichtbar sein sollten | Befund 3 / Pitfall 3 | Falls doch, müsste ein Visibility-Gate nachgerüstet werden (Phase 79 ist dafür vorgesehen) |

**Wenn diese Tabelle leer wäre:** Alle Claims wären verified oder cited — kein User-Confirmation-Bedarf. A1-A3 sind niedrige Risiken und betreffen Implementierungs-Details, nicht Architektur-Entscheidungen.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — bestehender Stack, keine neuen Pakete
- Neue Backend-Endpoints (Mitwirkende/Themes/Medien): HIGH — Lücke im öffentlichen Seam klar identifiziert, Lösungsweg klar
- Architecture (Section-Splitting): HIGH — page.tsx analysiert, Muster aus Phase 73 etabliert
- Pitfalls: HIGH — Admin-Endpoint-Falle direkt im Code verifiziert
- Phase-72-Abhängigkeit: MEDIUM — Phase 72 ist geplant aber noch nicht executed; Visibility-Gate-Details können sich ändern

**Research date:** 2026-06-05
**Valid until:** 2026-07-05 (stabiler Stack; Phasenabhängigkeit auf Phase-72-Execution achten)
