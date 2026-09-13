'use client'

import { useState, type ReactNode } from 'react'

import { ResponsiveImage } from './ResponsiveImage'
import styles from './ArtworkHero.module.css'

export interface ArtworkHeroProps {
  ariaLabel: string
  title: string
  avatar: ReactNode
  status?: ReactNode
  roles?: ReactNode
  context: ReactNode
  metrics?: ReactNode
  actions: ReactNode
  imageUrl?: string | null
  fallbackImageUrl?: string | null
}

/** Light identity surface. Domain code supplies content and already resolved public URLs. */
export function ArtworkHero({
  ariaLabel, title, avatar, status, roles, context, metrics, actions, imageUrl, fallbackImageUrl,
}: ArtworkHeroProps) {
  const [failedSources, setFailedSources] = useState<string[]>([])
  const artwork = [imageUrl, fallbackImageUrl].find((url) => url && !failedSources.includes(url))

  return (
    <section className={styles.hero} aria-label={ariaLabel}>
      <div className={styles.panel}>
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
        <div className={styles.avatar} aria-hidden="true">{avatar}</div>
        <div className={styles.identity}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{title}</h1>
            {status}
          </div>
          {roles ? <div className={styles.roles}>{roles}</div> : null}
          <p className={styles.context}>{context}</p>
        </div>
        <div className={styles.details}>
          {metrics}
          <div className={styles.actions}>{actions}</div>
        </div>
      </div>
    </section>
  )
}
