import { readFileSync } from 'node:fs'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type { AnimeDetail, AnimeRelation, AnimeRelationsResponse } from '../anime'

const openapi = readFileSync(new URL('../../../../shared/contracts/openapi.yaml', import.meta.url), 'utf8')
  .replace(/\r\n/g, '\n')
const detailSchema = openapi.split('    AnimeDetail:\n')[1]?.split('\n    AnimeDetailResponse:')[0] ?? ''
const relationSchema = openapi.split('    AnimeRelation:\n')[1]?.split('\n    AnimeRelationsResponse:')[0] ?? ''
const relationsEndpoint = openapi.split('  /api/v1/anime/{id}/relations:\n')[1]?.split('\n  /')[0] ?? ''

describe('public anime detail contract (158-01)', () => {
  const withoutSlug: AnimeDetail = {
    id: 1,
    title: 'A Different Display Title',
    type: 'tv',
    content_type: 'anime',
    status: 'ongoing',
    view_count: 0,
    episodes: [],
  }

  it('accepts both the legacy response and an authoritative stored slug', () => {
    const withSlug: AnimeDetail = { ...withoutSlug, slug: 'authoritative-route' }
    expectTypeOf<AnimeDetail['slug']>().toEqualTypeOf<string | undefined>()
    expect(withoutSlug).not.toHaveProperty('slug')
    expect(withSlug.slug).toBe('authoritative-route')
    expect(withSlug.title).toBe(withoutSlug.title)
  })

  it('documents slug as an optional nonempty string, omitted when unavailable', () => {
    const required = detailSchema.split('      properties:')[0]
    const slug = detailSchema.match(/\n        slug:\n([\s\S]*?)(?=\n        [a-z_]+:|$)/)?.[1] ?? ''
    expect(required).not.toMatch(/- slug\b/)
    expect(slug).toContain('type: string')
    expect(slug).toContain('minLength: 1')
    expect(slug).not.toContain('nullable: true')
    expect(slug).toContain('stored')
  })

  it('preserves the complete relation payload including nullable cover and year', () => {
    const relation: AnimeRelation = {
      anime_id: 4, title: 'Related Anime', relation_type: 'sequel',
      cover_image: null, year: null, type: 'tv',
    }
    const response: AnimeRelationsResponse = { data: [relation] }
    expect(response.data[0]).toEqual(relation)
    expectTypeOf<AnimeRelation['cover_image']>().toEqualTypeOf<string | null>()
    expectTypeOf<AnimeRelation['year']>().toEqualTypeOf<number | null>()
    for (const key of Object.keys(relation)) {
      expect(relationSchema).toContain('        ' + key + ':')
      expect(relationSchema.split('      properties:')[0]).toContain('- ' + key)
    }
    expect(relationSchema.match(/nullable: true/g)).toHaveLength(2)
    expect(openapi).toContain('    AnimeRelationsResponse:')
    expect(openapi).toContain('$ref: "#/components/schemas/AnimeRelation"')
  })

  it('documents the existing public relations endpoint and all status branches', () => {
    expect(relationsEndpoint).toContain('operationId: getAnimeRelations')
    expect(relationsEndpoint).toContain('security: []')
    expect(relationsEndpoint).toContain('minimum: 1')
    for (const status of ['200', '400', '404', '500']) {
      expect(relationsEndpoint).toContain('"' + status + '":')
    }
    expect(relationsEndpoint).toContain('$ref: "#/components/schemas/AnimeRelationsResponse"')
    expect(relationsEndpoint).toContain('ungültige anime-id')
    expect(relationsEndpoint).toContain('anime nicht gefunden')
    expect(relationsEndpoint).toContain('interner fehler')
    expect(relationsEndpoint).toContain('relationen konnten nicht geladen werden')
  })
})
