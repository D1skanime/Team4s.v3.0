# Phase 106: Medienkern-Schema & Legacy-Abbau - Pattern Map

**Mapped:** 2026-07-21
**Files to CREATE analyzed:** 3 (Migration up/down als Paar, Migrations-Test, Contract-Check)
**Files to MODIFY/DELETE analyzed:** §6-Legacy-Inventar (Cluster A–G)
**Analogs found:** 3 / 3 CREATE-Ziele (alle exakt)

> Diese Phase ist zu ~20 % "neue Dateien" und zu ~80 % Legacy-Abbau (Löschen/Edit
> bestehender Dateien). Der Analog-Teil betrifft die 3 neuen Artefakte; für den Abbau
> liefert dieser Report die **Build-Break-Klassifizierung** pro §6-Cluster plus eine
> **Call-Site-Korrektur** gegenüber RESEARCH (siehe "Enrichment / Risiko-Befunde").

---

## File Classification (Files to CREATE)

| Neue Datei | Rolle | Data Flow | Nächster Analog | Match |
|------------|-------|-----------|-----------------|-------|
| `database/migrations/0131_media_core_schema.up.sql` | migration (DDL) | transform (schema) | `database/migrations/0129_release_playback_entitlements.up.sql` | exact (CREATE TABLE + TEXT/CHECK) |
| `database/migrations/0131_media_core_schema.down.sql` | migration (DDL) | transform (schema) | `database/migrations/0130_release_content_source_groups.down.sql` | exact (DROP-Umkehr) |
| `backend/internal/migrations/media_core_schema_test.go` | test | request-response (file read + assert) | `backend/internal/migrations/release_content_source_groups_test.go` | exact (identisches Muster) |
| `scripts/media-core-contract-check.ps1` | tooling/config | request-response (psql → assert) | `scripts/schema-v2-audit.ps1` | role-match (DB-Audit-Gerüst) |

**Wichtige Analog-Korrektur ggü. Prompt/RESEARCH:**
- Für die **up.sql** ist `0129` der bessere Enum/CHECK-Analog als `0130` — `0130` ist
  ALTER+Backfill-lastig (kein `CREATE TABLE`, kein CHECK). `0129` zeigt genau das
  `TEXT NOT NULL` + benanntes `CONSTRAINT chk_<table>_<col> CHECK (col IN (...))`-Muster
  aus D-06 sowie `... REFERENCES x(id) ON DELETE CASCADE`.
- Für die **down.sql** ist `0130` der passende Analog (schlanke Umkehr: DROP INDEX →
  DROP COLUMN, `IF EXISTS`-tolerant).
- Für den **Contract-Check** existiert nur `schema-v2-audit.ps1` (304 Z., die reale
  Logik) + `schema-v2-contract-check.ps1` (10-Z.-Wrapper der `-FailOnContractGaps`
  setzt). RESEARCH hat recht: `schema-v2-audit.ps1` ist die Vorlage, nicht der Wrapper.

---

## Pattern Assignments

### `database/migrations/0131_media_core_schema.up.sql` (migration, DDL)

**Analog:** `database/migrations/0129_release_playback_entitlements.up.sql`

**TEXT + CHECK-Enum-Muster** (0129, Zeilen 5–29) — für alle 5 Enum-Felder spiegeln
(`chk_media_kind`, `chk_media_source`, `chk_media_processing_status`,
`chk_media_variant_variant`, `chk_media_variant_status`):
```sql
CREATE TABLE release_playback_entitlement_rules (
    id BIGSERIAL PRIMARY KEY,
    subject_type TEXT NOT NULL,
    effect TEXT NOT NULL,
    scope_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_release_playback_entitlement_subject_type
        CHECK (subject_type IN ('app_user', 'role')),
    CONSTRAINT chk_release_playback_entitlement_effect
        CHECK (effect IN ('allow', 'deny')),
    CONSTRAINT chk_release_playback_entitlement_scope_type
        CHECK (scope_type IN ('global', 'group', 'project', 'release'))
);
```
Konvention (verbindlich für 0131): `id BIGSERIAL PRIMARY KEY`; `TEXT NOT NULL` + separater
benannter CHECK `chk_<table>_<col>`; Werte **kleingeschrieben**; `TIMESTAMPTZ NOT NULL
DEFAULT NOW()` für `created_at`.

