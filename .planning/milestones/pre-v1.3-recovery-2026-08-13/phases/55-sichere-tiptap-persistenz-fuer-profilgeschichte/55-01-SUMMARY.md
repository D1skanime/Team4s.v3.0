---
phase: 55-sichere-tiptap-persistenz-fuer-profilgeschichte
plan: "01"
status: complete
completed: 2026-05-28
requirements:
  - MEMBER-PROFILE-STORY-RICH-TEXT-01
---

# Plan 01 Summary

## Implementiert

- Neue reversible Migration `0078_member_profile_story_tiptap` erweitert `members` um `member_story_json`, `member_story_html`, `member_story_text`, `member_story_editor_type` und `member_story_content_schema_version`.
- Bestehende `member_history_description`-Werte werden schlank in ein minimales TipTap-Dokument und `member_story_text` backfilled; das alte Feld bleibt als Kompatibilitätsfeld erhalten.
- `MemberProfile` und `MemberProfileUpdateInput` tragen den neuen Rich-Text-Contract.
- `PUT /api/v1/me/profile` akzeptiert `member_story_json`, validiert es mit dem vorhandenen `TipTapService`, rendert serverseitig sanitisiertes HTML und extrahiert Plain Text.
- Clientseitig gesendetes `member_story_html` wird abgelehnt; HTML bleibt serverseitige Wahrheit.
- `shared/contracts/openapi.yaml` beschreibt Rich-Text-JSON, serverseitig sanitisiertes HTML und abgeleiteten Plain Text.

## Maßgebliche Dateien

- `database/migrations/0078_member_profile_story_tiptap.up.sql`
- `database/migrations/0078_member_profile_story_tiptap.down.sql`
- `backend/internal/models/member_profile.go`
- `backend/internal/models/optional.go`
- `backend/internal/handlers/app_auth.go`
- `backend/internal/handlers/app_profile.go`
- `backend/internal/handlers/app_auth_test.go`
- `backend/internal/repository/member_profile_repository.go`
- `backend/internal/repository/member_profile_repository_test.go`
- `backend/cmd/server/main.go`
- `shared/contracts/openapi.yaml`

## Checks

- `cd backend && go test ./internal/services` - passed
- `cd backend && go test ./internal/handlers ./internal/repository` - passed

## Offene Punkte

- Frontend muss in Plan 02 noch auf `member_story_json`/`member_story_html` umgestellt werden.
