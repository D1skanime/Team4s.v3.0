---
status: awaiting_human_verify
trigger: "Weiss du warum das System schon wieder so langsam ist? Ich hab erst kürzlich Server-Restart gemacht, aber jetzt ist es schon wieder so lahm."
created: 2026-07-20
updated: 2026-07-20T15:24:00+02:00
scope: find_and_fix
---

# System wieder langsam

## Symptoms

- Expected behavior: Lokale Seiten und APIs reagieren bei nur einem Tester innerhalb weniger Sekunden.
- Actual behavior: Seitenaufrufe benötigen wiederholt ungefähr 10 bis 50 Sekunden; ein Server-/Container-Neustart hilft höchstens kurzfristig.
- Error messages: Kein dauerhafter Nutzerfehler gemeldet; zuletzt traten zeitweise Frontend-Fehler `Backend API nicht erreichbar.` und interne Fetch-Timeouts auf.
- Timeline: Das Verhalten tritt erneut auf, obwohl der Server erst kürzlich neu gestartet wurde.
- Reproduction: Öffentliche Anime-, Fansub-, Projekt- und Release-Seiten lokal über `http://127.0.0.1:3000` öffnen.

## Current Focus

- hypothesis: CONFIRMED — route-selectable warm-up makes the existing Compose `next dev` workflow predictable for local UI/UAT without coupling frontend preparation to backend or database lifecycle.
- test: Completed two-pass representative warm-up, full default-route pass, PowerShell parse, container-identity comparison, backend health check, and `git diff --check`.
- expecting: Verified: all requested/default routes returned 200, warm `/archiv` was 0.443 s after a 1.520 s first pass, backend/database identities stayed unchanged, and all static checks passed.
- next_action: Human verifies the exact project/release routes used in the real UAT flow via `-Routes`, then confirms fixed or reports the remaining slow route.
- reasoning_checkpoint:
    hypothesis: "Next development mode causes interactive UAT delays because each unvisited route is compiled on demand; warming the exact UAT routes first shifts that known one-time work before the user flow and exposes the measured cold/warm distinction."
    confirming_evidence:
      - "Controlled `/archiv` measurement was 17.002 s cold and 0.562 s warm, with route artifacts appearing only after the first request."
      - "The matching backend calls totaled about 42 ms and PostgreSQL had no waits, blockers, or saturation."
      - "After controlled WSL/Docker recovery, backend health returned in 0.137 s while the first frontend root request took 4.198 s."
    falsification_test: "The hypothesis is wrong as a practical mitigation if two scripted passes do not both return 200, the second pass is not materially faster, or the script changes backend/database container identity."
    fix_rationale: "The fix targets the confirmed on-demand compilation mechanism without replacing the HMR development seam or coupling frontend preparation to backend/database rebuilds."
    blind_spots: "Dynamic routes must be supplied explicitly by the tester; warm-up is not a production-performance substitute and does not remove compilation after source changes invalidate a route."
- tdd_checkpoint:

## Evidence

- timestamp: 2026-07-20T10:29:00+02:00
  checked: `.planning/debug/knowledge-base.md` against latency/error keywords from Symptoms.
  found: The only entry concerns PNG-to-JPEG transparency loss; there is no two-keyword overlap with slow pages, 10–50 second latency, backend unavailable, or fetch timeout.
  implication: No known-pattern candidate exists; investigate the live system from first principles.

- timestamp: 2026-07-20T10:32:30+02:00
  checked: `docker ps`, one-shot `docker stats`, Docker engine limits, Windows memory, and WSL distribution state.
  found: All seven project containers are running; health-checked containers are healthy. Docker has 4 vCPUs and 5.788 GiB RAM. Container memory totals roughly 1.7 GiB with no container above 17.65%; Windows has about 3.0 GiB physical memory free. Backend CPU was 0%, while frontend was 28.85%, main DB 13.59%, and Keycloak DB 14.28% in the one-shot sample. Frontend uptime is only 6 minutes versus 10 hours for the other containers.
  implication: Memory exhaustion and a restart loop are not present. A single CPU sample is insufficient to call saturation; frontend/DB activity needs sustained sampling and correlation with a slow request.

