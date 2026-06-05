import { buildFansubFactSummary } from '@/lib/fansub-summary'
import type { FansubGroup } from '@/types/fansub'

import styles from '../../app/fansubs/[slug]/page.module.css'

interface FansubHeroSectionProps {
  group: FansubGroup
}

export function FansubHeroSection({ group }: FansubHeroSectionProps) {
  return (
    <section id="hero" className={styles.hero}>
      <p className={styles.slug}>/{group.slug}</p>
      <h1 className={styles.title}>{group.name}</h1>
      <p className={styles.subtitle}>{buildFansubFactSummary(group) || 'Keine Kurzbeschreibung vorhanden.'}</p>
    </section>
  )
}
