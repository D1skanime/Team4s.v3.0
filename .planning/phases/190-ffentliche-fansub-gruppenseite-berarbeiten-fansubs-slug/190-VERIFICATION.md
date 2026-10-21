---
phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug
verified: 2026-10-21T15:30:00Z
status: passed
score: 24/24 must-haves verified (automated) + 7/7 human-verification items approved
overrides_applied: 0
human_verification:
  - test: "Kopfbereich auf /fansubs/new-subs, /fansubs/strawhat-subs, /fansubs/dragon-subs bei 1440px und 375px öffnen."
    expected: "Keine umrahmende Glas-Karte mehr; Status (aktiv/inaktiv/aufgelöst) erscheint nur einmal als Badge; Banner in Größe/Wirkung der Projektseite entsprechend."
    why_human: "Visuelle Stimmigkeit gegenüber dem Vorbild (Projektseite) und die konkrete Bannergröße sind nicht per grep abschließend beurteilbar, auch wenn die zugrunde liegende CSS-/Prop-Logik bereits automatisiert verifiziert ist."
  - test: "Fansub-Gruppe mit genau einem Projekt (dragon-subs) und eine mit mehreren (strawhat-subs) im Browser öffnen und die Projektkarten messen."
    expected: "Einzelprojekt als kleine, linksbündige Karte ohne Karussell-Chrome; mehrere Projekte unverändert im bestehenden Karussell."
    why_human: "Kartengröße/-position und das Fehlen von Navigationspfeilen sind Layout-/Optikfragen, die ein Komponenten-Unit-Test zwar strukturell (keine Pfeile im DOM), aber nicht visuell abschließend bestätigen kann."
  - test: "Medien-Abschnitt auf new-subs bei 1440px und 1920px öffnen, Kategorien und Kachel-Raster prüfen."
    expected: "Drei gleich breite Spalten, die die volle Sektionsbreite ausfüllen (kein Leerraum bei <4 Elementen je Kategorie); Kategorie-Zwischenüberschriften optisch kleiner/dezenter als die Hauptüberschrift 'Medien'; kein Kategorie-Badge mehr pro Kachel."
    why_human: "Rasterbreite bei verschiedenen Viewport-Breiten und visuelle Hierarchie zwischen Haupt- und Unterüberschrift sind genuine Layout-Fragen."
  - test: "HeroMetrics-Kennzahlenzeile an allen sechs Verwendungsstellen bei 375px und 320px prüfen (ProjectStats, FansubHeroSection, MemberProfileHero, ProjectMemberHero, DashboardMetrics, dev/ui-system)."
    expected: "Kennzahlen bleiben bei 375px nebeneinander in gleich breiten Spalten; erst unter 340px gleichmäßiger Umbruch auf zwei Spalten, nie eine einzelne verwaiste Kennzahl; Inline-Variante (ProjectMemberHero) unverändert."
    why_human: "Flex-/Grid-Wrap-Geometrie ist in jsdom nicht berechenbar; echte Browser-Messung ist die einzige verlässliche Prüfung."
  - test: "Geschichte-Abschnitt auf einer Gruppe mit Text (new-subs) bei 1440px öffnen und die Außenabstände des Textblocks messen."
    expected: "Textblock mittig mit symmetrischen Außenabständen, Text darin linksbündig (nicht zentriert)."
    why_human: "Zentrierung ist eine visuelle Eigenschaft; die zugrunde liegende CSS-Regel ist automatisiert verifizierbar, die tatsächliche symmetrische Wirkung im echten Layout nicht."
  - test: "Mitglied 'founder' auf strawhat-subs öffnen und das Rollen-Label prüfen."
    expected: "Rollen-Badge zeigt 'Editing', nicht 'Edit'."
    why_human: "Reiner Datenbankwert, aber die tatsächliche Live-Anzeige nach Migration + Backend-Neustart ist der eigentliche Beweis, nicht nur die Migrationsdatei selbst."
  - test: "dragon-subs (datenarme Gruppe) öffnen und die Abschnittsreihenfolge/Empty-State-Abwesenheit prüfen."
    expected: "Nur Kopf und Projekte sichtbar, keine Platzhalter für Geschichte/Team/Historie/Medien, Reihenfolge unverändert."
    why_human: "Bestätigt eine bewusste Nicht-Änderung (D-s) — am verlässlichsten durch tatsächliches Betrachten der Live-Seite."
