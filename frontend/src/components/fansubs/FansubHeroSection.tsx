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

function yearsLabel(group: FansubGroup): string | null {
  if (group.founded_year && group.dissolved_year) return `${group.founded_year} bis ${group.dissolved_year}`
  if (group.founded_year) return `gegründet ${group.founded_year}`
  if (group.dissolved_year) return `bis ${group.dissolved_year}`
  return null
}

export function FansubHeroSection({ group, isCollaboration, collaborationMembers }: FansubHeroSectionProps) {
  const logoURL = resolveApiUrl(group.logo_url || '')
  const bannerURL = resolveApiUrl(group.banner_url || '')
  const years = yearsLabel(group)
  const factSummary = buildFansubFactSummary(group)

  return (
    <Card id="hero" variant="section" className={styles.hero}>
      {bannerURL ? (
        <FansubBannerDisplay bannerURL={bannerURL} altText={`${group.name} Banner`} />
      ) : null}

      <div className={styles.heroContent}>
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

        <div className={styles.heroCopy}>
          <p className={styles.slug}>/{group.slug}</p>
          <div className={styles.heroTitleRow}>
            <h1 className={styles.title}>{group.name}</h1>
            <Badge variant={statusVariant(group.status)}>{statusLabel(group.status)}</Badge>
          </div>
          <p className={styles.subtitle}>{factSummary || 'Keine Kurzbeschreibung vorhanden.'}</p>

          <div className={styles.heroFacts}>
            {years ? <Badge variant="info">{years}</Badge> : null}
            {group.country ? <Badge variant="neutral">{group.country}</Badge> : null}
            {group.website_url ? (
              <a className={styles.heroLink} href={group.website_url} target="_blank" rel="noreferrer">
                Webseite besuchen
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {isCollaboration ? (
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--surface-secondary, #f5f5f5)', borderRadius: 8 }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Dies ist eine Kollaboration zwischen:
          </p>
          {(collaborationMembers ?? []).length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(collaborationMembers ?? []).map((member) => (
                <li key={member.id}>
                  <Link href={'/fansubs/' + member.slug}>
                    <Badge variant="info">{member.name}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
              Keine Gruppenangaben hinterlegt.
            </p>
          )}
        </div>
      ) : null}
    </Card>
  )
}
