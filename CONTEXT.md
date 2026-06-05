# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** Post-MVP fansub/contribution hardening and polish.
- **Current branch:** `main`
- **Current local state:** `main` is ahead of `origin/main`; closeout did not push or commit.

## Current State

### What Finished Today
- Phases 60-69 were audited as the MVP baseline for fansub contributions, historical members, roles, claims, badges, archive search, and permission/contract hardening.
- Phase 69 was closed with contract and roadmap cleanup in commit `16429983`.
- Phase 70 TipTap profile story images were implemented and verified through commit `39517af0`.
- Phase 71 was captured as a separate post-MVP UI-polish/design thread; its context/discussion/UI-spec artifacts are committed, but no uncommitted Phase-71 UAT artifact is present in this worktree at closeout.
- A local-only discussion summary was created at `.planning/MVP-PHASES-60-69-SUMMARY.md`; user explicitly said it does not need to go to GitHub.

### What Works
- `/admin/fansubs/[id]/edit` is the canonical internal edit workspace for group members, historical members, roles/timeline, proposals, claims, anime contributions, group milestones, and release/anime work.
- `/admin/my-groups/[id]` must not be treated as the new edit hub; it is an own/contributor or future display surface unless a later decision changes that.
- Claim invitations and normal app-member invitations are separate flows: one links an app user to a historical member identity, the other grants group membership/app access.
- Phase 70 profile story image upload/render/save round-trip is verified: story images use media asset references, not base64 or external URLs.
- Phase 68 archive and badge work was live-UAT verified, including public archive filters and verified/first-contribution badges.

### What Is Open
- Phase 71 follow-through is the likely next product/design slice: UI primitives, display-vs-edit separation, credits wording, member-profile polish, and permission bridge clarification.
- A platform-admin global user/rights overview is not implemented by phases 60-69 and should be planned separately.
- Claim visibility/permissions should be reconsidered for fresh databases where historical claim tooling is less everyday than long-term migration/correction tooling.
- The local MVP summary file is useful discussion material but should remain untracked unless the user changes their mind.

## Active Planning Context
- `.planning/phases/60-*` through `.planning/phases/69-*` are the closed MVP evidence chain.
- `.planning/phases/70-tiptap-bilder-fuer-member-profilgeschichte` contains the current completed Phase-70 artifacts.
- `.planning/phases/71-ui-politur-fansub-contributions-und-member-profil-auf-global` contains Phase-71 context, discussion log, and UI spec.
- `.planning/MVP-PHASES-60-69-SUMMARY.md` is local-only discussion prep, not a GitHub artifact.

## Key Decisions In Force
- Anime and episodes are neutral.
- Fansub context belongs to fansub groups, releases, release versions, and release-version groups.
- Release-version media must use `release_version_media.release_version_id`.
- Do not reintroduce `release_version_groups.fansubgroup_id`; use `fansub_group_id`.
- Do not attach release media directly to episodes.
- Do not invent parallel media/upload flows before reusing or explicitly deciding against existing domain flows.
- `/admin/fansubs/[id]/edit` owns internal leader/admin edit actions; do not move proposal, claim, or milestone editing back into `my-groups`.
- Credits and permissions are different concepts. A contribution credit must not automatically grant edit rights without an explicit, reversible permission model.
