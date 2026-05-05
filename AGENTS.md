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
- Release media must use the existing `media_files`, `media_assets`, and `release_media` structures.
- Group media must use the existing `fansub_group_media`, `media_assets`, and `media_files` structures where applicable.
- Do not invent parallel media logic.
- Do not silently introduce new tables or API contracts without documenting the reason and marking the decision.

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
- See `docs/agent-guidelines-ui.md` for additional local UI guidance, but do not use that document as a substitute for the rules in this file.

## Screenshot-To-UI Rules
When implementing from a screenshot:
- Treat the screenshot as the target, not loose inspiration.
- First extract a visual design specification for layout, card structure, colors, spacing, typography, borders, radius, shadows, buttons, and badges.
- Then implement against that specification.
- Do not freely redesign unless explicitly asked.
- Do not add visible UI elements that are not present in the target unless they are required by existing data or accessibility.
- If possible, compare the result visually and list deviations.

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
