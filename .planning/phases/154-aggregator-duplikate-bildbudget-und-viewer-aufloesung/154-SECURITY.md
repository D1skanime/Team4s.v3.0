---
phase: 154
slug: aggregator-duplikate-bildbudget-und-viewer-aufloesung
status: verified
threats_open: 0
asvs_level: 1
created: 2026-09-10
---

# Phase 154 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
>
> Register authored at plan time (`register_authored_at_plan_time: true`); this document is the
> post-implementation verification pass. Every mitigation claim below was checked against the
> actual shipped code (grep + read + real test execution), not against plan intent or SUMMARY.md
> prose.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| Public HTTP client → `GetPublicMemberProfile`/`GetPublicMemberProjects` → `GetPublicMemberProfileByID` (154-01) | Pre-existing boundary; 154-01 only changes internal call-count/shape below the handler | Public profile badges/progress data (unchanged shape) |
| Public browser → Next.js `/_next/image` optimizer → same-origin static/media assets (154-03) | Client-side fallback/detection behavior change on optimizer error or animated-format auto-bypass | Already-public badge artwork / avatar bytes |
| Authenticated browser → new `GET /api/v1/members/:slug/viewer` (154-04) | New route, same `ResolvePublicMemberAccess` resolver and `authOptionalMiddleware` as the two existing sibling routes | `{is_owner, is_private_preview}` only — no profile body, no app-user identifier |
| Stale/aborted client request racing a fresh one for owner-status determination (154-04) | Client-side race the PMFE-10 guard defends against; now shared by two hooks instead of duplicated | Viewer/owner boolean state only |
| Authenticated human browser session (via SSH tunnel) → members/[slug] owner-preview path (154-07) | Live human-verify checkpoint over the exact boundary 154-04 modified | Full profile content vs. anonymous denial |
| Browser → `frontend/src/app/media/[...path]/route.ts` (pre-existing, referenced by 154-03's new probe) | Static media file serving; no Range support | Avatar/badge/video bytes, full-file only |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-154-A-01 | Information Disclosure | `member_profile_public_repository.go` DTO shape drift during dashboard-count hoist | mitigate | DTO/badge/progress contract tests re-run with real fixture DB; all pass unmodified in assertion intent | closed |
| T-154-A-02 | Tampering | Accidental signature change to raw-count loader shared with `GetOwnDashboard` | mitigate | Raw-count loader signatures untouched; `member_profile_dashboard_repository.go` byte-unmodified by phase 154; `go build`/`go vet` clean | closed |
| T-154-B1-01 | Information Disclosure | Zero-progress badge artwork asset selection (client-side) | accept | Logged in Accepted Risks Log below | closed |
| T-154-B2-01 | Denial of Service (client-side) | `ResponsiveImage.tsx` unbounded fallback | mitigate | Unconditional `unoptimized`-original fallback removed; always routes through bounded Next optimizer | closed |
| T-154-B2-02 | Information Disclosure | Fallback logic serving private-preview-sized image to unauthenticated viewer | accept | Logged in Accepted Risks Log below | closed |
| T-154-B3-01 | Information Disclosure | Byte-range probe fetch to `/media/profile/**` for animated-WebP detection | accept | Logged in Accepted Risks Log below | closed |
| T-154-C-01 | Information Disclosure | New `GET /api/v1/members/:slug/viewer` over-sharing / private-profile enumeration | mitigate | Verified: same resolver, same denial body/status, resolver-fake asserts zero profile loads, byte-identical 404 body | closed |
| T-154-C-02 | Spoofing / Elevation of Privilege | Stale/aborted request racing a fresh one, incorrectly reporting `resolved`/`is_owner: true` | mitigate | Single shared `deriveViewerStatus` helper verified used by both hooks; abort-race tests pass for both | closed |
| T-154-C-03 | Tampering | AbortSignal threading interacting badly with `authorizedFetch`'s retry loop | accept | Logged in Accepted Risks Log below; full `api.auth-refresh.test.ts` suite (25/25) re-run green | closed |
| T-154-D-01 | none applicable | n/a (documentation-only plan) | accept | Logged in Accepted Risks Log below | closed |
| T-154-E-01 | Repudiation | Silently mislabeling a genuine regression as "pre-existing" | mitigate | Verified: the one genuine 154-03-introduced regression was fixed (allow-list), not mislabeled, per 154-06-SUMMARY.md | closed |
| T-154-E6-01 | Elevation of Privilege | Owner-only UI rendering for wrong session / anonymous viewer | mitigate | Verified: real human operator confirmation transcript (154-07-SUMMARY.md), precisely scoped, not agent-inferred | closed |
| T-154-F-01 (new, auditor-added) | Denial of Service / Availability | `frontend/src/app/media/[...path]/route.ts` ignores HTTP `Range` header (pre-existing, phase-154-foreign; amplified by 154-03's new WebP probe) | accept | Logged in Accepted Risks Log below | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Threat Verification Detail (evidence)

### T-154-A-01 / T-154-A-02 — Query dedup DTO/signature stability

- `backend/internal/repository/member_profile_public_repository.go:129,133,137,141` — each of the four raw-count loaders (`loadRoleVolumeCounts`, `loadContribProjectsCount`, `loadContribChronicleCount`, `loadContribArchivistCount`) is now called exactly once inside `GetPublicMemberProfileByID`.
- `backend/internal/repository/member_profile_role_volume_repository.go:118` and `member_profile_contribution_badges_repository.go:161` — `loadRoleVolumeBadges`/`loadContributionBadges` are pure derivation functions (no `ctx`, no error return); raw-count loaders (`role_volume_repository.go:35`, `contribution_badges_repository.go:68,111,134`) are untouched.
- `git log --oneline -- backend/internal/repository/member_profile_dashboard_repository.go` shows no phase-154 commit — file byte-unmodified (last touched by `c7aeefc7`, phase 150).
- Ran for real: `docker run --rm --network team4s_default ... golang:1.25-alpine sh -c "go build ./... && go vet ./..."` — clean.
- Ran for real with `TEAM4S_PHASE128_TEST_DSN=postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase128_test?sslmode=disable`: `go test ./internal/repository/... -run 'RoleVolume|ContributionBadges|BadgeProgress'` → all PASS (one legitimate `SKIP` for a Phase-129-DSN-gated case, not a failure).
- Ran for real with `TEAM4S_PHASE131_TEST_DSN=postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase131_test?sslmode=disable`: `TestPhase131PublicProfileQueryBudgetIsConstant` → PASS, log line `"2 projects -> 16 queries; 6 projects -> 16 queries"`, matching `member_profile_query_budget_test.go:177`'s `phase131ConstantQueryBudget = 16`.

### T-154-B2-01 — `ResponsiveImage` bounded fallback

- `frontend/src/components/ui/ResponsiveImage.tsx:43` — `unoptimized={false}` unconditionally; the old `unoptimized={usingDisplayOriginal}` branch is gone. `failedOptimizedSource`/`usingDisplayOriginal` are retained but explicitly voided (`void usingDisplayOriginal`, line 36) and drive no render branch.
- Ran for real: `npx vitest run src/components/ui/ResponsiveImage.test.tsx src/components/ui/ResponsiveImage.config.test.ts` → 4 + 12 tests PASS.

### T-154-B1-01 (implementation confirmation, though disposed `accept`)

- `frontend/src/components/profile/AnimeProjectAchievementStage.tsx:50-66` — hero artwork now gated `currentCode ? (...) : <LockedStageArtwork hero />`, matching the sibling pattern.
- Ran for real: `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` → 94 tests PASS (includes the extended 6-family locked-hero assertions).

### T-154-C-01 — New `/viewer` endpoint over-sharing / enumeration (deep-verified per audit brief)

- `backend/internal/handlers/app_public_profile.go:96-107` (`GetPublicMemberViewer`) and `:59-91` (`GetPublicMemberProfile`) both call the identical `resolvePublicMemberAccess(c, h.accessResolver, c.Param("slug"))` (`public_member_access.go:37-74`) before doing anything else.
- `backend/internal/repository/member_public_access_repository.go:62-80` (`ResolvePublicMemberAccess`) — confirmed: `pgx.ErrNoRows` (member does not exist) → `ErrNotFound`; `visibility == private && !access.IsOwner` → also `ErrNotFound`. Both paths are indistinguishable to the caller — no timing/shape difference exists at this layer that would let an attacker distinguish "doesn't exist" from "exists but hidden."
- `public_member_access.go:76-80` (`writePublicMemberUnavailable`) is the single denial body used by **both** routes: `{"error":{"message":"Profil nicht verfügbar"}}`, HTTP 404.
- `backend/cmd/server/main.go:360-363` — both routes are registered on the **same** `publicProfileHandler` instance behind the **same** `authOptionalMiddleware`.
- Test-quality check: `TestGetPublicMemberViewerDenialIsNeutral` (`app_public_profile_test.go:302-315`) uses a real `httptest`/Gin context + a fake `recordingPublicMemberAccessResolver` (not string-matching source), and asserts `require.Equal(t, http.StatusNotFound, recorder.Code)` **and** `require.Equal(t, publicMemberUnavailableResponse().Body.Bytes(), recorder.Body.Bytes())` — a byte-identical body comparison against the full-profile route's own denial helper. `TestGetPublicMemberViewerResolverCalledExactlyOnce` (`:317-335`) asserts `resolver.calls == 1`, `events == []string{"resolve"}`, and `loaders.profileCalls`/`projectsCalls` both zero (proves no profile load occurs).
- **Actually ran** (no DB required — fakes only): `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend golang:1.25-alpine go test ./internal/handlers/... -run 'GetPublicMemberViewer' -v -count=1` → all 4 tests PASS. Re-ran the full `app_public_profile_test.go` scope (`-run 'TestGetPublicMember|TestParseBounded'`) → 9/9 PASS, no skips.

### Cache-header behavior (deep-verification item 2 — investigated, not a phase-154 regression)

- `public_member_access.go:82-87` (`setPublicMemberResponseCache`) — `Vary: Authorization` is set unconditionally (line 83). `Cache-Control: private, no-store` is set only when `viewerDependent` is true. The function is called twice per request in `resolvePublicMemberAccess`: once pre-resolution with `viewerAppUserID > 0`, once post-resolution with `access.IsOwner || access.IsPrivatePreview` — identical call pattern for **both** `GetPublicMemberProfile` and `GetPublicMemberViewer` (same shared function, same call site inside `resolvePublicMemberAccess`, not duplicated per-route).
- For a genuinely anonymous request to a still-public profile, **no** `Cache-Control` header is set at all (only `Vary`). This is pre-existing behavior: `git log -p --follow -- backend/internal/handlers/public_member_access.go` shows this function was introduced whole by `c03295f6` (phase 128), and phase 154 did not modify it — the new `/viewer` route only reuses it, inheriting identical (not new) cache semantics.
- Checked for a shared-cache amplification risk: `docker-compose.yml` has no nginx/CDN/reverse-proxy service in front of `team4sv30-backend`; the frontend calls the backend directly via `NEXT_PUBLIC_API_URL`/`API_INTERNAL_URL`. No shared cache exists in this deployment that could serve one visitor's cached anonymous response to a different visitor after a profile flips to private.
- Both known consumers (`frontend/src/lib/api.ts:3184-3187` `getMemberProfile`, `:3217-3220` `getMemberViewerAccess`) pass `cache: "no-store"` to the Fetch API, which bypasses the browser's own HTTP cache regardless of server-sent `Cache-Control` — so even the same-browser staleness scenario is not currently reachable through the shipped client code.
- **Verdict:** not a phase-154 regression (pre-existing, unmodified code, reused identically by the new route as declared). Residual gap (no explicit `Cache-Control` on the anonymous/public branch) is a defense-in-depth item, not currently exploitable in this deployment topology. Not added as a blocking threat; noted below as a non-blocking observation.

### T-154-C-02 — PMFE-10 shared guard, both hooks (deep-verified per audit brief)

- `frontend/src/lib/useMemberViewer.ts:49-61` — `deriveViewerStatus<T>` is the **single** implementation of the fail-closed guard: returns `'loading'` whenever `!canFetch || state.key !== requestKey || state.status === 'loading' || state.status === 'idle'`.
- `:95` (`useMemberViewer`) and `:126` (`useMemberViewerAccess`) both call `deriveViewerStatus(canFetch, state, requestKey)` — confirmed one shared call site, not two guard implementations.
- `frontend/src/hooks/useCancellableSlugState.ts:73-80` — both the `.then` branch (line 74: `if (controller.signal.aborted) return`) and the `.catch` branch (line 78: `if (controller.signal.aborted || isAbortError(error)) return`) refuse to call `setSettled` after abort — an aborted request can never write terminal state.
- Test coverage: `frontend/src/lib/useMemberViewer.test.ts` has a matching `describe('useMemberViewerAccess', ...)` block (line 196) mirroring every `describe('useMemberViewer', ...)` case (line 85) 1:1, including `'never reports resolved for a stale (superseded) requestKey, even if it later settles'` for **both** hooks (lines 124 and 233), plus explicit `AbortSignal` instance assertions (lines 113, 222). `frontend/src/hooks/useCancellableSlugState.test.ts:110-151` independently tests the abort-race at the shared-hook level.
- **Actually ran:** `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/lib/useMemberViewer.test.ts src/hooks/useCancellableSlugState.test.ts"` → 21/21 PASS.
- No coverage gap found — both hooks have equivalent, explicit abort-race test coverage (not just the shared code inheriting it implicitly).

### AbortSignal threading in `getMemberProfile`/`getMemberViewerAccess` (deep-verification item 4)

- `frontend/src/lib/api.ts:3184-3187`, `:3217-3220` — `signal` is forwarded into `apiClientFetch(url, { cache: "no-store", signal })`.
- `apiClientFetch` (`:1483-1493`) delegates to `authorizedFetch` (`:1414-1481`), which destructures `{ authToken, headers, skipAuthPreflight, retryAuth401, ...init }` — `signal` survives in `...init`, spread into `requestInit` (line 1431-1434) and passed to the native `fetch(input, requestInit)` call (line 1438).
- Retry-loop check: `isFetchNetworkError` (`:338-340`) only matches `TypeError` with message `"fetch failed"` — an `AbortError` (DOMException/Error named `AbortError`) does **not** match, so `canRetry` is false and the abort rejection propagates immediately, unretried.
- Body-read-abort reasoning: `getMemberProfile`/`getMemberViewerAccess` call `response.json()` directly on the awaited `fetch` response with no intermediate catch; per the Fetch specification, aborting the controller also aborts any in-flight body read, causing `response.json()` to reject with `AbortError` rather than resolve — there is no code path where an abort between the `response.ok` check and body-read resolution could yield a successful resolve with stale data.
- **Verdict:** confirmed by code reading (no dedicated test exists for this exact race, as expected/acceptable per the audit brief).

### T-154-E-01 — Regression triage discipline

- `154-06-SUMMARY.md` documents that the one genuine regression introduced by 154-03 (`api.no-token-boundary.test.ts` failing because `MemberProfileHero.tsx`'s new byte-range probe used raw `fetch` outside `apiClientFetch`) was **fixed** (allow-listed with rationale), not mislabeled pre-existing.
- Verified: `frontend/src/lib/api.no-token-boundary.test.ts:51` — `'src/components/profile/MemberProfileHero.tsx'` is present in `publicNoAuthFetchAllowlist` (line 38).

### T-154-E6-01 — Live human checkpoint

- `154-07-SUMMARY.md` "Operator's Confirmation" section: a real human operator (not the agent) toggled a real member to `private`, confirmed anonymous denial (404, "Profil nicht verfügbar") and owner-side correct rendering, then reverted and independently re-verified the rollback (all 12 members public, anonymous 200, viewer endpoint `is_owner: false`). Explicitly scoped: the transcript states the "Profil bearbeiten" edit-link visibility was **not** separately confirmed, and the SUMMARY does not overclaim it. This is genuine human evidence, not agent-inferred.

---

## Additional Findings (auditor-identified during deep verification, non-blocking)

### T-154-F-01 — `frontend/src/app/media/[...path]/route.ts` ignores HTTP `Range` requests (new register entry, `accept`)

- **Evidence:** `frontend/src/app/media/[...path]/route.ts:42-59` — always calls `readFile(filePath)` for the complete file and returns `status: 200` regardless of any `Range` header on the request. No `Range`/`Accept-Ranges`/`Content-Range`/206 handling exists anywhere in the file.
- **Scope check:** `git log --oneline -- "frontend/src/app/media/[...path]/route.ts"` shows the file was last modified by `bc9a50da` ("End-of-day: 2026-03-22"), long before phase 154 and untouched by any 154 plan's diff — confirmed pre-existing, phase-154-foreign infrastructure.
- **Amplification by 154-03:** `frontend/src/components/profile/MemberProfileHero.tsx:120-127` (`isAnimatedWebpSource`, new in 154-03/P154-07) sends `fetch(url, { headers: { Range: 'bytes=0-63' } })` intending a 64-byte probe, but checks only `response.ok`, not `response.status === 206`. Because `route.ts` always returns 200 with the full body, the probe silently downloads the entire avatar file a second time for **every** static (non-animated) WebP avatar view — confirmed identical root cause to `154-REVIEW.md`'s WR-01 finding (same file, same missing Range support).
- **Severity assessment:** media files under `media/` currently top out at ~41MB (`media/anime/1/background_video/.../original.mp4`); the route is also used for `.mp4`/`.webm` video. Absent Range support, video seek/scrub degrades to full-file downloads and any request (probe or otherwise) against a large file causes a full in-memory `readFile` per request — a real, but currently low-probability-of-exploitation, availability/resource-usage concern (no attacker-controlled amplification factor beyond "request a large file repeatedly"; `Cache-Control: public, max-age=31536000, immutable` means repeat browser fetches of the identical URL are normally served from cache, not network).
- **Disposition:** `accept`. Rationale: pre-existing, out of phase 154's stated file-modification scope (`154-03`'s task explicitly excludes `route.ts` from its `<files>` list); fixing it is general media-infrastructure work (also benefits video scrubbing) correctly deferred to a follow-up per `deferred-items.md`. Not a regression introduced by this phase; functionally harmless for the shipped feature (detection correctness unaffected, no retry loop, no behavior regression) per 154-03's own SUMMARY and the code-review report.
- **Recommended follow-up (not implemented, per scope-boundary rule):** add HTTP Range support to `route.ts` (parse `Range`, slice/stream, return 206 + `Content-Range`/`Accept-Ranges`); separately, harden `isAnimatedWebpSource` to check `response.status === 206` before reading the body (per `154-REVIEW.md` WR-01's suggested fix) so a future Range-supporting deployment doesn't silently download full files if an intermediary ever fails to honor Range.

### Cache-Control gap on anonymous public-profile responses (observation, not a new threat entry)

Noted above under T-154-C-01's verification detail. Pre-existing, unmodified by phase 154, not currently exploitable in this deployment (no shared cache/CDN; both API consumers use `cache: "no-store"`). Flagged for awareness only — no register entry added since it is neither introduced nor amplified by this phase's diff.

### Unregistered Flags (from SUMMARY.md `## Threat Flags`)

None. 154-02's `## Threat Flags` section is explicit: `None`, with disposition already covered by T-154-B1-01 (`accept`). No other SUMMARY.md in this phase contains a `## Threat Flags` section entry indicating new, unmapped attack surface.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-154-01 | T-154-B1-01 | Locked-hero gate only changes which already-public artwork asset is requested for a zero-progress state; no new data exposed or withheld. Verified in code: `AnimeProjectAchievementStage.tsx:50-66`. | Phase 154 plan author (154-02-PLAN.md) | 2026-09-10 |
| AR-154-02 | T-154-B2-02 | `ResponsiveImage` only concerns already-public badge-artwork/avatar assets; no access-gated image path shares this component differently after this change (confirmed by reading every consumer). | Phase 154 plan author (154-03-PLAN.md) | 2026-09-10 |
| AR-154-03 | T-154-B3-01 | Byte-range probe fetch to `/media/profile/**` is same-origin, same-asset the browser is already loading for display; reads no additional data beyond what the `<img>` itself would fetch. | Phase 154 plan author (154-03-PLAN.md) | 2026-09-10 |
| AR-154-04 | T-154-C-03 | Existing `isAbortError` handling at `useCancellableSlugState` already ignores `AbortError`; no change to `authorizedFetch`'s retry logic. Verified: `api.auth-refresh.test.ts` (25/25) re-run green with no regression. | Phase 154 plan author (154-04-PLAN.md) | 2026-09-10 |
| AR-154-05 | T-154-D-01 | Plan 154-05 produces documentation only (re-measurement of RCA-07/listener remainder); no new code surface introduced. | Phase 154 plan author (154-05-PLAN.md) | 2026-09-10 |
| AR-154-06 | T-154-F-01 | Pre-existing (phase-154-foreign) `Range`-header gap in `frontend/src/app/media/[...path]/route.ts`, out of 154-03's file-modification scope; functionally harmless for the shipped feature; follow-up recommended (Range support + `isAnimatedWebpSource` 206-check) but explicitly deferred, not implemented, per the scope-boundary rule. | Security audit (this document) | 2026-09-10 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-10 | 14 (13 plan-declared + 1 auditor-added: T-154-F-01) | 14 | 0 | gsd-security-auditor (Claude Sonnet 5) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-10
