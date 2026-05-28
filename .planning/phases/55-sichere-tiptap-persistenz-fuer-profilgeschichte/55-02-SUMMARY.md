---
phase: 55-sichere-tiptap-persistenz-fuer-profilgeschichte
plan: "02"
status: complete
completed: 2026-05-28
requirements:
  - MEMBER-PROFILE-STORY-RICH-TEXT-01
---

# Plan 02 Summary

## Implementiert

- Frontend-Typen kennen `member_story_json`, `member_story_html`, `member_story_text`, `member_story_editor_type` und `member_story_content_schema_version`.
- `/me/profile` lädt TipTap JSON als Bearbeitungszustand und nutzt Plain Text nur noch als Fallback für alte Antworten.
- `handleSubmit` sendet `member_story_json` direkt über den bestehenden `updateOwnProfile`-Helper und konvertiert die Profilgeschichte nicht mehr zu Plain Text.
- `ProfileStoryCard` startet im Lesemodus, rendert serverseitig geliefertes `member_story_html` mit `RichTextRenderer` und zeigt Editor/Toolbar erst nach `Bearbeiten`.
- Nach erfolgreichem Speichern synchronisiert die Profilseite die API-Response, setzt Dirty-State zurück und schaltet die Story-Card zurück in den Lesemodus.
- Keycloak-Return-Refresh synchronisiert die Story-Form weiter nur, wenn keine ungespeicherten Änderungen vorhanden sind.

## Maßgebliche Dateien

- `frontend/src/types/profile.ts`
- `frontend/src/app/me/profile/page.tsx`
- `frontend/src/app/me/profile/page.test.tsx`
- `frontend/src/app/me/profile/components/ProfileStoryCard.tsx`
- `frontend/src/app/me/profile/components/profileFormTypes.ts`

## Checks

- `cd frontend && npm run test -- --run "src/app/me/profile/page.test.tsx"` - passed
- `cd frontend && npm run typecheck` - passed

## Offene Punkte

- Live-UAT muss nach Container/App-Start noch H1, Farbe und Tabelle über Save/Reload prüfen.
- Phase 56 Cropper bleibt separat und wurde nicht in diesen Slice gemischt.
