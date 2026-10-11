---
phase: 180
slug: einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
status: planned
nyquist_compliant: true
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
- **Before `/gsd:verify-work`:** Full suite must be green, plus Live-UAT für D-13s optische Angleichung aller 8 Wege (automatisiert nicht sinnvoll abbildbar, da reine visuelle Angleichung) und für D-16/D-17s Drag&Drop-Verhalten auf allen 8 Wegen (nicht mehr nur Weg 4)
- **Max feedback latency:** 90 Sekunden

---

## Per-Task Verification Map

> Phase 180 hat keine zugeordneten `REQ-`/`P1NN-`-IDs (`phase_req_ids: null`) — die
> Entscheidungen D-01 bis D-17 in `180-CONTEXT.md` sind der verbindliche, nachverfolgte Vertrag
> statt formaler Requirement-IDs. Die Datei-Spalte ist nach der Planungsrevision (180-04/180-05/
> 180-07) und der D-17-Korrektur (180-08/180-09/180-10/180-11) auf die tatsächlich in den Plänen
> committeten Testdateien abgeglichen.

| Decision | Requirement (Ersatz) | Secure Behavior / Verhalten | Test Type | Automated Command | File Planned | Status |
|----------|----------------------|------------------------------|-----------|---------------------|-------------|--------|
| D-01/D-03 | D-01/D-03 | Weg 2 merged statt ersetzt Auswahl | unit (pure fn) | `npx vitest run frontend/src/hooks/useUploadQueue.helpers.test.ts` | ✅ W0 (180-02) | ⬜ pending |
| D-01/D-03 | D-01/D-03 | Weg 2 merged statt ersetzt Auswahl (Komponenten-Beweis) | component (jsdom) | `npx vitest run "frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.test.tsx"` | ✅ (180-07 Task 1) | ⬜ pending |
| D-01 (Weg 1) | D-01 | Weg 1 merged statt ersetzt Auswahl (Komponenten-Beweis) | component (jsdom) | `npx vitest run "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaUploadDrawer.test.tsx"` | ✅ (180-05 Task 1) | ⬜ pending |
| D-05 | D-05 | Merge/Retry/Validierung als reine Funktionen getestet | unit (pure fn) | `npx vitest run frontend/src/hooks/useUploadQueue.helpers.test.ts` | ✅ W0 (180-02) | ⬜ pending |
| D-09 | D-09 | Dropzone unterstützt Klick + Drag&Drop | component (jsdom) | `npx vitest run frontend/src/components/ui/UploadDropzone.test.tsx` | ✅ W0 (180-01) | ⬜ pending |
| D-11 | D-11 | Titel/Caption optional, kein Pflichtfeld-Fehler bei leerem Submit | component (jsdom) | `npx vitest run frontend/src/components/ui/UploadFileRow.test.tsx` | ✅ W0 (180-01) | ⬜ pending |
| D-12 | D-12 | Einzel-Retry pro Datei bei Teil-Fehlschlag (beide Wege) | unit (hook, Vorbild `useReleaseVersionMedia.test.ts`) | `npx vitest run frontend/src/hooks/useUploadQueue.test.ts` | ✅ W0 (180-02) | ⬜ pending |
| D-12 (Weg 2) | D-12 | Einzel-Retry bei gemischtem ready/failed-Batch (Komponenten-Beweis) | component (jsdom) | `npx vitest run "frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.test.tsx"` | ✅ (180-07 Task 1) | ⬜ pending |
| D-13 | D-13 | Alle 8 Wege rendern über die neuen Primitives | manual-only (Live-UAT, kein etablierter Visual-Diff im Projekt) | — | n/a | ⬜ pending |
| D-14 | D-14 | Gruppenmedien-Upload-Response enthält `fansub_group_media_id` je Datei | integration (`httptest` gegen Fake-Repository, Go) | `go test ./internal/handlers/... -run TestUploadFansubGroupMedia` | ✅ (180-03) | ⬜ pending |
| D-15 | D-15 | `ReleaseVersionMediaGallery.tsx` explizit auditiert und als überholter Dead Code gelöscht, nicht ignoriert | source assertion (Datei + ihr Test sind entfernt) | `test ! -f "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx"` | n/a (Entscheidung, kein neues Testfile — 180-04 Task 1) | ⬜ pending |
| D-16 | D-16 | Weg 4: Drag&Drop funktioniert, Mehrfachablage auf Single-Slot nimmt nur die erste Datei + zeigt Hinweis | component (jsdom) | `npx vitest run frontend/src/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.test.tsx` | ✅ W0 | ⬜ pending |
| D-17 | D-17 | Drag&Drop auf allen 8 Wegen aktiv (`allowDrop=true` überall), Single-Slot-Wege (3/4/5/7) teilen sich den generischen Mehrfachablage-Guard aus `UploadDropzone` | component (jsdom, zentral einmal getestet) + source assertion (pro Weg) | `npx vitest run frontend/src/components/ui/UploadDropzone.test.tsx`; `grep -rn "allowDrop={true}" frontend/src` zeigt alle acht Wege, `grep -rn "allowDrop={false}\|allowDrop: false" frontend/src` liefert keine Treffer (180-12 Task 1) | ✅ (180-01 zentral, 180-08/09/10/11 Prop-Verdrahtung, 180-12 Dead-Branch-Check) | ⬜ pending |
| D-17 (Live-UAT) | D-17 | Mensch bestätigt Drag&Drop live auf Weg 3/5/6/7/8 (nicht nur Weg 4) | manual-only (Live-UAT, Browser-Drag&Drop nur eingeschränkt in jsdom simulierbar) | — | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/hooks/useUploadQueue.helpers.test.ts` — deckt `mergeFileSelection`, `isTerminalUploadStatus`, `statusLabel`/`statusClassName` ab
- [ ] `frontend/src/hooks/useUploadQueue.test.ts` — deckt Adapter-Pattern, Retry-Verzweigung (`resultId === null` vs. Patch-Nachlauf) ab, Vorbild: `useReleaseVersionMedia.test.ts`
- [ ] `frontend/src/components/ui/UploadDropzone.test.tsx` — Klick + Drag&Drop + Keyboard (Enter/Space), Vorbild: `Modal.test.tsx`
- [ ] `frontend/src/components/ui/UploadFileRow.test.tsx` — Metadaten-Felder optional ein-/ausblendbar (Pitfall 4), Progress-Anzeige, Fehler+Retry-Button
- [ ] Backend-Test für D-14 (`fansub_group_media_id` im Response-Body) — kein bestehendes Testfile deckt das neue Feld ab
- Framework-Install: keiner nötig — Vitest 3 bereits vollständig konfiguriert

Zusätzlich (nicht Wave 0, aber jetzt in den Plänen committet): `ReleaseVersionMediaUploadDrawer.test.tsx`
(180-05 Task 1) und `GroupMediaReviewUploadPanel.test.tsx` (180-07 Task 1) liefern die
Komponenten-Ebene-Beweise für D-01/D-03/D-12, die Wave 0's reinen Hook-/Primitive-Tests allein
nicht abdecken (Adapter-Verdrahtung ist pro Weg spezifisch).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Optische Angleichung aller 8 Upload-Wege auf die neuen Primitives | D-13 | Reine visuelle Angleichung, kein im Projekt etablierter automatisierter Visual-Diff | Live-UAT: jeden der 8 Upload-Wege öffnen, Dropzone/Fortschritt/Fehler-Optik gegen die Primitive-Showcase in `/dev/ui-system` vergleichen |
| Drag&Drop bei Weg 4 inkl. Mehrfachablage-Hinweis | D-16 | Browser-Drag&Drop-Events lassen sich in jsdom nur eingeschränkt simulieren; echtes Nutzerverhalten (mehrere Dateien gleichzeitig ablegen) wird live geprüft | Live-UAT: zwei Dateien gleichzeitig auf einen Anime-Cover-Slot ziehen, prüfen dass nur die erste übernommen wird und der Hinweistext (echte Umlaute) erscheint |
| Drag&Drop auf Weg 3/5/6/7/8 (D-17-Korrektur) | D-17 | Gleicher Grund wie D-16 — zusätzlich hier geprüft, weil die ursprüngliche UI-SPEC diese Wege fälschlich auf `allowDrop=false` gesetzt hatte und die Korrektur nicht blind vertraut werden soll | Live-UAT (180-12 Task 2, Schritt 5): je eine Datei auf Weg 3 (Logo/Banner), Weg 5 (Segment-Video), Weg 6 (beide Einstiege), Weg 7 (Avatar + Hintergrund, inkl. Mehrfachablage-Hinweis) und Weg 8 ziehen und Annahme bestätigen |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-11
