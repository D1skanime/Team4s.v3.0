---
phase: 74-public-member-profile-members-slug-memorial
plan: "04"
subsystem: member-profile-frontend
tags: [vitest, typescript, nextjs, server-component, sticky-nav, memorial, d-01, d-02, d-03, d-04, d-05, d-09, d-10]

dependency_graph:
  requires:
    - phase: 74-00
      provides: "Wave-0 RED-Stubs MemberStatusPill.test.tsx, MemberProfileHero.test.tsx, deriveKnownFor.test.ts"
    - phase: 74-01
      provides: "profile_status + public_badges im PublicMemberProfileData DTO"
    - phase: 72
      provides: "members.profile_status live (Migration 0096)"
  provides:
    - "MemberStatusPill: Badge+Tooltip für alle 5 Status (D-09)"
    - "deriveKnownFor: read-only Ableitung aktive Jahre/Top-Rollen/Gruppen aus role_timeline (D-03)"
    - "MemberProfileMemorialHero: würdevolle Sonder-Hero mit Gedenktext (D-10)"
    - "MemberSectionNav: Sticky-Anker-Nav IntersectionObserver Phase-73-Paradigma (D-01)"
    - "MemberGroupsHistorySection: Server-Rahmen Memberships + Story (D-04/D-05)"
    - "page.tsx refaktoriert: Sektions-Scroll-Seite D-02, public_badges statt getMyBadges (Badges-13)"
  affects:
    - "frontend/src/app/members/[slug]/page.tsx (Sektions-Orchestrator)"
    - "frontend/src/components/profile/MemberProfileHero.tsx (Status-Pill + KnownFor-Block)"

tech_stack:
  added: []
  patterns:
    - "Phase-73-Paradigma Sticky-Nav 1:1 adaptiert (IntersectionObserver rootMargin -20%/-70%)"
    - "Server Component Root ≤142 Zeilen (kein 'use client' auf Root)"
    - "read-only Ableitung via reine Funktion (kein fetch, kein Schreib-Flow) — D-03-Invariante"
    - "Memorial-Split-Komponente unter 450 Zeilen"

key_files:
  created:
    - frontend/src/components/profile/deriveKnownFor.ts
    - frontend/src/components/profile/MemberStatusPill.tsx
    - frontend/src/components/profile/MemberProfileMemorialHero.tsx
    - frontend/src/components/profile/MemberSectionNav.tsx
    - frontend/src/components/profile/MemberSectionNav.module.css
    - frontend/src/components/profile/MemberGroupsHistorySection.tsx
    - frontend/src/components/profile/MemberGroupsHistorySection.module.css
  modified:
    - frontend/src/components/profile/MemberProfileHero.tsx
    - frontend/src/components/profile/profile.module.css
    - frontend/src/app/members/[slug]/page.tsx
    - frontend/src/app/members/[slug]/page.module.css

decisions:
  - "deriveKnownFor RoleTimelineEntry akzeptiert role|role_label und group_name|fansub_group_name dual — direktes Assignment von PublicMemberRoleEntry ohne Cast"
  - "token-basierter getOwnProfile()-Aufruf in page.tsx entfernt — OwnProfileEditLink erkennt Ownership client-seitig selbst; Server benötigt kein isOwnProfile-Flag mehr"
  - "Pre-flight-Gate: Phase-72-SUMMARY (Migration 0096) bestätigt members.profile_status live; kein Blocker"
  - "MemberContributionFilters.test.tsx typecheck-Fehler ist pre-existing Wave-0-RED (Plan 00) — out of scope für Plan 04"

metrics:
  duration: "~35 Minuten"
  completed_date: "2026-06-05"
  tasks: 2
  files: 11
---

# Phase 74 Plan 04: Sektions-Scroll-Seite + Status-Pill + „Bekannt für" + Memorial-Hero — Summary

Dreistufige einspaltige Scroll-Seite mit Sticky-Anker-Nav, Status-Pill für alle 5 Status, read-only „Bekannt für"-Ableitung, würdevoller Memorial-Hero-Variante und korrekter Public-Badge-Quelle aus DTO.

---

## Tasks ausgeführt

### Task 1: MemberStatusPill + deriveKnownFor + Memorial-Hero-Variante

**Commit:** `78939012`

