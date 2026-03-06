# DAYLOG

## 2026-03-06
- Added the public `GET /api/v1/anime/:animeId/group/:groupId/assets` subgroup assets contract/handler.
- Wired `/anime/[id]/group/[groupId]` to the live subgroup asset payload from Jellyfin `Subgroups`.
- Mapped subgroup root artwork to page-level hero data and `Episode N` folders to episode gallery/media sections.
- Split image semantics so:
  - root backdrop drives the page background
  - Episode 1 imagery drives the upper info panel
  - episode-folder backdrops/images stay normal gallery items
- Re-ran `go test ./...`, `npm test`, and `npm run build`.
- Rebuilt `team4sv30-backend` and `team4sv30-frontend` and validated the live route:
  - `http://localhost:8092/api/v1/anime/25/group/301/assets`
  - `http://localhost:3002/anime/25/group/301`

## 2026-03-05
- Verified local VS Code setup for development: user settings, terminal defaults, and extension inventory.
- Confirmed CPU-only terminal setup is consistent with current environment (`terminal.integrated.gpuAcceleration = off`).
- Installed recommended extension baseline: EditorConfig, Prettier, ESLint, GitLens, Code Spell Checker, Jupyter, Ruff.
- Validated Jellyfin API scope via stable OpenAPI: directory browse/validate and library-path management exist, direct media-folder creation endpoint not documented.
- Validated Emby API scope via official REST reference: directory listing/library virtual folder endpoints exist, direct filesystem folder creation endpoint not documented.
- Captured closeout documentation and next-step plan for implementing one-click anime/group asset folder provisioning through project-owned automation.
