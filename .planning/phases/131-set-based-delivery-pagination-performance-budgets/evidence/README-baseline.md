# Phase 131 performance baseline (plan 131-02)

Reproducible performance baseline for the public member profile, captured on the
**two Phase-129 seed profiles** (`sheppert`, `csubs-leader`) via the extended
evidence harness `frontend/scripts/collect-member-profile-evidence.mjs`
(`--mode perf-baseline`). This anchors requirement **PMPF-07** / decision **D-06**.

**Budgets are NOT locked here.** This wave only *measures* and records
method + environment. Payload/latency budgets are locked later in **131-08** as
baseline + ~20%. The absolute, baseline-independent ceilings (D-07) are recorded
in every artifact under `absoluteCeilings`:

- LCP <= 2500 ms, CLS <= 0.1, INP <= 200 ms (Web-Vitals good band)
- profile query count MUST be constant regardless of project/contribution count
  (no per-card reads, no N+1) — a structural ceiling verified elsewhere in 131,
  not a value this harness measures.

## Artifacts

- `baseline-sheppert.json`
- `baseline-csubs-leader.json`

Each artifact captures, per profile:

- **API layer** (`api`): initial-profile payload bytes + latency
  (`/api/v1/members/:slug`), projects continuation page 1 and page 2
  (`/projects?limit=6&offset=0` and `offset=6`), and the contributions
  continuation (`/contributions?limit=20&offset=0`). Each endpoint is sampled
  N times (default 5); payload bytes + min/median/max latency are recorded.
- **Page layer** (`page`): full request waterfall (count + per-request bytes and
  timing), the image waterfall (count / sizes / timing), transfer total, and
  Web Vitals (LCP, CLS, INP). INP is exercised with scripted click / keydown /
  scroll interactions so it has real samples.
- **Environment** (`environment`): git head, Node/Playwright/Chromium versions,
  base URLs, throttle profile, sample count, viewport, and the collector's
  SHA-256 — so a fresh operator can reproduce the method.

Re-running produces a **structurally identical** JSON (same keys/shape); the
numbers vary run to run (LCP/INP/latency drift a few ms/percent). The harness
never fabricates values.

## Environment used for the committed baseline

- Live dev stack on `team4s-linux` (containers `team4sv30-frontend` :3000,
  `team4sv30-backend` :18092, `team4sv30-db` `team4s_v2`). Confirm live ports with
  `docker ps` — never read them from `.env`.
- Both profiles served **anonymously** (public cache class, D-09) — no auth token.
- Throttle: `none` (raw local capture). The frontend runs in **dev mode**
  (Turbopack): the page transfer total is inflated by un-minified dev JS chunks,
  and page-layer numbers are dev-server figures. The authoritative production-build
  sign-off is the bundled **Phase-134** UAT; 131-08 locks budgets against a
  representative build.

## Prerequisites

1. Live stack up: `ssh team4s-linux 'cd /home/d1sk/team4s && docker compose ps'`.
2. Both seed profiles present. Reused, not re-created — if a fresh DB, run the
   Phase-129 seed once (see `scripts/README-seed.md`):
   ```bash
   docker cp scripts/seed-member-profile-fixtures.mjs team4sv30-frontend:/tmp/seed.mjs
   docker exec team4sv30-frontend node /tmp/seed.mjs
   ```
3. Playwright + Chromium: installed **inside** `team4sv30-frontend`
   (`node_modules/playwright` + `~/.cache/ms-playwright/chromium-*`). The host has
   no host-level Playwright, so the harness runs in the container. If Chromium is
   missing: `docker exec team4sv30-frontend npx playwright install chromium`.

## Reproduce

Run inside the frontend container so the `playwright` import and `../node_modules`
resolve. Copy the (possibly edited) harness into `/app/scripts/` first, then:

```bash
ssh team4s-linux
cd /home/d1sk/team4s
HEAD=$(git rev-parse HEAD)
docker cp frontend/scripts/collect-member-profile-evidence.mjs \
  team4sv30-frontend:/app/scripts/collect-member-profile-evidence.mjs
docker exec \
  -e PERF_BASE_URL=http://192.168.235.196:3000 \
  -e PERF_API_BASE=http://192.168.235.196:18092 \
  -e PERF_OUTPUT_DIR=/tmp/evidence131 \
  -e PERF_GIT_HEAD=$HEAD \
  -e PERF_THROTTLE=none \
  team4sv30-frontend \
  node /app/scripts/collect-member-profile-evidence.mjs --mode perf-baseline
# copy both artifacts back into this evidence/ dir:
docker cp team4sv30-frontend:/tmp/evidence131/baseline-sheppert.json \
  .planning/phases/131-set-based-delivery-pagination-performance-budgets/evidence/
docker cp team4sv30-frontend:/tmp/evidence131/baseline-csubs-leader.json \
  .planning/phases/131-set-based-delivery-pagination-performance-budgets/evidence/
```

The container reaches the host-published ports via the host IP
`192.168.235.196` (same pattern as the seed script). From a host with Playwright
installed you can instead pass `PERF_BASE_URL=http://127.0.0.1:3000` /
`PERF_API_BASE=http://127.0.0.1:18092`.

### Options / env

All optional except output dir; defaults target the live VM. Never read ports
from `.env` literals — override via env.

| Env / flag | Default | Meaning |
| --- | --- | --- |
| `PERF_BASE_URL` / `--base-url` | `http://127.0.0.1:3000` | Frontend base URL |
| `PERF_API_BASE` / `--api-base` | `http://127.0.0.1:18092` | Backend API base URL |
| `PERF_PROFILES` / `--profiles` | `sheppert,csubs-leader` | Comma list of seed slugs |
| `PERF_OUTPUT_DIR` / `--output-dir` | (required) | Where `baseline-<slug>.json` is written |
| `PERF_THROTTLE` / `--throttle` | `none` | `none` or `slow-4g` (CDP 3G + 4x CPU) |
| `PERF_API_SAMPLES` / `--api-samples` | `5` | API latency samples per endpoint |
| `PERF_GIT_HEAD` | (unset) | Recorded in `environment.gitHead` |

The default `--mode phase120` path (the original visual/interaction collector)
is unchanged and still requires its own `PHASE120_*` env + flags.

## Headline numbers (committed baseline, dev stack, throttle=none)

Indicative only — values drift; budgets are locked in 131-08 against a
representative build.

| Profile | Initial profile payload | Projects p1 / p2 | Contributions | Page requests | Images (bytes) | LCP | CLS | INP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `sheppert` (renders) | 1632 B | 52 B / 52 B | 307 B | 14 | 2 (88 KB) | 440 ms | 0 | 184 ms |
| `csubs-leader` (page 500) | 5642 B | 1680 B / 984 B | 1103 B | 13 | 0 | n/a* | n/a* | n/a* |

\* **Known blocker (pre-existing, out of 131-02 scope):** `/members/csubs-leader`
returns **HTTP 500** on the current build — a committed runtime crash in
`frontend/src/components/profile/MemberProfileHero.tsx` (`deriveKnownForFromPublicProfile`
dereferences `role.label_de.trim()` when `label_de` is undefined for that
profile's project roles). Its **API-layer** metrics are fully captured and real;
its **page-layer** Web Vitals/waterfall reflect the Next.js error page (flagged via
`page.renderNote` and `page.rendered=false`), not the profile. Once that render
bug is fixed, re-run to capture csubs-leader's real page-layer baseline.
