'use client'

import { ResponsiveImage } from '@/components/ui/ResponsiveImage'

import styles from './AchievementArtwork.module.css'

export type AchievementArtworkDescriptor =
  { kind: 'direct'; src: string } | { kind: 'layered'; motifSrc: string; frameSrc: string }

export type AchievementArtworkProps = {
  descriptor: AchievementArtworkDescriptor
  badgeCode: string
  alt: string
  size: 'hero' | 'stage'
  decorative?: boolean
  priority?: boolean
  className?: string
}

const HERO_SIZES = '(min-width: 658px) 240px, (min-width: 562px) 216px, 192px'
const STAGE_SIZES = '(min-width: 562px) 80px, 64px'

export function AchievementArtwork({
  descriptor,
  badgeCode,
  alt,
  size,
  decorative = false,
  priority = false,
  className,
}: AchievementArtworkProps) {
  const slotClassName = [styles.slot, size === 'hero' ? styles.hero : styles.stage, className]
    .filter(Boolean)
    .join(' ')
  const sizes = size === 'hero' ? HERO_SIZES : STAGE_SIZES
  const meaningfulAlt = decorative ? '' : alt
  const decorativeProps = decorative ? { 'aria-hidden': true as const } : {}

  return (
    <span
      className={slotClassName}
      data-achievement-slot
      data-achievement-size={size}
      data-badge-code={badgeCode}
    >
      {descriptor.kind === 'layered' ? (
        <>
          <span className={styles.mist} aria-hidden="true" />
          <span className={styles.backdrop} aria-hidden="true" />
          <ResponsiveImage
            className={styles.motif}
            src={descriptor.motifSrc}
            alt=""
            width={1254}
            height={1254}
            sizes={sizes}
            priority={priority}
            aria-hidden="true"
          />
          <ResponsiveImage
            className={styles.frame}
            src={descriptor.frameSrc}
            alt={meaningfulAlt}
            width={1254}
            height={1254}
            sizes={sizes}
            priority={priority}
            data-achievement-art={badgeCode}
            {...decorativeProps}
          />
        </>
      ) : (
        <ResponsiveImage
          className={styles.direct}
          src={descriptor.src}
          alt={meaningfulAlt}
          width={1254}
          height={1254}
          sizes={sizes}
          priority={priority}
          data-achievement-art={badgeCode}
          {...decorativeProps}
        />
      )}
    </span>
  )
}
