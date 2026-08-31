'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { ReactNode } from 'react'

import { Button, Card, SectionHeader } from '@/components/ui'
import { FansubHeroSection } from '@/components/fansubs/FansubHeroSection'
import { FansubHistorySection } from '@/components/fansubs/FansubHistorySection'
import { FansubMediaLightbox } from '@/components/fansubs/FansubMediaLightbox'
import { FansubMediaSection } from '@/components/fansubs/FansubMediaSection'
import { FansubProjectsSection } from '@/components/fansubs/FansubProjectsSection'
import { FansubStorySection } from '@/components/fansubs/FansubStorySection'
import { FansubTeamSection } from '@/components/fansubs/FansubTeamSection'
import type {
  FansubGroup,
  FansubGroupLink,
  PublicFansubHistory,
  PublicFansubMediaItem,
  PublicFansubProject,
  PublicFansubStory,
} from '@/types/fansub'
import type { DomainProjectionHistoricalRow, DomainProjectionMemberRow } from '@/types/domain-projection'

import styles from '../page.module.css'

const showcaseGroup: FansubGroup = {
  id: 101,
  slug: 'c-subs',
  name: 'C-Subs',
  logo_url: '/groups/cookie.png',
  banner_url: '/covers/cover_1775164698913_a216b01d-a000-4871-878d-46e3a41e08e8.jpg',
  founded_year: 2002,
  dissolved_year: null,
  closed_year: null,
  status: 'active',
  website_url: 'https://example.test',
  discord_url: null,
  irc_url: null,
  country: 'Deutschland',
  anime_relations_count: 20,
  projects_count: 20,
  release_versions_count: 59,
  members_count: 4,
  aliases_count: 0,
  created_at: '2026-07-15T00:00:00Z',
  updated_at: '2026-07-15T00:00:00Z',
}

const showcaseLinks: FansubGroupLink[] = [
  {
    id: 1,
    group_id: showcaseGroup.id,
    link_type: 'website',
    name: 'Webseite',
    url: 'https://example.test',
    created_at: '2026-07-15T00:00:00Z',
  },
  {
    id: 2,
    group_id: showcaseGroup.id,
    link_type: 'discord',
    name: 'Csubs discord',
    url: 'https://discord.example.test',
    created_at: '2026-07-15T00:00:00Z',
  },
  {
    id: 3,
    group_id: showcaseGroup.id,
    link_type: 'irc',
    name: 'IC von Cookie',
    url: 'ircs://irc.example.test/c-subs',
    created_at: '2026-07-15T00:00:00Z',
  },
]

const showcaseProjects: PublicFansubProject[] = [
  {
    id: 1,
    anime_slug: 'vipers-creed',
    title: "Viper's Creed",
    type: 'TV',
    status: 'ongoing',
    year: 2009,
    banner_url: '/covers/cover_1775167905284_2cd26cdc-2530-4914-8dd7-2a90a55b3fcd.jpg',
    cover_image: '/covers/cover_1775167905284_2cd26cdc-2530-4914-8dd7-2a90a55b3fcd.jpg',
    max_episodes: 12,
  },
  {
    id: 2,
    anime_slug: 'bishoujo-hyouryuuki',
    title: '15 Bishoujo Hyouryuuki',
    type: 'OVA',
    status: 'done',
    year: 2008,
    banner_url: '/groups/ownage.png',
    cover_image: '/covers/placeholder.jpg',
    max_episodes: 3,
  },
  {
    id: 3,
    anime_slug: 'aki-sora',
    title: 'Aki Sora',
    type: 'OVA',
    status: 'done',
    year: 2009,
    banner_url: '/groups/honto.png',
    cover_image: '/covers/placeholder.jpg',
    max_episodes: 2,
  },
  {
    id: 4,
    anime_slug: 'amatsuki',
    title: 'Amatsuki',
    type: 'TV',
    status: 'done',
    year: 2008,
    banner_url: '/groups/akatsuki.png',
    cover_image: '/covers/placeholder.jpg',
    max_episodes: 13,
  },
  {
    id: 5,
    anime_slug: 'anime-shounen-maid-curo-kun-tenshi-no-uta',
    title: 'Anime Shounen Maid Curo-kun: Tenshi no Uta',
    type: 'OVA',
    status: 'done',
    year: 2010,
    banner_url: '/covers/cover_1775171064368_2b331ca8-a66b-49f3-b9bb-62cd0508a44f.jpg',
    cover_image: '/covers/cover_1775171064368_2b331ca8-a66b-49f3-b9bb-62cd0508a44f.jpg',
    max_episodes: 1,
  },
  {
    id: 6,
    anime_slug: 'langtitel-der-sauber-gekuerzt-werden-muss',
    title: 'Ein sehr langer Projektname, der auf Karten nicht umbrechen darf',
    type: 'TV',
    status: 'licensed',
    year: 2011,
    banner_url: null,
    cover_image: '/covers/placeholder.jpg',
    max_episodes: 24,
  },
]

