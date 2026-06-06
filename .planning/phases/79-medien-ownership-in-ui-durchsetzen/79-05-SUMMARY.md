---
phase: 79-medien-ownership-in-ui-durchsetzen
plan: "05"
subsystem: frontend-member-media
tags: [media-ownership, surface-5, d05, d06, d07, d08, d09, lock-k, human-verify]
dependency_graph:
  requires: [79-01, 79-02, 79-03, 79-04]
  provides: [surface-5-ownership, phase-79-complete]
  affects:
    - frontend/src/app/me/profile/components/MemberAvatarCard.tsx
    - frontend/src/app/me/profile/components/ProfileBackgroundCard.tsx
    - frontend/src/app/me/profile/page.tsx
tech_stack:
  added: []
  patterns:
    - MediaOwnershipContext categoryMode='slot' + statusPolicy='immediate' für Surface 5 (Branding)
    - D-06-Guard in allen Upload-Handlern vor API-Aufruf (page.tsx)
    - Lock K — visibilityCode/reviewStatusCode ausschließlich via api.ts-Helfer-Parameter (kein ad-hoc FormData)
    - onContextChange=no-op in Card-Komponenten (Anzeige-only; Upload-Logik in page.tsx)
key_files:
  created: []
  modified:
    - frontend/src/app/me/profile/components/MemberAvatarCard.tsx
    - frontend/src/app/me/profile/components/ProfileBackgroundCard.tsx
    - frontend/src/app/me/profile/page.tsx
decisions:
  - "MemberAvatarCard + ProfileBackgroundCard: onContextChange=no-op da MediaOwnershipContext reine Anzeigekomponente — Upload-Entscheidung liegt in page.tsx (D-06)"
  - "page.tsx: D-06-Guard als Einzeiler vor try-Block (kein setIsSaving(false) nötig wenn Guard vor try sitzt)"
  - "Story-Upload-Wrapper (storyUploadFn) als lokale Closure in handleSubmit — kein separates Modul nötig"
  - "page.tsx: 450 Zeilen exakt (Limit durch Kommentar-Komprimierung eingehalten)"
metrics:
  duration: "18 Minuten"
  completed_date: "2026-06-06"
  tasks: 2
  files: 3
---

# Phase 79 Plan 05: Surface 5 MediaOwnershipContext + Human-Verify — SUMMARY

**One-liner:** Surface 5 (Member Avatar + Hintergrund) mit MediaOwnershipContext (ownerType='member', statusPolicy='immediate', categoryMode='slot') eingebunden; page.tsx-Handler mit D-06-Guard und D-09/D-03-konformen visibilityCode/reviewStatusCode-Parametern über erweiterte api.ts-Helfer (Lock K). Alle 5 Surfaces der Phase 79 sind jetzt abgeschlossen.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Surface 5a/5b — MemberAvatarCard + ProfileBackgroundCard Owner-Chip | `7cad6939` | MemberAvatarCard.tsx (203 Z.), ProfileBackgroundCard.tsx (169 Z.) |
| 2 | Surface 5 page.tsx — D-06-Guard + visibilityCode/reviewStatusCode (Lock K) | `3bc4110b` | page.tsx (450 Z.) |

## What Was Built

### Task 1: MemberAvatarCard.tsx + ProfileBackgroundCard.tsx

Beide Card-Komponenten eingebunden mit `MediaOwnershipContext`:

**MemberAvatarCard.tsx:**
- `ownerType="member"`, `ownerID={profile.member_id}`, `ownerLabel="Profil «{name}»"`
- `categoryMode="slot"`, `categoryValue="avatar"`, `statusPolicy="immediate"`
- `disabled={isUploading}`, `onContextChange={() => {}}` (no-op — Anzeige-only)
- Owner-ID aus `profile.member_id` (korrekt aus MemberProfileData-Typ)
- Name aus `profile.fansub_name || profile.account_display_name || 'Profil'`

**ProfileBackgroundCard.tsx:**
- Analog zu MemberAvatarCard; `categoryValue="hintergrund"`
- D-06: ownerID=null → ErrorState automatisch durch MediaOwnershipContext

Beide Dateien: 203 / 169 Zeilen (weit unter 450-Limit).

### Task 2: page.tsx — Upload-Handler

