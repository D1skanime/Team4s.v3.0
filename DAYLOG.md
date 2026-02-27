# DAYLOG

## 2026-02-27
- Removed the tracked root `.env`, replaced it with `.env.example`, and rewrote the Git history so leaked secrets are no longer present in the normal GitHub commit history.
- Reworked the Admin Anime IA from the old 3-column surface into a step-based flow: `/admin/anime`, `/admin/anime/[id]/edit`, `/admin/anime/[id]/episodes`, `/admin/anime/[id]/episodes/[episodeId]/edit`, and `/admin/anime/[id]/episodes/[episodeId]/versions`.
- Rebuilt the Anime bearbeiten route into a sectioned SaaS-style workspace with a unified header, sticky save bar, advanced developer panel, and restored Jellyfin sync inside a collapsible provider section.
- Repaired the genre suggestion backend path so DB-backed suggestions are reachable through `GET /api/v1/genres?query=...`; backend now returns matching rows, while the browser-side dropdown still needs one final live validation pass.
- Rebuilt and redeployed the local backend/frontend stack; `/health`, `/admin/anime/25/edit`, and the genre API all returned healthy responses.
