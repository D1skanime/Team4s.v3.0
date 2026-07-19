'use client'

import { Accordion, Card } from '@/components/ui'
import type { ReleaseDetailResponse } from '@/types/releaseDetail'

import styles from './page.module.css'

type ReleaseDetailHeroProps = Pick<ReleaseDetailResponse,
  'episode_number' | 'episode_title' | 'title' | 'version' | 'groups' | 'release_date' |
  'duration_seconds' | 'resolution' | 'video_codec' | 'subtitle_tracks' |
  'preview_image' | 'images_count' | 'notes_count' | 'contributors_count'> & {
    animeLogoFallbackUrl: string | null
    atmosphereUrl?: string | null
    subtitle_type?: string | null
  }

function formatDate(value: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return null
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${String(rest).padStart(2, '0')} Min.`
}

function subtitleType(type: string | null | undefined) {
  return type?.toLowerCase() === 'hard' || type?.toLowerCase() === 'hardsub' ? 'Hardsub' : 'Softsub'
}

export function ReleaseDetailHero(props: ReleaseDetailHeroProps) {
  const image = props.preview_image
  const imageSrc = image?.thumbnail_url ?? image?.original_url ?? props.animeLogoFallbackUrl
  const isLogoFallback = !image && Boolean(props.animeLogoFallbackUrl)
  const primaryFacts = [
    ['Version', props.version],
    ['Veröffentlicht', formatDate(props.release_date)],
    ['Dauer', formatDuration(props.duration_seconds)],
    ['Auflösung', props.resolution],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]))
  const subType = subtitleType(props.subtitle_type)
  const groupLine = props.groups.map(group => group.name).join(' · ')
  const technicalFacts = [
    ['Video-Codec', props.video_codec],
    ['Untertiteltyp', subType],
    ...props.subtitle_tracks.map((track, index) => [
      `Untertitelspur ${index + 1}`,
      [track.label || track.language, track.language, track.format].filter(Boolean).filter((value, valueIndex, values) => values.indexOf(value) === valueIndex).join(' · '),
    ]),
  ].filter((entry): entry is [string, string] => Boolean(entry[1]))

  return <section className={`${styles.hero} ${imageSrc ? '' : styles.heroTextOnly}`} data-release-hero="independent" data-release-accordion="true">
    <div className={styles.heroSummary}>
    {imageSrc ? <div className={`${styles.heroImageShell} ${isLogoFallback ? styles.heroLogoFallback : ''}`} style={isLogoFallback && props.atmosphereUrl ? { backgroundImage: `url("${props.atmosphereUrl}")` } : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc} alt={image?.caption ?? `Anime-Logo zu ${props.title}`} className={styles.heroImage} loading="eager" />
    </div> : null}
    <div className={styles.heroHeading}>
      <p className={styles.heroEyebrow}>Episode {props.episode_number}</p>
      <h1 className={styles.heroTitle}>{props.episode_title ?? props.title}</h1>
      {props.episode_title && props.title !== props.episode_title ? <p className={styles.heroReleaseTitle}>{props.title}</p> : null}
      <p className={styles.heroGroupLine}>{groupLine}</p>
      <dl className={styles.technicalGrid}>{primaryFacts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className={styles.statsRow}><span>{props.images_count} Bilder</span><span>{props.notes_count} Texte</span><span>{props.contributors_count} Fansubber</span></div>
    </div>
    </div>
    <Accordion mode="single" items={[{
        id: 'details',
        title: <span className={styles.heroDetailsLabel}>Details</span>,
        children: <div className={styles.heroPanel}>
          <Card variant="nestedFlat" className={styles.subtitleBlock}>
            <dl className={styles.technicalGrid}>{technicalFacts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          </Card>
        </div>,
      }]} />
  </section>
}
