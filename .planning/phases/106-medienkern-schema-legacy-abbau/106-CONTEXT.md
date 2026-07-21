# Phase 106: Medienkern-Schema & Legacy-Abbau - Context

**Gathered:** 2026-07-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Reines Schema-/Legacy-Fundament des Arbeitspakets „Medienmodell-Neubau" (Phasen 106–110). Zwei neue Tabellen — `media` (globales physisches Medium) und `media_variant` (technische Ableitungen) — werden **additiv** angelegt; sie sind das langfristige Zielmodell, das `media_assets`/`media_files` über das gesamte Arbeitspaket 106–110 ersetzt. **Korrektur nach Research (106-RESEARCH.md, Grenzbefund A1):** `media_assets`/`media_files` werden in Phase 106 **NICHT** gedroppt — sie bleiben aktiv referenziert (`anime.cover_asset_id`, `release_version_media.media_asset_id`, generischer V2-Upload, `anime_media`/`episode_media`-Junctions, `release_theme_assets`); ihr Drop erfolgt erst in Phase 108/110. Entfernt werden in 106 ausschließlich die toten/uneinheitlichen Legacy-Strukturen der §6-Liste (siehe D-04) — `media_assets`/`media_files` stehen NICHT auf dieser Liste. Danach läuft die Migrationskette 1→n auf leerer DB konsistent durch.

**Explizit NICHT in dieser Phase:** kein Verhaltensumbau an Upload oder Frontend (Upload-Vereinheitlichung = Phase 107, Relationstabellen/FK-Slots/Permissions = Phase 108, Frontend-Umstellung = Phase 109, Reset/Seeds/E2E = Phase 110). Testdaten werden vor der E2E-Phase zurückgesetzt → **keine Datenmigration, keine Rückwärtskompatibilität**.

</domain>

<decisions>
## Implementation Decisions

### Migrationsstrategie
- **D-01:** **Append-only Kette.** Neue Migration(en) ab Nummer **0131** (aktuell bis `database/migrations/0130`) legen `media` + `media_variant` an und entfernen Legacy-Strukturen per `DROP TABLE`/`DROP COLUMN`. Bestehende Altmigrationen bleiben unberührt (keine Konsolidierung/Umschreibung des leeren Zustands). Konsistent mit der etablierten Kette, minimales Risiko, saubere `.down.sql` möglich.
- **D-02:** Migrationsnummern vor Vergabe prüfen — im Projekt gab es Nummern-Kollisionen (z.B. 0090 durch Phase 70 belegt → Phase 67 wich auf 0091 aus). Nächste freie Nummer(n) ab 0131 verifizieren, nicht blind annehmen.

### Legacy-Abbau-Grenze (Backend vs. Frontend)
- **D-03:** **Nur build-breaking Frontend anfassen.** Phase 106 bereinigt ausschließlich die FE-Teile, die sonst auf entfernte Backend-Routen/Symbole zeigen und `go build`/`npm run typecheck`/Build brechen würden — insbesondere die in Roadmap-SC2 für 106 gelistete `/covers/[file]/route.ts`. Restliche FE-Politur (`ScreenshotGallery.tsx`-Ersatz, `screenshotImage.ts`, doppelte `GroupAssets`-Typen, tote Admin-Upload-Komponenten `AnimePatchForm.tsx`/`AnimeJellyfinAssetUploadControls.tsx`) bleibt bewusst **Phase 109** (siehe Phase-109-SC4). Hält 106 als reines Schema-/Legacy-Fundament.
- **D-04:** Backend-Legacy-Abbau ist voll in 106 (Liste siehe §6 des Architekturentscheids, unten unter Canonical Refs zitiert): totes UUID-Schema `backend/database/migrations/001_create_media_tables.*` + `models/media_upload.go`-Upload-DTOs; `episode_version_images`-Strecke (Migration 0018, Repo-Stub, Model, Handler, Route `/releases/:id/images`); `release_media`-Junction; `anime.cover_image`-String + `/api/admin/upload-cover` + `cmd/migrate-covers` + `report-/remediate-cover-image.ps1`; `asset_lifecycle_service.go`; Dual-Upload-Legacy (`SupportsLegacyUploadSchema`/`useLegacyUploadSchema`, `media_upload_v2_compat.go`).

