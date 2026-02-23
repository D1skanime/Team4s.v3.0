import { describe, expect, it } from 'vitest'

import { CommentListItem } from '@/types/comment'

import { MAX_VISIBLE_COMMENTS, applyCreatedComment } from './commentSectionState'

function makeComment(id: number, content: string): CommentListItem {
  return {
    id,
    anime_id: 77,
    author_name: `User ${id}`,
    content,
    created_at: '2026-02-21T10:00:00Z',
  }
}

describe('applyCreatedComment', () => {
  it('inserts a new comment at the top and marks it as inserted', () => {
    const current = [makeComment(1, 'alt 1'), makeComment(2, 'alt 2')]
    const created = makeComment(3, 'neu 3')

    const result = applyCreatedComment(current, created)

    expect(result.inserted).toBe(true)
    expect(result.comments.map((item) => item.id)).toEqual([3, 1, 2])
  })

  it('does not increase inserted flag for duplicate ids and keeps latest payload on top', () => {
    const current = [makeComment(1, 'alt 1'), makeComment(2, 'alt 2')]
    const duplicate = makeComment(1, 'aktualisiert 1')

    const result = applyCreatedComment(current, duplicate)

    expect(result.inserted).toBe(false)
    expect(result.comments.map((item) => item.id)).toEqual([1, 2])
    expect(result.comments[0]?.content).toBe('aktualisiert 1')
  })

  it('caps visible comments at MAX_VISIBLE_COMMENTS after optimistic insert', () => {
    const current = Array.from({ length: MAX_VISIBLE_COMMENTS }, (_, index) =>
      makeComment(index + 1, `alt ${index + 1}`),
    )
    const created = makeComment(999, 'neu 999')

    const result = applyCreatedComment(current, created)

    expect(result.comments).toHaveLength(MAX_VISIBLE_COMMENTS)
    expect(result.comments[0]?.id).toBe(999)
    expect(result.comments.some((item) => item.id === MAX_VISIBLE_COMMENTS)).toBe(false)
  })
})
