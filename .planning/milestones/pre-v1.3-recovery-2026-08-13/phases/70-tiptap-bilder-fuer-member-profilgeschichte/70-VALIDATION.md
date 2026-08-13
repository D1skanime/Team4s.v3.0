---
phase: 70
slug: tiptap-bilder-fuer-member-profilgeschichte
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-02
---

# Phase 70 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Abgeleitet aus 70-RESEARCH.md "## Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Backend)** | `github.com/stretchr/testify` v1.9.0 (`go test`) |
| **Framework (Frontend)** | Vitest 3 |
| **Config file (Backend)** | keine separate Datei — `go test ./...` |
| **Config file (Frontend)** | `frontend/vitest.config.ts` |
| **Quick run command** | `go test ./internal/services/... ./internal/handlers/... -run StoryImage -count=1` (Backend) · `npm test -- --run storyImage` (Frontend) |
| **Full suite command** | `go test ./... -count=1 && npm test` |
| **Estimated runtime** | ~60–120 Sekunden (Backend Full + Frontend) |

---

## Sampling Rate

- **After every task commit:** Run `go test ./internal/services/... ./internal/handlers/... -run StoryImage -count=1`
- **After every plan wave:** Run `go test ./... -count=1 && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Req Ref | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|----------|-----------|-------------------|-------------|--------|
| D-01/D-20 | Image-Node speichert nur `media_asset_id`; Renderer loest `/media`-URL serverseitig auf | unit | `go test ./internal/services/... -run TestTipTap.*Image -count=1` | ❌ W0 | ⬜ pending |
| D-03/D-23 | IDOR-Check: fremde `media_asset_id` beim Save abgelehnt | unit/integration | `go test ./internal/handlers/... -run TestUpdateOwnProfile.*IDOR -count=1` | ❌ W0 | ⬜ pending |
| D-20/D-23 | Sanitizing: manipuliertes Client-HTML / fremde `src` / `<script>` werden verworfen | unit | `go test ./internal/services/... -run TestTipTap.*Sanitize.*Image -count=1` | ❌ W0 | ⬜ pending |
| D-21 | Round-Trip: Insert, Save, Reload → `media_asset_id`, `width_percent`, `alignment` erhalten | integration | `go test ./internal/handlers/... -run TestStoryImageRoundTrip -count=1` | ❌ W0 | ⬜ pending |
| D-22 | Cleanup-on-Save: Bild entfernt + gespeichert → Datei + DB-Zeile physisch weg, verbleibende unberuehrt | integration | `go test ./internal/handlers/... -run TestStoryImageCleanup -count=1` | ❌ W0 | ⬜ pending |
| D-16/D-17 | GIF abgelehnt, Dateien >10MB abgelehnt; nur JPG/PNG/WebP | unit | `go test ./internal/handlers/... -run TestStoryImageUpload.*Validation -count=1` | ❌ W0 | ⬜ pending |
| D-19 | EXIF-Strip: hochgeladenes JPEG ohne EXIF-APP1-Marker (0xFFE1) in gespeicherter Datei; Behavior-Assert via bytes.Index auf Output-File | unit | `go test ./internal/handlers/... -run TestStoryImageUpload.*ExifStrip -count=1` | ❌ W0 | ⬜ pending |
| D-14 | Kein Upload-API-Call fuer pending_key-Nodes die vor Save aus dem Editor entfernt wurden; uploadFn-Call-Count = 0 fuer entfernte Bilder | unit | `go test ./internal/handlers/... -run TestStoryImageNoPendingOrphan -count=1` (Backend) · `npm test -- --run storyImageUpload.*noPending` (Frontend) | ❌ W0 | ⬜ pending |
| D-24 | Public-Profil (Phase 59) rendert `body_html` mit Image korrekt + sanitisiert | smoke/manual | Manuell: `GET /api/v1/members/{slug}/profile` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/services/tiptap_service_test.go` erweitern — Image-Node-Faelle (ValidateJSON, RenderHTML inkl. URL-Resolver, ExtractText)
- [ ] `backend/internal/handlers/app_profile_story_image_test.go` — Upload + Cleanup-on-Save + IDOR + MIME/Size/EXIF-Tests + D-14 (TestStoryImageNoPendingOrphan)
- [ ] `frontend/src/components/editor/StoryImageExtension.test.ts` — Attribut-Serialisierung (`media_asset_id`, `width_percent`, `alignment`), `pending_key`-Bereinigung
- [ ] `frontend/src/lib/storyImageUpload.test.ts` — `uploadPendingStoryImages`-Logik (Marker→ID-Tausch, Referenz-Diff, D-14 kein Upload fuer entfernte Nodes)

---

## Manual-Only Verifications

| Behavior | Req Ref | Why Manual | Test Instructions |
|----------|---------|------------|-------------------|
| Public-Profil-Bilddarstellung | D-24 | Cross-Surface-Rendering (Phase 59) ueber serverseitiges `body_html`; visuell zu bestaetigen | Story mit Bild speichern → oeffentliches Member-Profil aufrufen → Bild erscheint korrekt, sanitisiert, mit %-Breite + Ausrichtung |
| In-Editor-Resize/Align (NodeView) | D-09/D-10 | Drag-Interaktion + visuelle %-Breite/Ausrichtung im Browser nicht headless pruefbar | Bild einfuegen → Ziehgriff zieht Breite → Ausrichtung links/Mitte/rechts → Save/Reload behaelt Werte (D-21) |
| /me/profile Lesemodus Bilddarstellung | D-12 | Serverseitiges body_html-Rendering im eingeloggten Lesemodus; visuell + API-Response pruefen | Story mit Bild speichern → /me/profile als eingeloggter Member → Bild erscheint mit richtiger Breite/Ausrichtung; GET /api/v1/me/profile → member_story_html enthaelt img-Tag |
| Upload-Fehler-Atomizitaet | D-06/D-07 | Browser-DevTools-Simulation (Block request URL) nicht automatisierbar im CI | Bild-Endpunkt blockieren → Speichern → Fehlermeldung "Mindestens ein Bild konnte nicht hochgeladen werden..." pruefen; GET /api/v1/me/profile bestaetigt kein partielles body_json persistiert |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