### content_hash & Dedup-Zeitpunkt
- **D-05:** **`content_hash` als nullable Spalte OHNE UNIQUE-Constraint in 106.** Kein `UNIQUE`/Partial-Unique in dieser Phase. Das Dedup-Verhalten (SHA-256-Berechnung, „Mehrfachverwendung zählt nur einmal" per Dedup an `media.id`, PO-Entscheid 1) wird erst mit dem `MediaFileService` in **Phase 107** wirksam. Wahrt die Phasengrenze „reines Schema, keine Verhaltensänderung". Ein non-unique Index auf `content_hash` ist optional (Planner-Ermessen), sofern rein struktureller Vorgriff.

### Enum-Repräsentation
- **D-06:** **TEXT + CHECK-Constraint** für alle Aufzählungsfelder (`media.kind` image/video/audio, `media.source` upload/jellyfin/anilist/mal/…, `media.processing_status` processing/ready/failed, `media_variant.variant` original/thumbnail/preview, `media_variant.status` ready/missing/failed). Folgt der dominanten Projektkonvention (≈50 Migrationsdateien nutzen TEXT+CHECK, nur 2 nutzen native `CREATE TYPE`). Additive Werterweiterung per Migration bleibt einfach.

### Claude's Discretion
- Contract-Check-Umfang: `scripts/schema-v2-contract-check.ps1` erweitern **oder** ein analoges Skript neu anlegen (SC3 verlangt nur „analog"). Planner-Ermessen; Kern-Assertion: keine Legacy-Medientabelle/-spalte/-route existiert mehr nach 106.
- Exakte Reihenfolge der DROP-Operationen und `.down.sql`-Rückbau innerhalb der Append-only-Migration.
- Ob/welcher non-unique Index auf `content_hash` gesetzt wird (D-05).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Verbindlicher Architekturentscheid (LOCKED)
- `.planning/notes/260721-medienmodell-neubau-architektur-DECISION.md` — Gesamtentscheid des Arbeitspakets. Für Phase 106 relevant:
  - **§1 Ebene 1 (`media`)** — exakter Spaltensatz: `id, kind, storage_key, original_filename, mime_type, byte_size, width, height, duration_seconds, content_hash, source, source_ref, credit, rights_note, owner_user_id→users, owner_member_id→members, processing_status, created_at`. **Verboten am Medium:** `caption`, `visibility`, `review_status`, `category`, `sort_order`.
  - **§1 Ebene 2 (`media_variant`)** — `id, media_id→media (ON DELETE CASCADE), variant, storage_key, width, height, byte_size, mime_type, status`.
  - **§6 Legacy ersatzlos entfernen** — vollständige Abbau-Liste (Backend voll in 106, FE-Teile teils in 109 gemäß D-03).
  - **§8 Konventionen** — `caption` gestrichen; Dateien ≤ 450 Zeilen; Migrations-Grundsatzfrage (durch D-01 entschieden: append-only).

### Roadmap / Requirements
- `.planning/ROADMAP.md` → „Phase 106: Medienkern-Schema & Legacy-Abbau" — Goal + 4 Success Criteria (Tabellen existieren; Legacy ersatzlos weg; Kette 1→n auf leerer DB + Contract-Check; `go build`/`go vet` grün + grep sauber). Außerdem die Folgephasen 107–110 als Abgrenzungskontext.
- `.planning/ROADMAP.md` → Arbeitspaket-Vorspann (Zeile 2380) — Reihenfolge 106→107→108→109→110, Testdaten-Reset, kein Milestone/STATE-Reset.

### Bestehende Infrastruktur zum Referenzieren
- `scripts/schema-v2-contract-check.ps1` — Vorlage für den in SC3 geforderten „analogen" Schema-Contract-Check (Legacy-Freiheit belegen).
- `database/migrations/` — append-only Konventionsbeispiele (`NNNN_name.up.sql`/`.down.sql`, aktuell bis 0130); TEXT+CHECK-Muster als Enum-Referenz.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/schema-v2-contract-check.ps1`: existiert bereits — Basis für den SC3-Contract-Check (erweitern oder analog neu).
- Migrations-Konvention `database/migrations/NNNN_name.up/.down.sql`: aktuell bis 0130; neue Medien-Migration ab 0131.
- TEXT+CHECK-Enum-Muster: in ≈50 Migrationen etabliert (D-06 folgt dem).

### Established Patterns
- Append-only Migrationskette mit vollständigen `.down.sql` (D-01).
- Go: kleine Pakete, explizite Konstruktoren, Repository-Split je Domain (CLAUDE.md/CONVENTIONS.md) — bleibt für neue `media`-Repos relevant, auch wenn 106 primär Schema/Abbau ist.
- 450-Zeilen-Datei-Limit gilt weiterhin.

### Integration Points
- Zu entfernende Backend-Symbole/-Routen (Abbau-Liste D-04) — Planner muss per grep alle Referenzen finden (SC4).
- `anime.cover_image` + `/covers/`-Serving: Übergang; die FE-`/covers/`-Route fällt in 106 (D-03), da build-breaking; die neuen FK-Slots (`anime.cover_media_id` etc.) entstehen erst in Phase 108 — 106 legt nur `media`/`media_variant` an, verdrahtet noch keine Kernmedien-FKs.

### Blindspot / Guardrail
- Backend läuft als Docker-Container auf :8092 — neue Routen/Schema erscheinen erst nach `docker compose up -d --build team4sv30-backend`; stale Backend führt zu API-404 trotz korrektem Code. Für 106 vor allem: Migrationskette gegen leere DB testen.

</code_context>

<specifics>
## Specific Ideas

Alle vier diskutierten Gray Areas wurden zugunsten der jeweils empfohlenen, konventionstreuen Option entschieden (append-only, nur build-breaking FE, kein UNIQUE, TEXT+CHECK). Kein individueller „ich will es wie X"-Wunsch darüber hinaus — der Architekturentscheid ist die maßgebliche Vorlage.

</specifics>

<deferred>
## Deferred Ideas

- **Voller Frontend-Legacy-Abbau** (`ScreenshotGallery.tsx`-Ersatz, `screenshotImage.ts`, doppelte `GroupAssets`-Typen in `types/group.ts`/`types/groupAsset.ts`, tote Admin-Upload-Komponenten) → **Phase 109** (Frontend-Umstellung, SC4). In 106 nur so weit, wie zur Build-Grünhaltung nötig (D-03).
- **UNIQUE(content_hash) / Dedup-Logik** → **Phase 107** (`MediaFileService`, Hash-Berechnung, „Mehrfachverwendung zählt einmal").
- **Verwendungsrelationstabellen + Kernmedien-FK-Slots + Permissions** → **Phase 108**.
- **Reset-/Seed-Skripte, TSV-Cover-Zuordnung, E2E-Gate** → **Phase 110**.

### Reviewed Todos (not folded)
- `todo.match-phase 106` lieferte ausschließlich UI-Politur-Todos (Profile-Hub-Redesign, Contribution-/Credits-UI auf Primitives, Member-Profil-Politur). Alle sind Keyword-Fehlalarme (`frontend`/`admin`) und thematisch fremd zu einer reinen Schema-/Legacy-Phase — bewusst **nicht** gefoldet.

</deferred>

---

*Phase: 106-medienkern-schema-legacy-abbau*
*Context gathered: 2026-07-21*
