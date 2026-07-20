import { Card, SectionHeader } from '@/components/ui'
import { PublicReleaseBlock } from '@/components/fansubs/PublicReleaseBlock'
import type { PublicReleasePreview } from '@/components/fansubs/PublicReleaseBlock'
import { DesktopReleaseRow } from '@/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.rows'
import type { EpisodeReleaseSummary } from '@/types/group'
import type { CSSProperties, ReactNode } from 'react'

import styles from '../page.module.css'

const releaseImages = [
  {
    id: 1,
    src: '/covers/cover_1775167905284_2cd26cdc-2530-4914-8dd7-2a90a55b3fcd.jpg',
    label: 'Screenshot',
    alt: 'Viper Creed Release-Screenshot',
  },
  {
    id: 2,
    src: '/groups/aoisora.png',
    label: 'Typesetting',
    alt: 'Typesetting-Vorschau',
  },
  {
    id: 3,
    src: '/groups/storm.png',
    label: 'Karaoke',
    alt: 'Karaoke-Vorschau',
  },
  {
    id: 4,
    src: '/groups/arashistorm.png',
    label: 'Vergleich',
    alt: 'Release-Vergleich',
  },
]

const latestRelease: PublicReleasePreview = {
  id: 1201,
  href: '/anime/1/group/101/releases/1201',
  episodeLabel: 'Folge 12',
  title: 'Entscheidung am Himmel über Fort Daiva',
  versionLabel: 'C-Subs v2',
  releasedAtLabel: '14.07.2026',
  durationLabel: '00:23:41',
  imageCount: 8,
  noteCount: 3,
  contributorCount: 5,
  heroImage: releaseImages[0],
  imagePreviews: releaseImages,
  notePreviews: [
    {
      id: 1,
      author: 'Cookie',
      excerpt: 'Die finalen Funkdialoge wurden bewusst knapp gehalten, damit die Szene militärisch bleibt.',
    },
    {
      id: 2,
      author: 'Mira',
      excerpt: 'Typesetting und Einblendungen orientieren sich am Rhythmus der Kamera, nicht an starren Boxen.',
    },
  ],
  contributors: [
    { id: 1, name: 'Cookie', roleLabel: 'Übersetzung' },
    { id: 2, name: 'Mira', roleLabel: 'Typesetting' },
    { id: 3, name: 'Ryo', roleLabel: 'Timing' },
    { id: 4, name: 'Nia', roleLabel: 'QC' },
    { id: 5, name: 'Kane', roleLabel: 'Encoding' },
  ],
  timelineSegments: [
    { id: 1, type: 'OP', label: 'Regenzeichen', timeLabel: '00:01:42', leftPercent: 8, widthPercent: 16, href: '#op' },
    { id: 2, type: 'IN', label: 'Mitten im Regen', timeLabel: '00:12:08', leftPercent: 48, widthPercent: 14, href: '#insert' },
    { id: 3, type: 'ED', label: 'Nach dem Sturm', timeLabel: '00:21:18', leftPercent: 78, widthPercent: 16, href: '#ed' },
  ],
}

const olderReleases: PublicReleasePreview[] = [
  {
    id: 1191,
    href: '/anime/1/group/101/releases/1191',
    episodeLabel: 'Folge 11',
    title: 'Signal im Regen',
    versionLabel: 'C-Subs v1',
    releasedAtLabel: '07.07.2026',
    durationLabel: '00:23:39',
    imageCount: 4,
    noteCount: 2,
    contributorCount: 4,
    timelineSegments: [
      { id: 1, type: 'OP', label: 'Regenzeichen', timeLabel: '00:01:41', leftPercent: 7, widthPercent: 16, href: '#op' },
      { id: 2, type: 'ED', label: 'Nach dem Sturm', timeLabel: '00:21:20', leftPercent: 79, widthPercent: 15, href: '#ed' },
    ],
  },
  {
    id: 1181,
    href: '/anime/1/group/101/releases/1181',
    episodeLabel: 'Folge 10',
    title: 'Die Zone ohne Rückkehr',
    versionLabel: 'C-Subs v1',
    releasedAtLabel: '30.06.2026',
    durationLabel: '00:23:42',
    imageCount: 6,
    noteCount: 1,
    contributorCount: 4,
    timelineSegments: [
      { id: 1, type: 'OP', label: 'Regenzeichen', timeLabel: '00:01:44', leftPercent: 8, widthPercent: 16, href: '#op' },
      { id: 2, type: 'KARA', label: 'Funkschatten', timeLabel: '00:14:02', leftPercent: 55, widthPercent: 13, href: '#kara' },
      { id: 3, type: 'ED', label: 'Nach dem Sturm', timeLabel: '00:21:22', leftPercent: 80, widthPercent: 15, href: '#ed' },
    ],
  },
  {
    id: 1171,
    href: '/anime/1/group/101/releases/1171',
    episodeLabel: 'Folge 9',
    title: 'Befehlskette',
    versionLabel: 'Coop mit Honto',
    releasedAtLabel: '23.06.2026',
    durationLabel: '00:23:40',
    imageCount: 2,
    noteCount: 4,
    contributorCount: 7,
    timelineSegments: [
      { id: 1, type: 'OP', label: 'Regenzeichen', timeLabel: '00:01:43', leftPercent: 8, widthPercent: 16, href: '#op' },
      { id: 2, type: 'OTHER', label: 'Kapitel', timeLabel: '00:09:30', leftPercent: 38, widthPercent: 12, href: '#chapter' },
      { id: 3, type: 'ED', label: 'Nach dem Sturm', timeLabel: '00:21:19', leftPercent: 79, widthPercent: 16, href: '#ed' },
    ],
  },
]

