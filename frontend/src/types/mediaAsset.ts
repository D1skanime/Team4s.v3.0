// Media asset types for episode extras (OP, ED, Karaoke, Insert)

export type MediaAssetType = 'opening' | 'ending' | 'karaoke' | 'insert'

export interface MediaAsset {
  id: number
  type: MediaAssetType
  title: string
  duration_seconds: number
  thumbnail_url?: string | null
  order: number
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
}
