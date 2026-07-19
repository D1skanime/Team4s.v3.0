---
phase: 105
slug: responsive-release-detailseite-und-kara-timeline-redesign
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-19
---

# Phase 105 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + React Testing Library 16.3.2 + jsdom |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend; npm test -- --run "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx"` |
| **Full suite command** | `cd frontend; npm test -- --run "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]" "src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.test.tsx" "src/components/fansubs/__tests__/PublicReleaseBlock.test.tsx"` |
| **Estimated runtime** | ungefähr 30 Sekunden für die fokussierte Suite |

---

## Sampling Rate

- **After every task commit:** den direkt betroffenen Testfile-Befehl aus der Verification Map ausführen.
- **After every plan wave:** vollständige Phase-Suite plus `npm run typecheck` und gezielter ESLint-Lauf über geänderte Dateien.
- **Before `$gsd-verify-work`:** vollständige Phase-Suite, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` und Live-UAT müssen grün sein.
- **Max feedback latency:** 60 Sekunden für fokussierte automatisierte Prüfungen; Build und Live-UAT sind explizite Phase-Gates.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 105-01-01 | 01 | 1 | D-01–D-04, D-17, D-23 | — | Abschnittsreihenfolge und Leerauslassung verändern keine Daten-/Rechteverträge | SSR/component | `cd frontend; npm test -- --run "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.composition.test.tsx"` | ❌ W0 | ⬜ pending |
| 105-01-02 | 01 | 1 | Pretty-Route Baseline | — | Deep-Link-Parameter werden unverändert an die kanonische Komposition weitergegeben | component | `cd frontend; npm test -- --run "src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.test.tsx"` | ✅ fix fixture | ⬜ pending |
| 105-01-03 | 01 | 1 | D-14–D-16, D-29–D-30 | T-105-01, T-105-02 | Gast erhält keine Aktion; Refresh-only bleibt aktive Session; Streamwechsel räumt vorherige Quelle auf | component | `cd frontend; npm test -- --run "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx"` | ✅ extend | ⬜ pending |
| 105-02-01 | 02 | 2 | D-01–D-04, D-24–D-28 | — | Hero-Fallback und primäre Fakten bleiben ohne Datenleck sichtbar | component | `cd frontend; npm test -- --run "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx"` | ✅ extend | ⬜ pending |
| 105-03-01 | 03 | 2 | D-05–D-13 | T-105-03 | Proportionale Segmentgrenzen bleiben visuell wahr; Hit-Zonen verändern keine Streamgrenzen | unit/component | `cd frontend; npm test -- --run "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx"` | ✅ extend | ⬜ pending |
| 105-03-02 | 03 | 2 | D-09, D-14–D-17 | T-105-01, T-105-02 | Nur zentrale Session-/Grant-Seams steuern Wiedergabe; Segmentwechsel und Unmount stoppen Playback | component/auth | `cd frontend; npm test -- --run "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx" "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.test.tsx" src/lib/api.auth-refresh.test.ts` | ✅ extend | ⬜ pending |
| 105-04-01 | 04 | 2 | D-18–D-20 | — | Genau ein gemeinsames Raster; Originalbild-/Cursor-Seams bleiben erhalten | component | `cd frontend; npm test -- --run "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx"` | ✅ extend | ⬜ pending |
| 105-04-02 | 04 | 2 | D-21–D-22 | — | Rollenbuckets und per-ID-Aufklappen bleiben nach Cursor-Merge stabil | component | `cd frontend; npm test -- --run "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.test.tsx"` | ✅ extend | ⬜ pending |
| 105-04-03 | 04 | 2 | D-23 | — | Nur Release-Version-Contributors; Paare dedupliziert und Rollen aggregiert | component | `cd frontend; npm test -- --run "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ContributorsRow.test.tsx"` | ✅ extend | ⬜ pending |
| 105-05-01 | 05 | 3 | D-25–D-30 | T-105-01 | Keine horizontale Überbreite, keine Fokus-Clips, gruppentreue Navigation und korrekte Zustände | full suite + live | vollständige Phase-Suite; anschließend Live-UAT-Matrix | ✅ + manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Threat References

| Ref | Threat | Required mitigation |
|-----|--------|---------------------|
| T-105-01 | Refresh-only-Session wird als Gast behandelt und legitime Playback-Aktion verschwindet | Auf `hasAccessToken || hasRefreshToken` gaten und ausschließlich den zentralen API-Refresh-Seam verwenden. |
| T-105-02 | Gast erhält durch UI oder Deep-Link versehentlich Playback-CTA beziehungsweise Autoplay | Segmentinformationen sichtbar lassen, aber Aktion und Autoplay ohne aktive Session unterdrücken. |
| T-105-03 | Vergrößerte visuelle Hit-Zone verfälscht Segmentdauer oder erweitert Streamgrenzen | Visuelle Hit-Zone getrennt von proportionaler Geometrie halten; Stream bleibt an `theme_segment_id` und serverseitige Grenzen gebunden. |

---

## Wave 0 Requirements

- [ ] `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.composition.test.tsx` — neue Kompositionsprüfung für Reihenfolge, entfernte Anchors und Leerauslassung.
- [ ] `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.test.tsx` — bestehenden Mock um `parseReleaseDetailSearchParams` ergänzen und Deep-Link-Forwarding prüfen.
- [ ] `ThemeTimeline.test.tsx` — Gastmatrix, Access-/Refresh-only, unavailable, Deep-Link, `aria-pressed`, Streamwechsel, Fehler und Unmount-Cleanup ergänzen.
- [ ] `ReleaseGallery.test.tsx` — gemeinsames Raster auch bei mehreren Gruppen absichern.
- [ ] `ReleaseNotesList.test.tsx` — Rollenbuckets und stabiles Auf-/Zuklappen nach Cursor-Merge absichern.
- [ ] `ContributorsRow.test.tsx` — Deduplizierung und Rollenaggregation absichern.
- [ ] `ReleaseDetailHero.test.tsx` — Primärfakten sichtbar, Sekundärdetails im Accordion und keine Beteiligten im Hero absichern.
- [ ] `ReleaseNavigation.test.tsx` — Inline-Variante und gruppentreue Hrefs absichern.
- Framework-Installation: keine; Vitest, RTL und jsdom sind vorhanden.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Responsive Geometrie | D-05–D-13, D-18–D-29 | jsdom berechnet keine echte CSS-Geometrie | Pretty-Route bei 390, 768, 1024 und 1440 px prüfen; `scrollWidth <= clientWidth`, Fokus, Kartenanzahl, Timeline-/Listenwechsel und Navigation dokumentieren. |
| Resize-Stabilität | D-29 | Zustand über echte Viewportwechsel ist browserabhängig | Bei ausgewähltem Segment 1024 → 390 → 1440 px wechseln; Auswahl, Playerzustand und Seitenfluss prüfen. |
| Visuelle Public-UI-Konsistenz | D-24–D-28 | Abstände, Hierarchie und wahrgenommene Breite benötigen Sichtprüfung | Release-Seite parallel zur Fansub- und Fansub-Projektseite prüfen; Maximalbreite, Karten, Buttons, Typografie und Schatten vergleichen. |
| Tastatur und Reduced Motion | D-28 | Fokusreihenfolge und Browserbewegung sind nur begrenzt in jsdom abbildbar | Timeline/Karten vollständig per Tab, Enter und Leertaste bedienen; Fokus sichtbar; Reduced Motion aktivieren; Modal/Lightbox mit Escape schließen. |

---

## Live-UAT Matrix

| Dimension | Required cases |
|-----------|----------------|
| Viewports | 390, 768, 1024, 1440 px; zusätzlich Resize 1024 → 390 → 1440. |
| Session | Gast; eingeloggter Fansubber; Refresh-only ohne Access-Token; Vollfolgen-berechtigter Nutzer. |
| Kara | ready/unavailable; OP/ED/IN/Middle/unknown; kurze/kollidierende Labels; Deep-Link; schneller Wechsel; Fehler; Tastatur. |
| Content | Preview, Logo-Fallback, text-only Hero; keine Karas/Bilder/Texte; viele Bilder; langer Text; mehrere Gruppen; doppelte Contributorrollen. |
| Navigation | beide, eine oder keine Kante; Pretty-Href bleibt im Fansub-Projekt; Mobile gestapelt. |

---

## Validation Sign-Off

- [x] All tasks have automated verification or explicit Wave-0 dependencies.
- [x] Sampling continuity: no three consecutive tasks without automated verification.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Focused feedback latency target is below 60 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

**Approval:** approved 2026-07-19
