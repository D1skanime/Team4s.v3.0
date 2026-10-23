import { describe, expect, it } from 'vitest'

import { isEligibleForContributions } from './contributionsEligibility'

// D-06/D-09/D-12: dieselbe Berechtigungspruefung gilt fuer den bestehenden "Hinweis
// senden"-Knopf (/me/contributions) UND den neuen "Fehler melden"-Einstiegspunkt (Plan
// 191-18) -- beide duerfen nur fuer ein Mitglied mit verifiziertem Mitgliedsprofil UND
// echter Projekt-Zuordnung sichtbar/erreichbar sein.
describe('isEligibleForContributions', () => {
  it('ist false fuer null (kein Profil geladen)', () => {
    expect(isEligibleForContributions(null)).toBe(false)
  })

  it('ist false, wenn has_member_profile fehlt', () => {
    expect(
      isEligibleForContributions({ has_member_profile: false, has_project_assignments: true }),
    ).toBe(false)
  })

  it('ist false, wenn has_project_assignments fehlt', () => {
    expect(
      isEligibleForContributions({ has_member_profile: true, has_project_assignments: false }),
    ).toBe(false)
  })

  it('ist true, wenn beide Flags gesetzt sind', () => {
    expect(
      isEligibleForContributions({ has_member_profile: true, has_project_assignments: true }),
    ).toBe(true)
  })
})