---

# Phase 190: Öffentliche Fansub-Gruppenseite überarbeiten (`/fansubs/<slug>`) Verification Report

**Phase Goal:** Die öffentliche Fansub-Gruppenseite zeigt einen konsolidierten Kopfbereich ohne
Rahmen-Karte und ohne Status-Dopplung (analog zur Projektseite), klar lesbare Geschichte, gleich
hohe Team-Karten ohne redundante Kennzeichnung, nach Kategorie gruppierte Medien ohne generische
Platzhaltertitel, und eine siteweit korrekt umbrechende Kennzahlen-Zeile auf Mobilgeräten.

**Verified:** 2026-10-21T15:30:00Z
**Status:** passed (human-verification already completed and approved during execution, see
`190-HUMAN-UAT.md`)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (D-ID) | Status | Evidence |
|---|---|---|---|
| 1 | `.heroCard` matches project page's frame-less pattern (D-a) | ✓ VERIFIED | `page.module.css:74-79` — no `background`/`backdrop-filter`/`border`/`box-shadow`, byte-identical structure to the project page's own `.heroCard` |
| 2 | Status appears exactly once for all three status values (D-d, D-o) | ✓ VERIFIED | `fansub-summary.ts:15` exports shared `statusLabel`; `FansubHeroSection.tsx` calls `buildFansubFactSummary(group, { includeStatus: false })`, badge is the sole indicator |
| 3 | Banner renders at its real, undistorted size (D-b, D-p root-cause fix) | ✓ VERIFIED | Stray `sizes="1200px"` prop removed from `FansubHeroSection.tsx`'s banner `<ResponsiveImage>`; live-measured 1090.9×200px at 1440px (190-04-SUMMARY.md) |
| 4 | Hero metric label reads "Releases" (D-c) | ✓ VERIFIED | `page.tsx:79` — `{ label: 'Releases', value: group.release_versions_count }` |
| 5 | Member section heading depends on group status (D-e/D-q) | ✓ VERIFIED | `fansub-team-labels.ts:9` `resolveMemberSectionLabel`, status threaded `page.tsx` → `FansubTeamSection` → `FansubTeamActiveGroup`; 3 logic tests cover all three `FansubStatus` branches |
| 6 | Team quotes clamp with expand/collapse (D-f) | ✓ VERIFIED | `useClampedOverflow` wired into team card slogan rendering, same pattern as `FansubStoryBlock.tsx` |
| 7 | "unbestätigt" appears once in the section heading, not per card (D-g) | ✓ VERIFIED | `FansubTeamHistoricalGroup.tsx` heading reads "Historische Nennungen (unbestätigt)"; per-card badge removed |
| 8 | Single project renders as a small, left-aligned card without carousel chrome (D-h, D-r) | ✓ VERIFIED | `FansubProjectsGrid.tsx:41-43` — `items.length === 1` bypasses `FocalCarousel`, renders inside `.bannerGrid`; live-measured 320×180px (1440px) / 303×170px (375px), 0 nav arrows, no `role="region"` |
| 9 | Multiple projects unaffected (D-h scope boundary) | ✓ VERIFIED | `strawhat-subs` (2 projects) live-measured 718×404px with arrows, unchanged from pre-phase baseline |
| 10 | `singleItemLayout` prop fully reverted, no dead API surface | ✓ VERIFIED | `git diff 7cb2ceb86^..HEAD -- FocalCarousel.tsx FocalCarouselInternals.tsx` is empty — confirmed zero net diff |
| 11 | No generic "image" media titles (D-i) | ✓ VERIFIED | `resolveFansubMediaTitle` in `fansubMediaPresentation.ts` never falls through to `media_type`; live-DB sample of `new-subs` (5/10 items without title/caption) confirmed fixed |
| 12 | Media per-category pagination, no global overflow element (D-j, D-k second round) | ✓ VERIFIED | `previewFansubMediaCategoryGroup` (`fansubMediaPresentation.ts:59,74`) caps each category at 6 independently; `FansubGroupMediaBlock.tsx` renders one "Mehr anzeigen" per category, no global button |
| 13 | Media grouped by category with subheading (D-k) | ✓ VERIFIED | `groupFansubMediaByCategory` + `SectionHeader` per group in `FansubGroupMediaBlock.tsx` |
| 14 | Category badge removed from grouped tiles (D-k second round) | ✓ VERIFIED | `FansubGroupMediaBlock.tsx` tile markup has no category tag; `.mediaTag`/`.tag*` CSS classes removed as dead code |
| 15 | Media grid always 3 equal columns on desktop, no viewport-width escalation (D-k third round) | ✓ VERIFIED | `FansubPublicSections.module.css:84-90` `repeat(3, minmax(0, 1fr))`, no `min-width:1600px` override; live-measured 1440px (3×429px) and 1920px (3×464px), sum of widths+gaps = section width |
| 16 | Category subheading visually subordinate to main "Medien" heading (D-k third round) | ✓ VERIFIED | `.mediaCategoryTitle` 13px/600/`--text-muted` via `titleClassName`, `.mediaCategoryHeader` 1px `--border-subtle` border, vs. main heading's 16px/700 default `SectionHeader` styling; live-measured both |
| 17 | Story block centered, text left-aligned (D-l) | ✓ VERIFIED | `FansubStorySection.module.css:5-6` `margin: 0 auto; max-width: 76ch;`, no `text-align`; live-measured symmetric 155px/154px outer margins |
| 18 | `role_definitions.label_de` for `editor` is "Editing" (D-t) | ✓ VERIFIED | `0186_role_catalog_editor_label_correction.up.sql` applied and verified via `SELECT`; backend `TestPublicNoteRoleCode` suite green |
| 19 | Migration is append-only, symmetric down-migration (D-t) | ✓ VERIFIED | Single-row `UPDATE ... WHERE code = 'editor'`, `.down.sql` restores `'Edit'`, no `DELETE` |
| 20 | HeroMetrics mobile: side-by-side equal columns, wrap only below 340px, no orphan (D-u) | ✓ VERIFIED | `HeroMetrics.module.css` `flex: 1 1 0` at ≤767px, `grid-template-columns: repeat(2,1fr)` + `:last-child:nth-child(odd) { grid-column: 1/-1 }` at ≤339px; live-measured at 375px and 320px across 6 call sites |
| 21 | Inline HeroMetrics variant (ProjectMemberHero) unaffected (D-u scope boundary) | ✓ VERIFIED | `:not(.heroMetricsInline)` scoping on both new rule blocks; live-measured single-row, content-sized at both 375px and 320px |
| 22 | Section order unchanged (D-m) | ✓ VERIFIED | Live DOM order on `new-subs`: hero→geschichte→projekte→team→erfolge→medien; `dragon-subs`: hero→projekte |
| 23 | Member count metric + history timeline unchanged (D-n) | ✓ VERIFIED | No code changes to `visibleTeamCount` computation or `FansubHistorySection`'s rendering structure (only the pre-existing `sortHistory` bug fix, unrelated to D-n's "unverändert" scope) |
| 24 | Empty sections stay hidden, no empty-state placeholders (D-s) | ✓ VERIFIED | `dragon-subs` live-confirmed: only hero+projekte render, no placeholder text for the four missing sections |

