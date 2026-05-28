---
status: partial
phase: 53-rollenuebergreifendes-mein-profil-als-member-identity-hub
source:
  - 53-VERIFICATION.md
started: 2026-05-27T16:12:29Z
updated: 2026-05-28T11:56:30.0000000+02:00
---

# Phase 53 Human UAT

## Current Test

number: 3
name: Mobile/accessibility visual pass
expected: |
  Desktop, tablet, and mobile layouts have no overlap; controls are touch-sized; focus states are visible; the crop dialog traps focus and closes with Escape.
awaiting: user response

## Tests

### 1. Live non-admin `/me/profile` route access smoke

expected: A signed-in non-admin user can open `/me/profile` successfully without being blocked or redirected away from the profile route.
result: pass

### 2. Live avatar crop/upload smoke

expected: JPG/PNG/WEBP avatar upload opens the crop dialog, supports pointer and keyboard interaction, displays the cropped image, rejects SVG, and never exposes `source_original` as the public avatar URL.
result: issue
reported: "Avatar crop UI should remove the separate right-side preview circles because the main crop box already shows the round selected area; remove the helper text 'Das Original bleibt intern erhalten; angezeigt wird nur der runde Zuschnitt.' during the fix; at low zoom the image cannot be moved further even though there is still visual room above and below for the circle crop. Even at higher zoom the image cannot be moved left/right with mouse or touchscreen. Panning must work freely in all directions at every zoom level until the image edge touches the circular crop boundary. Attempting to save the avatar showed 'Anmeldung erforderlich. Bitte zuerst einen gültigen Login aufbauen.' even though the user had recently logged in and expects the session to remain valid for 24 hours. After a later successful save, the profile image card shows the uploaded crop and 'Profil wurde gespeichert.', but the large circle avatar in the header still shows the fallback initial instead of the new image. The profile helper text 'JPG, PNG oder WEBP bis zum bestehenden serverseitigen Bildlimit von 50 MB. SVG und ungültige Bilder werden serverseitig abgelehnt.' is too technical/admin-oriented for member profile UX and should be simplified. The hero description 'Deine Team4s-Identität, Fansub-Geschichte, Mitgliedschaften und Beiträge an einem rollenneutralen Ort.' should be removed. After upload, there is no way to edit/re-crop the already uploaded image later."
severity: blocker
fix_progress: "Code fix applied for remaining avatar crop blockers: panning bounds now allow movement until the image edge reaches the crop circle, and existing avatars can be loaded from retained source_original for re-cropping through the same upload endpoint. Header/Hero global UI alignment is intentionally deferred until UAT is through."
follow_up: "Retest after the export-geometry fix still shows the same preview-vs-saved crop mismatch. Decision: stop patching the in-house cropper and create a new phase for a global cropper built on a maintained modern library; apply it to both own-profile avatar cropping and fansub group media/logo cropping."

### 3. Mobile/accessibility visual pass

expected: Desktop, tablet, and mobile layouts have no overlap; controls are touch-sized; focus states are visible; the crop dialog traps focus and closes with Escape.
result: issue
reported: "Header action buttons are visually shifted, especially 'Öffentliches Profil ansehen' and 'Profil speichern'. The activity fields around 'Aktiv seit', 'Aktiv bis', and 'Aktuell aktiv' are also visually shifted."
severity: major
fix_progress: "Code fix applied: header action buttons align at the top despite deferred public-profile helper text; activity year fields are grouped in a dedicated two-column year grid and the current-active checkbox spans the row."
follow_up: "Additional UAT 3 content/UX issues captured for a follow-up phase: remove visible internal/admin helper texts ('Fehlende oder unklare Sichtbarkeit...', TipTap/plain-text defer, Basisdaten/Keycloak contract text, Mitgliedschaften description, Account read-only text); remove or redesign unclear hero badges including member/name/dirty badges; clarify Fansub-Name vs Anzeigename; hide or explain Plattformrollen when none are meaningful; simplify membership cards because group logo is missing, duplicated 'Aktiv' status appears, 'Fansub Lead' is unclear, and 'Gruppenbereich' is too weak as navigation; consider global table-style UI for memberships; replace 'Meine Beiträge' credit aggregate with 'Letzte Aktivitäten' showing latest media uploads and texts/notes the user wrote, backed by a new contract; keep memberships compact on the main page while future detail/drawer direction should be 'Meine Medien'/'Meine Aktivität' rather than duplicating 'Meine Gruppen'. Immediate copy fix applied: visible Keycloak/read-only wording was removed from the Account card and CTA, replacing it with neutral account-management wording."

### 4. Live Keycloak account-return flow

expected: Opening Keycloak account management in a new tab and returning to Team4s refreshes read-only account cards without overwriting dirty Team4s profile fields.
result: pending

## Focus Notes

- Check avatar crop preview fidelity on narrow mobile widths; the code-only UI audit warned that fixed crop metrics and responsive viewport size could diverge.
- Check year-field error accessibility with keyboard and screen-reader-style focus flow.
- Check the disabled membership `Gruppenbereich` action has an understandable reason or is not confusing in live use.

## Summary

total: 4
passed: 1
issues: 1
pending: 2
skipped: 0
blocked: 0

## Gaps

- truth: "JPG/PNG/WEBP avatar upload opens the crop dialog, supports pointer and keyboard/touch interaction, displays the cropped image, rejects SVG, and saves successfully for a recently logged-in user."
  status: failed
  reason: "User reported: remove the separate preview circles because the main crop box is clear enough; remove the helper text 'Das Original bleibt intern erhalten; angezeigt wird nur der runde Zuschnitt.' during the fix; low-zoom panning stops despite remaining visual room above and below for the circular crop; higher-zoom panning cannot move left/right with mouse or touchscreen; panning must work freely in all directions at every zoom level until the image edge touches the circular crop boundary; saving the avatar reports 'Anmeldung erforderlich. Bitte zuerst einen gültigen Login aufbauen.' despite a recent login and expected 24-hour session; after a later successful save, the profile image card shows the uploaded crop and success message, but the header circle avatar still shows the fallback initial instead of the new image; simplify the technical profile helper text 'JPG, PNG oder WEBP bis zum bestehenden serverseitigen Bildlimit von 50 MB. SVG und ungültige Bilder werden serverseitig abgelehnt.' for member-facing UX; remove the hero description 'Deine Team4s-Identität, Fansub-Geschichte, Mitgliedschaften und Beiträge an einem rollenneutralen Ort.'; add a way to edit/re-crop the already uploaded image later."
  severity: blocker
  test: 2
  artifacts:
    - frontend/src/app/me/profile/page.tsx
    - frontend/src/app/me/profile/components/MemberProfileHero.tsx
    - frontend/src/app/me/profile/components/MemberAvatarCard.tsx
    - frontend/src/components/media/crop/AvatarCropDialog.tsx
    - frontend/src/components/media/crop/mediaCropMath.ts
    - backend/internal/repository/member_profile_repository.go
    - shared/contracts/openapi.yaml
  missing:
    - "Retest Test 2 on deployed Docker build."
