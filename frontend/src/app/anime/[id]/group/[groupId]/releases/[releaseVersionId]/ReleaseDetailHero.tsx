'use client'

import { Accordion, Card } from '@/components/ui'
import type { ReleaseDetailResponse } from '@/types/releaseDetail'

import { ReleaseNavigation } from './ReleaseNavigation'
import styles from './page.module.css'

type ReleaseDetailHeroProps = Pick<ReleaseDetailResponse,
  'episode_number' | 'episode_title' | 'title' | 'version' | 'groups' | 'release_date' |
  'duration_seconds' | 'resolution' | 'container' | 'video_codec' | 'audio_codec' |
  'audio_language' | 'subtitle_tracks' | 'subtitle_type' | 'preview_image' | 'next' |
  'images_count' | 'notes_count' | 'contributors_count'> & {
    animeID: number
    groupID: number
    canonicalProjectPath?: string | null
    animeLogoFallbackUrl: string | null
    atmosphereUrl?: string | null
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
  const normalized = type?.trim().toLowerCase()
  if (!normalized) return 'Nicht hinterlegt'
  if (normalized === 'hard' || normalized === 'hardsub') return 'Hardsub'
  if (normalized === 'soft' || normalized === 'softsub') return 'Softsub'
  return type?.trim() || 'Nicht hinterlegt'
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || 'Nicht hinterlegt'
}

function formatSubtitleTracks(props: ReleaseDetailHeroProps) {
  if (props.subtitle_tracks.length === 0) return 'Nicht hinterlegt'
  return props.subtitle_tracks.map((track, index) => {
    const details = [track.label, track.language, track.format]
      .map(value => value?.trim())
      .filter((value): value is string => Boolean(value))
      .filter((value, valueIndex, values) => values.indexOf(value) === valueIndex)
    return `Spur ${index + 1}: ${details.length > 0 ? details.join(' · ') : 'Nicht hinterlegt'}`
  }).join('; ')
}

export function ReleaseDetailHero(props: ReleaseDetailHeroProps) {
  const image = props.preview_image
  const imageSrc = image?.thumbnail_url ?? image?.original_url ?? props.animeLogoFallbackUrl
  const isLogoFallback = !image && Boolean(props.animeLogoFallbackUrl)
  const primaryFacts = [
    ['Version', displayValue(props.version)],
    ['Veröffentlicht', displayValue(formatDate(props.release_date))],
    ['Dauer', displayValue(formatDuration(props.duration_seconds))],
    ['Auflösung', displayValue(props.resolution)],
  ]
  const groupNames = props.groups.map(group => group.name.trim()).filter(Boolean)
  const groupLine = groupNames.length > 1
    ? `Fansub-Coop: ${groupNames.join(' × ')}`
    : `Fansubgruppe: ${groupNames[0] ?? 'Nicht hinterlegt'}`
  const technicalFacts = [
    ['Container', displayValue(props.container)],
    ['Video-Codec', displayValue(props.video_codec)],
    ['Audio-Codec', displayValue(props.audio_codec)],
    ['Audio-Sprache', displayValue(props.audio_language)],
    ['Untertiteltyp', subtitleType(props.subtitle_type)],
    ['Untertitelspuren', formatSubtitleTracks(props)],
  ]

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
    {props.next ? (
      <div className={styles.heroNavigation}>
        <ReleaseNavigation
          animeID={props.animeID}
          groupID={props.groupID}
          canonicalProjectPath={props.canonicalProjectPath}
          previous={null}
          next={props.next}
        />
      </div>
    ) : null}
  </section>
}
