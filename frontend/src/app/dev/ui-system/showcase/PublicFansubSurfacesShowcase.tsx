'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { ReactNode } from 'react'

import { Button, Card, SectionHeader } from '@/components/ui'
import { FansubHeroSection } from '@/components/fansubs/FansubHeroSection'
import { FansubHistorySection } from '@/components/fansubs/FansubHistorySection'
import { FansubMediaLightbox } from '@/components/fansubs/FansubMediaLightbox'
import { FansubMediaSection } from '@/components/fansubs/FansubMediaSection'
import { FansubProjectsSection } from '@/components/fansubs/FansubProjectsSection'
import { FansubStorySection } from '@/components/fansubs/FansubStorySection'
import { FansubTeamSection } from '@/components/fansubs/FansubTeamSection'

import {
  showcaseGroup,
  showcaseHistorical,
  showcaseHistory,
  showcaseLinks,
  showcaseMedia,
  showcaseMembers,
  showcaseOverflowProjects,
  showcaseStories,
} from './PublicFansubSurfacesShowcase.fixtures'
import styles from '../page.module.css'

function PublicSurfaceFrame({
  title,
  width,
  children,
}: {
  title: string
  width: string
  children: ReactNode
}) {
  return (
    <article className={styles.publicSurfaceFrame}>
      <div className={styles.publicSurfaceFrameHeader}>
        <strong>{title}</strong>
        <code>{width}</code>
      </div>
      <div className={styles.publicSurfaceViewport} style={{ '--surface-width': width } as CSSProperties}>
        {children}
      </div>
    </article>
  )
}

export function PublicFansubSurfacesShowcase() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const heroStats = [
    { label: 'Anime-Projekte', value: 20 },
    { label: 'Release-Versionen', value: 59 },
    { label: 'Mitglieder', value: 4 },
  ]

  return (
    <Card variant="section">
      <SectionHeader
        eyebrow="09"
        title="Public Fansub Surfaces"
        description="Die echten Public-Fansub-Komponenten als UI-Wahrheit: Header, Projekte, Geschichte, Historie, Erfolge, Medien, Lightbox und Team."
      />
      <div className={styles.publicSurfaceStack}>
        <Card
          variant="flat"
          title="Verbindlichkeit"
          description="Dieser Block rendert die produktiven Public-Komponenten mit Mockdaten. Änderungen an diesen Komponenten wirken dadurch im UI dev und auf den echten Public-Seiten."
        />

        <div className={styles.publicSurfaceFrames}>
          <PublicSurfaceFrame title="Desktop Header" width="1180px">
            <FansubHeroSection group={showcaseGroup} stats={heroStats} communityLinks={showcaseLinks} />
          </PublicSurfaceFrame>
          <PublicSurfaceFrame title="Tablet Header" width="820px">
            <FansubHeroSection group={showcaseGroup} stats={heroStats} communityLinks={showcaseLinks} />
          </PublicSurfaceFrame>
          <PublicSurfaceFrame title="Mobile Header" width="390px">
            <FansubHeroSection group={showcaseGroup} stats={heroStats} communityLinks={showcaseLinks} />
          </PublicSurfaceFrame>
        </div>

        <PublicSurfaceFrame title="Projekt-Karussell" width="1180px">
          <FansubProjectsSection projects={showcaseOverflowProjects} groupId={showcaseGroup.id} groupSlug={showcaseGroup.slug} />
        </PublicSurfaceFrame>

        <PublicSurfaceFrame title="Geschichte" width="1180px">
          <FansubStorySection group={showcaseGroup} stories={showcaseStories} />
        </PublicSurfaceFrame>

        <PublicSurfaceFrame title="Historie & Erfolge" width="1180px">
          <FansubHistorySection history={showcaseHistory} />
        </PublicSurfaceFrame>

        <PublicSurfaceFrame title="Medien-Galerie" width="1180px">
          <FansubMediaSection media={showcaseMedia} />
          <div className={styles.publicSurfaceActionRow}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setLightboxIndex(0)}>
              Lightbox mit erstem Medium öffnen
            </Button>
          </div>
          <FansubMediaLightbox
            media={showcaseMedia}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        </PublicSurfaceFrame>

        <PublicSurfaceFrame title="Team & Mitwirkende" width="1180px">
          <FansubTeamSection members={showcaseMembers} historical={showcaseHistorical} status="active" />
        </PublicSurfaceFrame>
      </div>
    </Card>
  )
}
