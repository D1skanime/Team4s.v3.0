'use client'

import type { ReleaseDetailResponse } from '@/types/releaseDetail'

import { ReleaseNavigation } from './ReleaseNavigation'
import { ReleaseVersionSwitcher } from './ReleaseVersionSwitcher'
import styles from './page.module.css'

type ReleaseDetailHeroProps = Pick<ReleaseDetailResponse,
  'episode_number' | 'episode_title' | 'title' | 'version' | 'groups' |
  'duration_seconds' | 'resolution' | 'container' | 'video_codec' | 'audio_codec' |
  'audio_language' | 'subtitle_tracks' | 'subtitle_type' |
  'preview_image' | 'previous' | 'next' | 'other_releases'> & {
    animeID: number
    groupID: number
    canonicalProjectPath?: string | null
    animeLogoFallbackUrl: string | null
  }

export function ReleaseDetailHero(props: ReleaseDetailHeroProps) {
  const image = props.preview_image
  const imageSrc = image?.original_url ?? image?.thumbnail_url ?? props.animeLogoFallbackUrl
  const groupNames = props.groups.map(group => group.name.trim()).filter(Boolean)
  const groupLine = groupNames.length > 1
    ? `Fansub-Coop: ${groupNames.join(' × ')}`
    : `Fansubgruppe: ${groupNames[0] ?? 'Nicht hinterlegt'}`

  return <section className={styles.hero} data-release-hero="independent" data-release-accordion="true">
    <svg className={styles.heroSvgFilters} aria-hidden="true" focusable="false">
      <defs>
        <filter id="release-text-horizontal-blur" x="-50%" y="0%" width="200%" height="100%">
          <feGaussianBlur stdDeviation="12 0" />
        </filter>
      </defs>
    </svg>
    <div className={styles.heroSummary}>
    {imageSrc ? <div className={styles.heroImageShell}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc} alt={image?.caption ?? `Anime-Logo zu ${props.title}`} className={styles.heroImage} loading="eager" />
    </div> : null}
    <div className={styles.heroHeading}>
      <div className={styles.heroIdentity}>
        <p className={styles.heroEyebrow}>
          <span className={styles.heroHaloText}>
            <span className={styles.heroHaloCopy} aria-hidden="true">Episode {props.episode_number}</span>
            <span className={styles.heroHaloForeground}>Episode {props.episode_number}</span>
          </span>
        </p>
        <h1 className={styles.heroTitle}>
          <span className={styles.heroHaloText}>
            <span className={styles.heroHaloCopy} aria-hidden="true">{props.episode_title ?? props.title}</span>
            <span className={styles.heroHaloForeground}>{props.episode_title ?? props.title}</span>
          </span>
        </h1>
        {props.episode_title && props.title !== props.episode_title ? (
          <p className={styles.heroReleaseTitle}>
            <span className={styles.heroHaloText}>
              <span className={styles.heroHaloCopy} aria-hidden="true">{props.title}</span>
              <span className={styles.heroHaloForeground}>{props.title}</span>
            </span>
          </p>
        ) : null}
        <p className={styles.heroGroupLine}>
          <span className={styles.heroHaloText}>
            <span className={styles.heroHaloCopy} aria-hidden="true">{groupLine}</span>
            <span className={styles.heroHaloForeground}>{groupLine}</span>
          </span>
        </p>
        <ReleaseVersionSwitcher animeID={props.animeID} releases={props.other_releases ?? []} />
      </div>
    </div>
    </div>
    {props.next ? (
      <div className={styles.heroNavigation}>
        <ReleaseNavigation
          animeID={props.animeID}
          groupID={props.groupID}
          canonicalProjectPath={props.canonicalProjectPath}
          previous={props.previous}
          next={props.next}
        />
      </div>
    ) : null}
  </section>
}
