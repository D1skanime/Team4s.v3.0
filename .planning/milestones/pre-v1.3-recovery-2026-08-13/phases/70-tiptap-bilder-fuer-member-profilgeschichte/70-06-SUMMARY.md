---
phase: 70-tiptap-bilder-fuer-member-profilgeschichte
plan: "06"
subsystem: backend/handlers + frontend/profile
tags: [idor, cleanup-on-save, lifecycle, story-images, tiptap, upload, frontend, backend]
dependency_graph:
  requires:
    - 70-04 (UploadOwnProfileStoryImage, extractStoryImageIDsFromJSON, cleanupStoryImageAsset)
    - 70-05 (uploadPendingStoryImages, StoryImageExtension, uploadOwnProfileStoryImage in api.ts)
  provides:
    - backend/internal/handlers/app_profile_story_image.go (applyStoryImageLifecycle, ErrIDORViolation)
    - backend/internal/handlers/app_profile.go (IDOR-Check + RenderHTMLWithResolver in UpdateOwnProfile)
    - frontend/src/app/me/profile/page.tsx (pendingImages-State, deferred-Batch-Upload, Rollback-Fehlermeldung)
    - frontend/src/app/me/profile/components/profilePageHelpers.ts (ausgelagerte Hilfsfunktionen)
  affects:
    - backend/internal/handlers/app_profile_story_image_test.go (TestStoryImageRoundTrip, TestStoryImageCleanup ausgefuellt)
    - backend/internal/handlers/app_auth_test.go (profileRepoStub: DeleteStoryImageAsset ergaenzt)
tech_stack:
  added: []
  patterns:
    - IDOR-Batch-Check via GetStoryImageAssetsByMember + O(n)-Lookup in Map (T-70-06-03)
    - Cleanup-on-Save via setDiff(oldIDs, newIDs) + cleanupStoryImageAsset + DeleteStoryImageAsset
    - assetsURLMap als Resolver-Cache fuer RenderHTMLWithResolver (kein zweiter DB-Call)
    - Deferred-Batch-Upload mit uploadPendingStoryImages vor updateOwnProfile (D-06, D-07)
    - Rollback via sequentiellem await + catch (D-06)
key_files:
  created:
    - frontend/src/app/me/profile/components/profilePageHelpers.ts
  modified:
    - backend/internal/handlers/app_profile_story_image.go
    - backend/internal/handlers/app_profile.go
    - backend/internal/handlers/app_profile_story_image_test.go
    - backend/internal/handlers/app_auth_test.go
    - frontend/src/app/me/profile/page.tsx
decisions:
  - "applyStoryImageLifecycle gibt (assetsURLMap, error) zurueck — Resolver-Wiederverwendung ohne zweiten DB-Call"
  - "IDOR-Check und Cleanup-on-Save in app_profile_story_image.go als separate Methode — chirurgischer Einbau in UpdateOwnProfile via zwei Stellen (applyStoryImageLifecycle-Aufruf + RenderHTMLWithResolver)"
  - "prepareMemberStoryRichText und renderMemberStoryRichText erhalten assetsMap-Parameter — minimale Erweiterung statt Umstrukturierung von UpdateOwnProfile"
  - "profilePageHelpers.ts ausgelagert: page.tsx war 462 Zeilen, mit Erweiterungen waeren es ~484 Zeilen (ueber 450-Limit); nach Split: 402 Zeilen"
  - "Migration 0089 in Plan 70-06 erwaehnt — tatsaechliche Story-Image-Migration ist 0090 (owner_member_id auf media_assets); 0089 ist anime_contributions_review_note (kein Bezug); 0090 wird durch Plan 70-02-Checkpoint gehandhabt"
metrics:
  duration: "35min"
  completed_date: "2026-06-03"
  tasks: 2
  files: 7
---

# Phase 70 Plan 06: Save-Flow-Verdrahtung Summary

**One-liner:** Backend UpdateOwnProfile erhaelt IDOR-Check (ErrIDORViolation 422) + Cleanup-on-Save + RenderHTMLWithResolver; Frontend handleSubmit erhaelt deferred-Batch-Upload mit Rollback-Fehlermeldung.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 RED | Failing tests fuer IDOR, RoundTrip, Cleanup | 4c2468cc | app_profile_story_image_test.go, app_auth_test.go |
| 1 GREEN | applyStoryImageLifecycle + RenderHTMLWithResolver in UpdateOwnProfile | 4352e92c | app_profile_story_image.go, app_profile.go |
| 2 | page.tsx pendingImages-State + deferred-Batch-Upload + profilePageHelpers.ts | 929e94fd | page.tsx, profilePageHelpers.ts |

