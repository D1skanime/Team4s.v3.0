# Phase 98: Discussion Log

**Date:** 2026-07-04
**Mode:** `gsd-discuss-phase`
**Outcome:** Context complete, ready for `gsd-plan-phase 98`

## Starting Intent

The user wanted a professional solution for OP/ED/Kara segment playback. The immediate concern was that the existing preview stream can start at a release offset but does not server-side enforce the segment end, which is unsafe for later public playback.

The discussion started with "HLS" as a possible answer, then pivoted after the user clarified that fansub Kara playback with softsub/ASS effects is more important than choosing HLS prematurely.

## Questions And Answers

### 1. Segment Resource Shape

Decision: segment playback must be addressed by segment id. The client should not choose arbitrary release id, start, or end values.

Reason: The browser must not be able to extend a 90-second OP preview into full episode playback by editing query parameters.

### 2. Maximum Segment Length

Decision: automatically derived release/Jellyfin clips have a hard 4-minute maximum.

Reason: OP/ED/Kara segments should not be long enough to substitute for full anime playback.

### 3. Grants

Decision: use short-lived signed grants scoped to one segment. Reuse within a short TTL is allowed for player requests.

Reason: A player may request metadata/ranges/multiple resources, but the grant must not become release-wide access.

### 4. HLS vs Clip Rendering

Decision: do not make HLS the MVP. Prepare normal browser-playable clips first.

Reason: The important requirement is faithful OP/ED/Kara playback, especially ASS/Kara effects. A plain HLS cut can lose or complicate subtitle behavior.

### 5. User Wait Time

Decision: generated clips must be prepared on save/change in the background. First playback should not make users wait for a long transcode.

Reason: The user explicitly rejected a model where viewers wait roughly 120 seconds on first play. Server storage is available, so cached derived clips are acceptable.

### 6. Upload Fallback

Decision: if rendering from the release source is not possible or not desired, admin/fansub users can upload the segment themselves through the existing segment asset flow.

Reason: This is already close to the current model and avoids a new upload/media ownership path.

### 7. Permission Model

Decision: admin and capability-authorized fansub members can manage segment sources/preparation. The implementation must be ready for Rechte-Management.

Reason: Project-role access has been a blocker in the current UAT, so this must not become another hardcoded role shortcut.

### 8. First UI Target

Decision: implement first in the admin/leader segment editor. Public UI follows later.

Reason: Backend must be public-capable, but the current need is for admin/leader workflows and OP/ED/Kara verification.

### 9. Cache Key

Decision: deterministic cache keys are required.

Reason: Prepared clips must be reproducible, invalidated correctly when source/times/profile change, and cleaned up without overwriting unrelated files.

## Locked Product Language

- "Segmentstream" means a safe segment playback layer, not necessarily HLS.
- "Derived clip" means technical cached output and not normal user-managed media.
- "Fallback upload" means existing segment asset/library upload, not a new upload flow.
- "Public-capable" means API/security design should survive later public UI work.

## Risks To Carry Into Planning

- ASS/Kara rendering quality depends on source file, subtitle tracks, fonts, and FFmpeg/libass availability.
- Some release sources may not expose a usable subtitle track; these must become visible errors, not silent fallbacks.
- Uploaded fallbacks longer than 4 minutes are intentionally allowed but should remain clearly curated and permission-gated.
- Cache cleanup must be conservative to avoid deleting unrelated media or active prepared clips.

## Post-Plan Critical Review, 2026-07-05

- Neue Media-Strukturen sind ausdruecklich nicht gewollt: keine neue Upload-Tabelle, kein `release_media`-Shortcut, keine Episode-Media-Abkuerzung fuer Segmentclips oder Fallbacks.
- Subtitle-/Kara-Auswahl bleibt bewusst begrenzt: Phase 98 waehlt automatisch default/forced/erste passende ASS/Sub-Spur, speichert Diagnosen bei Mehrdeutigkeit und baut keine Track-Picker-UI.
- Segmentrechte werden nicht an Rollen hart gekoppelt. Laufzeit-Autorisierung prueft konkrete App-User-Capabilities; Rollen duerfen hoechstens Defaults seeden. Eine Gruppen-/Projektleitung soll entscheiden koennen, welche App-User Segmente erstellen, editieren, loeschen, vorbereiten oder Fallbacks hochladen duerfen.
