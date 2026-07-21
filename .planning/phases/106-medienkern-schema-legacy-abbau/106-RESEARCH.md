# Phase 106: Medienkern-Schema & Legacy-Abbau — Research

**Researched:** 2026-07-21
**Domain:** PostgreSQL-Schema-Evolution (append-only Migrationskette) + Go/Next.js Legacy-Code-Abbau (brownfield)
**Confidence:** HIGH (alle Befunde direkt am Code/Migrationen verifiziert; keine externen Quellen nötig)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Append-only Kette. Neue Migration(en) ab Nummer **0131** (aktuell bis `database/migrations/0130`) legen `media` + `media_variant` an und entfernen Legacy per `DROP TABLE`/`DROP COLUMN`. Bestehende Altmigrationen bleiben **unberührt** (keine Konsolidierung), saubere `.down.sql`.
- **D-02:** Migrationsnummern vor Vergabe prüfen — es gab Kollisionen (0090 durch Phase 70 belegt → Phase 67 wich auf 0091). Nächste freie Nummer(n) ab 0131 verifizieren.
- **D-03:** Nur **build-breaking Frontend** anfassen (v.a. `/covers/[file]/route.ts`). Restliche FE-Politur (`ScreenshotGallery.tsx`, `screenshotImage.ts`, doppelte `GroupAssets`-Typen, tote Admin-Upload-Komponenten) bleibt **Phase 109**.
- **D-04:** Backend-Legacy-Abbau ist **voll in 106** (Liste §6).
- **D-05:** `content_hash` als nullable Spalte **OHNE UNIQUE**. Dedup kommt erst mit `MediaFileService` in Phase 107. Non-unique Index optional (Planner-Ermessen).
- **D-06:** **TEXT + CHECK-Constraint** für alle Enum-Felder (`kind`, `source`, `processing_status`, `variant`, `status`). Folgt dominanter Projektkonvention (~50 Migrationen).

### Claude's Discretion
- Contract-Check: `scripts/schema-v2-contract-check.ps1` erweitern **oder** analog neu — Kern-Assertion: keine Legacy-Medientabelle/-spalte/-route existiert mehr.
- Exakte Reihenfolge der DROP-Operationen und `.down.sql`-Rückbau.
- Ob/welcher non-unique Index auf `content_hash`.