- timestamp: 2026-07-20T10:35:30+02:00
  checked: Five `docker stats` samples plus VM `/proc/meminfo`, pressure-stall metrics, swap, and filesystem usage.
  found: Frontend CPU ranged 0.27–13.05%, main DB stayed 0–0.04%, and other spikes were brief and low relative to 4 vCPUs. VM had about 3.46 GiB available, all 2 GiB swap remained free, memory pressure was zero, CPU full-pressure was zero, I/O pressure avg10/avg60 was zero, Docker overlay was 4% used, and the bind-mounted C: drive was 55% used. Block-I/O counters did not grow during samples.
  implication: There is no current global CPU, RAM, swap, disk-capacity, or I/O-pressure bottleneck. The earlier one-shot DB CPU readings were transient.

- timestamp: 2026-07-20T10:40:00+02:00
  checked: Layer-isolated HTTP timings for direct backend anime API, the same-origin Next API proxy, the dynamic `/anime` SSR route, and static `/`.
  found: Direct backend `:18092/api/v1/anime` returned 200 in 0.030 s. The same data through `:3000/api/v1/anime` returned 200 in 9.35 s. `/anime` returned 200 with 3.26 s TTFB and 11.79 s total, while static `/` took 3.30 s. All frontend requests were started together, so compile contention may inflate exact values but cannot explain the 300× direct-backend/proxy gap as backend query latency.
  implication: The latency boundary is inside the frontend/Next layer, before or around proxy/render execution; backend and database completed the representative query quickly.

- timestamp: 2026-07-20T10:44:30+02:00
  checked: Warm serial re-requests of the same Next proxy, dynamic Anime page, and static home page; container process/runtime configuration.
  found: Warm proxy completed in 0.310 s, `/anime` in 0.880 s, and `/` in 0.466 s, versus 9.35 s, 11.79 s, and 3.30 s on their concurrent first measurements. Frontend runs `next dev -p 3000` on Next 16.1.6 with source bind-mounted from Windows, persistent `.next`/`node_modules` volumes, and both Watchpack/Chokidar polling enabled. The `next-server` process is alive, not restarting. Frontend `docker logs` is unexpectedly empty, but backend logs show the representative `/api/v1/anime` request itself took only 3.8–101.7 ms.
  implication: A strong cold-versus-warm effect exists entirely in the Next development layer. The exact submechanism (one-time route compilation versus repeated invalidation/file scanning) still needs a controlled untouched-route test.

- timestamp: 2026-07-20T10:48:00+02:00
  checked: Controlled first-versus-second request to previously uncompiled public route `/archiv`, with `.next/dev/server/app` artifacts checked before and after.
  found: Before the request there was no dev artifact for `/archiv`. First request returned 200 in 17.002 s (16.968 s TTFB); the immediate second request returned 200 in 0.562 s. The first request created `.next/dev/server/app/archiv/page.js`, source map, and route manifests.
  implication: This is direct counterfactual evidence that Next's on-demand route compilation accounts for the reported multi-second latency. The same route and data path are fast once compiled.

- timestamp: 2026-07-20T10:52:00+02:00
  checked: PostgreSQL `pg_stat_activity`, `pg_blocking_pids`, lock waits, connection utilization, transaction age, and database-level counters.
  found: 9 total connections against `max_connections=100`, only the diagnostic query active, zero lock waiters/blockers, no old open transactions, zero rollbacks, zero temporary files/bytes, and zero deadlocks. The application connections were idle/ClientRead. `pg_stat_statements` is not installed, so historical per-statement ranking is unavailable without changing the system.
  implication: Current database locking, connection saturation, temp-spill pressure, and long-running transactions are absent; backend logs and direct API timings also contradict DB latency as the cause.

