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
    <div className={styles.heroSummary}>
    {imageSrc ? <div className={styles.heroImageShell}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc} alt={image?.caption ?? `Anime-Logo zu ${props.title}`} className={styles.heroImage} loading="eager" />
    </div> : null}
    <div className={styles.heroHeading}>
      <div className={styles.heroIdentity}>
        <p className={styles.heroEyebrow}>Episode {props.episode_number}</p>
        <h1 className={styles.heroTitle}>{props.episode_title ?? props.title}</h1>
        {props.episode_title && props.title !== props.episode_title ? <p className={styles.heroReleaseTitle}>{props.title}</p> : null}
        <p className={styles.heroGroupLine}>{groupLine}</p>
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
