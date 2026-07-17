'use client'

import { useState } from 'react'

import { Accordion, Badge, Card } from '@/components/ui'
import type { ReleaseDetailResponse } from '@/types/releaseDetail'

import { ContributorsRow } from './ContributorsRow'
import styles from './page.module.css'

type ReleaseDetailHeroProps = Pick<ReleaseDetailResponse,
  'episode_number' | 'episode_title' | 'title' | 'version' | 'groups' | 'release_date' |
  'duration_seconds' | 'resolution' | 'video_codec' | 'subtitle_tracks' |
  'preview_image' | 'images_count' | 'notes_count' | 'contributors_count'> & {
    animeLogoFallbackUrl: string | null
    atmosphereUrl?: string | null
    subtitle_type?: string | null
    contributors?: ReleaseDetailResponse['contributors']
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

function subtitleSummary(type: string | null | undefined, tracks: ReleaseDetailResponse['subtitle_tracks']) {
  const normalized = type?.toLowerCase() === 'hard' || type?.toLowerCase() === 'hardsub' ? 'Hardsub' : 'Softsub'
  const languages = [...new Set(tracks.map(track => track.label || track.language).filter(Boolean))]
  return languages.length ? `${normalized} · ${languages.join(', ')}` : normalized
}

export function ReleaseDetailHero(props: ReleaseDetailHeroProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const image = props.preview_image
  const imageSrc = image?.thumbnail_url ?? image?.original_url ?? props.animeLogoFallbackUrl
  const isLogoFallback = !image && Boolean(props.animeLogoFallbackUrl)
  const facts = [
    ['Version', props.version],
    ['Auflösung', props.resolution],
    ['Veröffentlicht', formatDate(props.release_date)],
    ['Dauer', formatDuration(props.duration_seconds)],
    ['Video-Codec', props.video_codec],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]))
  const subType = subtitleSummary(props.subtitle_type, props.subtitle_tracks)
  const groupLine = `${props.groups.map(group => group.name).join(' · ')} · ${subType.split(' · ')[0]}`

  function showContributors() {
    setOpenIds(new Set(['details']))
    window.setTimeout(() => document.getElementById('beteiligte')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  const header = <div className={styles.heroSummary}>
    {imageSrc ? <div className={`${styles.heroImageShell} ${isLogoFallback ? styles.heroLogoFallback : ''}`} style={isLogoFallback && props.atmosphereUrl ? { backgroundImage: `url("${props.atmosphereUrl}")` } : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc} alt={image?.caption ?? `Anime-Logo zu ${props.title}`} className={styles.heroImage} loading="eager" />
    </div> : null}
    <div className={styles.heroHeading}>
      <p className={styles.heroEyebrow}>Episode {props.episode_number}</p>
      <h1 className={styles.heroTitle}>{props.episode_title ?? props.title}</h1>
      {props.episode_title && props.title !== props.episode_title ? <p className={styles.heroReleaseTitle}>{props.title}</p> : null}
      <p className={styles.heroGroupLine}>{groupLine}</p>
      <span className={styles.heroDetailsLabel}>Details</span>
    </div>
  </div>

  return <>
    <section className={`${styles.hero} ${imageSrc ? '' : styles.heroTextOnly}`} data-release-hero="independent" data-release-accordion="true">
      <Accordion mode="single" openIds={openIds} onOpenChange={setOpenIds} items={[{
        id: 'details',
        title: header,
        children: <div className={styles.heroPanel}>
          <dl className={styles.technicalGrid}>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <Card variant="nestedFlat" className={styles.subtitleBlock}><strong>Untertitel</strong><span>{subType}</span></Card>
          <ContributorsRow contributors={props.contributors ?? []} groups={props.groups} />
          <div className={styles.statsRow}><span>{props.images_count} Bilder</span><span>{props.notes_count} Texte</span><span>{props.contributors_count} Fansubber</span></div>
        </div>,
      }]} />
    </section>
    <nav className={styles.releaseAnchors} aria-label="Release-Inhalte">
      <a href="#galerie">Bilder</a><a href="#textbeitraege">Texte</a><button type="button" onClick={showContributors}>Fansubber</button>
    </nav>
  </>
}
