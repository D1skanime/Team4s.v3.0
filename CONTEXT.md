# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** v1.1 asset lifecycle hardening
- **Current slice:** Phase 15 follow-through on create-page online asset adoption, specifically making provider-selected non-cover assets survive create/save and retain provenance

## Current State

### What Finished Today
- The root handoff files were realigned with the actual repo state: `main` is already through verified Phase 15 on commit `d99fc15`.
- The create request path now carries provider-selected `banner`, `logo`, `background_video`, and `background` URLs instead of only `cover_image`.
- Backend create handling now attaches those URLs into the V2 media model during anime creation.
- Create-side background uploads can now retain `provider_key` provenance and store matching `media_external` links.
- `fanart.tv` background support was enabled and Safebooru's deterministic start offset was reduced for smaller result pools.
- The current closeout is prepared for commit/push, but today's code changes were not freshly verified in this session.

### What Works
- Docker stack remains usable for browser verification on `http://localhost:3002` and `http://localhost:8092`.
- Local non-Docker dev startup also works through `scripts/start-backend-dev.ps1` and `scripts/start-frontend-dev.ps1`.
- `main` includes verified Phase 14 and Phase 15 work: provider search separation plus slot-specific online asset search/selection on `/admin/anime/create`.
- The create page can already search remote assets per slot, stage chosen remote images into the normal upload seam, and submit manual/remote assets through the same staged-flow model.
- AniSearch create relation follow-through remains part of the verified baseline from Phase 13.
- Local Docker and local-dev startup commands from `STATUS.md` are still the expected runtime entry points.

### What Is Open
- Today's create-side provider-asset follow-through is still unverified because sandboxed test runs could not complete.
- Live browser UAT for Phase-15 remote asset adoption is still pending.
- Once the create-side follow-through is verified, the team still needs to decide whether the next product slice stays in asset-search hardening or returns to relation UX planning.
- Cross-AI review is still unavailable without an independent reviewer CLI.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Verified/executed phases on `main`: `06`, `07`, `10`, `12`, `13`, `14`, `15`
- Next required step: verify today's Phase-15 follow-through in the real create flow before widening scope again
- Do **not** reopen the verified upload/link seam or Phase-13 relation work unless a fresh regression appears.

## Key Decisions In Force
- Anime-first and V2-first remains the current execution scope.
- Manual create/edit/delete flows must use the same generic upload seam rather than slot-specific legacy endpoints.
- Tags behave analog to genres: normalized reference table plus junction table, authoritative write on save, junction cleanup on delete.
- Replace/remove/delete cleanup must stay aligned between DB ownership and filesystem cleanup.
- `Team4s` is now the canonical local Git repo; `Team4sV2` was only the recovery workspace.
- Phase 14/15 create-page provider search and online asset selection are part of the current baseline on `main`.
- Provider-selected create assets should keep using the same authoritative create/upload seam instead of inventing a second persistence channel.
- Background provider provenance should survive remote adoption when enough provider identity is available.

## Quality Bar
- Keep build/test commands in `STATUS.md` runnable on both Docker and local-dev paths.
- Tomorrow's first task should be one concrete verification step for provider-selected create assets that takes under 15 minutes.
- Any new metadata or AniSearch work should extend the current V2/admin contracts instead of reviving legacy slot-specific paths.
