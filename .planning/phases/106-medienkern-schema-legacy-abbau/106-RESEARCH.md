# Phase 106: Medienkern-Schema & Legacy-Abbau — Research (Refresh)

**Researched:** 2026-07-22 (Refresh; ersetzt die Fassung vom 2026-07-21)
**Domain:** PostgreSQL-Schema-Migration + Go/Next.js-Legacy-Abbau (Brownfield)
**Confidence:** HIGH für alle Codebase-Befunde (jede Aussage per grep/Datei-Read gegen den realen Baum verifiziert), MEDIUM für Laufzeit-Aussagen, die eine laufende DB/Docker-Instanz erfordern (Bash-Sandbox erreicht keine Host-Ports).

## Summary

Dies ist ein **Korrektur- und Validierungslauf**, kein Neuentwurf. Auftrag war die systematische Re-Verifikation der Prämisse „ist das wirklich tot?" für **jedes** verbliebene §6-Item — nachdem diese Prämisse bereits zweimal nachweislich falsch war (`release_media` → D-07, `anime.cover_image` → 8 lebende Rohspalten-Leser).

**Ergebnis: Die Prämisse ist ein drittes Mal an mehreren Stellen falsch.** Vier neue Befunde ändern die Pläne; drei davon sind harte Blocker, die die Phase in der aktuellen Fassung garantiert rot laufen lassen:

1. **`UploadMediaAsset.ID` ist KEIN Legacy-Feld, sondern der Out-Parameter des lebenden V2-Inserts** (`createMediaAssetV2` schreibt die neue BIGSERIAL-ID zurück; der Handler nutzt sie für `CreateMediaFile`, Join-Table und Response). 106-04 Task 1 weist an, es zu entfernen → würde den produktiven Upload brechen.
2. **`runtime_authority_test.go:120` assertiert `synclegacyanimecoverimagev2(...)` positiv** — 106-05 löscht die Funktion, führt die Testdatei aber nicht mehr in `files_modified` (durch die Warning-4-Revision explizit entfernt) und verbietet in Task 2 sogar jede Änderung daran. Der eigene Verify-Befehl von 106-05 (`go test -run Anime`) trifft diesen Test und wird fehlschlagen.
3. **`shared/contracts/openapi.yaml` trägt `operationId: listReleaseImages` (:6526)** plus den Pfad `/api/v1/releases/{releaseId}/images` (:6522) und die Schemas `EpisodeVersionImage`/`EpisodeVersionImagesResponse` (:12612/:12655). `shared/contracts` ist SC4-Scan-Wurzel, `ListReleaseImages` ist Suchbegriff, PowerShell `Select-String` ist per Default case-insensitiv → **SC4 Exit 0 ist unerreichbar**, weil kein 106-Plan die Contract-Datei an dieser Stelle anfasst.
4. **Der SC4-Suchbegriff `episode_version_image` hat innerhalb der vier Quell-Wurzeln NULL Content-Treffer** (Go/TS verwenden CamelCase `EpisodeVersionImage`; snake_case existiert nur in Dateinamen und Altmigrationen). Der Term beweist nichts; die Legacy-Freiheit der Strecke wird durch ihn nicht belegt.

Ergänzend: `asset_lifecycle` ist **live verdrahtet** (`main.go:309-310 WithLifecycleService`) und leistet mehr als Ordnerprovisionierung — es prüft die Existenz der Ziel-Entity und schreibt Audit-Zeilen nach `admin_anime_mutation_audit`. Beides fällt in 106-06 ersatzlos weg, was der Plan nicht als Verhaltensänderung führt. Und `ScreenshotGallery.tsx` ist eine **live gemountete** FE-Komponente, die den in 106-03 entfernten Endpoint aufruft (Verhalten bleibt zufällig äquivalent, weil das Backend-Repo bereits ein immer-fehlschlagender Stub ist — aber die Pläne kennen diesen Consumer nicht).

**Primary recommendation:** Vor Ausführung 106-04, 106-05, 106-02/106-03/106-08 und 106-06 nach den Punkten P-1 bis P-5 unter „Planungsrelevante Befunde" korrigieren. Der übrige Plan-Satz (Wellen, Dateipfade, Zeilenreferenzen, Zielschema, Migrationsnummer) ist gegen den realen Baum korrekt.

---

## 1. §6-Prämissen-Audit (LEAD)

> Methodik: Für jedes noch in 106-Scope stehende §6-Item wurde der reale Baum nach Lesern, Schreibern, Aufrufern und Verdrahtung durchsucht (Go, TS/TSX, SQL, YAML, PowerShell, docker-compose). Klassifikation: **TOT** (keine Referenz) · **TOT-ABER-REFERENZIERT** (nur Compile-/Test-/Contract-Bindung) · **LEBEND** (echte Laufzeit-Consumer).

