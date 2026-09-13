'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { ApiError, createAnimeComment } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import { CommentListItem } from '@/types/comment'

import styles from './CommentForm.module.css'

interface CommentFormProps {
  animeID: number
  onCommentCreated?: (comment: CommentListItem) => void
}

const MAX_CONTENT_LENGTH = 4000

export function CommentForm(props: CommentFormProps) {
  const { hasAccessToken, hasRefreshToken, displayName, accountIdentity, accountGeneration, isCurrentSession } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken
  const owner = JSON.stringify([props.animeID, accountIdentity, accountGeneration, hasAuthSession])
  return <SessionCommentForm key={owner} {...props} hasAuthSession={hasAuthSession} displayName={displayName} isCurrentSession={isCurrentSession} />
}

function SessionCommentForm({
  animeID, onCommentCreated, hasAuthSession, displayName, isCurrentSession,
}: CommentFormProps & { hasAuthSession: boolean; displayName: string; isCurrentSession: () => boolean }) {
  const router = useRouter()

  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const requestGeneration = useRef(0)
  useEffect(() => () => { requestGeneration.current += 1 }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) return

    const trimmedContent = content.trim()

    if (!hasAuthSession || !isCurrentSession()) {
      setErrorMessage('Anmeldung erforderlich. Bitte melde dich zuerst an.')
      setSuccessMessage(null)
      return
    }

    if (!trimmedContent) {
      setErrorMessage('content ist erforderlich')
      setSuccessMessage(null)
      return
    }
    if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      setErrorMessage('content ist zu lang (max 4000 zeichen)')
      setSuccessMessage(null)
      return
    }

    const generation = ++requestGeneration.current
    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await createAnimeComment(animeID, {
        content: trimmedContent,
      })

      if (generation !== requestGeneration.current || !isCurrentSession()) return
      setContent('')
      setSuccessMessage('Kommentar gespeichert.')
      onCommentCreated?.(response.data)
      router.refresh()
    } catch (error) {
      if (generation !== requestGeneration.current || !isCurrentSession()) return
      if (error instanceof ApiError) {
        if (error.status === 429 && error.retryAfterSeconds && error.retryAfterSeconds > 0) {
          setErrorMessage(`Zu viele Anfragen. Bitte in ${error.retryAfterSeconds} Sekunden erneut versuchen.`)
        } else {
          setErrorMessage(error.message)
        }
      } else {
        setErrorMessage('Kommentar konnte nicht gespeichert werden.')
      }
      setSuccessMessage(null)
    } finally {
      if (generation === requestGeneration.current && isCurrentSession()) setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.wrapper} aria-label="Kommentar schreiben">
      <h3>Kommentar schreiben</h3>
      <form className={styles.form} onSubmit={handleSubmit}>
        <p className={styles.authInfo}>
          Angemeldet als: {hasAuthSession ? displayName || 'bekannter Benutzer' : 'nicht angemeldet'}
        </p>

        <label className={styles.fieldLabel} htmlFor="content">
          Kommentar
        </label>
        <textarea
          id="content"
          name="content"
          className={styles.textarea}
          maxLength={MAX_CONTENT_LENGTH}
          rows={4}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={isSubmitting}
          required
        />

        <button className={styles.submitButton} type="submit" disabled={isSubmitting || !hasAuthSession}>
          {isSubmitting ? 'Speichern...' : hasAuthSession ? 'Kommentar absenden' : 'Anmeldung erforderlich'}
        </button>
      </form>

      {errorMessage ? <div className={styles.errorBox} role="alert">{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox} role="status">{successMessage}</div> : null}
    </section>
  )
}
