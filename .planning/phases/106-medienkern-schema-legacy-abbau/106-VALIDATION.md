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
| **106-02/106-08 (Blocker 2, 2026-07-22)** | SC4-Scan auf die vier Quell-Wurzeln `backend/internal`, `backend/cmd`, `frontend/src`, `shared/contracts` beschränkt. `database/migrations/**` (0018/0046 bleiben per D-01/A4) und `scripts/**` (`reset-local-schema-cutover-data.ps1`, `schema-v2-audit.ps1` — Phase-110-Scope) tragen `episode_version_image` dauerhaft; ein Repo-Root-Scan hätte per Konstruktion nie Exit 0 erreicht. |
| **106-09 (Blocker 1, 2026-07-22)** | `anime_relations.go` benennt den Sub-Query-Ausgabenamen `cover_image` → `cover_url` um (Option A). Der pgx-Scan ist positional, der JSON-DTO-Feldname bleibt `cover_image`. Damit trifft die Signatur `,\s*cover_image` keine bewusst behaltene Kennung mehr und die vollständige Signaturliste bleibt in allen Gates erhalten. |
| **106-05 (Warning 1, 2026-07-22)** | Präzise Call-Site-Liste für `anime_assets.go`: `:349/:386/:966/:981` sind `cover_image`-Zuweisungen in LEBENDEN UPDATEs — nur diese Zeile fällt, Geschwister-Spalten (`cover_asset_id`, `cover_source`, `cover_resolved_url`, `cover_provider_key`) bleiben. Vollständig entfernt werden nur `syncLegacyAnimeCoverImageV2` (:566-599, Aufruf :428) und der `HasCoverImage`-Block (:516-524). |
| 106-05 (Warning 4) | `runtime_authority_test.go` aus `files_modified` entfernt (Task 2 ist reiner Regressionsnachweis); `anime_test.go` als tatsächlich betroffene Testdatei ergänzt. |
| 106-06 (Warning 3) | asset_lifecycle-Entkopplung ausspezifiziert: benannte `media_upload.*`-Fehlercodes, lokaler Fehlertyp, kanonische Speicherpfad-Formel, OpenAPI-Contract nachgezogen. |
| 106-08 (Warning 5) | Migrationsdatei per Glob `*_media_core_schema.up.sql` mit Existenzprüfung statt hartkodiertem `0131_*` (FALSE-PASS-Muster beseitigt); Live-Verifikation der vier öffentlichen Cover-Oberflächen ergänzt. |

**Revision 2026-07-22 (2. Lauf — RESEARCH-Refresh P-1…P-8, 3 Blocker):** Der Forschungs-Refresh (`106-RESEARCH.md`, Commit f5f829a5) hat die §6-Prämisse „ist das wirklich tot?" ein drittes Mal widerlegt. Acht Befunde ändern den Plan-Satz:

| Befund | Plan | Änderung |
|--------|------|----------|
| **P-1 (BLOCKER)** | 106-04 | `UploadMediaAsset.ID` ist der OUT-Parameter des lebenden V2-Inserts (`media_upload.go:222`), kein Legacy-Feld. DTO-Shrink auf die drei tatsächlich toten Felder `EntityType`/`EntityID`/`AssetType` verengt, Feld-für-Feld-Tabelle im Plan. Struct-Literal-Anpassung `media_upload_test.go:206` ergänzt (fehlte). Alle `EntityType`-greps auf den `UploadMediaAsset`-Struct-Body gescopet, weil `UploadRequest` die Felder behält. |
| **P-2 (BLOCKER)** | 106-05 | `runtime_authority_test.go:120` assertiert `synclegacyanimecoverimagev2(...)` POSITIV; der eigene Verify (`go test -run Anime`) trifft ihn. Datei wieder in `files_modified`, aber mit chirurgischem Umfang (GENAU EINE Slice-Zeile). Task-2-Kriterium „byte-identisch" auf die release_media-Assertionen `:156-167` verengt und auf positive grep-Assertionen umgestellt. Kommentar-Bereinigung `anime_assets.go:1710-1711` auf den Teilsatz ` and cover_image sync` verengt (Fragment :124 muss stehen bleiben). |
| **P-3 (BLOCKER)** | 106-03, 106-02, 106-08 | PO-Entscheid: OpenAPI-Contract wird in 106 mitgezogen, `shared/contracts` BLEIBT SC4-Scan-Wurzel. **NEUER Task 106-03-03** entfernt den Pfad `/api/v1/releases/{releaseId}/images` (:6522, `operationId: listReleaseImages` :6526) und die zwei verwaisten Schemas `EpisodeVersionImage` (:12612) / `EpisodeVersionImagesResponse` (:12655) — mit vorgeschaltetem Referenz-Guard (erwartete Trefferzahl 6) und YAML-Parse-Gate. Ohne diesen Task war SC4 Exit 0 strukturell unerreichbar. |
| **P-4** | 106-02, 106-08 | Suchbegriff `episode_version_image` (0 Content-Treffer) durch `EpisodeVersionImage` (CamelCase) ersetzt; Datei-Abwesenheitsprüfung der drei Go-Dateien ergänzt; Case-Verhalten der Suite explizit als **case-insensitiv** festgelegt und im Skript zu dokumentieren (Ursache von P-3 und P-4 war die Diskrepanz zwischen case-sensitivem `grep` in der Planung und case-insensitivem `Select-String` im Gate). |
| **P-5 (PO-Entscheid)** | 106-06 | Entity-Existenzprüfung UND Audit-Schreibung werden **migriert statt gelöscht** — der Phasenzweck ist der Wegfall der ORDNERPROVISIONIERUNG, nicht der Validierungs-/Audit-Logik (CLAUDE.md: „Admin-Aktionen brauchen Audit-Attribution nach User-ID"; ASVS V4: 106 darf die Lage eines noch ungegateten Endpoints nicht verschlechtern). **NEUER Task 106-06-01** legt `models/media_upload_audit.go`, `repository/media_upload_subjects.go` (`LookupUploadSubject`) und `repository/media_upload_audit.go` (`RecordMediaUploadEvent`, `mutation_kind = anime.media_upload.provision`) an und erweitert `MediaUploadRepo`. Fehlercode-Migration auf **fünf** Codes erweitert (`media_upload.invalid_entity_id`, `media_upload.audit_failed`); ersatzlos entfällt nur `asset_lifecycle.invalid_structure`. |
| **P-6 (Planner-Entscheid)** | 106-03, 106-08 | `ScreenshotGallery` ist ein live gemounteter Consumer der entfernten Route. Gewählt: **Route fällt in 106, Komponente bleibt bis Phase 109** — beide vom Reviewer angebotenen Alternativen kollidieren mit einer LOCKED-Entscheidung (Route behalten ↔ D-04; Komponente mitlöschen ↔ D-03). Verhaltensneutral, weil das Backend-Repo ein Dauer-Stub ist (heute HTTP 500, danach 404, derselbe `!response.ok`-Zweig). Als bewusst deferrierter Consumer im Plan geführt + Live-Schritt 5b im 106-08-Checkpoint. |
| **P-7** | 106-07 | Die referenzierte POST-`upload-cover`-Clientfunktion existiert nicht (genau EIN `upload-cover`-Treffer in `api.ts`). Anweisung auf `deleteUploadedCoverFile` (:5936-5957) präzisiert + Nachbarschaftsguard (`getAdminGenreTokens` unversehrt, Diff-Größe 20–26 entfernte Zeilen). |
| **P-8 + A4** | 106-08, 106-02 | Der `/covers/`-404-Live-Check ist kein Signal (`frontend/public/covers/` wird weiter statisch bedient; 404 kam auch vom alten Handler bei fehlender Datei) → als Fail-Kriterium gestrichen, Nachweis ist die Datei-Abwesenheit der Handler. Neu: **A4-Schemaprüfung** `\d anime` im Live-Checkpoint (`slug` vorhanden — sonst hat 106-10 lebende Pfade entfernt; `cover_image` abwesend). |

**Wave-Graph unverändert** (W1{01,02} W2{03,04,05,07} W3{06,09} W4{10} W5{08}) — die neuen `files_modified`-Einträge erzeugen keine Intra-Wellen-Überschneidung:
`shared/contracts/openapi.yaml` wird von 106-03 (W2, nur Release-Images-Blöcke) und 106-06 (W3, nur `asset_lifecycle`-Codes + `provisioning`) berührt;
`runtime_authority_test.go` von 106-05 (W2, nur das `syncLegacyAnimeCoverImageV2`-Fragment) und 106-10 (W4, nur die `cover_image`-Fragmente :18/:21);
`repository/media_upload.go` von 106-04 (W2) und 106-06 (W3).

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
- **Ab Welle 3 zusätzlich:** `grep -rnE "a\.cover_image|,[[:space:]]*cover_image|cover_image[[:space:]]*=|SET cover_image" backend/internal backend/cmd --include=*.go | grep -v 'json:' | grep -v 'applyString'` — muss am Ende von Welle 4 leer sein. **Scope ist bewusst eng** (nur Go-Backend): `frontend/src` trägt `anime.cover_image` als legitimen TS-DTO-Zugriff, `database/migrations/**` und `scripts/**` bleiben per D-01/A4 bzw. Phase-110-Scope unangetastet. Der einzige komma-präfixierte Bezeichner, den Phase 106 nicht löscht, ist der Sub-Query-Ausgabename in `anime_relations.go` — er wird in 106-09 Task 2 in `cover_url` umbenannt (Blocker-1-Fix), sodass diese Signaturliste vollständig gültig bleibt.
- **Before `/gsd:verify-work`:** Vollständige Kette 1→n gegen leere DB grün + `scripts/media-core-contract-check.ps1 -FailOnContractGaps` grün + grep-Suite (SC4) `scripts/media-core-legacy-grep.ps1` exit 0
- **Max feedback latency:** 60 Sekunden

---

## Wave Graph (nach Revision 2026-07-22)

| Wave | Plans | Begründung der Kante |
|------|-------|----------------------|
| 1 | 106-01, 106-02 | Wave-0-Artefakte (Migration + Content-Test, Gate-Skripte); keine Abhängigkeit |
| 2 | 106-03, 106-04, 106-05, 106-07 | benötigen 106-01; untereinander keine `files_modified`-Überschneidung (nachgerechnet nach P-2/P-3: 106-03 ergänzt `shared/contracts/openapi.yaml`, 106-05 ergänzt `runtime_authority_test.go` — beide Dateien werden von keinem anderen W2-Plan berührt) |
| 3 | 106-06, 106-09 | 106-06 nach 106-03 (`main.go`, `shared/contracts/openapi.yaml`) und 106-04 (`repository/media_upload.go`, `models/media_upload.go`, `handlers/media_upload_test.go`); 106-09 nach 106-05 (`anime_v2.go`, `anime_test.go`); 106-06 und 106-09 haben untereinander keine gemeinsame Datei |
| 4 | 106-10 | nach 106-09 (`anime_test.go`) und 106-05 (`HasCoverImage` entfernt) |
| 5 | 106-08 | Phasen-Gate; wendet Migration 0131 erstmals an — muss nach ALLEN Code-Umstellungen laufen |

Keine Zyklen, keine Vorwärtsreferenzen; innerhalb jeder Welle keine `files_modified`-Überschneidung.

**Wellenübergreifend geteilte Dateien (zulässig, weil in verschiedenen Wellen — nach dem RESEARCH-Refresh dokumentiert):**

| Datei | Pläne (Welle) | Disjunkter Umfang |
|-------|---------------|-------------------|
| `shared/contracts/openapi.yaml` | 106-03 (W2), 106-06 (W3) | 106-03: Release-Images-Pfad + zwei Schemas (:6522/:12612/:12655). 106-06: `asset_lifecycle`-Fehlercodes (:1475/:1481) + `provisioning` (:9058) |
| `backend/internal/repository/runtime_authority_test.go` | 106-05 (W2), 106-10 (W4) | 106-05: GENAU die Zeile `synclegacyanimecoverimagev2(...)` (:120). 106-10: die `cover_image`-Query-Fragmente (:18/:21). Die release_media-Assertionen (:156-167) bleiben in beiden unangetastet (D-07) |
| `backend/internal/repository/media_upload.go` | 106-04 (W2), 106-06 (W3) | 106-04: Legacy-Dualpfad-Abbau. 106-06: Interface-Erweiterung um `LookupUploadSubject`/`RecordMediaUploadEvent` |
| `backend/internal/models/media_upload.go`, `backend/internal/handlers/media_upload_test.go` | 106-04 (W2), 106-06 (W3) | 106-04: DTO-/Mock-Shrink (Cluster B). 106-06: `Provisioning`-Feld + Lifecycle-Mocks + neue Interface-Mocks |
| `backend/cmd/server/main.go` | 106-03 (W2), 106-06 (W3) | 106-03: episode_version_images-Konstruktion + Route. 106-06: AssetLifecycle-Konstruktion + Injektion |
| `backend/internal/repository/anime_test.go` | 106-05 (W2), 106-09 (W3), 106-10 (W4) | jeweils die Fragment-Assertionen der eigenen entfernten Queries |
| `backend/internal/repository/anime_v2.go` | 106-05 (W2), 106-09 (W3) | 106-05: `cover_image`-COALESCE-Zweig. 106-09: Alias-Parametrisierung + LATERAL-Extraktion |

**Kritische Sequenz-Zusicherung:** Migration 0131 wird in Welle 1 nur AUTHORED (Datei-Content-Test, kein DB-Zugriff) und erst im Live-Checkpoint 106-08-02 (Welle 5) ANGEWENDET. Damit laufen 106-05, 106-09 und 106-10 nachweislich vor dem `DROP COLUMN cover_image`.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 106-01-01 | 01 | 1 | SC1 | T-106-01-01, T-106-01-03 | RED: Migrations-Content-Test schlägt kontrolliert fehl (0131 fehlt noch); enthält D-07-Negativ-Assertion auf `release_media` | migration-content (RED) | `cd backend && go test ./internal/migrations/... -run MediaCore 2>&1 \| grep -qiE "no such file\|cannot find\|0131"` | ❌ W0 | ⬜ pending |
| 106-01-02 | 01 | 1 | SC1, SC2, SC3 | T-106-01-01, T-106-01-02, T-106-01-03 | 0131 legt `media`/`media_variant` an, KEINE verbotenen Spalten, DROP NUR `anime.cover_image`, kein `release_media`; Nummern-Guard bestanden; Datei per Glob `*_media_core_schema.*.sql` eindeutig auflösbar | migration-content (GREEN) | `[ "$(ls database/migrations/*_media_core_schema.up.sql \| wc -l)" = "1" ] && cd backend && go test ./internal/migrations/... -run MediaCore` | ❌ W0 | ⬜ pending |
| 106-02-01 | 02 | 1 | SC3 | T-106-02-01, T-106-02-03 | Contract-Check-Skript syntaktisch valide; `anime.cover_image` MUSS-abwesend, `release_media`/`media_assets`/`media_files` erwartet-VORHANDEN | script-parse | `powershell -NoProfile -ExecutionPolicy Bypass -Command "$null=[ScriptBlock]::Create((Get-Content -Raw 'scripts/media-core-contract-check.ps1')); Write-Output PARSE-OK"` | ❌ W0 | ⬜ pending |
| 106-02-02 | 02 | 1 | SC4 | T-106-02-02, T-106-02-04 | grep-Suite valide; KEIN `release_media`/`CreateReleaseMedia`-Term (D-07); `cover_image`-SPALTE aktiv gesucht und vom DTO-Feld getrennt (Warning 2); kein False-Fail auf `animeCoverImageSelectSQL` | script-parse + D-07-Guard + Warning-2-Guard | `powershell -NoProfile -ExecutionPolicy Bypass -Command "$null=[ScriptBlock]::Create((Get-Content -Raw 'scripts/media-core-legacy-grep.ps1')); if ((Select-String -Path 'scripts/media-core-legacy-grep.ps1' -Pattern 'release_media\|CreateReleaseMedia').Count -gt 0) { throw 'D-07 violation' }; if ((Select-String -Path 'scripts/media-core-legacy-grep.ps1' -Pattern 'cover_image').Count -eq 0) { throw 'SC4 gap: cover_image not scanned' }; Write-Output PARSE-OK"` | ❌ W0 | ⬜ pending |
| 106-03-01 | 03 | 2 | SC2 | — | Totes UUID-Schema + Cover-Ops-Werkzeuge gelöscht, build/vet grün | build/delete | `cd backend && go build ./... && go vet ./...` (+ Datei-/Dir-Abwesenheit) | ✅ | ⬜ pending |
| 106-03-02 | 03 | 2 | SC2 | T-106-03-01, T-106-03-05 | `episode_version_images`-Strecke + Route `/releases/:id/images` entfernt, Gruppenpfad und D-07-Assets-Route bleiben; Frontend unberührt (P-6: `ScreenshotGallery` bewusst deferred) | build/grep | `cd backend && go build ./... && go vet ./... && ! grep -rqi "episode_version_image\|ListReleaseImages\|EpisodeVersionImage" internal/ cmd/ --include=*.go && grep -q "releases/:id/assets" cmd/server/main.go` | ✅ | ⬜ pending |
| **106-03-03 (NEU, P-3)** | 03 | 2 | SC2, SC4 | T-106-03-02, T-106-03-03, T-106-03-04 | OpenAPI-Contract nachgezogen: Pfad `/api/v1/releases/{releaseId}/images` + `operationId: listReleaseImages` + die zwei verwaisten Schemas entfernt; Referenz-Guard (6 erwartete Treffer) vorgeschaltet; D-07-Pfad `/assets` und der 106-06-Scope (`asset_lifecycle`, `provisioning`) unverändert; YAML bleibt parsbar | contract/yaml-parse/grep | `python -c "import yaml;yaml.safe_load(open('shared/contracts/openapi.yaml',encoding='utf-8'))" && ! grep -qi "EpisodeVersionImage\|listReleaseImages" shared/contracts/openapi.yaml && grep -q "listReleaseAssets" shared/contracts/openapi.yaml && [ "$(grep -c asset_lifecycle shared/contracts/openapi.yaml)" = "2" ]` | ✅ | ⬜ pending |
| 106-04-01 | 04 | 2 | SC2 | T-106-04-01, T-106-04-02, T-106-04-04 | Legacy-Dualpfad entfernt, V2-Upload bleibt; **P-1: `UploadMediaAsset.ID` erhalten** (Out-Parameter des V2-Inserts `media_upload.go:222`), nur `EntityType`/`EntityID`/`AssetType` fallen — Negativ-grep auf den `UploadMediaAsset`-Struct-Body gescopet, `UploadRequest` unverändert; `INSERT INTO release_media` erhalten (D-07) | build/grep | `cd backend && go build ./... && ! grep -rq "SupportsLegacyUploadSchema\|shouldUseAnimePosterPathFallback\|legacyUploadSchemaDetector" internal/ --include=*.go --exclude=*_test.go && grep -q "asset.ID = strconv.FormatInt" internal/repository/media_upload.go && grep -q "INSERT INTO release_media" internal/repository/media_upload.go` (zzgl. der beiden Struct-Body-gescopeten Feldzählungen aus 106-04 Task 1) | ✅ | ⬜ pending |
| 106-04-02 | 04 | 2 | SC2 | T-106-04-03, T-106-04-04 | Cluster-B-Test-Mock entfernt; **P-1: Struct-Literal `media_upload_test.go:206` mitgezogen** (drei Felder weg, `ID:` bleibt — sonst `unknown field`-Compile-Fehler); Mock `CreateReleaseMedia` erhalten (D-07); Upload-Tests grün | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/handlers/... -run MediaUpload && ! grep -q "SupportsLegacyUploadSchema" internal/handlers/media_upload_test.go && grep -q "CreateReleaseMedia" internal/handlers/media_upload_test.go` | ✅ | ⬜ pending |
| 106-05-01 | 05 | 2 | SC2 | T-106-05-01, T-106-05-02, T-106-05-03 | `anime.cover_image`-Spalten-Zugriffe entfernt; DTO-Feld + `cover_asset_id` intakt; `release_media`-UNION-Zweig nicht mitentfernt; `anime_test.go`-Fragmente gezogen; **P-2: `runtime_authority_test.go` zieht GENAU das `syncLegacyAnimeCoverImageV2`-Fragment (:120)** — Fragment :124 und die release_media-Assertionen bleiben; Kommentar-Bereinigung `anime_assets.go:1711` auf ` and cover_image sync` verengt | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/repository/... -run Anime && ! grep -rq "syncLegacyAnimeCoverImageV2\|HasCoverImage" internal/ --include=*.go && grep -q "release_media" internal/repository/anime_assets.go && grep -q "v2 remains authoritative once anime_media exists" internal/repository/runtime_authority_test.go && ! grep -q "cover_image sync" internal/repository/anime_assets.go && [ "$(git diff HEAD -U0 -- internal/repository/runtime_authority_test.go \| grep -c '^-[^-]')" = "1" ]` — **Blocker-1-Fix:** die Umfangsgrenze (genau eine entfernte Zeile) wird HIER geprüft, vor dem Task-Commit, nicht mehr in 106-05-02 | ✅ | ⬜ pending |
| 106-05-02 | 05 | 2 | SC2 | T-106-05-02 | D-07-Regressionsnachweis (**P-2 verengt**): release_media-Lesepfad, Handler und Route unverändert; statt Byte-Identität der ganzen Testdatei jetzt positive Fragment-Assertionen auf `:156-167`; die Diff-Umfangsgrenze („genau eine entfernte Zeile“) liegt per **Blocker-1-Fix** in 106-05-01 (nach dem Task-Commit wäre der Arbeitsbaum-Diff leer), hier verbleiben commit-unabhängige Zustandsgegenproben (`synclegacyanimecoverimagev2` == 0, `removeanimeposterassetsv2` == 1) | test/grep/diff | `cd backend && go test ./internal/repository/... -run RuntimeAuthority && go test ./internal/handlers/... -run ReleaseAssets && grep -q "ListReleaseAssets" internal/repository/episode_version_repository_read_helpers.go && grep -q "releases/:id/assets" cmd/server/main.go && grep -q "from release_media rm" internal/repository/runtime_authority_test.go && grep -q "episodeversionrepo.listreleaseassets" internal/repository/runtime_authority_test.go` | ✅ | ⬜ pending |
| 106-07-01 | 07 | 2 | SC2 | T-106-07-01 | Cover-Route-Handler gelöscht (build-breaking FE, D-03); **P-7: GENAU EINE api.ts-Funktion `deleteUploadedCoverFile` entfernt** — eine POST-Variante existiert nicht; Aufrufer bereinigt + Nachbarschaftsguard; typecheck grün | typecheck/delete/grep | `cd frontend && npm run typecheck && [ ! -f "src/app/covers/[file]/route.ts" ] && [ ! -f src/app/api/admin/upload-cover/route.ts ] && ! grep -rq "deleteUploadedCoverFile\|upload-cover" src/lib src/app --include=*.ts --include=*.tsx && grep -q "export async function getAdminGenreTokens" src/lib/api.ts` | ✅ | ⬜ pending |
| **106-06-01 (NEU, P-5)** | 06 | 3 | SC2 | T-106-06-04, T-106-06-05 | Entity-Existenzprüfung und Audit-Schreibung aus dem `asset_lifecycle`-Namensraum **herausmigriert statt gelöscht**: neue `models/media_upload_audit.go`, `repository/media_upload_subjects.go` (`LookupUploadSubject`), `repository/media_upload_audit.go` (`RecordMediaUploadEvent`, `mutation_kind = anime.media_upload.provision`); `MediaUploadRepo`-Interface erweitert | build/grep | `cd backend && go build ./... && grep -q "INSERT INTO admin_anime_mutation_audit" internal/repository/media_upload_audit.go && grep -q "FROM anime WHERE id" internal/repository/media_upload_subjects.go && grep -q "anime.media_upload.provision" internal/repository/media_upload_audit.go && grep -q "LookupUploadSubject" internal/repository/media_upload.go` | ❌ W0 (neue Dateien) | ⬜ pending |
| 106-06-02 | 06 | 3 | SC2 | — | `asset_lifecycle`-Dateien (7) gelöscht + main.go entkoppelt (Konstruktion :306-307 **und** Injektion `.WithLifecycleService` :309-310); die in Task 1 migrierten Dateien unversehrt | build/delete/grep | `[ ! -f backend/internal/services/asset_lifecycle_service.go ] && [ ! -f backend/internal/models/asset_lifecycle.go ] && [ ! -f backend/internal/repository/asset_lifecycle_subjects.go ] && ! grep -qi "AssetLifecycle" backend/cmd/server/main.go && [ -f backend/internal/repository/media_upload_audit.go ]` | ✅ | ⬜ pending |
| 106-06-03 | 06 | 3 | SC2 | T-106-06-01, T-106-06-02, T-106-06-03, T-106-06-04, T-106-06-05 | Handler entkoppelt; **fünf** Fehlercodes definiert nach `media_upload.*` migriert (inkl. `invalid_entity_id`, `audit_failed`; nur `invalid_structure` entfällt) + OpenAPI nachgezogen; kanonische Speicherpfad-Formel; Traversal-Schutz erhalten; **P-5: `LookupUploadSubject` + `RecordMediaUploadEvent` im Upload-Flow verdrahtet** inkl. zwei neuer Regressionstests (400 bei unbekannter `entity_id`; genau ein Audit-Event je erfolgreichem Upload) | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/handlers/... -run MediaUpload && ! grep -rqi "asset_lifecycle" internal/ cmd/ --include=*.go && ! grep -qi "asset_lifecycle" ../shared/contracts/openapi.yaml && grep -q "media_upload.invalid_entity_id" ../shared/contracts/openapi.yaml && grep -q "LookupUploadSubject" internal/handlers/media_upload.go && grep -q "RecordMediaUploadEvent" internal/handlers/media_upload.go && grep -q "isUploadPathWithinBase" internal/handlers/media_upload.go` | ✅ | ⬜ pending |
| 106-09-01 | 09 | 3 | SC2 | T-106-09-03 | Alias-parametrisierte Cover-Expression + Poster-LATERAL zentral; genau eine Quelle der Wahrheit; keine Rohspalte in der neuen Expression | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/repository/... -run AnimeCoverImageSelectSQL && grep -q "animeCoverPosterLateralSQL" internal/repository/anime_cover_sql.go` | ✅ | ⬜ pending |
| 106-09-02 | 09 | 3 | SC2 | T-106-09-01, T-106-09-04, T-106-09-05 | Öffentliche Leser (Watchlist ×2, Anime-Relationen, Gruppenprojekte) lesen abgeleitete Quelle; Sub-Query-Ausgabename in `anime_relations.go` → `cover_url` (Blocker-1-Fix); Scan-/Spaltenreihenfolge und JSON-DTO-Namen unverändert; `release_media` unberührt | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/repository/... && [ -z "$(grep -nE 'a\.cover_image\|,[[:space:]]*cover_image' internal/repository/watchlist.go internal/repository/anime_relations.go internal/repository/fansub_repository.go)" ] && [ "$(grep -c 'cover_url' internal/repository/anime_relations.go)" -ge 2 ]` | ✅ | ⬜ pending |
| 106-09-03 | 09 | 3 | SC2 | T-106-09-01, T-106-09-02 | Admin-Leser umgestellt; `loadCurrentProjects` GROUP-BY-konsistent (`a.cover_resolved_url` statt `a.cover_image`); Test-Assertionen gezogen | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/repository/... ./internal/handlers/... && ! grep -rnE "a\.cover_image" internal/repository/anime_relations_admin.go internal/repository/admin_content_anisearch.go internal/repository/admin_content_anime_themes.go internal/repository/member_profile_repository.go` | ✅ | ⬜ pending |
| 106-10-01 | 10 | 4 | SC2 | T-106-10-01, T-106-10-04 | Legacy-Lese-Fallbacks (`anime.go` List/GetByID/buildAnimeListWhere, `admin_content_sync.go`) entfernt; V2-Pfade unbedingt; `runtime_authority_test.go`-Fragmente gezogen, D-07-Assertionen erhalten | build/test/grep | `cd backend && go build ./... && go vet ./... && go test ./internal/repository/... && ! grep -qE "cover_image" internal/repository/anime.go && ! grep -qE "cover_image" internal/repository/admin_content_sync.go && grep -q "release_media" internal/repository/runtime_authority_test.go` | ✅ | ⬜ pending |
| 106-10-02 | 10 | 4 | SC2, SC4 | T-106-10-01, T-106-10-02, T-106-10-03 | Legacy-Create/Update/Delete-Zweige entfernt; beide `release_media`-Referenzguards erhalten; repo-weit keine `cover_image`-SQL-Signatur mehr | build/test/grep-gate | `cd backend && go build ./... && go vet ./... && go test ./internal/repository/... ./internal/handlers/... && ! grep -rq "createAnimeLegacy" internal/ --include=*.go && [ "$(grep -c 'release_media' internal/repository/admin_content_anime_delete.go)" -ge 2 ] && [ -z "$(grep -rnE 'a\.cover_image\|,[[:space:]]*cover_image\|cover_image[[:space:]]*=\|SET cover_image' internal cmd --include=*.go \| grep -v 'json:' \| grep -v 'applyString')" ]` | ✅ | ⬜ pending |
| 106-08-01 | 08 | 5 | SC3, SC4 | T-106-08-01 … T-106-08-06 | Statische Gates: build/vet + Migrations-/Legacy-Test-Guards + grep-Suite exit 0 + D-07-Statik + cover_image-Spalten-Statik leer + Migration per Glob eindeutig aufgelöst (kein FALSE PASS) + **P-8: Datei-Abwesenheit der Route-Handler/Legacy-Dateien** (Ersatz für den untauglichen Live-404) + **P-3: Contract-Sauberkeit** (`listReleaseImages`/`EpisodeVersionImage`/`asset_lifecycle` == 0, `listReleaseAssets` und `media_upload.invalid_entity_id` vorhanden) | build/test/grep-gate | `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/media-core-legacy-grep.ps1 && cd backend && go build ./... && go vet ./... && go test ./internal/migrations/... && MIG=$(ls ../database/migrations/*_media_core_schema.up.sql) && [ -f "$MIG" ] && ! grep -q "release_media" "$MIG"` — **CWD-Fix (Blocker 2):** die grep-Suite läuft AUS DEM REPO-ROOT, nicht in der `cd backend`-Kette (ihre Scan-Wurzeln sind repo-root-relativ); zusätzlich trägt sie seit 106-02 Task 2 einen `$PSScriptRoot`-Repo-Root-Guard | ✅ (W0-Skripte nach 106-02) | ⬜ pending |
| 106-08-02 | 08 | 5 | SC3 | T-106-08-01, T-106-08-02, T-106-08-03, T-106-08-07, T-106-08-08 | Live-Gate (checkpoint): Kette 1→n auf leerer DB + Contract-Check + **A4-Schemaprüfung `\d anime`** (`slug` vorhanden, `cover_image` abwesend) + **P-6-Regression Screenshot-Sektion** + D-07-Regression + **cover_image-Live-Regression auf vier öffentlichen Oberflächen**; `/covers/` nur noch dokumentierend, kein Fail-Kriterium (P-8) | checkpoint:human-verify | Manual (Docker-Rebuild + frische DB; siehe Manual-Only) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Abdeckung: **22 Tasks über 10 Pläne** (01:2, 02:2, **03:3**, 04:2, 05:2, **06:3**, 07:1, 08:2, 09:3, 10:2) — Stand nach dem RESEARCH-Refresh 2026-07-22 (+1 Task in 106-03 für den OpenAPI-Contract (P-3), +1 Task in 106-06 für die Lookup-/Audit-Migration (P-5)). Genau ein Task ohne `<automated>`: der unvermeidbare Live-Checkpoint 106-08-02.*

---

## Wave 0 Requirements

- [ ] `backend/internal/migrations/media_core_schema_test.go` (106-01-01) — asserted UP enthält `CREATE TABLE media`, `content_hash`, alle CHECK-Constraints, `media_variant … ON DELETE CASCADE`, `DROP COLUMN IF EXISTS cover_image`; UP enthält **NICHT** `caption`/`visibility`/`review_status`/`category`/`sort_order` an `media`; **UP und DOWN enthalten NICHT `release_media` (D-07)**; DOWN rekonstruiert `cover_image`. Dateiauflösung über das Suffix-Glob `*_media_core_schema.*.sql`, nicht über die hartkodierte Nummer.
- [ ] `scripts/media-core-contract-check.ps1` (106-02-01) — Ziel-/Legacy-Assertion (SC3), analog `scripts/schema-v2-audit.ps1`; `anime.cover_image` MUSS-abwesend; `release_media`/`media_assets`/`media_files` erwartet-VORHANDEN (D-07-Drop-Guard).
- [ ] `scripts/media-core-legacy-grep.ps1` (106-02-02) — SC4-Rest-Referenz-Scan; **Scan-Wurzeln `backend/internal`, `backend/cmd`, `frontend/src`, `shared/contracts`; `database/migrations/**` und `scripts/**` begründet ausgeschlossen (Blocker 2)**; `*.exe`/`*.log`/`*.md`/`node_modules` aus Scope; **kein `release_media`/`CreateReleaseMedia`-Suchbegriff (D-07)**; **`cover_image` über SQL-Spalten-Signaturen aktiv gesucht, DTO-Feld ausgefiltert (Warning 2)**; **`animeCoverImageSelectSQL` ist kein Suchbegriff** (Helper bleibt bestehen); **CWD-Kontrakt (Blocker 2): `$RepoRoot = Split-Path -Parent $PSScriptRoot` + `Set-Location $RepoRoot` als erste ausführbare Zeilen, plus harte `Test-Path`-Existenzprüfung aller vier Scan-Wurzeln (fehlende Wurzel → `exit 1`, niemals `exit 0`)**.

- [ ] `backend/internal/handlers/media_upload_errors.go` (106-06-03) — lokaler Fehlertyp `uploadError` + **fünf** `media_upload.*`-Konstanten (`invalid_entity_type`, `invalid_asset_type`, `unsafe_path`, `invalid_entity_id`, `audit_failed`).
- [ ] `backend/internal/models/media_upload_audit.go`, `backend/internal/repository/media_upload_subjects.go`, `backend/internal/repository/media_upload_audit.go` (106-06-01, **P-5**) — Re-homing von Entity-Existenzprüfung und Audit-Schreibung aus dem `asset_lifecycle`-Namensraum; ohne sie verlöre die Phase eine Sicherheitskontrolle und den CLAUDE.md-pflichtigen Audit-Trail.
- [ ] `backend/internal/repository/anime_cover_sql.go` (106-09-01) — kanonische, alias-parametrisierte Cover-Expression + Poster-LATERAL.

*Migration-Test-Muster existiert bereits (`release_content_source_groups_test.go` als Vorlage); Go-Testframework ist vorhanden — es fehlen ausschließlich die oben gelisteten Artefakte.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Kette 1→n läuft fehlerfrei gegen leere Ziel-DB | SC3 | Erfordert Docker-Backend-Rebuild + frische DB; nicht im Unit-Test abbildbar | `docker compose exec team4sv30-backend /app/migrate up` gegen zurückgesetzte DB |
| Contract-Check belegt Zielschema bei intaktem media_assets/media_files/release_media | SC3 | psql gegen Live-DB; Bash-Sandbox erreicht Host-DB nicht | `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/media-core-contract-check.ps1 -FailOnContractGaps` aus dem Repo-Root → kein throw (Skript trägt zusätzlich einen `$PSScriptRoot`-Repo-Root-Guard) |
| ~~`/covers/`-Route liefert 404~~ **ENTFERNT (P-8)** | SC2 (D-03) | Kein Signal: `frontend/public/covers/` wird von Next weiterhin statisch bedient, und `/covers/<unbekannt>.jpg` lieferte auch vom alten Handler 404 (`route.ts:46`) | Ersetzt durch den statischen Datei-Abwesenheitscheck der beiden Route-Handler (106-08 Task 1 Schritt 7); Live nur noch dokumentierend: `/covers/placeholder.jpg` → 200 ist der ERWARTETE Zustand |
| **`\d anime`: `slug` vorhanden, `cover_image` abwesend (A4)** | SC2 (106-10) / SC3 | Nur gegen die migrierte Live-DB prüfbar; fehlt `slug`, hat 106-10 lebende Pfade entfernt | `docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c "\d anime"` |
| **Screenshot-Sektion der Episoden-Detailseite unverändert (P-6)** | SC2 (106-03) | Live-FE-Verhalten; der bis Phase 109 deferrierte `ScreenshotGallery` konsumiert die entfernte Route | Episoden-Detailseite mit Release öffnen → Fehler-/Leerzustand wie vor der Phase, kein Layout-Bruch, keine unbehandelte Exception |
| Media-Assets-Sektion der Episoden-Detailseite unverändert (D-07-Regression) | SC2 (D-07) | Live-FE-Verhalten am Dev-Server :3000 mit echten Daten | `/episodes/<id>?releaseId=<id>` öffnen → Sektion rendert wie vor der Phase |
| **Watchlist rendert Cover nach dem `cover_image`-DROP** | SC2 (106-09) | Nur gegen die migrierte Live-DB nachweisbar; Query-Fehler zeigt sich als HTTP 500 | Watchlist-Liste + Einzeleintrag als angemeldeter Nutzer öffnen; `docker compose logs --tail=100 team4sv30-backend` frei von `column a.cover_image does not exist` |
| **Anime-Relationen (public + admin) rendern Cover** | SC2 (106-09) | Live-Daten mit gepflegten Relationen nötig | Anime-Detailseite mit Relationen + Admin-Relationsverwaltung + Titel-Suche für Relationsziele öffnen |
| **Gruppenprojekte (`listPublicFansubProjects`) rendern Cover** | SC2 (106-09) | Live-Daten mit `anime_fansub_groups`-Zuordnung nötig | Fansub-Gruppenseite mit zugeordneten Anime öffnen |
| **Member-Profil „Aktuelle Projekte" rendert (GROUP-BY-Fall)** | SC2 (106-09) | GROUP-BY-Fehler tritt nur zur Laufzeit gegen echte DB auf | Member-Profil mit laufenden Projekten öffnen; kein `must appear in the GROUP BY clause` im Backend-Log |
| Upload-Fehlercodes im neuen Namensraum | SC2 (106-06) | Nur am laufenden Backend beobachtbar | `POST /admin/upload` mit ungültigem `entity_type` → Response-Code `media_upload.invalid_entity_type` |
| **P-5: Existenzprüfung + Audit-Attribution erhalten** | SC2 (106-06) | DB-Zeile nur gegen die Live-DB nachweisbar | `POST /admin/upload` mit nicht existierender `entity_id` → HTTP 400 `media_upload.invalid_entity_id`; nach einem erfolgreichen Upload `SELECT mutation_kind, actor_user_id FROM admin_anime_mutation_audit ORDER BY id DESC LIMIT 1` → `anime.media_upload.provision` mit korrekter User-ID |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (einzige Ausnahme: 106-08-02, blocking human-verify — kein Automated möglich)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Migrations-Test + 2 PS-Skripte)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Map deckt alle **22 Tasks** der **10 Pläne** ab (Stand nach RESEARCH-Refresh-Revision 2026-07-22, 2. Lauf)
- [x] Alle acht `anime.cover_image`-Rohspalten-Lesestellen sind einem Plan zugeordnet (106-09), alle dauerhaft toten Legacy-Zweige ebenfalls (106-10)
- [x] Kein Gate verwendet mehr negiertes `grep` auf einen möglicherweise fehlenden Glob (FALSE-PASS-Muster beseitigt)
- [x] SC4-Scan-Scope gegen den realen Baum validiert: jeder Suchbegriff trifft innerhalb der vier Quell-Wurzeln ausschließlich Dateien, die einem 106-Plan in `files_modified` zugeordnet sind (Blocker 2)
- [x] Alle vier Gates, die die `cover_image`-Signaturliste spiegeln (106-02 Task 2, 106-08 Task 1, 106-09 Task 3, 106-10 Task 2) und diese Sampling-Regel nutzen identischen Scope und identische Signaturen (Blocker 1)

