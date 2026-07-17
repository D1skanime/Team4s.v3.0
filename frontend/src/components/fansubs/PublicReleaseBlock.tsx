'use client'

import Image from 'next/image'
import { Eye, FileText, Image as ImageIcon, Users } from 'lucide-react'
import type { CSSProperties } from 'react'

import { Badge, Button, Card, EmptyState, SectionHeader } from '@/components/ui'

import styles from './PublicReleaseBlock.module.css'

export interface PublicReleaseImagePreview {
  id: number
  src: string
  label: string
  alt: string
}

export interface PublicReleaseNotePreview {
  id: number
  author: string
  excerpt: string
}

export interface PublicReleaseContributorPreview {
  id: number
  name: string
  roleLabel: string
}

export interface PublicReleaseTimelineSegment {
  id: number
  type: 'OP' | 'ED' | 'IN' | 'KARA' | 'OTHER'
  label: string
  timeLabel?: string
  leftPercent: number
  widthPercent: number
  href: string
  versionLabel?: string
}

export interface PublicReleasePreview {
  id: number
  href: string
  episodeLabel: string
  title: string
  versionLabel?: string
  releasedAtLabel?: string
  durationLabel: string
  imageCount: number
  noteCount: number
  contributorCount: number
  heroImage?: PublicReleaseImagePreview
  imagePreviews?: PublicReleaseImagePreview[]
  notePreviews?: PublicReleaseNotePreview[]
  contributors?: PublicReleaseContributorPreview[]
  timelineSegments: PublicReleaseTimelineSegment[]
}

interface PublicReleaseBlockProps {
  title?: string
  description?: string
  latestRelease?: PublicReleasePreview
  releases: PublicReleasePreview[]
  layout?: 'auto' | 'mobile'
  emptyTitle?: string
  emptyDescription?: string
}

function segmentStyle(segment: PublicReleaseTimelineSegment): CSSProperties {
  return {
    '--segment-left': `${segment.leftPercent}%`,
    '--segment-width': `${segment.widthPercent}%`,
  } as CSSProperties
}

function segmentLabelAlignment(segment: PublicReleaseTimelineSegment): 'start' | 'center' | 'end' {
  if (segment.leftPercent < 20) return 'start'
  if (segment.leftPercent + segment.widthPercent > 80) return 'end'
  return 'center'
}

function timelineLineColor(type: PublicReleaseTimelineSegment['type']): string {
  if (type === 'OP') return 'rgba(68, 255, 164, 0.72)'
  if (type === 'ED') return 'rgba(44, 205, 255, 0.72)'
  if (type === 'IN' || type === 'KARA') return 'rgba(188, 92, 255, 0.74)'
  return 'rgba(83, 102, 136, 0.44)'
}

function timelineTrackStyle(segments: PublicReleaseTimelineSegment[]): CSSProperties {
  const sortedSegments = [...segments].sort((left, right) => left.leftPercent - right.leftPercent)
  const stops = ['rgba(68, 255, 164, 0.2) 0%']

  sortedSegments.forEach((segment) => {
    const color = timelineLineColor(segment.type)
    const left = Math.max(0, Math.min(segment.leftPercent - 1.5, 100))
    const right = Math.max(0, Math.min(segment.leftPercent + segment.widthPercent + 1.5, 100))
    stops.push(`${color} ${left}%`, `${color} ${right}%`)
  })

  stops.push('rgba(44, 205, 255, 0.2) 100%')
  return { '--timeline-gradient': `linear-gradient(90deg, ${stops.join(', ')})` } as CSSProperties
}

