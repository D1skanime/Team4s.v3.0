---
phase: 115
slug: globale-suche-postgres-fts
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-28
---

# Phase 115 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `115-RESEARCH.md` → `## Validation Architecture`. Per-task rows are filled by the planner.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: `go test` · Frontend: `vitest` |
| **Config file** | Frontend: `frontend/vitest.config.ts` · Backend: standard `go test` (per-package) |
| **Quick run command** | `cd backend && go test ./internal/...` · `cd frontend && npx vitest run` |
| **Full suite command** | `cd backend && go test ./...` · `cd frontend && npm run test` |
| **Estimated runtime** | Backend pure-function ~<30s · Frontend vitest ~<60s · Live-Smoke (`scripts/smoke-search.ps1`) ~<20s |

> **NOTE (from RESEARCH Validation Architecture):** Go tests are predominantly pure-function / source-inspection — there is **no live-DB test harness**. The three data-model capabilities (D-12 title persistence, D-04/D-05 matching & ranking, D-11 visibility) are **not unit-testable** and require a live-DB integration test **or** a smoke script with a Keycloak token. **RESOLVED (Wave 0):** the projektkonforme PowerShell Keycloak-Direct-Grant smoke script `scripts/smoke-search.ps1` (created in Plan 115-04 Task 3, executed in Plan 115-08 Task 2) is the chosen harness; the ORDER-BY/WHERE composition and the normalizeAliasKey normalization determinism are additionally proven as pure-function tests (Plan 115-03 Task 3).

---

## Sampling Rate