**Score:** 24/24 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `frontend/src/lib/fansub-summary.ts` | Shared `statusLabel` + `includeStatus` option | ✓ VERIFIED | Present, 2 call sites updated |
| `frontend/src/lib/fansub-team-labels.ts` | `resolveMemberSectionLabel` | ✓ VERIFIED | Present, 3 logic tests |
| `frontend/src/lib/fansubMediaPresentation.ts` | `groupFansubMediaByCategory`, `previewFansubMediaCategoryGroup` | ✓ VERIFIED | Present, 11 logic tests (4 new for the preview function) |
| `frontend/src/components/fansubs/FansubProjectsGrid.tsx` | Single-item `.bannerGrid` bypass | ✓ VERIFIED | Confirmed, see truth #8 |
| `frontend/src/components/fansubs/FansubGroupMediaBlock.tsx` | Per-category pagination, no badge | ✓ VERIFIED | Confirmed, see truths #12-14 |
| `database/migrations/0186_role_catalog_editor_label_correction.{up,down}.sql` | Append-only editor label fix | ✓ VERIFIED | Confirmed, see truths #18-19 |
| `frontend/src/components/ui/HeroMetrics.module.css` | Site-wide mobile wrap fix | ✓ VERIFIED | Confirmed, see truths #20-21 |
| `.planning/phases/190-.../190-REVIEW.md` | Phase-closeout code review | ✓ VERIFIED | 26 files, deep depth, 0 critical/5 warning/3 info, all warnings fixed |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `page.tsx` | `FansubTeamSection`/`FansubTeamActiveGroup` | `status={group.status}` prop | ✓ WIRED | Threaded through 2 component layers to `resolveMemberSectionLabel` |
| `FansubProjectsGrid.tsx` | `FansubProjectBannerCard` | direct render (single-item path) | ✓ WIRED | Same card component reused, not duplicated, for both single- and multi-item paths |
| `FansubGroupMediaBlock.tsx` | `fansubMediaPresentation.ts` | `groupFansubMediaByCategory` + `previewFansubMediaCategoryGroup` | ✓ WIRED | Both called per render, per-category expand state via `useState<Record<string,boolean>>` |
| `SectionHeader` | `FansubGroupMediaBlock.tsx` category headings | `titleClassName` prop | ✓ WIRED | Documented, intended-for-this-purpose prop reused, no SectionHeader fork |
| `role_definitions.label_de` | Frontend role badges | `getFansubGroupDomainProjection` → `role_labels` | ✓ WIRED | Live-verified on `strawhat-subs`/"founder" |

