/**
 * Phase 146, Success Criterion 4 (Gaps-Nachtrag nach 146-VERIFICATION.md): die drei
 * Baseline-Action-Codes haben eine einzige autoritative Quelle
 * (permissions.MembershipBaselineActionCodes in backend/internal/permissions/permissions.go);
 * verbleibende Verwendungen müssen sich davon ableiten ODER durch einen Test gegen
 * Auseinanderdriften gesichert sein. RoleCapabilityDetail.tsx dupliziert die 3 Codes bewusst als
 * eigenständiges TS-Literal (146-REVIEW.md WR-03; die vom Review vorgeschlagene serverseitige
 * `protected`-Feld-Ableitung wurde als eigener Backend-Contract-Umbau bewusst aus dem Fix-Pass
 * ausgeklammert).
 *
 * Dieser Test vergleicht zwei Wertelisten aus zwei Sprachen auf Gleichheit -- er behauptet kein
 * Verhalten aus Quelltext heraus, sondern bricht absichtlich, sobald jemand eine Seite ändert,
 * ohne die andere nachzuziehen. Liest `/backend/internal/permissions/permissions.go` über den in
 * docker-compose.override.yml etablierten `./backend:/backend:ro`-Mount des Frontend-Containers
 * (gleiches Muster wie bestehende Tests, die z. B. Fixture-Manifeste repo-root-relativ lesen).
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { membershipBaselineCodesForTest } from './RoleCapabilityDetail'

const BACKEND_PERMISSIONS_GO_PATH = '/backend/internal/permissions/permissions.go'

describe('membershipBaselineCodes anti-drift', () => {
  it('matches permissions.MembershipBaselineActionCodes in the Go source exactly', () => {
    const source = readFileSync(BACKEND_PERMISSIONS_GO_PATH, 'utf-8')

    const varMatch = source.match(
      /var MembershipBaselineActionCodes = \[\]Action\{([^}]+)\}/
    )
    expect(
      varMatch,
      'MembershipBaselineActionCodes variable declaration must be findable in permissions.go -- if it was renamed or restructured, update this test\'s extraction pattern, not just skip it'
    ).not.toBeNull()

    const identifiers = varMatch![1].split(',').map((s) => s.trim())
    expect(identifiers.length).toBeGreaterThan(0)

    const goCodes = identifiers.map((identifier) => {
      const constMatch = source.match(
        new RegExp(`${identifier}\\s+Action\\s*=\\s*"([^"]+)"`)
      )
      expect(
        constMatch,
        `could not resolve Go constant ${identifier} to its string value`
      ).not.toBeNull()
      return constMatch![1]
    })

    const frontendCodes = Array.from(membershipBaselineCodesForTest)

    expect([...frontendCodes].sort()).toEqual([...goCodes].sort())
  })
})