- **After every task commit:** Run the quick run command for the touched layer
- **After every plan wave:** Run the full suite for the touched layer
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ≤ 60s per touched-layer quick run (backend or frontend)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 115-01-T1 | 01 | 1 | D-12 | T-115-01-* | AltTitles-Persistenzpfad in Create/Patch-Input (kein stiller Verlust) | unit (pure) | `cd backend && go test ./internal/repository -run TestBuildAuthoritativeAnimeMetadata` | ⬜ (created by task) | ⬜ pending |
| 115-01-T2 | 01 | 1 | D-12 | T-115-01-* | Write-Sites auf konsistentes (ja,romaji)/(ja,japanese)-Mapping | unit (pure) | `cd backend && go test ./internal/repository -run TestBuildAuthoritativeAnimeMetadata && go test ./internal/services -run TestBuildAniSearchAltTitles` | ⬜ (created by task) | ⬜ pending |
| 115-02-T1 | 02 | 1 | D-01, D-04, D-09 | T-115-02-02 | Migration deklariert unaccent + Trigram/Normalisierungs-Indizes + tsvector | source-inspection | `grep -c "CREATE EXTENSION IF NOT EXISTS unaccent" database/migrations/0140_search_foundation.up.sql` | ⬜ (created by task) | ⬜ pending |
| 115-02-T2 [BLOCKING] | 02 | 1 | D-01, D-09 | T-115-02-02 | Index-Nutzung statt Seq Scan (live) | MANUAL live (see Manual-Only) | MANUAL — Live-Terminal EXPLAIN ANALYZE (Bash-Sandbox erreicht Host-DB nicht) | docs/performance/anime-search-query-plan-tracking.md | ⬜ pending |
| 115-03-T1 | 03 | 2 | D-02 | T-115-03-01 | Schmales SearchProvider-Interface, ein Impl | build | `cd backend && go build ./internal/models/...` | ⬜ (created by task) | ⬜ pending |
| 115-03-T2 | 03 | 2 | D-03, D-04, D-05, D-06, D-11 | T-115-03-01/02/03 | f_unaccent+trgm-Match, gesetzte Schwelle 0.30, D-05-CASE, Sichtbarkeit | build | `cd backend && go build ./internal/repository/...` | ⬜ (created by task) | ⬜ pending |
| 115-03-T3 | 03 | 2 | D-02, D-03, D-04, D-05, D-11 | T-115-03-01/04 | normalizeAliasKey-Normalisierung (team-4s/team 4s/T4S), dissolved erscheint, Komposition | unit (pure) | `cd backend && go test ./internal/repository -run TestSearch` | ⬜ (created by task) | ⬜ pending |
| 115-04-T1 | 04 | 3 | D-07, D-09 | T-115-04-* | Param-Validierung ($n-Bind), Envelope, Admin-Gate | unit | `cd backend && go test ./internal/handlers -run TestSearch` | ⬜ (created by task) | ⬜ pending |
| 115-04-T2 | 04 | 3 | D-07 | T-115-04-* | Route-Wiring + OpenAPI-Kontrakt | build | `cd backend && go build ./cmd/server` | ⬜ (created by task) | ⬜ pending |
| 115-04-T3 | 04 | 3 | D-04, D-05, D-11, D-12 | T-115-04-* | Smoke-Harness existiert + trifft /api/v1/search (Ausführung → Manual-Only/Plan 08) | existence + source-inspection | `test -f scripts/smoke-search.ps1 && grep -c "api/v1/search" scripts/smoke-search.ps1` | ⬜ (created by task) | ⬜ pending |
| 115-05-T1 | 05 | 4 | D-08 | — | Such-Typen + api.ts-Helfer (öffentlicher fetch, AbortController) | typecheck | `cd frontend && npm run typecheck` | ⬜ (created by task) | ⬜ pending |
| 115-05-T2 | 05 | 4 | D-08 | — | Debounce 250ms + AbortController + searchParams-Sync | unit (vitest) | `cd frontend && npx vitest run src/app/suche/useDebouncedSearch.test.tsx` | ⬜ (created by task) | ⬜ pending |
| 115-05-T3 | 05 | 4 | D-08 | — | AppShell-Nav-Aktivierung beide Gruppen (≤450 Zeilen-Gate) | typecheck + lint | `cd frontend && npm run typecheck && npm run lint` | ⬜ (created by task) | ⬜ pending |
| 115-06-T1 | 06 | 5 | D-08 | — | Route-Shell /suche mit URL-Zustand-Bootstrap | typecheck + lint | `cd frontend && npm run typecheck && npm run lint` | ⬜ (created by task) | ⬜ pending |
| 115-06-T2 | 06 | 5 | D-08 | — | SearchField (Input-Primitive), Debounce, Combobox-Tastatur | unit (vitest) | `cd frontend && npx vitest run src/app/suche/SearchField.test.tsx` | ⬜ (created by task) | ⬜ pending |
| 115-06-T3 | 06 | 5 | D-08 | — | SuggestionList — gruppierte Vorschläge (UI-Primitives) | typecheck + lint | `cd frontend && npm run typecheck && npm run lint` | ⬜ (created by task) | ⬜ pending |
| 115-07-T1 | 07 | 6 | D-06, D-08 | — | SearchResults — URL-gebundene Tabs (key-Remount), Karten, Pagination | unit (vitest) | `cd frontend && npx vitest run src/app/suche/SearchResults.test.tsx` | ⬜ (created by task) | ⬜ pending |
| 115-07-T2 | 07 | 6 | D-06 | — | SearchFilters + Drawer (Select/YearPicker/Chips, UI-Primitives) | typecheck + lint | `cd frontend && npm run typecheck && npm run lint` | ⬜ (created by task) | ⬜ pending |
| 115-07-T3 | 07 | 6 | D-08 | — | page.tsx — Ergebnis-/Filterfläche verdrahtet | typecheck + lint + vitest | `cd frontend && npm run typecheck && npm run lint && npx vitest run src/app/suche/` | ⬜ (created by task) | ⬜ pending |
| 115-08-T1 | 08 | 7 | D-10 | — | Meilisearch-Andockpunkt dokumentiert (SearchProvider) | existence + source-inspection | `test -f docs/search/meilisearch-dock-point.md && grep -ci SearchProvider docs/search/meilisearch-dock-point.md` | ⬜ (created by task) | ⬜ pending |
| 115-08-T2 [checkpoint] | 08 | 7 | D-04, D-05, D-07, D-09, D-11, D-12 | — | Live-UAT: D-12 Re-Import, Smoke-Suite, EXPLAIN-Baseline | MANUAL live (see Manual-Only) | MANUAL — `pwsh scripts/smoke-search.ps1` + EXPLAIN ANALYZE (Live-Terminal) | scripts/smoke-search.ps1 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Decide live-DB integration harness **or** Keycloak-token smoke script for the DB-behaviour validations (D-12 / D-04 / D-05 / D-11) — **RESOLVED:** PowerShell Keycloak-Direct-Grant smoke script `scripts/smoke-search.ps1` (created Plan 115-04 T3, executed Plan 115-08 T2). RESEARCH open question 1 resolved.
- [x] Provide the fixture/seed path proving "Koe no Katachi" → "A Silent Voice" after the D-12 fix — **RESOLVED:** D-12 write-path fix (Plan 115-01) + live Re-Import (Plan 115-08 T2, per RESEARCH Datenkorrektur B: Re-Import statt Bestands-Backfill), verified by `scripts/smoke-search.ps1` D-12-Fall.

