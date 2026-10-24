'use client'

import { ReportHintEntryPoint } from '@/components/contributions/ReportHintEntryPoint'
import type { ReleaseDetailResponse } from '@/types/releaseDetail'

import { ReleaseNavigation } from './ReleaseNavigation'
import { ReleaseVersionSwitcher } from './ReleaseVersionSwitcher'
import styles from './page.module.css'

type ReleaseDetailHeroProps = Pick<ReleaseDetailResponse,
  'release_version_id' | 'episode_number' | 'episode_title' | 'title' | 'version' | 'groups' |
  'duration_seconds' | 'resolution' | 'container' | 'video_codec' | 'audio_codec' |
  'audio_language' | 'subtitle_tracks' | 'subtitle_type' |
  'preview_image' | 'previous' | 'next' | 'other_releases'> & {
    animeID: number
    groupID: number
    canonicalProjectPath?: string | null
    animeLogoFallbackUrl: string | null
    /**
     * D-30 (Plan 191-35, Bugfix): der echte Projekttitel aus releaseDetailPageData.tsx's
     * bereits geladener getAnimeByID-Abfrage -- null nur bei deren Metadaten-Ladefehler.
     * Ohne diese Prop fiel "Fehler melden" bisher faelschlich auf den Episode-/Release-Titel
     * zurueck, obwohl der Hinweis sich fachlich auf das PROJEKT bezieht, nicht die Episode.
     */
    animeTitle: string | null
  }

/**
 * D-30 (Plan 191-35): lesbares Label fuer die konkrete, auf dieser Seite gezeigte Release-ID,
 * mit der "Fehler melden" den Hinweis vorausgewaehlt -- Format "Episode {Nummer} — {Titel}",
 * optional um " · {Version}" ergaenzt. Eine leere Versionsangabe haengt NIE einen leeren
 * " · "-Trenner an (kein "Episode 12 — Schnee · ").
 */
function buildRelatedReleaseLabel(
  props: Pick<ReleaseDetailHeroProps, 'episode_number' | 'episode_title' | 'title' | 'version'>,
): string {
  const base = `Episode ${props.episode_number} — ${props.episode_title ?? props.title}`
  const version = props.version.trim()
  return version ? `${base} · ${version}` : base
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
        {/* Derselbe dezente "Fehler melden"-Einstiegspunkt wie auf der Projektseite -- nur bei
            genau einer Zielgruppe gemountet, weil eine Coop-Release mit mehreren Gruppen keine
            eindeutige Zielgruppe fuer einen Hinweis hat (bewusste Scope-Grenze, keine
            Mehrfachauswahl gebaut, D-12/191-UI-SPEC.md Contract D3). */}
        {props.groups.length === 1 ? (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <ReportHintEntryPoint
              fansubGroupId={props.groupID}
              fansubGroupName={props.groups[0].name}
              animeId={props.animeID}
              // D-30 (Plan 191-35): der echte Projekttitel -- der bisherige Fallback
              // (episode_title ?? title) war der Bug und bleibt nur noch als Fallback fuer
              // den Fall, dass die Projekt-Metadaten dieser Seite nicht geladen werden konnten.
              animeTitle={props.animeTitle ?? props.episode_title ?? props.title}
              relatedReleaseVersionId={props.release_version_id}
              relatedReleaseLabel={buildRelatedReleaseLabel(props)}
            />
          </div>
        ) : null}
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
