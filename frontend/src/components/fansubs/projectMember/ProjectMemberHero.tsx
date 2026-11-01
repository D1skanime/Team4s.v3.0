import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

import { ArtworkHero, Badge, Button, MetricList } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import { getCoverUrl } from '@/lib/utils'
import { presentationForRole } from '@/lib/roleCatalog'
import { scrollToSection } from '@/lib/scrollToSection'
import { useRoleCatalog } from '@/providers/RoleCatalogProvider'
import type { ProjectMemberSummary } from '@/types/projectMember'

import styles from './ProjectMemberPage.module.css'

interface ProjectMemberHeroProps {
  summary: ProjectMemberSummary
  memberSlug: string
  groupName: string
  animeTitle: string
  projectPath: string
  bannerUrl?: string | null
  coverImage?: string | null
  sectionsRendered: boolean
}

export function ProjectMemberHero({
  summary,
  memberSlug,
  groupName,
  animeTitle,
  projectPath,
  bannerUrl,
  coverImage,
  sectionsRendered,
}: ProjectMemberHeroProps) {
  const { roles } = useRoleCatalog('anime_contribution')
  const presentedRoles = summary.role_labels.map((value) => {
    const role = roles.find((candidate) => candidate.code === value || candidate.label_de === value)
    return role
      ? { code: role.code, label: role.label_de, order: role.sort_order }
      : { code: value, label: value, order: Number.MAX_SAFE_INTEGER }
  }).sort((left, right) => left.order - right.order)
  const { counts } = summary
  const metrics = [
    { label: counts.episodes === 1 ? 'Folge' : 'Folgen', value: counts.episodes.toLocaleString('de-DE') },
    {
      label: counts.notes === 1 ? 'Beitrag' : 'Beiträge',
      value: counts.notes.toLocaleString('de-DE'),
      onActivate: sectionsRendered ? () => scrollToSection('texte') : undefined,
      activateLabel: 'Zu Texte & Notizen springen',
    },
    {
      label: counts.media === 1 ? 'Medium' : 'Medien',
      value: counts.media.toLocaleString('de-DE'),
      onActivate: sectionsRendered ? () => scrollToSection('bilder') : undefined,
      activateLabel: 'Zu Bilder & Medien springen',
    },
  ]

  return (
    <ArtworkHero
      ariaLabel="Projekt-Mitwirkung"
      title={summary.member_display_name}
      imageUrl={bannerUrl?.trim() ? resolveApiUrl(bannerUrl) : null}
      fallbackImageUrl={coverImage?.trim() ? getCoverUrl(coverImage) : null}
      avatarLabel={summary.member_display_name}
      avatarSrc={summary.member_avatar_url ? resolveApiUrl(summary.member_avatar_url) : null}
      status={summary.is_verified ? <Badge variant="success"><Check size={14} aria-hidden="true" />Verifiziert</Badge> : null}
      roles={presentedRoles.length > 0 ? presentedRoles.map((role) => (
        <Badge
          key={role.code}
          className={styles.roleChip}
          data-role-code={role.code}
          data-color-key={presentationForRole(roles, role.code).colorKey}
        >
          {role.label}
        </Badge>
      )) : null}
      context={<>{animeTitle} · {groupName}</>}
      metrics={<MetricList items={metrics} ariaLabel="Projektbeiträge" variant="inline" valueHeadingLevel={2} />}
      actions={<>
        <Button href={projectPath} variant="subtle" size="sm" leftIcon={<ArrowLeft size={14} aria-hidden="true" />}>
          Zurück zum Projekt
        </Button>
        <Button href={`/members/${memberSlug}`} aria-label="Vollständiges Fansubberprofil" variant="subtle" size="sm" rightIcon={<ArrowRight size={14} aria-hidden="true" />}>
          Fansubberprofil
        </Button>
      </>}
    />
  )
}
