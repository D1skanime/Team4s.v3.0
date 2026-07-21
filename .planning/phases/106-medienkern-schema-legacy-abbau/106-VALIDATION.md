---
phase: 106
slug: medienkern-schema-legacy-abbau
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-21
---

# Phase 106 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go `testing` + `stretchr/testify` (Backend); Vitest 3 (Frontend, hier minimal) |
| **Config file** | none — Go-Toolchain vorhanden; Migrations-Test-Muster `backend/internal/migrations/*_test.go` |
| **Quick run command** | `cd backend && go build ./... && go vet ./...` |
| **Full suite command** | `cd backend && go test ./internal/migrations/...` + Ketten-Lauf `cmd/migrate up` gegen leere DB |
| **Estimated runtime** | ~30–60 Sekunden (build/vet); Ketten-Lauf zusätzlich ~10–20s |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && go build ./... && go vet ./...`
- **After every plan wave:** Run `cd backend && go test ./internal/migrations/...` + `cmd/migrate up/down`-Roundtrip
- **Before `/gsd:verify-work`:** Vollständige Kette 1→n gegen leere DB grün + `scripts/media-core-contract-check.ps1` grün + grep-Suite (SC4) leer
- **Max feedback latency:** 60 Sekunden

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 106-01-01 | 01 | 1 | SC1 | — | `media`/`media_variant` angelegt, KEINE verbotenen Spalten (caption/visibility/review_status/category/sort_order) | migration-content | `cd backend && go test ./internal/migrations/... -run MediaCore` | ❌ W0 | ⬜ pending |
| 106-02-01 | 02 | 2 | SC2 | — | Legacy-Backend-Code (§6-Liste) entfernt, build/vet grün | build/grep | `cd backend && go build ./... && go vet ./...` | ✅ | ⬜ pending |
| 106-03-01 | 03 | 3 | SC3 | — | Kette 1→n läuft gegen leere DB, Contract-Check belegt Legacy-Freiheit | integration | `cmd/migrate up` (leere DB) + `scripts/media-core-contract-check.ps1` | ❌ W0 | ⬜ pending |
| 106-03-02 | 03 | 3 | SC4 | — | Keine Rest-Referenzen auf entfernte Symbole/Routen | grep | grep-Suite über `cover_image`(Spalte)/`upload-cover`/`migrate-covers`/`SupportsLegacyUploadSchema`/`useLegacyUploadSchema`/`asset_lifecycle`/`episode_version_image`/`release_media`/`/covers/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/migrations/media_core_schema_test.go` — asserted 0131 UP enthält `CREATE TABLE media`, `content_hash`, alle CHECK-Constraints, `media_variant … ON DELETE CASCADE`, `DROP TABLE IF EXISTS release_media`, `DROP COLUMN IF EXISTS cover_image`; UP enthält **NICHT** `caption`/`visibility`/`review_status` an `media`; DOWN rekonstruiert `cover_image` + `release_media`.
- [ ] `scripts/media-core-contract-check.ps1` — Legacy-Freiheits-Assertion (SC3), analog `scripts/schema-v2-audit.ps1`.
- [ ] grep-Suite (Skript oder Verifikations-Kommandoliste) für SC4 — deckt alle entfernten Symbole/Routen; **`*.exe`/`*.log`/`*.md`-Doku aus Scope ausschließen** (sonst False-Positives durch Planungsdokumente).

*Migration-Test-Muster existiert bereits (`release_content_source_groups_test.go` als Vorlage); Go-Testframework ist vorhanden — nur die drei obigen Artefakte fehlen.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Backend startet gegen leere Zielstruktur nach vollständigem Reset | SC3 | Erfordert Docker-Backend-Rebuild + frische DB; nicht im Unit-Test abbildbar | `docker compose up -d --build team4sv30-backend` gegen zurückgesetzte DB, `/health` prüfen |
| `/covers/`-Route liefert 404 (FE-Route entfernt) | SC2 (D-03) | Live-Route-Verhalten am Dev-Server :3000 | Alte Cover-URL im Browser aufrufen → 404/kein Handler |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
