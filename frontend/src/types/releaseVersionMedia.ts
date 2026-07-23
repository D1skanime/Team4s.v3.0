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
  fansub_group_id?: number | null
  media_asset_id: number
  category: ReleaseVersionMediaCategory
  caption: string | null
  sort_order: number
  is_preview_candidate: boolean
  visibility?: ReleaseVersionMediaVisibility | null
  review_status?: ReleaseVersionMediaReviewStatus | null
  thumbnail_url: string | null
  original_url: string | null
  uploaded_by_user_id: number | null
  can_update?: boolean
  can_delete?: boolean
  created_at: string
  updated_at?: string | null
  deleted_at: string | null
  source_revision?: number | null
  review_state?: ReleaseVersionReviewState | null
  last_activity_at?: string | null
  rejection_category?: ReleaseReviewRejectionCategory | null
  rejection_reason?: string | null
}

export type ReleaseVersionReviewState = 'pending' | 'confirmed' | 'rejected' | 'tombstoned'

export type ReleaseReviewRejectionCategory =
  | 'content.incorrect'
  | 'release_context.wrong'
  | 'quality.insufficient'
  | 'rights.unclear'
  | 'other'

export interface ReleaseVersionMediaListResponse {
  data: ReleaseVersionMediaItem[]
}

/** Per-file result from the batch POST upload endpoint. */
export interface ReleaseVersionMediaUploadResult {
  client_file_name: string
  status: 'ready' | 'processing' | 'failed'
  media_asset_id?: number
  release_version_media_id?: number
  source_revision?: number
  thumbnail_url?: string | null
  error_code?: string
}

export interface ReleaseVersionMediaUploadResponse {
  results: ReleaseVersionMediaUploadResult[]
}

export type ReleaseVersionMediaVisibility = 'intern' | 'oeffentlich'

export type ReleaseVersionMediaReviewStatus =
  | 'in_pruefung'
  | 'freigegeben'
  | 'abgelehnt'
  | 'archiviert'
  | 'entfernt'

export interface ReleaseVersionMediaPatchRequest {
  caption?: string | null
  sort_order?: number
  is_preview_candidate?: boolean
  /** Erwartete Lifecycle-Revision für revisionssichere Änderungen/Neueinreichungen. */
  source_revision?: number
  /** @deprecated Nur für den bestehenden Leader-Metadatenpfad; Submitter senden dieses Feld nicht. */
  visibility?: ReleaseVersionMediaVisibility
  /** @deprecated Nur für den bestehenden Leader-Metadatenpfad; Submitter senden dieses Feld nicht. */
  review_status?: ReleaseVersionMediaReviewStatus
}

export interface ReleaseVersionMediaReorderItem {
  id: number
  sort_order: number
}

export interface ReleaseVersionMediaReorderRequest {
  items: ReleaseVersionMediaReorderItem[]
}

export interface ReleaseVersionCapabilities {
  can_view_media: boolean
  can_upload_media: boolean
  can_update_media: boolean
  can_delete_media: boolean
  can_delete_own_media?: boolean
  can_edit_notes: boolean
  can_manage_segments: boolean
}

export interface ReleaseVersionCapabilitiesResponse {
  data: ReleaseVersionCapabilities
}
