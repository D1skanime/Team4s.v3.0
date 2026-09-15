# Phase 161 pre-execution plan check

Status: **VERIFICATION PASSED — no blocking findings; one non-blocking scope warning.**

Reviewed nine plans against the complete user request, D-01–D-15, all six roadmap requirements, canonical project instructions, research, pattern map and the relevant existing call sites. This is static plan verification, not implementation verification or Human-UAT. No application test, provider request or database mutation was performed by this checker.

## Final coverage

| Requirement | Plans | Result |
|---|---|---|
| P161-AUTH | 01, 03, 09 | All nine Go HTTP execution sites plus indirect FFmpeg covered; origin/redirect/error/secret tests and provider separation included. |
| P161-API | 01, 02, 09 | Actual used paths, schema fields, errors and live response evidence covered. |
| P161-ITEMS | 01, 02, 05, 09 | Exact IDs, explicit recursion, pagination, completeness and bounded hydration covered. |
| P161-SOURCE | 02, 04–09 | Deterministic source binding spans review, server validation, persistence, relink, playback, subtitles and cache. |
| P161-METADATA | 02, 04–09 | Source-owned scalar fields and track metadata remain coherent through all writers and the public projection. |
| P161-REGRESSION | 03–09 | Isolated persistence, browser refresh session, other providers, baseline separation and live read-only checks covered. |

All 15 locked decisions have implementing or verification tasks. The 27 actual 11eyes items versus 38 nested sources and 11 non-item alternatives are handled explicitly without fabricated item IDs or an unrequested all-alternative import model. Existing JSONB is reused. No migration, application DB write, reset, provider scan or UI redesign is planned.

## Plan structure and dependencies

| Plan | Tasks | Files | Wave | Dependencies |
|---|---:|---:|---:|---|
| 161-01 | 3 | 8 | 1 | — |
| 161-02 | 2 | 8 | 2 | 01 |
| 161-03 | 3 | 12 | 2 | 01 |
| 161-04 | 3 | 11 | 3 | 02 |
| 161-05 | 3 | 10 | 4 | 04 |
| 161-06 | 3 | 11 | 5 | 05, 03 |
| 161-07 | 3 | 14 | 6 | 06 |
| 161-08 | 3 | 4 | 7 | 07 |
| 161-09 | 2 | 4 | 8 | 08 |

Dependencies are acyclic; waves are consistent. Shared-checkout serialization is explicit even where technical waves could run independently. The new final integration task in 08 has a real dependency on the completed playback implementation in 07 and remains mandatory within this phase.

## Revisions verified

| Initial issue | Final resolution |
|---|---|
| B1: Actual cache hash entry points were missing. | 07 Task 3 now names both RenderSegment/segment_stream.go and buildQueuedSegmentRenderCache/segment_render_refresh.go. The existing source_fingerprint is compared with execution identity before FFmpeg. Both key_links are valid individual mappings. |
| B2: Incomplete B could inherit complete A metadata. | 05 Task 1 and 06 Tasks 1–2 restrict preservation to the same resolved binding. A-to-B with omitted MediaStreams fails before mutation, with rollback and same-A retention fixtures. |
| B3: Resolver Task 1 depended on DTO fields introduced in Task 2. | 02 Task 1 now owns the nested DTO additions before its Go gate; Task 2 only adds batch/query wiring. |
| B4: Final live verification command contained prose and invalid shell syntax. | 09 now contains actual sequential commands with failure propagation, expressed with XML-escaped conjunctions. |
| W2: DB command examples omitted DSN injection. | All relevant plans specify in-memory construction of the dedicated test DSN, docker exec environment forwarding, no secret output and mandatory failure on skipped required DB tests. |
| Revision detail: Plan 07 reached 15 files. | Final guarded theme-playback integration was moved as a complete required task to 08; 07 owns 14 files and 08 owns four. No source or test acceptance requirement was dropped. |

## Dimension results

- Requirement coverage: PASS, six of six requirements and all decisions covered.
- Task completeness: PASS, all 25 tasks have files, action, verification and done criteria.
- Dependency correctness: PASS, including corrected DTO-before-resolver ordering.
- Key links: PASS, including both actual cache entry points and the worker fingerprint boundary.
- Scope sanity: WARNING below; no plan reaches the blocking task/file threshold.
- Goal derivation: PASS, user-observable truths have supporting artifacts and integration tasks.
- Context and scope compliance: PASS; no silent reduction of the requested deterministic source behavior, no unrelated all-source import or rewrite.
- Architectural responsibility: PASS against the companion MediaSource research map; provider validation and persistence stay in the backend/repository, browser only preserves reviewed identity.
- Cross-plan contracts: PASS, one typed source snapshot and explicit unchanged-binding-only retention.
- AGENTS compliance: PASS, canonical VM, sequential checkout, existing media/auth/contract seams and isolated DB fixtures are specified.
- Research resolution: PASS, implementation decisions are stated; empirical rescan and cold-subtitle limits are explicitly bounded rather than presented as proven behavior.
- Pattern compliance: PASS, existing owner/analog files are referenced and the source selector is explicitly identified as the necessary new semantic helper.

## Nyquist compliance

VALIDATION.md exists and the research supplies a validation architecture. All 25 tasks have automated commands. No watch command, missing-test placeholder or uncovered implementation window exists.

| Wave | Tasks with automated verification | Result |
|---|---:|---|
| 1 | 3/3 | PASS |
| 2 | 5/5 | PASS |
| 3 | 3/3 | PASS |
| 4 | 3/3 | PASS |
| 5 | 3/3 | PASS |
| 6 | 3/3 | PASS |
| 7 | 3/3 | PASS |
| 8 | 2/2 | PASS |

No separate Wave 0 is required: tests and implementation are paired in their owning tasks. Guarded database tests must actually execute, and skipped mandatory cases are a failed execution gate. This review does not claim measured feedback latency or green runtime tests.

## Remaining non-blocking warning

```yaml
issues:
  - id: W1
    plan: "161-03,161-04,161-05,161-06,161-07"
    dimension: scope_sanity
    severity: warning
    description: "These plans own 12, 11, 10, 11 and 14 files respectively, above the recommended 5–8 files, while remaining below the blocking threshold."
    fix_hint: "Keep the documented serialized execution and bounded task gates. Do not add opportunistic files or merge these plans; split further only if implementation reveals additional required work."
```

The revision gate is clear for execution. Actual compatibility, persistence, security and performance claims remain conditional on the planned tests and final live evidence. Human-UAT status must remain separate.
