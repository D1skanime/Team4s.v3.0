import { resolveApiUrl } from '@/lib/api'
import type {
  AdminAnimeJellyfinContext,
  AdminAnimeJellyfinMetadataPreviewResult,
  AdminJellyfinIntakeAssetSlots,
} from '@/types/admin'

export type AssetDecisionKind = 'cover' | 'logo' | 'banner' | 'backgrounds' | 'background_video'

export interface AssetCardDescriptor {
  key: string
  title: string
  kind: AssetDecisionKind
  countLabel?: string
  previewURL?: string
  previewURLs?: string[]
  hasIncoming: boolean
}

export function formatCoverSource(source: AdminAnimeJellyfinContext['cover']['current_source']): string {
  switch (source) {
    case 'provider':
      return 'Provider-Cover aktiv'
    case 'manual':
      return 'Manuelles Cover aktiv'
    case 'none':
      return 'Noch kein Cover gesetzt'
  }
}

export function summarizeAssetSlots(slots?: AdminJellyfinIntakeAssetSlots): string {
  if (!slots) return 'Keine Provider-Assets geladen.'

  const parts: string[] = []
  if (slots.cover.present) parts.push('Poster')
  if (slots.logo.present) parts.push('Logo')
  if (slots.banner.present) parts.push('Banner')
  if (slots.backgrounds.length > 0) parts.push(`${slots.backgrounds.length} Backgrounds`)
  if (slots.background_video.present) parts.push('Background-Video')

  if (parts.length === 0) {
    return 'Keine Provider-Assets gefunden.'
  }

  return `Verfuegbar: ${parts.join(', ')}`
}

export function summarizeAssetSlotDecision(
  kind: AssetDecisionKind,
  options: {
    hasIncoming: boolean
    currentSource?: AdminAnimeJellyfinContext['cover']['current_source']
  },
): string {
  switch (kind) {
    case 'cover':
      if (!options.hasIncoming) return 'Kein Provider-Cover verfuegbar'
      if (options.currentSource === 'provider') return 'Provider-Cover ist bereits aktiv'
      if (options.currentSource === 'manual') return 'Manuelles Cover bleibt geschuetzt, bis es explizit ersetzt wird'
      return 'Provider-Cover kann explizit uebernommen werden'
    case 'banner':
      return options.hasIncoming
        ? 'Banner kann explizit aus Jellyfin uebernommen oder manuell ersetzt werden'
        : 'Kein Provider-Banner verfuegbar'
    case 'logo':
      return options.hasIncoming
        ? 'Logo kann manuell ersetzt oder explizit aus Jellyfin uebernommen werden'
        : 'Kein Provider-Logo verfuegbar'
    case 'backgrounds':
      return options.hasIncoming
        ? 'Backgrounds koennen explizit aus Jellyfin uebernommen oder manuell ergaenzt werden'
        : 'Keine Provider-Backgrounds verfuegbar'
    case 'background_video':
      return options.hasIncoming
        ? 'Background-Video kann manuell ersetzt oder explizit aus Jellyfin uebernommen werden'
        : 'Kein Provider-Background-Video verfuegbar'
  }
}

export function buildAssetCards(
  context: AdminAnimeJellyfinContext | null,
  preview: AdminAnimeJellyfinMetadataPreviewResult | null,
): AssetCardDescriptor[] {
  const sourceSlots = preview?.asset_slots || context?.asset_slots
  if (!sourceSlots) {
    return []
  }

  const backgroundPreviewURLs = sourceSlots.backgrounds
    .filter((slot) => slot.present && slot.url?.trim())
    .map((slot) => resolveApiUrl(slot.url))

  return [
    {
      key: 'cover',
      title: 'Cover',
      kind: 'cover',
      previewURL: resolveApiUrl(preview?.cover.incoming_image || sourceSlots.cover.url),
      hasIncoming: Boolean(preview?.cover.incoming_available || sourceSlots.cover.present),
    },
    {
      key: 'banner',
      title: 'Banner',
      kind: 'banner',
      previewURL: resolveApiUrl(sourceSlots.banner.url),
      hasIncoming: sourceSlots.banner.present,
    },
    {
      key: 'logo',
      title: 'Logo',
      kind: 'logo',
      previewURL: resolveApiUrl(sourceSlots.logo.url),
      hasIncoming: sourceSlots.logo.present,
    },
    {
      key: 'backgrounds',
      title: 'Backgrounds',
      kind: 'backgrounds',
      countLabel: sourceSlots.backgrounds.length > 0 ? `${sourceSlots.backgrounds.length} Slots` : undefined,
      previewURL: backgroundPreviewURLs[0],
      previewURLs: backgroundPreviewURLs,
      hasIncoming: sourceSlots.backgrounds.length > 0,
    },
    {
      key: 'background_video',
      title: 'Background-Video',
      kind: 'background_video',
      previewURL: resolveApiUrl(sourceSlots.background_video.url),
      hasIncoming: sourceSlots.background_video.present,
    },
  ]
}

export function formatSourceKindLabel(value: AdminAnimeJellyfinContext['source_kind']): string {
  return value === 'manual' ? 'Manuell' : 'Jellyfin'
}