| # | §6-Item | §6-Behauptung | Verifizierte Realität | Lebende Consumer | Verdikt |
|---|---------|---------------|------------------------|------------------|---------|
| A1 | `backend/database/migrations/001_create_media_tables.*` | „Totes UUID-Parallelschema" | Null Code-/Compose-/Dockerfile-Referenzen. **ABER:** `ResolveMigrationsDir` (`runner.go:52-75`) probiert `database/migrations` **relativ zum CWD** als ERSTEN Kandidaten. Bei `cd backend && go run ./cmd/migrate` löst das auf `backend/database/migrations` auf → das tote 001-Schema wäre ausführbar. Im Docker-Pfad korrekt (`docker-compose.yml:151` mountet `./database/migrations`). | Keine | **TOT — aber versehentlich erreichbar.** Entfernung ist eine echte Sicherheitsverbesserung, nicht nur Kosmetik. §6-Prämisse ✔ (mit Verschärfung) |
| A2 | `models/media_upload.go`-Upload-DTOs | „Upload-DTOs entfernen" | **FALSCH in dieser Pauschalität.** `UploadMediaAsset`, `UploadMediaFile`, `UploadRequest`, `UploadResponse` sind die DTOs des **lebenden V2-Uploads**. Insbesondere `UploadMediaAsset.ID` ist der **Rückgabeweg** von `createMediaAssetV2` (`media_upload.go:222`: `asset.ID = strconv.FormatInt(mediaID, 10)`). | `media_upload_image.go:107-141` (`asset.ID` → `CreateMediaFile.MediaID`, `createJoinTableEntryWithRepo`, `UploadResponse.ID`), `media_upload_video.go:91-138`, `media_upload_test.go:206` | **LEBEND — §6-Prämisse FALSCH.** Nur `EntityType`/`EntityID`/`AssetType` sind legacy-only; `ID` MUSS bleiben. → Befund P-1 |
| B | `episode_version_images`-Strecke (Repo-Stub, Model, Handler, Route `/releases/:id/images`) | „ersatzlos entfernen" | Repo ist ein reiner Stub — alle vier Methoden geben `phase20ReleaseImportDeferred(...)` zurück (`episode_version_image_repository.go:19-45`), d.h. der Endpoint antwortet **heute schon immer mit HTTP 500**. Route ist aber real registriert (`main.go:448`) und wird von einer **live gemounteten** FE-Komponente aufgerufen. | `frontend/src/app/episodes/[id]/page.tsx:205` rendert `<ScreenshotGallery releaseId=…/>`; `ScreenshotGallery.tsx:40` fetcht `/api/v1/releases/${releaseId}/images`. Zusätzlich `shared/contracts/openapi.yaml:6522/6526/6563/12612/12655`. | **TOT-ABER-AUFGERUFEN.** Verhaltensneutral entfernbar (500 → 404, FE zeigt in beiden Fällen denselben Fehlerzustand), aber Contract + FE-Consumer sind unversorgt. → Befunde P-3, P-4, P-6 |
| B2 | `GetGroupReleaseImages` (soll BLEIBEN) | — | Bestätigt getrennt: `group_contributors_handler.go:250`, Route `main.go:358` (`/anime/:id/group/:groupId/releases/:releaseVersionId/images`), FE `api.ts:6340 getGroupReleaseImages` → `ReleaseGallery.tsx:76` + Tests. Anderer Handler, andere Route, andere Datenquelle. | Voll lebend | **LEBEND — Split korrekt, 106-03 schützt ihn per grep-Assertion.** ✔ |
| C | Dual-Upload-Legacy (`SupportsLegacyUploadSchema`, `useLegacyUploadSchema`, `legacyUploadSchemaDetector`, `shouldUseAnimePosterPathFallback`, `media_upload_v2_compat.go`) | „Legacy-Dualpfad" | Bestätigt tot. `SupportsLegacyUploadSchema` (`media_upload.go:47`) probt `SELECT entity_type FROM media_assets LIMIT 0`; **keine Migration in `database/migrations/` legt je eine Spalte `entity_type` an** (grep: 0 Treffer) → PgError 42703 → `useLegacy=false` → immer V2-Zweig. `shouldUseAnimePosterPathFallback` gibt hartkodiert `false` zurück. | Keine (nur Compile + 1 Test-Mock) | **TOT — §6-Prämisse ✔.** 106-04 Cluster-B-Umfang korrekt |
| D | `anime.cover_image`-Spalte | „ersatzlos entfernen" | Bereits im Vorlauf korrigiert. Re-verifiziert: **33 Rohspalten-Signaturtreffer** in `backend/internal` + `backend/cmd`, davon acht ungated lebende Leser (`watchlist.go:41/:147`, `anime_relations.go:26/:35`, `anime_relations_admin.go:59/:127`, `fansub_repository.go:336`, `member_profile_repository.go:1106/:1160`, `admin_content_anisearch.go:147`, `admin_content_anime_themes.go:1891`) — jeder Treffer ist einem Plan zugeordnet (siehe §3.3). | Watchlist, Anime-Relationen, Gruppenprojekte, Member-Profil, Admin-Suche | **LEBEND — bereits korrekt erfasst (106-05/09/10).** ✔ |
| E | `/api/admin/upload-cover` (FE-Route-Handler) | „entfernen" | Datei existiert (`frontend/src/app/api/admin/upload-cover/route.ts`, 3494 B). Einziger Client-Aufrufer ist `api.ts:5936 deleteUploadedCoverFile` (DELETE). **Eine POST-Upload-Clientfunktion existiert NICHT** — `grep -n "upload-cover" frontend/src/lib/api.ts` liefert genau einen Treffer (:5937). | `AdminAnimeOverviewClient.tsx` (2 Treffer: Import + Aufruf) | **TOT-ABER-REFERENZIERT.** 106-07 weist an, eine nicht existierende POST-Funktion zu entfernen → Befund P-7 (Präzision) |
| F | `/covers/[file]/route.ts` (FE-Serve-Route) | „entfernen" | Handler liest `public/covers/<file>`. **`frontend/public/covers/` existiert mit 4 Dateien inkl. `placeholder.jpg`.** Next.js serviert `public/` statisch am Root — nach Löschen des Handlers bleibt `/covers/placeholder.jpg` mit hoher Wahrscheinlichkeit **200**. Zudem gibt es weit mehr `/covers/`-URL-Konsumenten als D-03 nennt: `anime-helpers.ts:91/:103/:113` (`resolveCoverUrl`), `AnimeRow.tsx:53`, `AnimeContextCard.tsx:123`, `admin/episodes/page.tsx:65`, `fansubEditFormatters.ts:75/:79`, `FansubVersionBrowser.tsx:68` + 4 Testdateien. | Admin-Anime-Browser, Admin-Episoden, Fansub-Edit, Fansub-Browser | **TOT-ABER-REFERENZIERT (Handler) / LEBEND (URL-Schema).** Der 106-08-Live-Check „`/covers/` liefert 404" ist kein verlässliches Signal → Befund P-8 |
| G | `asset_lifecycle_service.go` (+ Errors, Audit-Repo, Subjects, `models.ProvisioningResult`, `provisioning.RootPath`, API-Fehlercodes, OpenAPI) | „durch hash-basierte Ablage überflüssig" | **Prämisse zeitlich falsch:** die hash-basierte Ablage kommt erst in **Phase 107**. Der Service ist heute **live verdrahtet** (`main.go:306-307` Konstruktion, `:309-310 .WithLifecycleService(...)`). Er leistet drei Dinge, nicht eines: (a) `os.MkdirAll` des kanonischen Ordnerlayouts (`asset_lifecycle_service.go:190/:213`) — **unkritisch**, weil `media_upload.go:164` ohnehin `MkdirAll(storagePath)` macht; (b) **Existenzprüfung der Ziel-Entity** via `LookupAssetLifecycleSubject` → `SELECT id FROM anime WHERE id=$1` → 400 `asset_lifecycle.invalid_entity_id`; (c) **Audit-Schreibung** nach `admin_anime_mutation_audit` (`asset_lifecycle_audit.go:52`, `mutation_kind = anime.asset_lifecycle.provision`). | `POST /api/admin/upload` (authentifiziert via `CommentAuthIdentityFromContext`, aber ohne Capability-Gate — §3 des Entscheids); OpenAPI :1475/:1481/:9058; `frontend/src/types/admin.ts:691` (optional) | **LEBEND — §6-Prämisse teilweise FALSCH.** Entfernung verliert Entity-Validierung + Audit → Befund P-5 |
| H | `HasSlug`/`useV2Schema`-Legacy-Zweige (`anime.go:50/:100/:364/:366`, `admin_content_sync.go:27`, `admin_content_anime_create_v2.go:36/:41`, `admin_content_anime_metadata.go:395/:410`, `admin_content_anime_delete.go:96/:353`, `createAnimeLegacy`, `buildAnimeListWhere`) | (aus D-04 abgeleitet) | Alle Zeilenreferenzen exakt bestätigt. `HasSlug` als **Feld** bleibt zwingend erhalten — es gated lebende Ausdrücke in `admin_content_anisearch.go:32/:76/:129`, `admin_content_jellyfin_intake.go:31`, `admin_content_anime_update_v2.go:125`, `admin_content_anime_metadata.go:318`, `anime.go:253`. `HasCoverImage` dagegen nur `anime_assets.go:516/:573` + `anime_schema.go:21/:63`. `buildAnimeListWhere` (`anime.go:361-367`, `cover_image IS NOT NULL`-Zweige) hat außer den zwei Tests keinen weiteren Aufrufer. | Keine (Live-DB hat `slug`, siehe A4) | **TOT — §6/D-04-Prämisse ✔.** 106-10-Umfang korrekt |
| I | `cmd/migrate-covers` + `report-/remediate-cover-image.ps1` | „entfernen" | `backend/cmd/migrate-covers/` enthält 4 Dateien (`main.go`, `README.md`, `INVENTORY.md`, `test-migration.sh`) — 106-03 löscht das Verzeichnis, deckt also auch die im Plan nicht einzeln gelisteten `.sh`/`.md` ab. Kein Import aus dem Server-Binary. `scripts/report-cover-image-state.ps1` + `remediate-cover-image.ps1` sind isoliert. | Keine | **TOT — §6-Prämisse ✔** |
| J | `media_assets` / `media_files` (Grenzbefund A1 — MÜSSEN bleiben) | (nicht in §6) | Re-bestätigt: `media_assets` in **50 Go-Dateien**, **109** produktive SQL-Referenzen (`FROM/INTO/JOIN`); `media_files` **71** SQL-Referenzen. Zusätzlich harte FK-Bindung `members.avatar_media_id BIGINT REFERENCES media_assets(id)` (`0044:134`). | Voll lebend | **LEBEND — Drop in 106 wäre katastrophal. A1 bleibt gültig.** ✔ |
| K | `release_media` (D-07 — bleibt in 106) | (aus §6 gestrichen) | Re-bestätigt: Lesepfad `episode_version_repository_read_helpers.go:371 FROM release_media rm`, Schreibpfad `media_upload.go:292 INSERT INTO release_media` via `media_upload_storage.go:53 case "release"`, Referenzguards `admin_content_anime_delete.go:247/:280`, `anime_assets.go:539`, Join-Liste `media_upload.go:373`, Test-Assertionen `runtime_authority_test.go:161-163`. | `GET /releases/:id/assets` → FE „Media Assets"-Sektion | **LEBEND — D-07 korrekt, Verschiebung nach 108 bestätigt.** ✔ |

---

## 2. Planungsrelevante Befunde

> **Alles in diesem Abschnitt ändert die Pläne.** P-1 bis P-4 sind Blocker (Phase läuft sonst garantiert rot), P-5 bis P-8 sind Korrekturen/Präzisierungen.

### P-1 (BLOCKER, Plan 106-04) — `UploadMediaAsset.ID` darf NICHT entfernt werden

106-04 Task 1 weist an: *„In `models/media_upload.go` die Legacy-Felder `ID string`, `EntityType`, `EntityID`, `AssetType` aus `UploadMediaAsset` entfernen"*. Das ist für `ID` falsch.

```go
// backend/internal/repository/media_upload.go:193-224 (createMediaAssetV2 — LEBENDER V2-Pfad)
	RETURNING id
`, mediaTypeID, filePath, asset.MimeType, asset.Format, asset.UploadedBy, asset.CreatedAt).Scan(&mediaID); err != nil { … }

