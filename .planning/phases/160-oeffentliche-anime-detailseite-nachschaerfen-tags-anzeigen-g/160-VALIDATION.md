---
phase: 160
slug: oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-16
---

# Phase 160 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution (Teilschritt „Tags und Genres").

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend framework** | Go `testing` + `httptest` + `testify` (`github.com/stretchr/testify v1.9.0`) |
| **Backend integration DB** | Real Postgres via `testsupport.OpenPhase106Postgres(t)` (scoped fixture DB, NOT `DATABASE_URL`) |
| **Frontend framework** | Vitest 3.2.4 + `@testing-library/react` (jsdom environment where needed) |
| **Config file** | none — existing infrastructure covers this phase |
| **Backend quick run** | `cd backend && go test ./internal/handlers/... ./internal/repository/... -run TestSearch` (targeted) |
| **Backend full suite** | `cd backend && go test ./...` |
| **Frontend quick run** | `cd frontend && npx vitest run "src/app/anime/[id]/" src/app/suche/` |
| **Frontend full suite** | `cd frontend && npm test` (or `npx vitest run`) |
| **Estimated runtime** | ~90s backend full suite, ~60s frontend full suite |

---

## Sampling Rate

- **After every task commit:** Run the targeted `go test ./internal/... -run <TestName>` and/or `npx vitest run <file>` for the file(s) touched by that task
- **After every plan wave:** Run `go test ./...` (backend) + `npx vitest run` (frontend full)
- **Before `/gsd:verify-work`:** Full suite must be green, including `TestAnimePublicReadDetailStoredSlugAndSQLBudget` (SQL-budget regression guard) and `TestSearchRejectsMissingQuery` (confirms the D-08 bypass didn't break the no-filter-at-all case)
- **Max feedback latency:** ~90 seconds (full backend suite)

---

## Per-Task Verification Map

| Decision ID | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|-------------|-----------|-------------------|-------------|--------|
| D-02/D-03/D-06/D-07 | German tag/genre names stored + resolved on public detail, base name unchanged, no extra query | integration | `go test ./backend/internal/repository/... -run TestAnimePublicReadDetailStoredSlugAndSQLBudget` | ✅ existing, extend | ⬜ pending |
| D-04 | Admin CRUD list for tag/genre names | unit (httptest) | `go test ./backend/internal/handlers/... -run TestAdminTagGenreNames` | ❌ Wave 0 — new handler test file needed | ⬜ pending |
| D-08 | `/suche` works without `q` for tag/genre | unit (httptest) | `go test ./backend/internal/handlers/... -run TestSearch` | ✅ existing (`search_test.go`), extend | ⬜ pending |
| D-08 (fansub pitfall) | `type=alle`/`fansub` + tag/genre-only ⇒ empty fansub side | integration/unit | new case in `search_repository_test.go` | ❌ Wave 0 — new test case (Pitfall 1 regression guard) | ⬜ pending |
| D-09 | Chip links correctly URL-encoded | unit (component) | `npx vitest run "src/app/anime/[id]/page.test.tsx"` | ✅ existing, extend | ⬜ pending |
| D-10 | Filter matches any language name | integration | `go test ./backend/internal/repository/... -run TestSearchAnime` (or equivalent) | ❌ Wave 0 — new case once `genre_names`/`tag_names` join lands | ⬜ pending |
| D-12/D-13/D-14/D-15/D-16/D-17/D-18/D-19 | Tags block position/order/a11y/styling | component | `npx vitest run "src/app/anime/[id]/page.test.tsx"` | ✅ existing, extend | ⬜ pending |
| D-20 | Genre chips become links, placeholder stays non-link | component | `npx vitest run "src/app/anime/[id]/page.test.tsx"` | ✅ existing, extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New backend handler test file for admin tag/genre-name CRUD endpoints — covers D-04 (plan 160-02)
- [ ] New backend repository test case(s) in `search_repository_test.go` for the fansub-empty-WHERE pitfall discovered in research (D-08 discretion item, Pitfall 1) — plan 160-04
- [ ] New backend repository test case(s) for D-10 (filter matches language name, not just base name) once `genre_names`/`tag_names` exist — plan 160-04
- [ ] Migration apply/rollback smoke check for `0168_tag_genre_language_names` — purely additive `CREATE TABLE IF NOT EXISTS`, no data-loss risk since no existing rows are touched — plan 160-01

---

## Manual-Only Verifications

| Behavior | Decision ID | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile line-wrap of tag chips (no horizontal scrollbar, no layout break on long names) | D-19 | Visual layout behavior across viewport widths is not meaningfully assertable via jsdom | Open `/anime/2` (11eyes, 5 tags) in a mobile viewport (≤480px) in the browser, confirm chips wrap without horizontal scroll or overflow |
| Keyboard navigation / visible focus ring on tag and genre chip links | D-16, D-20 | Focus-visible styling is a real-browser rendering concern beyond jsdom's computed-style fidelity | Tab through `/anime/1` (Buddy Complex, 8 tags) in the browser, confirm each chip receives a visible focus outline in sequence |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (admin handler test, fansub pitfall case, D-10 language-match case, migration smoke check)
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
