import { describe, expect, it } from 'vitest'

import { buildReleaseEditorRedirects } from './releaseEditorRedirects.mjs'

describe('buildReleaseEditorRedirects', () => {
  it('returns exactly one permanent redirect from the retired workspace route to the editor', () => {
    const redirects = buildReleaseEditorRedirects()

    expect(redirects).toHaveLength(1)
    expect(redirects[0]).toEqual({
      source: '/me/releases/:versionId/workspace',
      destination: '/admin/episode-versions/:versionId/edit',
      permanent: true,
    })
  })
})
