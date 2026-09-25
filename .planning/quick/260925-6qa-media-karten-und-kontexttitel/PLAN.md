# Quick Plan

1. Extend the existing release-version media section with an editor-context fallback title.
2. Polish the existing media-card layout: equal-height cards, compact activity metadata, and bottom-aligned preview action.
3. Improve category upload affordances with an active state and descriptive tooltips while preserving existing accessible names and behavior.
4. Add regression coverage for the context-title fallback and run focused frontend checks.
5. Update GSD state, commit atomically, push to `origin main`, and restart the frontend container.

## Acceptance Criteria

- The Media tab displays `Episode 001 · New-Subs v1` for a media item without its own title/caption.
- Existing media titles/captions still win over the fallback.
- No filename or `Asset #...` placeholder is rendered as a gallery title.
- Cards share a stable height and their preview actions align consistently.
- Category buttons remain usable and keep the existing accessible names.
- Focused tests, typecheck, and `git diff --check` pass.

## Read First

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.module.css`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`
