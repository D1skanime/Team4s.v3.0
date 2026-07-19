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
- **Nach Wave 1:** ausschließlich die drei Wave-0-Taskbefehle aus Plan 01; fachlich erwartete RED-Befunde sind zulässig, Syntax-/Mock-/Environmentfehler nicht.
- **Nach Wave 2 (Pläne 02/04):** ausschließlich planlokale Shell/Hero/Contributors/Vollfolge/Navigation- beziehungsweise Gallery/Notes-Tests plus Typecheck und gezielter ESLint; die bis Plan 03 erwartbar rote ThemeTimeline-Suite wird nicht als Wave-2-Gate ausgeführt.
- **Nach Wave 3 (Plan 03):** zusammengeführte vollständige Phase-Suite plus `npm run typecheck` und gezielter ESLint-Lauf.
- **In Wave 4 (Plan 05):** vollständige Suite, Typecheck, Lint, Build, `git diff --check` und PASS-only-Live-UAT.
- **Before `$gsd-verify-work`:** vollständige Phase-Suite, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` und Live-UAT müssen grün sein.
- **Max feedback latency:** 60 Sekunden für fokussierte automatisierte Prüfungen; Build und Live-UAT sind explizite Phase-Gates.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 105-01-01 | 01 | 1 | D-01–D-04; Pretty-Route; P103-D-01, P103-D-06, P102-D-03 | — | Komposition, Leerauslassung und Deep-Link-Forwarding bleiben release-version-gebunden | SSR/component | Plan 01 Task 1 `<verify>`: `releaseDetailPageData.composition.test.tsx` + Pretty-Route `page.test.tsx` | ❌ W0 + ✅ fixture | ⬜ pending |
| 105-01-02 | 01 | 1 | D-05–D-16; P103-D-15, P103-D-16, P103-D-17, P103-D-18, P103-D-19, P103-D-20, P103-D-21, P103-D-22 | T-105-01, T-105-02, T-105-03 | Gast/Session, Proportion, Auswahl, Relaygrenzen und Cleanup werden vor Produktion fixiert | component/auth | Plan 01 Task 2 `<verify>`: `ThemeTimeline.test.tsx` | ✅ extend | ⬜ pending |
| 105-01-03 | 01 | 1 | D-17–D-28; P103-D-33, P103-D-34, P103-D-35, P103-D-36, P102-D-04, P102-D-07 | T-105-04 | Hero, Gallery, Notes, Contributors, Vollfolge und Navigation erhalten fokussierte Wave-0-Verträge | component | Plan 01 Task 3 `<verify>`: `ReleaseDetailHero.test.tsx`, `ReleaseGallery.test.tsx`, `ReleaseNotesList.test.tsx`, `ContributorsRow.test.tsx`, `ReleaseEpisodePlayer.test.tsx`, `ReleaseNavigation.test.tsx` | ✅ extend | ⬜ pending |
| 105-02-01 | 02 | 2 | D-01–D-04, D-24; P103-D-01, P103-D-06, P102-D-03, P102-D-07 | — | SSR-Komposition und Hero-Hierarchie bleiben dokumentarisch und ohne Datenleck | SSR/component | Plan 02 Task 1 `<verify>`: `releaseDetailPageData.composition.test.tsx` + `ReleaseDetailHero.test.tsx` | ✅/❌ W0 | ⬜ pending |
| 105-02-02 | 02 | 2 | D-17, D-23 | T-105-01, T-105-04 | Contributors bleiben release-spezifisch; Vollfolge bleibt zentral gegatet und Refresh-only-fähig | component/auth | Plan 02 Task 2 `<verify>`: `ContributorsRow.test.tsx`, `ReleaseEpisodePlayer.test.tsx`, `api.auth-refresh.test.ts` | ✅ extend | ⬜ pending |
| 105-02-03 | 02 | 2 | D-25–D-28; P103-D-33, P103-D-34, P103-D-35, P103-D-36, P102-D-04 | — | Public-Shell und gruppentreue Navigation besitzen keine fremde/überlagernde Kante | component/typecheck | Plan 02 Task 3 fail-fast `<verify>`: `ReleaseNavigation.test.tsx` + `releaseDetailPageData.composition.test.tsx` + Typecheck | ✅ extend | ⬜ pending |
| 105-04-01 | 04 | 2 | D-18–D-20; P103-D-01, P103-D-06, P102-D-04, P102-D-07 | — | Ein gemeinsames Raster bewahrt Originalbild, Cursor und Dedupe | component | Plan 04 Task 1 `<verify>`: `ReleaseGallery.test.tsx` + `responsiveGalleryReveal.test.ts` | ✅ extend | ⬜ pending |
| 105-04-02 | 04 | 2 | D-21–D-22; P103-D-01, P103-D-06, P102-D-04, P102-D-07 | — | Rollenbuckets und per-ID-Aufklappen bleiben nach Cursor-Merge stabil | component/typecheck | Plan 04 Task 2 fail-fast `<verify>`: `ReleaseNotesList.test.tsx` + Typecheck | ✅ extend | ⬜ pending |
| 105-03-01 | 03 | 3 | D-05–D-13; P103-D-15, P103-D-16, P103-D-17, P102-D-07 | T-105-03 | Projekt-Timeline wird als episodenweite proportionale Darstellung mit vollständigen Segmentdaten erweitert | unit/component/typecheck | Plan 03 Task 1 fail-fast `<verify>`: `ThemeTimeline.test.tsx` + Typecheck | ✅ extend | ⬜ pending |
| 105-03-02 | 03 | 3 | D-09, D-14–D-17; P103-D-18, P103-D-19, P103-D-20, P103-D-21, P103-D-22 | T-105-01, T-105-02, T-105-03 | Gast-/Sessionmatrix, Autostart, Wechsel-Cleanup, unready und servergebundene Bounds bleiben korrekt | component/auth/typecheck | Plan 03 Task 2 fail-fast `<verify>`: `ThemeTimeline.test.tsx`, `ReleaseEpisodePlayer.test.tsx`, `api.auth-refresh.test.ts`, `api.no-token-boundary.test.ts` + Typecheck | ✅ extend | ⬜ pending |
| 105-05-01 | 05 | 4 | D-01–D-30; alle inherited IDs | T-105-01–T-105-04 | Vollsuite, Authgrenzen, Lint, Build und Diff sind ausnahmslos PASS | full suite/security | Plan 05 Task 1 PowerShell-5.1-fail-fast `<verify>` | ✅ existing | ⬜ pending |
| 105-05-02 | 05 | 4 | D-29–D-30; alle inherited IDs | T-105-01–T-105-04 | Vier Viewports, vier Sessions, Kara/Content/Navigation und Produktpfad besitzen PASS-Live-Evidenz | live browser/UAT | Plan 05 Task 2 `<verify>`: vollständige `105-UAT.md` ohne BLOCKED/PENDING/TODO | ❌ generated | ⬜ pending |
| 105-05-03 | 05 | 4 | Visuelle Freigabe | — | Nutzerfreigabe folgt erst nach allen PASS-Pflichtzeilen | human checkpoint | Plan 05 Task 3 `<verify>`: keine offenen UAT-Zeilen + ausdrückliche Freigabe | ❌ generated | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Threat References

| Ref | Threat | Required mitigation |
|-----|--------|---------------------|
| T-105-01 | Refresh-only-Session wird als Gast behandelt und legitime Playback-Aktion verschwindet | Auf `hasAccessToken || hasRefreshToken` gaten und ausschließlich den zentralen API-Refresh-Seam verwenden. |
| T-105-02 | Gast erhält durch UI oder Deep-Link versehentlich Playback-CTA beziehungsweise Autoplay | Segmentinformationen sichtbar lassen, aber Aktion und Autoplay ohne aktive Session unterdrücken. |
| T-105-03 | Vergrößerte visuelle Hit-Zone verfälscht Segmentdauer oder erweitert Streamgrenzen | Visuelle Hit-Zone getrennt von proportionaler Geometrie halten; Stream bleibt an `theme_segment_id` und serverseitige Grenzen gebunden. |
| T-105-04 | Vollständige Episode erscheint ohne zentral aufgelöstes Recht | Heading und CTA ausschließlich bei aktiver Session plus `can_play && stream_ready`; denied, unready, Gast und Accessfehler rendern null. |

---

## Wave 0 Requirements

- [ ] `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.composition.test.tsx` — neue Kompositionsprüfung für Reihenfolge, entfernte Anchors und Leerauslassung.
- [ ] `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.test.tsx` — bestehenden Mock um `parseReleaseDetailSearchParams` ergänzen und Deep-Link-Forwarding prüfen.
- [ ] `ThemeTimeline.test.tsx` — Gastmatrix, Access-/Refresh-only, unavailable, Deep-Link, `aria-pressed`, Streamwechsel, Fehler und Unmount-Cleanup ergänzen.
- [ ] `ReleaseGallery.test.tsx` — gemeinsames Raster auch bei mehreren Gruppen absichern.
- [ ] `ReleaseNotesList.test.tsx` — Rollenbuckets und stabiles Auf-/Zuklappen nach Cursor-Merge absichern.
- [ ] `ContributorsRow.test.tsx` — Deduplizierung und Rollenaggregation absichern.
- [ ] `ReleaseDetailHero.test.tsx` — Primärfakten sichtbar, Sekundärdetails im Accordion und keine Beteiligten im Hero absichern.
- [ ] `ReleaseEpisodePlayer.test.tsx` — Refresh-only, denied, unready, Gast, Accessfehler und Stream-Cleanup absichern.
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
