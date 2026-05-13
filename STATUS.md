# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Status:** Phase 41 UAT ist grün; Phase-40/41-Dokumentationssync und selektiver Push sind der aktuelle Closeout-Fokus.
- **Current branch:** `main` — selektiver Push für den aktuellen Notiz-/TipTap-Stand läuft.
- **Current focus:** Nur commitwürdige Produktänderungen für Phase 40/41 sauber nach Git bringen und die Handoff-Lage auf den realen UAT-Stand ziehen.

## What Works Now
- Docker frontend is live on `http://127.0.0.1:3002`.
- Backend API is live on `http://127.0.0.1:8092`.
- Phase 40 note-system baseline is implemented and technically verified.
- Phase 41 TipTap baseline passed browser UAT on 2026-05-13.
- Gruppennotizen save works in the browser.
- Anime-Projekttexte save works in the browser.
- Release-Version-Notizen save works in the browser for real assigned roles.
- The backend/frontend note contracts now use the TipTap JSON path instead of only Markdown strings.
- The Phase-40 note guards and role constraints still remain active in the Phase-41 path.

## What Is Not Done Yet
- Phase 40 has no standalone `40-UAT.md`; remaining uncertainty is documentary, not in the main live save paths.
- Optional mini-retest remains if we want explicit proof for delete-flow, sanitizing behavior, and member-story live path.
- `42-CONTEXT.md` still says Phase 41 is not fully green and should be corrected before deeper collaboration follow-through.
- Cross-AI review remains unavailable locally.

## Valid Commands
- `docker compose up -d team4sv30-db team4sv30-redis`
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- `cd backend && go test ./internal/repository ./internal/handlers -run "FansubNotesRepository|AdminContentFansubNotes|ReleaseVersionNotes|ContributorGuardSourceInvariants|AnimeProjectNotes|ProjectNoteSourceInvariants" -count=1`
- `cd backend && go test ./internal/services -run TestMarkdownService -count=1`
- `cd backend && go build ./internal/repository ./internal/handlers`
- `cd frontend && npm run typecheck`
- `cd frontend && npx eslint "src/app/admin/fansubs/[id]/edit/NotesTab.tsx" "src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx" "src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx" "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx" "src/types/fansubNotes.ts" "src/types/releaseVersionNotes.ts" "src/components/editor/RichTextEditor.tsx" "src/components/editor/ColorTokenExtension.ts" --max-warnings 0`
- `cd frontend && npx vitest run "src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx" "src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx" "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx" "src/components/editor/RichTextEditor.test.tsx" "src/components/editor/ColorTokenExtension.test.ts" "src/lib/api.fansubNotes.test.ts" "src/lib/api.releaseVersionNotes.test.ts"`
- `git diff --check`
- `http://127.0.0.1:3002/admin/fansubs/88/edit`
- `http://127.0.0.1:3002/admin/episode-versions/62/edit`

## Verification Evidence
- 2026-05-13: `41-UAT.md` is `passed` with 6/6 tests green.
- 2026-05-13: Browser save of Gruppennotizen passed after API-mapping and UTF-8 decode fixes.
- 2026-05-13: Browser save of Anime-Projekttexte passed after API-mapping and UTF-8 decode fixes.
- 2026-05-13: Browser save of Release-Version-Notizen for real roles passed.
- Phase-40 technical verification remains green; the remaining gap is documented manual-only coverage, not a known mainline save failure.

## Top 3 Next
1. Update the stale Phase-42 context so it reflects that Phase 41 UAT is green.
2. Decide whether to record Phase 40 as covered by Phase 41 UAT or add one explicit mini-UAT addendum for delete/sanitizing/member-story.
3. Pick the next narrow cleanup slice only after the closeout docs match the real verified baseline.

## Risks / Blockers
- The biggest near-term risk is documentary drift between Phase 40, Phase 41, and Phase 42, which can make the next planning step look more blocked than it really is.
- Selective staging discipline still matters because the local worktree contains agent/cache/temp artifacts that do not belong in product history.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
