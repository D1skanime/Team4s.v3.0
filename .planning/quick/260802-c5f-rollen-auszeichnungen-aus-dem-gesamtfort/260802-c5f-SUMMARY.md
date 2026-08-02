---
phase: quick-rollen-auszeichnungen-aus-dem-gesamtfort
plan: 260802-c5f
status: complete
subsystem: ui
tags: [react, nextjs, vitest, profile, badges]
requires:
  - phase: 112-member-badges
    provides: Öffentliche Badge-Gruppierung und Rollen-Stufenketten
provides:
  - Allgemeiner Auszeichnungsfortschritt ohne Rollen-Badges
  - Verdienstbasierte Rollenanzeige mit vollständiger Fünferkette
  - Neutrale Rollenanzahl mit korrektem Singular und Plural
affects: [public-member-profile, member-badges]
tech-stack:
  added: []
  patterns: [earned badges as sole role visibility source]
key-files:
  created: []
  modified:
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
    - frontend/src/app/members/[slug]/page.tsx
key-decisions:
  - "Sichtbare Rollen werden ausschließlich aus öffentlichen verdienten Rollen-Badges abgeleitet."
  - "Der allgemeine Fortschritt verwendet nur Katalogeinträge außerhalb der Rollen-Gruppe."
patterns-established:
  - "Eine verdiente Rolle filtert ganze fremde Rollenzeilen aus, behält aber ihre eigene vollständige Einstieg/Bronze/Silber/Gold/Platin-Kette."
requirements-completed: [QUICK-260802-C5F]
duration: 4min
completed: 2026-08-02
---

# Quick 260802-c5f: Rollen-Auszeichnungen aus dem Gesamtfortschritt Summary

**Der öffentliche Badge-Bereich zählt nur allgemeine Auszeichnungen und zeigt ausschließlich tatsächlich verdiente Fansubrollen mit ihrer vollständigen Stufenentwicklung.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-02T08:49:00Z
- **Completed:** 2026-08-02T08:52:46Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Rollen-Einstiege und Rollen-Volumenstufen aus Zähler, Nenner und Balken des allgemeinen Fortschritts entfernt.
- Membership-, Projekt- und Beitragszuordnungen als Quelle sichtbarer Rollen entfernt; öffentliche verdiente Badges sind jetzt die einzige Quelle.
- Für jede verdiente Rolle bleiben Einstieg, Bronze, Silber, Gold und Platin sichtbar, während fremde Rollen vollständig fehlen.
- Regressionen für Trennung, Filterung, Fünferkette und `1 ausgeübte Fansubrolle` / `{n} ausgeübte Fansubrollen` ergänzt.

## Task Commits

1. **Task 1: Lock the separated progress and earned-role behavior with component tests** - `b640747f` (test)
2. **Task 2: Separate general progress from earned role progress in the existing badge chain** - `1a54b193` (feat)

Planmetadaten bleiben gemäß Executor-Auftrag uncommitted für den Root-Agenten.

## Files Created/Modified

- `frontend/src/components/profile/MemberBadgeChain.tsx` - Trennt allgemeine und rollenbezogene Kataloge, filtert Rollen nach Earned-Badges und rendert die Rollenanzahl.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - Prüft getrennten Fortschritt, fremde Rollen, vollständige Stufenkette und Grammatik.
- `frontend/src/app/members/[slug]/page.tsx` - Entfernt zuordnungsbasierte `relevantRoleCodes` und deren Prop-Wiring.

## Decisions Made

- Die vorhandene `MemberBadgeChain`, `buildMemberBadgeGroups` und Präsentationsauflösung bleiben die einzigen Badge-Seams; es wurde kein paralleler Rollen-Helfer eingeführt.
- Eine Rolle wird sichtbar, sobald mindestens ein öffentliches verdientes Badge derselben `roleCode`-Gruppe vorliegt.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run typecheck` wird durch bereits vorhandene generierte `.next/dev/types`-Fehler in mehreren App-Routen blockiert. Die betroffene Member-Page meldet dabei ebenfalls ihre bereits bestehende `params`-Union; diese Signatur wurde in diesem Plan nicht geändert. Der fokussierte Testlauf und ESLint sind grün.
- Das projektlokale `./scripts/gsd-linux.sh` unterstützt in diesem Checkout den erwarteten `query`-Unterbefehl nicht. Ausführung, atomare Commits und Summary wurden deshalb direkt durchgeführt.

## Verification

- `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx` - PASS (40/40)
- `docker compose exec -T team4sv30-frontend npm run lint -- --quiet` - PASS
- `git diff --check` - PASS
- `docker compose exec -T team4sv30-frontend npm run typecheck` - BLOCKED by pre-existing `.next/dev/types` route errors

## Known Stubs

None.

## Threat Review

- T-C5F-01 mitigated: Membership- und Projektzuordnungen werden nicht mehr als gesperrte Rollhinweise offengelegt.
- Keine neue Netzwerk-, Auth-, Datei- oder Schema-Angriffsfläche eingeführt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Implementierung und fokussierte Regressionen sind vollständig; Live-UAT kann auf einem Profil mit einer und einem Profil mit mehreren verdienten Rollen erfolgen.
- Die unabhängigen generierten Next-Typfehler bleiben als bestehendes Repository-Thema offen.

## Self-Check: PASSED

- Alle drei geplanten Dateien sind vorhanden.
- Commits `b640747f` und `1a54b193` sind im kanonischen Linux-Repository vorhanden.
- Keine untracked PATTERNS/REVIEW- oder `role_volume_timer_*.png`-Datei wurde verändert oder gestaged.

---
*Quick task: 260802-c5f*
*Completed: 2026-08-02*
