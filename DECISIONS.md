# DECISIONS

## 2026-03-06

### Decision
Use Jellyfin `Subgroups` as the live source for anime-group presentation assets on `/anime/:animeId/group/:groupId`.

### Context
The public group detail page needed real visual and media assets tied to a specific anime/group combination. Release-scoped placeholder flows were not enough for the intended group-detail presentation, and the user already maintains dedicated Jellyfin subgroup folders such as `25_11 eyes_strawhat-subs`.

### Options Considered
- Keep the group page text-first and defer all real assets until an app-owned persistence layer exists
- Read the dedicated Jellyfin subgroup folder now and use it as the source for public group-detail presentation

### Why This Won
The subgroup library already expresses the right editorial grouping: one anime/group root folder plus episode subfolders. Using it now unlocks the intended public experience without inventing temporary duplicate storage.

### Consequences
- The public group-detail route now depends on Jellyfin subgroup discovery/matching
- Group pages can render real backgrounds, galleries, and media tiles immediately
- Contract/documentation hardening is now required because the new payload is live

### Decision
Separate root-folder artwork from episode-folder imagery in the group-detail presentation rules.

### Context
The user clarified that the Jellyfin subgroup root backdrop is page-level presentation, while images inside `Episode N` folders are content assets. Treating them the same would collapse the intended visual hierarchy.

### Options Considered
- Let any discovered backdrop-like image override hero sections heuristically
- Define explicit semantics for root artwork vs episode-folder imagery

### Why This Won
The page structure becomes stable and predictable:
- root backdrop controls the full-page background
- Episode 1 imagery controls the upper info-panel treatment
- episode backdrops/images remain gallery content

### Consequences
- The UI now matches the intended hierarchy more closely
- Episode-folder images are preserved for lightbox/gallery usage instead of being consumed by hero logic
- The Episode 1 info-panel image rule remains a pragmatic convention and may need refinement later

## 2026-03-05

### Decision
Keep VS Code integrated terminal GPU acceleration disabled on this workstation.

### Context
This environment is used against a CPU-only server setup, and terminal rendering stability is prioritized over optional GPU acceleration.

### Options Considered
- Set `terminal.integrated.gpuAcceleration` to `auto`
- Keep `terminal.integrated.gpuAcceleration` set to `off`

### Why This Won
It matches the current infrastructure constraint and avoids graphics acceleration issues that provide no practical benefit for this workflow.

### Consequences
- Terminal remains stable and predictable in this environment
- If workstation hardware/workload changes, this can be revisited

### Decision
Standardize a baseline VS Code extension set for daily development.

### Context
Local setup lacked a clearly documented baseline for formatting, linting, and repository navigation productivity.

### Options Considered
- Keep ad-hoc extension selection per session
- Install and maintain a minimal shared baseline

### Why This Won
A baseline reduces setup drift and makes day-to-day coding behavior more predictable across tasks.

### Consequences
- Installed baseline now includes EditorConfig, Prettier, ESLint, GitLens, Code Spell Checker, Jupyter, and Ruff
- Future onboarding and environment recovery are faster

### Decision
Do not rely on Jellyfin/Emby REST APIs for direct media-folder creation; implement project-owned folder provisioning.

### Context
Requirement: one-click creation of anime/group asset folder structures on server media paths.

### Options Considered
- Use Jellyfin REST API for folder creation
- Use Emby REST API for folder creation
- Implement folder creation in project-owned backend/service/plugin and then refresh library data

### Why This Won
Documented API surfaces support directory browsing/validation and virtual library path management, but not direct filesystem mkdir operations for media roots.

### Consequences
- Requires implementation work in project codebase
- Provides full control over path validation, idempotency, audit logging, and permission handling
- Avoids dependency on undocumented media server behavior
