# Medienmodell-Neubau — Verbindlicher Architekturentscheid (LOCKED)

**Datum:** 2026-07-21
**Status:** LOCKED — Grundlage für Milestone „Medienmodell-Neubau" (Phasen 106–110)
**Kontext:** Testdaten werden vor der E2E-Testphase zurückgesetzt → keine Datenmigration, keine Rückwärtskompatibilität nötig. Aufwand: grundlegend (eigener Milestone).

Dieser Entscheid ersetzt den polymorphen `media_usage`-Vorschlag der vorangegangenen Deep-Analyse.

---

## 1. Zielmodell (drei Ebenen)

**Leitprinzip:** Globale Dateieigenschaften gehören ans zentrale Medium, verwendungsspezifische Metadaten an die jeweilige Relation.

### Ebene 1 — `media` (globales physisches Medium, 1 Zeile pro Datei)
`id, kind(image/video/audio), storage_key (hash-basiert), original_filename, mime_type, byte_size, width, height, duration_seconds, content_hash (sha256), source(enum upload/jellyfin/anilist/mal/…), source_ref, credit, rights_note, owner_user_id→users, owner_member_id→members, processing_status(processing/ready/failed), created_at`

- **NEU** gegenüber heute: `content_hash`, `credit`/`rights_note`, `source/source_ref` konsolidiert.
- **Verboten** an dieser Ebene: `caption`, `visibility`, `review_status`, `category`, `sort_order` (alles verwendungsspezifisch).

### Ebene 2 — `media_variant` (technische Ableitungen, ersetzt `media_files`)
`id, media_id→media (ON DELETE CASCADE), variant(original/thumbnail/preview), storage_key, width, height, byte_size, mime_type, status(ready/missing/failed)`

### Ebene 3a — Verwendungsrelationen (**Variante B**: getrennte Tabellen, gemeinsamer Contract)
`fansub_group_media`, `release_version_media`, `member_story_media`, `anime_background_media`, `release_theme_media`

Gemeinsamer Feld-Contract je Tabelle:
`id, media_id→media (FK), <parent>_id→<entity> (FK, ON DELETE CASCADE), slot, title, description, alt_text, sort_order, visibility, review_status, reviewed_at, reviewed_by, is_preview, historical_context, event_date, added_by_user_id, created_at, updated_at, deleted_at, deleted_by`

- Vereinheitlichung passiert im **Code** (geteiltes Go-DTO/Repository-Mixin), Integrität in der **DB** (echte FKs + Cascade + Soft-Delete).
- `is_preview=true` nur für `screenshot`/`typesetting_karaoke` (bestehende Regel bewahrt).

### Ebene 3b — Singuläre Kernmedien (**Variante 2 Hybrid**: direkte FK-Slots)
`anime.cover_media_id`, `anime.banner_media_id`, `anime.background_video_media_id`, `fansub_groups.logo_media_id`, `fansub_groups.banner_media_id`, `members.avatar_media_id`, `members.background_media_id`

- 1:1-Identitäts-/Branding-Medien → direkter FK, **ohne** `visibility`/`review_status` (sofort effektiv `approved`, PO-Entscheid 2).
- Trennlinie: **1:1-Identität → FK; 0..n kuratiert/reviewpflichtig → Relationstabelle.**

### Ebene 0 — Technischer Kern (relationsunabhängig)
Ein `MediaFileService` kapselt: SHA-256-Hash, hash-basierter `storage_key`, MIME/Magic-Byte, Größen-/Dimensions-/Dekompressionsbomben-Guard, Thumbnail/Preview, Audit, technische Metadaten, einheitliche Fehlerbehandlung. Darüber dünne Kontext-Fachservices (`AnimeMediaService`, `FansubGroupMediaService`, `ReleaseVersionMediaService`, `MemberProfileMediaService`), die nur Kontext/Slot + Permission setzen. **Upload-Vereinheitlichung ist entkoppelt vom Relationsmodell.**

---

## 2. Warum Variante B + 2 (Belege aus dem Code)

- **Permissions sind pro Kontext echt verschieden:** `CanForReleaseVersion` (permissions.go:416–480) ist ein eigener 3-Stufen-Pfad (Multi-Gruppen-Auflösung + Contribution-Rollen `ListActorContributionRolesForVersion`), fundamental anders als `CanForFansubGroup` (permissions.go:389). Ein generisches `media.upload` spart diese Divergenz nicht ein.
- **Die einzige kontextübergreifende Abfrage** (`GetMediaOwnershipProjection`, media_ownership_projection_repository.go:43–140) ist bereits ein `UNION ALL` über vier getrennte Relationstabellen → getrennte Tabellen brauchen keine polymorphe Tabelle.
- **Integrität zählt für Gamification:** echte FKs + Cascade verhindern verwaiste Verwendungen strukturell; ein polymorphes `context_type/context_id` könnte die Existenz des Ziels nicht per FK garantieren und bräuchte Cleanup-Jobs.
- **Hot-Path-Performance:** Cover/Avatar/Logo werden auf Listen-/Profilseiten massenhaft gerendert → ein FK-Join statt Usage-Filter.