const showcaseOverflowProjects: PublicFansubProject[] = [
  ...showcaseProjects,
  ...Array.from({ length: 18 }, (_, index) => {
    const projectNumber = index + 7
    const status = index % 7 === 0 ? 'licensed' : index % 3 === 0 ? 'ongoing' : 'done'
    return {
      id: projectNumber,
      anime_slug: `archiv-projekt-${projectNumber}`,
      title: `Archiv-Projekt ${projectNumber}`,
      type: index % 2 === 0 ? 'TV' : 'OVA',
      status,
      year: 2000 + projectNumber,
      banner_url: index % 4 === 0 ? '/groups/emania.png' : null,
      cover_image: index % 4 === 0 ? '/groups/emania.png' : '/covers/placeholder.jpg',
      max_episodes: index % 2 === 0 ? 12 : 2,
    }
  }),
]

const showcaseStories: PublicFansubStory[] = [
  {
    id: 1,
    title: 'Wie die Gruppe arbeitete',
    body_html:
      '<p><strong>C-Subs</strong> steht hier als Mock-Profil für öffentliche Fansub-Seiten. Der Block zeigt lange Texte, Inline-Hervorhebungen und den normalen Abstand zur nächsten Sektion.</p>',
    body_text: 'C-Subs steht hier als Mock-Profil für öffentliche Fansub-Seiten.',
    updated_at: '2026-07-15T00:00:00Z',
  },
  {
    id: 2,
    title: 'Archivnotiz',
    body_html:
      '<p>Eine zweite Geschichte prüft, dass das Archiv und die mobile Auswahl nicht als neue Sonderoberfläche gestaltet werden.</p>',
    body_text: 'Eine zweite Geschichte prüft das Archiv.',
    updated_at: '2026-07-15T00:00:00Z',
  },
  {
    id: 3,
    title: 'Kooperationen',
    body_html:
      '<p>Die öffentliche Geschichte darf auch Kooperationen, alte Webseiten und Release-Kontext nennen, ohne die Hero-Fakten zu ersetzen.</p>',
    body_text: 'Die öffentliche Geschichte darf auch Kooperationen nennen.',
    updated_at: '2026-07-15T00:00:00Z',
  },
]

