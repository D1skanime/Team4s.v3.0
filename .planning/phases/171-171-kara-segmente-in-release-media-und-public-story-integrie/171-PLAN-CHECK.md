# Phase 171 Plan Checker Report

**Phase:** 171 — Kara-Segmente in Release-Media und Public Story  
**Checked:** 2026-09-30  
**Repository:** `/home/d1sk/team4s` on `team4s-linux`  
**Verdict:** **ISSUES FOUND — 7 blockers, 3 warnings**

## Coverage and dependency result

| Area | Result |
|---|---|
| Phase boundary / D-01..D-16 | All 16 decisions are mentioned in at least one current task action/objective; detailed implementation coverage is not yet sufficient for D-03, D-15, and D-16. |
| Plans / waves | 171-01 → 171-02 → 171-03; 171-04 depends on 171-02 and 171-03. No cycle or missing plan reference found. |
| Domain ownership | Intent is correct: media stays in `release_version_media`; Kara stays in `theme_segment_assignments/theme_segments`. The persistence constraints and decision record are underspecified. |
| Contract synchronization | OpenAPI, admin-content, Go, TypeScript, and `api.ts` are named, but endpoint/method/status/error/auth details and the public story projection wiring are not executable enough to verify. |
| Auth/playback | **Not covered sufficiently.** The existing public segment-grant/stream relay path is not listed among the files to change, and the current timeline hides play activation for unauthenticated users. |
| Responsive/live UAT | Automated task text names 390x844, 768x1024, and 1440x900, but the live UAT task does not require those exact viewports, the in-app browser, or the authenticated-but-unauthorized actor. |
| Scope | Plans 01–03 are 2/2/3 tasks; Plan 04 has 4 tasks and wildcard file scopes. This is a quality warning and prevents exact change-scope review. |
| Nyquist | Skipped: `171-RESEARCH.md` has no `Validation Architecture` section. No `171-VALIDATION.md` exists. |
| Research resolution | Pass: no unresolved `Open Questions` section found. |
| Architectural responsibility map | Skipped: no phase research responsibility-map section found. |
| Pattern compliance | Skipped: no phase `PATTERNS.md` found. |

## Blockers

**1. [task_completeness] Plan 171-04 is not executable.**

- Plan: `171-04-PLAN.md`
- Tasks: 1–4
- The tasks use legacy types (`test`, `verification`, `documentation`) and omit `<files>`, `<action>`, `<verify>`, and `<done>`.
- Fix: Rewrite each task as an executable task with exact files, concrete actions, runnable automated verification, and measurable completion criteria. Keep live UAT/documentation as an explicit verification task with acceptance evidence.

**2. [task_completeness] Plans 171-01 through 171-03 do not expose a real `<read_first>` element.**

- Plans: `171-01`, `171-02`, `171-03`
- The required read list is embedded as semicolon-separated text inside `<context><read_first>...` rather than the standard task-plan structure.
- Fix: Use a standalone `<read_first>` block with one exact repository path per entry. This matters because the executor may not parse the nested form and would miss the required analogs/contracts.

**3. [ownership/domain_safety] The new story-order persistence decision is not sufficiently specified or recorded.**

- Plan: `171-01`, Task 1
- The plan names migration `0174_release_version_story_order`, but does not specify the table columns/constraints or the exact transaction checks proving:
  - a media target is an active row of the same `release_version_id` in `release_version_media`;
  - a Kara target is an existing `theme_segment_assignments` row for the same `release_version_id`;
  - typed targets cannot cross domains or releases;
  - deleted media and duplicate typed targets are excluded.
- The plan also adds a new schema seam without listing an architecture/decision artifact, despite AGENTS.md requiring new tables/contracts to be documented.
- Fix: Define the additive relation and invariants in the plan, name the SQL constraints/query checks, update the applicable architecture/decision record, and test migration up/down plus same-version/cross-version/foreign-target cases before any UI work.

**4. [key_links_planned] The canonical order is not wired completely in the file ledger or contract actions.**

- Plan: `171-01`
- Task 2 modifies `backend/internal/repository/release_detail_public_repository_helpers.go`, but that file is absent from `files_modified`. The action also says “extend existing reorder/read seams” without naming the exact endpoint path, HTTP method, request/response DTOs, error statuses, and public story field consumed by both admin and public clients.
- Fix: Add every changed file to `files_modified` and specify the exact admin read/reorder operation, public projection field, request discriminator, response schema, auth requirement, and 400/401/403/404/409 behavior. State which shared typed story-item module is imported by both admin and public composition.