*Wave 0 fully resolved — smoke-script harness chosen; no remaining MISSING references.*

---

## Manual-Only Verifications

| Behavior | Requirement | Verified In (Task) | Why Manual | Test Instructions |
|----------|-------------|--------------------|------------|-------------------|
| EXPLAIN ANALYZE uses new trigram/GIN index (not seq scan) | D-01 / D-09 | 115-02-T2 (baseline) · re-checked 115-08-T2 | Query-plan inspection needs a live DB with representative data | Run the search query with `EXPLAIN ANALYZE`; assert `Bitmap Index Scan`/`Index Scan` on a 0140 index (kein Seq Scan), extend `docs/performance/anime-search-query-plan-tracking.md` |
| Search "Koe no Katachi" / "Eiga Koe no Katachi" returns "A Silent Voice" | D-12 | 115-08-T2 (`scripts/smoke-search.ps1` D-12-Fall) | Requires the title-storage fix applied + a re-enriched record in a live DB | After migration + D-12 fix (Plan 01) + Re-Import, hit `/api/v1/search?q=Koe no Katachi`; assert the target anime appears |
| Punctuation/acronym variants "team-4s" / "team 4s" / "T4S" resolve to the Team4s group | D-04 | 115-08-T2 (smoke) · Normalisierungs-Determinismus pure-function in 115-03-T3 | Live row binding needs the actual Team4s group + aliases; determinism itself is unit-proven | `scripts/smoke-search.ps1` queries each variant against `/api/v1/search?type=fansub`; assert the Team4s group is returned for all three |
| Exact match never displaced by popularity/recency | D-05 | 115-08-T2 (smoke ranking case) | Ranking correctness needs real multi-row data | Query a term with an exact main-title hit plus popular partial matches; assert the exact hit ranks first |
| disabled anime excluded, dissolved fansub groups included | D-11 | 115-08-T2 (smoke visibility case) | Visibility rule needs live rows in both states | Seed a `disabled` anime + `dissolved` group; assert the anime is absent and the group present in results |

*Promotion note: all of these depend on a live DB; execution is centralized in Plan 115-08 T2 via `scripts/smoke-search.ps1`. The composition/normalization logic behind D-04/D-05/D-11 is additionally pure-function tested in 115-03-T3, and the D-12 mapping in 115-01.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (only 115-02-T2 and 115-08-T2 are MANUAL live; each is preceded/followed by automated tasks — no 3-in-a-row gap)
- [x] Wave 0 covers all MISSING references (smoke-script harness chosen; D-12 fixture = Re-Import path)
- [x] No watch-mode flags (all vitest runs use `run`; go test is single-shot)
- [x] Feedback latency documented (≤ 60s per touched-layer quick run)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-28
</content>
