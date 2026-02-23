'use client'

import { useState } from 'react'

import { CommentListItem } from '@/types/comment'

import { CommentForm } from './CommentForm'
import { applyCreatedComment } from './commentSectionState'
import styles from './CommentSection.module.css'

interface CommentSectionProps {
  animeID: number
  initialComments: CommentListItem[]
  initialTotal: number
  initialError?: string | null
}

const commentDateFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function CommentSection({ animeID, initialComments, initialTotal, initialError = null }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentListItem[]>(initialComments)
  const [total, setTotal] = useState(initialTotal)
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError)

  function handleCommentCreated(comment: CommentListItem) {
    let inserted = false

    setComments((current) => {
      const result = applyCreatedComment(current, comment)
      inserted = result.inserted
      return result.comments
    })

    if (inserted) {
      setTotal((current) => current + 1)
    }
    setErrorMessage(null)
  }

  return (
    <section className={styles.section}>
      <h2>Kommentare ({total})</h2>
      <CommentForm animeID={animeID} onCommentCreated={handleCommentCreated} />
      {errorMessage && comments.length === 0 ? (
        <div className={styles.errorBox}>{errorMessage}</div>
      ) : comments.length > 0 ? (
        <ul className={styles.commentList}>
          {comments.map((comment) => (
            <li key={comment.id} className={styles.commentItem}>
              <div className={styles.commentHeader}>
                <strong>{comment.author_name}</strong>
                <span>{commentDateFormatter.format(new Date(comment.created_at))}</span>
              </div>
              <p className={styles.commentContent}>{comment.content}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.emptyComments}>Noch keine Kommentare vorhanden.</div>
      )}
    </section>
  )
}
