---
phase: 73-public-fansub-page-fansubs-slug-erweitern
plan: "12"
type: execute
subsystem: frontend
tags: [gap-closure, fansub, uat-fix, collaboration, leader-timeline]
dependency_graph:
  requires: ["73-11"]
  provides: ["UAT-16-fix", "UAT-7-Lead-fix"]
  affects:
    - frontend/src/app/fansubs/[slug]/page.tsx
    - frontend/src/components/fansubs/FansubHeroSection.tsx
    - frontend/src/components/fansubs/GroupLeaderTimeline.tsx
tech_stack:
  added: []
  patterns:
    - "Dedizierter Kollaboration-API-Aufruf nur im collaboration-Branch (kein API-Spam für reguläre Gruppen)"
    - "Frontend-Fallback ohne Backend-Änderung: Lead aus domainProjection.members synthetisch abgeleitet"
key_files:
  created: []
  modified:
    - frontend/src/app/fansubs/[slug]/page.tsx
    - frontend/src/components/fansubs/FansubHeroSection.tsx
    - frontend/src/components/fansubs/GroupLeaderTimeline.tsx
decisions:
  - "collaborationMembers als optionaler Prop statt group.collaboration_members — Slug-Endpunkt liefert dieses Feld nicht (omitempty); dedizierter Endpunkt getCollaborationMembers ist die einzige verlässliche Quelle"
  - "fallbackLeads über filter(m => m.roles.includes('fansub_lead')) auf domainProjection.members — kein Backend-Eingriff nötig; effectiveEntries-Logik hält leader_timeline-Einträge als primäre Quelle"
metrics:
  duration: "6min"
  completed_date: "2026-06-07"
  tasks: 2
  files: 3
---

# Phase 73 Plan 12: UAT-16 + UAT-7-Lead Gap-Closure Summary

**One-liner:** Kollaborations-Gruppen via dediziertem API-Endpunkt geladen und Gruppenleitung-Fallback aus domainProjection.members synthetisiert.

## Was wurde gebaut

Zwei verbleibende UAT-Befunde aus Round 2 behoben:

**UAT-16 (minor):** Kollaborations-Seite `/fansubs/animeownage-project-messiah` (id=92) zeigte "Keine Gruppenangaben hinterlegt." obwohl DB `fansub_collaboration_members(92)` die Gruppen 88 und 89 enthält. Root Cause: `FansubHeroSection` las `group.collaboration_members`; der Slug-Endpunkt liefert dieses Feld nicht (`omitempty`). Fix: `page.tsx` ruft im Kollaboration-Branch zusätzlich `getCollaborationMembers(group.id)` auf und übergibt das Ergebnis als neuen Prop `collaborationMembers` an `FansubHeroSection`. Die vier regulären API-Aufrufe feuern im Kollaboration-Branch weiterhin nicht.

**UAT-7-Lead (minor):** Gruppenleitung-Sektion war leer trotz Ballelboy=fansub_lead. Root Cause: `contributions.leader_timeline=[]` vom Backend. Fix: Frontend-Fallback ohne Backend-Änderung — `GroupLeaderTimeline` erhält `fallbackLeads`-Prop, das aus `domainProjection.members` mit Rolle `'fansub_lead'` synthetisch abgeleitet wird. `effectiveEntries = entries.length > 0 ? entries : (fallbackLeads ?? [])` sorgt dafür, dass `leader_timeline`-Einträge weiterhin Vorrang haben.

## Tasks

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 | page.tsx — Kollaboration-Branch lädt collaboration-members; Lead-Fallback | 225f99e8 | page.tsx |
| 2 | FansubHeroSection + GroupLeaderTimeline — neue Props verdrahten | dfa3ccd1 | FansubHeroSection.tsx, GroupLeaderTimeline.tsx |

## Deviations from Plan

None — Plan wurde exakt wie beschrieben umgesetzt.

## Known Stubs

None — beide Felder sind echte Datenbindungen. `collaborationMembers` kommt von `getCollaborationMembers`; `fallbackLeads` kommt von `domainProjection.members`.

## Threat Flags

Keine neuen Trust Boundaries eingeführt jenseits der im Threat Model dokumentierten (T-73-12-01 bis T-73-12-SC alle `accept`). `getCollaborationMembers` liefert nur öffentliche `FansubGroupSummary`-Daten.

## Self-Check: PASSED

- FOUND: frontend/src/app/fansubs/[slug]/page.tsx
- FOUND: frontend/src/components/fansubs/FansubHeroSection.tsx
- FOUND: frontend/src/components/fansubs/GroupLeaderTimeline.tsx
- FOUND: 225f99e8 (Task 1 commit)
- FOUND: dfa3ccd1 (Task 2 commit)
- tsc --noEmit: 0 Fehler