## Code Review Resolution

`190-REVIEW.md` (deep depth, 26 files): 0 Critical, 5 Warning, 3 Info. All 5 Warnings fixed in
dedicated, individually committed fixes (WR-01 React key correctness, WR-02 dead CSS removal —
independently re-verified and corrected 2 of the review's 8 claimed-dead classes, WR-03 a
pre-existing `sortHistory` comparator bug, WR-04 missing error logging, WR-05 a touched-but-
unsplit 458-line file). 2 Info items intentionally not actioned (IN-01 low-value refactor, IN-02
not a bug — D-t already deliberately chose "Editing").

## Test Gates

- Frontend: `npm test` — 400/401 files, 3670 tests, 0 failures (2 isolated timeout flakes across
  the phase's lifetime, both reproduced as passing in isolation, unrelated to phase-190 code).
- Frontend: `npx tsc --noEmit` — clean (1 pre-existing gitignored `.next`-generated type error,
  unrelated).
- Frontend: `npm run lint` — all 26 phase-190 files clean; 5 pre-existing repo-wide errors outside
  phase scope, logged in `deferred-items.md`.
- Backend: `bash scripts/test-backend.sh` — GATE: GREEN, 2345 PASS / 0 FAIL, 27 throwaway
  databases provisioned and torn down, Phase-134-Matrix cluster provisioned successfully, no suite
  silently skipped.

## Overall Assessment

Phase 190 fully delivers its goal: all 21 locked decisions (D-a through D-u) are implemented,
live-verified across three UAT checkpoints (with corrections applied and re-verified at each), and
the phase-closeout code review's findings are resolved. No overrides applied, no known gaps.
