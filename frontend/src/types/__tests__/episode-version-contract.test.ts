import { readFileSync } from 'node:fs'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { getGroupedEpisodes } from '@/lib/api'
import type { GroupedEpisodesResponse, PublicGroupedEpisodesResponse, PublicEpisodeVersion, EpisodeVersionChapterHint, EpisodeVersionEditorContext } from '../episodeVersion'

const openapi = readFileSync(new URL('../../../../shared/contracts/openapi.yaml', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const schema = (name: string) => openapi.split(`    ${name}:\n`)[1]?.split(/\n    \w+:/)[0] ?? ''

describe('episode version public/full contract', () => {
  it('retains the full default overload and narrows only explicit public requests', () => {
    const loadPublic = () => getGroupedEpisodes(1, { projection: 'public' })
    expectTypeOf<ReturnType<typeof getGroupedEpisodes>>().toEqualTypeOf<Promise<GroupedEpisodesResponse>>()
    expectTypeOf(loadPublic).returns.toEqualTypeOf<Promise<PublicGroupedEpisodesResponse>>()
    expectTypeOf<PublicEpisodeVersion>().not.toHaveProperty('media_provider')
    expectTypeOf<PublicEpisodeVersion>().not.toHaveProperty('segment_count')
  })
  it('documents plural groups and every preserved full field', () => {
    const full = schema('EpisodeVersion')
    for (const field of ['variant_id','release_version_id','fansub_groups','covered_episode_numbers','release_version','production_started_on','segment_count','has_segment_asset','duration_seconds','media_provider','media_item_id','crc32','stream_url','created_at','updated_at']) {
      expect(full).toContain(`        ${field}:`)
    }
    expect(full).not.toContain('        fansub_group:')
    expect(full).toContain('variant')
  })
  it('requires stable public episode identity and explicit bounded continuation', () => {
    expect(schema('PublicGroupedEpisode').split('      properties:')[0]).toContain('- episode_id')
    for (const field of ['has_more','next_cursor','row_limit']) expect(schema('PublicGroupedEpisodesPagination')).toContain(`        ${field}:`)
    expect(schema('PublicEpisodeVersion')).not.toContain('        media_provider:')
    expect(schema('PublicEpisodeVersion')).not.toContain('        segment_count:')
    expect(schema('GroupedEpisode').split('      properties:')[0]).not.toContain('- default_version_id')
  })
})


describe('selected-file chapter display contract', () => {
  it('documents bounded nullable hints and explicit millisecond adoption', () => {
    expectTypeOf<EpisodeVersionChapterHint>().toEqualTypeOf<{ name: string | null; start_ms: number }>()
    expectTypeOf<EpisodeVersionEditorContext>().toHaveProperty('selected_file')
    expect(schema('EpisodeVersionEditorContext')).toContain('        selected_file:')
    expect(schema('EpisodeVersionEditorContext')).toContain('Contributor allowlist')
    expect(schema('EpisodeVersionMediaFile')).toContain('maxItems: 256')
    expect(schema('EpisodeVersionMediaFile')).toContain('Omitted means not requested')
    expect(schema('EpisodeVersionChapterHint')).toContain('required: [name, start_ms]')
    expect(schema('EpisodeVersionChapterHint')).toContain('Math.round(start_ms / 1000)')
  })
})