- [x] P-1: `UploadMediaAsset.ID` als Out-Parameter geschützt; alle Feld-greps auf den Struct-Body gescopet (kein False-Fail über `UploadRequest`)
- [x] P-2: Kein Plan verlangt mehr die Byte-Identität einer Datei, die er selbst ändern muss; `runtime_authority_test.go` ist genau zwei Plänen in zwei verschiedenen Wellen mit disjunktem Fragment-Umfang zugeordnet (106-05/W2: `syncLegacyAnimeCoverImageV2`; 106-10/W4: `cover_image` :18/:21)
- [x] P-3/P-4: Jeder SC4-Suchbegriff hat innerhalb der vier Quell-Wurzeln ausschließlich Treffer in Dateien, die einem 106-Plan in `files_modified` stehen — **inklusive `shared/contracts/openapi.yaml` (106-03 Task 3)**. Kein Term mit 0 Treffern verbleibt in der Liste. Case-Verhalten der Suite explizit festgelegt (case-insensitiv)
- [x] P-5: Kein Sicherheits- oder Audit-Verlust durch die Phase — Entity-Existenzprüfung und Audit-Attribution sind migriert, mit Regressionstests und Contract-Eintrag belegt
- [x] P-6: Die Entscheidung „Route in 106, Komponente in 109" ist im Plan begründet und verletzt weder D-03 noch D-04; Live-Bestätigung im Checkpoint
- [x] P-8: Kein Gate stützt sich mehr auf einen Live-Check, der in beiden Zuständen dasselbe Ergebnis liefern kann
- [x] A4: Die letzte offene Annahme (`anime.slug` existiert live) ist als Pflichtschritt im 106-08-Checkpoint geschlossen

**Approval:** map covers all 10 plans (106-01 … 106-10) mit 22 Tasks; pending execution.