function segmentClassName(segment: PublicReleaseTimelineSegment): string {
  if (segment.type === 'OP') return `${styles.timelineSegment} ${styles.timelineSegmentOp}`
  if (segment.type === 'ED') return `${styles.timelineSegment} ${styles.timelineSegmentEd}`
  if (segment.type === 'IN' || segment.type === 'KARA') {
    return `${styles.timelineSegment} ${styles.timelineSegmentIn}`
  }
  return `${styles.timelineSegment} ${styles.timelineSegmentOther}`
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function versionOnlyLabel(label?: string): string {
  const version = label?.match(/\bv(?:ersion)?\.?\s*\d+[a-z0-9._-]*/i)?.[0]
  return version ?? ''
}

function releaseMetaLabel(release: PublicReleasePreview): string {
  return release.title ?? ''
}

function ReleaseStats({ release }: { release: PublicReleasePreview }) {
  return (
    <div className={styles.releaseStatRow}>
      <span className={styles.releaseStat}>
        <ImageIcon size={14} aria-hidden="true" />
        {release.imageCount} Bilder
      </span>
      <span className={styles.releaseTitleDivider} aria-hidden="true">
        |
      </span>
      <span className={styles.releaseStat}>
        <FileText size={14} aria-hidden="true" />
        {release.noteCount} Texte
      </span>
      <span className={styles.releaseTitleDivider} aria-hidden="true">
        |
      </span>
      <span className={styles.releaseStat}>
        <Users size={14} aria-hidden="true" />
        {release.contributorCount} Fansubber
      </span>
    </div>
  )
}

function Timeline({ release }: { release: PublicReleasePreview }) {
  return (
    <div className={styles.timeline}>
      <h4 className={styles.timelineMobileTitle}>Karas</h4>
      <div className={styles.timelineTrack} style={timelineTrackStyle(release.timelineSegments)}>
        {release.timelineSegments.map((segment) => (
          <a
            key={segment.id}
            href={segment.href}
            className={segmentClassName(segment)}
            style={segmentStyle(segment)}
            aria-label={`${segment.label} öffnen`}
          >
            <span
              className={styles.timelineSegmentLabel}
              data-alignment={segmentLabelAlignment(segment)}
            >
              {segment.label}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

function FeaturedRelease({ release }: { release: PublicReleasePreview }) {
  const previewImages = (release.imagePreviews ?? []).filter((image) => image.id !== release.heroImage?.id)
  const previewNotes = release.notePreviews ?? []
  const contributors = release.contributors ?? []
  const releaseVersion = versionOnlyLabel(release.versionLabel)
  const releaseTitle = releaseMetaLabel(release)

  return (
    <Card variant="section" className={styles.featuredCard}>
      <div className={styles.featuredGrid}>
        <div className={styles.featuredImageFrame}>
          {release.heroImage ? (
            <Image
              src={release.heroImage.src}
              alt={release.heroImage.alt}
              fill
              sizes="(max-width: 760px) 100vw, 420px"
              className={styles.featuredImage}
              unoptimized
            />
          ) : null}
          <div className={styles.featuredImageOverlay}>
            {release.versionLabel ? <Badge variant="muted">{release.versionLabel}</Badge> : null}
          </div>
        </div>

        <div className={styles.featuredBody}>
          <div>
            <p className={styles.releaseEyebrow}>Neuestes Fansub-Release</p>
            <div className={styles.releaseTitleLine}>
              <h3 className={styles.releaseTitle}>{release.episodeLabel}</h3>
              <span className={styles.releaseTitleDivider} aria-hidden="true">
                |
              </span>
              <span className={styles.releaseVersionLine}>{releaseVersion}</span>
              <span className={styles.releaseTitleDivider} aria-hidden="true">
                |
              </span>
              <span className={styles.releaseContextLine}>{releaseTitle}</span>
            </div>
          </div>
          <ReleaseStats release={release} />
          <Timeline release={release} />
          {previewImages.length > 0 ? (
            <div className={styles.previewGrid}>
              {previewImages.map((image) => (
                <div key={image.id} className={styles.previewTile}>
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="140px"
                    className={styles.previewImage}
                    unoptimized
                  />
                  <Badge variant="muted" className={styles.previewLabel}>
                    {image.label}
                  </Badge>
                </div>
              ))}
            </div>
          ) : null}
          {previewNotes.length > 0 ? (
            <div className={styles.noteGrid}>
              {previewNotes.map((note) => (
                <article key={note.id} className={styles.noteItem}>
                  <span className={styles.noteAuthor}>{note.author}</span>
                  <p className={styles.noteExcerpt}>{note.excerpt}</p>
                </article>
              ))}
            </div>
          ) : null}
          {contributors.length > 0 ? (
            <div className={styles.contributorRow} aria-label="Fansubber">
              {contributors.map((contributor) => (
                <span
                  key={contributor.id}
                  className={styles.contributorAvatar}
                  title={`${contributor.name} - ${contributor.roleLabel}`}
                >
                  {initials(contributor.name)}
                </span>
              ))}
            </div>
          ) : null}
          <Button href={release.href} variant="secondary" size="sm" leftIcon={<Eye size={15} aria-hidden="true" />}>
            Vollständiges Release ansehen
          </Button>
        </div>
      </div>
    </Card>
  )
}

function ReleaseRow({ release }: { release: PublicReleasePreview }) {
  const releaseVersion = versionOnlyLabel(release.versionLabel)
  const releaseTitle = releaseMetaLabel(release)

  return (
    <Card variant="flat" className={styles.releaseRow}>
      <div className={styles.releaseRowHeader}>
        <div className={styles.releaseRowMain}>
          <div className={styles.releaseRowTitleLine}>
            <a href={release.href} className={styles.releaseRowTitle}>
              {release.episodeLabel}
            </a>
            <span className={styles.releaseTitleDivider} aria-hidden="true">
              |
            </span>
            <span className={styles.releaseRowVersion}>{releaseVersion}</span>
            <span className={styles.releaseTitleDivider} aria-hidden="true">
              |
            </span>
            <span className={styles.releaseRowMeta}>{releaseTitle}</span>
          </div>
          <ReleaseStats release={release} />
        </div>
        <div className={styles.releaseRowActions}>
          <Button href={release.href} variant="subtle" size="sm" leftIcon={<Eye size={15} aria-hidden="true" />}>
            Ansicht
          </Button>
        </div>
      </div>
      <Timeline release={release} />
    </Card>
  )
}

export function PublicReleaseBlock({
  title = 'Releases zum Fansub',
  description = 'Öffentliche Release-Übersicht mit neuestem Release, Vorschauen, Rollenbeiträgen und Timeline.',
  latestRelease,
  releases,
  layout = 'auto',
  emptyTitle = 'Noch keine Releases sichtbar',
  emptyDescription = 'Für dieses Fansub-Projekt sind noch keine öffentlichen Release-Daten freigegeben.',
}: PublicReleaseBlockProps) {
  const hasReleases = releases.length > 0 || Boolean(latestRelease)

  return (
    <section className={layout === 'mobile' ? `${styles.section} ${styles.sectionMobile}` : styles.section}>
      <SectionHeader title={title} description={description} underline />
      {latestRelease ? <FeaturedRelease release={latestRelease} /> : null}
      {releases.length > 0 ? (
        <div className={styles.releaseStack}>
          {releases.map((release) => <ReleaseRow key={release.id} release={release} />)}
        </div>
      ) : null}
      {!hasReleases ? (
        <div className={styles.emptyWrap}>
          <EmptyState variant="compact" title={emptyTitle} description={emptyDescription} />
        </div>
      ) : null}
    </section>
  )
}
