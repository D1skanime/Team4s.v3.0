export type ReleaseVersionMediaCategory =
  | 'screenshot'
  | 'typesetting_karaoke'
  | 'fun_outtake'
  | 'other'

export const RELEASE_VERSION_MEDIA_CATEGORIES: ReleaseVersionMediaCategory[] = [
  'screenshot',
  'typesetting_karaoke',
  'fun_outtake',
  'other',
]

export const CATEGORY_LABELS: Record<ReleaseVersionMediaCategory, string> = {
  screenshot: 'Release-Screenshot',
  typesetting_karaoke: 'Typesetting-/Karaoke-Beispiel',
  fun_outtake: 'Spaßbild / Outtake',
  other: 'Sonstiges',
}

/** Whether a category allows the is_preview_candidate flag. */
export const CATEGORY_ALLOWS_PREVIEW: Record<ReleaseVersionMediaCategory, boolean> = {
  screenshot: true,
  typesetting_karaoke: true,
  fun_outtake: false,
  other: false,
}

export interface ReleaseVersionMediaItem {
  id: number
  release_version_id: number
  media_asset_id: number
  category: ReleaseVersionMediaCategory
  caption: string | null
  sort_order: number
  is_preview_candidate: boolean
  thumbnail_url: string | null
  original_url: string | null
  uploaded_by_user_id: number | null
  created_at: string
  deleted_at: string | null
}

export interface ReleaseVersionMediaListResponse {
  data: ReleaseVersionMediaItem[]
}

/** Per-file result from the batch POST upload endpoint. */
export interface ReleaseVersionMediaUploadResult {
  client_file_name: string
  status: 'ready' | 'processing' | 'failed'
  media_asset_id?: number
  release_version_media_id?: number
  thumbnail_url?: string | null
  error_code?: string
}

export interface ReleaseVersionMediaUploadResponse {
  results: ReleaseVersionMediaUploadResult[]
}

export interface ReleaseVersionMediaPatchRequest {
  caption?: string | null
  sort_order?: number
  is_preview_candidate?: boolean
}

export interface ReleaseVersionMediaReorderItem {
  id: number
  sort_order: number
}

export interface ReleaseVersionMediaReorderRequest {
  items: ReleaseVersionMediaReorderItem[]
}
