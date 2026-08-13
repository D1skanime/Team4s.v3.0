---
phase: 79
slug: medien-ownership-in-ui-durchsetzen
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-06
---

# Phase 79 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Frontend)** | Vitest 3 |
| **Config file** | `frontend/vitest.config.ts` |
| **Framework (Backend)** | go test |
| **Quick run command** | `cd frontend && npx vitest run src/components/admin/media/ --reporter=verbose` |
| **Full suite command (Frontend)** | `cd frontend && npx vitest run` |
| **Full suite command (Backend)** | `cd backend && go test ./...` |
| **Estimated runtime (quick)** | ~10–20 Sekunden |
| **Estimated runtime (full)** | ~60–90 Sekunden |

---

## Sampling Rate

- **Nach jedem Task-Commit:** `cd frontend && npx vitest run src/components/admin/media/ --reporter=verbose`
- **Nach jeder Plan-Wave:** `cd frontend && npx vitest run` + `cd backend && go test ./...`
- **Vor `/gsd:verify-work`:** Full suite muss grün sein
- **Max Feedback-Latenz:** ~20 Sekunden (Quick-Run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Sicheres Verhalten | Test-Typ | Automatisierter Befehl | Datei vorhanden | Status |
|---------|------|------|-------------|------------|-------------------|---------|----------------------|-----------------|--------|
| 79-01-RED | 01 | 1 | G, K | T-79-01-01 | STATUS_LABEL_MAPPING deckt alle 6 Labels vollständig ab; kein Label ohne Mapping | unit | `cd frontend && npx vitest run src/components/admin/media/ --reporter=verbose` | ❌ Wave 0 | ⬜ pending |
| 79-01-GREEN | 01 | 1 | G, I, K | T-79-01-02, T-79-01-03 | ownerID=null → ownerResolved=false + ErrorState; statusPolicy='immediate' → public/approved ohne Dropdown | unit | `cd frontend && npx vitest run src/components/admin/media/ --reporter=verbose` | ❌ Wave 0 | ⬜ pending |
| 79-02-T1 | 02 | 1 | G, K | T-79-02-01 | openapi.yaml Upload-Schemas enthalten visibility_code + review_status_code (alle 5 Surfaces inkl. Member-Media) | static | `cd backend && go build ./... 2>&1 \| head -20` | ✅ (bestehende Dateien) | ⬜ pending |
| 79-02-T2 | 02 | 1 | G, K | T-79-02-01, T-79-02-04, T-79-02-05 | Backend-Handler setzen korrekte Defaults; ungültige Codes → 400; owner_member_id aus Session (Lock I) | build | `cd backend && go build ./... 2>&1 \| head -30` | ✅ (bestehende Dateien) | ⬜ pending |
| 79-02-T3 | 02 | 1 | K | T-79-02-01 | api.ts Helfer-Interfaces enthalten visibilityCode?/reviewStatusCode? für alle 5 Surfaces | static | `cd frontend && npx tsc --noEmit 2>&1 \| head -30` | ✅ (bestehende Datei) | ⬜ pending |
| 79-03-T1 | 03 | 2 | G, K | — | MediaUpload.tsx ≤ 450 Zeilen; MediaUploadCore.tsx existiert; TypeScript ok | static | `cd frontend && npx tsc --noEmit 2>&1 \| head -20 && wc -l src/components/admin/MediaUpload.tsx` | ✅ (bestehende Datei) | ⬜ pending |
| 79-03-T2 | 03 | 2 | G, I, K | T-79-03-01, T-79-03-02 | MediaUpload.tsx rendert MediaOwnershipContext; submitUpload prüft ownerResolved; visibilityCode/reviewStatusCode an uploadFansubMedia | unit + static | `cd frontend && npx tsc --noEmit 2>&1 \| head -20 && npx vitest run src/components/admin/media/ --reporter=verbose 2>&1 \| tail -20` | ❌ Wave 0 | ⬜ pending |
| 79-03-T3 | 03 | 2 | G, I, K | T-79-03-02, T-79-03-03 | ReleaseThemeAssetsSection.tsx kein natives select; MediaOwnershipContext eingebunden; handleUpload prüft ownerResolved | static | `cd frontend && npx tsc --noEmit 2>&1 \| head -20` | ✅ (bestehende Datei) | ⬜ pending |
| 79-04-T1 | 04 | 2 | G, K | — | useReleaseVersionMedia.ts startUpload-Signatur hat visibilityCode?/reviewStatusCode?; TypeScript ok | static | `cd frontend && npx tsc --noEmit 2>&1 \| head -20` | ✅ (bestehende Datei) | ⬜ pending |
| 79-04-T2 | 04 | 2 | G, I, K | T-79-04-02, T-79-04-04 | ReleaseVersionMediaSection.tsx ≤ 450 Zeilen; MediaOwnershipContext mit categoryMode='dropdown'; handleUploadClick prüft ownerResolved | static | `cd frontend && npx tsc --noEmit 2>&1 \| head -20 && wc -l src/app/admin/episode-versions/*/edit/ReleaseVersionMediaSection.tsx` | ✅ (bestehende Datei) | ⬜ pending |
| 79-04-T3 | 04 | 2 | G, I | T-79-04-03 | AnimeJellyfinAssetUploadControls.tsx rendert MediaOwnershipContext mit ownerType='anime', statusPolicy='immediate'; Upload-Handler prüfen ownerResolved | static + unit | `cd frontend && npx tsc --noEmit 2>&1 \| head -20 && npx vitest run src/components/admin/media/ --reporter=verbose 2>&1 \| tail -10` | ✅ (bestehende Datei) | ⬜ pending |
| 79-05-T1 | 05 | 3 | G, I, K | T-79-05-01 | MemberAvatarCard + ProfileBackgroundCard rendern MediaOwnershipContext; onContextChange=no-op; ownerID=null → ErrorState | static | `cd frontend && npx tsc --noEmit 2>&1 \| head -20` | ✅ (bestehende Dateien) | ⬜ pending |
| 79-05-T2 | 05 | 3 | G, I, K | T-79-05-01, T-79-05-03 | page.tsx ruft erweiterte Helfer mit visibilityCode/reviewStatusCode auf; D-06-Guard in page.tsx; kein ad-hoc FormData | static + unit | `cd frontend && npx tsc --noEmit 2>&1 \| head -20 && npx vitest run src/components/admin/media/ --reporter=verbose 2>&1 \| tail -15` | ✅ (bestehende Datei) | ⬜ pending |
| 79-05-T3 | 05 | 3 | G, I, K | — | Human-Verify: Owner-Chips auf allen 5 Surfaces sichtbar; Surface 4 Status-Dropdown Default 'in Prüfung'; DB: visibility_id/review_status_id nicht NULL | human | `http://localhost:3000` — Browser-Prüfung aller 5 Surfaces + DB-Check | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/components/admin/media/mediaStatusMapping.test.ts` — stubs für Lock G / D-01 / D-02 (Plan 79-01 RED-Phase erstellt diese)
- [ ] `frontend/src/components/admin/media/MediaOwnershipContext.test.tsx` — stubs für D-05, D-06, D-03, D-09 (Plan 79-01 RED-Phase erstellt diese)

Wave 0 wird durch Plan 79-01 (TDD RED-Phase) vollständig abgedeckt. Die Dateien existieren nach Plan 79-01 Schritt 1.

---

## Manual-Only Verifications

| Verhalten | Requirement | Warum manuell | Prüfanweisung |
|-----------|-------------|---------------|---------------|
| Owner-Chips auf allen 5 Surfaces sichtbar | Lock G / D-05 | Visuelle Überprüfung der UI-Komponenten — Screenshot-Test nicht verfügbar | Öffne jede Surface im Browser (http://localhost:3000); prüfe Badge-Anzeige |
| Surface 4 Status-Dropdown Default 'in Prüfung' | D-03 | Interaktiver State — Vitest-Unit-Test prüft Komponente isoliert, aber End-to-End-Render im Drawer braucht Browser | /admin/episode-versions/{id}/edit → RVM-Tab öffnen |
| DB: visibility_id + review_status_id nicht NULL nach Upload | Lock K / Lock G | Datenbankzustand nach Netzwerk-Request | SELECT visibility_id, review_status_id FROM media_assets ORDER BY id DESC LIMIT 1 nach Test-Upload |

---

## Sampling Continuity Check

Keine 3 aufeinanderfolgenden Tasks ohne `<automated>` verify:
- 79-01-RED: automated ✓
- 79-01-GREEN: automated ✓
- 79-02-T1: automated ✓
- 79-02-T2: automated ✓
- 79-02-T3: automated ✓
- 79-03-T1: automated ✓
- 79-03-T2: automated ✓
- 79-03-T3: automated ✓
- 79-04-T1: automated ✓
- 79-04-T2: automated ✓
- 79-04-T3: automated ✓
- 79-05-T1: automated ✓
- 79-05-T2: automated ✓
- 79-05-T3: human (Abschluss-Checkpoint — akzeptabel als einzige manuell-only Verification am Ende)

Sampling-Kontinuität: erfüllt (kein Gap von 3+ Tasks ohne automated verify).

---

## Validation Sign-Off

- [x] Alle Tasks haben `<automated>` verify oder Wave-0-Abhängigkeit
- [x] Sampling-Kontinuität: keine 3 aufeinanderfolgenden Tasks ohne automated verify
- [x] Wave 0 deckt alle MISSING-Referenzen ab (79-01 RED-Phase)
- [x] Kein watch-mode-Flag in Befehlen (`npx vitest run`, nicht `npx vitest`)
- [x] Feedback-Latenz < 20 Sekunden (Quick-Run)
- [x] `nyquist_compliant: true` im Frontmatter gesetzt

**Genehmigung:** approved 2026-06-06
