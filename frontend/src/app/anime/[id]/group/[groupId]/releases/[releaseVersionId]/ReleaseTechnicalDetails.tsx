import type { ReleaseDetailResponse } from '@/types/releaseDetail'

import styles from './page.module.css'

type ReleaseTechnicalDetailsProps = Pick<ReleaseDetailResponse,
  'version' | 'duration_seconds' | 'release_date' | 'resolution' | 'container' | 'video_codec' | 'audio_codec' |
  'audio_language' | 'subtitle_tracks' | 'subtitle_type'
>

function formatDate(value: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return 'Nicht hinterlegt'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${String(rest).padStart(2, '0')} Min.`
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || 'Nicht hinterlegt'
}

function formatCodec(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const normalized = trimmed.toLowerCase()
  if (normalized === 'h264' || normalized === 'avc') return 'H.264'
  if (normalized === 'h265' || normalized === 'hevc') return 'H.265 / HEVC'
  return trimmed.toUpperCase()
}

function subtitleType(type: string | null | undefined) {
  const normalized = type?.trim().toLowerCase()
  if (!normalized) return 'Nicht hinterlegt'
  if (normalized === 'hard' || normalized === 'hardsub') return 'Hardsub'
  if (normalized === 'soft' || normalized === 'softsub') return 'Softsub'
  return type?.trim() || 'Nicht hinterlegt'
}

function formatSubtitleTracks({ subtitle_tracks }: ReleaseTechnicalDetailsProps) {
  const tracks = subtitle_tracks ?? []
  if (tracks.length === 0) return 'Nicht hinterlegt'
  return tracks.map((track, index) => {
    const details = [track.label, track.language, track.format]
      .map(value => value?.trim())
      .filter((value): value is string => Boolean(value))
      .filter((value, valueIndex, values) => values.indexOf(value) === valueIndex)
    return `Spur ${index + 1}: ${details.length > 0 ? details.join(' · ') : 'Nicht hinterlegt'}`
  }).join('; ')
}

export function ReleaseTechnicalDetails(props: ReleaseTechnicalDetailsProps) {
  const audioLanguage = props.audio_language?.trim()
  const facts = [
    ['Dauer', formatDuration(props.duration_seconds)],
    ['Version', displayValue(props.version)],
    ['Fansub-Release vom', displayValue(formatDate(props.release_date))],
    ['Auflösung', displayValue(props.resolution)],
    ['Container', displayValue(props.container)],
    ['Video-Codec', displayValue(formatCodec(props.video_codec))],
    ['Audio-Codec', displayValue(formatCodec(props.audio_codec))],
    ['Audio-Sprache', !audioLanguage || audioLanguage.toLowerCase() === 'und' ? 'Japanisch' : audioLanguage],
    ['Untertiteltyp', subtitleType(props.subtitle_type)],
    ['Untertitelspuren', formatSubtitleTracks(props)],
  ]

  return (
    <section className={styles.technicalSection} data-release-technical-details="true">
      <div className={styles.technicalSectionHeader}>
        <div>
          <p className={styles.technicalEyebrow}>Release-Informationen</p>
          <h2 className={styles.sectionTitle}>Technische Details</h2>
        </div>
      </div>
      <dl className={styles.technicalGrid}>
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