### Deferred Ideas (OUT OF SCOPE)
- **Voller Frontend-Legacy-Abbau** (`ScreenshotGallery.tsx`, `screenshotImage.ts`, doppelte `GroupAssets`-Typen, tote Admin-Upload-Komponenten) → **Phase 109**.
- **UNIQUE(content_hash) / Dedup-Logik** → **Phase 107**.
- **Verwendungsrelationstabellen + Kernmedien-FK-Slots + Permissions** → **Phase 108**.
- **Reset-/Seed-Skripte, TSV-Cover-Zuordnung, E2E-Gate** → **Phase 110**.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Beschreibung | Research Support |
|----|--------------|------------------|
| DECISION §1 Ebene 1 (`media`) | Exakter Spaltensatz des globalen Mediums | Zielspaltensatz + FORBIDDEN-Spalten in Abschnitt „Zielschema" bestätigt; FK-Ziele `users`/`members` existieren |
| DECISION §1 Ebene 2 (`media_variant`) | Technische Ableitungen, ON DELETE CASCADE | Zielspaltensatz + Enum-Werte in Abschnitt „Zielschema" |
| DECISION §6 Legacy-Abbau | Backend voll, FE nur build-breaking | Vollständiges Legacy-Inventar mit Datei-/Call-Site-Nachweis (Abschnitt „Legacy-Abbau-Inventar") |
| ROADMAP SC1 | `media`+`media_variant` existieren, keine `caption/visibility/review` am Medium | Zielschema + FORBIDDEN-Liste |
| ROADMAP SC2 | Legacy ersatzlos entfernt | Inventar + DROP-Liste |
| ROADMAP SC3 | Kette 1→n grün auf leerer DB + Contract-Check | Migrations-Runner + Contract-Check-Analyse |
| ROADMAP SC4 | `go build`/`go vet` grün + grep sauber | Call-Site-Nachweis pro Symbol |
</phase_requirements>

## Summary

Phase 106 ist eine reine **Schema-Fundament- + Legacy-Abbau-Phase** ohne Verhaltensänderung. Es entstehen zwei neue Tabellen `media` und `media_variant` in einer neuen append-only Migration **0131** (nächste freie Nummer verifiziert, keine Kollision). Parallel wird toter/uneinheitlicher Legacy-Medien-Code entfernt. Die Herausforderung ist **nicht** technische Komplexität, sondern **chirurgische Genauigkeit beim Abbau**: die Legacy-Symbole sind mit lebendem Code verzahnt, und SC4 verlangt eine grep-saubere Codebasis bei grünem `go build`/`go vet`.

Der wichtigste, planungsentscheidende Befund: **`media_assets`/`media_files` werden in Phase 106 NICHT gedroppt.** Die ROADMAP-Formulierung „ersetzen `media_assets`/`media_files`" ist das **Endziel des gesamten Arbeitspakets (106–110)**, nicht die 106-Aktion. `media_assets` wird in 106 weiterhin aktiv referenziert (u.a. `anime.cover_asset_id`-FK, `release_version_media.media_asset_id`, generischer `/admin/upload`-V2-Pfad, `anime_media`/`episode_media`-Junctions, `release_theme_assets`). Ein Drop in 106 würde die gesamte lebende Medienfläche zerstören. `media`/`media_variant` werden **additiv** neben `media_assets`/`media_files` angelegt; die Ablösung geschieht in 107 (Upload) / 108 (Relationen) / 110 (Reset). **Dieser Punkt MUSS im Plan explizit als Grenze fixiert sein.**

Ein zweiter Grenzbefund: Ein Teil der §6-Wortlaute („Migration 0018", „models/media_upload.go-Upload-DTOs") wird durch die neueren, gelockten Entscheide D-01/D-04 präzisiert. Details unten unter „Boundary-Klärungen".

**Primary recommendation:** Eine einzige Migration `0131_media_core_schema.up/.down.sql` legt `media`+`media_variant` an, dropt `release_media` und `anime.cover_image`; der Go-/FE-Abbau folgt der verifizierten Call-Site-Liste; ein an `schema-v2-audit.ps1` angelehnter Contract-Check asserted die Legacy-Freiheit. `media_assets`/`media_files` bleiben unangetastet.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Neue Tabellen `media`/`media_variant` | Database (Migration 0131) | — | Reines DDL, append-only Kette |
| Legacy-Tabellen-/Spalten-Drop (`release_media`, `anime.cover_image`) | Database (Migration 0131) | — | DDL im selben Zielmigrations-Schritt |
| Backend-Legacy-Code-Abbau | API/Backend (Go) | — | Repo/Handler/Model/Route entfernen, Build grün halten (D-04) |
| Cover-File-Serving-Abbau | Frontend Server (Next route handlers) | API/Backend | `/covers/[file]` + `/api/admin/upload-cover` sind Next-Route-Handler; nur build-breaking Teile (D-03) |
| Schema-Contract-Check | Tooling (PowerShell + Docker psql) | — | Läuft gegen laufende DB, kein App-Code |
| Migrationsketten-Validierung | Tooling (`cmd/migrate` + Go-Migrations-Test) | Database | Kette 1→n gegen leere DB |

## Standard Stack

Keine neuen externen Pakete. Diese Phase nutzt ausschließlich vorhandene Projekt-Infrastruktur.

### Core
| Komponente | Version/Ort | Zweck | Warum Standard |
|-----------|-------------|-------|----------------|
| PostgreSQL | 16 (Docker `team4sv30-db`) | Zielschema | Projekt-DB, siehe `docker-compose.yml` |
| Migrations-Runner | `backend/internal/migrations/runner.go` + `backend/cmd/migrate` | Kette anwenden/prüfen | Projekt-eigener Runner, liest `schema_migrations`-Tracking-Tabelle |
| pgx/v5 | `github.com/jackc/pgx/v5` | DB-Zugriff im Go-Code | Projektkonvention |
| PowerShell + Docker psql | `scripts/schema-v2-audit.ps1` | Contract-Check gegen Live-DB | Vorlage bereits vorhanden |

### Alternatives Considered
| Statt | Möglich | Tradeoff |
|-------|---------|----------|
| Append-only 0131 | Konsolidierung der Altmigrationen im leeren Zustand | Durch **D-01 ausgeschlossen** — sauberer im Endzustand, aber aufwändiger/riskanter; nicht wählen |

**Installation:** Keine. `go build ./...`, `go vet ./...`, `npm run typecheck` sind die Gates.

## Package Legitimacy Audit

**Nicht zutreffend** — Phase 106 installiert **keine** externen Pakete (weder npm noch Go-Module noch PyPI). Reine Schema-/Code-Abbau-Phase auf vorhandener Infrastruktur. slopcheck/Registry-Verifikation entfällt.

## Migrationsnummern-Verifikation (D-02)

**Verifiziert per `ls database/migrations/`:**
- Höchste Nummer: **0130** (`0130_release_content_source_groups.up/.down.sql`).
- **Keine Kollision:** Jede Nummer 0001–0130 erscheint genau 2× (up+down). Automatischer Anomalie-Check (`uniq -c … != 2`) lieferte **keine** Treffer.
- **Nächste freie Nummer: `0131`.** Empfehlung: eine einzige Migration `0131_media_core_schema` (Anlegen + Abbau in einem Schritt, saubere gemeinsame `.down.sql`). Falls der Planner Anlegen und Abbau trennen will: `0131_media_core_schema` + `0132_drop_legacy_media`, beide frei.

**Namenskonvention (verifiziert):** `NNNN_snake_case_name.up.sql` + `NNNN_snake_case_name.down.sql`, 4-stellig nullgepolstert. Beispiel jüngste: `0130_release_content_source_groups.up.sql`.

**Zwei Migrationsverzeichnisse — Achtung:**
- `database/migrations/` = **die einzige ausgeführte Kette.** `runner.go:ResolveMigrationsDir` sucht ausschließlich `database/migrations` (relative Kandidaten); `docker-compose.yml:151` mountet `./database/migrations`.
- `backend/database/migrations/` = **totes Verzeichnis**, enthält nur `001_create_media_tables.up/.down.sql` + `README.md`. Wird **nie** ausgeführt (nicht in Runner-Kandidaten, nicht gemountet). → Abbau = schlichtes Löschen der 3 Dateien, **null** Ketten-Risiko.

## Legacy-Abbau-Inventar (Kern der Phase — SC4-relevant)

Jede Zeile mit exaktem Pfad, referenzierenden Dateien und Build-Impact. „Build-Break" = Entfernen bricht `go build`/`go vet` (Backend) bzw. `npm run typecheck`/Next-Build (FE).

### A. Totes UUID-Parallelschema (backend/database/migrations/001)
| Artefakt | Pfad | Referenzen | Build-Break | Aktion |
|----------|------|-----------|-------------|--------|
| Dead 001 UP/DOWN | `backend/database/migrations/001_create_media_tables.up.sql` / `.down.sql` | keine (nie ausgeführt) | Nein | Dateien löschen |
| Dead README | `backend/database/migrations/README.md` | keine | Nein | Löschen (Verzeichnis wird leer → entfernen) |

Das dead 001 definiert `media_assets(id VARCHAR(36), entity_type, asset_type…)` — eine **andere** Form als das lebende `media_assets` (BIGSERIAL, `media_type_id`). Reine Karteileiche.

### B. Generischer Upload-Stack — Legacy-Dualpfad (NICHT der ganze Stack!)
Der generische `/admin/upload`-Endpunkt (`admin_routes.go:108`) **bleibt** in 106 funktionsfähig (V2-Pfad gegen `media_assets`, Ablösung erst Phase 107). Nur die **Legacy-Schema-Erkennung + Dual-Branches** werden entfernt.

| Artefakt | Pfad | Detail | Build-Break | Aktion |
|----------|------|--------|-------------|--------|
| `SupportsLegacyUploadSchema` | `backend/internal/repository/media_upload.go:47` | Prüft ob `media_assets.entity_type` existiert → **in Live-Schema immer `false`** (Live hat keine `entity_type`-Spalte). Toter Zweig. | Ja (Aufrufer) | Methode entfernen |
| `useLegacyUploadSchema` | `media_upload.go:62` | Delegiert an obige | Ja | Entfernen |
| `if useLegacy`-Branches | `media_upload.go` `CreateMediaAsset`(107), `CreateMediaFile`(139), `CreateAnimeMedia`(170) | Auf V2-only kollabieren | Ja | Branches auflösen, V2-Pfad behalten |
| `coerceMediaReference(…, useLegacy)` | `media_upload.go:243` | `useLegacy`-Parameter/Zweig raus, immer `ParseInt` | Ja | Signatur vereinfachen |
| `media_upload_v2_compat.go` | `backend/internal/handlers/media_upload_v2_compat.go` | 22 Zeilen: `legacyUploadSchemaDetector`-Interface + `shouldUseAnimePosterPathFallback` (gibt immer `false`) | Ja (`SupportsLegacyUploadSchema`-Interface) | Datei löschen, Aufruf im Handler entfernen |
| Test | `backend/internal/handlers/media_upload_test.go` | Referenziert `SupportsLegacyUploadSchema` | Ja | Test anpassen/entfernen |
| Legacy-Upload-DTO-Felder | `backend/internal/models/media_upload.go` | `UploadMediaAsset{ID string, EntityType, EntityID, AssetType}` = dead-001-Form. V2-Pfad nutzt nur `MediaType`/`FilePath`/`Format`/`MimeType`/`UploadedBy`. `ID string` wird per `strconv` gecoerct. | Teilweise | **Boundary:** DTO auf V2-Felder abspecken (siehe Open Questions), NICHT ganze Datei blind löschen — Handler braucht weiter ein Request/Response-DTO |

### C. episode_version_images-Strecke
Die **Tabelle** `episode_version_images` ist im Live-Schema bereits abwesend: `0018` legt sie an, `0046_drop_legacy_episode_versions` dropt sie (`DROP TABLE IF EXISTS episode_version_images`). Unter **D-01 (Altmigrationen unberührt)** bleiben 0018 und 0046 stehen → **kein** neuer Drop in 0131 nötig. Nur der **tote Go-Code + Route** wird entfernt.

| Artefakt | Pfad | Referenzen | Build-Break | Aktion |
|----------|------|-----------|-------------|--------|
| Handler | `backend/internal/handlers/episode_version_images_handler.go` | `main.go:88` (`NewEpisodeVersionImagesHandler`) | Ja | Löschen |
| Repo-Stub | `backend/internal/repository/episode_version_image_repository.go` | `main.go` (Konstruktion) | Ja | Löschen |
| Model | `backend/internal/models/episode_version_image.go` | Handler/Repo | Ja | Löschen |
| Route + Wiring | `backend/cmd/server/main.go:88` (Konstruktion) + `:448` (`v1.GET("/releases/:id/images", …ListReleaseImages)`) | — | Ja | Beide Zeilen entfernen |
| **NICHT anfassen:** `GetGroupReleaseImages` | `backend/internal/handlers/group_contributors_handler.go:250` + Route `main.go:358` (`/anime/:id/group/:groupId/releases/:releaseVersionId/images`) | lebender Public-Pfad über `release_version_media` | — | **Bleibt** — Namensähnlichkeit, aber anderer Handler |
| FE `ScreenshotGallery.tsx` / `screenshotImage.ts` | frontend | — | (siehe D-03) | **Deferred → Phase 109** (nur falls nicht build-breaking) |

### D. release_media-Junction
Tabelle lebend (0026 create; nur in `0026…down.sql` gedroppt = Rollback; **nie** forward-gedroppt). → **0131 MUSS `DROP TABLE IF EXISTS release_media CASCADE`.**

| Artefakt | Pfad | Detail | Build-Break | Aktion |
|----------|------|--------|-------------|--------|
| Tabelle | `database/migrations` (0026) | FK `media_id → media_assets ON DELETE CASCADE` | — | `DROP TABLE` in 0131 |
| `CreateReleaseMedia` | `backend/internal/repository/media_upload.go:290` | `INSERT INTO release_media …` | Ja | Methode entfernen |
| `DeleteMediaAsset` join-Liste | `media_upload.go:367-378` | Iteriert `["anime_media","episode_media","fansub_group_media","release_media"]` | Ja (SQL-Fehler zur Laufzeit, nicht Compile) | `"release_media"` aus Liste nehmen |

### E. anime.cover_image-String
Spalte `anime.cover_image TEXT` (0001) lebend, **nie** gedroppt. → **0131 MUSS `ALTER TABLE anime DROP COLUMN IF EXISTS cover_image`.**

**Wichtig — FE bleibt build-grün:** Das DTO-Feld `cover_image` (JSON) ist **abgeleitet** via `animeCoverImageSelectSQL` (COALESCE über `cover_resolved_url`, `cover_image`, `poster.file_path`, Jellyfin-URL). Nach Spalten-Drop entfällt nur der `cover_image`-COALESCE-Zweig; das DTO-Feld liefert weiter Werte aus `cover_resolved_url`/poster/Jellyfin. **Frontend-Typen/Komponenten, die `anime.cover_image` lesen (~40 Dateien), brechen NICHT** → bestätigt D-03 (nur `/covers/`-Route ist FE-relevant).

| Artefakt | Pfad | Detail | Build-Break | Aktion |
|----------|------|--------|-------------|--------|
| Spalte | `database/migrations` 0001 | — | — | `DROP COLUMN` in 0131 |
| Select-SQL | `backend/internal/repository/anime_v2.go:419` (`animeCoverImageSelectSQL`) + `:443` (`animeCoverAvailableSQL`) | `NULLIF(BTRIM(%s.cover_image), '')`-Zweig | Ja | Zweig entfernen (DTO-Feld bleibt via übrige COALESCE-Quellen) |
| Sync/Write | `backend/internal/repository/anime_assets.go` — `:349`, `:386`, `:428` (`syncLegacyAnimeCoverImageV2`), `:516-599` (`HasCoverImage`-Guard), `:599`, `:966-981`, `:1712` (Kommentar) | Legacy-Sync von `cover_image` | Ja | Entfernen; `cover_asset_id`/`cover_resolved_url`-Pfad bleibt |
| Schema-Detektion | `backend/internal/repository/anime_schema.go:21` (`HasCoverImage bool`), `:62-63` | Dynamische Spalten-Erkennung | Ja | Feld + Erkennungs-Case entfernen |
| Migrate-Cover-Tool | `backend/cmd/migrate-covers/` (`main.go`, `README.md`, `INVENTORY.md`, `test-migration.sh`) | Einmal-CLI | Nein (eigenes `main`) | Ganzes Verzeichnis löschen |
| Report/Remediate | `scripts/report-cover-image-state.ps1`, `scripts/remediate-cover-image.ps1` | Ops-Skripte | Nein | Löschen |
| **NICHT verwechseln:** `cover_asset_id`, `cover_source`, `cover_resolved_url`, `cover_provider_key` (0040) | `anime` | aktueller Cover-Mechanismus, bleibt bis Phase 108 (`cover_media_id`) | — | **Behalten** |

### F. /covers-File-Serving + upload-cover (Next-Route-Handler)
| Artefakt | Pfad | Referenzen | Build-Break | Aktion |
|----------|------|-----------|-------------|--------|
| Cover-Serve-Route | `frontend/src/app/covers/[file]/route.ts` | liest `public/covers/<file>` | (Route selbst) | Löschen (D-03: build-breaking Ziel) |
| Upload-Cover-Route | `frontend/src/app/api/admin/upload-cover/route.ts` | Next-Route-Handler (POST/DELETE) | — | Löschen |
| api.ts-Client | `frontend/src/lib/api.ts` — `deleteUploadedCoverFile` (:5936, `fetch("/api/admin/upload-cover")`) + POST-Upload-Funktion | Aufruf in `AdminAnimeOverviewClient.tsx` | Ja (Aufrufer) | Client-Fn(en) entfernen, Aufrufer in `AdminAnimeOverviewClient.tsx` bereinigen |

### G. asset_lifecycle_service (Ordnerprovisionierung)
Durch hash-basierte Ablage (Phase 107) überflüssig. **Achtung: großer verzahnter Cluster** — `MediaUploadHandler` konstruiert/nutzt ihn.

| Artefakt | Pfad | Referenzen | Build-Break | Aktion |
|----------|------|-----------|-------------|--------|
| Service | `backend/internal/services/asset_lifecycle_service.go` (+ `asset_lifecycle_errors.go`, `asset_lifecycle_service_test.go`) | `main.go`, `handlers/media_upload.go`, `media_upload_test.go` | Ja | Entfernen + Handler-Verdrahtung lösen |
| Model | `backend/internal/models/asset_lifecycle.go` | Service | Ja | Löschen |
| Repo | `backend/internal/repository/asset_lifecycle_audit.go`, `asset_lifecycle_subjects.go`, `asset_lifecycle_repository_test.go` | Service | Ja | Löschen |
| Wiring | `backend/cmd/server/main.go` (`AssetLifecycle`-Konstruktion), `handlers/media_upload.go` (Feld/Nutzung) | — | Ja | Entkoppeln |

> **Planner-Hinweis:** `asset_lifecycle_service` ist in den `MediaUploadHandler` eingewoben. Da der generische Upload in 106 weiterläuft, muss der Handler nach Entfernen der Ordnerprovisionierung weiter kompilieren und den V2-Upload bedienen. Wave-0-Test: `go build ./...` nach jedem Abbauschritt.

## Zielschema (DECISION §1 — exakt)

### `media` (Ebene 1, globales physisches Medium)
Spaltensatz (verbindlich):
`id, kind, storage_key, original_filename, mime_type, byte_size, width, height, duration_seconds, content_hash, source, source_ref, credit, rights_note, owner_user_id, owner_member_id, processing_status, created_at`

- **FK-Ziele (verifiziert vorhanden):** `owner_user_id → users(id)`, `owner_member_id → members(id)` (beide Tabellen existieren laut schema-v2-audit; bestehende Konvention `uploaded_by → users`). Empfehlung `ON DELETE SET NULL` (Owner optional).
- **Enums (D-06, TEXT+CHECK):**
  - `kind`: `image` / `video` / `audio`
  - `source`: `upload` / `jellyfin` / `anilist` / `mal` / … (additiv erweiterbar)
  - `processing_status`: `processing` / `ready` / `failed`
- **`content_hash`:** nullable, **KEIN UNIQUE** (D-05). Non-unique Index optional.
- **VERBOTEN am Medium (SC1, DECISION §1):** `caption`, `visibility` / `visibility_id`, `review_status` / `review_status_id`, `category`, `sort_order` (alles verwendungsspezifisch → Phase 108-Relationstabellen).

### `media_variant` (Ebene 2, technische Ableitungen)
`id, media_id, variant, storage_key, width, height, byte_size, mime_type, status`
- `media_id → media(id) **ON DELETE CASCADE**` (verbindlich).
- **Enums (TEXT+CHECK):** `variant`: `original` / `thumbnail` / `preview`; `status`: `ready` / `missing` / `failed`.

## Aktuelle Form der zu ersetzenden Tabellen (bleiben in 106!)

**`media_assets`** (0024_recreate_media_assets — aktuelle Live-Form):
`id BIGSERIAL PK, media_type_id BIGINT, file_path TEXT NOT NULL, caption TEXT, mime_type VARCHAR(100), format VARCHAR(50), uploaded_by BIGINT, created_at, modified_at, modified_by` + Spalten aus 0025 (`media_external`) / 0040-Kontext.

**`media_files`** (0026_add_media_tables): `id BIGSERIAL PK, media_id BIGINT → media_assets ON DELETE CASCADE, variant VARCHAR(50), storage_id VARCHAR(255), path TEXT NOT NULL, width, height, size BIGINT, created_at`.

**Referenzen auf `media_assets` (deshalb Drop in 106 unmöglich):** `anime.cover_asset_id` (0040 FK), `release_version_media.media_asset_id` (0059, Phase 34), `anime_media`/`episode_media`/`fansub_group_media`-Junctions, `release_theme_assets.media_id`, generischer V2-Upload. → **`media_assets`/`media_files` bleiben in 106 unangetastet.**

## TEXT+CHECK-Enum-Referenz (D-06) — zum Spiegeln

Muster aus `database/migrations/0129_release_playback_entitlements.up.sql` (jüngstes Beispiel; ~50 Migrationen folgen diesem Stil):

```sql
CREATE TABLE release_playback_entitlement_rules (
    id BIGSERIAL PRIMARY KEY,
    subject_type TEXT NOT NULL,
    effect TEXT NOT NULL,
    scope_type TEXT NOT NULL,
    ...
    CONSTRAINT chk_release_playback_entitlement_subject_type
        CHECK (subject_type IN ('app_user', 'role')),
    CONSTRAINT chk_release_playback_entitlement_effect
        CHECK (effect IN ('allow', 'deny')),
    CONSTRAINT chk_release_playback_entitlement_scope_type
        CHECK (scope_type IN ('global', 'group', 'project', 'release'))
);
```

Konvention: benannte Constraints `chk_<table>_<col>`, Werte kleingeschrieben, `TEXT NOT NULL` + separater CHECK. Für 0131 analog `chk_media_kind`, `chk_media_source`, `chk_media_processing_status`, `chk_media_variant_variant`, `chk_media_variant_status`.

## DROP-Reihenfolge & Down-Migration (FK-Constraints)

**Keine kritischen Abhängigkeits-Zwänge** — die zu droppenden Objekte sind *referenzierende* Kinder bzw. eine FK-lose Spalte:
- `release_media` referenziert `media_assets` (Kind) → Drop unproblematisch (`DROP TABLE IF EXISTS release_media CASCADE`).
- `anime.cover_image` = FK-loser TEXT → `ALTER TABLE anime DROP COLUMN IF EXISTS cover_image`.

**Empfohlene UP-Reihenfolge (0131):**
1. `CREATE TABLE media (…)` mit CHECK-Constraints.
2. `CREATE TABLE media_variant (…)` mit `media_id → media ON DELETE CASCADE`.
3. (optional) `CREATE INDEX` auf `media(content_hash)` (non-unique, D-05-Ermessen) + `media_variant(media_id)`.
4. `DROP TABLE IF EXISTS release_media CASCADE;`
5. `ALTER TABLE anime DROP COLUMN IF EXISTS cover_image;`

**DOWN-Reihenfolge (`.down.sql`, exakte Umkehr):**
1. `ALTER TABLE anime ADD COLUMN IF NOT EXISTS cover_image TEXT;` (rekonstruiert 0001-Spalte).
2. `release_media` neu anlegen (Definition aus 0026: `release_id BIGINT, media_id BIGINT → media_assets ON DELETE CASCADE, sort_order INTEGER DEFAULT 0, created_at, PK(release_id, media_id)` + Indizes).
3. `DROP TABLE IF EXISTS media_variant;` (zuerst — FK-Kind).
4. `DROP TABLE IF EXISTS media;`

> Da Testdaten zurückgesetzt werden (kein Datenerhalt), muss der Down-Pfad nur strukturell reversibel sein — keine Datenrückführung.

## Contract-Check-Analyse (SC3)

`scripts/schema-v2-contract-check.ps1` ist ein 10-Zeilen-Wrapper, der `scripts/schema-v2-audit.ps1 -FailOnContractGaps` aufruft. Der Audit:
1. Verbindet via `docker compose exec team4sv30-db psql` (DB-Identität `team4s_v2`/`team4s` — hart geprüft).
2. Liest `information_schema.tables/columns`, `pg_constraint`, `pg_indexes` in Hashmaps.
3. Prüft eine `$targetTables`-Liste (soll-vorhanden) und eine `$legacyTables`-Liste (`episode_version_episodes`, `episode_version_images`, `episode_versions` = soll-abwesend/„legacy-to-delete").
4. `$contractPassed = (missing==0 && blockingDivergent==0)`; `-FailOnContractGaps` wirft bei Verstoß.

**Problem für 106:** Der aktuelle Audit listet `media_assets`, `media_files`, `anime_media`, `episode_media`, `fansub_group_media`, `release_media` als **erwartete** Tabellen (`$targetTables`, Zeilen 101-107) — er würde `release_media`-Drop als „missing" **fehlschlagen** lassen und kennt `media`/`media_variant` nicht.

**Empfehlung (Planner-Ermessen, D-Discretion): analoges neues Skript** `scripts/media-core-contract-check.ps1` statt Umbau des v2-Audits (der v2-Audit ist als DB-Schema-v2-Cutover-Guard historisch gebunden). Kern-Assertionen des neuen Checks:
- **MUSS vorhanden:** Tabelle `media` mit Zielspalten + CHECK-Constraints `kind/source/processing_status`; Tabelle `media_variant` mit `media_id`-FK ON DELETE CASCADE + CHECK `variant/status`.
- **MUSS abwesend:** Tabelle `release_media`; Spalte `anime.cover_image`.
- **MUSS NICHT am Medium:** `media`-Spalten `caption`, `visibility_id`, `review_status_id`, `category`, `sort_order` (negativ-Assertion für SC1).
- Struktur (psql-Hashmaps, `-FailOnContractGaps`, DB-Identitätscheck) 1:1 vom v2-Audit übernehmen.

## Runtime State Inventory

Diese Phase ist teils ein Refactor/Removal → Inventar der Nicht-Datei-Zustände:

| Kategorie | Gefunden | Aktion |
|-----------|----------|--------|
| Stored data | `release_media`-Zeilen, `anime.cover_image`-Werte, `public/covers/*`-Dateien | **Keine Migration nötig** — Testdaten werden vor E2E (Phase 110) zurückgesetzt; kein Datenerhalt (DECISION-Kontext). `public/covers/`-Dateireste sind harmlos (Serve-Route entfällt). |
| Live service config | Keine — Medien-Legacy ist kein extern konfiguriertes Service-State (kein n8n/Datadog/Task-Scheduler betroffen). | Keine |
| OS-registered state | Keine — keine geplanten Tasks/pm2/systemd mit Medien-Namen. | Keine |
| Secrets/env vars | `MediaStorageDir`, `MediaPublicBaseURL`, `FFmpegPath` (config.go) — bleiben unverändert, generischer Upload nutzt sie weiter. | Keine |
| Build artifacts | `backend/server.exe`, `backend/server-uat.exe` enthalten kompilierte Legacy-Symbole (grep-Treffer!); `backend/.server-dev.log`, `backend/backend-dev.stdout.log`. Docker-Backend auf :8092 muss nach Abbau **neu gebaut** werden (`docker compose up -d --build team4sv30-backend`), sonst stale Symbole/404. | Backend-Container neu bauen; `*.exe`/Logs sind Artefakte (nicht in grep-SC4 zählen — ggf. aus grep-Scope ausschließen). |

## Common Pitfalls

### Pitfall 1: `media_assets`/`media_files` versehentlich droppen
**Was schiefgeht:** ROADMAP „ersetzen media_assets/media_files" als 106-Aktion misslesen → Drop bricht `anime.cover_asset_id`-FK, `release_version_media`, Junctions, generischen Upload.
**Vermeidung:** `media_assets`/`media_files` bleiben in 106 unangetastet; nur additiv `media`/`media_variant`. Verifikation: `go build` + Contract-Check dürfen `media_assets` weiter vorfinden.
**Frühwarnzeichen:** Migration enthält `DROP TABLE media_assets` → falsch.

### Pitfall 2: Migration 0018 im Glauben an §6 löschen
**Was schiefgeht:** §6 nennt „Migration 0018". Löschen bricht append-only D-01 und macht die Kette nicht-reproduzierbar (0046 dropt via `IF EXISTS` zwar tolerant, aber D-01 verbietet das Anfassen).
**Vermeidung:** 0018 **und** 0046 stehen lassen; episode_version_images ist nach 0046 ohnehin abwesend. Nur Go-Code/Route entfernen.

### Pitfall 3: `cover_image`-DTO-Feld mit `cover_image`-Spalte verwechseln
**Was schiefgeht:** Annahme, Spalten-Drop breche das Frontend → unnötiger großer FE-Umbau in 106 (verletzt D-03).
**Vermeidung:** DTO-Feld ist COALESCE-abgeleitet und bleibt; nur der `cover_image`-COALESCE-Zweig entfällt. FE unberührt außer `/covers/`-Route.

### Pitfall 4: `GetGroupReleaseImages` mit `ListReleaseImages` verwechseln
**Was schiefgeht:** Beide heißen „…ReleaseImages". Der lebende Public-Pfad `GetGroupReleaseImages` (group_contributors_handler) über `release_version_media` wird versehentlich mit-entfernt.
**Vermeidung:** Nur `episodeVersionImagesHandler.ListReleaseImages` + Route `/releases/:id/images` (main.go:448) entfernen. Route `/anime/:id/group/:groupId/releases/:releaseVersionId/images` (main.go:358) bleibt.

### Pitfall 5: `asset_lifecycle_service`-Abbau bricht generischen Upload
**Was schiefgeht:** Der Handler ist mit dem Service verwoben; Entfernen ohne Handler-Umbau → `go build` rot oder Upload zur Laufzeit tot.
**Vermeidung:** Handler-Verdrahtung entkoppeln, V2-Upload muss weiter kompilieren/laufen. Nach jedem Schritt `go build ./...`.

### Pitfall 6: Stale Docker-Backend maskiert Erfolg/Fehler
**Was schiefgeht:** Backend auf :8092 zeigt alte Symbole/Routen bis Rebuild.
**Vermeidung:** Nach Backend-Änderungen `docker compose up -d --build team4sv30-backend`; Kette gegen **leere** DB testen.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework Backend | Go `testing` + `stretchr/testify` |
| Migrations-Test-Muster | `backend/internal/migrations/*_test.go` — liest `../../../database/migrations/NNNN_*.up/.down.sql` und asserted String-Inhalte (Beispiel `release_content_source_groups_test.go`) |
| Framework Frontend | Vitest 3 (nur falls FE-Änderung, hier minimal) |
| Quick run (Backend) | `cd backend && go build ./... && go vet ./...` |
| Migrations-Test | `cd backend && go test ./internal/migrations/...` |
| Ketten-Lauf gegen leere DB | `cmd/migrate` mit frischer DB (`ResolveMigrationsDir` → `database/migrations`) |

### Phase Requirements → Test Map
| Req | Verhalten | Test-Typ | Kommando | Existiert? |
|-----|-----------|----------|----------|-----------|
| SC1 | `media`/`media_variant` angelegt, keine verbotenen Spalten | migration-content | `go test ./internal/migrations/... -run MediaCore` | ❌ Wave 0 |
| SC2 | Legacy-Code weg | build/grep | `go build ./... && go vet ./...` + grep-Suite | ❌ Wave 0 (grep-Skript) |
| SC3 | Kette 1→n grün + Contract-Check | integration | `cmd/migrate up` gegen leere DB + `scripts/media-core-contract-check.ps1` | ❌ Wave 0 |
| SC4 | keine Rest-Referenzen | grep | grep-Suite über entfernte Symbole/Routen | ❌ Wave 0 |

### Sampling Rate
- **Per Task:** `go build ./... && go vet ./...` nach jedem Abbau-/DDL-Schritt.
- **Per Wave:** `go test ./internal/migrations/...` + `cmd/migrate up/down`-Roundtrip.
- **Phase Gate:** Vollständige Kette gegen leere DB + Contract-Check grün + grep-Suite leer, vor `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `backend/internal/migrations/media_core_schema_test.go` — asserted 0131 UP enthält `CREATE TABLE media`, `content_hash`, alle CHECK-Constraints, `media_variant … ON DELETE CASCADE`, `DROP TABLE IF EXISTS release_media`, `DROP COLUMN IF EXISTS cover_image`; UP enthält **NICHT** `caption`/`visibility`/`review_status` an `media`; DOWN rekonstruiert `cover_image`+`release_media`.
- [ ] `scripts/media-core-contract-check.ps1` — Legacy-Freiheits-Assertion (SC3), analog `schema-v2-audit.ps1`.
- [ ] grep-Suite (Skript oder verifikations-Kommandoliste) für SC4 — deckt: `cover_image` (Spalte, nicht DTO), `upload-cover`, `migrate-covers`, `SupportsLegacyUploadSchema`, `useLegacyUploadSchema`, `asset_lifecycle`, `episode_version_image`, `release_media`, `/covers/`. **`*.exe`/`*.log`/`*.md`-Doku aus Scope ausschließen.**

## Security Domain

Schema-/Abbau-Phase ohne neue Auth-/Input-Flächen.

| ASVS-Kategorie | Trifft zu | Standard-Control |
|----------------|-----------|------------------|
| V5 Input Validation | nein (kein neuer Endpunkt in 106) | — |
| V6 Cryptography | strukturell (`content_hash` Spalte SHA-256, Berechnung erst Phase 107) | keine Hand-Roll-Krypto; Spalte nur additiv |

**Wichtiger Abgrenzungshinweis:** Die im Architekturentscheid §3 genannten ungeschützten Endpunkte `POST /admin/upload` und `DELETE /admin/media/:id` (heute ohne Capability/Admin-Check) werden **erst in Phase 108** abgesichert — **NICHT in 106**. 106 darf ihr Auth-Verhalten nicht ändern (reines Schema/Abbau). Der generische Upload bleibt in 106 funktional wie bisher.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `media_assets`/`media_files` werden in 106 NICHT gedroppt (ROADMAP „ersetzen" = Endziel des Arbeitspakets) | Summary / Zielschema | Hoch — Fehlinterpretation bricht gesamte Medienfläche. Verifiziert über §6-Liste (media_assets NICHT gelistet) + aktive Referenzen. Planner sollte in discuss-phase bestätigen lassen. |
| A2 | `owner_user_id → users(id)`, `owner_member_id → members(id)` mit `ON DELETE SET NULL` | Zielschema | Mittel — FK-Ziele bestätigt (Tabellen existieren), aber Delete-Verhalten (`SET NULL` vs `RESTRICT`) ist Planner-/PO-Ermessen. |
| A3 | `models/media_upload.go` wird abgespeckt (V2-Felder behalten), nicht ganz gelöscht | Legacy-Inventar B | Mittel — Handler braucht weiter ein DTO; §6 „Upload-DTOs entfernen" ist bzgl. Umfang unscharf. Siehe Open Question 1. |
| A4 | Migrationen 0018/0046 bleiben unter D-01 stehen (statt §6-Wortlaut „Migration 0018 entfernen") | Legacy-Inventar C / Pitfall 2 | Mittel — D-01 (neuer, gelockt) überstimmt §6-Wortlaut. Planner sollte diese Auslegung explizit fixieren. |

## Open Questions

1. **Umfang `models/media_upload.go`-Abbau.**
   - Bekannt: V2-Upload-Pfad braucht weiter Request/Response-DTOs (`MediaType`, `FilePath`, `Format`, `MimeType`, `UploadedBy`). Die Legacy-Felder (`ID string`, `EntityType`, `EntityID`, `AssetType`) stammen aus der dead-001-Form.
   - Unklar: Ob §6 „Upload-DTOs entfernen" = ganze Datei oder nur Legacy-Felder.
   - Empfehlung: Nur Legacy-Felder/UUID-`ID string`-Coercion entfernen; DTO für lebenden V2-Upload behalten. Planner-Entscheid im Plan dokumentieren.

2. **`media_assets`/`media_files`-Drop-Zeitpunkt.**
   - Bekannt: Nicht in 106. Wahrscheinlich Phase 110 (Reset) nachdem 107/108 alle Referenzen auf `media`/Relationen umgestellt haben.
   - Unklar: Ob 108 oder 110 den physischen Drop trägt.
   - Empfehlung: In 106 als „bleibt" dokumentieren, Drop-Ownership dem 108/110-Plan überlassen.

3. **Migration 0131 einteilig vs. zweiteilig.**
   - Bekannt: 0131 und 0132 sind beide frei.
   - Empfehlung: Einteilig `0131_media_core_schema` (Anlegen + Abbau, gemeinsame `.down.sql`) — atomarer, weniger Ketten-Zeilen. Planner-Ermessen.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| PostgreSQL | Migration/Contract-Check | ✓ (Docker `team4sv30-db`) | 16 | — |
| Docker Compose | Backend-Rebuild + psql-Audit | ✓ | — | — |
| Go toolchain | `go build`/`go vet`/migrations-test | ✓ | 1.25 | — |
| PowerShell | Contract-/grep-Skripte | ✓ (Windows-Host) | — | Bash-Analog möglich |
| `cmd/migrate` | Kette gegen leere DB | ✓ (Projekt-CLI) | — | — |

**Blocker:** keine.

## Sources

### Primary (HIGH confidence — direkt am Code verifiziert)
- `database/migrations/` (0001, 0016, 0018, 0024, 0025, 0026, 0040, 0046, 0129, 0130) — Schema-Wahrheit, Nummern, Enum-Muster.
- `backend/database/migrations/001_create_media_tables.*` + `README.md` — dead Parallelschema.
- `backend/internal/migrations/runner.go` (`ResolveMigrationsDir`) — nur `database/migrations` ausgeführt.
- `backend/internal/repository/media_upload.go`, `handlers/media_upload_v2_compat.go`, `models/media_upload.go` — Dualpfad/DTOs.
- `backend/internal/repository/anime_v2.go` (`animeCoverImageSelectSQL`), `anime_assets.go`, `anime_schema.go` — cover_image-Ableitung.
- `backend/cmd/server/main.go` (:88, :358, :448), `admin_routes.go` (:108) — Wiring/Routen.
- `frontend/src/app/covers/[file]/route.ts`, `frontend/src/app/api/admin/upload-cover/route.ts`, `frontend/src/lib/api.ts` (:5936) — FE-Cover-Fläche.
- `scripts/schema-v2-audit.ps1` + `schema-v2-contract-check.ps1` — Contract-Check-Vorlage.
- `.planning/phases/106-…/106-CONTEXT.md`, `.planning/notes/260721-medienmodell-neubau-architektur-DECISION.md`, `.planning/ROADMAP.md` — Entscheide/SC.
- `.planning/config.json` — `nyquist_validation: true`.

### Secondary / Tertiary
- Keine — keine externen Quellen benötigt (rein interne Codebasis).

## Metadata

**Confidence breakdown:**
- Migrationsnummern/Zielschema: HIGH — direkt verifiziert, keine Kollision.
- Legacy-Inventar/Call-Sites: HIGH — jede Datei per grep + Lesen bestätigt; einzige Restunschärfe ist der DTO-Umfang (Open Question 1).
- Boundary `media_assets` bleibt: HIGH — durch aktive FK-Referenzen belegt (A1).
- Contract-Check-Erweiterung: HIGH — Vorlage gelesen, Anpassungsbedarf konkret.

**Research date:** 2026-07-21
**Valid until:** stabil (interne Codebasis; nur bei parallelen Medien-Migrationen auf `main` erneut prüfen — vor 0131-Vergabe `ls database/migrations/ | tail` gegenprüfen)
