import Image from 'next/image'
import { Card, SectionHeader } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import type { PublicReleaseContributor, PublicReleaseGroup } from '@/types/releaseDetail'
import styles from './page.module.css'

export function ContributorsRow({ contributors, groups = [] }: { contributors: PublicReleaseContributor[]; groups?: PublicReleaseGroup[] }) {
  if (!contributors.length) return null
  const people = [...contributors.reduce((entries, contributor) => {
    const key = `${contributor.fansub_group_id ?? 'ungrouped'}:${contributor.member_id}`
    const existing = entries.get(key)
    if (existing) {
      if (contributor.role_label && !existing.roles.includes(contributor.role_label)) existing.roles.push(contributor.role_label)
      return entries
    }
    entries.set(key, {
      ...contributor,
      roles: contributor.role_label ? [contributor.role_label] : [],
    })
    return entries
  }, new Map<string, PublicReleaseContributor & { roles: string[] }>()).values()]
  const groupNames = new Map(groups.map(group => [group.id, group.name]))

  return <section id="beteiligte" className={styles.contributorsSection}>
    <SectionHeader title="An diesem Release beteiligt" description={`${people.length} Fansubber`} underline />
    <div className={styles.contributorsGrid}>{people.map(person => <article key={`${person.fansub_group_id ?? 'ungrouped'}:${person.member_id}`}>
      <Card variant="nestedFlat" className={styles.contributorItem}>
        {person.avatar_url ? <Image className={styles.contributorAvatar} src={resolveApiUrl(person.avatar_url)} alt="" width={40} height={40} unoptimized /> : <span className={styles.contributorAvatar} aria-hidden="true">{person.name.charAt(0).toUpperCase()}</span>}
        <div className={styles.contributorMeta}>
          <strong>{person.name}</strong>
          {person.fansub_group_id && groupNames.get(person.fansub_group_id) ? <span>{groupNames.get(person.fansub_group_id)}</span> : null}
          <div className={styles.contributorRoles}>{person.roles.map(role => <span key={role}>{role}</span>)}</div>
        </div>
      </Card>
    </article>)}</div>
  </section>
}
