# Phase 40 Research — Text-/Notizsystem

**Researched:** 2026-05-11
**Domain:** Fansub-Plattform — Text- und Notizsystem (4 fachliche Ebenen)
**Confidence:** HIGH (alle relevanten Tabellen, Handler-Patterns und Frontend-Patterns direkt aus Codebase verifiziert)

---

## Bestandsanalyse-Ergebnis

### Vorhanden (exakt)

| Tabelle | Migration | Zweck |
|---------|-----------|-------|
| `member_episode_notes` | `0044_add_db_schema_v2_target_tables.up.sql` | Release-bezogener Textbeitrag eines Members in einer Rolle |
| `member_anime_notes` | `0044_add_db_schema_v2_target_tables.up.sql` | Anime-bezogener Textbeitrag eines Members |
| `release_member_roles` | `0044_add_db_schema_v2_target_tables.up.sql` | Zuordnung Member+Rolle zu einem `fansub_releases.id` |
| `contributor_roles` | `0044_add_db_schema_v2_target_tables.up.sql` | Rollenreferenz-Tabelle (aktuell 6 Seeds: Translator, Timer, Typesetter, Encoder, QC, Karaoke) |
| `anime_fansub_groups` | `0011_anime_fansub_groups.up.sql` | Verbindung Anime ↔ Fansub-Gruppe, mit `notes TEXT` |
| `members` | `0044_add_db_schema_v2_target_tables.up.sql` | Member-Profil (neu, V2-Struktur) |
| `fansub_members` | `0010_fansub_members.up.sql` | Altes Member-Modell mit Freitext-Rolle (role VARCHAR) |
| `visibilities` | `0037_add_release_decomposition_tables.up.sql` | Lookup-Tabelle: public, registered, fansubber, staff, private |
| `release_version_media` | `0059_release_version_media_schema.up.sql` | Bereits existierende Vorlage mit `deleted_at`, `sort_order`, `uploaded_by_user_id`, `deleted_by_user_id` |

### Ähnlich vorhanden / anders benannt

| Was gesucht | Was gefunden | Unterschied |
|-------------|--------------|-------------|
| `release_version_notes` | `member_episode_notes` | Hängt an `fansub_releases.id`, NICHT an `release_versions.id`; kein `title`, kein `body_html`, kein `status`, kein `visibility`, kein `deleted_at` |
| `anime_fansub_project_notes` | `anime_fansub_groups.notes` | Nur ein `TEXT`-Feld ohne title, status, visibility, sort_order, audit-Felder |
| `fansub_group_notes` | `fansub_groups.description` + `fansub_groups.history` | Flache Textfelder, keine eigenständigen Note-Objekte |
| `member_group_stories` | (nichts direkt) | `member_anime_notes` existiert, aber hängt an `anime_id`, hat keinen `fansub_group_id`-Bezug |
| 11 Kernrollen | `contributor_roles` mit 6 Seeds | Seeds sind: Translator, Timer, Typesetter, Encoder, QC, Karaoke — nicht die 11 Kernrollen aus CONTEXT.md |

### Fehlt

- `fansub_group_notes` als eigenständige Tabelle (keine existiert)
- `member_group_stories` als eigenständige Tabelle (keine existiert)
- `anime_fansub_project_notes` als eigenständige Tabelle (vorhanden nur: `anime_fansub_groups.notes` — zu rudimentär)
- `release_version_notes` als eigenständige Tabelle an `release_versions.id` (vorhanden nur: `member_episode_notes` an `fansub_releases.id`)
- `body_html` + `body_markdown` Dualfeld-Struktur in keiner bestehenden Note-Tabelle
- `status` (draft/published/archived/deleted) in Note-Kontext (nicht standardisiert)
- `visibility` auf Note-Ebene (die `visibilities`-Lookup-Tabelle existiert, aber wird für Notes noch nicht genutzt)
- Markdown-Rendering / HTML-Sanitizing im Backend (kein Markdown-Library in `go.mod`)
- Markdown-Rendering im Frontend (kein `marked`, `remark` o.ä. in `package.json`)
- Migration-Nummern 0061+ (letzte ist `0060_add_media_type_image.up.sql`)
- Die 11 Kernrollen in `contributor_roles` (aktuell nur 6, falsch benannt)

### Wiederverwenden

