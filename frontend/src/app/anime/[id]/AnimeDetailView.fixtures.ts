import type { AnimeFansubListResponse } from '@/types/fansub'
import type { PublicEpisodeVersion, PublicGroupedEpisode, PublicGroupedEpisodesResponse } from '@/types/episodeVersion'
import type { AnimeDetail, AnimeRelationsResponse } from '@/types/anime'
import { buildFansubStoryGroups } from '@/lib/fansub-summary'

/** Realistische deutsche `AnimeDetail`-Demo-Fixture für Storybook (keine Lorem-ipsum-Platzhalter,
 *  Felder exakt aus `@/types/anime.ts`). */
export function buildAnimeDetailFixture(overrides: Partial<AnimeDetail> = {}): AnimeDetail {
  return {
    id: 1,
    slug: 'fruehlingsblueten-ueber-tokio',
    title: 'Frühlingsblüten über Tokio',
    type: 'tv',
    content_type: 'anime',
    status: 'ongoing',
    year: 2024,
    max_episodes: 24,
    genres: ['Drama', 'Romantik', 'Slice of Life'],
    tags: ['Schule', 'Freundschaft', 'Coming-of-Age'],
    description:
      'Nach dem Umzug in eine neue Stadt findet die schüchterne Hana unerwartete Freundschaften unter den '
      + 'Kirschblüten ihrer neuen Schule -- und ein Geheimnis, das die ganze Nachbarschaft verändert.',
    cover_image: '/covers/placeholder.jpg',
    view_count: 0,
    episodes: [],
    ...overrides,
  }
}

function buildEpisodeVersion(overrides: Partial<PublicEpisodeVersion> = {}): PublicEpisodeVersion {
  return {
    id: 1,
    variant_id: 1,
    release_version_id: 1,
    anime_id: 1,
    episode_number: 1,
    title: null,
    release_version: 'v1',
    video_quality: '1080p',
    subtitle_type: 'softsub',
    release_date: '2024-01-07',
    fansub_groups: [{ id: 1, slug: 'demo-fansub-gruppe', name: 'Demo Fansub-Gruppe' }],
    container: 'mkv',
    video_codec: 'h264',
    has_images: false,
    has_notes: false,
    has_karaoke: false,
    release_name: 'Demo Fansub-Gruppe v1',
    ...overrides,
  }
}

function buildGroupedEpisode(overrides: Partial<PublicGroupedEpisode> = {}): PublicGroupedEpisode {
  return {
    episode_id: 1,
    episode_number: 1,
    episode_title: 'Der erste Kirschblütentag',
    default_version_id: 1,
    version_count: 1,
    versions: [buildEpisodeVersion()],
    filler_type: 'canon',
    episode_type: 'episode',
    filler_type_label: 'Canon',
    episode_type_label: 'Episode',
    ...overrides,
  }
}

/** Normalfall: drei Episoden mit je einer Fansub-Version. */
export const normalGroupedEpisodesResponse: PublicGroupedEpisodesResponse = {
  data: {
    anime_id: 1,
    episodes: [
      buildGroupedEpisode({ episode_id: 1, episode_number: 1, episode_title: 'Der erste Kirschblütentag' }),
      buildGroupedEpisode({
        episode_id: 2,
        episode_number: 2,
        episode_title: 'Ein Geheimnis im Schulgarten',
        versions: [buildEpisodeVersion({ id: 2, variant_id: 2, release_version_id: 2, episode_number: 2 })],
      }),
      buildGroupedEpisode({
        episode_id: 3,
        episode_number: 3,
        episode_title: 'Regen über der Nachbarschaft',
        versions: [buildEpisodeVersion({ id: 3, variant_id: 3, release_version_id: 3, episode_number: 3 })],
      }),
    ],
    episode_count: 3,
    pagination: { has_more: false, next_cursor: null, row_limit: 24 },
  },
}

/** Erfolgreicher Leerzustand: Der Anime ist bekannt, besitzt aber noch keine öffentliche Version. */
export const emptyGroupedEpisodesResponse: PublicGroupedEpisodesResponse = {
  data: {
    anime_id: 1,
    episodes: [],
    episode_count: 0,
    pagination: { has_more: false, next_cursor: null, row_limit: 24 },
  },
}

function buildEpisodePage(startEpisodeNumber: number): PublicGroupedEpisode[] {
  return Array.from({ length: 24 }, (_value, index) => {
    const episodeNumber = startEpisodeNumber + index
    return buildGroupedEpisode({
      episode_id: episodeNumber,
      episode_number: episodeNumber,
      episode_title: `Frühlingsblüten – Folge ${episodeNumber}`,
      default_version_id: episodeNumber,
      versions: [buildEpisodeVersion({
        id: episodeNumber,
        variant_id: episodeNumber,
        release_version_id: episodeNumber,
        episode_number: episodeNumber,
      })],
    })
  })
}

