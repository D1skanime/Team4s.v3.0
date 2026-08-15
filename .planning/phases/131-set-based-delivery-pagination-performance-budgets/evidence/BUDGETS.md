# Phase 131 locked performance budgets (plan 131-08)

Locks the public member profile performance budgets (PMPF-05, PMPF-07 / D-06, D-07,
D-08) **after** the Phase-131 structural work (set-based delivery 131-03, page bounds
131-05, DTO/roles 131-06). Budgets are enforced by the evidence harness
`frontend/scripts/collect-member-profile-evidence.mjs --mode budget-check`, which
re-measures BOTH Phase-129 seed profiles (`sheppert`, `csubs-leader`) live, writes
`post-change-<profile>.json`, and **exits non-zero if any profile exceeds a locked
budget**.

Basis captured 2026-08-15 on the live dev stack (`team4sv30-frontend` :3000,
`team4sv30-backend` :18092, `team4sv30-db` `team4s_v2`), both profiles served
**anonymously** (public cache class, D-09), throttle `none`, 5 API samples/endpoint.
Post-change measurement lives in `post-change-sheppert.json` /
`post-change-csubs-leader.json`; the pre-change reference is `baseline-*.json`.

## How budgets are derived

| Budget kind | Rule | Basis |
| --- | --- | --- |
| API payload bytes | locked = `ceil(post-change bytes x 1.20)` | baseline + ~20% margin (D-06). Deterministic on the fixed seed data, so this is the tight, primary gate. |
| API latency (median) | locked = `max(ceil(post-change medianMs x 1.20), 25 ms floor)` | baseline + ~20% margin (D-06), floored. All post-change medians are <= ~15 ms; a bare x1.2 (< 18 ms) would flake on dev-server + host-IP jitter, so a **25 ms floor** makes the latency gate a coarse regression tripwire rather than a flaky one. The gate checks the **median** of 5 samples (robust), not the max. |
| Web Vitals (LCP / CLS / INP) | absolute ceilings, baseline-independent | D-07 "good" band: LCP <= 2500 ms, CLS <= 0.1, INP <= 200 ms. Enforced only on a **rendered (HTTP 200)** page. |
| Profile-load SQL query count | absolute ceiling = **19**, constant | D-07 / PMPF-01 (SC1) structural ceiling. **Not** measurable from this browser harness; enforced by the Go repository test `TestPhase131PublicProfileQueryBudgetIsConstant` (`phase131ConstantQueryBudget = 19`). Recorded here for completeness. |

### Dev-mode caveat (authoritative gates)

The frontend runs Turbopack **dev** mode, so the page **transfer total** (~6.3-6.7 MB) is
inflated by un-minified dev JS chunks and is **NOT gated** here. The authoritative,
locked gates are: the **API-layer payload/latency budgets**, the **absolute Web-Vitals
ceilings**, and the **constant-query-count ceiling**. Representative production-build
transfer figures are deferred to the bundled **Phase-134** UAT (D-08, milestone V-02),
which is the authoritative live sign-off. This plan produces the reproducible, committed
evidence + locked budgets, not the final milestone sign-off.

## Locked API-layer budgets

### `sheppert`

| Endpoint | Status | Post-change bytes | **maxBytes** | Post-change median | **maxMedianMs** |
| --- | --- | --- | --- | --- | --- |
| `GET /api/v1/members/sheppert` (initial profile) | 200 | 1626 | **1952** | 14.53 ms | **25** |
| `.../projects?limit=6&offset=0` | 200 | 52 | **63** | 2.59 ms | **25** |
| `.../projects?limit=6&offset=6` | 200 | 52 | **63** | 2.15 ms | **25** |
| `.../contributions?limit=20&offset=0` | **404** | - | *n/a* | - | *n/a* |

### `csubs-leader`

| Endpoint | Status | Post-change bytes | **maxBytes** | Post-change median | **maxMedianMs** |
| --- | --- | --- | --- | --- | --- |
| `GET /api/v1/members/csubs-leader` (initial profile) | 200 | 4899 | **5879** | 6.29 ms | **25** |
| `.../projects?limit=6&offset=0` | 200 | 1944 | **2333** | 2.58 ms | **25** |
| `.../projects?limit=6&offset=6` | 200 | 1116 | **1340** | 2.01 ms | **25** |
| `.../contributions?limit=20&offset=0` | **404** | - | *n/a* | - | *n/a* |