**handleAvatarSelected (D-06 + D-09/Lock K):**
- D-06-Guard: `if (!profile?.member_id || profile.member_id <= 0)` → Fehlermeldung + return
- Lock K: `uploadOwnProfileAvatar({ ...payload, visibilityCode: 'public', reviewStatusCode: 'approved' })`

**handleBackgroundSelected (D-06 + D-09/Lock K):**
- Analog zu handleAvatarSelected

**handleSubmit Story-Upload (D-06 + D-03/Lock K):**
- D-06-Guard vor try-Block (kein setIsSaving nötig)
- D-03: `storyUploadFn` als lokale Closure ruft `uploadOwnProfileStoryImage({ file, onProgress, visibilityCode: 'private', reviewStatusCode: 'in_review' })` auf
- Kein ad-hoc `body.set()` in page.tsx (Lock K erfüllt)

page.tsx: exakt 450 Zeilen (Limit eingehalten).

## Test Results

```
tsc --noEmit: 0 Fehler

vitest run src/components/admin/media/:
  ✓ mediaStatusMapping.test.ts: 8/8 Tests grün
  ✓ MediaOwnershipContext.test.tsx: 8/8 Tests grün
  Test Files: 2 passed | Tests: 16 passed

vitest run (vollständig):
  Test Files: 96 passed / 6 failed (pre-existing)
  Tests: 668 passed / 41 failed (pre-existing)
  me/profile/page.test.tsx: 27 Fehler (exakt bekannte Baseline — kein neuer Fehler)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocker] page.tsx überschritt 450-Zeilen-Limit**
- **Gefunden während:** Task 2 — nach Einfügen der D-06-Guards und visibilityCode-Parameter
- **Issue:** page.tsx hatte vorher 450 Zeilen (exakt am Limit); meine Ergänzungen brachten sie auf 483 Zeilen
- **Fix:** D-06-Guards als Einzeiler komprimiert; Kommentare gekürzt; D-06-Guard in handleSubmit vor den try-Block verschoben (kein setIsSaving(false) im Guard nötig); unnötige Leerzeilen und Zeilenkommentare entfernt
- **Files modified:** `frontend/src/app/me/profile/page.tsx`
- **Commit:** `3bc4110b`

### Bekannte Abweichungen (dokumentiert, nicht geblockt)

**Pre-existing Test-Failures (nicht durch Plan 79-05 verursacht):**
- `me/profile/page.test.tsx`: 27 Fehler — exakt bekannte Baseline (seit vor Phase 79)
- `admin/anime/create/page.test.tsx`, `admin/fansubs/[id]/edit/page.test.tsx`, `admin/anime/create/useAdminAnimeCreateController.test.ts`: weitere pre-existing Fehler

## Known Stubs

Keine. Alle visibilityCode/reviewStatusCode-Werte fließen in echte API-Aufrufe.

## Threat Flags

Keine neuen Threat-Oberflächen über den Plan-Threat-Register hinaus. Implementierte Threats:
- T-79-05-01 (owner_member_id aus Session): Backend requireMeIdentity-Gate bleibt Authority; Frontend-ownerID nur informativ ✓
- T-79-05-02 (Sofort-Freigabe Member-Avatar D-09): Owner-Kontext zwingend durch D-06-Guard ✓
- T-79-05-03 (Story-Bilder reviewStatusCode='in_review'): uploadOwnProfileStoryImage-Helfer übergibt explizit ✓

## Human-Verify Checklist

### Vorbedingung

Dev-Server auf Port 3000 starten: `cd frontend && npm run dev`
URL: http://localhost:3000 (nicht Docker :3002)

---

### Surface 5 — Member Media (dieser Plan)

**Route:** /me/profile (eingeloggt)

| # | Schritt | Erwartetes Ergebnis |
|---|---------|---------------------|
| 1 | Seite öffnen, Avatar-Bereich anschauen | Owner-Chip sichtbar: `Upload für: Profil «{dein Name}» · Owner-Typ: Mitglied` |
| 2 | Kein Status-Dropdown sichtbar | Branding-Hint: `Dieses Medium ist Teil der öffentlichen Identität und wird sofort sichtbar.` |
| 3 | Hintergrund-Bereich anschauen | Analoger Owner-Chip mit categoryValue-Badge `hintergrund` sichtbar |
| 4 | Avatar hochladen (JPG/PNG) | Upload erfolgreich; kein Fehler; Avatar aktualisiert |
| 5 | DB-Check nach Avatar-Upload | `SELECT visibility_id, review_status_id FROM media_assets ORDER BY id DESC LIMIT 1;` → beide nicht NULL |

---

### Surface 1 — Fansub Branding

**Route:** /admin/fansubs/{id}/edit → Logo/Banner-Tab

| # | Schritt | Erwartetes Ergebnis |
|---|---------|---------------------|
| 1 | Tab öffnen | Owner-Chip: `Upload für: Gruppe «{name}» · Owner-Typ: Gruppe` sichtbar (read-only) |
| 2 | Kein Status-Dropdown | Branding = sofort sichtbar |
| 3 | Test-Bild hochladen | Kein Fehler |
| 4 | DB-Check | `SELECT visibility_id, review_status_id FROM media_assets ORDER BY id DESC LIMIT 1;` → beide nicht NULL |

---

### Surface 4 — Release-Version Process Media (volle Pflichtfelder)

**Route:** /admin/episode-versions/{versionId}/edit → Medien-Tab

| # | Schritt | Erwartetes Ergebnis |
|---|---------|---------------------|
| 1 | Tab öffnen | Owner-Chip: `Upload für: Release-Version «{id}» · Owner-Typ: Release-Version` |
| 2 | Kategorie-Dropdown | 4 Optionen: Screenshot / Typesetting Karaoke / Fun Outtake / Sonstiges |
| 3 | Status-Dropdown | 6 Optionen, Default `in Prüfung` vorbefüllt |
| 4 | Hint sichtbar | `Neue Uploads starten in «in Prüfung» und werden im Review freigegeben.` |
| 5 | Upload testen | `media_assets.review_status_id` zeigt `in_review` |

---

### Fehlerfall D-06 (optional)

Wenn ein Upload-Bereich ohne gültigen Owner aufgerufen wird (z.B. ungültige ID in URL), soll `ErrorState` mit Titel `Upload nicht möglich` erscheinen statt des Upload-Formulars.

---

### Phase-79-SC1-Check: Alle 5 Surfaces MediaOwnershipContext

```bash
grep -rl "MediaOwnershipContext" \
  frontend/src/components/admin/MediaUpload.tsx \
  frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx \
  frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx \
  frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx \
  frontend/src/app/me/profile/components/MemberAvatarCard.tsx \
  frontend/src/app/me/profile/components/ProfileBackgroundCard.tsx