/** Erste Cursor-Seite für die Detail-Story „Viele Episoden“; der Browser lädt danach weiter. */
export const manyGroupedEpisodesResponse: PublicGroupedEpisodesResponse = {
  data: {
    anime_id: 1,
    episodes: buildEpisodePage(1),
    episode_count: 48,
    pagination: { has_more: true, next_cursor: 'episode-page-2', row_limit: 24 },
  },
}

/** Zweite Cursor-Seite für „Viele Episoden“, die den Nachlade-Ablauf abgeschlossen darstellt. */
export const moreGroupedEpisodesResponse: PublicGroupedEpisodesResponse = {
  data: {
    anime_id: 1,
    episodes: buildEpisodePage(25),
    episode_count: 48,
    pagination: { has_more: false, next_cursor: null, row_limit: 24 },
  },
}

/** Fansub-Fixture passend zur Episoden-Fixture (Primärgruppe "Demo Fansub-Gruppe"). */
export const normalAnimeFansubsResponse: AnimeFansubListResponse = {
  data: [
    {
      anime_id: 1,
      fansub_group_id: 1,
      is_primary: true,
      created_at: '2024-01-01T00:00:00.000Z',
      fansub_group: { id: 1, slug: 'demo-fansub-gruppe', name: 'Demo Fansub-Gruppe' },
    },
  ],
}

/** Drei echte Gruppen-Kontexte nach dem Vorbild des öffentlichen Anime „Freezing“. */
export const freezingAnimeFansubsResponse: AnimeFansubListResponse = {
  data: [
    {
      anime_id: 13, fansub_group_id: 101, is_primary: true, created_at: '2011-01-08T00:00:00.000Z',
      fansub_group: { id: 101, slug: 'bloody-shadow', name: 'Bloody-Shadow', logo_url: '/covers/placeholder.jpg', story_preview: 'Veröffentlicht die Folgen von Freezing als gemeinsames Projekt.' },
    },
    {
      anime_id: 13, fansub_group_id: 102, is_primary: false, created_at: '2011-01-08T00:00:00.000Z',
      fansub_group: { id: 102, slug: 'lazy-subs', name: 'LazySubs', logo_url: null, story_preview: 'Untertitelt ausgewählte Staffeln und Specials.' },
    },
    {
      anime_id: 13, fansub_group_id: 103, is_primary: false, created_at: '2011-01-08T00:00:00.000Z',
      fansub_group: { id: 103, slug: 'melon-subs', name: 'MelonSubs', logo_url: '/covers/placeholder.jpg', story_preview: 'Bearbeitet gemeinsam mit anderen Gruppen die Veröffentlichung.' },
    },
  ],
}

/** Gruppenauswahl und Kontext-Karte verwenden dieselben Serverdaten wie die reale Seite. */
export const freezingFansubStoryGroups = buildFansubStoryGroups(freezingAnimeFansubsResponse.data)

/** Eine gruppenspezifische Antwort für den interaktiven Wechsel in der Mehrgruppen-Story. */
export const freezingGroupedEpisodesResponse: PublicGroupedEpisodesResponse = {
  data: {
    anime_id: 13,
    episodes: Array.from({ length: 12 }, (_value, index) => buildGroupedEpisode({
      episode_id: 1301 + index,
      episode_number: index + 1,
      episode_title: `Freezing – Folge ${index + 1}`,
      versions: [buildEpisodeVersion({
        id: 1301 + index,
        variant_id: 1301 + index,
        release_version_id: 1301 + index,
        anime_id: 13,
        episode_number: index + 1,
        fansub_groups: [
          { id: 101, slug: 'bloody-shadow', name: 'Bloody-Shadow', logo_url: '/covers/placeholder.jpg' },
          { id: 102, slug: 'lazy-subs', name: 'LazySubs' },
          { id: 103, slug: 'melon-subs', name: 'MelonSubs', logo_url: '/covers/placeholder.jpg' },
        ],
        release_name: 'Freezing – Gemeinschaftsrelease',
      })],
    })),
    episode_count: 12,
    pagination: { has_more: false, next_cursor: null, row_limit: 24 },
  },
}

/** Verwandte Anime (Prequel/Sequel) für die "Verwandte Anime"-Sektion. */
export const normalRelationsResponse: AnimeRelationsResponse = {
  data: [
    { anime_id: 2, title: 'Frühlingsblüten über Tokio: Sommerspecial', relation_type: 'sequel', cover_image: '/covers/placeholder.jpg', year: 2024, type: 'ova' },
  ],
}
