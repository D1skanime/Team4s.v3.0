---
phase: 106
slug: medienkern-schema-legacy-abbau
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-21
updated: 2026-07-22
---

# Phase 106 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

**Revision 2026-07-21 (PO-Entscheid „Option A" / CONTEXT.md D-07):** `release_media` wird in Phase 106 nicht angefasst (Entfernung → Phase 108, ROADMAP 108-SC 3b). Dadurch ist der frühere `checkpoint:decision` (106-05-01) entfallen, 106-04 und 106-05 sind im Umfang reduziert und wieder vollständig autonom.

**Revision 2026-07-22 (Plan-Checker-Blocker + 4 Warnings, PO-Entscheid `anime.cover_image`):** `anime.cover_image` bleibt — anders als `release_media` — im Abbau-Scope von Phase 106, weil ein produktiv erprobter Drop-in-Ersatz bereits existiert (`animeCoverImageSelectSQL`: COALESCE über `cover_resolved_url` / poster-`file_path` / Jellyfin-URL) und die Umstellung damit eine mechanische, verhaltenserhaltende Substitution ohne offene Designfrage ist. Genau dieser fertige Ersatz fehlte `release_media` (dort zusätzlich Datenparitäts-Entscheid nötig) → deshalb dort Verschiebung, hier Entfernung.

Daraus folgen zwei neue Pläne und vier Plan-Korrekturen:

| Änderung | Inhalt |
|----------|--------|
| **NEU 106-09** | Schließt den BLOCKER: acht live gelesene `anime.cover_image`-Rohspalten-Sites auf die kanonische COALESCE-Expression umgestellt (inkl. GROUP-BY-Fall im Member-Profil). |
| **NEU 106-10** | Entfernt die durch den Drop dauerhaft defekten `HasSlug`/`useV2Schema`-Legacy-Zweige + zieht die Test-Assertionen. |
| 106-02 (Warning 2) | SC4-grep sucht `cover_image` jetzt aktiv über SQL-Spalten-Signaturen statt den Term auszuschließen (der Ausschluss hatte den Blocker maskiert). |
| 106-05 (Warning 4) | `runtime_authority_test.go` aus `files_modified` entfernt (Task 2 ist reiner Regressionsnachweis); `anime_test.go` als tatsächlich betroffene Testdatei ergänzt. |
| 106-06 (Warning 3) | asset_lifecycle-Entkopplung ausspezifiziert: benannte `media_upload.*`-Fehlercodes, lokaler Fehlertyp, kanonische Speicherpfad-Formel, OpenAPI-Contract nachgezogen. |
| 106-08 (Warning 5) | Migrationsdatei per Glob `*_media_core_schema.up.sql` mit Existenzprüfung statt hartkodiertem `0131_*` (FALSE-PASS-Muster beseitigt); Live-Verifikation der vier öffentlichen Cover-Oberflächen ergänzt. |

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go `testing` + `stretchr/testify` (Backend); Vitest 3 / `npm run typecheck` (Frontend, hier minimal) |
| **Config file** | none — Go-Toolchain vorhanden; Migrations-Test-Muster `backend/internal/migrations/*_test.go` |
| **Quick run command** | `cd backend && go build ./... && go vet ./...` |
| **Full suite command** | `cd backend && go test ./internal/migrations/... ./internal/repository/... ./internal/handlers/...` + Ketten-Lauf `cmd/migrate up` gegen leere DB |
| **Estimated runtime** | ~30–60 Sekunden (build/vet); Ketten-Lauf zusätzlich ~10–20s |

---

## Sampling Rate

- **After every task commit:** `cd backend && go build ./... && go vet ./...`
- **After every plan wave:** `cd backend && go test ./internal/migrations/... ./internal/repository/... ./internal/handlers/...` + `cmd/migrate up/down`-Roundtrip
- **Ab Welle 3 zusätzlich:** `grep -rnE "a\.cover_image|,[[:space:]]*cover_image|cover_image[[:space:]]*=|SET cover_image" backend/internal backend/cmd --include=*.go | grep -v 'json:' | grep -v 'applyString'` — muss am Ende von Welle 4 leer sein
- **Before `/gsd:verify-work`:** Vollständige Kette 1→n gegen leere DB grün + `scripts/media-core-contract-check.ps1 -FailOnContractGaps` grün + grep-Suite (SC4) `scripts/media-core-legacy-grep.ps1` exit 0
- **Max feedback latency:** 60 Sekunden

---

## Wave Graph (nach Revision 2026-07-22)

| Wave | Plans | Begründung der Kante |
|------|-------|----------------------|
| 1 | 106-01, 106-02 | Wave-0-Artefakte (Migration + Content-Test, Gate-Skripte); keine Abhängigkeit |
| 2 | 106-03, 106-04, 106-05, 106-07 | benötigen 106-01; untereinander keine `files_modified`-Überschneidung |
| 3 | 106-06, 106-09 | 106-06 nach 106-03/106-04 (gemeinsame Dateien); 106-09 nach 106-05 (`anime_v2.go`, `anime_test.go`) |
| 4 | 106-10 | nach 106-09 (`anime_test.go`) und 106-05 (`HasCoverImage` entfernt) |
| 5 | 106-08 | Phasen-Gate; wendet Migration 0131 erstmals an — muss nach ALLEN Code-Umstellungen laufen |

Keine Zyklen, keine Vorwärtsreferenzen; innerhalb jeder Welle keine `files_modified`-Überschneidung.

**Kritische Sequenz-Zusicherung:** Migration 0131 wird in Welle 1 nur AUTHORED (Datei-Content-Test, kein DB-Zugriff) und erst im Live-Checkpoint 106-08-02 (Welle 5) ANGEWENDET. Damit laufen 106-05, 106-09 und 106-10 nachweislich vor dem `DROP COLUMN cover_image`.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 106-01-01 | 01 | 1 | SC1 | T-106-01-01, T-106-01-03 | RED: Migrations-Content-Test schlägt kontrolliert fehl (0131 fehlt noch); enthält D-07-Negativ-Assertion auf `release_media` | migration-content (RED) | `cd backend && go test ./internal/migrations/... -run MediaCore 2>&1 \| grep -qiE "no such file\|cannot find\|0131"` | ❌ W0 | ⬜ pending |
| 106-01-02 | 01 | 1 | SC1, SC2, SC3 | T-106-01-01, T-106-01-02, T-106-01-03 | 0131 legt `media`/`media_variant` an, KEINE verbotenen Spalten, DROP NUR `anime.cover_image`, kein `release_media`; Nummern-Guard bestanden; Datei per Glob `*_media_core_schema.*.sql` eindeutig auflösbar | migration-content (GREEN) | `[ "$(ls database/migrations/*_media_core_schema.up.sql \| wc -l)" = "1" ] && cd backend && go test ./internal/migrations/... -run MediaCore` | ❌ W0 | ⬜ pending |
| 106-02-01 | 02 | 1 | SC3 | T-106-02-01, T-106-02-03 | Contract-Check-Skript syntaktisch valide; `anime.cover_image` MUSS-abwesend, `release_media`/`media_assets`/`media_files` erwartet-VORHANDEN | script-parse | `powershell -NoProfile -ExecutionPolicy Bypass -Command "$null=[ScriptBlock]::Create((Get-Content -Raw 'scripts/media-core-contract-check.ps1')); Write-Output PARSE-OK"` | ❌ W0 | ⬜ pending |
| 106-02-02 | 02 | 1 | SC4 | T-106-02-02 | grep-Suite valide; KEIN `release_media`/`CreateReleaseMedia`-Term (D-07); `cover_image`-SPALTE aktiv gesucht und vom DTO-Feld getrennt (Warning 2); kein False-Fail auf `animeCoverImageSelectSQL` | script-parse + D-07-Guard + Warning-2-Guard | `powershell -NoProfile -ExecutionPolicy Bypass -Command "$null=[ScriptBlock]::Create((Get-Content -Raw 'scripts/media-core-legacy-grep.ps1')); if ((Select-String -Path 'scripts/media-core-legacy-grep.ps1' -Pattern 'release_media\|CreateReleaseMedia').Count -gt 0) { throw 'D-07 violation' }; if ((Select-String -Path 'scripts/media-core-legacy-grep.ps1' -Pattern 'cover_image').Count -eq 0) { throw 'SC4 gap: cover_image not scanned' }; Write-Output PARSE-OK"` | ❌ W0 | ⬜ pending |
| 106-03-01 | 03 | 2 | SC2 | — | Totes UUID-Schema + Cover-Ops-Werkzeuge gelöscht, build/vet grün | build/delete | `cd backend && go build ./... && go vet ./...` (+ Datei-/Dir-Abwesenheit) | ✅ | ⬜ pending |
| 106-03-02 | 03 | 2 | SC2 | T-106-03-01 | `episode_version_images`-Strecke + Route `/releases/:id/images` entfernt, Gruppenpfad bleibt | build/grep | `cd backend && go build ./... && go vet ./... && ! grep -rq "episode_version_image\|ListReleaseImages" internal/ cmd/ --include=*.go` | ✅ | ⬜ pending |
| 106-04-01 | 04 | 2 | SC2 | T-106-04-01, T-106-04-02 | Legacy-Dualpfad (`SupportsLegacyUploadSchema` etc.) entfernt, V2-Upload bleibt, `INSERT INTO release_media` erhalten (D-07) | build/grep | `cd backend && go build ./... && ! grep -rq "SupportsLegacyUploadSchema\|shouldUseAnimePosterPathFallback\|legacyUploadSchemaDetector" internal/ --include=*.go --exclude=*_test.go && grep -q "INSERT INTO release_media" internal/repository/media_upload.go` | ✅ | ⬜ pending |
| 106-04-02 | 04 | 2 | SC2 | T-106-04-03 | Cluster-B-Test-Mock entfernt, Mock `CreateReleaseMedia` erhalten (D-07), Upload-Tests grün | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/handlers/... -run MediaUpload && ! grep -q "SupportsLegacyUploadSchema" internal/handlers/media_upload_test.go && grep -q "CreateReleaseMedia" internal/handlers/media_upload_test.go` | ✅ | ⬜ pending |
| 106-05-01 | 05 | 2 | SC2 | T-106-05-01, T-106-05-02, T-106-05-03 | `anime.cover_image`-Spalten-Zugriffe in anime_v2/anime_assets/anime_schema entfernt; DTO-Feld + `cover_asset_id` intakt; `release_media`-UNION-Zweig nicht mitentfernt; `anime_test.go`-Fragmente gezogen | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/repository/... -run Anime && ! grep -rq "syncLegacyAnimeCoverImageV2\|HasCoverImage" internal/ --include=*.go && grep -q "release_media" internal/repository/anime_assets.go` | ✅ | ⬜ pending |
| 106-05-02 | 05 | 2 | SC2 | T-106-05-02 | D-07-Regressionsnachweis: release_media-Lesepfad, Handler, Route und Test-Guards nachweislich unverändert (keine `files_modified`) | test/grep | `cd backend && go test ./internal/repository/... -run RuntimeAuthority && go test ./internal/handlers/... -run ReleaseAssets && grep -q "ListReleaseAssets" internal/repository/episode_version_repository_read_helpers.go && grep -q "releases/:id/assets" cmd/server/main.go` | ✅ | ⬜ pending |
| 106-07-01 | 07 | 2 | SC2 | — | Cover-Route-Handler gelöscht (build-breaking FE, D-03) + api.ts-Client + Aufrufer bereinigt, typecheck grün | typecheck/delete/grep | `cd frontend && npm run typecheck && [ ! -f "src/app/covers/[file]/route.ts" ] && [ ! -f src/app/api/admin/upload-cover/route.ts ] && ! grep -rq "deleteUploadedCoverFile\|upload-cover" src/lib src/app --include=*.ts --include=*.tsx` | ✅ | ⬜ pending |
| 106-06-01 | 06 | 3 | SC2 | — | `asset_lifecycle`-Dateien gelöscht + main.go entkoppelt | build/delete/grep | `[ ! -f backend/internal/services/asset_lifecycle_service.go ] && [ ! -f backend/internal/models/asset_lifecycle.go ] && ! grep -q "AssetLifecycle" backend/cmd/server/main.go` | ✅ | ⬜ pending |
| 106-06-02 | 06 | 3 | SC2 | T-106-06-01, T-106-06-02, T-106-06-03 | Handler entkoppelt; Fehlercodes definiert nach `media_upload.*` migriert + OpenAPI nachgezogen; kanonische Speicherpfad-Formel; Traversal-Schutz erhalten | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/handlers/... -run MediaUpload && ! grep -rq "asset_lifecycle\|AssetLifecycle" internal/ cmd/ --include=*.go && ! grep -q "asset_lifecycle" ../shared/contracts/openapi.yaml && grep -q "isUploadPathWithinBase" internal/handlers/media_upload.go` | ✅ | ⬜ pending |
| 106-09-01 | 09 | 3 | SC2 | T-106-09-03 | Alias-parametrisierte Cover-Expression + Poster-LATERAL zentral; genau eine Quelle der Wahrheit; keine Rohspalte in der neuen Expression | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/repository/... -run AnimeCoverImageSelectSQL && grep -q "animeCoverPosterLateralSQL" internal/repository/anime_cover_sql.go` | ✅ | ⬜ pending |
| 106-09-02 | 09 | 3 | SC2 | T-106-09-01, T-106-09-04, T-106-09-05 | Öffentliche Leser (Watchlist ×2, Anime-Relationen, Gruppenprojekte) lesen abgeleitete Quelle; Scan-/Spaltenreihenfolge unverändert; `release_media` unberührt | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/repository/... && ! grep -nE "a\.cover_image" internal/repository/watchlist.go internal/repository/anime_relations.go internal/repository/fansub_repository.go` | ✅ | ⬜ pending |
| 106-09-03 | 09 | 3 | SC2 | T-106-09-01, T-106-09-02 | Admin-Leser umgestellt; `loadCurrentProjects` GROUP-BY-konsistent (`a.cover_resolved_url` statt `a.cover_image`); Test-Assertionen gezogen | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/repository/... ./internal/handlers/... && ! grep -rnE "a\.cover_image" internal/repository/anime_relations_admin.go internal/repository/admin_content_anisearch.go internal/repository/admin_content_anime_themes.go internal/repository/member_profile_repository.go` | ✅ | ⬜ pending |
| 106-10-01 | 10 | 4 | SC2 | T-106-10-01, T-106-10-04 | Legacy-Lese-Fallbacks (`anime.go` List/GetByID/buildAnimeListWhere, `admin_content_sync.go`) entfernt; V2-Pfade unbedingt; `runtime_authority_test.go`-Fragmente gezogen, D-07-Assertionen erhalten | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/repository/... && ! grep -qE "cover_image" internal/repository/anime.go && ! grep -qE "cover_image" internal/repository/admin_content_sync.go && grep -q "release_media" internal/repository/runtime_authority_test.go` | ✅ | ⬜ pending |
| 106-10-02 | 10 | 4 | SC2, SC4 | T-106-10-01, T-106-10-02, T-106-10-03 | Legacy-Create/Update/Delete-Zweige entfernt; beide `release_media`-Referenzguards erhalten; repo-weit keine `cover_image`-SQL-Signatur mehr | build/test/grep-gate | `cd backend && go build ./... && go vet ./... && go test ./internal/repository/... ./internal/handlers/... && ! grep -rq "createAnimeLegacy" internal/ --include=*.go && [ "$(grep -c 'release_media' internal/repository/admin_content_anime_delete.go)" -ge 2 ] && [ -z "$(grep -rnE 'a\.cover_image\|,[[:space:]]*cover_image\|cover_image[[:space:]]*=\|SET cover_image' internal cmd --include=*.go \| grep -v 'json:' \| grep -v 'applyString')" ]` | ✅ | ⬜ pending |
| 106-08-01 | 08 | 5 | SC3, SC4 | T-106-08-01, T-106-08-02, T-106-08-03, T-106-08-04 | Statische Gates: build/vet + Migrations-/Legacy-Test-Guards + grep-Suite exit 0 + D-07-Statik + cover_image-Spalten-Statik leer + Migration per Glob eindeutig aufgelöst (kein FALSE PASS) | build/test/grep-gate | `cd backend && go build ./... && go vet ./... && go test ./internal/migrations/... && MIG=$(ls ../database/migrations/*_media_core_schema.up.sql) && [ -f "$MIG" ] && ! grep -q "release_media" "$MIG" && powershell -NoProfile -ExecutionPolicy Bypass -File ../scripts/media-core-legacy-grep.ps1` | ✅ (W0-Skripte nach 106-02) | ⬜ pending |
| 106-08-02 | 08 | 5 | SC3 | T-106-08-01, T-106-08-02, T-106-08-03 | Live-Gate (checkpoint): Kette 1→n auf leerer DB + Contract-Check + `/covers/`-404 + D-07-Regression + **cover_image-Live-Regression auf vier öffentlichen Oberflächen** | checkpoint:human-verify | Manual (Docker-Rebuild + frische DB; siehe Manual-Only) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Abdeckung: **20 Tasks über 10 Pläne** (01:2, 02:2, 03:2, 04:2, 05:2, 06:2, 07:1, 08:2, 09:3, 10:2). Genau ein Task ohne `<automated>`: der unvermeidbare Live-Checkpoint 106-08-02.*

---

## Wave 0 Requirements

- [ ] `backend/internal/migrations/media_core_schema_test.go` (106-01-01) — asserted UP enthält `CREATE TABLE media`, `content_hash`, alle CHECK-Constraints, `media_variant … ON DELETE CASCADE`, `DROP COLUMN IF EXISTS cover_image`; UP enthält **NICHT** `caption`/`visibility`/`review_status`/`category`/`sort_order` an `media`; **UP und DOWN enthalten NICHT `release_media` (D-07)**; DOWN rekonstruiert `cover_image`. Dateiauflösung über das Suffix-Glob `*_media_core_schema.*.sql`, nicht über die hartkodierte Nummer.
- [ ] `scripts/media-core-contract-check.ps1` (106-02-01) — Ziel-/Legacy-Assertion (SC3), analog `scripts/schema-v2-audit.ps1`; `anime.cover_image` MUSS-abwesend; `release_media`/`media_assets`/`media_files` erwartet-VORHANDEN (D-07-Drop-Guard).
- [ ] `scripts/media-core-legacy-grep.ps1` (106-02-02) — SC4-Rest-Referenz-Scan; `*.exe`/`*.log`/`*.md`/`.planning`/`node_modules` aus Scope; **kein `release_media`/`CreateReleaseMedia`-Suchbegriff (D-07)**; **`cover_image` über SQL-Spalten-Signaturen aktiv gesucht, DTO-Feld ausgefiltert (Warning 2)**; **`animeCoverImageSelectSQL` ist kein Suchbegriff** (Helper bleibt bestehen).

*Migration-Test-Muster existiert bereits (`release_content_source_groups_test.go` als Vorlage); Go-Testframework ist vorhanden — nur die drei obigen Artefakte fehlen.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Kette 1→n läuft fehlerfrei gegen leere Ziel-DB | SC3 | Erfordert Docker-Backend-Rebuild + frische DB; nicht im Unit-Test abbildbar | `docker compose exec team4sv30-backend /app/migrate up` gegen zurückgesetzte DB |
| Contract-Check belegt Zielschema bei intaktem media_assets/media_files/release_media | SC3 | psql gegen Live-DB; Bash-Sandbox erreicht Host-DB nicht | `powershell -File scripts/media-core-contract-check.ps1 -FailOnContractGaps` → kein throw |
| `/covers/`-Route liefert 404 (FE-Route entfernt) | SC2 (D-03) | Live-Route-Verhalten am Dev-Server :3000 | Alte Cover-URL im Browser aufrufen → 404/kein Handler |
| Media-Assets-Sektion der Episoden-Detailseite unverändert (D-07-Regression) | SC2 (D-07) | Live-FE-Verhalten am Dev-Server :3000 mit echten Daten | `/episodes/<id>?releaseId=<id>` öffnen → Sektion rendert wie vor der Phase |
| **Watchlist rendert Cover nach dem `cover_image`-DROP** | SC2 (106-09) | Nur gegen die migrierte Live-DB nachweisbar; Query-Fehler zeigt sich als HTTP 500 | Watchlist-Liste + Einzeleintrag als angemeldeter Nutzer öffnen; `docker compose logs --tail=100 team4sv30-backend` frei von `column a.cover_image does not exist` |
| **Anime-Relationen (public + admin) rendern Cover** | SC2 (106-09) | Live-Daten mit gepflegten Relationen nötig | Anime-Detailseite mit Relationen + Admin-Relationsverwaltung + Titel-Suche für Relationsziele öffnen |
| **Gruppenprojekte (`listPublicFansubProjects`) rendern Cover** | SC2 (106-09) | Live-Daten mit `anime_fansub_groups`-Zuordnung nötig | Fansub-Gruppenseite mit zugeordneten Anime öffnen |
| **Member-Profil „Aktuelle Projekte" rendert (GROUP-BY-Fall)** | SC2 (106-09) | GROUP-BY-Fehler tritt nur zur Laufzeit gegen echte DB auf | Member-Profil mit laufenden Projekten öffnen; kein `must appear in the GROUP BY clause` im Backend-Log |
| Upload-Fehlercodes im neuen Namensraum | SC2 (106-06) | Nur am laufenden Backend beobachtbar | `POST /admin/upload` mit ungültigem `entity_type` → Response-Code `media_upload.invalid_entity_type` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (einzige Ausnahme: 106-08-02, blocking human-verify — kein Automated möglich)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Migrations-Test + 2 PS-Skripte)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Map deckt alle **20 Tasks** der **10 Pläne** ab (Stand nach Revision 2026-07-22)
- [x] Alle acht `anime.cover_image`-Rohspalten-Lesestellen sind einem Plan zugeordnet (106-09), alle dauerhaft toten Legacy-Zweige ebenfalls (106-10)
- [x] Kein Gate verwendet mehr negiertes `grep` auf einen möglicherweise fehlenden Glob (FALSE-PASS-Muster beseitigt)

**Approval:** map covers all 10 plans (106-01 … 106-10); pending execution.
</content>
