---
phase: 75-anime-gruppen-deep-dive-anime-id-group-groupid
plan: "03"
subsystem: frontend-ui
status: code_merged_human_verify_pending
completed_date: 2026-06-06
merge_commit: 44b2f95a
tags:
  - next-js-server-component
  - section-wiring
  - graceful-degradation
  - empty-state
  - claim-based-linking
dependency_graph:
  requires:
    - 75-01 (getGroupContributors/getGroupThemes/getGroupReleaseMedia + Response-Typen)
    - 75-02 (page.tsx Orchestrator-Shell + Section-Anker-Gerüst)
  provides:
    - frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/ThemesSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/MediaSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/page.tsx (drei neue Fetches verdrahtet)
  affects:
    - frontend/src/app/anime/[id]/group/[groupId]/page.module.css
tech_stack:
  added: []
  patterns:
    - Server-Component-Fetch mit try/catch Graceful Degradation pro Abschnitt (D-05)
    - D-07 strikte Trennung Team-Beteiligte (release_member_roles) vs. Externe Mitwirkende (anime_contributions)
    - D-09 Claim-basiertes Linking (member_slug != null → next/link, sonst span)
    - D-12/D-13 Themes nach OP/ED/Middle gruppiert, read-only (kein Player/Timing-Editor)
    - D-15 MediaSection immer sichtbar, EmptyState bei leeren Daten
key_files:
  created:
    - frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/ThemesSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/MediaSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.tsx
  modified:
    - frontend/src/app/anime/[id]/group/[groupId]/page.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/page.module.css
decisions:
  - "Anker-IDs (#team/#releases/#themes/#medien) liegen in den Section-Komponenten selbst, nicht in page.tsx — Sticky-Nav verlinkt nie auf fehlende Abschnitte"
  - "D-11 (Version-Labels v1/v2, TV/BD) bewusst NICHT gerendert: EpisodeReleaseSummary trägt kein version_label-Feld; als Gap auf die /releases-Tiefenseite vertagt (Inline-Kommentar in ReleasesSection)"
  - "ReleasesSection rendert keine has_op/has_ed/karaoke_count-Flags (RESEARCH Befund 1: Dummy-Werte)"
commits:
  - a729a577 test(75-03): add failing tests for TeamSection (TDD RED)
  - a7715d7b feat(75-03): TeamSection, ReleasesSection, BacklinksSection — Task 1
  - 0346b64a feat(75-03): ThemesSection + MediaSection + page.tsx final wiring + CSS — Task 2
  - 44b2f95a Merge commit '0346b64a'
verification:
  typecheck: "npm run typecheck — exit 0"
  build: "npm run build — exit 0 (Route /anime/[id]/group/[groupId] enthalten)"
  unit_tests: "npm test -- --reporter=verbose TeamSection ReadinessTab — 10/10 passed"
  diff_check: "git diff --check — exit 0"
  lint: "npm run lint — exit 1; repo-weite bestehende Fehler, Phase-75-Dateien nur image-bezogene Warnungen"
  human_uat: "VERIFIED 2026-06-08 — Browser-Verifikation gegen Dev-Server :3000 auf /anime/3/group/88 abgeschlossen"
---

# 75-03 — Sections verdrahten + narrative Scroll-Seite vervollständigen

## Was gebaut wurde

Die fünf verbleibenden narrativen Abschnitte der Gruppen-Deep-Dive-Seite
`/anime/[id]/group/[groupId]` wurden mit echten Daten aus den drei Plan-01-Endpoints
verdrahtet. Die Seite besitzt jetzt sieben Abschnitte in fester Reihenfolge (D-02):
Hero → Projektgeschichte → **Beteiligte am Projekt** → **Releases & Versionen** →
**OP / ED / Middle** → **Release-Einblicke** → **Mehr entdecken**.

- **TeamSection** — zwei strikt getrennte Blöcke „Team-Beteiligte" und „Externe
  Mitwirkende" (D-07); geclaimte Member als `next/link` zu `/members/[slug]`,
  ungeclaimte als reiner Text (D-09); Rollen als Badges; EmptyState je Block.
- **ReleasesSection** — bis zu 5 Highlight-Karten + CTA-Button „Alle Releases
  ansehen" → `/anime/[id]/group/[groupId]/releases` (D-10, D-03). Keine Version-Labels
  (D-11 Gap, vertagt auf /releases-Tiefe).
- **ThemesSection** — Themes nach Opening/Ending/Middle gruppiert, sichtbare Asset-Tiles,
  read-only ohne Player/Timing-Editor (D-12, D-13); EmptyState bei keinen Themes.
- **MediaSection** — Galerie öffentlicher Release-Version-Medien, Abschnitt immer
  sichtbar mit EmptyState (D-14, D-15).
- **BacklinksSection** — Rückverlinkung „Zur Gruppenseite" / „Zur Anime-Seite" (D-02).
- **page.tsx** — ruft `getGroupContributors`, `getGroupThemes`, `getGroupReleaseMedia`
  mit Graceful Degradation (try/catch → EmptyState bei Fetch-Fehler, D-05); ≤150 Zeilen
  Orchestrator-Struktur aus 75-02 erhalten.

## Main-Closeout 2026-06-06

Der bis dahin noch nicht in `main` sichtbare 75-03-Agentenstand (`0346b64a`) wurde per
Merge-Commit `44b2f95a` integriert. Dabei wurde zusätzlich ein bestehender
TypeScript-Blocker in `ReadinessTab` behoben: die lose Index-Signatur in
`ReadinessGroupProps` verhinderte, dass der echte `FansubGroup`-Typ aus
`/admin/fansubs/[id]/edit/page.tsx` sauber typisiert durchgereicht werden konnte.
Das ändert kein Readiness-Verhalten.

## Verifikation

| Gate | Ergebnis |
|------|----------|
| `npm run typecheck` | ✅ exit 0 |
| `npm test -- --reporter=verbose TeamSection ReadinessTab` | ✅ 10/10 |
| `npm run build` | ✅ exit 0 (Route enthalten) |
| `git diff --check` | ✅ exit 0 |
| `npm run lint` | ❌ repo-weite bestehende Fehler |
| Zeilenlimits (≤450, page.tsx ≤150) | ✅ page.tsx 115, css 352, Sections ≤81 |
| Keine nativen `<button>/<input>/<select>` außerhalb `@/components/ui` | ✅ |
| Korrekte Umlaute in allen UI-Strings | ✅ |
| Human-UAT (Task 3, blocking) | ✅ verified 2026-06-08 |

## Lint-Status

`npm run lint` scheitert weiterhin an bestehenden repo-weiten Fehlern, unter anderem:

- `frontend/src/app/dev/ui-system/page.tsx:188` (`react-hooks/set-state-in-effect`)
- `frontend/src/app/me/profile/components/ClaimStatusCard.tsx:64` (`react/no-unescaped-entities`)
- temporäre `frontend/tmp-live-full-flow*.js` Dateien mit `require()`

Die neuen Phase-75-Dateien erzeugen nur image-bezogene Warnungen in `MediaSection.tsx`
und `ThemesSection.tsx`; sie sind nicht die lint-blockierenden Fehler.

## Offen / Nächste Schritte

- **D-11** (Version-Labels) bleibt als bewusster Gap auf der /releases-Tiefenseite.