const showcaseHistory: PublicFansubHistory[] = [
  {
    id: 1,
    year: 2002,
    event_type: 'founding',
    title: 'Gründung',
    note: 'Die Gruppe startet mit kleinen TV-Projekten und einer eigenen Webseite.',
    status: 'confirmed',
  },
  {
    id: 2,
    year: 2004,
    event_type: 'first_release',
    title: 'Erstes Release',
    note: 'Der erste öffentliche Fansub-Release wird archiviert.',
    status: 'confirmed',
  },
  {
    id: 3,
    year: 2007,
    event_type: 'projects_10',
    title: '10 Projekte',
    note: null,
    status: 'confirmed',
  },
  {
    id: 4,
    year: 2010,
    event_type: 'releases_100',
    title: '100 Releases',
    note: 'Meilenstein mit Zähler-Icon und langer Notiz.',
    status: 'confirmed',
  },
  {
    id: 5,
    year: 2012,
    event_type: 'collaboration',
    title: 'Große Kooperation',
    note: 'Mehrere Gruppen arbeiten an einem Titel mit geteilten Rollen.',
    status: 'confirmed',
  },
  {
    id: 6,
    year: 2016,
    event_type: 'anniversary',
    title: 'Jubiläum',
    note: 'Der Verlauf prüft links/rechts, mobile Liste und Badge-Größen.',
    status: 'confirmed',
  },
  {
    id: 7,
    year: 2020,
    event_type: 'releases_500',
    title: '500 Releases',
    note: 'Seltene Meilensteine behalten ihre Sonderklasse.',
    status: 'confirmed',
  },
]

const showcaseMedia: PublicFansubMediaItem[] = [
  {
    id: 1,
    media_type: 'group_gallery',
    caption: 'Banner aus dem alten Webauftritt',
    mime_type: 'image/jpeg',
    thumbnail_url: '/covers/cover_1775164698913_a216b01d-a000-4871-878d-46e3a41e08e8.jpg',
    original_url: '/covers/cover_1775164698913_a216b01d-a000-4871-878d-46e3a41e08e8.jpg',
    title: 'Altes Header-Bild',
    description: 'Prüft Titel, Beschreibung, Kategorie-Tag und Lightbox-Verknüpfung.',
    category: 'old_website',
  },
  {
    id: 2,
    media_type: 'group_gallery',
    caption: 'Forum-Screenshot',
    mime_type: 'image/png',
    thumbnail_url: '/groups/aoisora.png',
    original_url: '/groups/aoisora.png',
    title: 'Forum-Archiv',
    description: 'Kurzer Beschreibungstext.',
    category: 'forum',
  },
  {
    id: 3,
    media_type: 'group_gallery',
    caption: 'Event-Foto',
    mime_type: 'image/png',
    thumbnail_url: '/groups/storm.png',
    original_url: '/groups/storm.png',
    title: 'Event-Tisch',
    description: 'Langer Text prüft die Höhe der Medienkarte und darf das Grid nicht sprengen.',
    category: 'event_meeting',
  },
  {
    id: 4,
    media_type: 'group_gallery',
    caption: 'Artwork',
    mime_type: 'image/png',
    thumbnail_url: '/groups/arashistorm.png',
    original_url: '/groups/arashistorm.png',
    title: 'Fanart',
    description: null,
    category: 'artwork_fanart',
  },
  {
    id: 5,
    media_type: 'group_gallery',
    caption: 'IRC-Protokoll',
    mime_type: 'image/png',
    thumbnail_url: null,
    original_url: null,
    title: 'IRC-Protokoll ohne Bild',
    description: 'Fallback-Kachel ohne Bild.',
    category: 'irc_chat',
  },
  {
    id: 6,
    media_type: 'group_gallery',
    caption: 'Weiteres Medium',
    mime_type: 'image/png',
    thumbnail_url: '/groups/emania.png',
    original_url: '/groups/emania.png',
    title: 'Weitere Galerie',
    description: 'Prüft die +X weitere Kachel.',
    category: 'gallery',
  },
]

const showcaseMembers: DomainProjectionMemberRow[] = [
  {
    id: 1,
    member_id: 11,
    member_display_name: 'Cookie',
    member_slug: 'cookie',
    member_avatar_url: '/groups/cookie.png',
    member_slogan: 'Timing, QC und Archivpflege',
    roles: ['leader', 'translator'],
    role_labels: ['Gruppenleitung', 'Übersetzung'],
    historical_role_labels: [],
    status: 'active',
    profile_status: 'active',
    claimed: true,
  },
  {
    id: 2,
    member_id: 12,
    member_display_name: 'Mira',
    member_slug: 'mira',
    member_avatar_url: null,
    member_slogan: 'Typesetting und Karaoke',
    roles: ['typesetter'],
    role_labels: ['Typesetting'],
    historical_role_labels: [],
    status: 'active',
    profile_status: 'active',
    claimed: false,
  },
]

