import { describe, expect, it } from 'vitest'

import { buildEmptyAreaLabels, hasStoryContent } from '../[slug]/page'
import type { DomainProjectionResponse } from '@/types/domain-projection'
import type { PublicGroupContributionsResponse } from '@/types/contributions'
import type { FansubGroup, PublicFansubProfile, PublicFansubStory } from '@/types/fansub'

const baseGroup: FansubGroup = {
  id: 1,
  slug: 'test-fansub',
  name: 'Test Fansub',
  status: 'active',
  anime_relations_count: 0,
  release_versions_count: 0,
  members_count: 0,
  aliases_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const emptyProfile: PublicFansubProfile = {
  group: baseGroup,
  story: null,
  projects: [],
  history: [],
  media: [],
  community_links: [],
}

const emptyDomainProjection: DomainProjectionResponse = {
  members: [],
  historical: [],
  contributors: [],
}

const emptyContributions: PublicGroupContributionsResponse = {
  leader_timeline: [],
  anime_count: 0,
  member_count: 0,
}

describe('hasStoryContent', () => {
  it('liefert false wenn keine Story vorhanden ist', () => {
    expect(hasStoryContent(null)).toBe(false)
  })

  it('liefert false bei Story ohne Titel/Text/HTML', () => {
    const story: PublicFansubStory = { id: 1, title: '', body_html: '', body_text: '' }
    expect(hasStoryContent(story)).toBe(false)
  })

  it('liefert true wenn body_html befuellt ist', () => {
    const story: PublicFansubStory = { id: 1, title: '', body_html: '<p>Inhalt</p>', body_text: '' }
    expect(hasStoryContent(story)).toBe(true)
  })

  it('liefert true wenn nur der Titel befuellt ist', () => {
    const story: PublicFansubStory = { id: 1, title: 'Unsere Geschichte', body_html: '', body_text: '' }
    expect(hasStoryContent(story)).toBe(true)
  })
})

describe('buildEmptyAreaLabels', () => {
  it('listet alle vier Leer-Bereiche bei vollstaendig leerem Profil', () => {
    const labels = buildEmptyAreaLabels(emptyProfile, emptyDomainProjection, emptyContributions)

    expect(labels).toContain('Laufende Projekte')
    expect(labels).toContain('Team')
    expect(labels).toContain('Geschichte')
    expect(labels).toContain('Erfolge')
    expect(labels).toContain('Externe Mitwirkende')
    expect(labels).toContain('Medien')
    expect(labels).toContain('Gruppenleitung')
    expect(labels).toContain('Mehr')
  })

  it('entfernt "Laufende Projekte" sobald Projekte vorhanden sind, laesst andere Leer-Labels stehen', () => {
    const profile: PublicFansubProfile = {
      ...emptyProfile,
      projects: [
        {
          id: 1,
          title: 'Beispielprojekt',
          type: 'anime',
          status: 'ongoing',
        },
      ],
    }

    const labels = buildEmptyAreaLabels(profile, emptyDomainProjection, emptyContributions)

    expect(labels).not.toContain('Laufende Projekte')
    expect(labels).toContain('Team')
    expect(labels).toContain('Geschichte')
    expect(labels).toContain('Erfolge')
  })

  it('laesst "Mehr" weg wenn community_links vorhanden sind, auch ohne website_url (AO5-03)', () => {
    const profile: PublicFansubProfile = {
      ...emptyProfile,
      community_links: [
        { id: 1, group_id: 1, link_type: 'discord', name: null, url: 'https://discord.test', created_at: '2026-01-01T00:00:00Z' },
      ],
    }

    const labels = buildEmptyAreaLabels(profile, emptyDomainProjection, emptyContributions)

    expect(labels).not.toContain('Mehr')
  })

  it('fuehrt "Mehr" wenn weder website_url noch community_links vorhanden sind', () => {
    const labels = buildEmptyAreaLabels(emptyProfile, emptyDomainProjection, emptyContributions)

    expect(labels).toContain('Mehr')
  })

  it('liefert leere Liste wenn alle Bereiche befuellt sind', () => {
    const profile: PublicFansubProfile = {
      group: { ...baseGroup, website_url: 'https://example.test' },
      story: { id: 1, title: 'Titel', body_html: '<p>Text</p>', body_text: 'Text' },
      projects: [{ id: 1, title: 'Projekt', type: 'anime', status: 'ongoing' }],
      history: [{ id: 1, event_type: 'award', status: 'public' }],
      media: [{ id: 1, media_type: 'image', mime_type: 'image/png', category: 'other' }],
      community_links: [],
    }
    const domainProjection: DomainProjectionResponse = {
      members: [
        {
          id: 1,
          member_id: 1,
          member_display_name: 'Mitglied',
          member_slug: 'mitglied',
          roles: ['translator'],
          role_labels: ['Übersetzung'],
          status: 'active',
          profile_status: 'active',
          claimed: true,
        },
      ],
      historical: [],
      contributors: [
        {
          id: 1,
          anime_id: 1,
          anime_title: 'Anime',
          member_id: 1,
          member_display_name: 'Mitglied',
          member_slug: 'mitglied',
          roles: ['contributor'],
          role_labels: ['Mitwirkender'],
          started_year: 2020,
          ended_year: null,
          status: 'active',
          dispute_state: 'none',
          visibility: 'public',
          review_status: 'approved',
        },
      ],
    }
    const contributions: PublicGroupContributionsResponse = {
      leader_timeline: [
        {
          member_display_name: 'Mitglied',
          member_slug: 'mitglied',
          role_code: 'leader',
          role_label: 'Leitung',
          started_year: 2020,
          ended_year: null,
          status: 'active',
        },
      ],
      anime_count: 1,
      member_count: 1,
    }

    const labels = buildEmptyAreaLabels(profile, domainProjection, contributions)

    expect(labels).toEqual([])
  })
})
