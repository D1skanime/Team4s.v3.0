import { PaginationMeta } from '@/types/anime'

export interface CommentListItem {
  id: number
  anime_id: number
  author_name: string
  content: string
  created_at: string
}

export interface PaginatedCommentResponse {
  data: CommentListItem[]
  meta: PaginationMeta
}

export interface CommentCreateRequest {
  content: string
}

export interface CommentCreateResponse {
  data: CommentListItem
}
