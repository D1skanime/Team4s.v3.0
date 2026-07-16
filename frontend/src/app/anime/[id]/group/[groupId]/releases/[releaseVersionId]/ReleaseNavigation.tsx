import { AdjacentNavigation } from '@/components/ui'
import { buildFansubReleaseHref } from '@/lib/fansubProjectRoutes'
import type { PublicReleaseNavigationTarget } from '@/types/releaseDetail'

function item(target: PublicReleaseNavigationTarget | null, animeID: number, groupID: number, canonicalProjectPath: string | null | undefined, direction: 'previous' | 'next') {
  if (!target) return null
  return {
    href: buildFansubReleaseHref({ animeID, groupID, releaseVersionID: target.release_version_id, canonicalProjectPath }),
    label: `Episode ${target.episode_number} · Version ${target.version}`,
    ariaLabel: `${direction === 'previous' ? 'Vorheriger' : 'Nächster'} Release: Episode ${target.episode_number}, Version ${target.version}`,
  }
}

export function ReleaseNavigation({ animeID, groupID, canonicalProjectPath, previous, next }: { animeID: number; groupID: number; canonicalProjectPath?: string | null; previous: PublicReleaseNavigationTarget | null; next: PublicReleaseNavigationTarget | null }) {
  return <AdjacentNavigation previous={item(previous, animeID, groupID, canonicalProjectPath, 'previous')} next={item(next, animeID, groupID, canonicalProjectPath, 'next')} ariaLabel="Vorheriger und nächster Release" />
}
