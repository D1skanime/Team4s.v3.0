---
phase: 180
slug: einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-11
---

# Phase 180 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 (`frontend/package.json`) |
| **Config file** | `frontend/vitest.config.ts` (jsdom via `@vitest-environment`-Kommentar je Datei, nicht global) |
| **Quick run command** | `npm --prefix frontend run test -- <pfad-zur-datei>` |
| **Full suite command** | `npm --prefix frontend run test` |
| **Estimated runtime** | ~90 Sekunden (laut bestehender Full-Suite-Praxis im Projekt) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <pfad-zur-geänderten-datei>` für die gerade bearbeitete Datei
- **After every plan wave:** Run `npm --prefix frontend run test` (volle Suite) + `npm --prefix frontend run typecheck` + `npm --prefix frontend run lint`
- **Before `/gsd:verify-work`:** Full suite must be green, plus Live-UAT für D-13s optische Angleichung aller 8 Wege (automatisiert nicht sinnvoll abbildbar, da reine visuelle Angleichung) und für D-16s Drag&Drop-Verhalten bei Weg 4
- **Max feedback latency:** 90 Sekunden

---

## Per-Task Verification Map

> Phase 180 hat keine zugeordneten `REQ-`/`P1NN-`-IDs (`phase_req_ids: null`) — die
> Entscheidungen D-01 bis D-16 in `180-CONTEXT.md` sind der verbindliche, nachverfolgte Vertrag
> statt formaler Requirement-IDs. Konkrete Task-IDs werden vom Planer vergeben; diese Tabelle
> bildet die Decisions bereits auf Testart/Datei ab, damit der Planer sie 1:1 übernehmen kann.

| Decision | Requirement (Ersatz) | Secure Behavior / Verhalten | Test Type | Automated Command | File Exists | Status |
|----------|----------------------|------------------------------|-----------|---------------------|-------------|--------|
| D-01/D-03 | D-01/D-03 | Weg 2 merged statt ersetzt Auswahl | unit (pure fn) | `npx vitest run frontend/src/hooks/useUploadQueue.helpers.test.ts` | ❌ W0 | ⬜ pending |
| D-05 | D-05 | Merge/Retry/Validierung als reine Funktionen getestet | unit (pure fn) | `npx vitest run frontend/src/hooks/useUploadQueue.helpers.test.ts` | ❌ W0 | ⬜ pending |
| D-09 | D-09 | Dropzone unterstützt Klick + Drag&Drop | component (jsdom) | `npx vitest run frontend/src/components/ui/UploadDropzone.test.tsx` | ❌ W0 | ⬜ pending |
| D-11 | D-11 | Titel/Caption optional, kein Pflichtfeld-Fehler bei leerem Submit | component (jsdom) | `npx vitest run frontend/src/components/ui/UploadFileRow.test.tsx` | ❌ W0 | ⬜ pending |
| D-12 | D-12 | Einzel-Retry pro Datei bei Teil-Fehlschlag (beide Wege) | unit (hook, Vorbild `useReleaseVersionMedia.test.ts`) | `npx vitest run frontend/src/hooks/useUploadQueue.test.ts` | ❌ W0 | ⬜ pending |
| D-13 | D-13 | Alle 8 Wege rendern über die neuen Primitives | manual-only (Live-UAT, kein etablierter Visual-Diff im Projekt) | — | n/a | ⬜ pending |
| D-14 | D-14 | Gruppenmedien-Upload-Response enthält `fansub_group_media_id` je Datei | integration (`httptest` gegen Fake-Repository, Go) | `go test ./internal/handlers/... -run TestUploadFansubGroupMedia` | ❌ W0 | ⬜ pending |
| D-15 | D-15 | `ReleaseVersionMediaGallery.tsx` explizit reaktiviert ODER gelöscht, nicht ignoriert | source assertion (Datei existiert + wird importiert, ODER Datei + ihr Test sind entfernt) | `grep -rln "ReleaseVersionMediaGallery" frontend/src` | n/a (Entscheidung, kein neues Testfile) | ⬜ pending |
| D-16 | D-16 | Weg 4: Drag&Drop funktioniert, Mehrfachablage auf Single-Slot nimmt nur die erste Datei + zeigt Hinweis | component (jsdom) | `npx vitest run frontend/src/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/hooks/useUploadQueue.helpers.test.ts` — deckt `mergeFileSelection`, `isTerminalUploadStatus`, `statusLabel`/`statusClassName` ab
- [ ] `frontend/src/hooks/useUploadQueue.test.ts` — deckt Adapter-Pattern, Retry-Verzweigung (`resultId === null` vs. Patch-Nachlauf) ab, Vorbild: `useReleaseVersionMedia.test.ts`
- [ ] `frontend/src/components/ui/UploadDropzone.test.tsx` — Klick + Drag&Drop + Keyboard (Enter/Space), Vorbild: `Modal.test.tsx`
- [ ] `frontend/src/components/ui/UploadFileRow.test.tsx` — Metadaten-Felder optional ein-/ausblendbar (Pitfall 4), Progress-Anzeige, Fehler+Retry-Button
- [ ] Backend-Test für D-14 (`fansub_group_media_id` im Response-Body) — kein bestehendes Testfile deckt das neue Feld ab
- Framework-Install: keiner nötig — Vitest 3 bereits vollständig konfiguriert

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Optische Angleichung aller 8 Upload-Wege auf die neuen Primitives | D-13 | Reine visuelle Angleichung, kein im Projekt etablierter automatisierter Visual-Diff | Live-UAT: jeden der 8 Upload-Wege öffnen, Dropzone/Fortschritt/Fehler-Optik gegen die Primitive-Showcase in `/dev/ui-system` vergleichen |
| Drag&Drop bei Weg 4 inkl. Mehrfachablage-Hinweis | D-16 | Browser-Drag&Drop-Events lassen sich in jsdom nur eingeschränkt simulieren; echtes Nutzerverhalten (mehrere Dateien gleichzeitig ablegen) wird live geprüft | Live-UAT: zwei Dateien gleichzeitig auf einen Anime-Cover-Slot ziehen, prüfen dass nur die erste übernommen wird und der Hinweistext (echte Umlaute) erscheint |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