**Pre-flight-Gate:** `72-01-SUMMARY.md` bestätigt — Migration 0096 fügt `members.profile_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK IN ('active','historical','memorial')` ein. Phase 72 abgeschlossen, Feld live. Kein Blocker.

**Dateien erstellt/erweitert:**

1. `frontend/src/components/profile/deriveKnownFor.ts` (75 Z.)
   - Reine Funktion `deriveKnownFor(roleTimeline)` → `{ activeYears, topRoles, knownGroups }`
   - Leitet mechanisch ab: aktive Jahre (min/max Jahr), Top-3-Rollen nach Häufigkeit, distinct Gruppen
   - Kein fetch, kein Schreib-Flow, kein neues DB-Feld (D-03-Invariante)
   - `RoleTimelineEntry` akzeptiert dual: `role|role_label`, `year|started_year`, `group_name|fansub_group_name`

2. `frontend/src/components/profile/MemberStatusPill.tsx` (48 Z.)
   - `@/components/ui` Badge mit deutschen Labels + `title`-Tooltip für alle 5 Status (D-09)
   - active=„Aktiv", historical=„Historisch", unclaimed=„Nicht beansprucht", claimed=„Beansprucht", memorial=„Gedenkprofil"
   - Korrekte Umlaute (CLAUDE.md §Sprachqualität)

3. `frontend/src/components/profile/MemberProfileMemorialHero.tsx` (100 Z., Split)
   - Würdevolle Sonder-Hero: Gedenktext „Dieses Profil wird als historisches Gedenkprofil geführt." (D-10)
   - Keine Mengen-/Gamification-Badge-Anzeige; ruhige Darstellung
   - Status-Pill + optionaler Bio-Text + „Bekannt für"-Block (D-03)

4. `MemberProfileHero.tsx` (180 Z.) erweitert:
   - Status-Pill neben Nickname (D-09)
   - „Bekannt für"-Block aus `deriveKnownFor` (D-03)
   - Delegation an `MemberProfileMemorialHero` wenn `profile_status === 'memorial'` (D-10)

5. `profile.module.css`: Memorial- und KnownFor-CSS-Klassen ergänzt

**Wave-0 Tests GREEN:**
```
MemberStatusPill.test.tsx    11 Tests PASSED
MemberProfileHero.test.tsx    5 Tests PASSED
deriveKnownFor.test.ts        6 Tests PASSED
Gesamt: 22 Tests PASSED
```

---

### Task 2: Root-Seite → Sektions-Scroll-Seite + Sticky-Nav + Gruppen/Geschichte-Rahmen

**Commit:** `f5dad9f9`

**Dateien erstellt/erweitert:**

1. `MemberSectionNav.tsx` + `.module.css` (67 Z.)
   - Phase-73-Paradigma 1:1 adaptiert: `'use client'`, IntersectionObserver `rootMargin: '-20% 0px -70% 0px'`
   - SECTION_IDS: `['identitaet', 'badges', 'geschichte', 'beitraege']`
   - Labels: Identität/Badges/Geschichte/Beiträge (korrekte Umlaute)
   - `@/components/ui` Button variant subtle/ghost; scrollIntoView smooth
   - CSS: `position: sticky; top: var(--header-height, 60px); overflow-x: auto`

2. `MemberGroupsHistorySection.tsx` + `.module.css` (51 Z.)
   - Server-Rahmen: `MembershipsSection` + Story via `RichTextRenderer` (D-04 / T-74-04-XSS)
   - Empty-States (D-05) — Sektions-Anker stabil

3. `page.tsx` refaktoriert (142 Zeilen, Server Component, kein `'use client'`):
   - `getMyBadges`-Block entfernt — Badges aus `response.data.public_badges` (Badges-13 / Fallstrick 2)
   - Sektionsreihenfolge D-02: `#identitaet → #badges → #geschichte → #beitraege`
   - Stabile `id`-Anker für IntersectionObserver
   - Owner-Affordances (`OwnProfileEditLink`, `OwnHiddenProfilePreview`) erhalten
   - Empty-States als Platzhalter (D-05)
   - Token server-seitig via `cookies()` (Lock A/K)

4. `page.module.css`: einspaltige Lesebreite + Sektionsabstände (Fansub-Analog)

