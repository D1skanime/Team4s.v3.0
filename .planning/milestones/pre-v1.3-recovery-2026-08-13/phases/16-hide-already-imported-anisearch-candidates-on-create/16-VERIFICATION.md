---
phase: 16-hide-already-imported-anisearch-candidates-on-create
verified: 2026-04-16T07:38:23.3273244Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Mixed AniSearch search on /admin/anime/create"
    expected: "A title search with one already-imported AniSearch ID and one new ID only shows the new draftable candidate."
    why_human: "Requires a live admin session plus seeded AniSearch/local-anime data to confirm real browser behavior end-to-end."
  - test: "Filtered-empty AniSearch search on /admin/anime/create"
    expected: "When AniSearch returns only already-imported hits, the create card explains they were hidden instead of showing the generic no-hits state."
    why_human: "Needs a real UI interaction and backend data conditions that are not reproduced by static source inspection."
---

# Phase 16: Hide Already Imported AniSearch Candidates On Create Verification Report

**Phase Goal:** Admins using AniSearch title search on `/admin/anime/create` only see candidates that can still begin a new local draft instead of entries already owned by an existing local anime.
**Verified:** 2026-04-16T07:38:23.3273244Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | AniSearch title search no longer shows candidates whose `anisearch:{id}` source already belongs to a local anime. | ✓ VERIFIED | `SearchAniSearchCandidates` builds `anisearch:{id}` source keys, resolves ownership, skips matched candidates, and increments `FilteredExistingCount` in [backend/internal/services/anime_create_enrichment.go](/C:/Users/admin/Documents/Team4s/backend/internal/services/anime_create_enrichment.go:1300). Service regression asserts one duplicate is removed and only the still-creatable candidate remains in [backend/internal/services/anime_create_enrichment_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/services/anime_create_enrichment_test.go:328). |
| 2 | Filtering lives in the backend AniSearch search seam so every caller receives the same duplicate-safe candidate list. | ✓ VERIFIED | Backend handler calls the enrichment service directly and returns its typed result in [backend/internal/handlers/admin_content_anime_enrichment_search.go](/C:/Users/admin/Documents/Team4s/backend/internal/handlers/admin_content_anime_enrichment_search.go:43). The repository seam used for ownership lookup performs a real `anime.source = ANY(...)` query in [backend/internal/repository/admin_content_anisearch.go](/C:/Users/admin/Documents/Team4s/backend/internal/repository/admin_content_anisearch.go:56). |
| 3 | The response contract distinguishes true no-hit searches from filtered-empty searches. | ✓ VERIFIED | Backend DTO exposes `filtered_existing_count` in [backend/internal/models/admin_content.go](/C:/Users/admin/Documents/Team4s/backend/internal/models/admin_content.go:142), handler test asserts the field is returned in [backend/internal/handlers/admin_content_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/handlers/admin_content_test.go:244), and the typed client normalizes it in [frontend/src/lib/api/admin-anime-intake.ts](/C:/Users/admin/Documents/Team4s/frontend/src/lib/api/admin-anime-intake.ts:74). |
| 4 | The create AniSearch chooser only renders candidates that are still valid for creating a new anime, and filtered-empty searches are explained explicitly. | ✓ VERIFIED | Controller derives filtered-empty feedback from `filtered_existing_count` and stores both candidates and count in [frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts:103) and [frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts:951). The card only opens the chooser when `candidates.length > 0` and otherwise shows the hidden-duplicate hint in [frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx:120) and [frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx:191). Frontend regressions cover the filtered-empty copy in [frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts:205) and [frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx:152). |
| 5 | Exact-ID load and duplicate redirect behavior remain unchanged. | ✓ VERIFIED | The create card still renders the direct `AniSearch laden` action and the conflict CTA `Zum vorhandenen Anime wechseln` in [frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx:112) and [frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx:185). Existing behavior is covered in [frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx:30) and [frontend/src/app/admin/anime/create/page.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/create/page.test.tsx:206). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `backend/internal/services/anime_create_enrichment.go` | Duplicate-safe AniSearch backend search seam | ✓ VERIFIED | Substantive filtering logic plus repository ownership lookup and typed result envelope. |
| `backend/internal/services/anime_create_enrichment_test.go` | Regression for hiding already-imported AniSearch IDs | ✓ VERIFIED | Covers mixed result set with one locally owned source filtered out. |
| `backend/internal/handlers/admin_content_anime_enrichment_search.go` | HTTP response for filtered AniSearch candidate search | ✓ VERIFIED | Returns service result unchanged after auth/query validation. |
| `backend/internal/models/admin_content.go` | Search response DTO with metadata | ✓ VERIFIED | Defines `filtered_existing_count` on the AniSearch search result. |
| `frontend/src/types/admin.ts` | Typed client contract for widened AniSearch response | ✓ VERIFIED | Models `filtered_existing_count`. |
| `frontend/src/lib/api/admin-anime-intake.ts` | Typed API parsing for AniSearch create search | ✓ VERIFIED | Normalizes missing `filtered_existing_count` to `0`. |
| `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` | Controller logic for filtered-empty feedback and candidate state | ✓ VERIFIED | Stores filtered count, candidates, and distinct messages for empty vs filtered-empty. |
| `frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx` | UI rendering for candidate chooser and filtered-empty hint | ✓ VERIFIED | Chooser only renders for non-empty candidates; hidden-duplicate hint renders when count > 0. |
| `frontend/src/app/admin/anime/create/page.tsx` | Wiring of controller state into the create card | ✓ VERIFIED | Passes `filteredExistingCount` and candidate state into the card. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `anime_create_enrichment.go` | `admin_content_anisearch.go` | source ownership lookup for candidate suppression | ✓ WIRED | `SearchAniSearchCandidates` calls `ResolveAdminAnimeRelationTargetsBySources`; repository executes a real DB query on `anime.source`. |
| `admin_content_anime_enrichment_search.go` | `admin_content.go` | search response envelope | ✓ WIRED | Handler returns `models.AdminAnimeAniSearchSearchResult` with `filtered_existing_count`. |
| `admin-anime-intake.ts` | `types/admin.ts` | typed AniSearch search response parsing | ✓ WIRED | Search helper returns `AdminAnimeAniSearchSearchResponse` and normalizes the widened field. |
| `useAdminAnimeCreateController.ts` | `CreateAniSearchIntakeCard.tsx` | filtered candidate search feedback props | ✓ WIRED | Controller exposes `filteredExistingCount`; page passes it through to the card. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `backend/internal/services/anime_create_enrichment.go` | `result.Data` / `filteredExistingCount` | AniSearch fetcher results plus repository `ResolveAdminAnimeRelationTargetsBySources(...)` | Yes — source ownership comes from a real SQL query in `admin_content_anisearch.go` | ✓ FLOWING |
| `frontend/src/lib/api/admin-anime-intake.ts` | `filtered_existing_count` / `data` | `/api/v1/admin/anime/enrichment/anisearch/search` JSON response | Yes — helper parses the live API payload and defaults missing count to `0` | ✓ FLOWING |
| `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` | `aniSearchCandidates` / `aniSearchFilteredExistingCount` | `searchAdminAnimeCreateAniSearchCandidates(...)` response | Yes — values are set directly from parsed API response and exposed to page/card state | ✓ FLOWING |
| `frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx` | `candidates` / `filteredExistingCount` props | `page.tsx` props from controller state | Yes — chooser and filtered-empty hint render from live controller-provided props | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Backend duplicate filtering and handler contract regressions | `cd backend && go test ./internal/services ./internal/handlers -count=1` | Passed | ✓ PASS |
| Frontend typed client, controller, card, and page regressions | `cd frontend && npm test -- src/lib/api.admin-anime.test.ts src/app/admin/anime/create/useAdminAnimeCreateController.test.ts src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx src/app/admin/anime/create/page.test.tsx` | 4 files passed, 65 tests passed | ✓ PASS |
| Production frontend build still succeeds | `cd frontend && npm run build` | Next.js build passed and `/admin/anime/create` was generated successfully | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| None mapped | `16-01`, `16-02` | Phase 16 has no mapped requirement IDs in the provided plans or roadmap entry. | ✓ N/A | Verified `requirements: []` in both plan frontmatters and roadmap phase entry shows `Requirements: TBD`. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx` | 80, 100 | Input `placeholder` text | ℹ️ Info | Normal form placeholders, not stub content. |
| `frontend/src/app/admin/anime/create/page.tsx` | 47 | `return null` | ℹ️ Info | Guarded preview helper return; not part of the AniSearch create-search flow and not a hollow implementation. |

### Human Verification Required

### 1. Mixed Candidate Search

**Test:** Open `/admin/anime/create`, run an AniSearch title search where one returned AniSearch ID is already linked to a local anime and another is not.
**Expected:** Only the still-new candidate appears in the chooser; the already-owned title does not appear as a selectable create option.
**Why human:** Requires live backend data and browser interaction to confirm the real operator flow, not just unit-tested rendering.

### 2. Filtered-Empty Search

**Test:** Run an AniSearch title search where AniSearch finds titles but all returned IDs already exist locally.
**Expected:** The card explains that already-captured anime were hidden and does not fall back to the generic `Keine AniSearch-Treffer gefunden...` state.
**Why human:** Needs end-to-end seeded data and rendered UI behavior in a real admin session.

### Gaps Summary

Automated verification found no code or wiring gaps against the phase must-haves. The remaining work is human UAT to confirm the live `/admin/anime/create` experience with seeded AniSearch/local-anime data.

---

_Verified: 2026-04-16T07:38:23.3273244Z_
_Verifier: Claude (gsd-verifier)_
