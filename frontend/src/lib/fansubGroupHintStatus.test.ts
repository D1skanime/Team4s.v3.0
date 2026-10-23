import { describe, expect, it } from 'vitest'

import { hintStatusLabel, hintStatusVariant } from './fansubGroupHintStatus'

// 191-23/D-18: Wahrheitstabelle ueber alle drei fansub_group_hints-Status fuer beide
// Funktionen -- dieselbe Logik-Test-Konvention wie contributionsEligibility.test.ts
// (Plan 191-17), die diese Extraktion als Vorbild nimmt. Beweist, dass die aus
// FansubGroupHintsAdminClient.tsx extrahierte Zuordnung byte-identisch erhalten bleibt
// und die neue, zusaetzliche Verwendung in MyProposalsSection.tsx (Plan 191-23) dieselbe
// einzige Quelle nutzt statt eine zweite, abweichende Status-Label-Zuordnung zu erfinden.
describe('hintStatusLabel', () => {
  it('ist "Offen" fuer status=open', () => {
    expect(hintStatusLabel('open')).toBe('Offen')
  })

  it('ist "Bestätigt" fuer status=acknowledged', () => {
    expect(hintStatusLabel('acknowledged')).toBe('Bestätigt')
  })

  it('ist "Abgelehnt" fuer status=rejected', () => {
    expect(hintStatusLabel('rejected')).toBe('Abgelehnt')
  })
})

describe('hintStatusVariant', () => {
  it('ist "warning" fuer status=open', () => {
    expect(hintStatusVariant('open')).toBe('warning')
  })

  it('ist "success" fuer status=acknowledged', () => {
    expect(hintStatusVariant('acknowledged')).toBe('success')
  })

  it('ist "danger" fuer status=rejected', () => {
    expect(hintStatusVariant('rejected')).toBe('danger')
  })
})
