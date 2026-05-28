---
status: passed
phase: 55-sichere-tiptap-persistenz-fuer-profilgeschichte
reviewed: 2026-05-28
requirements:
  - MEMBER-PROFILE-STORY-RICH-TEXT-01
---

# Phase 55 Security Review

## Findings

- Browser input is TipTap JSON, not HTML. `PUT /api/v1/me/profile` accepts `member_story_json` and rejects `member_story_html`.
- JSON is validated server-side through the existing `backend/internal/services/TipTapService`; no second renderer or sanitizer seam was added.
- HTML is generated server-side with `TipTapService.RenderHTML` and sanitized before persistence.
- Plain text is extracted server-side with `TipTapService.ExtractText` and stored as a compatibility/preview value.
- The UI renders `member_story_html` through `RichTextRenderer`; it does not generate display HTML from the client editor state.
- `/me/profile` still uses the central `frontend/src/lib/api.ts` helpers and `useAuthSession`; no bearer construction, cookie reads, or direct Keycloak refresh logic were added in UI code.
- Protected profile load/save continues to treat `hasAccessToken || hasRefreshToken` as an active session.
- Account-owned identity fields remain read-only and separate from the profile story.

## Threat Coverage

| Threat | Status | Evidence |
| --- | --- | --- |
| Invalid TipTap node/mark tampering | mitigated | Handler and service tests reject unknown nodes/marks. |
| Stored XSS through story HTML | mitigated | Client HTML is rejected; server renders and sanitizes HTML from validated JSON. |
| Rich-text data loss on save | mitigated | Frontend sends `member_story_json`; backend persists JSON/HTML/Text together. |
| Dirty story overwritten on Keycloak return | mitigated | Profile test keeps unsaved story changes during refresh-session account refresh. |
| Auth boundary drift | mitigated | No new protected fetch/token seam introduced. |

## Open Risks

- Live UAT should still confirm browser/editor behavior with the real TipTap toolbar and a migrated database.
- Phase 56 Cropper files in the working tree are unrelated and were not reviewed as part of this security pass.