## What Was Built

**app_profile_story_image.go — neue Methode applyStoryImageLifecycle:**
- Signatur: `func (h *AppAuthHandler) applyStoryImageLifecycle(ctx, identity, profile, newBodyJSON) (map[int64]string, error)`
- Schritt 1 IDOR-Check: extractStoryImageIDsFromJSON(newBodyJSON) → newIDs; GetStoryImageAssetsByMember → assets; assetOwnerMap aufbauen; fremde ID → ErrIDORViolation
- Schritt 2 Cleanup-on-Save: oldIDs aus profile.MemberStoryJSON; setDiff(oldIDs, newIDs); fuer jede toDelete-ID: cleanupStoryImageAsset + DeleteStoryImageAsset + Audit-Log (EventType "member_profile.story_image.cleaned_up")
- Rueckgabe assetsURLMap (id→public_url) fuer Resolver-Wiederverwendung
- ErrIDORViolation Sentinel: `errors.New("story-bild gehört nicht diesem profil")`
- assetFilePath Hilfsfunktion (Pfad-Lookup in Assets-Slice)

**app_profile.go — EXAKT ZWEI chirurgische Einbaustellen:**
1. Einbaustelle 1 (nach ValidateJSON-Schritt): applyStoryImageLifecycle-Aufruf; IDOR → 422; interner Fehler → 500
2. Einbaustelle 2 (RenderHTML-Zeile): RenderHTMLWithResolver statt RenderHTML; Resolver nutzt assetsURLMap-Closure
- memberProfileStore um DeleteStoryImageAsset(ctx, assetID, ownerMemberID) erweitert
- prepareMemberStoryRichText + renderMemberStoryRichText erhalten assetsMap-Parameter

**app_profile_story_image_test.go:**
- TestStoryImageRoundTrip: eigene media_asset_id → 200 OK (D-21)
- TestStoryImageCleanup: kein Bild-Node mehr → DeleteStoryImageAsset-Call verifiziert (D-22)
- storyCleanupProfileRepoStub: erweiterter Stub mit konfigurierbaren storyAssets + deleteAssetCalls

**app_auth_test.go:**
- profileRepoStub.DeleteStoryImageAsset ergaenzt (No-op Stub)

**page.tsx (402 Zeilen, war 462):**
- pendingImages Map-State + uploadProgress-State
- handlePendingImageAdded Callback
- handleSubmit: uploadPendingStoryImages vor updateOwnProfile; resolvedStory im Payload; Rollback-Fehlermeldung "Mindestens ein Bild konnte nicht hochgeladen werden. Die Geschichte wurde nicht gespeichert. Bitte erneut versuchen."
- pendingImages.clear() + setUploadProgress(new Map()) im finally
- ProfileStoryCard: onPendingImageAdded + uploadProgress Props

**profilePageHelpers.ts (107 Zeilen, neu):**
- Alle statischen Hilfsfunktionen von page.tsx ausgelagert (richTextFromPlainText, toFormState, emptyFormState, usw.)

## Test-Status

| Test | Status |
|------|--------|
| TestUpdateOwnProfileIDOR | PASS (422 bei fremder media_asset_id) |
| TestStoryImageRoundTrip | PASS (200 OK bei eigener media_asset_id) |
| TestStoryImageCleanup | PASS (DeleteStoryImageAsset aufgerufen) |
| TestStoryImageUploadValidation_GIFRejected | PASS |
| TestStoryImageUploadValidation_TooLarge | PASS |
| TestStoryImageUploadValidation_PixelBomb | PASS |
| TestStoryImageUploadExifStrip | PASS |
| TestStoryImageNoPendingOrphan | PASS |
| go build ./... | PASS |
| npm run typecheck | PASS |
| npm test (Gesamt) | 588 pass (13 vorbestehende Fehler unveraendert) |
| Alle bestehenden Handler-Tests | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] renderMemberStoryRichText-Refactor fuer assetsMap-Propagation**
- **Found during:** Task 1 (Implementierung)
- **Issue:** Der Plan beschrieb "EXAKT ZWEI chirurgische Einbaustellen in UpdateOwnProfile", aber ValidateJSON und RenderHTML stecken in der Hilfsfunktion `renderMemberStoryRichText`, nicht direkt in `UpdateOwnProfile`. Die assetsMap muss durch `prepareMemberStoryRichText` → `renderMemberStoryRichText` propagiert werden.
- **Fix:** `prepareMemberStoryRichText` und `renderMemberStoryRichText` erhalten `assetsMap map[int64]string`-Parameter. In `UpdateOwnProfile` werden exakt zwei Stellen geaendert: (1) applyStoryImageLifecycle-Aufruf vor prepareMemberStoryRichText, (2) RenderHTMLWithResolver in renderMemberStoryRichText. Semantisch korrekte Umsetzung des Plans.
- **Files modified:** app_profile.go
- **Commit:** 4352e92c

