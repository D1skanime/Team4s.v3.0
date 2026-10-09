import { describe, expect, it } from 'vitest'

import type { ProjectMemberMediaItem } from '@/types/projectMember'

import { toProjectMemberLightboxItem } from './projectMemberMediaMapping'

function makeItem(overrides: Partial<ProjectMemberMediaItem> = {}): ProjectMemberMediaItem {
  return {
    id: 1,
    media_asset_id: 10,
    category: 'screenshot',
    title: null,
    caption: null,
    episode_label: '01',
    release_version_label: 'v1',
    release_version_id: 5,
    created_at: '2020-01-01T00:00:00Z',
    thumbnail_url: 'https://example.test/thumb.jpg',
    preview_url: 'https://example.test/preview.jpg',
    ...overrides,
  }
}

describe('toProjectMemberLightboxItem', () => {
  it('löst media_type über CATEGORY_LABELS auf, wenn die Kategorie bekannt ist', () => {
    const item = makeItem({ category: 'screenshot' })

    const result = toProjectMemberLightboxItem(item, '/csubs/some-anime')

    expect(result.media_type).toBe('Fansub Screenshot')
  })

  it('fällt auf den rohen Kategoriewert zurück, wenn die Kategorie unbekannt ist', () => {
    const item = makeItem({ category: 'unknown_custom_category' })

    const result = toProjectMemberLightboxItem(item, '/csubs/some-anime')

    expect(result.media_type).toBe('unknown_custom_category')
  })

  it('baut release_href exakt als `${projectPath}/releases/${release_version_id}`', () => {
    const item = makeItem({ release_version_id: 42 })

    const result = toProjectMemberLightboxItem(item, '/csubs/some-anime')

    expect(result.release_href).toBe('/csubs/some-anime/releases/42')
  })

  it('setzt display_url immer auf undefined, unabhängig von der Eingabe', () => {
    const item = makeItem()

    const result = toProjectMemberLightboxItem(item, '/csubs/some-anime')

    expect(result.display_url).toBeUndefined()
  })

  it('mappt die übrigen Felder unverändert bzw. 1:1 durch', () => {
    const item = makeItem({
      id: 7,
      title: 'Ein Titel',
      caption: 'Eine Beschreibung',
      thumbnail_url: 'https://example.test/thumb-7.jpg',
      preview_url: 'https://example.test/preview-7.jpg',
      category: 'fun_outtake',
      episode_label: '03',
      release_version_label: 'v2',
      release_version_id: 9,
    })

    const result = toProjectMemberLightboxItem(item, '/csubs/some-anime')

    expect(result).toMatchObject({
      id: 7,
      title: 'Ein Titel',
      caption: 'Eine Beschreibung',
      original_url: 'https://example.test/preview-7.jpg',
      thumbnail_url: 'https://example.test/thumb-7.jpg',
      category: 'fun_outtake',
      episode_label: '03',
      release_version_label: 'v2',
      release_href: '/csubs/some-anime/releases/9',
    })
  })
})
