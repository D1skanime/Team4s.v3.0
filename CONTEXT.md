# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current branch:** `codex/ui-system-closeout-2026-05-21`
- **Current slice:** Phase 48 is functionally closed; Phase 48A/49 follow-through is active.

## Current State

### What Finished In This Pass
- Phase 48 `Meine Gruppen & Contributor Dashboard` was implemented and verified against real Keycloak sessions.
- Lead account `phase43-member` sees only `AnimeOwnage`, can open member/edit/media/admin seams, and is denied on foreign group `96`.
- Contributor account `tomoni.member.auto.20260518152444` sees only `Tomoni`, has version-level visibility, no admin/upload/member-management affordances, and is denied on foreign group `88`.
- Phase 48 now has summary, UAT, validation, code-review, and UI-review artifacts.
- The UI review scored Phase 48 at `21/24 PASS`, with follow-ups for long release lists, clearer inactive capability badges, and stronger media fallbacks.
- Phase 49 exists in `ROADMAP.md` as `Zentraler Auth-/API-Client und Token-Lifecycle-Härtung`.
- Current unpushed commit `04a5f588` fixes Docker live API routing by proxying API requests through the frontend.

### What Works
- Docker deploy was rebuilt successfully for the Phase 48/49 live path in the previous session.
- `/admin/my-groups` and `/admin/my-groups/[id]` work with real Keycloak-authenticated users.
- Foreign group access returns the expected denied state.
- `/dev/ui-system` remains the visual source of truth for new UI slices.
- The frontend proxy fix is already committed locally and ready to push.

### What Is Open
- The worktree is very broad and dirty: product files, planning artifacts, Codex/GSD tooling changes, untracked phase docs, and many `.tmp-*` screenshots coexist.
- Do not stage the entire worktree without a separate review. The safe closeout push should stay narrow.
- Phase 48 UI follow-ups are documented but not blockers: long release lists, disabled capability copy, media fallback polish.
- Repository-wide lint/check status is not clean enough to treat the whole tree as one atomic deliverable.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Completed/closed in practice: Phase 48 contributor dashboard.
- Active follow-through: Phase 48A UI foundation and Phase 49 auth/API-client hardening.
- Phase 42 collaboration remains parked until the auth/member/capability baseline stays stable.

## Key Decisions In Force
- Keycloak owns identity; Team4s owns app users, global roles, fansub memberships, and permission decisions.
- Permission-aware frontend screens should consume backend capabilities instead of re-inferring roles.
- Release/fansub media must stay on canonical release/fansub-group seams, not attach directly to neutral episodes/anime.
- The global Team4s UI system in `docs/frontend/ui-system.md`, `docs/frontend/ui-inventory.md`, and `/dev/ui-system` is the visual target for new slices.
- Pushes from this dirty workspace must be explicitly sliced; temp screenshots and broad GSD update noise are not safe default commit material.
