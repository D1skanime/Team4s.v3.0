---
phase: 74-public-member-profile-members-slug-memorial
plan: 09
subsystem: frontend/profile-contributions
tags: [frontend, react, filters, gap-closure, D-06, D-07]
requires:
  - "74-07: PublicMemberRoleEntry.notes (string | null)"
provides:
  - "MemberContributionFilters: 5 clientseitige Filter (Anime/Gruppe/Rolle/Zeitraum/Status)"
  - "Happy-Path-Contributions rendern über MemberRoleTimeline mit funktionierendem Inline-Expand"
  - "EntryDetail zeigt notes (D-07 echte Detaildaten)"
affects:
  - frontend/src/app/members/[slug]/page.tsx (unverändert, nutzt bestehende Props)
tech-stack:
  added: []
  patterns:
    - "Clientseitige Filterung via useMemo (kein fetch, D-06)"
    - "Optionen aus geladener role_timeline abgeleitet (keine Hardcodes)"
    - "@/components/ui Select (kein natives <select>)"
key-files:
  created:
    - frontend/src/components/profile/MemberRoleTimeline.test.tsx
  modified:
    - frontend/src/components/profile/MemberRoleTimeline.tsx
    - frontend/src/components/profile/MemberRoleTimeline.module.css
    - frontend/src/components/profile/MemberContributionFilters.tsx
    - frontend/src/components/profile/MemberContributionFilters.test.tsx
decisions:
  - "Zeitraum-Filter als Dekaden-Buckets (z. B. 2020–2029), abgeleitet aus started_year/ended_year; Einträge ohne Jahr nur bei 'Alle Zeiträume' sichtbar"
  - "Status: 'active' (group_history) + 'confirmed' zählen als bestätigt — konsistent mit MemberRoleTimeline"
  - "Props auf PublicMemberRoleEntry[] vereinheitlicht; flexibler ContributionFilterEntry-Mock-Typ und der veraltete Re-Export von MemberRoleTimeline entfernt"
metrics:
  duration_min: ~25
  completed: 2026-06-08
---

# Phase 74 Plan 09: GAP-1 + GAP-2 Contributions-Filter & Inline-Expand Summary

Fünf clientseitige Filter (Anime/Gruppe/Rolle/Zeitraum/Status) über `@/components/ui` Select; die gefilterte Liste rendert jetzt durch `MemberRoleTimeline`, wodurch der EntryDetail-Inline-Expand mit echten Detaildaten (`notes` + `role_code`) auf dem Happy-Path erreichbar ist.

## Was umgesetzt wurde

### Task 1 — EntryDetail um notes (D-07)
- `hasDetail`-Gate in `MemberRoleTimeline.tsx` um `notes` erweitert (Button erscheint auch bei nur-notes).
- Notiz-Block im aufgeklappten Bereich ergänzt; `role_label` bleibt primäre Anzeige, Subtypes (`role_code`, `notes`, `anime`) nur im Expand.
- `.detailNotes`-CSS (layoutstabil, `pre-wrap`) hinzugefügt.
- Neue Test-Datei `MemberRoleTimeline.test.tsx` (4 Tests).

### Task 2 — MemberContributionFilters 5 Filter + Durchreichen (GAP-1/GAP-2)
- Props auf `roleTimeline: PublicMemberRoleEntry[]` vereinheitlicht.
- Optionen aus `role_timeline` abgeleitet: Anime (id→title), Gruppe (slug→name), Rolle (role_code→role_label, dedupliziert), Zeitraum (Dekaden-Buckets).
- Fünf `@/components/ui` Select mit UND-verknüpfter `useMemo`-Filterung; kein fetch (D-06).
- Eigene `<li>`-Liste entfernt; stattdessen `<MemberRoleTimeline entries={filtered} hasUnverified={...} />` → Inline-Expand erreichbar (GAP-2).
- Empty-State über `MemberRoleTimeline` (entries leer).
- Test-Datei `MemberContributionFilters.test.tsx` auf `PublicMemberRoleEntry`-Fixtures + 5-Filter-/Durchreich-Assertions umgebaut (11 Tests).

## Verifikation

- `npx vitest run MemberContributionFilters MemberRoleTimeline` → 15/15 grün.
- `npm run typecheck` → grün.
- ESLint auf den vier geänderten Dateien → keine Fehler (repo-weite Pre-Existing-Lintfehler in unrelated Admin-Dateien wurden bewusst nicht angefasst, Scope-Boundary).
- Dateigrößen: MemberContributionFilters.tsx 211, MemberRoleTimeline.tsx 172 Zeilen (≤450).
- Live-Verifikation (/members/...) ist Plan 74-11 zugeordnet.

## Deviations from Plan

### Auto-fixed / Konsistenz

**1. [Rule 3 - Konsistenz] Veralteten Re-Export `export { MemberRoleTimeline }` und Mock-Typ `ContributionFilterEntry` entfernt**
- **Found during:** Task 2
- **Issue:** Der alte Re-Export und der flexible Mock-Typ wurden durch die Props-Vereinheitlichung obsolet; page.tsx importiert `MemberRoleTimeline` direkt aus dessen Modul, kein anderer Consumer nutzte `ContributionFilterEntry`.
- **Fix:** Beide entfernt; Props auf `PublicMemberRoleEntry[]`.
- **Files modified:** MemberContributionFilters.tsx
- **Commit:** 33b7d73f

Die ungenutzten `.entry*`-CSS-Klassen in `MemberContributionFilters.module.css` (alte `<li>`-Liste) wurden bewusst belassen — harmlos, keine Render-Auswirkung; CSS-Datei nicht im Scope der Verify-Gates.

## Known Stubs

Keine.

## Threat Flags

Keine neue Angriffsfläche — Filter arbeiten ausschließlich auf der bereits server-gegateten `role_timeline` (74-07), kein eigener fetch.

## Self-Check: PASSED
- frontend/src/components/profile/MemberContributionFilters.tsx — FOUND
- frontend/src/components/profile/MemberRoleTimeline.tsx — FOUND
- frontend/src/components/profile/MemberRoleTimeline.test.tsx — FOUND
- frontend/src/components/profile/MemberContributionFilters.test.tsx — FOUND
- Commit 6862ef91 (RED MemberRoleTimeline) — FOUND
- Commit fcebbcc3 (feat EntryDetail notes) — FOUND
- Commit 208ca270 (RED filters) — FOUND
- Commit 33b7d73f (feat 5 filters) — FOUND