**FK ON DELETE CASCADE / SET NULL** (0129, Zeilen 8, 12, 15) — für
`media_variant.media_id → media (ON DELETE CASCADE)` (D-06/§1 verbindlich) und
`media.owner_user_id/owner_member_id ... ON DELETE SET NULL` (A2, Owner optional):
```sql
    subject_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    ...
    created_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
```

**Partial/non-unique Index-Muster** (0129, Zeilen 53–67) — für den optionalen
non-unique Index auf `media(content_hash)` (D-05-Ermessen) und `media_variant(media_id)`:
```sql
CREATE INDEX idx_release_playback_entitlement_release
    ON release_playback_entitlement_rules (release_version_id)
    WHERE release_version_id IS NOT NULL;
```

**DROP-Anhang (UP)** — nach den beiden CREATE TABLE (Reihenfolge aus RESEARCH §DROP):
```sql
DROP TABLE IF EXISTS release_media CASCADE;
ALTER TABLE anime DROP COLUMN IF EXISTS cover_image;
```
> Verbotene Spalten an `media` (SC1 / §1): `caption`, `visibility`/`visibility_id`,
> `review_status`/`review_status_id`, `category`, `sort_order` — dürfen NICHT im UP stehen.
> `media_assets`/`media_files` NIEMALS droppen (Grenzbefund A1).

---

### `database/migrations/0131_media_core_schema.down.sql` (migration, DDL)

**Analog:** `database/migrations/0130_release_content_source_groups.down.sql`

**Umkehr-Muster** (0130 down, komplett — schlank, `IF EXISTS`-tolerant, umgekehrte
Reihenfolge zum up):
```sql
DROP INDEX IF EXISTS idx_rvn_release_version_source_group;
DROP INDEX IF EXISTS idx_rvm_release_version_source_group;
ALTER TABLE release_version_notes DROP COLUMN IF EXISTS fansub_group_id;
ALTER TABLE release_version_media DROP COLUMN IF EXISTS fansub_group_id;
```
Für 0131 down (exakte Umkehr, RESEARCH §DOWN-Reihenfolge):
1. `ALTER TABLE anime ADD COLUMN IF NOT EXISTS cover_image TEXT;`
2. `release_media` neu anlegen (Def. aus 0026: `release_id`, `media_id → media_assets
   ON DELETE CASCADE`, `sort_order INTEGER DEFAULT 0`, `created_at`, PK(release_id, media_id)).
3. `DROP TABLE IF EXISTS media_variant;` (FK-Kind zuerst)
4. `DROP TABLE IF EXISTS media;`
> Nur strukturell reversibel — kein Datenerhalt (Testdaten-Reset vor Phase 110).

---

### `backend/internal/migrations/media_core_schema_test.go` (test, file-read assert)

**Analog:** `backend/internal/migrations/release_content_source_groups_test.go` (komplett, 36 Z.)

**Vollständiges Struktur-Muster** (Datei liest die SQL relativ `../../../database/migrations/…`
und asserted String-Inhalte via `strings.Contains`):
```go
package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestReleaseContentSourceGroupsMigrationIsSafeAndReversible(t *testing.T) {
	up, err := os.ReadFile("../../../database/migrations/0130_release_content_source_groups.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	down, err := os.ReadFile("../../../database/migrations/0130_release_content_source_groups.down.sql")
	if err != nil {
		t.Fatal(err)
	}
	u := string(up)
	for _, needle := range []string{
		"release_version_media", "fansub_group_id BIGINT NULL",
		"REFERENCES fansub_groups(id) ON DELETE SET NULL",
	} {
		if !strings.Contains(u, needle) {
			t.Fatalf("UP missing %q", needle)
		}
	}
	// Negativ-Assertion (Anti-Pattern ausschließen):
	if strings.Contains(u, "MIN(rvg.fansub_group_id)") {
		t.Fatal("must not choose an arbitrary release group")
	}
	d := string(down)
	if !strings.Contains(d, "DROP COLUMN IF EXISTS fansub_group_id") || !strings.Contains(d, "DROP INDEX IF EXISTS") {
		t.Fatal("DOWN must remove indexes and columns")
	}
}
```
**Zu spiegeln für 0131** (Package `migrations`, ein `Test…`-Funktion, positive +
negative Needles — deckt Wave-0-Gap):
- UP-positiv: `CREATE TABLE media`, `content_hash`, jede der 5
  `CHECK (... IN (...))`-Klauseln, `media_variant`, `REFERENCES media(id) ON DELETE CASCADE`,
  `DROP TABLE IF EXISTS release_media`, `DROP COLUMN IF EXISTS cover_image`.
