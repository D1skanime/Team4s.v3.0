---
phase: 42-tiptap-collaboration-mvp-fuer-fansub-group-notes
verified: 2026-06-21
status: parked_deferred
re_verification: true
source:
  - 42-CONTEXT.md
  - 42-RESEARCH.md
  - 42-01-PLAN.md
  - .planning/ROADMAP.md
  - .planning/STATE.md
---

# Phase 42 Verification

Result: PARKED / NOT COMPLETE. Phase 42 remains a deferred collaboration gap, not an implemented feature.

## Verification Scope

This was a control pass, not an implementation run. The old Phase 42 plan was checked against the current codebase after later auth, permissions, note, route, and fansub-domain changes.

The normal `$gsd-verify-work` path cannot derive runtime UAT from Phase 42 because the phase directory has no `42-*-SUMMARY.md`; there is no recorded implementation summary for a TipTap collaboration MVP.

## Evidence Checked

- `.planning/ROADMAP.md` already records Phase 42 as planned/deferred with no runtime evidence for collaboration provider, Yjs document scope, presence, or multi-session collaboration.
- `.planning/STATE.md` records the historical reconcile: Phases 41 and 43-46 were retro-closed, while Phase 42 remained planned/deferred.
- `frontend/package.json` contains the current TipTap editor packages, but no `@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-cursor`, `yjs`, `y-websocket`, or Hocuspocus client dependency.
- `frontend/src/components/editor/RichTextEditor.tsx` is still a local TipTap editor using `StarterKit`, local undo/redo buttons, `onUpdate`, and `setContent` on external value changes. There is no collaboration provider, Yjs document, awareness, presence, or note-scoped collaboration mode.
- `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx` still edits group notes through ordinary create/update/delete API calls. It does not branch existing notes into a collaboration session.
- `backend/internal/handlers/admin_content_fansub_group_notes.go` keeps durable persistence on `fansub_group_notes.body_json`, regenerates `body_html` and `body_text`, and checks `fansub_group.notes.write` via the current permission service. There is no collaboration-token route, WebSocket handoff, document auth seam, or Hocuspocus persistence hook.
- `docker-compose.yml` still provides `team4sv30-redis`, so the old self-hosted Redis assumption remains technically available.

## Criteria Result

| Phase 42 criterion | Current result |
|---|---|
| Collaboration only for `fansub_group_notes` | Not implemented. Existing non-collaborative group-note editing remains scoped correctly. |
| Stable document ID bound to `fansub_group_notes.id` | Not implemented. No `fansub-group-note:{noteId}` runtime contract found. |
| Multiple authorized users edit one note simultaneously | Not implemented. No realtime provider/server/client path found. |
| Presence basis visible | Not implemented. |
| Persistence remains `fansub_group_notes.body_json` -> `body_html` / `body_text` | Existing ordinary save path passes this criterion. |
| Initial content seeded exactly once per collaboration document | Not applicable; no collaboration document exists. Current editor still calls `setContent` for external value changes. |
| Collaboration-safe undo/redo | Not implemented. Current editor still exposes local undo/redo via StarterKit history. |
| Explicit access model | Partially satisfied by the later capability-based `fansub_group.notes.write` check for ordinary note CRUD. Collaboration-specific token/session access is not implemented. |
| Two-session browser UAT | Not possible; feature absent. |
| Self-hosted/on-prem path, no managed cloud | Still the correct requirement if Phase 42 is revived; Redis remains present. No self-hosted collaboration service exists today. |

## Current Interpretation

Phase 42 should not be marked feature-complete. `42-01-PLAN.md` has been administratively parked by `42-01-SUMMARY.md`, but it is not safe to execute unchanged as a current implementation plan because several foundations changed after 2026-05-12:

- Auth and permissions are now capability-driven and must use the current `permissions.Service` / central browser API seams.
- The old Admin-only comment in the notes handler is outdated; runtime access is now scoped by `ActionFansubGroupNotesWrite`.
- Later work separated contributor/admin surfaces and hardened domain ownership; a revived collaboration plan must keep `/admin/fansubs/[id]/edit` as the canonical internal group workspace.
- Phase 81 removed release collaboration-group modeling assumptions from nearby domain code. That does not directly invalidate group-note collaboration, but it makes the word "collaboration" overloaded and a fresh plan must distinguish realtime editor collaboration from fansub/release group collaboration.
- TipTap/Hocuspocus package choices and hosting details should be rechecked before implementation rather than copied from the May research verbatim.

## Recommendation

Keep Phase 42 as a parked deferred gap, not a blocker for the current release-native / fansubber-workspace baseline.

If realtime collaborative group-note editing becomes a near-term product priority, do not run the old plan directly. Start a fresh narrow plan that reuses the surviving decisions:

- scope only `fansub_group_notes`
- require an existing note ID
- document ID pattern remains note-scoped
- self-hosted only
- Redis may be reused
- durable save authority remains the existing `fansub_group_notes` update path

The fresh plan must re-read current auth/API/client contracts and define the current WebSocket/token/persistence seam before code changes.

## Status Decision

Phase 42 is verified as parked/deferred. No product code was changed during this pass.
