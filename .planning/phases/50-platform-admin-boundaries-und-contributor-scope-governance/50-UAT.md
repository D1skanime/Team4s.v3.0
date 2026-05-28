# Phase 50 UAT

---
status: complete
phase: 50-platform-admin-boundaries-und-contributor-scope-governance
updated: 2026-05-28T14:21:23+02:00
---

## Automated UAT

- My Groups route test passes and verifies capability-backed detail links.
- Release-version editor test passes and verifies Media/Assets remains available after permission loading.
- Profile member story now uses the shared `RichTextEditor` instead of a plain textarea.
- Group notes tab no longer renders `Mitgliedergeschichten`.

## Manual UAT

1. Log in as Team4s platform admin and confirm global admin pages still open.
2. Log in as fansub lead/member and confirm `/admin/fansubs` is blocked. **PASS 2026-05-28:** Normaler Member konnte die globale Admin-Fansub-Verwaltung nicht sehen.
3. Open `/manage/groups` as fansub lead/member and confirm only own groups are visible. **PASS 2026-05-28:** Member sieht nur den erlaubten eigenen Gruppenbereich bzw. keine globale Adminliste.
4. Open a scoped release editor URL and confirm only Media/Assets and Notizen/Beiträge are visible. **PASS 2026-05-28:** Scoped Release Editor zeigt für den normalen Member nur erlaubte Bereiche ohne globale Adminfelder.
5. Confirm uploads/notes persist and reload correctly for the scoped release. **PASS 2026-05-28:** Uploads/Notizen speichern und reloaden im erlaubten Kontext korrekt. **Follow-up:** Eigene Uploads können aktuell nicht gelöscht und Texte nicht nachträglich bearbeitet werden; das ist als späterer UX-/Capability-Ausbau festzuhalten.
6. Open `/admin/profile` and confirm `Mitgliedsgeschichte` uses the rich text editor UI, not a plain textarea.
7. Open the group notes area and confirm it only contains group-owned `Gruppennotizen`, not personal `Mitgliedergeschichten`. **SKIPPED 2026-05-28 for normal member live UAT:** Der normale Member erreicht aktuell nur `/admin/my-groups/88`; dort gibt es keine Gruppengeschichte-/Gruppennotizen-Fläche und keine sichtbaren persönlichen `Mitgliedergeschichten`. Die eigentliche NotesTab-Trennung ist durch den automatisierten Test `NotesTab.test.tsx` abgedeckt.

## Issues

### 1. Profile member story was still a plain textarea and group notes still contained member stories

expected: Profile `Mitgliedergeschichte` uses the global TipTap/editor composition; group workspace does not show/edit personal `Mitgliedergeschichten`.
result: issue
reported: "Mitgliedergeschichte wurde noch nicht ins Profil eingebaut und hängt noch unter Gruppengeschichte."
severity: major
root_cause: Phase 50 hardened backend access for member-story group endpoints, but the frontend profile/group UI migration was incomplete.
fix_status: fixed in current workspace
verification:
- `cd frontend && npm run typecheck`
- `cd frontend && npm test -- --run src/app/admin/profile/page.test.tsx src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx`

## Summary

total: 7
passed: 2 automated, 4 manual
issues: 1 found, 1 fixed locally
pending: 0
skipped: 1 manual
blocked: 0

## Gaps

- truth: "Profile Mitgliedergeschichte uses the shared TipTap/editor composition and group notes do not show personal Mitgliedergeschichten."
  status: fixed
  reason: "User reported during UAT that the profile still had a textarea and the member-story section remained in group history."
  severity: major
  test: 6
  root_cause: "Frontend profile/group UI migration was incomplete; backend had only restricted group member-story endpoints."
  artifacts:
    - path: "frontend/src/app/admin/profile/page.tsx"
      issue: "Plain textarea remained for member_story."
    - path: "frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx"
      issue: "Personal member-story section still rendered in group-owned notes UI."
  missing:
    - "Render profile member story through RichTextEditor."
    - "Remove member-story section from group NotesTab."
  debug_session: "inline gsd-verify-work 50"
