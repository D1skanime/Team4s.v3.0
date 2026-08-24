---
phase: 139-scalable-user-admin-projections
type: baseline
captured: 2026-08-24T17:15:00Z
captured_before: execute-phase 139
---

# Phase 139 — Ist-Baseline vor der Ausführung

`139-CONTEXT.md` verlangt, den exakten Ist-Stand vor der Ausführung festzuhalten und unveränderte
Alt-Fehler **nicht** Phase 139 anzulasten. Dies ist dieser Stand.

## Frontend

Gemessen im Container (`docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"`):

**45 fehlgeschlagene Tests in 16 Dateien**, 2023 bestanden, 1 übersprungen, 3 todo (2072 gesamt).

Rote Dateien:

| Datei | Anmerkung |
|---|---|
| `src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx` | `useRoleCatalog`-Provider (Phase-136-Schuld) |
| `src/app/admin/fansubs/[id]/edit/page.test.tsx` | dieselbe Ursache |
| `src/app/admin/fansubs/[id]/edit/useGroupMembersTab.test.ts` | dieselbe Ursache |
| `src/app/admin/users/tabs/UserContributionsTab.test.tsx` | **wird von Phase 139 Plan 08 neu geschrieben** — hier besonders sauber trennen |
| `src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx` | ausserhalb 139 |
| `src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx` | ausserhalb 139 |
| `src/app/members/[slug]/page.test.tsx` | ausserhalb 139 |
| `src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx` | ausserhalb 139 |
| `src/components/contributions/ContributionCard.test.tsx` | ausserhalb 139 |
| `src/components/fansubs/projectMember/ProjectMemberReleasesSection.test.tsx` | ausserhalb 139 |
| `src/components/profile/MemberBadgeChain.test.tsx` | Phasen 119/120/127, ausserhalb 139 |
| `src/components/profile/MembershipsSection.test.tsx` | ausserhalb 139 |
| `src/components/public/PublicNoteCard.test.tsx` | ausserhalb 139 |
| `src/components/ui/ResponsiveImage.config.test.ts` | Media-Allowlist, ausserhalb 139 |
| `src/lib/api.no-token-boundary.test.ts` | **wird von Phase 139 berührt** (api.ts-Erweiterungen) — sauber trennen |
| `src/types/__tests__/v12-projection-contract.test.ts` | **wird von Phase 139 berührt** (Typänderungen) — sauber trennen |

Kurz zuvor repariert und deshalb **nicht** mehr in dieser Liste:
`src/components/profile/MemberCurrentProjectsSection.test.tsx` (quick-260824-nmt, veraltete
Rollen-Fixture ohne `icon_key`; Produktionscode war bereits korrekt).

## Backend

Rund 29 fehlgeschlagene Tests im Paket `internal/handlers`, Ursache ist ein nil
`permissions.Service.LoadCache` in `testmain_test.go` (Phase-137-Schuld). Im identischen
golang-Container vor und nach Phase 138 unverändert bei 33 Fehlern gemessen — also stabil und
nicht durch die letzten Phasen verursacht.

## Typprüfung

`npx tsc --noEmit` meldet 4 Fehler:
- 3 in generierten Dev-Typdateien unter `.next/dev/types/` (Artefakte des Dev-Modus)
- 1 in `src/app/admin/changes/ChangeEntryTranslator.test.ts` — `actor_display_name` ist als
  `string | null` deklariert, die Testdaten lassen `undefined` zu. Stammt aus quick-260823-w9y.
  **Offener Kleinauftrag**, blockiert nichts.

## Produktions-Build

`docker compose build team4sv30-frontend` läuft **erfolgreich** durch
(`Image team4s-team4sv30-frontend Built`). Die Typfehler blockieren ihn nicht, weil sie ausserhalb
des Build-Graphen liegen (generierte Dev-Typen bzw. eine Testdatei). `next.config.mjs` hat **kein**
`ignoreBuildErrors` — ein Typfehler in echtem Anwendungscode würde den Build also sehr wohl brechen.

## Regel für die Bewertung von Phase 139

Jeder neue Fehler in einer von Phase 139 berührten Datei ist eine Regression dieser Phase und muss
behoben werden. Unveränderte Fehler aus obiger Liste sind Altlast und werden Phase 139 nicht
angelastet — sie sind aber auch nicht stillschweigend zu ignorieren, sondern im Verifikationsbericht
als bestehende Schuld zu benennen.