| Was | Woher | Begründung |
|-----|-------|------------|
| `release_version_media` als Muster | Migration 0059 | Exakt dasselbe Muster: `deleted_at`, `deleted_by_user_id`, `uploaded_by_user_id`, `sort_order`, `created_at`, `updated_at` |
| `visibilities`-Tabelle | Migration 0037 | Bereits definiert (public, registered, fansubber, staff, private) — für Note-Visibility als FK-Referenz nutzbar ODER als geprüfter VARCHAR-Wert (public/internal gemäß CONTEXT.md) |
| `requireAdmin()` Muster | `admin_content_authz.go` | Bestehende Admin-Berechtigungsprüfung, als Basis für rollenspezifische Write-Access-Funktionen |
| `soft delete`-Pattern | `release_version_media_repository.go` | `deleted_at = NOW()`, Filter mit `deleted_at IS NULL` |
| Markdown-Toolbar-Komponente | `fansub/[id]/edit/page.tsx` | Bestehende Toolbar mit Bold/Italic/Heading/Link-Buttons + Split-Textarea-Preview (kein Rendering, nur `<pre>`) |
| `errors.go` / `sql_errors.go` | `backend/internal/repository/` | ErrNotFound, ErrConflict standardisiert |
| `contributor_roles` Tabelle | Migration 0044 | Basis-Tabelle vorhanden, braucht neue Seeds mit 11 Kernrollen |

### Neu bauen

