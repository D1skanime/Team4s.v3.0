import { Github, Globe, Hash, MessageCircle, Twitter } from 'lucide-react'

import { SectionHeader } from '@/components/ui'
import { getFansubLinkTypeLabel } from '@/lib/fansub-labels'
import type { FansubGroupLink, FansubGroupLinkType } from '@/types/fansub'

import styles from './FansubCommunityLinksSection.module.css'

interface FansubCommunityLinksSectionProps {
  links: FansubGroupLink[]
}

const LINK_TYPE_ICONS: Record<FansubGroupLinkType, typeof Globe> = {
  website: Globe,
  discord: MessageCircle,
  irc: Hash,
  twitter: Twitter,
  github: Github,
}

const LINK_TYPE_ICON_CLASS: Record<FansubGroupLinkType, string> = {
  website: 'iconWebsite',
  discord: 'iconDiscord',
  irc: 'iconIrc',
  twitter: 'iconTwitter',
  github: 'iconGithub',
}

function iconForLinkType(linkType: FansubGroupLinkType) {
  return LINK_TYPE_ICONS[linkType] ?? Globe
}

export function FansubCommunityLinksSection({ links }: FansubCommunityLinksSectionProps) {
  if (links.length === 0) {
    return null
  }

  return (
    <section id="community">
      <SectionHeader title="Community & Links" />
      <ul className={styles.chipList}>
        {links.map((link) => {
          const Icon = iconForLinkType(link.link_type)
          const name = link.name?.trim()
          const displayText = name || getFansubLinkTypeLabel(link.link_type)

          return (
            <li key={link.id}>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className={styles.chip}
              >
                <Icon
                  size={16}
                  aria-hidden="true"
                  className={`${styles.chipIcon} ${styles[LINK_TYPE_ICON_CLASS[link.link_type] ?? 'iconWebsite']}`}
                />
                <span className={styles.chipName}>{displayText}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
