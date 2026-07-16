import { Badge, Card } from '@/components/ui'
import type { ReleaseDetailResponse } from '@/types/releaseDetail'

import styles from './page.module.css'
import { ReleaseEpisodePlayer } from './ReleaseEpisodePlayer'

type ReleaseDetailHeroProps = Pick<ReleaseDetailResponse,
  'episode_number' | 'episode_title' | 'title' | 'version' | 'groups' | 'release_date' |
  'duration_seconds' | 'resolution' | 'container' | 'video_codec' | 'audio_codec' |
  'audio_language' | 'subtitle_tracks' | 'preview_image' | 'images_count' | 'notes_count' |
  'contributors_count'> & { fallbackPosterUrl: string | null; release_version_id?: number }

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

export function ReleaseDetailHero(props: ReleaseDetailHeroProps) {
  const image = props.preview_image
  const imageSrc = image?.thumbnail_url ?? image?.original_url ?? props.fallbackPosterUrl
  const facts = [
    ['Version', props.version], ['Veröffentlicht', formatDate(props.release_date)], ['Dauer', formatDuration(props.duration_seconds)],
    ['Auflösung', props.resolution], ['Container', props.container], ['Video', props.video_codec],
    ['Audio', [props.audio_language, props.audio_codec].filter(Boolean).join(' · ') || null],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]))

  return <section className={`${styles.hero} ${imageSrc ? '' : styles.heroTextOnly}`} data-release-hero="independent">
    {imageSrc ? <div className={styles.heroImageShell}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc} alt={image?.caption ?? props.title} className={styles.heroImage} loading="eager" />
    </div> : null}
    <div className={styles.heroContent}>
      <header className={styles.heroHeading}>
        <p className={styles.heroEyebrow}>{`Episode ${props.episode_number}${props.episode_title ? ` · ${props.episode_title}` : ''}`}</p>
        <h1 className={styles.heroTitle}>{props.title}</h1>
      </header>
      <div className={styles.groupRow}>{props.groups.map(group => <Badge key={group.id} variant="muted">{group.name}</Badge>)}</div>
      <dl className={styles.technicalGrid}>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {props.subtitle_tracks.length ? <Card variant="nestedFlat" className={styles.subtitleBlock}>
        <strong>Untertitelspuren</strong>
        <div className={styles.subtitleList}>{props.subtitle_tracks.map((track, index) => <Badge key={`${track.label}-${index}`} variant="neutral">
          {[track.language, track.label, track.format, track.forced ? 'Forced' : null, track.default ? 'Standard' : null].filter(Boolean).join(' · ')}
        </Badge>)}</div>
      </Card> : null}
      <div className={styles.statsRow}><span>{props.images_count} Bilder</span><span>{props.notes_count} Texte</span><span>{props.contributors_count} Fansubber</span></div>
      {props.release_version_id ? <ReleaseEpisodePlayer releaseVersionID={props.release_version_id} title={props.title} /> : null}
    </div>
  </section>
}
