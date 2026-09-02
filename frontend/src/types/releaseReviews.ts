export type ReleaseReviewView = 'open' | 'history' | 'own'
export type ReleaseReviewType = 'text' | 'image'
export type ReleaseReviewStatus = 'pending' | 'confirmed' | 'rejected' | 'tombstoned'
export type ReleaseReviewImageCategory =
  | 'screenshot'
  | 'typesetting_karaoke'
  | 'fun_outtake'
  | 'other'

export type ReleaseReviewRejectionCategory =
  | 'content.incorrect'
  | 'release_context.wrong'
  | 'quality.insufficient'
  | 'rights.unclear'
  | 'other'

export interface ReleaseReviewQueueItem {
  id: string
  source_revision: number
  type: ReleaseReviewType
  category?: ReleaseReviewImageCategory | null
  status: ReleaseReviewStatus
  fansub_group_id: number
  anime_id: number
  anime_title: string
  episode_id: number
  episode_number: string
  release_id: number
  release_version_id: number
  release_version: string
  submitter_app_user_id: number
  submitter_member_id: number
  submitter_display_name: string
  submitted_at: string
  last_activity_at: string
  decided_at?: string | null
}

export interface ReleaseReviewQueueResponse {
  data: {
    items: ReleaseReviewQueueItem[]
    next_cursor?: string | null
  }
}

export interface ReleaseReviewCounts {
  text: number
  image: number
  contribution: number
  allowed_types: ReleaseReviewType[]
  image_categories: Record<ReleaseReviewImageCategory, number>
}

export interface ReleaseReviewCountsResponse {
  data: ReleaseReviewCounts
}

export interface ReleaseReviewTextContent {
  title?: string | null
  body_html: string
}

export interface ReleaseReviewImageContent {
  caption?: string | null
  thumbnail_url?: string | null
  original_url: string
}

export interface ReleaseReviewPriorRejection {
  rejected_at: string
  rejection_category: ReleaseReviewRejectionCategory
  rejection_reason: string
  reviewer_display_name: string
  rejected_by_current_actor: boolean
}

export interface ReleaseReviewDetail extends ReleaseReviewQueueItem {
  text?: ReleaseReviewTextContent | null
  image?: ReleaseReviewImageContent | null
  can_edit_release: boolean
  prior_rejection?: ReleaseReviewPriorRejection | null
}

export interface ReleaseReviewDetailResponse {
  data: ReleaseReviewDetail
}

export interface ReleaseReviewNextResponse {
  data: ReleaseReviewQueueItem | null
}

export interface ReleaseReviewDecisionRequest {
  decision: 'confirm' | 'reject'
  expected_revision: number
  rejection_category?: ReleaseReviewRejectionCategory
  rejection_reason?: string
  override_reason?: string
}

export interface ReleaseReviewDecisionResponse {
  data: {
    review_id: string
    decision: 'confirm' | 'reject'
    next?: ReleaseReviewQueueItem | null
  }
}

export interface ReleaseReviewListParams {
  view?: ReleaseReviewView
  animeId?: number | null
  releaseVersionId?: number | null
  type?: ReleaseReviewType | null
  category?: ReleaseReviewImageCategory | null
  search?: string
  cursor?: string | null
  limit?: number
  signal?: AbortSignal
}

export interface ReleaseReviewCountParams {
  view?: ReleaseReviewView
  animeId?: number | null
  releaseVersionId?: number | null
  search?: string
  signal?: AbortSignal
}
