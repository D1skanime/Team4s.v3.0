# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** v1.1 asset lifecycle hardening
- **Current slice:** Anime create UX/UI follow-through is complete and ready for normal operator testing.

## Current State

### What Finished Today
- `/admin/anime/create` was polished to the reference-driven layout for AniSearch, Jellyfin, assets, and metadata.
- The temporary AniSearch technical status block was removed from the operator UI.
- Jellyfin-linked anime now expose a readonly `Ordnerpfad` field in Basisdaten so the connected folder is visible.
- The Details area now keeps Basisdaten, Jahr, Episoden, DE/EN titles, and folder path in one card instead of splitting them across two cards.
- Section 2 assets now use reference-style primary cards for Cover, Banner, and Logo, plus a separated background grid with source badges and image-overlay remove buttons.
- Background videos are now additive in create: multiple staged videos can be uploaded and linked, and the runtime backdrop manifest can resolve multiple theme videos.
- Background-video cards were reduced into a compact 2-column grid inside the primary asset width.
- Online asset search presentation was cleaned up so cover/dialog candidates hide internal IDs and show source/preview metadata more usefully.
- Docker was rebuilt and redeployed for testing on the local stack.

### What Works
- Docker frontend is available at `http://127.0.0.1:3002`.
- Backend API is available at `http://127.0.0.1:8092`.
- Anime create can combine AniSearch metadata, Jellyfin folder/assets, online provider assets, manual uploads, multiple backgrounds, and multiple background videos.
- Provider-selected create assets flow through the shared upload/link seam and retain useful provenance where provider identity is available.
- AniSearch duplicate/error feedback remains visible, but non-actionable draft diagnostics are hidden.
- The asset UI shows sources such as Jellyfin, TMDB, Zerochan, Fanart.tv, Konachan, Safebooru, and Manuell directly on cards.
- Tags, genres, relations, and prior Phase-13/14/15 create behaviors remain part of the baseline.

### What Is Open
- No known product blocker remains for Anime Create.
- A short human browser pass is still useful after push to confirm the final visual density and create/delete cleanup with real operator eyes.
- Cross-AI review is still unavailable without an independent reviewer CLI.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Verified/executed phases on `main`: `06`, `07`, `10`, `12`, `13`, `14`, `15`, `16`, `17`
- Current result: Anime Create is closed for this UX/UI follow-through slice.
- Next required step: pick the next narrow v1.1 slice after one quick human smoke of the pushed create page.

## Key Decisions In Force
- Anime-first and V2-first remains the current execution scope.
- Manual create/edit/delete flows must use the same generic upload seam rather than slot-specific legacy endpoints.
- Provider-selected create assets should keep using the authoritative create/upload/link seam instead of a second persistence channel.
- Backgrounds remain additive image galleries.
- Background videos are additive in create and linked through the plural admin route.
- AniSearch technical draft diagnostics stay hidden from the operator UI; actionable conflict/error states remain visible.
- The Jellyfin folder link is shown as readonly `Ordnerpfad` metadata.
- `Team4s` is the canonical local Git repo; do not resume work in the old `Team4sV2` recovery workspace.

## Quality Bar
- Keep build/test commands in `STATUS.md` runnable on both Docker and local-dev paths.
- First task tomorrow must be concrete and under 15 minutes.
- Any new asset or metadata work should extend the current V2/admin contracts instead of reviving legacy slot-specific paths.
