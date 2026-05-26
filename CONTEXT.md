# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current branch:** `main`
- **Current slice:** Phase 51, Page/Audit cleanup, domain guardrail tests, and the `next/image` test-mock cleanup are committed. Closeout notes are prepared for push.

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
- Domain guardrail tests now protect release-version media ownership seams:
  - Admin fansub release summaries must expose canonical `release_version_id`.
  - Fansub release repository code must use `release_version_groups.fansub_group_id`, not legacy `fansubgroup_id`.
  - Migration 0057 must keep the mismatch safety check before dropping legacy `fansubgroup_id`.
- ROADMAP and STATUS for the audit are synchronized through WP-06/WP-06a.
- Quick task `260526-mhk` fixed the fansub edit test's `next/image` mock by consuming `unoptimized` before rendering a native `img`.

### What Works
- `/api/v1/me` accepts the live Keycloak access token and rejects the live Keycloak ID token.
- The intended 24h login behavior is handled through refresh-token lifetime, while access tokens stay short-lived.
- Release-version media drawer summary uses `release_version_id`, not `release_id`.
- Release drawer detail responses are guarded so an older `getAdminRelease` response cannot overwrite a newer drawer context.
- Theme drawer upload/delete completion is guarded by the current selection and mutation id.
- Existing upload flows are explicitly documented as reusable guardrails for future agents.
- Targeted frontend tests, typecheck, targeted lint, and diff checks passed for today's final slices.
- The focused fansub edit page test now passes without the previous `unoptimized` React DOM warning.
- Quick task commits are `ed0254a9` and `65dfec11`.

### What Is Open
- Phase 51 has no open product gaps.
- The audit is complete enough to close, but follow-up hardening remains valuable:
  - only later consider larger Drawer/Upload/Card UI convergence.
- Next work is open: choose Phase 52 or one more narrow quick task.
- Older unrelated stashes remain from prior work; do not drop them without review.

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
