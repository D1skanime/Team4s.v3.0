import { CommentListItem } from '@/types/comment'

export const MAX_VISIBLE_COMMENTS = 10

export interface ApplyCreatedCommentResult {
  comments: CommentListItem[]
  inserted: boolean
}

export function applyCreatedComment(
  current: CommentListItem[],
  created: CommentListItem,
  maxVisible: number = MAX_VISIBLE_COMMENTS,
): ApplyCreatedCommentResult {
  const inserted = !current.some((item) => item.id === created.id)
  const next = [created, ...current.filter((item) => item.id !== created.id)]

  return {
    comments: next.slice(0, maxVisible),
    inserted,
  }
}
