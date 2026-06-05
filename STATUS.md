# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** Post-MVP fansub/contribution polish after MVP phases 60-69.
- **Branch:** `main`
- **Status:** Phases 60-69 are closed as the current fansub-contributions MVP baseline. Phase 70 is verified and committed. Phase 71 is planned/designed as the next separate UI-polish thread.
- **Current focus:** Preserve the verified MVP baseline, then continue with Phase 71 or a deliberate post-MVP discussion/planning slice.

## What Works Now
- Fansub contributions have a real data/API/UI baseline: historical members, member roles, anime contributions, proposals, claims, release-version credits, badges, group milestones, archive search, contracts, and permission guards.
- `/admin/fansubs/[id]/edit` is the canonical edit workspace for internal leader/admin actions.
- `/admin/my-groups/[id]` is not the canonical edit workspace for proposals, claims, or milestones.
- Claim invitations can link an app user to a historical member entry; normal group invitations remain separate app-membership flows.
- Phase 70 profile story images persist through media-backed TipTap image references and have UAT evidence in commit `39517af0`.
- Phase 71 artifacts exist for context/discussion/UI-spec, but no uncommitted Phase-71 UAT file is visible locally at closeout.

## What Is Not Done Yet
- Phase 71 implementation/closure should be confirmed against the latest branch/thread before coding further.
- Global platform-admin user/rights overview is still a future planning topic.
- Public Fansub Page information architecture is not fully defined yet.
- Claim-management visibility should probably become permission/need-sensitive instead of always prominent for every fresh-data workflow.
- `.planning/MVP-PHASES-60-69-SUMMARY.md` is local-only discussion prep and should not be staged unless the user asks.

## Valid Commands
- `cd backend && go test ./...`
- `cd backend && go test ./internal/handlers ./internal/repository`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm test -- --run`
- `git diff --check`
- `git status --short --branch`

## Verification Evidence
- Phase 60 live SMTP/Mailpit UAT passed.
- Phase 61 schema UAT/verification passed.
- Phase 63 browser/API UAT passed after live fixes.
- Phase 64 re-verification passed 6/6.
- Phase 65 live browser UAT passed; proposal review route ownership moved to `/admin/fansubs/[id]/edit`.
- Phase 66 claim/verification UAT passed 6/6.
- Phase 67 release/episode credits passed live browser/API/DB verification.
- Phase 68 badge/archive/milestone UAT passed after moving milestone CRUD into the edit area.
- Phase 69 contract/permission hardening was committed in `16429983`.
- Phase 70 final UAT was committed in `39517af0`.
- Closeout checks: `git diff --check -- .planning/MVP-PHASES-60-69-SUMMARY.md` passed; no full test suite was run during closeout.

## Top 3 Next
1. Inspect Phase 71 latest artifacts/commits and confirm whether the reported UAT result exists in this workspace or another agent/thread.
2. Decide whether to continue Phase 71 implementation/verification or start the post-MVP product discussion from the local MVP summary.
3. Push/sync strategy: `main` is far ahead of `origin/main`; decide when and what to push.

## Risks / Blockers
- Do not stage `.planning/MVP-PHASES-60-69-SUMMARY.md` for GitHub unless the user changes that decision.
- Do not stage `frontend/tsconfig.tsbuildinfo`; it is generated local state.
- Do not move internal edit actions back to `/admin/my-groups/[id]`.
- Do not mix credits with permissions.
- Do not collapse versioned release media back onto `release_media`.
- Do not create a new upload flow unless the reuse guardrail has been checked and a decision is documented.
