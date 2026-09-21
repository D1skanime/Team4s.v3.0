---
phase: 165
slug: library-discovery-assisted-anime-creation
status: draft
nyquist_compliant: false
wave_0_complete: false
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
> 165-USER-REQUEST.md §29–§32 und 165-CONTEXT.md D-01..D-13 abzuleiten"). Diese Tabelle mappt auf die
> im Auftrag bereits benannten Pflicht-Tests; der Planner überführt sie 1:1 in Task-IDs/REQ-IDs.

| Auftrags-Test | Requirement | Secure/Expected Behavior | Test Type | Automated Command | File Exists | Status |
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

*Tests N–R (Film-Content-Flow, §32) sind explizit Phase 166 — hier nicht verplant.*

---

## Wave 0 Requirements

- [ ] `backend/internal/handlers/jellyfin_discovery_test.go` — Fake-Jellyfin-HTTP-Server nach Muster `jellyfin_source_batch_test.go:31-40` (httptest, keine echten Jellyfin-Calls in Unit-Tests)
- [ ] `backend/internal/repository/jellyfin_discovery_cursor_test.go` — Cursor-Seek gegen sortierten In-Memory-Snapshot, Muster `release_cursor_pagination.go`
- [ ] `frontend/src/app/admin/anime/create/DiscoveryLibraryPanel.test.tsx` — Muster `CreateAniSearchIntakeCard.test.tsx`
- [ ] Query-Zähler-/N+1-Guard-Test: `FindExistingAnimeByJellyfinIntakeRefs`-Aufrufe pro Discovery-Seite = 1 (D-07-Gate)
- [ ] Regressionstest: `handleJellyfinCandidateAdopt` (Direktflow) funktioniert nach Discovery-Integration unverändert (keine Signaturänderung ohne Test)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live-Jellyfin-Discovery-Cache-Aufbau (reale Latenz/Payload) | D-06/D-07 | Abhängig von echter Jellyfin-Instanz und korrekt konfigurierter `JELLYFIN_ALLOWED_LIBRARY_IDS` (aktuell fehlkonfiguriert, siehe 165-RESEARCH.md Pitfall 1) — nicht in CI reproduzierbar | Nach Env-Fix: Discovery-Seite öffnen, Netzwerk-Tab prüfen (1 Request/Library beim Cache-Warmup, 0 Requests danach) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
