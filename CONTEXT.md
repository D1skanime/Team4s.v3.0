# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current slice:** `Phase 40/41 notes + TipTap closure and handoff cleanup`

## Current State

### What Finished In This Pass
- Phase 40 (2026-05-11/12): Markdown-basiertes Text-/Notizsystem für Gruppennotizen, Mitgliedergeschichten, Anime-Projekttexte und Release-Version-Notizen ist technisch verifiziert.
- Phase 41 (UAT passed 2026-05-13): globaler TipTap-Editor arbeitet über alle vier Notizpfade, inklusive erfolgreichem Browser-Save für Gruppennotizen, Anime-Projekttexte und Release-Version-Notizen mit echten Rollen.
- Die aktuelle offene Arbeit ist kein Produkt-Bug, sondern Doku-/Closeout-Sync zwischen Phase 40, Phase 41 und dem bereits vorbereiteten Phase-42-Kontext.

### What Works
- Phase 40 note-system seams are implemented and technically verified across backend, frontend, and tests.
- Phase 41 TipTap integration is live-UAT-green in the main save paths.
- Gruppennotizen können im Browser gespeichert werden.
- Anime-Projekttexte können im Browser gespeichert werden.
- Release-Version-Notizen können für echte Rollen gespeichert werden.
- The Phase-40 role guards and note-scope constraints remain active in the TipTap path.

### What Is Open
- Phase 40 has no dedicated `40-UAT.md`; its remaining gap is documentary because the main live save paths were re-covered by Phase 41 UAT.
- A small optional retest remains if we want explicit closure for delete-flow, sanitizing proof, and member-story live path.
- `42-CONTEXT.md` still describes Phase 41 as not fully green and should be updated before deeper Phase-42 work.
- Cross-AI review still unavailable locally.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Active roadmap phase in practice: `41-globalen-tiptap-rich-text-editor-einfuehren`
- Current plan position: Phase 41 has a passed UAT, while Phase 40 mainly needs closure-sync in the surrounding documents.
- Immediate next step: sync the stale Phase-42 context to the now-green Phase-41 baseline or explicitly record that Phase 40 is covered by Phase 41 UAT except for the small optional retest.

## Key Decisions In Force
- AniSearch owns canonical episode identity; Jellyfin provides media evidence.
- Release-native tables remain the authoritative persistence target for imported episode/version data.
- Fansub links are authored canonically through `fansub_group_links`; fixed URL columns are compatibility projections only.
- Collaboration-member management is explicit and separate from ordinary group profile editing.
- `release_version_groups.fansub_group_id` is the runtime truth; legacy `fansubgroup_id` is cleanup-only.
- Anime and episodes stay neutral; release and group media must stay on their existing release/group seams.
- Phase 40 does not need a second full standalone UAT when Phase 41 has already re-covered the main live save paths; only a small optional addendum remains if we want total documentary closure.
