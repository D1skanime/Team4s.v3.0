# Phase 34: Release-Version Media — Schema Foundation — Context

**Gathered:** 2026-05-07
**Status:** Ready for planning
**Source:** User discussion + codebase analysis

<domain>
## Phase Boundary

Diese Phase legt ausschliesslich die Datenbankgrundlage. Kein Backend-Code, kein Frontend. Nur Migrationen.

Liefert:
- Neue Tabelle `release_version_media` mit allen Constraints und Indexen
- `status`-Feld in `media_assets` (DEFAULT 'ready')
- `status`-Feld in `media_files` (DEFAULT 'ready')

</domain>

<decisions>
## Implementation Decisions

### Neue Tabelle: release_version_media
- Neue Tabelle, keine Erweiterung von `release_media` (release_media hat nur release_id, kein release_version_id — nicht erweiterbar ohne Breaking Change)
- Pflichtfelder: id, release_version_id (FK release_versions.id), media_asset_id (FK media_assets.id), category, created_at
- Optionale Felder: caption (TEXT NULL), sort_order (INT NOT NULL DEFAULT 0), is_preview_candidate (BOOLEAN NOT NULL DEFAULT false), uploaded_by_user_id (BIGINT NULL FK users.id), updated_at, deleted_at (NULL = aktiv), deleted_by_user_id (BIGINT NULL)
- Kein `uploaded_by_member_id` in Phase 34 — kann später nachgerüstet werden

### Kategorie-Werte (CHECK CONSTRAINT oder ENUM)
Exakt diese 4 Werte, keine weiteren:
- `screenshot` — Release-Screenshot
- `typesetting_karaoke` — Typesetting-/Karaoke-Beispiel
- `fun_outtake` — Spaßbild / Outtake
- `other` — Sonstiges

DB-seitig als CHECK CONSTRAINT: `category IN ('screenshot','typesetting_karaoke','fun_outtake','other')`

### Preview-Regel (DB-seitig)
- `is_preview_candidate` darf nur TRUE sein bei category = 'screenshot' oder 'typesetting_karaoke'
- CHECK CONSTRAINT: `(is_preview_candidate = false OR category IN ('screenshot','typesetting_karaoke'))`
- Maximal ein aktives Vorschaubild pro release_version_id — wird in Phase 35 (Backend) transaktionssicher erzwungen, kein DB-UNIQUE auf is_preview_candidate (zu restriktiv bei soft-delete)

### Soft Delete
- `deleted_at TIMESTAMPTZ NULL` — NULL = aktiv, gesetzt = gelöscht
- `deleted_by_user_id BIGINT NULL FK users.id`
- Kein physisches Löschen in dieser Phase — wird in Phase 37 (Cleanup) gemacht

### sort_order
- Pro release_version_id und category
- Default 0; Backend (Phase 35) vergibt finale Werte in Schritten von 10

### status-Felder in bestehenden Tabellen
- `media_assets.status VARCHAR(20) NOT NULL DEFAULT 'ready'`
- `media_files.status VARCHAR(20) NOT NULL DEFAULT 'ready'`
- Alle bestehenden Einträge bekommen automatisch DEFAULT 'ready' — kein Backfill nötig
- Gültige Werte für media_assets: processing, ready, failed, deleted
- Gültige Werte für media_files: processing, ready, failed, missing, deleted
- CHECK CONSTRAINTs für beide Felder

### Indexe
- `idx_rvm_release_version` ON release_version_media(release_version_id)
- `idx_rvm_media_asset` ON release_version_media(media_asset_id)
- `idx_rvm_category` ON release_version_media(category)
- `idx_rvm_public` ON release_version_media(release_version_id, category) WHERE deleted_at IS NULL
- `idx_media_assets_status` ON media_assets(status)
- `idx_media_files_status` ON media_files(status)

### Migration-Nummerierung
- Letzte Migration war 0058 (Kara-Rename)
- Neue Migration: 0059_release_version_media_schema.up.sql + .down.sql
- Down-Migration muss alle Änderungen sauber zurücksetzen (DROP TABLE, DROP COLUMN)

### Claude's Discretion
- Migrationsdatei-Struktur: `database/migrations/` (gleicher Ort wie alle anderen)
- Constraint-Naming: prefixed mit `chk_rvm_*`, `fk_rvm_*`
- Index-Naming: `idx_rvm_*`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bestehende Migrations-Struktur
- `database/migrations/0058_rename_theme_types_kara.up.sql` — Beispiel für Migrations-Format und Stil
- `database/migrations/0026_add_media_tables.up.sql` — release_media, media_files, media_assets Definitionen (zum Vergleich)
- `database/migrations/0035_add_release_tables.up.sql` — release_versions Tabellen-Definition (für FK-Referenz)

### Fachliche Domäne
- `docs/architecture/db-schema-fansub-domain.md` — Fansub-Domain-Regeln, release_versions Kontext

</canonical_refs>

<specifics>
## Specific Ideas

- Migration 0059 kommt nach 0058 (Kara-Rename vom 2026-05-07)
- release_versions.id ist der FK-Anker für release_version_id
- Alle anderen media_*-Tabellen haben KEIN status-Feld — diese Phase führt es ein
- Public-Abfragen in Phase 35/36 müssen: `status = 'ready' AND deleted_at IS NULL`

</specifics>

<deferred>
## Deferred Ideas

- uploaded_by_member_id (Fansub-Member statt User) — nicht in Phase 34, kann nachgerüstet werden
- Unique Partial Index für maximal ein Preview pro release_version — Backend-seitige Transaktionslogik in Phase 35 ist einfacher als DB-Constraint
- medium-Variante, WebP/AVIF-Konvertierung — spätere Phase
- Quotas pro Nutzer/Gruppe — spätere Phase

</deferred>

---

*Phase: 34-release-version-media-schema-foundation*
*Context gathered: 2026-05-07 via User Discussion*
