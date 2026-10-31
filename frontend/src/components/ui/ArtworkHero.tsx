'use client'

import { useState, type ReactNode } from 'react'

import { Avatar } from './Avatar'
import { Card } from './Card'
import { Heading } from './Heading'
import { ResponsiveImage } from './ResponsiveImage'
import { Text } from './Text'
import styles from './ArtworkHero.module.css'

export interface ArtworkHeroProps {
  ariaLabel: string
  title: string
  avatarLabel: string
  avatarSrc?: string | null
  status?: ReactNode
  roles?: ReactNode
  context: ReactNode
  metrics?: ReactNode
  actions: ReactNode
  imageUrl?: string | null
  fallbackImageUrl?: string | null
}

/** Helle Identitätsfläche für ein Profil oder eine Gruppe, mit optionalem Hintergrund-Artwork,
 *  Avatar, Status und Kennzahlen. */
export function ArtworkHero({
  ariaLabel, title, avatarLabel, avatarSrc, status, roles, context, metrics, actions, imageUrl, fallbackImageUrl,
}: ArtworkHeroProps) {
  const [failedSources, setFailedSources] = useState<string[]>([])
  const artwork = [imageUrl, fallbackImageUrl].find((url) => url && !failedSources.includes(url))

  return (
    <section className={styles.hero} aria-label={ariaLabel}>
      <Card className={styles.panel}>
        {artwork ? (
          <div className={styles.artwork} aria-hidden="true">
            <ResponsiveImage
              key={artwork}
              src={artwork}
              alt=""
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1439px) 100vw, 1480px"
              loading="eager"
              onError={() => setFailedSources((sources) => [...sources, artwork])}
            />
          </div>
        ) : null}
        <div className={styles.avatar}>
          <Avatar label={avatarLabel} src={avatarSrc} size="lg" className={styles.avatarInner} />
        </div>
        <div className={styles.identity}>
          <div className={styles.titleRow}>
            <Heading level={1} size="hero" className={styles.title}>{title}</Heading>
            {status}
          </div>
          {roles ? <div className={styles.roles}>{roles}</div> : null}
          <Text variant="meta" className={styles.context}>{context}</Text>
        </div>
        <div className={styles.details}>
          {metrics}
          <div className={styles.actions}>{actions}</div>
        </div>
      </Card>
    </section>
  )
}