**5. [auth_playback] D-14/D-15/D-16 are not actually deliverable from the planned playback files.**

- Plan: `171-03`, Task 2
- The existing implementation has `ThemeTimeline` gate playable controls on `hasSession`, while the existing server relay uses the public segment-grant path. The plan does not list or modify the relevant playback boundary files (`frontend/src/lib/server/streamRelayAuth.ts`, `frontend/src/app/api/segments/[id]/stream/route.ts`, and/or `backend/internal/handlers/segment_stream.go`) and does not define how the required matrix is enforced:
  - anonymous → login hint;
  - authenticated but unauthorized → permission hint;
  - authenticated and authorized → playback.
- “Use the existing auth/session seam” is not enough when the existing public-grant behavior and current UI gating do not prove that matrix.
- Fix: Name the exact playback/grant/relay files and contract changes, preserve backend authorization as authoritative, and add focused tests for all three outcomes plus the visible play affordance for anonymous users.

**6. [auth_refresh] The mandated refresh-only regression is asserted but not tied to an executable protected-flow test.**

- Plans: `171-02`, `171-03`
- AGENTS.md requires protected UI/action coverage where access token is absent/expired but refresh token is valid. Plan 171-03 mentions the case, but its automated command only runs `ThemeTimeline.test.tsx` and repository tests; Plan 171-02 only repeats it in a top-level verification sentence.
- Fix: Add a named frontend test/helper seam and command that proves the actual protected admin reorder/action and public playback path proceed through central `api.ts` refresh with no logged-out UI, without direct token handling.

**7. [AGENTS.md/UI_contract] The required live visual and responsive gate is underspecified.**

- Plan: `171-04`
- The live task says “test mobile layout” and “authenticated/authorized,” but does not require the project-mandated 390x844, 768x1024, and 1440x900 checkpoints, the in-app browser/shared user route review, or an authenticated-but-unauthorized actor. It also does not name the exact canonical public Release 27 URL.
- The phase introduces a substantial admin/public UI composition, yet no explicit 171 UI implementation specification is listed; sketches alone are not the Team4s UI contract.
- Fix: Add/read a phase UI spec covering hierarchy and responsive behavior, then make UAT enumerate exact routes, actors, session states, viewports, expected outcomes, screenshots/evidence, and the authenticated-but-unauthorized playback case.

## Warnings

**1. [scope_sanity] Plan 171-04 has 4 tasks and wildcard file scopes; Plans 171-01 through 171-03 each touch roughly 11–12 files.**

Fix: Keep the four verification tasks only if each has exact files and checks; otherwise split automated verification from live UAT/documentation. Replace `*.test.tsx`, `*test.go`, and `*.module.css` with the concrete files.

**2. [contract_sync] Plan 171-04 can mutate the canonical contracts during late “gap closing.”**

The contract sources should be fully defined in 171-01/03 before UI execution. Restrict 171-04 to test/evidence updates, or explicitly document why a contract change remains possible and how all DTO/helper layers stay synchronized.

**3. [roadmap_consistency] `.planning/ROADMAP.md` still says Phase 171 “Goal: [To be planned]” and “Requirements: TBD.”**

The CONTEXT.md supplies a usable goal and D-01..D-16 baseline, so this does not erase the plan’s contextual coverage, but the roadmap cannot independently serve as the phase acceptance source. Update the roadmap requirements/goal before execution or explicitly bind PH171 to the locked context decisions.

## Decision coverage matrix

| Decisions | Planned locations | Status |
|---|---|---|
| D-01..D-03 | 171-01, 171-02, 171-03 | Mentioned; D-03 persistence invariants still blocked by issue 3. |
| D-04..D-08 | 171-02 | Covered in task actions; exact create/assignment callback seam should remain explicit. |
| D-09..D-13 | 171-03 | Covered in task actions; shared story type/key-link needs explicit contract wiring. |
| D-14..D-16 | 171-03, 171-04 | Mentioned, but auth/playback and refresh behavior fail the deliverability checks above. |

## Recommendation

**Return to planner for revision.** Resolve the 7 blockers before execution. Preserve the existing unstaged planning edits and re-run the revision gate after Plan 171-04 is converted to executable tasks and the ownership-safe story-order, playback authorization, refresh-only, contract, and live-UAT details are made explicit.

No production code was edited by this review. Existing unrelated worktree changes were preserved.

