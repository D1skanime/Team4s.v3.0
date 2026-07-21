import Image from 'next/image'
import Link from 'next/link'

import { Badge, HeroMetrics } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import { getFansubLinkTypeLabel } from '@/lib/fansub-labels'
import { buildFansubFactSummary } from '@/lib/fansub-summary'
import type { FansubGroup, FansubGroupLink, FansubGroupLinkType, FansubGroupSummary } from '@/types/fansub'

import styles from '../../app/fansubs/[slug]/page.module.css'

interface FansubHeroSectionProps {
  group: FansubGroup
  stats?: Array<{ label: string; value: number | string }>
  communityLinks?: FansubGroupLink[]
  isCollaboration?: boolean
  collaborationMembers?: FansubGroupSummary[]
}

const LINK_DOT_COLOR: Record<FansubGroupLinkType, string> = {
  website: 'var(--accent-primary)',
  discord: 'var(--link-discord)',
  irc: 'var(--link-irc)',
  twitter: 'var(--link-twitter)',
  github: 'var(--link-github)',
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

interface HeroLinkChip {
  key: string
  href: string
  label: string
  color: string
}

function buildHeroLinks(group: FansubGroup, communityLinks: FansubGroupLink[]): HeroLinkChip[] {
  const chips: HeroLinkChip[] = []
  const websiteHref = group.website_url?.trim() || communityLinks.find((link) => link.link_type === 'website')?.url
  if (websiteHref) {
    chips.push({ key: 'website', href: websiteHref, label: 'Webseite', color: LINK_DOT_COLOR.website })
  }
  communityLinks
    .filter((link) => link.link_type !== 'website')
    .forEach((link) => {
      chips.push({
        key: `link-${link.id}`,
        href: link.url,
        label: link.name?.trim() || getFansubLinkTypeLabel(link.link_type),
        color: LINK_DOT_COLOR[link.link_type] ?? LINK_DOT_COLOR.website,
      })
    })
  return chips
}

export function FansubHeroSection({
  group,
  stats,
  communityLinks,
  isCollaboration,
  collaborationMembers,
}: FansubHeroSectionProps) {
  const logoURL = resolveApiUrl(group.logo_url || '')
  const bannerURL = resolveApiUrl(group.banner_url || '')
  const factSummary = buildFansubFactSummary(group)
  const heroStats = stats ?? []
  const heroLinks = buildHeroLinks(group, communityLinks ?? [])

  return (
    <section id="hero" className={styles.hero}>
      {bannerURL ? (
        <div
          className={styles.heroBackdrop}
          style={{ backgroundImage: `url("${bannerURL}")` }}
          aria-hidden="true"
        />
      ) : null}

      <div className={styles.heroFg}>
        <div className={styles.heroCard}>
          {bannerURL ? (
            <div className={styles.heroBannerWrap}>
              <Image
                src={bannerURL}
                alt={`${group.name} Banner`}
                width={1200}
                height={200}
                className={styles.heroBannerImg}
                unoptimized
                priority
              />
            </div>
          ) : null}

          <div className={styles.heroBody}>
            <div className={styles.heroHeader}>
              <div className={styles.heroIdentity}>
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

              <HeroMetrics items={heroStats} ariaLabel="Gruppenkennzahlen" />
            </div>

            {heroLinks.length > 0 ? (
              <div className={styles.heroLinks} aria-label="Links und Community">
                {heroLinks.map((chip) => (
                  <a key={chip.key} href={chip.href} target="_blank" rel="noreferrer noopener" className={styles.heroChip}>
                    <span className={styles.heroChipDot} style={{ background: chip.color }} aria-hidden="true" />
                    <span>{chip.label}</span>
                  </a>
                ))}
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
          </div>
        </div>
      </div>
    </section>
  )
}
