---
phase: 165
slug: library-discovery-assisted-anime-creation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-21
---

# Phase 165 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go `testing` + `github.com/stretchr/testify` (backend); Vitest 3 (frontend) |
| **Config file** | `frontend/vitest.config.ts`; Go-Tests ohne separate Config über `go test ./...` |
| **Quick run command** | `cd backend && go test ./internal/handlers/... ./internal/repository/... -run Jellyfin` / `cd frontend && npx vitest run src/app/admin/anime/create` |
| **Full suite command** | `cd backend && go test ./...` / `cd frontend && npm test` |
| **Estimated runtime** | ~60s (Backend), ~40s (Frontend) |

---

## Sampling Rate

- **After every task commit:** gezielte `go test`/`vitest run` auf den betroffenen Paketen/Dateien
- **After every plan wave:** `go test ./...` (Backend) + `npm test` (Frontend)
- **Before `/gsd:verify-work`:** Beide vollständigen Suiten grün, plus `go vet ./...`, `tsc --noEmit`, ESLint
- **Max feedback latency:** 60 Sekunden

---

## Per-Task Verification Map

> Requirement-IDs werden erst vom Planner final vergeben (165-RESEARCH.md: "Requirements TBD, aus
> 165-USER-REQUEST.md §29–§32 und 165-CONTEXT.md D-01..D-22 abzuleiten"). Diese Tabelle mappt auf die
> im Auftrag bereits benannten Pflicht-Tests plus die neuen D-14..D-22-Verhalten; der Planner überführt
> sie 1:1 in Task-IDs/REQ-IDs.

| Auftrags-Test/Decision | Requirement | Secure/Expected Behavior | Test Type | Automated Command | File Exists | Status |
|--------|-------------|-----------------------|-----------|-------------------|-------------|--------|
| A (unbekannte Series → offen) | D-02/D-03 | Discovery zeigt „offen" für Item ohne DB-Treffer | unit (Handler + Fake-Repo) | `go test ./internal/handlers/... -run TestJellyfinDiscovery` | ❌ W0 | ⬜ pending |
| B (bekannte Series → bereits vorhanden) | D-03 | `FindExistingAnimeByJellyfinIntakeRefs`-Treffer über `source`/`folder_name` | unit | `go test ./internal/handlers/... -run TestJellyfinDiscovery` | ❌ W0 | ⬜ pending |
| C (kein Fuzzy-Match) | D-02/§7 | Naruto ≠ Naruto Shippuden bleibt „offen" | unit | Testdaten mit ähnlichen, nicht identischen Titeln/IDs | ❌ W0 | ⬜ pending |
| D (Zuordnung erst nach AniSearch-Auswahl) | D-02 | Kein automatischer Create bei Namensähnlichkeit ohne technische Referenz | unit (Enrich-Service) | `go test ./internal/services/... -run TestEnrich` | ⚠️ prüfen | ⬜ pending |
| E (Movie-Discovery sichtbar) | D-01/D-04 | „Film"-Items (Pfad-Heuristik `buildJellyfinIntakeTypeHint`) erscheinen in der Liste | unit | Testdaten mit `/Movie/`-Pfad-Fixture | ❌ W0 | ⬜ pending |
| F (Pagination korrekt, kein Fan-out) | D-06/D-07 | Cursor liefert keine Duplikate, ≤1 DB-Query/Seite, 0 Jellyfin-Requests pro Item | integration + Query-Zähler | `go test ./internal/repository/... -run TestJellyfinDiscoveryCursor` | ❌ W0 | ⬜ pending |
| G (Discovery→Draft vollständig) | D-08 | Übernahme ID/Name/Path/Typ-Hint/Jahr/Assets via `handleJellyfinCandidateAdopt` | Frontend-Unit | `npx vitest run src/app/admin/anime/create/DiscoveryLibraryPanel.test.tsx` | ❌ W0 | ⬜ pending |
| H (keine Auto-Auswahl bei 1 Treffer) | D-09 | AniSearch-Suche wählt nie automatisch aus | Frontend-Unit | Muster erweitern (bestehend für Direktflow) | ⚠️ prüfen | ⬜ pending |
| I (AniSearch bleibt maßgeblich beim Merge) | D-09 | `mergeCreateDraftPayload`/`resolveCreateAniSearchDraftMergeInputs` unverändert | Regression | `go test ./internal/services/... -run TestMergeCreateDraft`, `npx vitest run createPageHelpers.test.ts` | ✓ vorhanden | ⬜ pending |
| J/K (alte Flows unverändert) | D-12 | Direkter AniSearch-/Jellyfin-Flow bleibt funktional | Regression | `go test ./... && npm test` | ✓ vorhanden | ⬜ pending |
| L (Assisted Series → direkt Episoden) | D-10 | Redirect-Zweig nach Create (`from=discovery` + `anime.type`) | Frontend-Unit | `npx vitest run createPageHelpers.test.ts` | ❌ W0 | ⬜ pending |
| M (Discovery-Kontext erhalten) | D-11 | Filter/Suche/Cursor via URL-Query erhalten | Frontend-Unit | neue Testdatei | ❌ W0 | ⬜ pending |
| D-14 (Ordnerauswahl + fail-closed) | D-14 | Episoden-Import akzeptiert nur mit dem Anime verbundene `jellyfin_series_id`, UI zeigt Selector nur bei >1 verbundenem Ordner | unit (Handler + Fake-Repo) | `go test ./internal/handlers/... -run TestPreviewEpisodeImport_RejectsUnlinkedSeriesID` | ❌ W0 | ⬜ pending |
| D-15 (teilweise-Status) | D-15 | Serie mit >1 echter Staffel und unvollständiger Zuordnung → Status „teilweise" | unit | — | ⛔ blockiert durch D-15-Checkpoint (165-RESEARCH.md §9) — NICHT in dieser Phase planen, bevor der Auftraggeber die Schema-Option approved hat | ⬜ blocked |
| D-16 (Ordner-Umzug) | D-16 | Deckt sich mit D-05-Pfad, kein neuer Test | — | — | ✓ kein neuer Code | ⬜ n/a |
| D-17 (Ignorieren/Entignorieren) | D-17 | Ignorierter Eintrag verschwindet aus „Offen", Status-Priorität bereits vorhanden > ignoriert > teilweise > offen | unit + integration | `go test ./internal/handlers/... -run TestJellyfinDiscoveryIgnore` | ❌ W0 | ⬜ pending |
| D-18 (Ordner-Management Edit-Seite) | D-18 | Alle `anime_source_links`-Zeilen sichtbar, Haupt-Ordner ohne Entfernen, Zusatz-Ordner entfernbar → danach „offen" | unit (Backend) + Frontend-Unit | `go test ./internal/handlers/... -run TestAnimeJellyfinContext_ListsAllFolders`, `npx vitest run AnimeJellyfinMetadataSection.test.tsx` | ❌ W0 | ⬜ pending |
| D-19 (Cache/Refresh, Status-Trennung) | D-19 | „Aktualisieren" bypasst Cache; Status nach Aktion sofort korrekt trotz TTL-Cache | integration | `go test ./internal/handlers/... -run TestJellyfinDiscoveryCache_StatusBypassesCache` | ❌ W0 | ⬜ pending |
| D-20 (Save-Time-Dublettencheck) | D-20 | `CreateAnime` prüft `anisearch:<id>` unmittelbar vor Insert, kein stilles Doppelanlegen | unit (Handler + Fake-Repo) | `go test ./internal/handlers/... -run TestCreateAnime_RechecksAniSearchDuplicateBeforeInsert` | ❌ W0 | ⬜ pending |
| D-21 (Audit-Attribution) | D-21 | Verbinden/Ordner-lösen/Ignorieren/Entignorieren schreiben je einen `audit_logs`-Eintrag mit `actor_app_user_id` | unit (Fake `AuditLogRepository`) | `go test ./internal/handlers/... -run TestJellyfinDiscoveryActions_WriteAudit` | ❌ W0 | ⬜ pending |
| D-22 (server_key-Default) | D-22 | Neue Tabellenzeilen tragen `server_key='default'` ohne explizite Angabe | unit (Migration/Repo) | `go test ./internal/repository/... -run TestLibraryDiscoveryIgnoredItems_DefaultsServerKey` | ❌ W0 | ⬜ pending |

*Tests N–R (Film-Content-Flow, §32) sind explizit Phase 166 — hier nicht verplant.*

---

## Wave 0 Requirements

- [ ] `backend/internal/handlers/jellyfin_discovery_test.go` — Fake-Jellyfin-HTTP-Server nach Muster `jellyfin_source_batch_test.go:31-40` (httptest, keine echten Jellyfin-Calls in Unit-Tests)
- [ ] `backend/internal/repository/jellyfin_discovery_cursor_test.go` — Cursor-Seek gegen sortierten In-Memory-Snapshot, Muster `release_cursor_pagination.go`
- [ ] `frontend/src/app/admin/anime/create/DiscoveryLibraryPanel.test.tsx` — Muster `CreateAniSearchIntakeCard.test.tsx`
- [ ] Query-Zähler-/N+1-Guard-Test: `FindExistingAnimeByJellyfinIntakeRefs`-Aufrufe pro Discovery-Seite = 1 (D-07-Gate)
- [ ] Regressionstest: `handleJellyfinCandidateAdopt` (Direktflow) funktioniert nach Discovery-Integration unverändert (keine Signaturänderung ohne Test)
- [ ] `backend/internal/handlers/admin_episode_import_ownership_test.go` (D-14) — beweist, dass eine `jellyfin_series_id`, die nicht in `source`/`source_links` des Ziel-Anime vorkommt, mit HTTP 400 abgelehnt wird, BEVOR ein Jellyfin-Call erfolgt (Mock-Jellyfin-Server mit Zero-Call-Assertion)
- [ ] Migrationstest/Fixture für `0170_library_discovery_ignored_items` (D-17/D-22) — beweist additive Migration ohne Datenverlust, `server_key`-Default greift
- [ ] Backend-Testdatei für die D-18-Erweiterung von `buildAnimeJellyfinContext` — beweist, dass bei mehreren `anime_source_links`-Zeilen alle zurückgegeben werden und der Haupt-Ordner korrekt markiert ist
- [ ] Backend-Testdatei für den D-20-Recheck in `CreateAnime` — Fake-Repo mit vorhandenem `anisearch:<id>`-Treffer, beweist Ablehnung/Redirect statt stillem Insert
- [ ] Backend-Testdatei mit Fake-`AuditLogRepository` (D-21) — beweist, dass jede der vier neuen Aktionen genau einen Audit-Eintrag mit korrektem `event_type`/`actor_app_user_id` erzeugt
- [ ] **D-15 explizit NICHT in Wave 0 dieser Phase** — jede Test-/Migrationsarbeit zu D-15 wartet auf den separaten Checkpoint-Plan (165-RESEARCH.md §9)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live-Jellyfin-Discovery-Cache-Aufbau (reale Latenz/Payload) | D-06/D-07/D-19 | Abhängig von echter Jellyfin-Instanz und korrekt konfigurierter `JELLYFIN_ALLOWED_LIBRARY_IDS` (aktuell fehlkonfiguriert, siehe 165-RESEARCH.md Pitfall 1) — nicht in CI reproduzierbar | Nach Env-Fix: Discovery-Seite öffnen, Netzwerk-Tab prüfen (1 Request/Library beim Cache-Warmup, 0 Requests danach); Aktualisieren-Button klicken und erneuten Fetch verifizieren |
| Live-Season-Batch-Messung (D-15-Vorbereitung) | D-15 | `IncludeItemTypes=Season`-Request gegen reale Instanz ist langsam (28,2s live gemessen, 165-RESEARCH.md §9) — nur zur Aufwandsschätzung, kein CI-Test | Nur bei Bedarf während des D-15-Checkpoint-Plans erneut messen, nicht Teil dieser Phase |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — every task across 165-01..165-13 (including 165-12's D-11 return-link pages
and 165-13's D-23 backend `ForceNew` bypass, both added after the initial sign-off) carries a concrete
`<automated>` verify command (Go `go test -run ...` / `npx vitest run ...`); Wave 0 test-scaffold requirements above are
each satisfied by a specific test file created in the corresponding plan (e.g.
`admin_episode_import_ownership_test.go` in 165-04, `jellyfin_source_folder_management_test.go` and
`anime_source_links_test.go` in 165-07, `library_discovery_ignored_items_test.go` in 165-02);
D-15/165-11 is deliberately excluded from Wave 0 per its human checkpoint gate (165-RESEARCH.md §9),
consistent with 165-11's own `must_haves`.
