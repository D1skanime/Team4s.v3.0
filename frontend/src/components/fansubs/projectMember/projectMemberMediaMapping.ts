// Pure Mapping-Funktion: ProjectMemberMediaItem -> PublicImageLightboxItem (Phase 177 Plan 06).
// Reproduziert das alte, inzwischen entfernte bespoke-Viewer-Feld-Mapping (Kategorie-Label-Fallback,
// Release-Link) 1:1 auf das vom gemeinsamen Viewer (FansubMediaLightbox) erwartete, erweiterte
// Kontrakt-Format. Keine React-/DOM-Importe (D-13-konform direkt testbar).

import type { PublicImageLightboxItem } from '@/components/fansubs/FansubMediaLightbox'
import type { ProjectMemberMediaItem } from '@/types/projectMember'
import { CATEGORY_LABELS } from '@/types/releaseVersionMedia'

export function toProjectMemberLightboxItem(
  item: ProjectMemberMediaItem,
  projectPath: string,
): PublicImageLightboxItem {
  const mediaType = (CATEGORY_LABELS as Record<string, string>)[item.category] ?? item.category

  return {
    id: item.id,
    title: item.title,
    caption: item.caption,
    media_type: mediaType,
    original_url: item.preview_url,
    display_url: undefined,
    thumbnail_url: item.thumbnail_url,
    category: item.category,
    episode_label: item.episode_label,
    release_version_label: item.release_version_label,
    release_href: `${projectPath}/releases/${item.release_version_id}`,
  }
}
