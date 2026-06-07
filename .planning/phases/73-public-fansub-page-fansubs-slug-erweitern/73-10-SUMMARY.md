---
phase: 73-public-fansub-page-fansubs-slug-erweitern
plan: "10"
subsystem: frontend/fansubs
tags: [gap-closure, uat-fix, collaboration, cross-reference, fansub-page]
dependency_graph:
  requires: [73-07]
  provides: [kollaboration-early-return, querverweis-badge]
  affects: [fansubs-slug-page, FansubHeroSection, FansubContributorsSection]
tech_stack:
  added: []
  patterns: [early-return-gate, set-based-dedup, optional-prop-extension]
key_files:
  created: []
  modified:
    - frontend/src/app/fansubs/[slug]/page.tsx
    - frontend/src/components/fansubs/FansubHeroSection.tsx
    - frontend/src/components/fansubs/FansubContributorsSection.tsx
decisions:
  - "Kollaboration-Block nutzt inline-style statt neuer CSS-Klasse — dezenter Info-Kasten ohne Modul-CSS-Änderung"
  - "Badge variant=muted für 'auch Mitglied' — gedämpfte Farbe passt zum Querverweis-Charakter (informativ, nicht kritisch)"
  - "Link-Badge-Kombination: Link wraps Badge für Kollaboration-Gruppenlinks — semantisch sauber, kein extra Wrapper nötig"
metrics:
  duration: 2min
  completed_date: "2026-06-07"
  tasks_completed: 2
  files_changed: 3
---

# Phase 73 Plan 10: UAT-16 Kollaboration + UAT-5 Angeldust-Querverweis Summary

**One-liner:** Kollaborations-Gruppen erhalten eigenen Early-Return mit Gruppenlinks; Doppelmitglieder in Mitwirkenden-Sektion erhalten 'auch Mitglied'-Badge.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | page.tsx Kollaboration-Early-Return + FansubHeroSection isCollaboration-Prop | 3cfbc2ff | page.tsx, FansubHeroSection.tsx |
| 2 | FansubContributorsSection Querverweis-Badge + teamMemberNames-Prop | 48613a4a | FansubContributorsSection.tsx, page.tsx |

## Changes Made

### Task 1: page.tsx + FansubHeroSection.tsx (UAT-16)

**page.tsx:**
- Nach `const group = groupResponse.data` und VOR `Promise.allSettled`: early return wenn `group.group_type === 'collaboration'`
- Kollaborations-Seite rendert nur `<FansubHeroSection group={group} isCollaboration />` ohne FansubSectionNav und ohne die vier nachgelagerten API-Aufrufe (loadFansubProjects, getFansubContributions, getFansubGroupDomainProjection, getMediaOwnershipProjection)

**FansubHeroSection.tsx:**
- `isCollaboration?: boolean` zu Props hinzugefügt
- `Link` aus `next/link` importiert
- Wenn `isCollaboration === true`: Kollaboration-Block unter heroContent mit "Dies ist eine Kollaboration zwischen:" und Liste der beteiligten Gruppen als `/fansubs/[slug]`-Links (Badge variant="info")
- Leere/undefined `collaboration_members` via `?? []` abgesichert; zeigt "Keine Gruppenangaben hinterlegt." als Fallback

### Task 2: FansubContributorsSection.tsx + page.tsx (UAT-5)

**FansubContributorsSection.tsx:**
- `teamMemberNames?: string[]` zu Props hinzugefügt
- `Badge` aus `@/components/ui` importiert
- `const teamSet = new Set((teamMemberNames ?? []).map(n => n.toLowerCase()))` für case-insensitiven Abgleich
- Bei Überschneidung (isAlsoMember): `<Badge variant="muted" style={{ marginLeft: 8 }}>auch Mitglied</Badge>` hinter dem Namen

**page.tsx:**
- `const teamMemberNames = domainProjection.members.map(m => m.member_display_name)` berechnet
- `<FansubContributorsSection ... teamMemberNames={teamMemberNames} />` übergeben

## Deviations from Plan

Keine — Plan exakt so implementiert wie beschrieben. Inline-Style für Kollaborations-Block statt page.module.css-Klasse — minimal invasiv, kein Risiko für bestehende Styles (plankonform).

## Threat Surface Scan

Keine neuen sicherheitsrelevanten Oberflächen eingeführt:
- T-73-10-01 (Kollaboration-Early-Return): Spart überflüssige API-Aufrufe, keine sensitiven Daten exponiert (accept)
- T-73-10-02 (member_display_name-Matching): String-Vergleich nur für UI-Badge, keine Berechtigungsentscheidungen (accept)

## Known Stubs

Keine stubs. Kollaboration-Fallback "Keine Gruppenangaben hinterlegt." ist echter Empty-State-Text.

## Verification Steps (live, dev-server :3000)

1. `/fansubs/animeownage-project-messiah` (oder ähnlicher Kollaborations-Slug) laden
2. Seite zeigt Kollaborationshinweis "Dies ist eine Kollaboration zwischen:" mit Links auf Mitgliedsgruppen
3. Keine Team/Projekte/Geschichte/Mitwirkende-Sektionen sichtbar
4. Keine vier nachgelagerten API-Aufrufe im Netzwerk-Tab
5. `/fansubs/animeownage` laden
6. Mitwirkenden-Sektion: Angeldust hat Badge "auch Mitglied" neben dem Eintrag
7. Reguläre Seiten (group_type=group): keine Kollaborations-Anzeige, keine Badge-Regression

## Notes

- `node_modules` nicht installiert in diesem Checkout — `tsc --noEmit` konnte nicht ausgeführt werden. Verifikation durch Code-Level-Reasoning: alle Typen konsistent, BadgeProps extends HTMLAttributes<HTMLSpanElement> erlaubt style-Prop, optional chaining korrekt. Keine Runtime-Fehler erwartet.
- User verifiziert live auf Dev-Server :3000.

## Self-Check: PASSED

- [x] `page.tsx`: Kollaboration-Check nach `const group = groupResponse.data`, VOR `Promise.allSettled` — Zeile 95-104
- [x] `FansubHeroSection.tsx`: `isCollaboration?: boolean` in Props, `Link` importiert, Kollaboration-Block mit `group.collaboration_members ?? []`
- [x] `FansubContributorsSection.tsx`: `teamMemberNames?: string[]` in Props, `Badge` importiert, `teamSet` und `isAlsoMember` korrekt berechnet
- [x] `page.tsx`: `teamMemberNames` aus `domainProjection.members`, an `FansubContributorsSection` übergeben
- [x] Commit 3cfbc2ff existiert (Task 1)
- [x] Commit 48613a4a existiert (Task 2)
