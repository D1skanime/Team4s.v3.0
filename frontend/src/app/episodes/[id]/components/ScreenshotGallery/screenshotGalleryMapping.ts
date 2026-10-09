// Pure mapping helper (D-13): turns a screenshot-category PublicReleaseImage into the
// widened lightbox item FansubMediaLightbox expects. No React/DOM imports.

import type { PublicImageLightboxItem } from '@/components/fansubs/FansubMediaLightbox'
import type { PublicReleaseImage } from '@/types/releaseDetail'
import { CATEGORY_LABELS } from '@/types/releaseVersionMedia'

export function toScreenshotLightboxItem(image: PublicReleaseImage, episodeLabel: string | undefined): PublicImageLightboxItem {
  const categoryLabel = CATEGORY_LABELS.screenshot
  const title = image.title?.trim() || categoryLabel

  return {
    id: image.id,
    title,
    caption: image.caption,
    media_type: categoryLabel,
    original_url: image.original_url ?? image.thumbnail_url,
    display_url: image.display_url,
    thumbnail_url: image.thumbnail_url,
    category: 'screenshot',
    episode_label: episodeLabel,
    release_version_label: undefined,
    release_href: undefined,
  }
}