- timestamp: 2026-07-20T10:57:00+02:00
  checked: Backend logs for the controlled `/archiv` cold/warm requests and complete public project-page loader structure in `projectPageData.ts`.
  found: During the 17.002 s cold `/archiv` request, backend `/api/v1/archiv` took 31.8 ms and `/api/v1/fansubs` 9.8 ms; they arrived near the end of the frontend wait. On the warm 0.562 s request they took 1.8 ms and 8.6 ms. The project-page render path can issue about 15 backend calls including metadata, with several sequential groups and duplicate group/profile fetches; logged individual calls are generally 1–200 ms, worst observed about 500 ms, and a fully warm batch completed in roughly 0.23 s.
  implication: Backend/database work cannot account for the 17-second cold wait. Project request fan-out is real and can add warm-path latency or amplify frontend stalls, but it is not the primary system-wide 10–50 second cause.

- timestamp: 2026-07-20T14:38:00+02:00
  checked: Counterfactual native Windows `next dev` process on port 3001, using the same Next 16.1.6 dependencies and the already-running backend.
  found: `/anime` took 22.472 s cold and 3.921 s warm; `/watchlist` took 21.516 s cold and 6.052 s warm.
  implication: Removing only the Docker bind mount does not make cold development navigation fast enough. Local development remains useful for HMR, but UAT navigation needs a precompiled production frontend mode.

- timestamp: 2026-07-20T14:45:00+02:00
  checked: Host-facing port configuration versus `scripts/start-frontend-dev.ps1`.
  found: `.env` publishes the backend as `BACKEND_PORT=18092`, port 18092 is listening, and port 8092 is not listening. The frontend starter nevertheless hardcodes both browser and server-side API URLs to `http://localhost:8092`.
  implication: The first native timing test mixed compilation with backend connection failures/timeouts. The existing development seam must resolve the configured host port before it can provide reliable fast feedback.

- timestamp: 2026-07-20T15:02:00+02:00
  checked: Existing production frontend Dockerfile as a potential precompiled UAT mode.
  found: `docker compose -f docker-compose.yml build team4sv30-frontend` did not complete after about six minutes, emitted no usable BuildKit stage output through the runner, and left Docker/WSL temporarily unresponsive; the frontend image timestamp remained unchanged.
  implication: A production rebuild is not a verified fast local feedback loop on this workstation and must not be presented as the concrete fix.

- timestamp: 2026-07-20T15:07:00+02:00
  checked: Controlled recovery after terminating the stuck build.
  found: `wsl --list --verbose` initially hung. `wsl.exe --shutdown` completed without deleting volumes; Docker Engine 29.6.1 then recovered. `docker compose up -d --no-build` restarted the existing stack, backend `/health` returned 200 in 0.137 s, and the first frontend root request returned 200 in 4.198 s.
  implication: Service health is restored. The safe next change is lightweight frontend-only preparation, not another build or infrastructure mutation.

- timestamp: 2026-07-20T15:15:00+02:00
  checked: First execution of the new warm-up script through `powershell -File`.
  found: Passing `-Routes '/', '/archiv'` bound `/archiv` to the following positional parameter, changing `FrontendBaseUrl` and producing an invalid URI before any warm-up request. Backend and database IDs nevertheless remained unchanged and backend health stayed 200.
  implication: The array-valued command-line interface is ambiguous under Windows PowerShell. Use one comma-separated route string and split it inside the script.

- timestamp: 2026-07-20T15:18:00+02:00
  checked: Corrected two-pass warm-up for `/` and `/archiv`, plus backend/database identity and backend health.
  found: Both routes returned 200. `/` was 0.176 s then 0.171 s; `/archiv` was 1.520 s then 0.443 s. Backend and database container IDs were unchanged and backend health remained 200.
  implication: The script successfully prepares frontend dev routes and demonstrates the warm-path improvement without coupling UAT preparation to backend or database lifecycle.