- UP-negativ (SC1): darf NICHT enthalten `caption`, `visibility`, `review_status`,
  `category`, `sort_order` am `media`-Block; darf NICHT `DROP TABLE ... media_assets`.
- DOWN-positiv: `ADD COLUMN IF NOT EXISTS cover_image`, `release_media`-Rekonstruktion,
  `DROP TABLE IF EXISTS media`.

Nachbar-Analog mit stärkeren Negativ-Assertions:
`backend/internal/migrations/phase103_release_playback_entitlements_test.go` (falls
umfangreichere Constraint-Prüfung gewünscht).

---

### `scripts/media-core-contract-check.ps1` (tooling, psql-assert)

**Analog:** `scripts/schema-v2-audit.ps1` (304 Z.) — Struktur 1:1 übernehmen, Ziel-/Legacy-Listen tauschen.

**DB-Identitäts-Guard + psql-Helper** (schema-v2-audit.ps1, Zeilen 8–22) — verbindlich übernehmen:
```powershell
function Invoke-LocalPsql {
    param([Parameter(Mandatory = $true)][string]$Sql)
    $result = docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 -At -F "`t" -c $Sql
    if ($LASTEXITCODE -ne 0) { throw "psql command failed" }
    return @($result)
}
$dbIdentity = Invoke-LocalPsql "SELECT current_database(), current_user;"
$dbIdentityValue = ($dbIdentity | Where-Object { $_.Trim().Length -gt 0 } | Select-Object -First 1).Trim()
if ($dbIdentityValue -ne "team4s_v2`tteam4s") {
    throw "Refusing to audit unexpected database identity: $($dbIdentity -join '; ')"
}
```

**Hashmap-Introspektion** (Zeilen 24–90) — `information_schema.tables`/`.columns` +
`pg_constraint` (`pg_get_constraintdef`) + `pg_indexes` in `$tables`/`$columns`/
`$constraints`/`$indexes`-Hashmaps laden. Für 106 nötig: `$tables` + `$columns` +
`$constraints` (CHECK/FK-Def-Strings prüfen).

**Present/Legacy-Assertion + Fail-Gate** (Zeilen 161–184, 232–237, 295–303):
```powershell
foreach ($spec in $targetTables) {           # MUSS vorhanden
    if ($tables.ContainsKey($spec.Live)) { Add-AuditRow "table" ... "present" ... }
    else { Add-AuditRow "table" ... "missing" ... }
}
foreach ($legacy in $legacyTables) {          # MUSS abwesend
    if ($tables.ContainsKey($legacy)) { Add-AuditRow "legacy-to-delete" ... }
}
$missing = @($audit | Where-Object { $_.Status -eq "missing" })
$contractPassed = $missing.Count -eq 0 -and $blockingDivergent.Count -eq 0
if ($FailOnContractGaps -and -not $contractPassed) { throw "…contract check failed…" }
```

**Anpassungen für media-core (RESEARCH §Contract-Check):**
- `$targetTables`: `media` (Zielspalten + CHECK `kind/source/processing_status`),
  `media_variant` (`media_id`-FK ON DELETE CASCADE + CHECK `variant/status`).
- **Neue Negativ-Assertion nötig** (das v2-Audit hat keine "verbotene Spalte"-Prüfung):
  `media` darf `caption`/`visibility_id`/`review_status_id`/`category`/`sort_order` NICHT
  haben → Fail wenn `$columns["media"].ContainsKey($verboten)`.
- **MUSS-abwesend:** Tabelle `release_media`, Spalte `anime.cover_image`.
- `media_assets`/`media_files` bleiben als "present" erwartet (nicht als legacy listen!).
- Warum neues Skript statt v2-Audit umbauen: dessen `$targetTables` (Z. 107) listet
  `release_media` als **erwartet** — würde den 106-Drop als "missing" fälschlich failen.
  D-Discretion erlaubt neues, analoges Skript. `-FailOnContractGaps`-Switch beibehalten.
> 450-Zeilen-Limit: Analog ist 304 Z.; media-core-Variante deutlich kürzer (kleinere Listen).

---

## Legacy-Abbau: Build-Break-Klassifizierung (§6, Cluster A–G)

**Legende:** `compile` = bricht `go build`/`go vet` sofort · `runtime-SQL` = kompiliert,
bricht erst zur Laufzeit (SQL gegen gedroppte Tabelle) · `isolated` = eigenes `main`/tote
Datei, kein Aufrufer · `test-guard` = Test asserted auf das Symbol, muss mit angepasst werden.

| Cluster | Kern-Artefakt(e) | Verifizierter Pfad | Break-Typ | Muss zusammen mit |
|---------|------------------|--------------------|-----------|-------------------|
| A – Dead 001 UUID-Schema | `001_create_media_tables.up/.down.sql` + `README.md` | `backend/database/migrations/` | isolated (nie ausgeführt) | — (schlicht löschen) |
| B – Dual-Upload-Legacy | `SupportsLegacyUploadSchema`, `useLegacyUploadSchema`, `if useLegacy`-Branches, `coerceMediaReference(…,useLegacy)` | `backend/internal/repository/media_upload.go` | **compile** | `media_upload_v2_compat.go` + Handler-Aufruf + `media_upload_test.go` (test-guard) |
| B – Compat-Interface | `legacyUploadSchemaDetector`, `shouldUseAnimePosterPathFallback` | `backend/internal/handlers/media_upload_v2_compat.go` | **compile** | Cluster-B gemeinsam |
| B – Legacy-DTO-Felder | `UploadMediaAsset{ID string,EntityType,EntityID,AssetType}` | `backend/internal/models/media_upload.go` | **compile (teilweise)** | Nur Legacy-Felder abspecken, DTO für V2 behalten (A3/Open Q1) |
| C – episode_version_images | Handler / Repo-Stub / Model | `backend/internal/handlers/episode_version_images_handler.go`, `backend/internal/repository/episode_version_image_repository.go`, `backend/internal/models/episode_version_image.go` | **compile** | `main.go:88` (Konstruktion) + `main.go:448` (Route) gemeinsam |
| C – Route-Wiring | `NewEpisodeVersionImagesHandler` / `GET /releases/:id/images` | `backend/cmd/server/main.go:88`, `:448` | **compile** | Cluster-C gemeinsam |
| D – release_media junction | `CreateReleaseMedia` + `DeleteMediaAsset`-Join-Liste | `backend/internal/repository/media_upload.go:24/290/373`, `media_upload_storage.go:54` | **compile** (Interface+Impl+Aufruf) | Interface `media_upload.go:24` + `media_upload_test.go:84` (Mock/test-guard) |
| D – release_media SQL-Reads | **siehe Enrichment unten** | mehrere Repos | **runtime-SQL** | Planner-Untersuchung nötig |
| E – anime.cover_image (Spalte) | `animeCoverImageSelectSQL`, `syncLegacyAnimeCoverImageV2`, `HasCoverImage`-Guard/Detektion | `backend/internal/repository/anime_v2.go:419/443`, `anime_assets.go:349/386/428/516-599`, `anime_schema.go:21/62-63` | **compile** (Schema-Feld) + runtime-SQL | Alle Cover-Legacy-Zweige; `cover_asset_id`/`cover_resolved_url` bleiben |
| E – migrate-covers CLI | ganzes Verzeichnis | `backend/cmd/migrate-covers/` | isolated (eigenes `main`) | — |
| E – Ops-Skripte | report-/remediate-cover-image | `scripts/report-cover-image-state.ps1`, `scripts/remediate-cover-image.ps1` | isolated | — |
| F – /covers + upload-cover FE | Route-Handler + `deleteUploadedCoverFile` | `frontend/src/app/covers/[file]/route.ts`, `frontend/src/app/api/admin/upload-cover/route.ts`, `frontend/src/lib/api.ts:5936` | **typecheck** (Aufrufer) | `AdminAnimeOverviewClient.tsx`-Aufrufer bereinigen (D-03) |
| G – asset_lifecycle | Service + Errors + Model + Repo (+Tests) | `backend/internal/services/asset_lifecycle_service.go`(+`_errors.go`,`_test.go`), `models/asset_lifecycle.go`, `repository/asset_lifecycle_audit.go`,`_subjects.go`,`_repository_test.go` | **compile** (großer verzahnter Cluster) | `main.go:306-307` (Konstruktion) + `handlers/media_upload.go` (Feld/Nutzung) + `media_upload_test.go` |

**Cluster G Wiring (verifiziert):** `main.go:306` `NewAssetLifecycleRepository`, `:307`
`NewAssetLifecycleService`. Handler `media_upload.go` hält Service-Feld → nach Entkopplung
muss der generische V2-Upload weiter kompilieren (Pitfall 5). `go build ./...` nach jedem Schritt.

**NICHT anfassen (Verwechslungsgefahr, verifiziert):**
- `GetGroupReleaseImages` (`group_contributors_handler.go:250`, Route `main.go:358`) —
  lebender Public-Pfad über `release_version_media`, NICHT `episode_version_images`.
- `cover_asset_id`/`cover_source`/`cover_resolved_url`/`cover_provider_key` — aktueller
  Cover-Mechanismus, bleibt bis Phase 108.
- `media_assets`/`media_files` — bleiben in 106 (Grenzbefund A1).

---

## Enrichment / Risiko-Befunde (über RESEARCH hinaus)

Beim Verifizieren der Call-Sites gefunden — **planungsrelevant, weil RESEARCHs
`release_media`-Inventar (Cluster D) unvollständig war**:

**1. `release_media` hat mehr lebende SQL-Call-Sites als RESEARCH (nur `CreateReleaseMedia`
+ Delete-Join) gelistet hat.** Exakte word-boundary-grep (`\brelease_media\b`, ohne
`release_version_media`) liefert zusätzlich **lesende** SQL-Referenzen, die nach
`DROP TABLE release_media` zur **Laufzeit** brechen (SQL-Error, kein Compile-Fehler):
- `backend/internal/repository/admin_content_anime_delete.go:247` und `:280` —
  `AND NOT EXISTS (SELECT 1 FROM release_media rm WHERE rm.media_id = ma.id)` (Cleanup-Guard beim Anime-Delete).
- `backend/internal/repository/anime_assets.go:539` — `SELECT 1 FROM release_media WHERE media_id = $1`.
- `backend/internal/repository/episode_version_repository_read_helpers.go:371` —
  `FROM release_media rm` (Release-Assets-Lesepfad).

**2. Test-Guards, die auf `release_media`-Strings asserten** — brechen `go test`, wenn
die SQL-Strings entfernt werden, und müssen bewusst mit angepasst werden:
- `backend/internal/repository/runtime_authority_test.go:161-163` — asserted, dass der
  Read-Helper `from release_media rm` **enthält** (positive Assertion!). Konflikt-Kandidat:
  Dieser Test erzwingt aktuell die Existenz des Lesepfads.
- `backend/internal/repository/member_profile_repository_test.go:295-296` — asserted, dass
  der Feed `release_media` **nicht** substituiert (bleibt gültig).
- `backend/internal/repository/theme_segment_render_cache_test.go:26/95/97` und
  `backend/internal/handlers/segment_validation_test.go:187` — referenzieren `release_media`
  als String/Forbidden-Liste.

> **Planner-Handlungsbedarf:** RESEARCH behauptet "release_media ... Drop unproblematisch".
> Das stimmt für die reine FK-Topologie, aber es gibt **lesende Live-Call-Sites +
> mindestens einen Test, der den Lesepfad erzwingt** (`runtime_authority_test.go`). Vor dem
> `DROP TABLE release_media` müssen diese Lese-Call-Sites und ihre Test-Guards mit-bereinigt
> werden — sonst grüner `go build`, aber roter `go test` / Laufzeit-SQL-Fehler. Cluster D ist
> größer als das §6-Wortlaut-Inventar suggeriert. (Ob der Read-Helper-Pfad selbst tot ist
> oder mit-entfernt werden muss, ist ein offener Planungspunkt.)

**3. `cover_image` in ~30 Go-Dateien** (grep bestätigt) — die überwältigende Mehrheit ist
das **abgeleitete DTO-Feld** `cover_image` (JSON, COALESCE-Quelle), das bleibt (Pitfall 3).
Nur die **Spalten-lesenden/-schreibenden** Stellen aus Cluster E (`anime_v2.go`,
`anime_assets.go`, `anime_schema.go`) ändern sich. Die grep-Suite für SC4 muss daher
**Spalte vs. DTO-Feld trennen** — ein pauschales `grep cover_image` ist NICHT das SC4-Gate.

---

## Shared Patterns

### TEXT + CHECK-Enum (D-06)
**Quelle:** `database/migrations/0129_release_playback_entitlements.up.sql:18-29`
**Anwenden auf:** alle 5 Enum-Felder in 0131 (`chk_media_kind`, `chk_media_source`,
`chk_media_processing_status`, `chk_media_variant_variant`, `chk_media_variant_status`).
`TEXT NOT NULL` + benannter `CONSTRAINT chk_<table>_<col> CHECK (col IN ('kleinwert', …))`.

### Migrations-Content-Test (file-read assert)
**Quelle:** `backend/internal/migrations/release_content_source_groups_test.go` (komplett)
**Anwenden auf:** `media_core_schema_test.go` — `os.ReadFile("../../../database/migrations/…")`
+ `strings.Contains`-Needles (positiv) + Anti-Pattern-Negativ-Assertions.

### PS-DB-Audit-Gate (Identitäts-Guard + Fail-on-Gap)
**Quelle:** `scripts/schema-v2-audit.ps1:8-22` (Guard/Helper), `:232-237/295-303` (Fail-Gate)
**Anwenden auf:** `media-core-contract-check.ps1` — Docker-psql-Helper, harte
`team4s_v2`/`team4s`-Identitätsprüfung, `-FailOnContractGaps`-throw.

### Append-only Down-Migration (schlanke Umkehr)
**Quelle:** `database/migrations/0130_release_content_source_groups.down.sql` (komplett)
**Anwenden auf:** `0131_media_core_schema.down.sql` — `IF EXISTS`-tolerant, umgekehrte
Reihenfolge, nur strukturell reversibel (kein Datenerhalt).

---

## No Analog Found

Keine. Alle 3 CREATE-Ziele haben einen exakten oder role-match Analog im Repo. Diese Phase
führt bewusst **keine** neuen externen Muster ein (reine Schema-/Abbau-Phase).

---

## Metadata

**Analog search scope:** `database/migrations/` (0129/0130), `backend/internal/migrations/`,
`scripts/`, `backend/internal/{repository,handlers,models,services}/`, `backend/cmd/`.
**Files scanned/gelesen:** 0129 up, 0130 up+down, release_content_source_groups_test.go,
schema-v2-audit.ps1 (komplett), schema-v2-contract-check.ps1; plus grep-Verifikation der
Legacy-Call-Sites (SupportsLegacyUploadSchema, asset_lifecycle, episode_version_image,
release_media word-boundary, cover_image).
**Pattern extraction date:** 2026-07-21