const releaseListCardExamples: EpisodeReleaseSummary[] = [
  {
    id: 1201,
    episode_number: 12,
    episode_number_label: '12',
    title: 'Entscheidung am Himmel über Fort Daiva',
    version_label: 'C-Subs Version v2',
    has_op: true,
    has_ed: true,
    karaoke_count: 1,
    insert_count: 1,
    screenshot_count: 8,
    duration_seconds: 1421,
    images_count: 8,
    notes_count: 3,
    contributors_count: 5,
    timeline_segments: [
      { id: 12011, type: 'OP', title: 'Regenzeichen', start_time: '00:00:00', end_time: '00:01:31' },
      { id: 12012, type: 'INSERT', title: 'Mitten im Regen', start_time: '00:09:42', end_time: '00:11:08' },
      { id: 12013, type: 'KARA', title: 'Funkschatten', start_time: '00:14:02', end_time: '00:15:16' },
      { id: 12014, type: 'ED', title: 'Nach dem Sturm', start_time: '00:21:18', end_time: '00:23:41' },
    ],
  },
  {
    id: 1191,
    episode_number: 11,
    episode_number_label: '11',
    title: 'Signal im Regen',
    version_label: 'C-Subs Version v1',
    has_op: false,
    has_ed: false,
    karaoke_count: 0,
    insert_count: 0,
    screenshot_count: 0,
    duration_seconds: 1419,
    images_count: 0,
    notes_count: 1,
    contributors_count: 3,
    timeline_segments: [],
  },
]

function ReleaseSurfaceFrame({
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

export function PublicReleaseSurfacesShowcase() {
  return (
    <Card variant="section">
      <SectionHeader
        eyebrow="10"
        title="Public Release Surfaces"
        description="Definierbarer Release-Block für öffentliche Fansub-Projektseiten: neuestes Release, Release-Liste, Timeline, Medien, Texte, Fansubber und Leerzustand."
      />
      <div className={styles.publicSurfaceStack}>
        <Card
          variant="flat"
          title="Verbindlichkeit"
          description="Dieser Bereich nutzt die produktiven Public-Release-Kompositionen mit reinen Mockdaten. Änderungen werden hier geprüft, ohne API-, Auth- oder Permission-Logik in das UI-System zu ziehen."
        />
        <Card
          variant="flat"
          title="Globale Release-Listenkarte"
          description="Kanonische Projektlisten-Komposition: Folge, Version, Titel, Bilder und Texte in einer Kopfzeile; Kara-Timeline und die eindeutige Aktion „Release öffnen“ liegen direkt darunter."
        />
        <ReleaseSurfaceFrame title="Release-Card · Desktop und Tablet" width="1180px">
          <div>
            {releaseListCardExamples.map((release) => (
              <DesktopReleaseRow
                key={release.id}
                animeID={1}
                groupID={101}
                episode={release}
                canonicalProjectPath="/fansubs/c-subs/fansubprojekt/vipers-creed"
              />
            ))}
          </div>
        </ReleaseSurfaceFrame>
        <ReleaseSurfaceFrame title="Desktop Releases" width="1180px">
          <PublicReleaseBlock latestRelease={latestRelease} releases={olderReleases} />
        </ReleaseSurfaceFrame>
        <ReleaseSurfaceFrame title="Tablet Releases" width="820px">
          <PublicReleaseBlock latestRelease={latestRelease} releases={olderReleases.slice(0, 2)} />
        </ReleaseSurfaceFrame>
        <ReleaseSurfaceFrame title="Mobile Releases" width="390px">
          <PublicReleaseBlock latestRelease={latestRelease} releases={olderReleases.slice(0, 2)} layout="mobile" />
        </ReleaseSurfaceFrame>
        <ReleaseSurfaceFrame title="Leerer Release-Zustand" width="820px">
          <PublicReleaseBlock
            title="Releases zum Fansub"
            description="So wirkt der Bereich, wenn noch keine öffentlichen Release-Daten freigegeben sind."
            releases={[]}
          />
        </ReleaseSurfaceFrame>
      </div>
    </Card>
  )
}