**2. [Rule 2 - Missing Critical] profilePageHelpers.ts-Split fuer 450-Zeilen-Limit**
- **Found during:** Task 2 (Zeilen zaehlen)
- **Issue:** page.tsx hatte 462 Zeilen vor den Erweiterungen. Mit ~22 neuen Zeilen wuerde sie 484 Zeilen erreichen (ueber 450-Limit, CLAUDE.md).
- **Fix:** Alle statischen Hilfsfunktionen (richTextFromPlainText, toFormState, emptyFormState, usw.) in `profilePageHelpers.ts` ausgelagert. Ergebnis: page.tsx 402 Zeilen, profilePageHelpers.ts 107 Zeilen.
- **Files modified/created:** page.tsx, profilePageHelpers.ts (neu)
- **Commit:** 929e94fd

### Migrations-Hinweis

Der Plan erwaehnt "Migration 0089" — die tatsaechliche Story-Image-Migration ist jedoch **0090** (`0090_member_story_images.up.sql`). Migration 0089 ist fuer `anime_contributions_review_note`. Die owner_member_id-Migration (0090) wurde in Plan 70-02 per Checkpoint vorbereitet.

## Known Stubs

Keine — alle in Plan 70-06 versprochenen Implementierungen sind vollstaendig.

## Threat Flags

Keine neuen Threat-Surfaces. Alle STRIDE-Threats sind implementiert:
- T-70-06-01 (IDOR): applyStoryImageLifecycle, ErrIDORViolation, 422-Response, TestUpdateOwnProfileIDOR
- T-70-06-02 (Tampering Cleanup): DeleteStoryImageAsset WHERE id AND owner_member_id, cleanupStoryImageAsset mit isUploadPathWithinBase
- T-70-06-03 (DoS N+1): GetStoryImageAssetsByMember laedt alle Assets in einer Query; IDOR-Check ist O(n) Lookup
- T-70-06-04 (Orphan Assets): accept — Orphans werden beim naechsten Save via Cleanup-on-Save bereinigt
- T-70-06-05 (Stored XSS): RenderHTMLWithResolver + bluemonday-Policy (Doppel-Defense)

## Self-Check: PASSED

- [x] app_profile_story_image.go: applyStoryImageLifecycle existiert mit IDOR-Check + Cleanup-on-Save + assetsURLMap-Rueckgabe
- [x] app_profile_story_image.go: ErrIDORViolation definiert ("story-bild gehört nicht diesem profil")
- [x] app_profile.go: DeleteStoryImageAsset im memberProfileStore-Interface
- [x] app_profile.go: applyStoryImageLifecycle-Aufruf in UpdateOwnProfile (Einbaustelle 1)
- [x] app_profile.go: RenderHTMLWithResolver statt RenderHTML (Einbaustelle 2)
- [x] page.tsx: pendingImages Map-State, handlePendingImageAdded, uploadPendingStoryImages in handleSubmit
- [x] page.tsx: Fehlermeldung "Mindestens ein Bild konnte nicht hochgeladen werden..."
- [x] page.tsx: 402 Zeilen (unter 450)
- [x] profilePageHelpers.ts: 107 Zeilen (neu)
- [x] TestUpdateOwnProfileIDOR PASS
- [x] TestStoryImageCleanup PASS
- [x] TestStoryImageRoundTrip PASS
- [x] go build ./... PASS
- [x] npm run typecheck PASS
- [x] 4c2468cc vorhanden (RED-Tests)
- [x] 4352e92c vorhanden (GREEN-Implementierung)
- [x] 929e94fd vorhanden (Frontend)
