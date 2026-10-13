// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { buildReleaseEditorRedirects } from './releaseEditorRedirects'

describe('buildReleaseEditorRedirects (D-01/D-04)', () => {
  it('leitet die alte Admin-Adresse dauerhaft auf die neue Release-Route weiter', () => {
    const rules = buildReleaseEditorRedirects()
    expect(rules).toContainEqual({
      source: '/admin/episode-versions/:versionId/edit',
      destination: '/releases/:versionId/edit',
      permanent: true,
    })
  })

  it('leitet die alte Workspace-Adresse dauerhaft auf die neue Release-Route weiter', () => {
    const rules = buildReleaseEditorRedirects()
    expect(rules).toContainEqual({
      source: '/me/releases/:versionId/workspace',
      destination: '/releases/:versionId/edit',
      permanent: true,
    })
  })

  it('enthaelt genau 2 Redirect-Regeln (kein versehentlicher dritter Eintrag)', () => {
    const rules = buildReleaseEditorRedirects()
    expect(rules).toHaveLength(2)
  })
})
