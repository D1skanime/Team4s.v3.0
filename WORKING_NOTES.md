# WORKING_NOTES

## Current Workflow Phase
- Phase 55 is complete: profile story persistence is TipTap-contract based, not plain-text-only.
- Phase 56 is complete: shared cropper foundation shipped, UAT passed, security passed.
- Phase 57 is complete at automated-verification level: profile activity periods now persist through year-limited DATE fields; authenticated browser UAT remains pending.
- Phase 54 drawer/header work is complete; its screenshots remain as planning evidence.

## Useful Facts To Keep
- Phase 51 auth truth: `id_token` is only a login/identity artifact; Team4s API bearer must be Keycloak `access_token`.
- API audience is `team4s-api`; frontend client/authorized party is `team4s-frontend`.
- 24h login means refresh/SSO lifetime, not a 24h API access token.
- `release_version_media` is canonical for versioned Admin/Fansub process media.
- Release-version media must be addressed with `release_version_id`, not `release_id`.
- `release_media` remains separate release-level/public/legacy structure and is not a replacement for versioned process media.
- `release_version_groups.fansub_group_id` is canonical; `fansubgroup_id` is gone locally via migration 0057.
- Upload guardrail: reuse existing domain flows before adding a new upload path.
- Phase 55 profile story persistence uses TipTap JSON plus server-rendered sanitized HTML and derived plain text.
- Phase 56 cropper uses `react-easy-crop` behind `Team4sCropper`.
- `Team4sCropper` exports a client-side cropped `File`; it does not upload, authenticate, persist, or know media ownership.
- Avatar crop keeps source original plus cropped display through `uploadOwnProfileAvatar`.
- Fansub group logo crop keeps group media ownership through `MediaUpload` and `uploadFansubMedia`.
- SVG group logos bypass canvas/cropper conversion.
- Profile activity period source of truth is `members.active_from_date` / `members.active_until_date`, normalized to `YYYY-01-01` and constrained to years 1970-2100.
- Legacy `active_from_year` / `active_until_year` remain as deprecated compatibility mirrors only.

## Verification Memory
- Phase 51 live smoke: `/api/v1/me` with access token returned `200`; `/api/v1/me` with ID token returned `401`.
- Phase 52 profile/account-return checks passed during its slice and were exercised during later profile UAT.
- Phase 53 profile/AppShell checks passed.
- Phase 55 backend/frontend/typecheck/security/validation evidence is recorded in Phase 55 artifacts.
- Phase 56 targeted cropper/avatar/media/profile tests passed.
- Phase 56 functional UAT passed on 2026-05-29.
- Phase 56 security review passed with `threats_open: 0`.
- Phase 57 checks passed: `go test ./internal/migrations ./internal/handlers ./internal/repository`, profile page Vitest, frontend typecheck, frontend build, and `git diff --check`.
- Phase 57 global `npm run lint` still fails on unrelated existing files and temporary scripts outside the phase scope.
- Full frontend lint may still have known unrelated warnings outside focused checks.

## Commit Hygiene Notes
- User explicitly asked on 2026-05-29 to commit everything and push.
- In normal future work, keep explicit-path staging for GSD slices.
- Do not use broad formatting on dirty files unless the task explicitly needs it.

## Mental Unload
- Next session should not rediscover Phase 56; it is closed.
- Phase 54-57 are the current closed baseline, with Phase 57 authenticated UAT still pending.
- The safest next task is a short authenticated `/me/profile` UAT pass, then roadmap/status reconciliation and a deliberate next-slice choice.
