import Image from 'next/image'
import Link from 'next/link'

import { Badge, Card } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import { buildFansubFactSummary } from '@/lib/fansub-summary'
import type { FansubGroup, FansubGroupSummary } from '@/types/fansub'

import { FansubBannerDisplay } from './FansubBannerDisplay'
import styles from '../../app/fansubs/[slug]/page.module.css'

interface FansubHeroSectionProps {
  group: FansubGroup
  stats?: Array<{ label: string; value: number | string }>
  isCollaboration?: boolean
  collaborationMembers?: FansubGroupSummary[]
}

function buildInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function statusLabel(status: FansubGroup['status']): string {
  if (status === 'active') return 'aktiv'
  if (status === 'inactive') return 'inaktiv'
  return 'aufgelöst'
}

function statusVariant(status: FansubGroup['status']): 'success' | 'warning' | 'muted' {
  if (status === 'active') return 'success'
  if (status === 'inactive') return 'warning'
  return 'muted'
}

export function FansubHeroSection({ group, stats, isCollaboration, collaborationMembers }: FansubHeroSectionProps) {
  const logoURL = resolveApiUrl(group.logo_url || '')
  const bannerURL = resolveApiUrl(group.banner_url || '')
  const factSummary = buildFansubFactSummary(group)
  const heroStats = stats ?? []

  return (
    <Card id="hero" variant="section" className={styles.hero}>
      {bannerURL ? (
        <FansubBannerDisplay bannerURL={bannerURL} altText={`${group.name} Banner`} />
      ) : null}

      <div className={styles.heroHeader}>
        <div className={styles.heroLogo} aria-label={`${group.name} Logo`}>
          {logoURL ? (
            <Image
              src={logoURL}
              alt={`${group.name} Logo`}
              width={132}
              height={132}
              className={styles.heroLogoImage}
              unoptimized
            />
          ) : (
            <span className={styles.heroLogoFallback}>{buildInitials(group.name)}</span>
          )}
        </div>

        <div className={styles.heroIntro}>
          <div className={styles.heroTitleRow}>
            <h1 className={styles.title}>{group.name}</h1>
            <Badge variant={statusVariant(group.status)}>{statusLabel(group.status)}</Badge>
          </div>
          <p className={styles.subtitle}>{factSummary || 'Keine Kurzbeschreibung vorhanden.'}</p>
        </div>
      </div>

      {heroStats.length > 0 ? (
        <dl className={styles.heroStats} aria-label="Gruppenkennzahlen">
          {heroStats.map((stat) => (
            <div key={stat.label} className={styles.heroStatItem}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {group.website_url ? (
        <div className={styles.heroFacts}>
          <a className={styles.heroLink} href={group.website_url} target="_blank" rel="noreferrer">
            Webseite besuchen
          </a>
        </div>
      ) : null}

      {isCollaboration ? (
        <div className={styles.collaborationPanel}>
          <p className={styles.collaborationIntro}>Dies ist eine Kollaboration zwischen:</p>
          {(collaborationMembers ?? []).length > 0 ? (
            <ul className={styles.collaborationList}>
              {(collaborationMembers ?? []).map((member) => (
                <li key={member.id}>
                  <Link href={'/fansubs/' + member.slug} className={styles.collaborationLink}>
                    <Badge variant="info">{member.name}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.collaborationEmpty}>Keine Gruppenangaben hinterlegt.</p>
          )}
        </div>
      ) : null}
    </Card>
  )
}
