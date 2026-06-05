import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const pageSource = readFileSync(new URL('../[slug]/page.tsx', import.meta.url), 'utf8')

describe('fansub public page', () => {
  it('lädt Gruppenmedien mit dem kanonischen Phase-72 owner type', () => {
    expect(pageSource).toContain("getMediaOwnershipProjection('fansub_group', group.id)")
    expect(pageSource).not.toContain("getMediaOwnershipProjection('group', group.id)")
  })
})
