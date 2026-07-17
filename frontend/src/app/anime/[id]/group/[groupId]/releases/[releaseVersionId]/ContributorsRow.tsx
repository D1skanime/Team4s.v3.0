import Image from 'next/image'
import { SectionHeader } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import type { PublicReleaseContributor, PublicReleaseGroup } from '@/types/releaseDetail'
import styles from './page.module.css'

export function ContributorsRow({ contributors, groups = [] }: { contributors: PublicReleaseContributor[]; groups?: PublicReleaseGroup[] }) {
  if (!contributors.length) return null
  if (!groups.length) return <section id="beteiligte" className={styles.contributorsSection}>
    <SectionHeader title="An diesem Release beteiligt" description={`${contributors.length} Fansubber`} underline />
    <div className={styles.contributorsGrid}>{contributors.map(person => <article key={`${person.member_id}-${person.role_label}`} className={styles.contributorItem}>
      {person.avatar_url ? <Image className={styles.contributorAvatar} src={resolveApiUrl(person.avatar_url)} alt="" width={40} height={40} unoptimized /> : <span className={styles.contributorAvatar} aria-hidden="true">{person.name.charAt(0).toUpperCase()}</span>}
      <div className={styles.contributorMeta}><strong>{person.name}</strong><span>{person.role_label}</span></div>
    </article>)}</div>
  </section>
  return <section id="beteiligte" className={styles.contributorsSection}>
    <SectionHeader title="An diesem Release beteiligt" description={`${contributors.length} Fansubber`} underline />
    {groups.filter(group => contributors.some(person => person.fansub_group_id === group.id)).map(group => <section key={group.id} className={styles.contributorGroup}>
      <SectionHeader title={group.name} eyebrow="Fansub-Gruppe" underline />
      <div className={styles.contributorsGrid}>{contributors.filter(person => person.fansub_group_id === group.id).map(person => <article key={`${person.fansub_group_id}-${person.member_id}-${person.role_label}`} className={styles.contributorItem}>
      {person.avatar_url ? <Image className={styles.contributorAvatar} src={resolveApiUrl(person.avatar_url)} alt="" width={40} height={40} unoptimized /> : <span className={styles.contributorAvatar} aria-hidden="true">{person.name.charAt(0).toUpperCase()}</span>}
      <div className={styles.contributorMeta}><strong>{person.name}</strong><span>{person.role_label}</span></div>
      </article>)}</div>
    </section>)}
  </section>
}
