import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

// Routing-Regression (Brief 30 / Akzeptanz 2): der Link-Change ist strikt auf ProjectMemberRows
// beschränkt. Alle anderen Member-Links (Rangliste, Archiv) MÜSSEN weiterhin auf /members/[slug]
// zeigen und dürfen die Projekt-Member-Route (/mitwirkende/) NICHT verwenden. Quelltext-Assertion
// relativ zu process.cwd() (= /app im Frontend-Container).
const read = (path: string): string => readFileSync(path, 'utf-8')

describe('Member-Link Routing-Regression (Phase 122)', () => {
  it('Rangliste behält /members/[slug]-Links (keine Projekt-Member-Route)', () => {
    const src = read('src/app/members/ranking/page.tsx')
    expect(src).toContain('/members/${row.slug}')
    expect(src).not.toContain('/mitwirkende/')
  })

  it('Archiv-Membersuche behält /members/[slug]-Links', () => {
    const src = read('src/components/archive/MemberSearchCard.tsx')
    expect(src).toContain('/members/${slug}')
    expect(src).not.toContain('/mitwirkende/')
  })

  it('nur ProjectMemberRows baut die Projekt-Member-Route', () => {
    const rows = read('src/components/fansubs/ProjectMemberRows.tsx')
    expect(rows).toContain('/mitwirkende/')
    // Fallback auf das allgemeine Profil bleibt erhalten
    expect(rows).toContain('/members/')
  })
})
