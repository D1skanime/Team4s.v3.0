# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current branch:** `codex/phase-51-keycloak-auth-boundary`
- **Current slice:** Phase 51 Keycloak access-token resource-server boundary is complete; commit/push hygiene is the active operational task.

## Current State

### What Finished Today
- Phase 51 closed the Keycloak/API token boundary:
  - Keycloak issues access tokens with `team4s-api` audience.
  - Frontend stores and sends `access_token`, not `id_token`, for Team4s API calls.
  - Backend accepts API access tokens and rejects ID tokens as API bearers.
  - `51-UAT.md`, `51-VERIFICATION.md`, `51-SECURITY.md`, and `51-VALIDATION.md` are present.
- The audit folder now contains the durable audit/roadmap/status artifacts for code-altlasten, domain risks, duplicate UI patterns, and cleanup slices.
- `release_version_media` is documented and treated as canonical for versioned Admin/Fansub process media.
- Admin release summaries and contracts document/use `release_version_id` for release-version media flows.
- Confirmed legacy frontend routes were removed:
  - `/admin/anime/[id]/versions`
  - `/admin/anime/[id]/themes`
  - `/admin/fansubs/[id]/members`
  - `/manage/groups/[id]`
- Safe UI cleanup slices were completed:
  - `/admin/fansubs` desktop list uses the existing shared table.
  - `/admin/fansubs` page-level loading/error/empty states use existing shared UI state components.
  - `SegmenteTab.tsx` uses the existing shared table while preserving active-row/editor behavior.
- Fansub release drawer loading is hardened against stale async responses and stale upload/delete finalizers.
- Follow-up lint cleanup removed the unused drawer helper and made release workspace reset callbacks ESLint-clean.
- ROADMAP and STATUS for the audit are synchronized through WP-06/WP-06a.

### What Works
- `/api/v1/me` accepts the live Keycloak access token and rejects the live Keycloak ID token.
- The intended 24h login behavior is handled through refresh-token lifetime, while access tokens stay short-lived.
- Release-version media drawer summary uses `release_version_id`, not `release_id`.
- Release drawer detail responses are guarded so an older `getAdminRelease` response cannot overwrite a newer drawer context.
- Theme drawer upload/delete completion is guarded by the current selection and mutation id.
- Existing upload flows are explicitly documented as reusable guardrails for future agents.
- Targeted frontend tests, typecheck, targeted lint, and diff checks passed for today's final slices.

### What Is Open
- Phase 51 has no open product gaps. The remaining work is commit hygiene and push.
- The audit is complete enough to close, but follow-up hardening remains valuable:
  - add domain guardrail tests for `release_version_id`, `fansub_group_id`, and media ownership rules;
  - optionally clean the existing `next/image` test mock warning;
  - only later consider larger Drawer/Upload/Card UI convergence.
- The worktree is still broad and dirty. Do not use broad staging; commit Phase 51 explicitly and stash or split unrelated changes.
- Several unrelated or pre-existing changes are present in backend/auth/infra/planning/generated files.

## Active Planning Context
- Audit root: `.planning/quick/260525-code-altlasten-und-domain-audit`
- Durable files:
  - `ROADMAP.md`
  - `STATUS.md`
  - `SUMMARY.md`
  - `UI_DUPLICATES.md`
- The audit should not be reopened for the already completed race-condition item; use follow-up slices for new work.

## Key Decisions In Force
- Anime and episodes are neutral.
- Fansub context belongs to fansub groups, releases, release versions, and release-version groups.
- Release-version media must use `release_version_id`.
- Do not reintroduce `release_version_groups.fansubgroup_id`; use `fansub_group_id`.
- Do not attach release media directly to episodes.
- Do not invent parallel media/upload flows before reusing or explicitly deciding against the existing domain flows.