const showcaseHistorical: DomainProjectionHistoricalRow[] = [
  {
    id: 3,
    member_id: 13,
    member_display_name: 'Oldtimer',
    member_slug: 'oldtimer',
    member_avatar_url: null,
    member_slogan: 'Gründungsmitglied',
    roles: ['encoder'],
    role_labels: ['Encoding'],
    joined_year: 2002,
    left_year: 2008,
    status: 'historical',
    profile_status: 'historical',
    claimed: true,
  },
]

function PublicSurfaceFrame({
  title,
  width,
  children,
}: {
  title: string
  width: string
  children: ReactNode
}) {
  return (
    <article className={styles.publicSurfaceFrame}>
      <div className={styles.publicSurfaceFrameHeader}>
        <strong>{title}</strong>
        <code>{width}</code>
      </div>
      <div className={styles.publicSurfaceViewport} style={{ '--surface-width': width } as CSSProperties}>
        {children}
      </div>
    </article>
  )
}

export function PublicFansubSurfacesShowcase() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const heroStats = [
    { label: 'Anime-Projekte', value: 20 },
    { label: 'Release-Versionen', value: 59 },
    { label: 'Mitglieder', value: 4 },
  ]

  return (
    <Card variant="section">
      <SectionHeader
        eyebrow="09"
        title="Public Fansub Surfaces"
        description="Die echten Public-Fansub-Komponenten als UI-Wahrheit: Header, Projekte, Geschichte, Historie, Erfolge, Medien, Lightbox und Team."
      />
      <div className={styles.publicSurfaceStack}>
        <Card
          variant="flat"
          title="Verbindlichkeit"
          description="Dieser Block rendert die produktiven Public-Komponenten mit Mockdaten. Änderungen an diesen Komponenten wirken dadurch im UI dev und auf den echten Public-Seiten."
        />

        <div className={styles.publicSurfaceFrames}>
          <PublicSurfaceFrame title="Desktop Header" width="1180px">
            <FansubHeroSection group={showcaseGroup} stats={heroStats} communityLinks={showcaseLinks} />
          </PublicSurfaceFrame>
          <PublicSurfaceFrame title="Tablet Header" width="820px">
            <FansubHeroSection group={showcaseGroup} stats={heroStats} communityLinks={showcaseLinks} />
          </PublicSurfaceFrame>
          <PublicSurfaceFrame title="Mobile Header" width="390px">
            <FansubHeroSection group={showcaseGroup} stats={heroStats} communityLinks={showcaseLinks} />
          </PublicSurfaceFrame>
        </div>

        <PublicSurfaceFrame title="Projekt-Karussell" width="1180px">
          <FansubProjectsSection projects={showcaseOverflowProjects} groupId={showcaseGroup.id} groupSlug={showcaseGroup.slug} />
        </PublicSurfaceFrame>

        <PublicSurfaceFrame title="Geschichte" width="1180px">
          <FansubStorySection group={showcaseGroup} stories={showcaseStories} />
        </PublicSurfaceFrame>

        <PublicSurfaceFrame title="Historie & Erfolge" width="1180px">
          <FansubHistorySection history={showcaseHistory} />
        </PublicSurfaceFrame>

        <PublicSurfaceFrame title="Medien-Galerie" width="1180px">
          <FansubMediaSection media={showcaseMedia} />
          <div className={styles.publicSurfaceActionRow}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setLightboxIndex(0)}>
              Lightbox mit erstem Medium öffnen
            </Button>
          </div>
          <FansubMediaLightbox
            media={showcaseMedia}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        </PublicSurfaceFrame>

        <PublicSurfaceFrame title="Team & Mitwirkende" width="1180px">
          <FansubTeamSection members={showcaseMembers} historical={showcaseHistorical} />
        </PublicSurfaceFrame>
      </div>
    </Card>
  )
}
