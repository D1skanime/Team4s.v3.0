// Media asset types used across release process media and existing grouped theme extras.

export type ThemeExtraMediaAssetType = 'opening' | 'ending' | 'karaoke' | 'insert'
export type ReleaseMediaAssetType = 'video' | 'poster' | 'banner' | 'logo' | 'image' | 'other'
export type MediaAssetType = ThemeExtraMediaAssetType | ReleaseMediaAssetType

export interface MediaAsset {
  id: string
  type: MediaAssetType
  title: string
  duration_seconds?: number | null
  thumbnail_url?: string | null
  order: number
  stream_path: string
}

export interface MediaAssetsByType {
  video: MediaAsset[]
  poster: MediaAsset[]
  banner: MediaAsset[]
  logo: MediaAsset[]
  image: MediaAsset[]
  other: MediaAsset[]
}

export interface MediaAssetsSectionProps {
  releaseId?: number
  assets?: MediaAsset[]
  errorMessage?: string | null
}

export interface ReleaseAssetsData {
  release_id: number
  assets: MediaAsset[]
}

export interface ReleaseAssetsResponse {
  data: ReleaseAssetsData
}