- timestamp: 2026-07-20T15:20:00+02:00
  checked: PowerShell parse and full default-route pass.
  found: The script parsed with zero errors, but `/fansubs` returned 404 because the app router only defines `/fansubs/[slug]`, not a fansub list page.
  implication: Defaults must include only real static routes; fansub/project/release pages remain explicit caller-supplied dynamic paths.

- timestamp: 2026-07-20T15:24:00+02:00
  checked: Final default-route warm-up, PowerShell parser, scoped self-review, and whitespace validation.
  found: PowerShell parser reported zero errors; `/`, `/anime`, and `/archiv` returned 200 in 0.223 s, 0.342 s, and 0.384 s. `git diff --check` passed. The script contains no Docker/Compose or process lifecycle command.
  implication: The minimal frontend-only warm-up and workflow documentation are ready for real-flow human verification.

## Eliminated

- hypothesis: Rebuilding and running the base production frontend image is a sufficiently fast local UAT feedback workflow on this workstation.
  evidence: The frontend-only build failed to complete after roughly six minutes and left Docker/WSL temporarily unresponsive until a controlled WSL shutdown and no-build stack restart.
  timestamp: 2026-07-20T15:02:00+02:00

- hypothesis: Running `next dev` natively on Windows is by itself enough to remove the cold-route delay.
  evidence: Native Next 16.1.6 on port 3001 returned `/anime` in 22.472 s cold and 3.921 s warm, and `/watchlist` in 21.516 s cold and 6.052 s warm. This is not materially better than the containerized 17.002 s cold `/archiv` result.
  timestamp: 2026-07-20T14:38:00+02:00

- hypothesis: H1 — Current global WSL/Docker CPU, memory, swap, or disk pressure causes the system-wide latency.
  evidence: Five sustained samples showed low CPU, 3.46 GiB available VM memory, completely unused swap, zero current memory/I/O pressure, ample disk space, and stable block-I/O counters.
  timestamp: 2026-07-20T10:35:30+02:00

- hypothesis: H4 — PostgreSQL locks, long-running transactions, or connection pressure materially cause the page latency.
  evidence: No blockers or lock waits, only 9/100 connections, no old transaction, no deadlocks/temp files, and direct/backend logged requests complete in milliseconds.
  timestamp: 2026-07-20T10:52:00+02:00

- hypothesis: H5 — Backend request fan-out is the primary source of the 10–50 second latency.
  evidence: The controlled 17.002-second archive request used only two backend calls totaling about 42 ms; project-page calls are individually millisecond-scale and a warm batch completes in a fraction of a second. Fan-out remains a secondary optimization target.
  timestamp: 2026-07-20T10:57:00+02:00

## Resolution

- root_cause: The local frontend is intentionally running `next dev` (Next.js 16.1.6) from `docker-compose.override.yml`, with the full frontend source bind-mounted from Windows and Watchpack/Chokidar polling enabled. Next compiles an unvisited route on demand; that cold compilation/file-scanning path is taking 10–20+ seconds (and can be amplified on larger project/release routes), while the same route is sub-second after compilation. A recent frontend/container restart does not provide a durable cure because the new dev-server process must establish route compilation state again. The public project loader's sequential/duplicate API fan-out is a secondary latency amplifier, not the root cause.
- fix: Added `scripts/warm-frontend-dev.ps1` to precompile and time caller-selected UAT routes in bounded passes using frontend-only GET requests. Updated README development guidance to separate frontend Fast Refresh/UAT warm-up, backend Compose Watch, and explicit database migration workflows. A production-build preview was tested but deliberately not adopted because it was too heavy and destabilized the local engine.
- verification: Root cause evidence remains direct backend 0.030 s versus cold Next routes up to 17.002 s and warm sub-second responses. Fix verification: `/` 0.176/0.171 s and `/archiv` 1.520/0.443 s over two passes; default `/`, `/anime`, `/archiv` all returned 200 in 0.223–0.384 s; backend/database container IDs stayed unchanged; backend health returned 200; PowerShell parser reported zero errors; `git diff --check` passed.
- files_changed:
  - scripts/warm-frontend-dev.ps1
  - README.md
