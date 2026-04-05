# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 - Admin Anime Intake

**Shipped:** 2026-04-01
**Phases:** 6 | **Plans:** 23 | **Sessions:** 1 closeout cycle

### What Was Built

- A shared ownership-aware anime editor surface that now powers both create and edit flows.
- Manual and Jellyfin-assisted anime intake with explicit-save-only behavior and draft-level review.
- Persisted Jellyfin provenance, fill-only resync, ownership-aware asset handling, and relation CRUD on the edit route.

### What Worked

- Breaking the milestone into small, requirement-mapped phases kept the brownfield refactor restartable.
- Conversational UAT plus targeted follow-up fixes caught the UI/state problems that automated tests alone would not have surfaced cleanly.
- Keeping Jellyfin behavior preview-only until explicit save preserved a strong operator mental model throughout the milestone.

### What Was Inefficient

- Planning artifacts drifted behind implementation late in the milestone, especially validation files and some summary metadata.
- Local-vs-Docker runtime switching introduced unnecessary friction during UI verification.
- The intake entry contract changed in practice without the roadmap and project docs being re-baselined immediately.

### Patterns Established

- Shared-shell admin workflows are the preferred way to grow create/edit capabilities.
- Preview-first external-source imports reduce data ownership ambiguity.
- UAT findings should be turned into first-class planning artifacts immediately instead of being left to catch up later.

### Key Lessons

1. In a brownfield admin surface, explicit save boundaries are one of the highest-value stabilizers for both code and UX.
2. Validation and audit artifacts need to be maintained continuously during execution, not reconstructed at milestone closeout.

### Cost Observations

- Model mix: not tracked in repo artifacts
- Sessions: closeout data only; broader milestone session count not reconstructed here
- Notable: small, focused verification loops were efficient, but environment switching wasted time

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | not tracked | 6 | Requirement-mapped phase execution with conversational UAT and milestone audit closeout |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | targeted frontend and backend slices plus manual UAT | not quantified | not tracked |

### Top Lessons (Verified Across Milestones)

1. Not enough milestone history yet for cross-milestone verification.