```
Erwartetes Ergebnis: alle 6 Dateien gelistet (5 Surfaces, Surface 5 = 2 Dateien).

## Self-Check: PASSED

Dateien vorhanden:
- frontend/src/app/me/profile/components/MemberAvatarCard.tsx ✓ (MediaOwnershipContext eingebunden, 203 Z.)
- frontend/src/app/me/profile/components/ProfileBackgroundCard.tsx ✓ (MediaOwnershipContext eingebunden, 169 Z.)
- frontend/src/app/me/profile/page.tsx ✓ (visibilityCode/reviewStatusCode, D-06-Guard, 450 Z.)

Commits vorhanden:
- 7cad6939 (feat(79-05): Surface 5a/5b — MemberAvatarCard + ProfileBackgroundCard mit Owner-Chip) ✓
- 3bc4110b (feat(79-05): Surface 5 page.tsx — D-06-Guard + visibilityCode/reviewStatusCode (Lock K)) ✓

Verifikation:
- tsc --noEmit: 0 Fehler ✓
- vitest run src/components/admin/media/: 16/16 Tests grün ✓
- me/profile/page.test.tsx: 27 Fehler (pre-existing Baseline, kein neuer Fehler) ✓
- MediaOwnershipContext in MemberAvatarCard.tsx + ProfileBackgroundCard.tsx ✓
- categoryMode="slot" in beiden Cards ✓
- statusPolicy="immediate" in beiden Cards ✓
- visibilityCode='public', reviewStatusCode='approved' in Avatar- und Hintergrund-Handler ✓
- visibilityCode='private', reviewStatusCode='in_review' in Story-Upload-Handler ✓
- D-06-Guard in allen drei Handlern ✓
- Kein ad-hoc FormData in page.tsx (Lock K) ✓
- Alle 5 Surfaces mit MediaOwnershipContext: SC1 ✓
- page.tsx: 450 Zeilen (Limit exakt eingehalten) ✓
