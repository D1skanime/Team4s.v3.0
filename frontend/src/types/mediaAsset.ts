// Media asset types for episode extras (OP, ED, Karaoke, Insert)

export type MediaAssetType = 'opening' | 'ending' | 'karaoke' | 'insert'

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
  opening: MediaAsset[]
  ending: MediaAsset[]
  karaoke: MediaAsset[]
  insert: MediaAsset[]
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
