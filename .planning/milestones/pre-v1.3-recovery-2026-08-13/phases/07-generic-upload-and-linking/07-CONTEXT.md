# Phase 7: Generic Upload And Linking - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning
**Source:** Direct user approval during plan kickoff

<domain>
## Phase Boundary

Phase 7 extends the verified anime-first V2 cover upload seam to the remaining in-scope anime asset types: `banner`, `logo`, `background`, and `background_video`.

The phase should make upload and linking reusable across anime asset slots in manual create and edit flows. It should preserve the verified V2-first behavior from Phase 06 rather than introducing new slot-specific upload paths or reviving legacy cover-only behavior.

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- Phase 7 stays anime-first; it does not expand generic upload/linking to non-anime entities.
- The verified `cover` seam from Phase 06 is the baseline pattern for all newly supported anime asset types.
- In-scope asset types for this phase are `cover`, `banner`, `logo`, `background`, and `background_video`.
- Manual create and edit flows must use one generic V2 upload and linking contract instead of slot-specific special cases.
- The phase should cover upload, linking, and the UI/API wiring needed to use the generic seam for the supported anime asset types.
- Cleanup semantics should stay aligned with the verified V2 ownership model and must not reintroduce `frontend/public/covers` or `/api/admin/upload-cover` into active flows.

### The Agent's Discretion
- How to split backend, frontend, and test work across plan files as long as all Phase 7 requirements remain covered.
- Whether helper abstractions should live in existing upload/linking modules or move into new shared utility files.
- The narrowest safe test set needed to prove generic slot support without reopening already-verified Phase 06 behavior beyond regression coverage.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and requirements
- `.planning/ROADMAP.md` - Phase goal, dependencies, and success criteria
- `.planning/REQUIREMENTS.md` - Required coverage for `UPLD-01`, `UPLD-02`, and `UPLD-03`
- `.planning/STATE.md` - Verified Phase 06 state and current milestone context

### Verified prior phase artifacts
- `.planning/phases/06-provisioning-and-lifecycle-foundations/06-CONTEXT.md` - Phase 06 scope and lifecycle baseline
- `.planning/phases/06-provisioning-and-lifecycle-foundations/06-RESEARCH.md` - Prior analysis of the V2 lifecycle seam
- `.planning/phases/06-provisioning-and-lifecycle-foundations/06-UAT.md` - Real browser verification evidence for the cover seam
- `CONTEXT.md` - Repo-local continuity notes for the next phase
- `STATUS.md` - Current runnable commands and verified environment state

</canonical_refs>

<specifics>
## Specific Ideas

- Treat the already-working `cover` path as the reference implementation, then generalize the seam so `banner`, `logo`, `background`, and `background_video` behave the same way.
- Keep create and edit on the same reusable contract so operator behavior stays predictable.
- Ensure planner output preserves the distinction between generic upload/linking in Phase 7 and broader replace/remove cleanup semantics reserved for Phase 8.

</specifics>

<deferred>
## Deferred Ideas

- Extending the generic upload/linking contract to non-anime entities
- Broader operator UX redesign beyond what is needed to expose the supported asset types
- Cleanup and replacement semantics beyond what is necessary to preserve Phase 06 behavior and prepare for Phase 8

</deferred>

---

*Phase: 07-generic-upload-and-linking*
*Context gathered: 2026-04-04 via direct user approval*
