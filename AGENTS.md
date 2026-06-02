# AGENTS

## Purpose
Shared operating notes for human + AI agents working in `Team4sV3`.

## Current Workflow
- Phase: `v1.1 asset lifecycle hardening`
- Priority: extend the verified release-native fansub baseline without reintroducing legacy slot-specific behavior or attaching media to the wrong domain entity

## Default Workflow
1. Inspect existing code first.
2. Create a short plan.
3. Execute the plan within the requested scope without waiting for extra approval.
4. Run relevant checks.
5. Fix failures.
6. Review your own diff.
7. Continue with the next planned step within the same scope.
8. Stop only when the scope is complete or a real blocker appears.

- Do not stop after writing a plan unless the user explicitly asked for planning only.
- If the task is explicitly marked as GSD/planning-only, do not implement.
- If the task is an implementation task, do not wait after the plan; execute directly within scope.

## Stop Conditions
Stop only for:
- destructive database migrations
- unclear persisted data ownership
- missing credentials
- required external services unavailable
- security-sensitive changes
- schema decisions affecting production data
- commands requiring permissions outside the workspace
- missing or contradictory source-of-truth documents
- any change that could attach release or fansub data to the wrong domain entity

## Project Domain Rules
Use `/docs/architecture/db-schema-fansub-domain.md` as the source of truth if it is present.

Core rules:
- Anime is neutral.
- Episodes are neutral.
- Fansub context belongs to fansub groups, releases, and release versions.
- Anime/fansub assignment is represented by `anime_fansub_groups`.
- `fansub_releases` belong to episodes.
- `release_versions` belong to `fansub_releases`.
- `release_version_groups` connects release versions with fansub groups.
- `release_version_groups.fansub_group_id` is the canonical fansub-group column.
- Do not use or reintroduce legacy `release_version_groups.fansubgroup_id`.
- Release media must not be attached directly to episodes.
- Release-version-scoped process media must use `release_version_media` with `media_assets` and `media_files`, and must be addressed by a real `release_version_id`.
- `release_media` is a separate release-level/public/legacy asset seam and must not be used as a substitute for version-scoped admin/fansub media.
- Group media must use the existing `fansub_group_media`, `media_assets`, and `media_files` structures where applicable.
- Do not invent parallel media logic.
- Before adding any upload flow, upload component, upload hook, or upload endpoint, inspect and reuse the existing upload flows when they fit:
  - `frontend/src/components/admin/MediaUpload.tsx` for fansub/group media.
  - `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` and `useReleaseVersionMedia.ts` for release-version-scoped process media.
  - Anime create/edit upload planning and Jellyfin asset controls for anime media.
  - `frontend/src/lib/api.ts` upload helpers/wrappers for browser upload transport and progress behavior.
- Shared upload UI work may extract small primitives such as dropzone, progress, error, or preview components, but must not merge domain flows or bypass the canonical media tables.
- Do not silently introduce new tables or API contracts without documenting the reason and marking the decision.

## Implementation Reuse And Contract Rules
Use `docs/engineering/implementation-contract.md` as the general implementation workflow guide when it is present.

- Before adding a new component, hook, helper, service, repository method, endpoint, DTO, or workflow-specific utility, search for an existing equivalent or near-equivalent.
- Prefer extending an existing seam over creating a parallel one when the ownership and abstraction still fit.
- Do not duplicate request parsing, response mapping, upload handling, auth/token handling, media ownership logic, release/fansub lookup logic, or UI control logic in a second location.
- If similar code already exists but cannot be reused safely, document why in the plan, summary, or decision artifact.
- GSD plans must include relevant existing analog files in `read_first` before asking executors to build new code.
- New shared helpers are allowed only when they reduce real duplication without crossing domain ownership boundaries.

## API Contract Rules
Use `docs/api/api-contracts.md` as the API contract workflow guide when it is present.

- `shared/contracts/openapi.yaml` is the canonical cross-surface OpenAPI contract.
- `shared/contracts/admin-content.yaml` is the focused admin-content contract where present.
- `frontend/src/types/*` and `frontend/src/lib/api.ts` must match the documented backend contract.
- Before changing an endpoint, request payload, response payload, error shape, auth requirement, frontend API helper, or DTO, inspect the existing contract files and update the relevant contract source in the same change.
- Do not let UI code infer undocumented fields, undocumented status handling, or undocumented fallback behavior from ad hoc `fetch` responses.
- New or changed API behavior must include focused backend and frontend contract coverage where feasible.
- If the runtime contract intentionally differs from a shared contract file, document the reason and add a follow-up or decision entry instead of silently drifting.

## Auth Session Rules
Use `docs/frontend/auth-api-client.md` as the source of truth for browser auth/API boundaries.

- Protected UI must not treat a missing or expired access token as logged-out when a refresh session is still present.
- For protected browser views/actions, gate on an active auth session (`hasAccessToken || hasRefreshToken`) and let the central API client refresh before the request.
- Normal UI code must not call Keycloak refresh helpers directly, read auth cookies/storage directly, or construct bearer headers.
- Any phase that touches protected UI, upload flows, or auth state must include a regression/security check for: access token expired or absent, refresh token valid, protected view/action proceeds through the central refresh seam without showing logged-out UI.
- GSD plans for auth-adjacent work must include this case in the threat model or verification/UAT criteria so `$gsd-secure-phase` and `$gsd-verify-work` can catch regressions.

## Database And Migration Rules
- Never edit old historical migrations unless explicitly instructed.
- Add new migrations for schema changes.
- Keep migration numbering consistent and check for untracked migration files.
- Before creating a migration, inspect current migrations and `git status`.
- If multiple untracked migrations exist, stop and report the migration-chain risk before adding another one.
- Up and down migrations must be reversible where feasible.
- For destructive migrations, add a precondition check where appropriate.
- Do not drop columns or constraints without checking runtime references first.
- Do not proceed with destructive DB changes if data mismatches are detected.
- Document the exact safety SQL or check used before destructive cleanup.