**Typecheck:** grün (einziger Fehler: pre-existing `MemberContributionFilters.test.tsx` Wave-0-RED aus Plan 00)

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PublicMemberRoleEntry Typen-Inkompatibilität**
- **Found during:** Task 2 Typecheck
- **Issue:** `RoleTimelineEntry` hatte `role: string` (required) und `[key: string]: unknown` Index-Signatur; `PublicMemberRoleEntry` aus `@/types/contributions.ts` nutzt `role_label` statt `role` und hat keine Index-Signatur
- **Fix:** `RoleTimelineEntry` alle Felder optional gemacht; `role_label`, `started_year`, `fansub_group_name` als alternative Felder ergänzt; Index-Signatur entfernt; `deriveKnownFor` nutzt `entry.role ?? entry.role_label` etc.
- **Files modified:** `deriveKnownFor.ts`
- **Commit:** `f5dad9f9`

**2. [Rule 1 - Bug] token-basierter getOwnProfile()-Aufruf in page.tsx**
- **Found during:** Task 2 Refactor
- **Issue:** Der bisherige `isOwnProfile`-Check via server-seitigem `getOwnProfile(token)` ist unnötig — `OwnProfileEditLink` erkennt Ownership bereits client-seitig via `useAuthSession`. Der Server-Aufruf war redundant und lädt eine weitere API-Request.
- **Fix:** `getOwnProfile`-Import und server-seitigen Aufruf aus `page.tsx` entfernt; `OwnProfileEditLink` bleibt verdrahtet.
- **Files modified:** `page.tsx`
- **Commit:** `f5dad9f9`

---

## Known Stubs

| Stub | Datei | Zeile | Grund | Plan |
|------|-------|-------|-------|------|
| Badges-Detailansicht | `page.tsx` Z. 121-125 | Platzhalter-Text „Detailansicht folgt" | `MemberBadgeHighlights` folgt in Plan 05 | Plan 05 |
| Beiträge-Sektion | `page.tsx` Z. 138 | `EmptyState` ohne Contribution-Filter | Filterbare Timeline folgt in Plan 05 | Plan 05 |

Diese Stubs verhindern das Planziel nicht — die Sektions-Scroll-Seite ist korrekt strukturiert und alle Anker sind stabil. Plan 05 wird die Inhalte füllen.

---

## Threat Flags

| Flag | Datei | Beschreibung |
|------|-------|-------------|
| Keine neuen | — | Story rendert ausschließlich via RichTextRenderer (T-74-04-XSS mitigiert); Token nur server-seitig via cookies() (T-74-04-INFO mitigiert); Badges aus DTO (T-74-04-TAMP mitigiert) |

---

## Self-Check

### Erstellte/modifizierte Dateien vorhanden
- `frontend/src/components/profile/deriveKnownFor.ts` — FOUND
- `frontend/src/components/profile/MemberStatusPill.tsx` — FOUND
- `frontend/src/components/profile/MemberProfileMemorialHero.tsx` — FOUND
- `frontend/src/components/profile/MemberSectionNav.tsx` — FOUND
- `frontend/src/components/profile/MemberSectionNav.module.css` — FOUND
- `frontend/src/components/profile/MemberGroupsHistorySection.tsx` — FOUND
- `frontend/src/components/profile/MemberGroupsHistorySection.module.css` — FOUND
- `frontend/src/components/profile/MemberProfileHero.tsx` (erweitert) — FOUND
- `frontend/src/components/profile/profile.module.css` (erweitert) — FOUND
- `frontend/src/app/members/[slug]/page.tsx` (refaktoriert) — FOUND
- `frontend/src/app/members/[slug]/page.module.css` (erweitert) — FOUND

### Commits vorhanden
- `78939012` — feat(74-04): MemberStatusPill + deriveKnownFor + Memorial-Hero-Variante (Task 1) — FOUND
- `f5dad9f9` — feat(74-04): Sektions-Scroll-Seite + Sticky-Nav + Gruppen/Geschichte-Rahmen (Task 2) — FOUND

### Vitest-Ergebnis
```
MemberStatusPill.test.tsx    11 Tests PASSED
MemberProfileHero.test.tsx    5 Tests PASSED  
deriveKnownFor.test.ts        6 Tests PASSED
Gesamt: 22 / 22 PASSED
```

### Typecheck
Grün — einziger Fehler ist `MemberContributionFilters.test.tsx` (pre-existing Wave-0-RED aus Plan 00, out of scope).

## Self-Check: PASSED
