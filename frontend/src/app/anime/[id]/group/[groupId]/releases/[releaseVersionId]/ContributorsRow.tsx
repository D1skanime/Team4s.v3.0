import { SectionHeader } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import type { PublicReleaseContributor } from '@/types/releaseDetail'
import styles from './page.module.css'

export function ContributorsRow({ contributors }: { contributors: PublicReleaseContributor[] }) {
  if (!contributors.length) return null
  return <section id="beteiligte" className={styles.contributorsSection}>
    <SectionHeader title="An diesem Release beteiligt" description={`${contributors.length} Fansubber`} underline />
    <div className={styles.contributorsGrid}>{contributors.map(person => <article key={`${person.member_id}-${person.role_label}`} className={styles.contributorItem}>
      {person.avatar_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img className={styles.contributorAvatar} src={resolveApiUrl(person.avatar_url)} alt="" /> : <span className={styles.contributorAvatar} aria-hidden="true">{person.name.charAt(0).toUpperCase()}</span>}
      <div className={styles.contributorMeta}><strong>{person.name}</strong><span>{person.role_label}</span></div>
    </article>)}</div>
  </section>
}