asset.ID = strconv.FormatInt(mediaID, 10)   // <- Out-Parameter des V2-Inserts
```

Downstream im lebenden Handler (`media_upload_image.go:119-142`, identisch in `media_upload_video.go`):
`CreateMediaFile{MediaID: asset.ID}` → `createJoinTableEntryWithRepo(..., asset.ID)` → `mediaID = asset.ID` → `UploadResponse.ID`.

**Korrektur:** `ID string` in `UploadMediaAsset` **behalten**. Nur `EntityType`, `EntityID`, `AssetType` entfernen — diese werden im V2-Pfad nirgends gelesen; der Handler übergibt `req.EntityType`/`req.EntityID` separat. `UploadRequest.EntityType/EntityID/AssetType` bleiben ohnehin unangetastet (Form-Binding + Speicherpfad-Formel).
**Zusatz:** `media_upload_test.go:206-214` konstruiert `UploadMediaAsset{ID, EntityType, EntityID, AssetType, …}` — die drei entfallenden Felder müssen dort mitgezogen werden. 106-04 Task 2 nennt heute nur den `SupportsLegacyUploadSchema`-Mock; die Struct-Literal-Anpassung fehlt und würde den Compile brechen.

### P-2 (BLOCKER, Plan 106-05) — `runtime_authority_test.go:120` assertiert die zu löschende Funktion positiv

```go
// backend/internal/repository/runtime_authority_test.go:105-131
func TestAnimeAssetCompatibilityUsesV2CoverHelpersWhenLegacySlotsAreGone(t *testing.T) {
	assetNormalized := strings.ToLower(readRepositorySource(t, "anime_assets.go"))
	required := []string{
		…
		"synclegacyanimecoverimagev2(ctx, tx, animeid, mediaid, schema)",   // :120
		…
		"v2 remains authoritative once anime_media exists",                  // :123
	}
```

106-05 löscht `syncLegacyAnimeCoverImageV2` samt Aufruf, führt `runtime_authority_test.go` aber **nicht** in `files_modified` (durch die Warning-4-Revision bewusst entfernt) und Task 2 verbietet explizit jede Änderung an der Datei (`git diff --stat` MUSS leer sein). Der Test heißt `TestAnimeAsset…` und wird vom Verify-Kommando `go test ./internal/repository/... -run Anime` **getroffen** → 106-05 kann sein eigenes Gate nicht bestehen.

**Zweiter Teilbefund derselben Datei:** Fragment `"v2 remains authoritative once anime_media exists"` (:123) verlangt den Kommentar in `anime_assets.go:1711-1712`. 106-05 weist an, „Kommentar :1712 bereinigen" — wird dabei der erste Satzteil gelöscht, bricht dieselbe Assertion zusätzlich.

**Korrektur:**
1. `runtime_authority_test.go` wieder in `files_modified` von 106-05 aufnehmen; den Fragment-Eintrag `"synclegacyanimecoverimagev2(ctx, tx, animeid, mediaid, schema)"` entfernen.
2. Die Kommentar-Bereinigung auf den Teilsatz „`und cover_image sync`" beschränken — der Satzanfang „V2 remains authoritative once anime_media exists" muss stehen bleiben.
3. Die `release_media`-Assertionen bei :156-167 bleiben unverändert (D-07).
4. VALIDATION.md nachziehen: `runtime_authority_test.go` wird dann von 106-05 (Welle 2) **und** 106-10 (Welle 4) editiert — unterschiedliche Wellen, daher zulässig, aber im Wave-Graph zu dokumentieren.

### P-3 (BLOCKER, Pläne 106-02 / 106-03 / 106-08) — SC4 Exit 0 ist wegen `shared/contracts/openapi.yaml` unerreichbar

| Ort | Inhalt | Von einem 106-Plan angefasst? |
|-----|--------|-------------------------------|
| `shared/contracts/openapi.yaml:6522` | Pfad `/api/v1/releases/{releaseId}/images` | ❌ nein |
| `shared/contracts/openapi.yaml:6526` | `operationId: listReleaseImages` | ❌ nein |
| `shared/contracts/openapi.yaml:6563` | `$ref` auf `EpisodeVersionImagesResponse` | ❌ nein |
| `shared/contracts/openapi.yaml:12612` | Schema `EpisodeVersionImage` (führt u.a. `caption`) | ❌ nein |
| `shared/contracts/openapi.yaml:12655` | Schema `EpisodeVersionImagesResponse` | ❌ nein |

`shared/contracts` ist SC4-Scan-Wurzel (106-02 Task 2), `ListReleaseImages` ist Suchbegriff, und PowerShell `Select-String` matcht **per Default case-insensitiv** → `listReleaseImages` ist ein Treffer. Das Gate in 106-08 Task 1 kann nie Exit 0 liefern.

**Korrektur (zwei Optionen, A empfohlen):**
- **A (konsistent):** 106-03 erweitert `files_modified` um `shared/contracts/openapi.yaml` und entfernt den Pfad `/api/v1/releases/{releaseId}/images` sowie die beiden Schemas `EpisodeVersionImage`/`EpisodeVersionImagesResponse`. Sachlich ohnehin richtig — der Contract beschreibt sonst einen Endpoint, den es nicht mehr gibt. Bonus: das dort geführte Feld `caption` verschwindet mit, was §8 („`caption` ersatzlos gestrichen") stützt.
- **B (Scope-Verengung):** `shared/contracts` als Scan-Wurzel streichen. **Nicht empfohlen** — dann verliert SC4 auch die `asset_lifecycle`-Contract-Prüfung von 106-06.

### P-4 (BLOCKER-nah, Plan 106-02) — Suchbegriff `episode_version_image` ist wirkungslos

```
grep -rni "episode_version_image" backend/internal backend/cmd frontend/src shared/contracts
→ 0 Treffer
```

Der snake_case-Term existiert im Produktivcode **nicht** — Go/TS verwenden `EpisodeVersionImage`, `EpisodeVersionImagesResponse`, `EpisodeVersionImageRepository`. Snake_case kommt ausschließlich in **Dateinamen** (`episode_version_image_repository.go`) und in `database/migrations/0018|0046` vor. Die `<interfaces>`-Trefferliste in 106-02 („`episode_version_image` → handlers/…, repository/…, models/…") beschreibt damit **Dateinamen-Treffer, keine Content-Treffer** — was nur zuträfe, wenn das Skript auch Pfade scannt.

**Korrektur:** Suchbegriffsliste um `EpisodeVersionImage` (CamelCase) ergänzen **und** im Skript explizit festlegen, ob Datei-**Pfade** mitgescannt werden. Wenn ja, bleibt die Ausschlussbegründung für `database/migrations/**` gültig (dort matchen beide Schreibweisen); wenn nein, ist `episode_version_image` als Term ersatzlos durch `EpisodeVersionImage` zu ersetzen. Zusätzlich empfohlen: Datei-Abwesenheitsprüfung analog zur `/covers/`-Route-Regel (die drei Go-Dateien dürfen nicht mehr existieren).

### P-5 (Korrektur, Plan 106-06) — asset_lifecycle-Entfernung verliert Entity-Validierung und Audit

106-06 spezifiziert die Fehlercode-Migration und den Speicherpfad sauber, führt aber zwei reale Verhaltensverluste nicht auf:

| Verlust | Heute | Nach 106-06 |
|---------|-------|-------------|
| Existenzprüfung der Ziel-Entity (`LookupAssetLifecycleSubject` → `SELECT id FROM anime WHERE id=$1`) → HTTP 400 `asset_lifecycle.invalid_entity_id` | Upload auf nicht existierende `entity_id` wird abgewiesen | Upload läuft durch, legt `<media_root>/anime/<beliebige id>/…` an und schreibt DB-Zeilen |
| Audit-Zeile in `admin_anime_mutation_audit` (`mutation_kind = anime.asset_lifecycle.provision`, `asset_lifecycle_audit.go:52`) | Provisionierung ist auditiert | Keine Audit-Spur |

Der Plan sagt zu (a) nur: „`asset_lifecycle.invalid_entity_id` … entfällt ersatzlos, weil die einzigen Erzeuger im gelöschten Service lagen" — das beschreibt die Ursache, nicht die Konsequenz. Relevanz erhöht sich dadurch, dass `POST /admin/upload` laut §3 des Architekturentscheids **kein Capability-Gate** hat (nur Authentifizierung via `CommentAuthIdentityFromContext`); Härtung ist erst Phase 108. CLAUDE.md führt außerdem als Constraint: „Admin-Aktionen brauchen Audit-Attribution nach User-ID".

**Empfehlung:** Entweder (i) eine schlanke Existenzprüfung im Handler behalten (`SELECT 1 FROM anime WHERE id=$1`) mit Code `media_upload.invalid_entity_id`, oder (ii) den Verlust explizit als bewusst akzeptiertes Risiko in `must_haves.truths` und im STRIDE-Register von 106-06 aufnehmen und an Phase 108 (Endpoint-Härtung) übergeben. **(i) ist billiger als die spätere Fehlersuche** und hält den API-Contract stabil. Der Audit-Verlust gehört in jedem Fall dokumentiert und wegen der CLAUDE.md-Zeile idealerweise per PO-Entscheid bestätigt.
**Unkritisch (verifiziert):** Der Wegfall von `EnsureCanonicalLayout` bricht KEINE Verzeichniserstellung — `media_upload.go:164 os.MkdirAll(storagePath, 0755)` existiert bereits unabhängig.

### P-6 (Korrektur, Plan 106-03) — unbekannter FE-Consumer `ScreenshotGallery`

`frontend/src/app/episodes/[id]/page.tsx:205` rendert `<ScreenshotGallery releaseId={activeReleaseID} />`; die Komponente fetcht in `ScreenshotGallery.tsx:40` genau die von 106-03 entfernte Route.

**Verhaltensbewertung:** Der Backend-Repo-Stub gibt heute für jeden Aufruf `phase20ReleaseImportDeferred(...)` zurück → `internalError` 500 → `response.ok === false` → die Komponente setzt den Fehlerzustand. Nach Entfernen der Route: 404 → identischer Fehlerzustand. **Der sichtbare Effekt ist unverändert.** Kein Blocker.

**Korrektur:** In 106-03 als bekannter, bewusst deferrierter Consumer aufführen (D-03/Phase-109 löscht die Komponente), und im 106-08-Live-Check ergänzen: „Episoden-Detailseite öffnen — Screenshot-Sektion verhält sich wie vor der Phase (Fehler-/Leerzustand, kein Layout-Bruch)". Der SC4-Term `/releases/:id/images` (Gin-Syntax) matcht das FE-Template-Literal nicht → kein False-Fail.

### P-7 (Präzision, Plan 106-07) — nicht existierende POST-Clientfunktion

106-07 weist an, „`deleteUploadedCoverFile` sowie die zugehörige POST-Upload-Cover-Clientfunktion" zu entfernen. `grep -n "upload-cover" frontend/src/lib/api.ts` liefert genau **einen** Treffer (:5937, im DELETE). Eine POST-Funktion existiert nicht — der Executor würde suchen, nichts finden und im schlimmsten Fall eine benachbarte Cover-Funktion mitlöschen.

**Korrektur:** Formulierung auf „`deleteUploadedCoverFile` (`api.ts:5936-5950`) — dies ist der EINZIGE `upload-cover`-Client; eine POST-Variante existiert nicht" ändern.

### P-8 (Präzision, Plan 106-08) — der `/covers/`-404-Live-Check ist kein verlässliches Signal

`frontend/public/covers/` existiert und enthält 4 Dateien (u.a. `placeholder.jpg`, drei `cover_*.jpg`). Next.js serviert `public/` statisch am Root. Nach Löschen des Route-Handlers ist zu erwarten, dass `/covers/placeholder.jpg` weiterhin **200** liefert; die im Checkpoint vorgeschlagene URL `/covers/<beliebiger-name>.jpg` liefert dagegen **404** — aber auch heute schon (Handler gibt bei fehlender Datei 404 zurück, `route.ts:46`). **Der Check kann in beiden Zuständen dasselbe Ergebnis liefern und beweist damit nichts.**

**Korrektur:** Live-Schritt 4 präzisieren auf: „`/covers/placeholder.jpg` liefert weiterhin 200 (statisch aus `frontend/public/covers/`, Phase-110-Scope) — der Nachweis für SC2 ist die **Abwesenheit der Handler-Datei** `frontend/src/app/covers/[file]/route.ts`, geprüft als Datei-Existenzcheck in 106-02/106-08." Zusätzlich: die `/covers/`-URL-Konsumenten sind zahlreicher als D-03 nennt (`anime-helpers.ts:91/:103/:113`, `AnimeRow.tsx:53`, `AnimeContextCard.tsx:123`, `admin/episodes/page.tsx:65`, `fansubEditFormatters.ts:75/:79`, `FansubVersionBrowser.tsx:68`) — für Phase 109/110 vormerken, zusammen mit `frontend/public/covers/`.

---

## 3. Plan-Set-Validierung (10 Pläne, Wellen W1{01,02} W2{03,04,05,07} W3{06,09} W4{10} W5{08})

### 3.1 Dateipfad- und Zeilenreferenz-Audit

Alle in `files_modified` genannten Pfade wurden auf Existenz geprüft. **Ergebnis: keine fehlende oder verschobene Datei.**

| Plan | Auffälligkeit |
|------|---------------|
| 106-01 | ✔ Keine. Migrationsnummer 0131 frei (siehe §3.4). Analog `backend/internal/migrations/release_content_source_groups_test.go` existiert. |
| 106-02 | ⛔ P-3 (openapi-Treffer nicht zugeordnet), ⛔ P-4 (`episode_version_image` wirkungslos). Ansonsten Term-für-Term-Trefferliste korrekt (siehe §3.5). |
| 106-03 | ⛔ P-3, ⚠ P-6. Zeilenrefs bestätigt: `main.go:87` Repo-Konstruktion + `:88` Handler-Konstruktion (Plan nennt nur :88), `main.go:448` Route, `main.go:358` Schutzobjekt. `backend/cmd/migrate-covers/` enthält 4 Dateien — durch Verzeichnis-Delete gedeckt. |
| 106-04 | ⛔ P-1 (`UploadMediaAsset.ID`). Zeilenrefs sonst bestätigt: `media_upload.go:45/:47/:62/:107/:139/:170/:180/:243`, `media_upload_image.go:91`, `media_upload_test.go:45`. D-07-Marken bestätigt: Interface `:24`, Impl `:290`, `INSERT :292`, joinTables `:373`, Caller `media_upload_storage.go:53` (Plan sagt :54 — Off-by-one, unkritisch), Mock `:84`. |
| 106-05 | ⛔ P-2 (`runtime_authority_test.go:120`). Call-Site-Liste sonst exakt: `anime_v2.go:419/:443` (Format-String `%s.cover_image`), `anime_assets.go:349/:386/:519/:599/:966/:981` (Plan nennt „:516-524" für den `HasCoverImage`-Block — realer `SET` bei :519 ✔; „:566-599" für die Funktion — realer `SET` bei :599 ✔), `:428` Aufrufer ✔, `anime_schema.go:21/:63` ✔, `anime_test.go:116/:138` ✔, `anime_assets.go:539` release_media-UNION ✔. |
| 106-06 | ⚠ P-5. Alle 7 zu löschenden Dateien existieren. `main.go:306/:307` Konstruktion ✔, `:309-310 WithLifecycleService` ✔ (Plan erwähnt die Injektionszeile nur indirekt — sie muss mit fallen). Fehlercode-Call-Sites `media_upload.go:108/:114/:211-219/:262` ✔. `ProvisioningResult`-Kopplung `models/media_upload.go:43`, `media_upload.go:66/:194/:196`, `_image.go:39/:102/:154`, `_video.go:30/:138` ✔. OpenAPI `asset_lifecycle` 2 Treffer ✔. |
| 106-07 | ⚠ P-7. Beide Route-Dateien existieren ✔. `api.ts:5936` ✔, `AdminAnimeOverviewClient.tsx` 2 Treffer ✔. |
| 106-08 | ⛔ P-3 (Gate unerreichbar), ⚠ P-8 (404-Check). Glob-Auflösung `*_media_core_schema.up.sql` statt harter Nummer ist korrekt und robust (FALSE-PASS-Muster vermieden). |
| 106-09 | ✔ Alle 8 Call-Sites + Zeilennummern exakt bestätigt. `member_profile_repository.go:1160` GROUP-BY-Liste enthält tatsächlich `a.cover_image` ✔. `anime_relations.go:26` trägt den komma-präfixierten blanken Ausgabenamen ✔ (Blocker-1-Fix `cover_url` ist notwendig und korrekt). `member_profile_repository_test.go:295` enthält nur eine `FROM release_media`-Negativassertion (kein `cover_image`-SQL-Fragment) → **keine Testanpassung nötig**, entgegen der vorsichtigen `read_first`-Notiz. `anime_relations_admin_test.go:70` trägt `a.cover_image` ✔. |
| 106-10 | ✔ Alle Zeilenrefs bestätigt. `runtime_authority_test.go:18/:21` Fragmente ✔ (lowercase-normalisiert). `anime.go:361-367` `buildAnimeListWhere`-HasCover-Zweige ✔. `HasSlug`-Feld-Erhalt korrekt begründet (7 lebende Gates). `admin_content_anime_delete.go:247/:280` release_media-Guards ✔. |

### 3.2 Wellen-Graph

Keine Zyklen; innerhalb jeder Welle keine `files_modified`-Überschneidung — **mit einer Ausnahme nach der P-2-Korrektur:** wenn `runtime_authority_test.go` zu 106-05 (Welle 2) hinzukommt, editieren 106-05 (W2) und 106-10 (W4) dieselbe Datei. Unterschiedliche Wellen, also zulässig, aber in VALIDATION.md nachzuführen.

Die kritische Sequenz-Zusicherung („0131 wird in W1 nur AUTHORED, erst in W5 ANGEWENDET") ist korrekt und für 106-09/106-10 zwingend. `backend/internal/migrations/media_core_schema_test.go` ist ein reiner String-Content-Test ohne DB-Zugriff — bestätigt durch das Analog `release_content_source_groups_test.go`.

### 3.3 Zuordnung der `cover_image`-Rohspalten-Treffer (33 Signaturtreffer, alle zugeordnet)

| Datei:Zeile | Zuständiger Plan |
|-------------|------------------|
| `anime_v2.go:419/:443` (`%s.cover_image`) | 106-05 |
| `anime_assets.go:349/:386/:519/:599/:966/:981` | 106-05 |
| `anime_schema.go:21/:63` (`HasCoverImage`) | 106-05 |
| `anime_test.go:116/:138` | 106-05 (+106-09 Task 3) |
| `watchlist.go:41/:147` | 106-09 |
| `anime_relations.go:26/:35` | 106-09 |
| `anime_relations_admin.go:59/:127` + `_test.go:70` | 106-09 |
| `fansub_repository.go:336` | 106-09 |
| `member_profile_repository.go:1106/:1160` | 106-09 |
| `admin_content_anisearch.go:147` | 106-09 |
| `admin_content_anime_themes.go:1891` | 106-09 |
| `anime.go:50/:100/:361-367` | 106-10 |
| `admin_content_sync.go:27` | 106-10 |
| `admin_content_anime_create_v2.go:36/:41` | 106-10 |
| `admin_content_anime_metadata.go:395/:410` | 106-10 |
| `admin_content_anime_delete.go:96/:353` | 106-10 |
| `runtime_authority_test.go:18/:21` | 106-10 |
| `cmd/migrate-covers/main.go:167` | 106-03 (Verzeichnis-Delete) |

**Lücke in der Signaturliste (Robustheit, kein Blocker):** Die fünf SC4-Signaturen (`a\.cover_image`, `anime\.cover_image`, `,\s*cover_image`, `cover_image\s*=`, `SET cover_image`) treffen `NULLIF(BTRIM(%s.cover_image), '')` in `anime_v2.go:419/:443` **nicht** (Format-String-Alias). Da 106-05 diese Zeilen entfernt, ist der Gate-Ausgang korrekt — aber die Liste würde einen künftigen `%s.cover_image`-Neuzugang nicht fangen. Optional ergänzen: `\.cover_image` (generisch) statt nur `a\.`/`anime\.`.

### 3.4 Migrationsnummer (D-01/D-02)

- `database/migrations/` endet bei **0130** (`0130_release_content_source_groups.up/.down.sql`). **0131 ist frei.** [VERIFIED: Verzeichnislisting 2026-07-22]
- `git status --short database/migrations/` ist **leer** — kein paralleler Schreiber hat eine untracked Migration angelegt. [VERIFIED]
- Der parallel geplante Phase-107-Workstream verdrahtet **keine** feste Nummer: `107-PATTERNS.md:25/:32` und `107-RESEARCH.md:111` verlangen ausdrücklich „nächste Nummer nach der tatsächlich verwendeten 106-Migration" und verbieten das Vorab-Reservieren von 0132. **Keine Kollisionsgefahr.** [VERIFIED]
- Der D-02-Guard in 106-01 Task 2 (Schritt 0) plus das verbindliche Namenssuffix `_media_core_schema` bleiben trotzdem richtig — sie sichern gegen Schreiber ab, die zwischen Planung und Ausführung landen.

### 3.5 SC4-Grep-Erreichbarkeit — Term für Term gegen den realen Baum

Scan-Scope A: `backend/internal`, `backend/cmd`, `frontend/src`, `shared/contracts` (case-insensitiv ermittelt, PowerShell-Default).

| Term | Treffer in den 4 Wurzeln | Einem Plan zugeordnet? |
|------|--------------------------|------------------------|
| `SupportsLegacyUploadSchema` | `handlers/media_upload_test.go`(1), `handlers/media_upload_v2_compat.go`(1), `repository/media_upload.go`(3) | ✔ 106-04 |
| `useLegacyUploadSchema` | `repository/media_upload.go`(4) | ✔ 106-04 |
| `legacyUploadSchemaDetector` | `handlers/media_upload_v2_compat.go`(1) | ✔ 106-04 |
| `shouldUseAnimePosterPathFallback` | `handlers/media_upload_image.go`(1), `media_upload_v2_compat.go`(1) | ✔ 106-04 |
| `asset_lifecycle` | `repository/asset_lifecycle_audit.go`(2), `services/asset_lifecycle_errors.go`(6), **`shared/contracts/openapi.yaml`(2)** | ✔ 106-06 (inkl. Contract) |
| `episode_version_image` | **0 Treffer** | ⛔ **P-4 — Term wirkungslos** |
| `ListReleaseImages` | `cmd/server/main.go`(1), `handlers/episode_version_images_handler.go`(2), **`shared/contracts/openapi.yaml`(1 — `operationId: listReleaseImages`)** | ⛔ **P-3 — Contract-Treffer keinem Plan zugeordnet** |
| `/releases/:id/images` | `cmd/server/main.go`(1) | ✔ 106-03 |
| `migrate-covers` | `cmd/migrate-covers/{INVENTORY.md, README.md, test-migration.sh}` | ✔ 106-03 (Verzeichnis-Delete). Hinweis: `.md` ist per Skript ausgeschlossen, `test-migration.sh` nicht — durch das Delete beides erledigt |
| `upload-cover` | `frontend/src/lib/api.ts`(1) | ✔ 106-07 |
| `deleteUploadedCoverFile` | `api.ts`(1), `AdminAnimeOverviewClient.tsx`(2) | ✔ 106-07 |
| `syncLegacyAnimeCoverImageV2` | `repository/anime_assets.go`(2), **`repository/runtime_authority_test.go`(1, lowercase)** | ⛔ **P-2 — Test-Treffer keinem Plan zugeordnet** |
| `HasCoverImage` | `anime_assets.go`(2), `anime_schema.go`(2) | ✔ 106-05 |
| `createAnimeLegacy` | `admin_content_anime_create_v2.go`(1), `admin_content_anime_metadata.go`(1) | ✔ 106-10 |
| `buildAnimeListWhere(` | `anime.go` + `anime_test.go` (Abgrenzung gegen `buildAnimeListWhereV2(` durch das literale `(` korrekt) | ✔ 106-10 |

**Fazit:** Nach Behebung von P-2, P-3 und P-4 ist Exit 0 erreichbar. Vorher nicht.

**Ausschluss-Begründungen re-verifiziert:** `database/migrations/0018_episode_version_images.*` und `0046_drop_legacy_episode_versions.*` tragen `episode_version_image` dauerhaft ✔; `scripts/schema-v2-audit.ps1` und `scripts/reset-local-schema-cutover-data.ps1` ebenfalls ✔; `scripts/remediate-cover-image.ps1` trägt `SET cover_image` ✔ (wird von 106-03 gelöscht, liegt aber ohnehin außerhalb). Der Root-Scan-Ausschluss ist damit sachlich richtig begründet.

**Scope B (`cover_image`-Spalten-Signaturen, nur `backend/internal`+`backend/cmd`, nur `*.go`):** Die Verengung ist korrekt begründet — `frontend/src` trägt **29** legitime `.cover_image`-DTO-Zugriffe (TS-Property), ein FE-Scan wäre ein garantierter False-Fail. [VERIFIED]

---

## 4. User Constraints (aus 106-CONTEXT.md, LOCKED)

### Locked Decisions
- **D-01:** Append-only Kette, neue Migration ab 0131; Altmigrationen unberührt; vollständige `.down.sql`.
- **D-02:** Migrationsnummer vor Vergabe prüfen (Projekt hatte Kollisionen; parallele GSD-Schreiber auf `main`).
- **D-03:** Nur build-breaking Frontend anfassen (insb. `/covers/[file]/route.ts`); restliche FE-Politur → Phase 109.
- **D-04:** Backend-Legacy-Abbau voll in 106 gemäß §6-Liste — **ohne** `release_media` (gestrichen durch D-07).
- **D-05:** `content_hash` nullable, **KEIN** UNIQUE in 106; Dedup erst Phase 107. Non-unique Index optional (Planner-Ermessen).
- **D-06:** TEXT + benanntes CHECK für alle Enums (Projektkonvention: ≈50 Migrationen TEXT+CHECK, nur 2 native `CREATE TYPE`).
- **D-07:** `release_media` wird in Phase 106 **NICHT** entfernt (Tabelle, Lese- und Schreibpfad, Endpoint) — Verschiebung nach Phase 108 (ROADMAP 108-SC 3b). Contract-Check führt `release_media` als erwartet-VORHANDEN; SC4-Suite kennt die Begriffe `release_media`/`CreateReleaseMedia` nicht.
- **PO-Entscheid 2026-07-22:** `anime.cover_image` bleibt — anders als `release_media` — im Abbau-Scope, weil der Drop-in-Ersatz `animeCoverImageSelectSQL` bereits produktiv existiert und die Umstellung mechanisch/verhaltenserhaltend ist.

### Claude's Discretion
- Contract-Check-Umfang: `scripts/schema-v2-contract-check.ps1` erweitern **oder** analoges Skript neu anlegen.
- Exakte DROP-Reihenfolge und `.down.sql`-Rückbau innerhalb der Migration.
- Ob/welcher non-unique Index auf `content_hash` gesetzt wird.

### Deferred Ideas (OUT OF SCOPE)
- Voller Frontend-Legacy-Abbau (`ScreenshotGallery.tsx`, `screenshotImage.ts`, doppelte `GroupAssets`-Typen, tote Admin-Upload-Komponenten) → **Phase 109**.
- `UNIQUE(content_hash)` / Dedup-Logik → **Phase 107**.
- Verwendungsrelationstabellen + Kernmedien-FK-Slots + Permissions → **Phase 108**.
- Reset-/Seed-Skripte, TSV-Cover-Zuordnung, E2E-Gate, `frontend/public/covers/` → **Phase 110**.

## Project Constraints (aus CLAUDE.md)

| Direktive | Relevanz für 106 | Status |
|-----------|------------------|--------|
| Produktionsdateien ≤ 450 Zeilen | `admin_content_anime_themes.go` (2259), `anime_assets.go` (1855), `member_profile_repository.go` (1823) verletzen das Limit **bereits heute** und werden von 106-05/106-09 editiert. Alle drei **schrumpfen** durch die Phase. | Vorbestand, kein 106-Verstoß — keinen Split in 106 verlangen (Phasengrenze) |
| Append-only Migrationen | D-01 ✔ | ✔ |
| Deutscher UI-Text mit echten Umlauten | 106 ändert keine user-facing Strings (Fehlercodes sind IDs, keine UI-Texte) | ✔ |
| `@/components/ui`-Primitives Pflicht | 106 legt keine UI an; `AdminAnimeOverviewClient.tsx` wird nur um einen Aufruf gekürzt | ✔ (Phase 109) |
| Admin-Aktionen brauchen Audit-Attribution nach User-ID | ⚠ Kollidiert mit dem ersatzlosen Wegfall der `asset_lifecycle`-Audit-Schreibung | → P-5, PO-Entscheid einholen |
| Alles auf `main`, keine Worktrees, kein `git stash` | Parallele 107-Planung schreibt gleichzeitig in `.planning/` → `git diff --name-only`-Gates müssen gescopet sein (106-09 Task 1 macht das bereits richtig) | ✔ |
| GSD-Workflow für alle Änderungen | — | ✔ |

---

## 5. Zielschema-Bestätigung (SC1 / DECISION §1)

### `media` — Ebene 1

| Spalte | Typ (empfohlen) | Quelle |
|--------|-----------------|--------|
| `id` | `BIGSERIAL PRIMARY KEY` | Projektkonvention (alle Tabellen ab 0044) |
| `kind` | `TEXT NOT NULL` + `chk_media_kind CHECK (kind IN ('image','video','audio'))` | §1, D-06 |
| `storage_key` | `TEXT NOT NULL` | §1 |
| `original_filename` | `TEXT` | §1 |
| `mime_type` | `TEXT` | §1 |
| `byte_size` | `BIGINT` | §1 |
| `width` / `height` | `INTEGER` | §1 |
| `duration_seconds` | `DOUBLE PRECISION` | §1 |
| `content_hash` | `TEXT` **nullable, KEIN UNIQUE** | §1, **D-05** |
| `source` | `TEXT NOT NULL` + `chk_media_source` | §1, D-06 |
| `source_ref` | `TEXT` | §1 |
| `credit` / `rights_note` | `TEXT` (nullable, PO-Entscheid 3) | §1, §5.3 |
| `owner_user_id` | `BIGINT NULL REFERENCES users(id) ON DELETE SET NULL` | §1 — **`users.id` ist `BIGSERIAL` [VERIFIED: `0044:4-5`]** |
| `owner_member_id` | `BIGINT NULL REFERENCES members(id) ON DELETE SET NULL` | §1 — **`members.id` ist `BIGSERIAL` [VERIFIED: `0044:128-129`]** |
| `processing_status` | `TEXT NOT NULL DEFAULT 'processing'` + `chk_media_processing_status` | §1, D-06 |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | §1 |

**Verbotene Spalten (§1):** `caption`, `visibility`, `review_status`, `category`, `sort_order` — Negativ-Assertion in 106-01 Task 1 deckt alle fünf ab ✔.

**ON-DELETE-Verhalten der Owner-FKs:** `ON DELETE SET NULL` ist die richtige Wahl und deckt sich mit der etablierten Projektkonvention — `members.user_id BIGINT REFERENCES users(id) ON DELETE SET NULL` (`0044:130`) und `members.avatar_media_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL` (`0044:134`). `CASCADE` wäre falsch: Das Medium muss einen gelöschten Uploader überleben (der Gamification-Credit verfällt, das Asset nicht). [VERIFIED: `database/migrations/0044_add_db_schema_v2_target_tables.up.sql`]

### `media_variant` — Ebene 2

`id BIGSERIAL PK`, `media_id BIGINT NOT NULL REFERENCES media(id) ON DELETE CASCADE`, `variant TEXT NOT NULL` + `chk_media_variant_variant CHECK (variant IN ('original','thumbnail','preview'))`, `storage_key TEXT NOT NULL`, `width`/`height INTEGER`, `byte_size BIGINT`, `mime_type TEXT`, `status TEXT NOT NULL DEFAULT 'ready'` + `chk_media_variant_status CHECK (status IN ('ready','missing','failed'))`. Entspricht §1 Ebene 2 ✔.

**Index-Empfehlung (D-05-Ermessen):** `CREATE INDEX idx_media_content_hash ON media (content_hash) WHERE content_hash IS NOT NULL;` — rein struktureller Vorgriff, kein UNIQUE. Phase 107 plant explizit eine **eigene** Migration mit partiellem UNIQUE (`107-RESEARCH.md:72`) — 106 darf ihm nicht vorgreifen. Zusätzlich `idx_media_variant_media_id` für den FK-Lookup.

### Enum-Konvention (D-06)
TEXT+CHECK ist projektdominant. Referenz-Analog für die Formulierung: `database/migrations/0129_release_playback_entitlements.up.sql` (benannte `CONSTRAINT chk_<table>_<col> CHECK (col IN (…))`).

---

## 6. Architecture Patterns

### Migrations-Runner — Auflösungsreihenfolge (wichtig für 106-03/106-08)

```
ResolveMigrationsDir(custom):                      // backend/internal/migrations/runner.go:52
  custom != ""  → validateMigrationDir(custom)
  sonst Kandidaten IN DIESER REIHENFOLGE:
    ./database/migrations
    ../database/migrations
    ../../database/migrations
    ../../../database/migrations
```

**Konsequenz:** Das CWD entscheidet. Im Container (WORKDIR `/app`, Mount `./database/migrations:/app/database/migrations:ro`, `docker-compose.yml:151`) ist die Auflösung eindeutig richtig. Beim lokalen `cd backend && go run ./cmd/migrate up` würde heute `backend/database/migrations` (das tote 001-Schema) gewinnen. Nach 106-03 ist diese Falle beseitigt.

### Kanonische Cover-Expression (Ersatz für die Rohspalte)

```go
// backend/internal/repository/anime_v2.go:415-427 — Stand VOR 106-05
func animeCoverImageSelectSQL(animeAlias string) string {
	return fmt.Sprintf(`
		COALESCE(
			NULLIF(BTRIM(%s.cover_resolved_url), ''),
			poster.file_path,
			CASE WHEN %s.source LIKE 'jellyfin:%%' … END
		)`, …)
}
```

Der `poster`-Alias stammt aus einem `LEFT JOIN LATERAL (… anime_media am JOIN media_assets ma … mt.name='poster' … LIMIT 1) poster ON true` (`anime_v2.go:66-76`). Die Alias-Parametrisierung in 106-09 Task 1 (`animeCoverImageSelectSQLWithPoster` + `animeCoverPosterLateralSQL`) ist der richtige Weg — Consumer-Queries brauchen **beides**, und der Alias `poster` kollidiert in mehreren Zielqueries. Der gewählte Ersatz-Alias `cover_poster` kollidiert mit keinem bestehenden Alias (`anime_banner`, `poster`, `cover_file`, `cover_asset`, `anime_poster`). [VERIFIED]

### Anti-Patterns in diesem Kontext

- **Negiertes grep auf möglicherweise fehlende Datei** (`! grep -lq … 0131_*.sql`): liefert bei fehlender Datei Exit 2, negiert zu einem FALSE PASS. 106-08 vermeidet das korrekt per Glob + `wc -l == 1` + `-f`. Beibehalten.
- **Pauschaler Term-Ausschluss statt Signatur-Suche:** der ursprüngliche `cover_image`-Ausschluss maskierte acht lebende Leser. Die jetzige Signatur-Lösung ist richtig — braucht aber zwingend die begleitende `cover_url`-Umbenennung in `anime_relations.go` (106-09 Task 2), sonst False-Fail.
- **Case-Sensitivity-Annahmen zwischen `grep` (case-sensitiv per Default) und PowerShell `Select-String` (case-INsensitiv per Default):** Ursache von P-3 und P-4. Wenn das Gate-Skript in PowerShell läuft, müssten die Term-Trefferlisten der Pläne case-insensitiv ermittelt worden sein — sie waren es nicht.
- **Symbol-Löschung ohne Prüfung positiver String-Assertionen:** `runtime_authority_test.go` bricht ohne Compile-Fehler (P-2).

---

## 7. Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|--------------------|-------------|-------|
| Schema-Introspektion für den Contract-Check | Eigene `information_schema`-Logik | `scripts/schema-v2-audit.ps1` (304 Z.) 1:1 spiegeln — `Invoke-LocalPsql`, `team4s_v2`/`team4s`-Identitätsguard, Hashmaps aus `information_schema.tables/.columns` + `pg_constraint`/`pg_get_constraintdef`, `$contractPassed`-Gate | Guard gegen Lauf auf falscher DB ist bereits erprobt |
| Migrations-Content-Test | Eigenes Test-Harness | `backend/internal/migrations/release_content_source_groups_test.go` (36 Z.) spiegeln — `os.ReadFile` relativ + `strings.Contains` | Kein DB-Zugriff nötig, läuft in W1 vor Anwendung der Migration |
| Cover-URL-Ableitung | Neue COALESCE-Variante je Query | `animeCoverImageSelectSQLWithPoster` + `animeCoverPosterLateralSQL` (106-09) | Genau eine Quelle der Wahrheit; verhindert Divergenz zwischen den 8 Call-Sites |
| Enum-Repräsentation | Native `CREATE TYPE` | TEXT + benanntes CHECK (D-06) | Additive Werterweiterung ohne `ALTER TYPE`-Schmerz; Projektdominanz ≈50:2 |
| Upload-Verzeichniserstellung nach asset_lifecycle-Wegfall | Neue Provisionierungslogik | `os.MkdirAll(storagePath, 0755)` existiert bereits (`media_upload.go:164`) | Kein Ersatz nötig — siehe P-5 |
| Pfad-Traversal-Schutz | Neuen Guard schreiben | `resolveUploadStoragePath` + `isUploadPathWithinBase` unverändert übernehmen, nur den Fehlertyp tauschen | 106-06 sichert das bereits per grep-Acceptance ab |

---

## 8. Common Pitfalls

### Pitfall 1 — Prämissen aus §6 als Fakt behandeln
**Was schiefgeht:** §6 sagt „tot", der Code sagt „lebt". Dreimal in Folge eingetreten (`release_media`, `anime.cover_image`, `UploadMediaAsset.ID`).
**Warum:** §6 wurde aus einer Deep-Analyse abgeleitet, die Symbolnamen statt Datenflüsse betrachtet hat.
**Vermeidung:** Vor jedem Löschen die **Datenflussrichtung** prüfen: Wird das Symbol auch **geschrieben/zurückgegeben** (nicht nur gelesen)? `UploadMediaAsset.ID` sah wie ein Legacy-Eingabefeld aus, ist aber ein Ausgabefeld.
**Frühwarnzeichen:** Ein Struct-Feld, das in einer `…V2`-Funktion **zugewiesen** wird.

### Pitfall 2 — Case-Sensitivity zwischen grep und Select-String
**Was schiefgeht:** Trefferlisten mit `grep` (case-sensitiv) ermittelt, Gate läuft mit `Select-String` (case-insensitiv) → das Gate findet mehr als die Planung.
**Vermeidung:** Alle SC4-Term-Trefferlisten mit `grep -i` ermitteln, oder `Select-String -CaseSensitive` erzwingen und das im Skript dokumentieren.
**Konkret hier:** P-3 (`listReleaseImages`), P-4 (`EpisodeVersionImage`), und `runtime_authority_test.go` normalisiert seine Assertion-Fragmente per `strings.ToLower` → dort erscheinen alle Legacy-Symbole in Kleinschreibung.

### Pitfall 3 — Positive String-Assertionen in `runtime_authority_test.go`
**Was schiefgeht:** Die Datei ist ein „Runtime-Authority"-Gate mit **positiven** `strings.Contains`-Assertionen über Quelltexte. Jedes gelöschte Symbol, das dort gelistet ist, bricht den Test — ohne Compile-Fehler.
**Vermeidung:** Vor jedem Symbol-Delete `grep -i "<symbol_lowercase>" backend/internal/repository/runtime_authority_test.go`.
**Betroffen:** `syncLegacyAnimeCoverImageV2` (:120 → 106-05), `cover_image`-Query-Fragmente (:18/:21 → 106-10), Kommentar-Fragment (:123 → 106-05). **Nicht** betroffen und zu erhalten: `release_media`-Assertionen (:161-163).

### Pitfall 4 — Zwei Migrationsverzeichnisse
`database/migrations/` (aktiv, gemountet) vs. `backend/database/migrations/` (tot, aber per CWD erreichbar). Verwechslung führt entweder zum Ausführen des toten UUID-Schemas oder zum Löschen der aktiven Kette. 106-03 Task 1 adressiert das korrekt (`[ ! -d database/migrations ]` aus `backend/` heraus).

### Pitfall 5 — DTO-Feld `cover_image` vs. SQL-Spalte `cover_image`
Das JSON-Feld bleibt in allen DTOs (`models/anime.go`, `admin_content.go`, `watchlist.go`, `fansub.go`; 29 FE-Zugriffe). Nur die Rohspalte fällt. Jeder Gate-Grep muss beide trennen — über SQL-Signaturen + `json:`/`applyString`/`CoverImage`-Filter.

### Pitfall 6 — Stale Docker-Backend
Neue Routen/Schema erscheinen erst nach `docker compose up -d --build team4sv30-backend`. Ohne Rebuild maskiert ein stale Container Erfolg **und** Fehler. Der Bash-Sandbox erreicht keine Host-Ports — deshalb ist der `checkpoint:human-verify` in 106-08 unvermeidbar und richtig.

### Pitfall 7 — Statisches Next-Serving unter `public/`
Das Löschen eines Route-Handlers entfernt nicht zwingend die URL: `frontend/public/covers/` serviert `/covers/*` weiterhin statisch. Live-404-Checks auf solche Pfade sind kein Beleg (siehe P-8).

### Pitfall 8 — API-Contract-Drift
Ein entfernter Endpoint, dessen OpenAPI-Beschreibung stehen bleibt, ist ein Defekt und (hier zusätzlich) ein Gate-Blocker, weil `shared/contracts` im SC4-Scan liegt. Jede Route-Entfernung braucht einen Contract-Schritt (P-3).

---

## 9. Runtime State Inventory

> Phase 106 ist keine Rename-/Datenmigrations-Phase (Testdaten werden vor der E2E-Phase zurückgesetzt), aber `DROP COLUMN` + Code-Entfernung haben Laufzeit-Seiteneffekte.

| Kategorie | Gefundene Items | Erforderliche Aktion |
|-----------|-----------------|----------------------|
| **Gespeicherte Daten** | `anime.cover_image`-Spaltenwerte gehen mit 0131 verloren. Datenverlust ist per Architekturentscheid akzeptiert (Testdaten-Reset). `.down.sql` rekonstruiert nur die Struktur, nicht die Werte. | Keine Datenmigration — im 106-01-SUMMARY dokumentieren |
| **Live-Service-Config** | **Keine** — kein n8n/Datadog/Tailscale/Cloudflare-Bezug in diesem Scope (verifiziert per Scope-Analyse: nur Go-Backend, Next-Frontend, Postgres, alle Config in Git bzw. `.env`). | Keine |
| **OS-registrierte States** | **Keine** — kein Task-Scheduler-/pm2-/systemd-/launchd-Bezug (verifiziert: einziger Prozess-Orchestrator ist Docker Compose). | Keine |
| **Secrets / Env-Vars** | `MEDIA_STORAGE_DIR` (`cfg.MediaStorageDir`) und `MEDIA_PUBLIC_BASE_URL` bleiben unverändert — die kanonische Root-Pfad-Formel in 106-06 nutzt exakt dieselbe Variable wie der bisherige nil-Fallback. **Kein Env-Rename, kein Secret betroffen.** | Keine |
| **Build-Artefakte / installierte Pakete** | Docker-Image `team4sv30-backend` muss nach der Phase neu gebaut werden (Pitfall 6). **Keine** Go-Modul-/npm-Änderung (keine Installs in dieser Phase). | `docker compose up -d --build team4sv30-backend` im 106-08-Checkpoint — bereits im Plan |
| **Dateisystem** | `<MEDIA_STORAGE_DIR>/anime/<id>/{cover,banner,logo,background,background_video}/` — die von `asset_lifecycle` vorab angelegten Ordner bleiben als leere Verzeichnisse zurück (harmlos). `frontend/public/covers/` (4 Dateien) bleibt bestehen. | Keine in 106; `public/covers/` für Phase 110 vormerken |
| **DB-Objekte ohne Code** | `admin_anime_mutation_audit`-Zeilen mit `mutation_kind = 'anime.asset_lifecycle.provision'` bleiben nach dem Code-Delete als historische Einträge liegen (Tabelle wird nicht gedroppt). Harmlos, aber der Wert wird nie mehr erzeugt. | Keine — im 106-06-SUMMARY erwähnen |

---

## 10. Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Go `testing` + `github.com/stretchr/testify` (Backend); Vitest 3 + `tsc --noEmit` (Frontend) |
| Config file | Keine Go-Test-Config; Migrations-Content-Test-Muster unter `backend/internal/migrations/*_test.go`. Frontend: `frontend/vitest.config.ts`; Scripts `npm run test` (`vitest run`) / `npm run typecheck` (`tsc --noEmit`) [VERIFIED: `frontend/package.json:5-12`] |
| Quick run command | `cd backend && go build ./... && go vet ./...` |
| Full suite command | `cd backend && go test ./internal/migrations/... ./internal/repository/... ./internal/handlers/...` (+ `cd frontend && npm run typecheck` für 106-07) |
| Estimated runtime | ~30–60 s (build/vet), Testsuite zusätzlich ~30–60 s |

### Phase Requirements → Test Map

| SC | Verhalten | Test-Typ | Automatisiertes Kommando | Datei vorhanden? |
|----|-----------|----------|--------------------------|------------------|
| SC1 | `media`/`media_variant` mit exaktem Spaltensatz, verbotene Spalten abwesend, `content_hash` ohne UNIQUE | migration-content | `cd backend && go test ./internal/migrations/... -run MediaCore` | ❌ Wave 0 (106-01) |
| SC1 (live) | Zielschema in frischer DB vorhanden | contract-check | `powershell -File scripts/media-core-contract-check.ps1 -FailOnContractGaps` | ❌ Wave 0 (106-02) |
| SC2 | Legacy-Go-Symbole entfernt, Build grün | build/vet | `cd backend && go build ./... && go vet ./...` | ✔ |
| SC2 | Upload-Pfad intakt nach Cluster-B/G-Abbau | unit | `cd backend && go test ./internal/handlers/... -run MediaUpload` | ✔ `media_upload_test.go` (⚠ P-1: Struct-Literal :206 anpassen) |
| SC2 | Cover-Leser umgestellt, Repository-Queries konsistent | unit | `cd backend && go test ./internal/repository/... -run Anime` | ✔ `anime_test.go`, `anime_relations_admin_test.go`, `runtime_authority_test.go` (⛔ P-2) |
| SC2 (D-07) | `release_media`-Lese-/Schreibpfad unverändert | regression | `cd backend && go test ./internal/repository/... -run RuntimeAuthority && go test ./internal/handlers/... -run ReleaseAssets` | ✔ |
| SC2 (FE) | Kein verwaister Import nach Route-Delete | typecheck | `cd frontend && npm run typecheck` | ✔ |
| SC3 | Kette 1→n auf leerer DB | integration (live) | `docker compose exec team4sv30-backend /app/migrate up` | manuell (Checkpoint 106-08) |
| SC4 | Keine Rest-Referenzen | static | `powershell -File scripts/media-core-legacy-grep.ps1` (Exit 0) | ❌ Wave 0 (106-02; ⛔ P-3/P-4) |
| SC4 | `cover_image`-Spalten-Signaturen leer | static | `grep -rnE "a\.cover_image\|,[[:space:]]*cover_image\|cover_image[[:space:]]*=\|SET cover_image" backend/internal backend/cmd --include=*.go \| grep -v 'json:' \| grep -v 'applyString'` | ✔ |

### Sampling Rate
- **Pro Task-Commit:** `cd backend && go build ./... && go vet ./...`
- **Pro Wellen-Merge:** volle Go-Testsuite über `internal/migrations`, `internal/repository`, `internal/handlers`
- **Ab Welle 3 zusätzlich:** `cover_image`-Signatur-Grep (muss am Ende von Welle 4 leer sein)
- **Phasen-Gate:** Kette 1→n + Contract-Check + grep-Suite Exit 0 + Live-Checkpoint
- **Max feedback latency:** 60 s

### Wave 0 Gaps
- [ ] `database/migrations/0131_media_core_schema.up/.down.sql` — SC1/SC2/SC3 (106-01)
- [ ] `backend/internal/migrations/media_core_schema_test.go` — SC1 (106-01)
- [ ] `scripts/media-core-contract-check.ps1` — SC3 (106-02)
- [ ] `scripts/media-core-legacy-grep.ps1` — SC4 (106-02), **nach P-3/P-4 korrigiert**
- [ ] `backend/internal/repository/anime_cover_sql.go` — SC2 (106-09)
- [ ] `backend/internal/handlers/media_upload_errors.go` — SC2 (106-06)

Kein Test-Framework-Install nötig (Go-Toolchain + testify + Vitest vorhanden).

---

## 11. Security Domain

### Anwendbare ASVS-Kategorien

| ASVS-Kategorie | Gilt | Standard-Control in dieser Phase |
|----------------|------|----------------------------------|
| V2 Authentication | nein | 106 ändert keinen Auth-Pfad; `POST /admin/upload` behält `CommentAuthIdentityFromContext` |
| V3 Session Management | nein | unberührt |
| V4 Access Control | **teilweise** | §3 des Entscheids: `POST /admin/upload` und `DELETE /admin/media/:id` haben **kein Capability-Gate** — Härtung ist Phase-108-Scope. **106 darf die Lage nicht verschlechtern** → P-5 (Wegfall der Entity-Existenzprüfung) ist hier einzuordnen |
| V5 Input Validation | ja | `entity_type`/`asset_type`-Normalisierung bleibt im Handler (`media_upload.go:105-116`, unabhängig vom gelöschten Service ✔); MIME-/Größen-Validierung `validateFile` unberührt |
| V6 Cryptography | nein | SHA-256/`content_hash` wird erst in Phase 107 berechnet; 106 legt nur die nullable Spalte an |
| V12 File Upload | ja | Pfad-Traversal-Schutz `resolveUploadStoragePath` + `isUploadPathWithinBase` bleibt wörtlich erhalten (106-06 sichert das per grep-Acceptance ✔) |

### Bekannte Threat-Patterns (Go/Gin + Postgres + Next.js)

| Pattern | STRIDE | Standard-Mitigation | Status in 106 |
|---------|--------|---------------------|---------------|
| Pfad-Traversal beim Upload | Elevation of Privilege | `filepath.Rel`-basierter Base-Guard | ✔ erhalten (106-06) |
| Ungeprüfte Entity-Referenz beim Upload | Tampering / Resource Abuse | Existenzprüfung der Ziel-ID vor dem Write | ⚠ **fällt weg** → P-5 |
| Fehlender Audit-Trail für Admin-Mutationen | Repudiation | Audit-Seam pro Mutation (CLAUDE.md-Constraint) | ⚠ **fällt weg** → P-5 |
| Löschen noch referenzierter `media_assets` | Tampering / Data Loss | `NOT EXISTS`-Referenzguards vor `DELETE` | ✔ erhalten (D-07 schützt die `release_media`-Guards; 106-05/106-10 mit expliziten grep-Assertions) |
| SQL-Injection | Tampering | Parametrisierte pgx-Queries; die neuen `fmt.Sprintf`-Einbettungen in 106-09 fügen **nur konstante SQL-Fragmente** ein (Alias-Namen aus Literalen), keine Nutzerdaten | ✔ — im Plan-Check zu bestätigen |
| API-Contract-Drift (Endpoint entfernt, OpenAPI bleibt) | Repudiation | Contract mit Code synchron halten | ⛔ → P-3 |
| Supply Chain (Package-Installs) | Tampering | — | ✔ **Keine npm/go/pip-Installs in dieser Phase** |

---

## 12. Package Legitimacy Audit

**Nicht anwendbar.** Phase 106 installiert **keine** externen Pakete: kein Plan enthält `npm install`, `go get`, `pip install` oder `cargo add`; `backend/go.mod` und `frontend/package.json` stehen in keinem `files_modified`. Alle STRIDE-Register führen `T-106-NN-SC | Package-Installs | accept | Keine Installs` — verifiziert korrekt. Kein Supply-Chain-Vektor, kein slopcheck-Lauf erforderlich.

---

## 13. Environment Availability

| Dependency | Benötigt von | Verfügbar | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Go-Toolchain | Build/Tests aller Backend-Pläne | ✔ (`backend/go.mod`) | 1.25 | — |
| Docker + Compose | 106-08 Live-Gate (Backend-Rebuild, psql) | ✔ (`docker-compose.yml`) | — | Keiner — Checkpoint ist deshalb `human-verify` |
| PostgreSQL 16 (`team4sv30-db`) | Contract-Check, Kettenlauf | ✔ (Compose-Service) | 16 | — |
| PowerShell | Gate-Skripte `media-core-*.ps1` | ✔ (Windows-Host, Projektkonvention `scripts/*.ps1`) | — | — |
| Node/npm | 106-07 `npm run typecheck` | ✔ (`frontend/package-lock.json`) | Next 16 / React 18.3.1 | — |
| psql im DB-Container | Contract-Check via `docker compose exec -T team4sv30-db psql` | ✔ (Analog `schema-v2-audit.ps1:8-22` nutzt genau diesen Weg) | — | — |

**Blockierend fehlend:** keine.
**Einschränkung:** Der Bash-Sandbox erreicht **keine Host-Ports und keine Docker-DB** (Projektgedächtnis, bestätigt). Alle DB-/HTTP-Nachweise müssen über den `checkpoint:human-verify` in 106-08 laufen — so geplant ✔.

---

## 14. Assumptions Log

| # | Claim | Abschnitt | Risiko falls falsch |
|---|-------|-----------|---------------------|
| A1 | Die SC4-Gate-Skripte laufen als PowerShell `Select-String` und sind damit **case-insensitiv** | §2 P-3/P-4, §3.5 | Falls das Skript `-CaseSensitive` setzt, entfällt der `listReleaseImages`-Treffer (P-3 wäre kein Gate-Blocker, bliebe aber ein Contract-Drift-Defekt). Der `EpisodeVersionImage`-Befund (P-4) bliebe in jedem Fall gültig. **Empfehlung: Case-Verhalten im Skript explizit festlegen, nicht implizit lassen.** [ASSUMED] |
| A2 | Next.js serviert `frontend/public/covers/*` weiterhin statisch, nachdem der Route-Handler `app/covers/[file]/route.ts` gelöscht wurde | §2 P-8 | Falls Next die URL nach Handler-Delete gar nicht mehr bedient, liefert der 404-Check doch ein Signal. Betroffen ist nur die **Aussagekraft** des Live-Checks, kein Code-Risiko. Im Checkpoint klärbar. [ASSUMED] |
| A3 | `ScreenshotGallery` rendert bei 404 denselben Fehlerzustand wie heute bei 500 | §2 P-6 | Falls die Komponente unterschiedlich reagiert, wäre es eine sichtbare FE-Änderung in einer Phase, die „kein Verhaltensumbau am Frontend" zusichert. Im 106-08-Checkpoint mit einem Blick verifizierbar. [ASSUMED] |
| A4 | Die Live-DB hat `anime.slug` (→ `HasSlug=true`, Legacy-Zweige unerreichbar) | §1 Item H | Falls nicht, würde 106-10 lebende Pfade entfernen. Indizien dafür, dass es stimmt: `0044_add_db_schema_v2_target_tables` ist längst angewendet und `admin_content_anisearch.go` nutzt `a.slug` ungated. **Im 106-08-Live-Gate per `\d anime` gegenprüfen.** [ASSUMED] |
| A5 | Der Verlust der `asset_lifecycle`-Audit-Zeilen ist fachlich akzeptabel | §2 P-5 | CLAUDE.md führt „Admin-Aktionen brauchen Audit-Attribution nach User-ID" als Constraint — das spricht eher **gegen** den ersatzlosen Wegfall. **PO-Entscheid einholen.** [ASSUMED] |
| A6 | Die `anime.cover_image`-Spalte existiert in der Live-DB tatsächlich noch (sonst wäre der DROP ein No-Op und die 8 Leser bereits heute defekt) | §1 Item D | Falls die Spalte fehlt, wären Watchlist/Relationen/Gruppenprojekte/Member-Profil **heute schon** kaputt — extrem unwahrscheinlich, da es sich um Live-Oberflächen handelt. `DROP COLUMN IF EXISTS` ist ohnehin tolerant. [ASSUMED] |

---

## 15. Open Questions

1. **P-3-Lösungsweg: OpenAPI-Contract in 106 mitziehen oder `shared/contracts` aus dem SC4-Scope nehmen?**
   - Bekannt: Das Gate ist in beiden Fällen erreichbar.
   - Unklar: ob 106 als „reines Schema-/Legacy-Fundament" den Contract anfassen soll. Die Phasengrenze sagt „kein Verhaltensumbau" — das Entfernen einer Contract-Beschreibung für einen entfernten Endpoint ist kein Verhaltensumbau, sondern Konsistenz.
   - **Empfehlung: Option A** (Contract in 106-03 mitziehen). Ein Contract, der einen nicht existierenden Endpoint beschreibt, ist ein Drift-Defekt und würde in Phase 109 (FE-Contract-Disziplin) erneut auffallen.

2. **P-5: Entity-Existenzprüfung ersetzen oder Verlust akzeptieren?**
   - Bekannt: Der Handler validiert `entity_type`/`asset_type` selbst; nur die ID-Existenzprüfung und der Audit-Eintrag fallen weg.
   - Unklar: ob der CLAUDE.md-Constraint „Admin-Aktionen brauchen Audit-Attribution" die ersatzlose Entfernung der Audit-Schreibung verbietet.
   - **Empfehlung:** PO-Entscheid. Billigste Variante: eine kurze Existenzprüfung im Handler mit Code `media_upload.invalid_entity_id` behalten, Audit-Verlust dokumentiert an Phase 108 übergeben.

3. **A4: Live-Schema-Bestätigung für `anime.slug`.**
   - **Empfehlung:** Als expliziten Schritt in den 106-08-Checkpoint aufnehmen (`docker compose exec -T team4sv30-db psql … -c "\d anime"` — `slug` vorhanden, `cover_image` nach 0131 abwesend). Kostet nichts und schließt das letzte Legacy-Zweig-Risiko.

4. **Reihenfolge-Frage nach der P-2-Korrektur:** Soll 106-05 die Fragment-Entfernung in `runtime_authority_test.go` selbst vornehmen (Welle 2) oder soll die Assertion-Pflege gebündelt in 106-10 (Welle 4) landen?
   - Bekannt: 106-05 braucht die Änderung **sofort**, weil sein eigenes Verify-Kommando (`-run Anime`) den Test trifft. Ein Aufschub bis Welle 4 ist nicht möglich.
   - **Empfehlung:** 106-05 zieht das `syncLegacyAnimeCoverImageV2`-Fragment; 106-10 zieht wie geplant nur die beiden `cover_image`-Query-Fragmente (:18/:21). Zwei Pläne, dieselbe Datei, verschiedene Wellen — sauber.

---

## Sources

### Primary (HIGH confidence)
- Direkte Datei-Reads und `grep`-Läufe gegen den Arbeitsbaum `C:\Users\admin\Documents\Team4s` am 2026-07-22 — sämtliche Zeilenangaben, Trefferzahlen und Code-Zitate in diesem Dokument stammen aus verifizierten Tool-Aufrufen dieser Session.
- `.planning/notes/260721-medienmodell-neubau-architektur-DECISION.md` (§1, §3, §5, §6, §8) — LOCKED
- `.planning/phases/106-medienkern-schema-legacy-abbau/106-CONTEXT.md` (D-01…D-07) — LOCKED
- `.planning/ROADMAP.md` — Phase 106 SC1-SC4, Phase 108 SC 3b
- `.planning/phases/106-…/106-{01..10}-PLAN.md`, `106-VALIDATION.md`
- `.planning/phases/107-…/107-PATTERNS.md`, `107-RESEARCH.md` — Migrationsnummer-Koordination
- `./CLAUDE.md`, `.planning/config.json`, `docker-compose.yml`, `frontend/package.json`

### Secondary (MEDIUM confidence)
- Next.js-`public/`-Serving-Verhalten nach Handler-Delete (A2) — aus Framework-Kenntnis abgeleitet, nicht live geprüft.
- PowerShell-`Select-String`-Default-Case-Verhalten (A1) — Standardverhalten, im noch zu schreibenden Skript zu fixieren.

### Tertiary (LOW confidence)
- Keine. Für diesen Refresh wurden keine Web-Quellen herangezogen — alle Fragen waren codebase-intern beantwortbar.

---

## Metadata

**Confidence breakdown:**
- §6-Prämissen-Audit: **HIGH** — jedes Item per grep/Read gegen den realen Baum geprüft, Trefferzahlen dokumentiert.
- Plan-Set-Validierung (Pfade/Zeilen): **HIGH** — alle `files_modified`-Pfade und ~60 Zeilenreferenzen einzeln bestätigt.
- Zielschema + FK-Typen: **HIGH** — `users.id`/`members.id` als `BIGSERIAL` und die `ON DELETE SET NULL`-Konvention aus `0044` verifiziert.
- Migrationsnummer: **HIGH** — Verzeichnis + `git status` + Phase-107-Planung geprüft.
- SC4-Erreichbarkeit: **MEDIUM-HIGH** — abhängig vom Case-Verhalten des noch zu schreibenden Skripts (A1); die Zuordnungslücken (P-2/P-3) bestehen unabhängig davon.
- Live-Verhalten (Next-`public/`-Serving, ScreenshotGallery-Fehlerzustand, `anime.slug`): **MEDIUM** — Bash-Sandbox erreicht keine Host-Ports; im 106-08-Checkpoint zu bestätigen.

**Research date:** 2026-07-22
**Valid until:** 2026-08-05 (14 Tage — kürzer als der Standard, weil `main` parallele GSD-Schreiber trägt; vor Ausführung `git log --oneline -5` prüfen und die Zeilenreferenzen der Wellen-2-Pläne stichprobenartig gegenlesen)