## UI Rules

### Deutsche UI-Texte: Korrekte Umlaute verwenden
- User-facing deutsche Strings (JSX-Text, Button-Labels, Fehlermeldungen, Placeholder, Toast-Nachrichten, aria-labels) verwenden immer korrekte Umlaute: ä, ö, ü, Ä, Ö, Ü, ß
- Niemals ASCII-Ersetzungen in UI-Text: ae/oe/ue/ss statt Umlauten sind verboten (z.B. "wählen" nicht "waehlen", "für" nicht "fuer", "Änderungen" nicht "Aenderungen")
- Code-Bezeichner (Variablennamen, Funktionsnamen, CSS-Klassen, Dateinamen) sind ausgenommen — diese bleiben ASCII-sicher
- Gilt für Frontend TSX/TS und Go Backend Strings die in HTTP-Responses landen

- Avoid overloaded admin screens.
- Use progressive disclosure.
- Prefer accordion or card structures for overview lists.
- Prefer a drawer or side panel for release detail editing.
- Keep loading and error state scoped to the relevant entity.
- Avoid global state for per-anime release data.
- Cache or store releases by a stable anime/fansub context key, preferably `animeFansubGroupId` or equivalent `fansubGroupId:animeId`.
- Prevent race conditions when loading data for expandable lists or drawers.
- Use existing project styling and component patterns.
- Do not perform large unrelated visual redesigns during functional phases.
- Before implementing UI for persisted or API-backed data, map each field to a semantic control. Use `docs/frontend/ui-system.md` and `docs/agent-guidelines-ui.md` as the local source of truth.
- Persisted/domain data must not be represented with placeholder controls: years use a year picker or constrained year control, dates use date controls, enums use select/segmented/radio controls, booleans use switch/checkbox controls, relations use select/combobox controls with labels, media uses the existing media components and ownership-specific APIs.
- If a matching global UI component exists in `frontend/src/components/ui`, use or extend it before creating local page-specific UI.
- See `docs/agent-guidelines-ui.md` for additional local UI guidance, but do not use that document as a substitute for the rules in this file.

### Group Route Ownership
- The canonical internal leader/admin workspace for a fansub group is `/admin/fansubs/[id]/edit`.
- Phase-65 proposal review (`Offene Vorschläge`, confirm/reject actions, review queue UX) belongs in `/admin/fansubs/[id]/edit`, not in `/admin/my-groups/[id]`.
- Do not add or continue leader review/admin behavior in `/admin/my-groups/[id]` unless a later `DECISIONS.md` entry explicitly redefines that route.
- Treat future public/member group pages as a separate, not-yet-defined product surface; do not mix public group presentation with internal review/admin actions.
- When testing leader flows, start from the user-visible route the leader actually reaches in the app shell/profile navigation, not from a hidden direct URL.

## Screenshot-To-UI Rules
When implementing from a screenshot:
- Treat the screenshot as the target, not loose inspiration.
- First extract a visual design specification for layout, card structure, colors, spacing, typography, borders, radius, shadows, buttons, and badges.
- Then implement against that specification.
- Do not freely redesign unless explicitly asked.
- Do not add visible UI elements that are not present in the target unless they are required by existing data or accessibility.
- If possible, compare the result visually and list deviations.

## Live Browser UAT Rules
- For UI/UAT work in Codex Desktop, prefer testing through the Codex in-app browser context whenever user-facing flow, navigation, discoverability, or product fit matters.
- Treat the in-app browser `Current URL` provided in the chat context as shared state: use it to understand where the user is, and do not assume a route is acceptable just because it works in an isolated Playwright or API test.
- Provide clickable local links for the exact route under test so the user can open the same view in the Codex browser.
- Use Playwright/headless checks only as supporting verification; do not let them replace live shared-flow review when the user is actively looking at the app.
- When a feature is reachable only through a hidden or separate route, record that as a UX/routing issue and verify the intended navigation path with the user before marking UAT complete.

## Formatting And Diff Rules
- Keep diffs small and scoped.
- Do not run broad formatting commands on large dirty files unless explicitly requested.
- If a file already has unrelated formatting changes, avoid `prettier --write` on the entire file.
- Prefer targeted edits.
- Do not include unrelated refactors.
- If existing unrelated warnings or errors appear, document them separately.

## Validation
Always run the most relevant available checks:
- `typecheck`
- `lint`
- relevant tests
- `build` if feasible
- migration up/down tests for DB migration tasks
- `git diff --check`

If a check cannot run locally, document why.

## Output Requirements
After editing:
- show the changed sections
- explain what changed
- list files changed
- list checks executed
- list remaining risks or unrelated existing issues
- do not modify unrelated files

## Working Rules
- Keep decisions durable in `DECISIONS.md` when they may be debated again.
- Keep handoff files current at end of day:
  - `DAYLOG.md`
  - `YYYY-MM-DD - day-summary.md`
  - `CONTEXT.md`
  - `WORKING_NOTES.md`
  - `RISKS.md`
  - `TOMORROW.md`
  - `STATUS.md`
- Prefer documented APIs; avoid relying on undocumented behavior.
- For filesystem changes on media hosts, use project-owned controlled automation.

## Quality Bar
- Changes should be reproducible from repo docs.
- Build and test commands in `STATUS.md` must remain valid.
- The first task in `TOMORROW.md` must be concrete and take 15 minutes or less.

## Current Open Thread
- Verify that the Phase-32 fansub release side drawer persists release-theme assets correctly in live use, then choose the next narrow cleanup slice from that verified release-native baseline.