**`/contributions` is a removed route (finding).** `GET /members/:slug/contributions` was
deleted in **129-07** (commit `96ab8dfa`, "remove dead member-contributions endpoint")
and now returns **404**. Contributions (latest + previous) are delivered **embedded in the
profile payload** and are therefore covered by the `initialProfile` budget. The budget
locks this endpoint's **expected status as 404** (no payload budget) so that a silent
re-wire of the route trips the gate and forces a fresh budget lock. Both seed profiles
also have zero `release_version_notes` / `release_version_media` rows, so the embedded
contribution feeds are legitimately empty.

## Absolute ceilings (both profiles)

| Metric | Ceiling | sheppert (post-change) | csubs-leader (post-change) |
| --- | --- | --- | --- |
| LCP | <= 2500 ms | 436 ms | 420 ms |
| CLS | <= 0.1 | 0 | 0 |
| INP | <= 200 ms | 152 ms | 104 ms |
| Profile-load SQL queries | == 19 (constant) | 19 (Go test) | 19 (Go test) |

All post-change Web Vitals sit comfortably inside the good band; both profiles render
HTTP 200 (the earlier `csubs-leader` 500 was resolved before this plan).

## Index decision (D-10): NO index added

No migration lands. `EXPLAIN (ANALYZE, BUFFERS)` was captured on **both** seed profiles
for the three list queries (`loadCurrentProjects`, `loadLatestContributions`,
`loadPreviousContributions`) - full plans in `explain-analyze-sheppert.txt` and
`explain-analyze-csubs-leader.txt`. Findings:

- The touched tables are tiny (`anime_contributions` = 13 rows total,
  `anime_contribution_roles` = 13, `hist_fansub_group_members` = 3,
  `release_version_notes` = 0, `release_version_media` = 0). Per-member working sets are
  <= 13 rows.
- Every query executes **sub-millisecond** on both profiles: current-projects
  0.20-0.46 ms, latest-contributions 0.17-0.19 ms, previous-contributions 0.04-0.06 ms.
- The planner picks **sequential scans on the tiny base tables** (cost ~1.16) because they
  are cheaper than any index probe at this size; a new index would simply be ignored (or
  add write overhead) rather than help.
- The `release_version_notes.member_id` filter - the one column lacking a dedicated index -
  is already served by the existing `uq_release_version_notes_member_role` index in the
  plan; no gap.

Per D-10 ("no index without representative EXPLAIN evidence on BOTH profiles showing it
helps; no speculative indexes"), **no index is justified** and none is added. Existing
indexes (see the plans) suffice. Re-evaluate if per-member contribution volume grows by
orders of magnitude.

## Reproduce the gate

Runs inside the frontend container (Playwright/Chromium live there). The container reaches
the host-published ports via host IP `192.168.235.196`:

```bash
ssh team4s-linux
cd /home/d1sk/team4s
HEAD=$(git rev-parse HEAD)
docker cp frontend/scripts/collect-member-profile-evidence.mjs \
  team4sv30-frontend:/app/scripts/collect-member-profile-evidence.mjs
docker exec \
  -e PERF_BASE_URL=http://192.168.235.196:3000 \
  -e PERF_API_BASE=http://192.168.235.196:18092 \
  -e PERF_OUTPUT_DIR=/tmp/pc131 \
  -e PERF_GIT_HEAD=$HEAD \
  -e PERF_THROTTLE=none \
  team4sv30-frontend \
  node /app/scripts/collect-member-profile-evidence.mjs --mode budget-check
echo "exit=$?"   # 0 = within budget; 1 = a locked budget was exceeded
# refresh committed artifacts:
docker cp team4sv30-frontend:/tmp/pc131/post-change-sheppert.json \
  .planning/phases/131-set-based-delivery-pagination-performance-budgets/evidence/
docker cp team4sv30-frontend:/tmp/pc131/post-change-csubs-leader.json \
  .planning/phases/131-set-based-delivery-pagination-performance-budgets/evidence/
```

`--assert false` (or `PERF_ASSERT=false`) captures artifacts without failing on a breach
(bootstrap only). The locked thresholds live in the harness constant `LOCKED_BUDGETS`;
this file documents each one and its basis. **Gate-bites proof:** temporarily shrinking
`sheppert.initialProfile.maxBytes` to 100 made the gate report
`sheppert/initialProfile: payload 1626B > budget 100B` and exit `1`; restoring the locked
value returns exit `0`.
