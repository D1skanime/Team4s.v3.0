---
status: diagnosed
trigger: "Weiss du warum das System schon wieder so langsam ist? Ich hab erst kürzlich Server-Restart gemacht, aber jetzt ist es schon wieder so lahm."
created: 2026-07-20
updated: 2026-07-20T10:57:00+02:00
scope: diagnosis_only
---

# System wieder langsam

## Symptoms

- Expected behavior: Lokale Seiten und APIs reagieren bei nur einem Tester innerhalb weniger Sekunden.
- Actual behavior: Seitenaufrufe benötigen wiederholt ungefähr 10 bis 50 Sekunden; ein Server-/Container-Neustart hilft höchstens kurzfristig.
- Error messages: Kein dauerhafter Nutzerfehler gemeldet; zuletzt traten zeitweise Frontend-Fehler `Backend API nicht erreichbar.` und interne Fetch-Timeouts auf.
- Timeline: Das Verhalten tritt erneut auf, obwohl der Server erst kürzlich neu gestartet wurde.
- Reproduction: Öffentliche Anime-, Fansub-, Projekt- und Release-Seiten lokal über `http://127.0.0.1:3000` öffnen.

## Current Focus

- hypothesis: CONFIRMED — Next.js 16 runs in development mode and compiles routes on demand; cold route compilation over the Windows bind-mounted source tree is the dominant 10–50 second latency mechanism. Project-page request fan-out is a secondary amplifier.
- test: Completed controlled cold/warm route counterfactual, layer-isolated API timings, backend-log correlation, resource measurements, PostgreSQL lock/activity checks, and project loader trace.
- expecting: Confirmed observations are 17.002 s first hit versus 0.562 s second hit with route artifacts created on first hit, while matching backend work is measured in milliseconds.
- next_action: Return diagnose-only ROOT CAUSE FOUND report; do not change code, configuration, containers, or services.
- reasoning_checkpoint:
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

## Eliminated

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
- fix:
- verification: Diagnosis-only verification: direct backend anime API 0.030 s; Next proxy first 9.35 s then warm 0.310 s; `/anime` first 11.79 s then warm 0.880 s; previously uncompiled `/archiv` first 17.002 s then 0.562 s, with `.next/dev/server/app/archiv` artifacts appearing only after the first request. PostgreSQL had no blockers/lock waits and ample connections; Docker/WSL had no CPU, memory, swap, disk, or I/O-pressure saturation.
- files_changed:
