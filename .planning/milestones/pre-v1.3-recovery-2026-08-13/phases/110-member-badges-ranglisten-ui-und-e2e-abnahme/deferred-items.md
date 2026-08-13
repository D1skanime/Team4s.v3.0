# Zurückgestellte Punkte — Phase 110 Plan 03

## Pre-existing Testfehler, ausserhalb des Scopes von Plan 110-03

**Gefunden während:** Verifikation (`npm run test -- profile`, breiter Regressionslauf nach beiden Tasks)
**Betroffene Tests:**
- `MemberContributionFilters (GAP-1 / GAP-2) > zeigt einen Empty-State, wenn der Filter alles ausblendet`
- `MyProfilePage > reuses the retained background source when editing the existing crop`

**Ursache:** Beide Testdateien (`MemberContributionFilters`-Testsuite und `frontend/src/app/me/profile/page.test.tsx`)
wurden von Plan 110-03 nicht angefasst (bestätigt via `git diff --stat` gegen beide Commits dieses Plans — nur
`OwnHiddenProfilePreview.tsx`, `page.test.tsx` unter `members/[slug]`, `MemberBadgeChain.test.tsx` und
`MemberProfileHero.tsx` wurden geändert). Die Fehler betreffen Beitrags-Filter-Empty-States bzw. Avatar/
Hintergrund-Crop-Verhalten — inhaltlich unabhängig von `total_points` (D-02) und den Rollen-Einstiegs-Badges (D-03).

**Aktion:** Außerhalb des Scopes von Plan 110-03; nicht angefasst, kein Build erneut ausgeführt in der Hoffnung,
dass sie sich von selbst lösen.
**Fix-Plan:** Eigener Follow-up-Quick-Task zur Untersuchung von `MemberContributionFilters`-Empty-State-Logik und
dem Crop-Wiederverwendungs-Test in `page.test.tsx` (`me/profile`).