1. **Migration 0061:** `fansub_group_notes` (neue Tabelle)
2. **Migration 0062:** `member_group_stories` (neue Tabelle)
3. **Migration 0063:** `anime_fansub_project_notes` (neue Tabelle)
4. **Migration 0064:** `release_version_notes` (neue Tabelle, an `release_versions.id`)
5. **Migration 0065:** Seed der 11 Kernrollen in `contributor_roles` (additive INSERT ON CONFLICT)
6. **Backend:** 4 Repository-Dateien (je eine pro Note-Typ)
7. **Backend:** Handler-Methoden für CRUD (pro Note-Typ), neue Datei oder Erweiterung bestehender Handler
8. **Backend:** Routing-Einträge in `admin_routes.go`
9. **Backend:** Markdown → HTML Rendering + Sanitizing (neue Abhängigkeit nötig)
10. **Frontend:** UI-Abschnitt in Fansub-Editor (neuer Tab oder Section für `fansub_group_notes` + `member_group_stories` + `anime_fansub_project_notes`)
11. **Frontend:** UI-Abschnitt in Episode-Version-Editor (neuer Tab „Notizen / Beiträge" für `release_version_notes`)
12. **Frontend:** TypeScript-Typen für alle 4 Note-Entitäten

### BLOCKER

**KEIN BLOCKER** — alle kritischen Punkte aus CONTEXT.md sind geklärt:

| BLOCKER-Bedingung | Status |
|-------------------|--------|
| Vorhandene Tabelle erfüllt denselben Zweck? | Nein — `member_episode_notes` ist strukturell zu rudimentär (kein title, html, status, visibility) und am falschen FK (`release_id` statt `release_version_id`) |
| versionId-Ziel unklar? | **Geklärt:** `versionId` in Routen = `release_versions.id` (bestätigt durch `release_version_media_repository.go` Zeile 397 und `admin_routes.go`) |
| `anime_fansub_groups` FK-Struktur unklar? | **Geklärt:** PK = `(anime_id, fansub_group_id)`, beide als FKs bestätigt in Migration 0011 |
| Member/Rollen-Zuordnung zur Release-Version? | **Partiell gelöst** — `release_member_roles` existiert, hängt aber an `fansub_releases.id`, nicht `release_versions.id`. Für `release_version_notes` muss der Join-Pfad `release_versions → fansub_releases → release_member_roles` genutzt werden |
| Markdown ohne Sanitizing public ausgegeben? | **Noch offen** — kein Markdown-Library vorhanden. Entscheidung nötig: Library hinzufügen oder body_html im Frontend rendern |
| Migrationskonventionen unklar? | **Geklärt:** 4-stellige Sequenznummer, `NNNN_beschreibung.up.sql` / `.down.sql` |

---

## Entscheidungen

### Entscheidung 1: `release_version_notes` — Eigene neue Tabelle, NICHT `member_episode_notes` wiederverwenden

`member_episode_notes` hängt an `fansub_releases.id`, hat kein `title`, kein `body_html`, kein `status`, kein `visibility`, kein `deleted_at`. Eine Erweiterung würde das Schema unverständlich machen. Neue Tabelle `release_version_notes` an `release_versions.id` mit allen geforderten Feldern aus CONTEXT.md bauen.

### Entscheidung 2: `anime_fansub_project_notes` — Eigene neue Tabelle, NICHT `anime_fansub_groups.notes` erweitern

`anime_fansub_groups.notes` ist ein einzelnes `TEXT`-Feld ohne Struktur. Für das MVP-Modell aus CONTEXT.md (id, anime_id, fansub_group_id, title, body_markdown, body_html, visibility, status, sort_order, Audit-Felder) ist eine eigene Tabelle nötig.

### Entscheidung 3: `contributor_roles` — Seeds ergänzen (nicht ersetzen)

Die Tabelle existiert mit 6 veralteten Seeds. Eine neue Migration `0065` fügt die 11 Kernrollen per `INSERT ON CONFLICT DO NOTHING` additiv ein. Historische Rollen NICHT löschen (CONTEXT.md-Vorgabe).

### Entscheidung 4: Markdown-Rendering — Library für Backend nötig

`go.mod` enthält kein Markdown-Library (kein `goldmark`, `blackfriday`, etc.). `package.json` enthält kein `marked`, `remark` etc. Für `body_html` muss entweder:
- **Option A:** Im Backend beim Save rendern (empfohlen, da Primärquelle bleibt `body_markdown`)
- **Option B:** Im Frontend beim Laden rendern (schlechtere Option — kein gesichertes body_html in DB)

Empfehlung: **Option A** mit `github.com/yuin/goldmark` (bereits im `go.sum` via `alicebob/miniredis` transitive dep? — prüfen) oder `github.com/russross/blackfriday/v2`. Sanitizing mit `github.com/microcosm-cc/bluemonday`. Wenn Library-Entscheidung BLOCKER ist: body_html als leere String speichern, Frontend rendert aus body_markdown mit `<pre>` (wie aktuell für description/history).

### Entscheidung 5: Visibility — VARCHAR 'public'/'internal', nicht FK auf `visibilities`

`visibilities`-Tabelle hat: public, registered, fansubber, staff, private. CONTEXT.md fordert nur `public/internal`. Da `internal` nicht in der `visibilities`-Tabelle ist, entweder: (a) `internal` hinzufügen, (b) eigenes CHECK-Constraint verwenden. Empfehlung: `visibility VARCHAR(20) CHECK (visibility IN ('public', 'internal'))` — konsistent mit bestehenden CHECK-Mustern in diesem Projekt.

### Entscheidung 6: Status — VARCHAR mit CHECK

CONTEXT.md fordert `draft/published/archived/deleted`. Keine bestehende Status-Lookup-Tabelle für Notes. Empfehlung: `status VARCHAR(20) CHECK (status IN ('draft', 'published', 'archived', 'deleted'))` analog zu `media_assets.status`.

### Entscheidung 7: Member/Rollen-Zuordnung für `release_version_notes` UI

`release_member_roles` hängt an `fansub_releases.id`. Der Join-Pfad für den UI-Load ist:
```
release_versions.id → release_versions.release_id → fansub_releases.id → release_member_roles
```
So können beteiligte Member+Rollen einer Release-Version abgerufen werden. Dies ist der kanonische Weg.

### Entscheidung 8: `member_group_stories` — `role_id` aus `contributor_roles`

Der `role_id`-FK in `member_group_stories` zeigt auf `contributor_roles.id` (nicht auf `fansub_members.role`).

---

## DB / Migrations Details

### Tabelle: `member_episode_notes` (Migration 0044)

```
id          BIGSERIAL PRIMARY KEY
release_id  BIGINT NOT NULL → fansub_releases.id ON DELETE CASCADE
member_id   BIGINT NOT NULL → members.id ON DELETE CASCADE
role_id     BIGINT NOT NULL → contributor_roles.id ON DELETE CASCADE
text        TEXT NOT NULL
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
modified_at TIMESTAMPTZ
modified_by BIGINT → users.id ON DELETE SET NULL
UNIQUE (release_id, member_id, role_id)
```

**Urteil:** Strukturell nicht wiederverwendbar für Phase 40. FK an `fansub_releases.id`, kein title, kein body_html, kein status, kein visibility, kein deleted_at.

### Tabelle: `member_anime_notes` (Migration 0044)

```
member_id   BIGINT NOT NULL → members.id ON DELETE CASCADE
anime_id    BIGINT NOT NULL → anime.id ON DELETE CASCADE
text        TEXT NOT NULL
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
modified_at TIMESTAMPTZ
modified_by BIGINT → users.id ON DELETE SET NULL
PRIMARY KEY (member_id, anime_id)
```

**Urteil:** Kein `fansub_group_id`-Bezug, kein title, kein body_html, kein status, kein visibility. Nicht wiederverwendbar für `member_group_stories`.

### Tabelle: `release_member_roles` (Migration 0044)

```
release_id  BIGINT NOT NULL → fansub_releases.id ON DELETE CASCADE
member_id   BIGINT NOT NULL → members.id ON DELETE CASCADE
role_id     BIGINT NOT NULL → contributor_roles.id ON DELETE CASCADE
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
PRIMARY KEY (release_id, member_id, role_id)
```

**Wichtig:** Hängt an `fansub_releases.id`, NICHT an `release_versions.id`. Um beteiligte Member einer `release_version` zu finden:
```sql
SELECT rmr.member_id, rmr.role_id
FROM release_member_roles rmr
JOIN release_versions rv ON rv.release_id = rmr.release_id
WHERE rv.id = $1
```

### Tabelle: `contributor_roles` (Migration 0044)

```
id         BIGSERIAL PRIMARY KEY
name       VARCHAR(80) NOT NULL UNIQUE
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Aktuell geseedete Werte: `Translator`, `Timer`, `Typesetter`, `Encoder`, `QC`, `Karaoke`

**Fehlt:** `editor`, `raw_provider`, `quality_checker`, `project_lead`, `designer`, `admin`, `other`
**Mapping nötig:** `QC` → `quality_checker`, `Karaoke` → zu entscheiden (ggf. `typesetter` oder historisch belassen)

Neue Migration muss die 11 Kernrollen additive einfügen:
```
translator, editor, timer, typesetter, encoder, raw_provider,
quality_checker, project_lead, designer, admin, other
```

### Tabelle: `anime_fansub_groups` (Migration 0011)

```
anime_id         BIGINT NOT NULL → anime.id ON DELETE CASCADE
fansub_group_id  BIGINT NOT NULL → fansub_groups.id ON DELETE CASCADE
is_primary       BOOLEAN NOT NULL DEFAULT FALSE
notes            TEXT
created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
PRIMARY KEY (anime_id, fansub_group_id)
```

**Urteil:** `notes` zu rudimentär für Phase-40-Anforderungen. Eigene `anime_fansub_project_notes`-Tabelle bauen.

### Tabelle: `release_version_media` (Migration 0059) — als Muster

```
id                   BIGSERIAL PRIMARY KEY
release_version_id   BIGINT NOT NULL → release_versions.id ON DELETE CASCADE
media_asset_id       BIGINT NOT NULL → media_assets.id ON DELETE RESTRICT
category             VARCHAR(30) NOT NULL (CHECK)
caption              TEXT NULL
sort_order           INT NOT NULL DEFAULT 0
is_preview_candidate BOOLEAN NOT NULL DEFAULT false
uploaded_by_user_id  BIGINT NULL → users.id ON DELETE SET NULL
created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at           TIMESTAMPTZ
deleted_at           TIMESTAMPTZ NULL
deleted_by_user_id   BIGINT NULL → users.id ON DELETE SET NULL
```

Dieses Schema ist das kanonische Muster für neue Note-Tabellen in Phase 40.

### Ziel-Schema für neue Tabellen

Alle 4 neuen Tabellen folgen diesem Basis-Pattern (gemäß CONTEXT.md):

```sql
id                    BIGSERIAL PRIMARY KEY
[fk_column(s)]        BIGINT NOT NULL REFERENCES ... ON DELETE CASCADE
title                 VARCHAR(255) NULL  -- nullable für release_version_notes, nullable für andere
body_markdown         TEXT NOT NULL DEFAULT ''
body_html             TEXT NOT NULL DEFAULT ''
visibility            VARCHAR(20) NOT NULL DEFAULT 'internal'
    CONSTRAINT chk_visibility CHECK (visibility IN ('public', 'internal'))
status                VARCHAR(20) NOT NULL DEFAULT 'draft'
    CONSTRAINT chk_status CHECK (status IN ('draft', 'published', 'archived', 'deleted'))
sort_order            INT NOT NULL DEFAULT 0
created_by_user_id    BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
updated_by_user_id    BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at            TIMESTAMPTZ
deleted_at            TIMESTAMPTZ NULL
```

**fansub_group_notes:** + `fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE`

**member_group_stories:** + `fansub_group_id`, `member_id BIGINT NOT NULL REFERENCES members(id)`, `role_id BIGINT NULL REFERENCES contributor_roles(id)`

**anime_fansub_project_notes:** + `anime_id BIGINT NOT NULL`, `fansub_group_id BIGINT NOT NULL`, mit UNIQUE CONSTRAINT auf `(anime_id, fansub_group_id)` für MVP-Haupttext

**release_version_notes:** + `release_version_id BIGINT NOT NULL REFERENCES release_versions(id)`, `member_id BIGINT NOT NULL REFERENCES members(id)`, `role_id BIGINT NOT NULL REFERENCES contributor_roles(id)`, UNIQUE (release_version_id, member_id, role_id) WHERE deleted_at IS NULL

---

## Rollenmodell-Befunde

### Aktuelle `contributor_roles`-Seeds

| id | name |
|----|------|
| 1 | Translator |
| 2 | Timer |
| 3 | Typesetter |
| 4 | Encoder |
| 5 | QC |
| 6 | Karaoke |

### Mapping zu 11 Kernrollen

| Bestand | Kernrolle | Aktion |
|---------|-----------|--------|
| Translator | translator | Neuer Seed (Kleinschreibung) |
| Timer | timer | Neuer Seed |
| Typesetter | typesetter | Neuer Seed |
| Encoder | encoder | Neuer Seed |
| QC | quality_checker | Neuer Seed (`quality_checker`) |
| Karaoke | (historisch) | Belassen, kein neuer Seed |
| — | editor | Neuer Seed |
| — | raw_provider | Neuer Seed |
| — | project_lead | Neuer Seed |
| — | designer | Neuer Seed |
| — | admin | Neuer Seed |
| — | other | Neuer Seed |

**Wichtig:** Die bestehenden 6 Seeds (Translator, Timer, etc. mit Großschreibung) werden NICHT gelöscht (historische Daten). Die 11 neuen Kernrollen werden additiv per `ON CONFLICT DO NOTHING` eingefügt.

### altes `fansub_members.role`-Feld

Das alte `fansub_members`-Modell (Migration 0010) hat `role VARCHAR(60)` als Freitext. Das ist das alte System. Phase 40 baut auf `contributor_roles` + `members` (V2-System, Migration 0044). Die Mapping-Regel aus CONTEXT.md (song_translator → translator etc.) gilt für neue UI-Eingabe, nicht für historische `fansub_members.role`-Einträge.

---

## Backend Patterns

### Handler-Struktur

Der `AdminContentHandler` (`admin_content_handler.go`) ist der Haupt-Handler für Admin-Funktionalität. Er ist bereits sehr groß — daher empfiehlt sich für Phase 40 eine **neue Handler-Datei** nach bestehendem Muster:
- `admin_content_fansub_notes.go` für `fansub_group_notes` + `member_group_stories` + `anime_fansub_project_notes`
- `admin_content_release_version_notes.go` für `release_version_notes`

Alternative: Neuer Handler-Typ `AdminNotesHandler` — aber das erfordert Änderungen an `admin_routes.go` und `main.go`. Einfacher ist Erweiterung des bestehenden `AdminContentHandler` mit neuen Interface-Methoden.

### Request-Struct-Pattern

```go
// Beispiel aus fansub_requests.go:
type fansubMemberCreateRequest struct {
    Handle    string  `json:"handle"`
    Role      string  `json:"role"`
    SinceYear *int32  `json:"since_year"`
    Notes     *string `json:"notes"`
}
```

Für Notes-DTOs analog: separate `*CreateRequest` und `*PatchRequest`-Structs.

### Auth-Pattern

```go
// aus admin_content_authz.go:
func (h *AdminContentHandler) requireAdmin(c *gin.Context) (middleware.AuthIdentity, bool)
```

Für Phase 40: eigene Wrapper-Funktionen per CONTEXT.md-Vorgabe:
```go
func requireFansubGroupNoteWriteAccess(h *AdminContentHandler, c *gin.Context) (middleware.AuthIdentity, bool)
func requireReleaseVersionNoteWriteAccess(h *AdminContentHandler, c *gin.Context) (middleware.AuthIdentity, bool)
```
Im MVP delegieren diese an `h.requireAdmin(c)`.

### Repository-Pattern

```go
// Konstruktor-Muster aus repository/:
func NewAdminContentRepository(db *pgxpool.Pool) *AdminContentRepository
```

Für Phase 40: Methoden an bestehende Repositories anhängen ODER neue dedizierte Repository-Dateien erstellen. Empfehlung: neue Datei `admin_content_notes.go` im `repository/`-Package analog zu `admin_content_fansub_releases.go`.

### Soft-Delete-Pattern (aus `release_version_media_repository.go`)

```go
// Delete:
UPDATE table SET deleted_at = NOW(), deleted_by_user_id = $2 WHERE id = $1 AND deleted_at IS NULL

// List:
WHERE deleted_at IS NULL

// Patch:
WHERE id = $1 AND deleted_at IS NULL
```

### Status-/Visibility-Pattern

Keine generische Lookup-Tabelle für Notes-Status. Projekt verwendet `CHECK`-Constraints in bestehenden Tabellen (z.B. `media_assets.status CHECK (status IN ('processing', 'ready', 'failed', 'deleted'))`). Gleiches Muster für Phase 40.

### Routing-Pattern

Alle Admin-Routen in `admin_routes.go`, registriert über `registerAdminRoutes(v1, authMiddleware, deps)`. Für Phase 40 müssen Einträge dort ergänzt werden.

---

## Frontend Patterns

### Fansub-Gruppen-Editor (`/admin/fansubs/[id]/edit/page.tsx`)

**Tabs:** `basic` | `tags` | `content` | `media` | `links` | `collaboration` | `releases`

**Save-Pattern:** PATCH-Endpunkt für Basic Information (Formular-Submit). Aliases, Links, Media werden per einzelnen API-Calls (POST/DELETE) direkt beim Button-Click gespeichert — kein Bulk-Save.

**Neue Tabs für Phase 40:** Ein neuer Tab `'notes'` für `fansub_group_notes`, `member_group_stories` und `anime_fansub_project_notes` wäre die passende Erweiterung.

**Markdown-Editor (bestehend):** 
- Split-View: `<textarea>` links, `<pre>` als Vorschau rechts
- Toolbar mit Bold/Italic/Heading/Link-Buttons
- Kein Markdown-Rendering — nur `<pre>`-Darstellung
- `MARKDOWN_SOFT_LIMIT = 8000` als Hinweis-Schwelle
- Wiederverwendbar für alle 4 Note-Typen

### Release-Version-Editor (`/admin/episode-versions/[versionId]/edit/`)

**Tabs:** `'übersicht'` | `'dateien'` | `'informationen'` | `'segmente'` | `'media'` | `'changelog'`

Der `versionId` in der URL entspricht `release_versions.id`.

**Neuer Tab für Phase 40:** `'notizen'` für `release_version_notes`.

### API-Client-Pattern (`frontend/src/lib/api.ts`)

- Alle Calls über zentrale Hilfsfunktionen
- TypeScript-Typen in `frontend/src/types/`
- Response-Format: `{ data: T }` für Einzelobjekte, `{ data: T[] }` für Listen

### TypeScript-Typen (aktuell fehlend)

Neue Dateien nötig:
- `frontend/src/types/fansubNotes.ts` — für `fansub_group_notes`, `member_group_stories`, `anime_fansub_project_notes`
- `frontend/src/types/releaseVersionNotes.ts` — für `release_version_notes`

---

## Release-Version ↔ Member/Role Linkage

### Befund

`release_member_roles` ist an `fansub_releases.id` gebunden, **nicht** an `release_versions.id`.

Der kanonische Join-Pfad um beteiligte Member+Rollen für eine `release_version` zu finden:

```sql
SELECT rmr.member_id, m.nickname, rmr.role_id, cr.name AS role_name
FROM release_member_roles rmr
JOIN members m ON m.id = rmr.member_id
JOIN contributor_roles cr ON cr.id = rmr.role_id
JOIN release_versions rv ON rv.release_id = rmr.release_id
WHERE rv.id = $release_version_id
ORDER BY cr.name, m.nickname
```

### Konsequenz für `release_version_notes`

- UNIQUE-Constraint: `UNIQUE (release_version_id, member_id, role_id) WHERE deleted_at IS NULL` (Partial Index)
- UI zeigt nur Member+Rollen an, die über obigen Join ermittelbar sind
- Falls `release_member_roles` für eine Version leer ist (historische Daten), kann Admin trotzdem manuell Notes anlegen

---

## Markdown/HTML/Sanitizing

### Backend (Go)

`go.mod` enthält **kein** Markdown-Library. Die verfügbaren Pakete sind imaging, mimetype, uuid, gin, pgx, redis — kein goldmark, blackfriday, bluemonday.

**Empfehlung (verifiable):** `github.com/yuin/goldmark` für Markdown→HTML-Konvertierung + `github.com/microcosm-cc/bluemonday` für HTML-Sanitizing. Beide sind stabil, aktiv und in der Go-Community weit verbreitet.

**Minimal-Alternative:** Body_html beim Save leer lassen, body_markdown als Primärquelle. Frontend rendert mit `<pre>` (wie aktuell). Sicherer, weil kein unsanitisiertes HTML ausgegeben wird. BLOCKER-Bedingung aus CONTEXT.md wäre damit nicht ausgelöst (kein rohes unsanitisiertes HTML public).

**Entscheidung liegt beim Planer:** Library hinzufügen (vollständige Lösung) oder body_html als Dummy-Feld (MVP-Vereinfachung).

### Frontend (Next.js/React)

`package.json` enthält **kein** Markdown-Rendering-Package. Der aktuelle Fansub-Editor zeigt Markdown-Text nur als `<pre>`. Das ist die sichere Lösung für Admin-Only-UI.

Für Phase 40: Markdown-Toolbar + `<pre>`-Vorschau wiederverwenden. Kein neues Package nötig wenn nur Admin die Texte sieht.

---

## Migration-Konventionen

### Namensschema

```
NNNN_beschreibung_in_snake_case.up.sql
NNNN_beschreibung_in_snake_case.down.sql
```

Beispiele: `0059_release_version_media_schema.up.sql`, `0060_add_media_type_image.up.sql`

### Nummerierung

4-stellige, sequenzielle Nummern ohne Lücken (0001..0060 vorhanden, nächste freie: **0061**).

### Stil

- `IF NOT EXISTS` / `IF EXISTS` für Idempotenz
- `DO $$ ... END $$;`-Blöcke für bedingte Operationen
- Explizite Constraint-Namen: `chk_tablename_fieldname`, `uq_tablename_fieldname`, `fk_tablename_field`
- Index-Namen: `idx_tablename_field`
- Transaktionssicherheit: DDL-Statements ohne explizite Transaktionsklammern (PostgreSQL macht DDL transaktional)
- DOWN-Migrations: DROP TABLE IF EXISTS, DROP COLUMN IF EXISTS

### Nächste verfügbare Nummern

```
0061 → fansub_group_notes
0062 → member_group_stories
0063 → anime_fansub_project_notes
0064 → release_version_notes
0065 → seed_contributor_roles_kernrollen
```

---

## Routing-Konventionen

Alle bestehenden Admin-Endpunkte folgen dem Muster `/api/v1/admin/[ressource]/:id/[unterressource]`.

### Bestehende Muster als Vorlage

```
GET    /admin/release-versions/:versionId/media
POST   /admin/release-versions/:versionId/media
PATCH  /admin/release-versions/:versionId/media/:relationId
DELETE /admin/release-versions/:versionId/media/:relationId
GET    /admin/fansubs/:id/links
POST   /admin/fansubs/:id/links
PATCH  /admin/fansubs/:id/links/:linkId
DELETE /admin/fansubs/:id/links/:linkId
```

### Empfohlene Routen für Phase 40

```
# fansub_group_notes
GET    /admin/fansubs/:id/notes
POST   /admin/fansubs/:id/notes
PATCH  /admin/fansubs/:id/notes/:noteId
DELETE /admin/fansubs/:id/notes/:noteId

# member_group_stories
GET    /admin/fansubs/:id/member-stories
POST   /admin/fansubs/:id/member-stories
PATCH  /admin/fansubs/:id/member-stories/:storyId
DELETE /admin/fansubs/:id/member-stories/:storyId

# anime_fansub_project_notes
GET    /admin/fansubs/:id/anime/:animeId/notes
POST   /admin/fansubs/:id/anime/:animeId/notes
PATCH  /admin/fansubs/:id/anime/:animeId/notes/:noteId
DELETE /admin/fansubs/:id/anime/:animeId/notes/:noteId

# release_version_notes
GET    /admin/release-versions/:versionId/notes
POST   /admin/release-versions/:versionId/notes
PATCH  /admin/release-versions/:versionId/notes/:noteId
DELETE /admin/release-versions/:versionId/notes/:noteId

# Hilfreich: beteiligte Member+Rollen für eine Release-Version laden
GET    /admin/release-versions/:versionId/member-roles
```

Die Routing-Konvention `release-versions` (mit Bindestrich) ist bereits etabliert in:
```
/admin/release-versions/:versionId/media
/admin/release-versions/:versionId/media/reorder
```

---

## Validation Architecture

Testframework: **Vitest 3** (Frontend), **testify/assert** (Backend).

### Bestehende Teststruktur

- Backend-Tests: `_test.go` neben den Implementierungsdateien im gleichen Package
- Frontend-Tests: `.test.tsx` colocated (z.B. `ReleaseVersionMediaSection.test.tsx`)
- Vitest-Config: `frontend/vitest.config.ts` mit `@`-Path-Alias

### Wave 0 Gaps

Für Phase 40 müssen folgende Test-Dateien neu angelegt werden:

#### Backend
- `backend/internal/repository/fansub_notes_repository_test.go` — Unit-Tests für Note-Repositories (SQL-Source-Checks für soft delete, analog zu `release_version_media_repository_test.go`)

#### Frontend
- Je nach Scope: Tests für die neuen Note-UI-Komponenten analog zu `ReleaseVersionMediaSection.test.tsx`

### Quick-Run-Befehl
```bash
cd frontend && npm test
```

### Full-Suite-Befehl
```bash
cd frontend && npm test
cd backend && go test ./...
```

---

## Sources

### PRIMARY (HIGH confidence — direkt aus Codebase verifiziert)

- `database/migrations/0044_add_db_schema_v2_target_tables.up.sql` — `contributor_roles`, `release_member_roles`, `member_episode_notes`, `member_anime_notes`, `members`
- `database/migrations/0059_release_version_media_schema.up.sql` — Vorlage-Tabelle `release_version_media`
- `database/migrations/0011_anime_fansub_groups.up.sql` — `anime_fansub_groups` FK-Struktur
- `database/migrations/0037_add_release_decomposition_tables.up.sql` — `visibilities`-Tabelle
- `backend/cmd/server/admin_routes.go` — vollständige Routing-Übersicht
- `backend/internal/handlers/admin_content_authz.go` — `requireAdmin()`-Pattern
- `backend/internal/handlers/admin_content_handler.go` — Handler-Struktur und Interfaces
- `backend/internal/repository/release_version_media_repository.go` — soft-delete Pattern, `release_versions.id`-Bestätigung
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — Fansub-Editor Tabs und Markdown-Toolbar
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` — Release-Version-Editor Tabs
- `backend/go.mod` — keine Markdown-Library
- `frontend/package.json` — keine Markdown-Library

### SECONDARY (MEDIUM confidence)

- `docs/architecture/db-schema-fansub-domain.md` — fachliche FK-Dokumentation (Stand 02.05.2026)

---

## Project Constraints (from CLAUDE.md)

| Constraint | Impact auf Phase 40 |
|------------|---------------------|
| Brownfield | Bestehende Tabellen und Handler erweitern, nicht ersetzen |
| Modularity: max 450 Zeilen | Handler- und Repository-Dateien aufteilen (je Note-Typ) |
| UX quality | Markdown-Toolbar, Hilfetexte pro Rolle, Schreibimpulse als Placeholder |
| Sprachqualität: Umlaute | UI-Strings müssen korrekte Umlaute verwenden |
| Admin-only V1 | Keine Member-Schreibrechte in Phase 40 |
| Append-only Migrations | Neue Tabellen als neue Migration, keine bestehenden Migrationen ändern |
| Data ownership | body_markdown ist Primärquelle, body_html abgeleitet |

---

## Metadata

**Confidence breakdown:**
- DB-Bestandsanalyse: HIGH — alle Migrationen direkt gelesen
- Backend Patterns: HIGH — Handler, Repositories, Routing direkt verifiziert
- Frontend Patterns: HIGH — Editor-Dateien direkt gelesen
- Rollenmodell: HIGH — `contributor_roles` direkt verifiziert, Seeds bekannt
- Markdown/HTML: MEDIUM — kein Library vorhanden, Entscheidung nötig

**Research date:** 2026-05-11
**Valid until:** 2026-06-11 (stabile Codebase, 30 Tage)
