---
phase: 106
slug: medienkern-schema-legacy-abbau
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-21
updated: 2026-07-21
---

# Phase 106 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

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

- **After every task commit:** Run `cd backend && go build ./... && go vet ./...`
- **After every plan wave:** Run `cd backend && go test ./internal/migrations/... ./internal/repository/... ./internal/handlers/...` + `cmd/migrate up/down`-Roundtrip
- **Before `/gsd:verify-work`:** Vollständige Kette 1→n gegen leere DB grün + `scripts/media-core-contract-check.ps1 -FailOnContractGaps` grün + grep-Suite (SC4) `scripts/media-core-legacy-grep.ps1` exit 0
- **Max feedback latency:** 60 Sekunden

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 106-01-01 | 01 | 1 | SC1 | T-106-01-01 | RED: Migrations-Content-Test schlägt kontrolliert fehl (0131 fehlt noch) | migration-content (RED) | `cd backend && go test ./internal/migrations/... -run MediaCore 2>&1 \| grep -qiE "no such file\|cannot find\|0131"` | ❌ W0 | ⬜ pending |
| 106-01-02 | 01 | 1 | SC1, SC3 | T-106-01-01, T-106-01-02 | 0131 legt `media`/`media_variant` an, KEINE verbotenen Spalten, DROP nur `release_media`/`cover_image`; Nummern-Guard bestanden | migration-content (GREEN) | `cd backend && go test ./internal/migrations/... -run MediaCore` | ❌ W0 | ⬜ pending |
| 106-02-01 | 02 | 1 | SC3 | T-106-02-01 | Contract-Check-Skript syntaktisch valide, korrekte MUSS-vorhanden/-abwesend/Verboten-Listen | script-parse | `powershell -NoProfile -ExecutionPolicy Bypass -Command "$null=[ScriptBlock]::Create((Get-Content -Raw 'scripts/media-core-contract-check.ps1')); Write-Output PARSE-OK"` | ❌ W0 | ⬜ pending |
| 106-02-02 | 02 | 1 | SC4 | T-106-02-02 | grep-Suite valide, release_media auf NON-TEST-Live-Code gescopet, /covers nicht blanket, Spalte-vs-DTO getrennt | script-parse | `powershell -NoProfile -ExecutionPolicy Bypass -Command "$null=[ScriptBlock]::Create((Get-Content -Raw 'scripts/media-core-legacy-grep.ps1')); Write-Output PARSE-OK"` | ❌ W0 | ⬜ pending |
| 106-03-01 | 03 | 2 | SC2 | — | Totes UUID-Schema + Cover-Ops-Werkzeuge gelöscht, build/vet grün | build/delete | `cd backend && go build ./... && go vet ./...` (+ Datei-/Dir-Abwesenheit) | ✅ | ⬜ pending |
| 106-03-02 | 03 | 2 | SC2 | — | `episode_version_images`-Strecke + Route `/releases/:id/images` entfernt, Gruppenpfad bleibt | build/grep | `cd backend && go build ./... && go vet ./... && ! grep -rq "episode_version_image\|ListReleaseImages" internal/ cmd/ --include=*.go` | ✅ | ⬜ pending |
| 106-04-01 | 04 | 2 | SC2 | — | Legacy-Dualpfad (`SupportsLegacyUploadSchema` etc.) im Upload-Repo entfernt, V2-Upload bleibt | build/grep | `cd backend && go build ./... && ! grep -rq "SupportsLegacyUploadSchema\|shouldUseAnimePosterPathFallback\|legacyUploadSchemaDetector" internal/ --include=*.go --exclude=*_test.go` | ✅ | ⬜ pending |
| 106-04-02 | 04 | 2 | SC2 | — | `release_media`-Junction-WRITES (CreateReleaseMedia + DeleteMediaAsset-Join + media_upload.go INSERT) entfernt | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/handlers/... -run MediaUpload && ! grep -rq "CreateReleaseMedia" internal/ --include=*.go && ! grep -q "release_media" internal/repository/media_upload.go` | ✅ | ⬜ pending |
| 106-05-01 | 05 | 2 | SC2 | T-106-05-02 | ENTSCHEIDUNG (checkpoint): Behandlung des lebenden `/releases/:id/assets`-Endpoints (Option A/B/C) — kein stilles Neutern | checkpoint:decision | — (blocking; Nutzer wählt A/B/C, parametrisiert 106-05-02) | ✅ | ⬜ pending |
| 106-05-02 | 05 | 2 | SC2 | T-106-05-01, T-106-05-02 | Unkritische release_media-Reads entfernt; Endpoint gemäß Entscheidung behandelt; Test-Guard auf Zielzustand | build/test | `cd backend && go build ./... && go vet ./... && go test ./internal/repository/... -run RuntimeAuthority` | ✅ | ⬜ pending |
| 106-05-03 | 05 | 2 | SC2 | T-106-05-03 | `anime.cover_image`-Spalten-Zugriffe entfernt, DTO-Feld + cover_asset_id intakt | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/repository/... -run Anime && ! grep -rq "syncLegacyAnimeCoverImageV2\|HasCoverImage" internal/ --include=*.go` | ✅ | ⬜ pending |
| 106-07-01 | 07 | 2 | SC2 | — | Cover-Route-Handler gelöscht (build-breaking FE, D-03) + api.ts-Client + Aufrufer bereinigt, typecheck grün | typecheck/delete/grep | `cd frontend && npm run typecheck && [ ! -f "src/app/covers/[file]/route.ts" ] && [ ! -f src/app/api/admin/upload-cover/route.ts ] && ! grep -rq "deleteUploadedCoverFile\|upload-cover" src/lib src/app --include=*.ts --include=*.tsx` | ✅ | ⬜ pending |
| 106-06-01 | 06 | 3 | SC2 | — | `asset_lifecycle`-Dateien gelöscht + main.go entkoppelt | build/delete/grep | `[ ! -f backend/internal/services/asset_lifecycle_service.go ] && [ ! -f backend/internal/models/asset_lifecycle.go ] && ! grep -q "AssetLifecycle" backend/cmd/server/main.go` | ✅ | ⬜ pending |
| 106-06-02 | 06 | 3 | SC2 | — | `MediaUploadHandler` von asset_lifecycle entkoppelt, V2-Upload kompiliert + Tests grün | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/handlers/... -run MediaUpload && ! grep -rq "asset_lifecycle\|AssetLifecycle" internal/ cmd/ --include=*.go` | ✅ | ⬜ pending |
| 106-08-01 | 08 | 4 | SC3, SC4 | T-106-08-01 | Statische Gates: build/vet + Migrations-/Legacy-Test-Guards grün + grep-Suite exit 0 | build/test/grep-gate | `cd backend && go build ./... && go vet ./... && go test ./internal/migrations/... && powershell -NoProfile -ExecutionPolicy Bypass -File ../scripts/media-core-legacy-grep.ps1` | ✅ (W0-Skripte nach 106-02) | ⬜ pending |
| 106-08-02 | 08 | 4 | SC3 | T-106-08-01 | Live-Gate (checkpoint): Kette 1→n auf leerer DB + Contract-Check `-FailOnContractGaps` + `/covers/`-404 | checkpoint:human-verify | Manual (Docker-Rebuild + frische DB; siehe Manual-Only) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Hinweis Endpoint-Option A (106-05): Wird Option A gewählt (release_media-Drop zurückgenommen), meldet 106-05 an 106-01/02/08 zurück — dann führt der Contract-Check `release_media` NICHT als MUSS-abwesend und die grep-Live-Suche allowlistet den bewusst behaltenen `ListReleaseAssets`-Lesepfad.*

---

## Wave 0 Requirements

- [ ] `backend/internal/migrations/media_core_schema_test.go` (106-01-01) — asserted 0131 UP enthält `CREATE TABLE media`, `content_hash`, alle CHECK-Constraints, `media_variant … ON DELETE CASCADE`, `DROP TABLE IF EXISTS release_media`, `DROP COLUMN IF EXISTS cover_image`; UP enthält **NICHT** `caption`/`visibility`/`review_status` an `media`; DOWN rekonstruiert `cover_image` + `release_media`.
- [ ] `scripts/media-core-contract-check.ps1` (106-02-01) — Legacy-Freiheits-Assertion (SC3), analog `scripts/schema-v2-audit.ps1`.
- [ ] `scripts/media-core-legacy-grep.ps1` (106-02-02) — SC4-Rest-Referenz-Scan; deckt alle entfernten Symbole/Routen; **`*.exe`/`*.log`/`*.md`/`.planning`/`node_modules` aus Scope**; **`release_media`-Term auf NON-TEST-Live-Code gescopet** (Allowlist der 6 retained Test-Dateien), fängt aber Live-Residuen.

*Migration-Test-Muster existiert bereits (`release_content_source_groups_test.go` als Vorlage); Go-Testframework ist vorhanden — nur die drei obigen Artefakte fehlen.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Kette 1→n läuft fehlerfrei gegen leere Ziel-DB | SC3 | Erfordert Docker-Backend-Rebuild + frische DB; nicht im Unit-Test abbildbar | `docker compose exec team4sv30-backend /app/migrate up` gegen zurückgesetzte DB |
| Contract-Check belegt Legacy-Freiheit bei intaktem media_assets/media_files | SC3 | psql gegen Live-DB; Bash-Sandbox erreicht Host-DB nicht | `powershell -File scripts/media-core-contract-check.ps1 -FailOnContractGaps` → kein throw |
| `/covers/`-Route liefert 404 (FE-Route entfernt) | SC2 (D-03) | Live-Route-Verhalten am Dev-Server :3000 | Alte Cover-URL im Browser aufrufen → 404/kein Handler |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (checkpoints 106-05-01 / 106-08-02 sind blocking human/decision — kein Automated erforderlich)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Migrations-Test + 2 PS-Skripte)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** map covers all 8 plans (106-01 … 106-08); pending execution.
