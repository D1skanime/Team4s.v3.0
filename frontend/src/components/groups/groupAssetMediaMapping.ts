// Pure Mapping-Funktion: GroupAssetImage -> PublicImageLightboxItem (Phase 177 Plan 07).
// GroupAssetImage.id ist ein String (Jellyfin-Ordner-Scan, keine media_assets-Zeile) -- die
// id des Zielkontrakts ist jedoch eine Number. Da dieser Konsument sein Array stets vollständig
// und index-basiert navigiert (nie per ID-Lookup), ist der Array-Index eine sichere synthetische
// id. Diese Datenform hat kein Caption-/Kategorie-/Episode-/Release-Konzept -- alle diese Felder
// bleiben strukturell undefined (D-22: graceful omission). Keine React-/DOM-Importe
// (D-13-konform direkt testbar).

import type { PublicImageLightboxItem } from '@/components/fansubs/FansubMediaLightbox'
import type { GroupAssetImage } from '@/types/groupAsset'

export function toGroupAssetLightboxItem(image: GroupAssetImage, index: number): PublicImageLightboxItem {
  return {
    id: index,
    title: image.title,
    caption: undefined,
    description: undefined,
    media_type: image.title,
    original_url: image.image_url,
    display_url: undefined,
    thumbnail_url: image.thumbnail_url,
    category: undefined,
    episode_label: undefined,
    release_version_label: undefined,
    release_href: undefined,
  }
}
