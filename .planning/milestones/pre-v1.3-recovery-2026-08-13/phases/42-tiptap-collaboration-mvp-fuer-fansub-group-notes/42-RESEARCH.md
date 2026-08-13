# Phase 42: TipTap Collaboration MVP fuer fansub_group_notes - Research

**Researched:** 2026-05-12
**Domain:** TipTap Collaboration, Yjs document sync, collaborative editor rollout
**Confidence:** High

---

## Source Notes

Primary sources used:
- TipTap Collaboration product page: <https://tiptap.dev/product/collaboration>
- TipTap Collaboration install guide: <https://tiptap.dev/docs/collaboration/getting-started/install>

Key published capabilities from the docs:
- realtime collaborative editing
- shared Yjs document model
- presence concepts such as avatars, cursors, carets and selections
- offline editing and sync
- on-premises / self-hosted deployment support
- document-server auth using JWT
- requirement to disable default undo/redo when using collaboration history
- initial content must be injected once after sync, not on every editor mount
- Hocuspocus is the open source backend path for self-hosted collaboration

---

## Summary

TipTap Collaboration is technically suitable for the Team4s use case where multiple authorized users edit the same official fansub note together. The official docs describe a Yjs-backed shared document model wired into the TipTap Collaboration extension, with a provider that connects to a document server over authenticated realtime connections. For Team4s, the correct path is the self-hosted one: TipTap's own documentation presents Hocuspocus as the open-source backend for collaborative editing, which fits the project's requirement to avoid managed cloud documents.

The main architectural caution for Team4s is not "can TipTap do realtime", but "how do we keep the domain seam clean". The collaboration document must map 1:1 to a specific `fansub_group_notes.id`, and persistence must continue to land in the existing note row instead of inventing a second source of truth. Collaboration state is transport/sync infrastructure; the business record remains the existing note.

---

## Recommendations

### 1. Start with existing notes only

The cleanest MVP is collaboration for already-created `fansub_group_notes` rows.

Why:
- there is already a durable note ID
- document naming can be deterministic
- auth and ownership checks can reuse the existing note and fansub context
- it avoids the ambiguous "collaborate on a note before it exists" seam

Recommended document name pattern:

```text
fansub-group-note:{noteId}
```

Do not use:
- just `fansub:{fansubGroupId}`
- any anime-based key
- any release-based key

Those patterns are too broad or risk wrong-entity coupling.

### 2. Keep collaboration scope limited to `fansub_group_notes`

This object is the best Phase-42 MVP target because:
- it is one official group-level note model
- it has no contributor tuple like `release_version_notes`
- it has no anime-context guard like `anime_fansub_project_notes`
- it is conceptually closer to "shared editorial workspace"

`member_group_stories` is a valid later step, but it is more socially and permission-wise nuanced.

### 3. Preserve existing persistence seam

The app should continue to treat these fields as canonical outputs:
- `body_json`
- `body_html`
- `body_text`

Recommended persistence model for MVP:
- collaboration session edits live in Yjs
- explicit save persists the current collaboration snapshot into `body_json`
- server regenerates `body_html` and `body_text`

This keeps the current backend contract and reduces rollout risk.

### 3.5. Prefer Hocuspocus as the first MVP backend

For Team4s, the self-hosted recommendation should be explicit rather than left open:
- use TipTap collaboration on the client
- use Yjs as the shared document model
- use a self-hosted Hocuspocus WebSocket backend first
- use the already-existing Redis infrastructure as the shared runtime primitive instead of treating Redis as optional

Why this is the best MVP fit:
- it is the documented open-source backend path
- it avoids vendor lock-in at the document transport layer
- it keeps all realtime note traffic inside project-owned infrastructure
- it aligns with the current Team4s stack, which already runs Redis in Docker for backend concerns

### 3.6. Redis should be part of the MVP topology

Because Team4s already operates Redis, the planning baseline should not be "single-process now, Redis maybe later". The better default is:
- Hocuspocus/WebSocket collaboration service
- existing Team4s Redis as shared state/distribution primitive
- Team4s backend/API as the durable save authority

This does not require premature over-engineering, but it avoids planning a throwaway topology that ignores infrastructure the project already owns.

### 4. Disable local undo/redo history in collaboration mode

TipTap's docs explicitly note that the default undo/redo needs to be disabled when collaboration history is used. For Team4s this is important, because a local editor history that ignores shared state could revert another user's work in confusing ways.

### 5. Initialize content only after document sync

TipTap's docs warn that initial content should not be inserted on every editor init in collaboration mode. The correct pattern is to wait until the collaboration document syncs and then set initial content once if the shared document is still empty.

For Team4s this means:
- load saved `body_json`
- seed the collaboration document once
- never blindly call `setContent()` on every mount/re-render

---

## Auth and Access Model

TipTap collaboration transport auth is separate from Team4s business auth.

Team4s still needs an app-side authorization decision such as:
- admin: edit
- fansub lead: edit
- fansub editor: edit
- everyone else: no edit or read-only

Recommended Team4s rule for Phase 42:
- mint a collaboration session token only after app-side authorization succeeds
- embed note identity and role scope in the token claims
- reject document connections if note-to-fansub authorization does not match

This makes the collaboration server a transport layer, not the business authority.

---

## Deployment Decision

Team4s has already made the product decision: self-hosted only.

That means for planning:
- do not design around TipTap Cloud/Platform
- do not require managed documents
- do not defer the hosting choice as an implementation-time decision
- assume project-owned realtime infrastructure from the start

The remaining architecture question is not "cloud vs self-hosted", but "what is the smallest reliable self-hosted topology for the MVP".
With the new project constraint, that topology should assume Redis is available.

---

## Risks

### Primary domain risk

If the document naming scheme is too broad, collaboration edits could attach to the wrong business object. This is the exact class of risk the repo warns about elsewhere.

Mitigation:
- one document per `fansub_group_notes.id`
- app-side authorization before collaboration token issuance
- persistence still writes through the existing note save seam

### Persistence race risk

If Yjs state and database state drift, users may believe content is saved when it only exists in collaboration memory.

Mitigation:
- explicit saved/unsaved state
- clear reconnect/recovery UX
- server-side regenerate `body_html` / `body_text` only on durable save

### Operations risk

Self-hosting removes platform cost but adds runtime ownership.

Mitigation:
- keep the MVP topology small
- start with one collaboration service for group notes only
- add observability and reconnect logging early
- avoid broad multi-document rollout before two-session UAT is stable
- reuse the existing Redis deployment rather than inventing a second coordination layer

### Phase-coupling risk

Phase 41 is not fully UAT-green yet. Starting execution on collaboration too early would stack complexity on top of an unstable editor baseline.

Mitigation:
- allow planning now
- gate implementation on Phase-41 save/render stabilization

---

## Suggested Plan Breakdown

Recommended execution breakdown:

1. Self-hosted architecture and auth seam
2. Frontend collaboration wiring in `fansub_group_notes`
3. Presence/save/recovery UX
4. Two-session self-hosted UAT and ops check

---

## Inferences

These are planning inferences from the official docs plus current Team4s architecture:
- Team4s should begin with explicit-save persistence instead of fully automatic database mirroring.
- `fansub_group_notes` is the safest first collaboration seam.
- Presence list is a better MVP starting point than full cursor polish.
- new note creation should remain non-collaborative until the note row exists and has an ID.
- Hocuspocus is the most natural first backend because it is the documented OSS self-hosted path.
- Redis is already part of the Team4s runtime, so the MVP should plan around using it rather than deferring it.
