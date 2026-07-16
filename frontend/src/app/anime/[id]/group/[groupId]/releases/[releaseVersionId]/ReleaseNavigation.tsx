import { AdjacentNavigation } from '@/components/ui'
import type { PublicReleaseNavigationTarget } from '@/types/releaseDetail'

function item(target: PublicReleaseNavigationTarget | null, animeID: number, groupID: number, direction: 'previous' | 'next') {
  if (!target) return null
  return {
    href: `/anime/${animeID}/group/${groupID}/releases/${target.release_version_id}`,
    label: `Episode ${target.episode_number} · Version ${target.version}`,
    ariaLabel: `${direction === 'previous' ? 'Vorheriger' : 'Nächster'} Release: Episode ${target.episode_number}, Version ${target.version}`,
  }
}

export function ReleaseNavigation({ animeID, groupID, previous, next }: { animeID: number; groupID: number; previous: PublicReleaseNavigationTarget | null; next: PublicReleaseNavigationTarget | null }) {
  return <AdjacentNavigation previous={item(previous, animeID, groupID, 'previous')} next={item(next, animeID, groupID, 'next')} ariaLabel="Vorheriger und nächster Release" />
}