---

## 3. Berechtigungen & Capabilities

- Kontextspezifische Namespaces **bleiben**: `fansub_group_media.*`, `release_version_media.*` (Seeds 0108/0109).
- **NEU:** eigene Action-Keys `*.reorder` und `*.review` je Kontext.
- **Lücken schließen (unabhängig vom Modell):** `POST /admin/upload` und `DELETE /admin/media/:id` haben heute **keine** Capability/Admin-Prüfung → absichern.
- Kein generisches `media.*` — Ownership-Auflösung ist kontextspezifisch und darf nicht in einem generischen Service verschwimmen.

---

## 4. Gamification-Grundlage (nur strukturell, keine Punkteformel)

- **Uploader-Credit:** `media.owner_user_id` (global). Dedup an `media.id` → **Mehrfachverwendung zählt nur einmal** (PO-Entscheid 1).
- **Kontext-Beitrag:** `<relation>.added_by_user_id` (pro Verwendung).
- **Bestätigung:** `<relation>.review_status/reviewed_at/reviewed_by` (pro Verwendung; Kontexte können unterschiedlich freigegeben sein).
- **Metadatenqualität** (Titel/Beschreibung/Alt/Datum): pro Verwendung; Credit/Quelle: global am Medium.
- Beispiel „gleiches Bild in Gruppen- und Release-Galerie": ein `media`, zwei Relationszeilen, Credit einmal.

---

## 5. PO-Entscheide (verbindlich)

1. **Mehrfachverwendung zählt nur einmal** (Dedup an `media.id`/`owner_user_id`).
2. **Kernmedien (Cover/Logo/Banner/Avatar/Hintergrund) ohne Freigabe** — sofort `approved`, keine Review-/Visibility-Felder an den FK-Slots.
3. **Credit/Rechtehinweis überall optional** (`credit`/`rights_note` nullable, keine Upload-Validierung).

---

## 6. Legacy ersatzlos entfernen

- Totes UUID-Parallelschema `backend/database/migrations/001_create_media_tables.*` + `models/media_upload.go`-Upload-DTOs.
- `episode_version_images`-Strecke: Migration 0018, Repo-Stub `episode_version_image_repository.go`, `models/episode_version_image.go`, Handler + Route `/releases/:id/images`, Frontend `ScreenshotGallery.tsx` + `screenshotImage.ts`.
- `release_media`-Junction (nur Cascade-genutzt).
- Legacy-Upload-Dualpfad (`SupportsLegacyUploadSchema`/`useLegacyUploadSchema`, `media_upload_v2_compat.go`).
- `anime.cover_image`-String + `/covers/[file]/route.ts` + `/api/admin/upload-cover` + `cmd/migrate-covers` + `report-/remediate-cover-image.ps1`.
- `asset_lifecycle_service.go` (Ordnerprovisionierung) — durch hash-basierte Ablage überflüssig.
- Doppelte `GroupAssets`-Typen (`types/group.ts` **und** `types/groupAsset.ts`).
- Tote Admin-Upload-Komponenten (`AnimePatchForm.tsx`, `AnimeJellyfinAssetUploadControls.tsx`).

---

## 7. Bleibt unberührt

Jellyfin/Provider-Assets (`anime_backdrops`, `group_assets`, `asset-proxy`, `media_proxy`), Playback-/Segment-Streams, `theme_segment_render_cache`, Crop-/UI-Infra, deren Tests.

---

## 8. Konventionen für die Umsetzung

- `caption` wird ersatzlos gestrichen; `title/description/alt_text` ist der einheitliche Textsatz; `alt_text` für alle Bilder.
- Frontend: ausschließlich `@/components/ui`-Primitives; bestehende native `<input>/<checkbox>/<button>`-Verstöße in Medien-Formularen mitbereinigen.
- Deutscher UI-Text mit korrekten Umlauten (CLAUDE.md).
- Dateien ≤ 450 Zeilen (CLAUDE.md).
- Migrations-Grundsatzfrage (offen, in plan-phase zu entscheiden): append-only Kette (neu anlegen + droppen) vs. Konsolidierung der Alt-Migrationen im leeren Zustand. Da keine Daten erhalten werden müssen, ist Konsolidierung sauberer, aber aufwändiger.
